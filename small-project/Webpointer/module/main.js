/**
 * Webpointer Application Main Entry & Interaction Module
 * Binds mouse events, global UI handlers, and manages canvas interactions.
 */
(function() {
  var cfg = window.WebpointerConfig;
  var render = window.WebpointerRender;

  var state = {
    isDrawing: false,
    isMarquee: false,
    isDraggingHandle: false,
    isDraggingObject: false,
    activeHandleInfo: null,
    drawStartStep: null,
    dragStartCoords: null,
    initialObjAttrsMap: new Map(),
    activeTempObj: null,

    // Continuous Multi-Click Bezier Mode State
    isMultiBezierActive: false,
    bezierPoints: [],        // Confirmed vertex points: [{px, py, stepX, stepY}]
    activeBezierObj: null    // Single SVG <path> object
  };
  window.WebpointerState = state;

  // Step Quantization Calculation
  function getStepCoords(evt) {
    var mainSvg = document.getElementById('mainSvg');
    if (!mainSvg) return { rawX: 0, rawY: 0, stepX: 0, stepY: 0, px: 0, py: 0 };
    var rect = mainSvg.getBoundingClientRect();
    var rawX = (evt.clientX - rect.left) * (cfg.SVG_WIDTH / rect.width);
    var rawY = (evt.clientY - rect.top) * (cfg.SVG_HEIGHT / rect.height);

    var clampedX = Math.max(0, Math.min(cfg.SVG_WIDTH, rawX));
    var clampedY = Math.max(0, Math.min(cfg.SVG_HEIGHT, rawY));

    var stepX, stepY, px, py;
    if (cfg.gridSnapEnabled) {
      stepX = Math.round((clampedX / cfg.SVG_WIDTH) * cfg.STEPS_X);
      stepY = Math.round((clampedY / cfg.SVG_HEIGHT) * cfg.STEPS_Y);
      px = (stepX / cfg.STEPS_X) * cfg.SVG_WIDTH;
      py = (stepY / cfg.STEPS_Y) * cfg.SVG_HEIGHT;
    } else {
      px = clampedX;
      py = clampedY;
      stepX = Math.round((px / cfg.SVG_WIDTH) * cfg.STEPS_X);
      stepY = Math.round((py / cfg.SVG_HEIGHT) * cfg.STEPS_Y);
    }

    return {
      rawX: Math.round(clampedX),
      rawY: Math.round(clampedY),
      stepX: stepX,
      stepY: stepY,
      px: px,
      py: py
    };
  }

  // Get Outermost <g> Element for DOM Element
  function getOutermostGroupEl(el) {
    if (!el) return null;
    var objectsGroup = document.getElementById('objectsGroup');
    var current = el.parentElement;
    var topG = null;
    while (current && current !== objectsGroup && current.tagName && current.tagName.toLowerCase() === 'g') {
      topG = current;
      current = current.parentElement;
    }
    return topG;
  }

  // Helper: Select Object with Hierarchical Group Expansion & Ctrl Toggle-Off
  function selectObjectWithGroup(objId, isCtrl) {
    var obj = cfg.objectsMap.get(objId);
    if (!obj) return;

    var outerG = getOutermostGroupEl(obj.el);
    var targetGroupMemberIds = [];

    if (outerG) {
      cfg.objectsMap.forEach(function(o, id) {
        if (outerG.contains(o.el)) {
          targetGroupMemberIds.push(id);
        }
      });
    } else {
      targetGroupMemberIds.push(objId);
    }

    if (!isCtrl) {
      cfg.selectedIds.clear();
      targetGroupMemberIds.forEach(function(id) {
        cfg.selectedIds.add(id);
      });
    } else {
      var isAlreadySelected = targetGroupMemberIds.every(function(id) {
        return cfg.selectedIds.has(id);
      });

      if (isAlreadySelected) {
        // Ctrl + Click on already selected object/group -> Deselect (Toggle OFF)
        targetGroupMemberIds.forEach(function(id) {
          cfg.selectedIds.delete(id);
        });
      } else {
        // Ctrl + Click on unselected object/group -> Add to selection (Toggle ON)
        targetGroupMemberIds.forEach(function(id) {
          cfg.selectedIds.add(id);
        });
      }
    }

    if (cfg.selectedIds.size === 1) {
      var selId = Array.from(cfg.selectedIds)[0];
      var selObj = cfg.objectsMap.get(selId);
      if (selObj && selObj.attrs) {
        if (selObj.attrs.strokeDashStyle) cfg.strokeDashStyle = selObj.attrs.strokeDashStyle;
        if (selObj.attrs.strokeDashArray) cfg.strokeDashArray = selObj.attrs.strokeDashArray;
        if (selObj.attrs.strokeCap) cfg.strokeCap = selObj.attrs.strokeCap;
        if (selObj.attrs.strokeJoin) cfg.strokeJoin = selObj.attrs.strokeJoin;
        if (selObj.attrs.strokeWidth) cfg.strokeWidth = selObj.attrs.strokeWidth;
        if (selObj.attrs.stroke) cfg.strokeColor = selObj.attrs.stroke;
        if (selObj.attrs.fill) cfg.fillColor = selObj.attrs.fill;
      }
    }
  }

  // Build Continuous Bezier SVG Path Data String ("M 50 150 Q 125 50, 200 150 T 350 150 T 500 150")
  function buildContinuousBezierPathD(points, floatingPt, toolType, firstCtrl, customC1, customC2, ctrls3Array) {
    var pts = points.slice();
    if (floatingPt) pts.push(floatingPt);
    if (pts.length === 0) return '';
    if (pts.length === 1) return 'M ' + pts[0].px + ' ' + pts[0].py;

    var P0 = pts[0];
    var P1 = pts[1];

    if (toolType === 'bez2') {
      var cx = firstCtrl ? firstCtrl.cx : Math.round((P0.px + P1.px) / 2);
      var cy = firstCtrl ? firstCtrl.cy : (Math.min(P0.py, P1.py) - 100);
      var d = 'M ' + P0.px + ' ' + P0.py + ' Q ' + cx + ' ' + cy + ', ' + P1.px + ' ' + P1.py;
      for (var i = 2; i < pts.length; i++) {
        d += ' T ' + pts[i].px + ' ' + pts[i].py;
      }
      return d;
    } else if (toolType === 'bez3') {
      var d3 = 'M ' + P0.px + ' ' + P0.py;
      for (var seg = 0; seg < pts.length - 1; seg++) {
        var pStart = pts[seg];
        var pEnd = pts[seg + 1];
        var c1, c2;

        if (ctrls3Array && ctrls3Array[seg]) {
          c1 = ctrls3Array[seg].c1;
          c2 = ctrls3Array[seg].c2;
        } else if (seg === 0) {
          c1 = customC1 ? customC1 : { x: pStart.px, y: Math.round((pStart.py + pEnd.py) / 2 - 50) };
          c2 = customC2 ? customC2 : { x: pEnd.px, y: Math.round((pStart.py + pEnd.py) / 2 - 50) };
        } else {
          c1 = { x: pStart.px, y: Math.round((pStart.py + pEnd.py) / 2 - 50) };
          c2 = { x: pEnd.px, y: Math.round((pStart.py + pEnd.py) / 2 - 50) };
        }
        d3 += ' C ' + c1.x + ' ' + c1.y + ', ' + c2.x + ' ' + c2.y + ', ' + pEnd.px + ' ' + pEnd.py;
      }
      return d3;
    }
    return '';
  }

  // Calculate Distance from Point (px, py) to an Object (High precision sampling)
  function getDistanceToObj(px, py, obj) {
    var a = obj.attrs;
    if (obj.type === 'point') {
      var dxP = px - a.cx;
      var dyP = py - a.cy;
      return Math.sqrt(dxP * dxP + dyP * dyP);
    } else if (obj.type === 'ellipse' || obj.type === 'arc') {
      var dxE = px - a.cx;
      var dyE = py - a.cy;
      var distCenter = Math.sqrt(dxE * dxE + dyE * dyE);
      var avgR = ((a.rx || 10) + (a.ry || 10)) / 2;
      return Math.abs(distCenter - avgR);
    } else if (obj.type === 'line') {
      var x1 = a.x1, y1 = a.y1, x2 = a.x2, y2 = a.y2;
      var A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
      var dot = A * C + B * D;
      var len_sq = C * C + D * D;
      var param = len_sq !== 0 ? dot / len_sq : -1;
      var xx, yy;
      if (param < 0) { xx = x1; yy = y1; }
      else if (param > 1) { xx = x2; yy = y2; }
      else { xx = x1 + param * C; yy = y1 + param * D; }
      var dxL = px - xx, dyL = py - yy;
      return Math.sqrt(dxL * dxL + dyL * dyL);
    } else if (obj.type === 'rect' || obj.type === 'rounded') {
      var rx1 = a.x, ry1 = a.y, rx2 = a.x + a.width, ry2 = a.y + a.height;
      if (px >= rx1 && px <= rx2 && py >= ry1 && py <= ry2) {
        return 0;
      }
      var dxR = Math.max(rx1 - px, 0, px - rx2);
      var dyR = Math.max(ry1 - py, 0, py - ry2);
      return Math.sqrt(dxR * dxR + dyR * dyR);
    } else if (obj.type === 'bez2' || obj.type === 'bez3') {
      var minD = Infinity;
      if (a.points && a.points.length >= 2) {
        var P0 = a.points[0];
        var P1 = a.points[1];
        var cx = a.firstCtrl ? a.firstCtrl.cx : Math.round((P0.px + P1.px) / 2);
        var cy = a.firstCtrl ? a.firstCtrl.cy : (Math.min(P0.py, P1.py) - 100);

        for (var t = 0; t <= 1; t += 0.05) {
          var sx = (1-t)*(1-t)*P0.px + 2*(1-t)*t*cx + t*t*P1.px;
          var sy = (1-t)*(1-t)*P0.py + 2*(1-t)*t*cy + t*t*P1.py;
          var dS = Math.sqrt((px - sx)*(px - sx) + (py - sy)*(py - sy));
          if (dS < minD) minD = dS;
        }

        var prevC = { x: cx, y: cy };
        for (var k = 2; k < a.points.length; k++) {
          var prevP = a.points[k-1];
          var currP = a.points[k];
          var reflX = 2 * prevP.px - prevC.x;
          var reflY = 2 * prevP.py - prevC.y;
          for (var t2 = 0; t2 <= 1; t2 += 0.05) {
            var sx2 = (1-t2)*(1-t2)*prevP.px + 2*(1-t2)*t2*reflX + t2*t2*currP.px;
            var sy2 = (1-t2)*(1-t2)*prevP.py + 2*(1-t2)*t2*reflY + t2*t2*currP.py;
            var dS2 = Math.sqrt((px - sx2)*(px - sx2) + (py - sy2)*(py - sy2));
            if (dS2 < minD) minD = dS2;
          }
          prevC = { x: reflX, y: reflY };
        }
      } else {
        var x1b = a.x1 || 0, y1b = a.y1 || 0, x2b = a.x2 || 0, y2b = a.y2 || 0;
        var cxb = a.cx !== undefined ? a.cx : Math.round((x1b + x2b)/2);
        var cyb = a.cy !== undefined ? a.cy : (Math.min(y1b, y2b)-50);
        for (var t3 = 0; t3 <= 1; t3 += 0.05) {
          var sxb = (1-t3)*(1-t3)*x1b + 2*(1-t3)*t3*cxb + t3*t3*x2b;
          var syb = (1-t3)*(1-t3)*y1b + 2*(1-t3)*t3*cyb + t3*t3*y2b;
          var dSb = Math.sqrt((px - sxb)*(px - sxb) + (py - syb)*(py - syb));
          if (dSb < minD) minD = dSb;
        }
      }
      return minD;
    }
    return Infinity;
  }

  // Find Nearest Object to Click Position (px, py)
  function findNearestObject(px, py) {
    var threshold = cfg.proximityThreshold !== undefined ? cfg.proximityThreshold : 30;
    if (threshold <= 0) return null;

    var nearestObj = null;
    var minDistance = Infinity;

    cfg.objectsMap.forEach(function(obj) {
      var d = getDistanceToObj(px, py, obj);
      if (d < minDistance) {
        minDistance = d;
        nearestObj = obj;
      }
    });

    if (nearestObj && minDistance <= threshold) {
      return nearestObj;
    }
    return null;
  }

  // Get Bounding Box for an individual Object
  function getObjectBounds(obj) {
    var a = obj.attrs;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    if (obj.type === 'point') {
      var r = a.r || 5;
      minX = a.cx - r; maxX = a.cx + r;
      minY = a.cy - r; maxY = a.cy + r;
    } else if (obj.type === 'line') {
      minX = Math.min(a.x1, a.x2); maxX = Math.max(a.x1, a.x2);
      minY = Math.min(a.y1, a.y2); maxY = Math.max(a.y1, a.y2);
    } else if (obj.type === 'rect' || obj.type === 'rounded') {
      minX = a.x; maxX = a.x + a.width;
      minY = a.y; maxY = a.y + a.height;
    } else if (obj.type === 'text') {
      var w = 80, h = 24;
      try {
        if (obj.el) {
          var bb = obj.el.getBBox();
          if (bb && bb.width > 0) { w = bb.width; h = bb.height; }
        }
      } catch(e) {}
      minX = a.x; maxX = a.x + w;
      minY = a.y - h; maxY = a.y;
    } else if (obj.type === 'ellipse' || obj.type === 'arc') {
      minX = a.cx - a.rx; maxX = a.cx + a.rx;
      minY = a.cy - a.ry; maxY = a.cy + a.ry;
    } else if (obj.type === 'bez2' || obj.type === 'bez3') {
      if (a.points && a.points.length > 0) {
        a.points.forEach(function(pt) {
          minX = Math.min(minX, pt.px); maxX = Math.max(maxX, pt.px);
          minY = Math.min(minY, pt.py); maxY = Math.max(maxY, pt.py);
        });
        if (a.firstCtrl) {
          minX = Math.min(minX, a.firstCtrl.cx); maxX = Math.max(maxX, a.firstCtrl.cx);
          minY = Math.min(minY, a.firstCtrl.cy); maxY = Math.max(maxY, a.firstCtrl.cy);
        }
        if (a.ctrls3) {
          a.ctrls3.forEach(function(cp) {
            minX = Math.min(minX, cp.c1.x, cp.c2.x); maxX = Math.max(maxX, cp.c1.x, cp.c2.x);
            minY = Math.min(minY, cp.c1.y, cp.c2.y); maxY = Math.max(maxY, cp.c1.y, cp.c2.y);
          });
        }
      } else {
        minX = Math.min(a.x1, a.x2); maxX = Math.max(a.x1, a.x2);
        minY = Math.min(a.y1, a.y2); maxY = Math.max(a.y1, a.y2);
      }
    }
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
  }

  // Shift an Object by (deltaX, deltaY)
  function shiftObject(obj, deltaX, deltaY) {
    var a = obj.attrs;
    if (obj.type === 'point' || obj.type === 'ellipse' || obj.type === 'arc') {
      a.cx += deltaX; a.cy += deltaY;
    } else if (obj.type === 'line') {
      a.x1 += deltaX; a.y1 += deltaY;
      a.x2 += deltaX; a.y2 += deltaY;
    } else if (obj.type === 'rect' || obj.type === 'rounded' || obj.type === 'text') {
      a.x += deltaX; a.y += deltaY;
    } else if (obj.type === 'bez2' || obj.type === 'bez3') {
      if (a.points && a.points.length > 0) {
        a.points.forEach(function(pt) {
          pt.px += deltaX; pt.py += deltaY;
        });
        if (a.firstCtrl) {
          a.firstCtrl.cx += deltaX; a.firstCtrl.cy += deltaY;
        }
        if (a.ctrls3) {
          a.ctrls3.forEach(function(cp) {
            cp.c1.x += deltaX; cp.c1.y += deltaY;
            cp.c2.x += deltaX; cp.c2.y += deltaY;
          });
        }
        a.pathD = buildContinuousBezierPathD(a.points, null, obj.type, a.firstCtrl, null, null, a.ctrls3);
      } else {
        a.x1 += deltaX; a.y1 += deltaY;
        a.x2 += deltaX; a.y2 += deltaY;
        if (a.cx !== undefined) { a.cx += deltaX; a.cy += deltaY; }
        if (a.c1x !== undefined) { a.c1x += deltaX; a.c1y += deltaY; }
        if (a.c2x !== undefined) { a.c2x += deltaX; a.c2y += deltaY; }
      }
    }
    render.updateElementAttributes(obj);
  }

  // Transform Selected Objects (Flip H, Flip V, Rotate +90, Rotate -90)
  window.transformSelected = function(action) {
    if (cfg.selectedIds.size === 0) return;

    // Calculate Overall Bounding Box of all selected objects
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    cfg.selectedIds.forEach(function(id) {
      var obj = cfg.objectsMap.get(id);
      if (!obj) return;
      var b = getObjectBounds(obj);
      minX = Math.min(minX, b.minX);
      maxX = Math.max(maxX, b.maxX);
      minY = Math.min(minY, b.minY);
      maxY = Math.max(maxY, b.maxY);
    });

    if (minX === Infinity) return;

    var Cx = (minX + maxX) / 2;
    var Cy = (minY + maxY) / 2;

    // Rotate point (px, py) around (Cx, Cy) by angleDeg (+90 or -90)
    function rotatePoint(px, py, angleDeg) {
      var dx = px - Cx;
      var dy = py - Cy;
      if (angleDeg === 90) {
        return { x: Cx - dy, y: Cy + dx };
      } else if (angleDeg === -90) {
        return { x: Cx + dy, y: Cy - dx };
      }
      return { x: px, y: py };
    }

    cfg.selectedIds.forEach(function(id) {
      var obj = cfg.objectsMap.get(id);
      if (!obj) return;
      var a = obj.attrs;

      if (action === 'flipH') {
        if (obj.type === 'point' || obj.type === 'ellipse' || obj.type === 'arc') {
          a.cx = 2 * Cx - a.cx;
          if (obj.type === 'ellipse' || obj.type === 'arc') {
            a.angle = -(a.angle || 0);
          }
          if (obj.type === 'arc') {
            var oldStart = a.startAngle !== undefined ? a.startAngle : -90;
            var oldEnd = a.endAngle !== undefined ? a.endAngle : 0;
            a.startAngle = 180 - oldEnd;
            a.endAngle = 180 - oldStart;
          }
        } else if (obj.type === 'line') {
          a.x1 = 2 * Cx - a.x1;
          a.x2 = 2 * Cx - a.x2;
        } else if (obj.type === 'rect' || obj.type === 'rounded') {
          a.x = 2 * Cx - a.x - a.width;
        } else if (obj.type === 'bez2' || obj.type === 'bez3') {
          if (a.points && a.points.length > 0) {
            a.points.forEach(function(pt) {
              pt.px = 2 * Cx - pt.px;
            });
            if (a.firstCtrl) {
              a.firstCtrl.cx = 2 * Cx - a.firstCtrl.cx;
            }
            if (a.ctrls3) {
              a.ctrls3.forEach(function(cp) {
                cp.c1.x = 2 * Cx - cp.c1.x;
                cp.c2.x = 2 * Cx - cp.c2.x;
              });
            }
            a.pathD = buildContinuousBezierPathD(a.points, null, obj.type, a.firstCtrl, null, null, a.ctrls3);
          } else {
            a.x1 = 2 * Cx - a.x1;
            a.x2 = 2 * Cx - a.x2;
            if (a.cx !== undefined) a.cx = 2 * Cx - a.cx;
            if (a.c1x !== undefined) a.c1x = 2 * Cx - a.c1x;
            if (a.c2x !== undefined) a.c2x = 2 * Cx - a.c2x;
          }
        }
      } else if (action === 'flipV') {
        if (obj.type === 'point' || obj.type === 'ellipse' || obj.type === 'arc') {
          a.cy = 2 * Cy - a.cy;
          if (obj.type === 'ellipse' || obj.type === 'arc') {
            a.angle = -(a.angle || 0);
          }
          if (obj.type === 'arc') {
            var oldStartV = a.startAngle !== undefined ? a.startAngle : -90;
            var oldEndV = a.endAngle !== undefined ? a.endAngle : 0;
            a.startAngle = -oldEndV;
            a.endAngle = -oldStartV;
          }
        } else if (obj.type === 'line') {
          a.y1 = 2 * Cy - a.y1;
          a.y2 = 2 * Cy - a.y2;
        } else if (obj.type === 'rect' || obj.type === 'rounded') {
          a.y = 2 * Cy - a.y - a.height;
        } else if (obj.type === 'bez2' || obj.type === 'bez3') {
          if (a.points && a.points.length > 0) {
            a.points.forEach(function(pt) {
              pt.py = 2 * Cy - pt.py;
            });
            if (a.firstCtrl) {
              a.firstCtrl.cy = 2 * Cy - a.firstCtrl.cy;
            }
            if (a.ctrls3) {
              a.ctrls3.forEach(function(cp) {
                cp.c1.y = 2 * Cy - cp.c1.y;
                cp.c2.y = 2 * Cy - cp.c2.y;
              });
            }
            a.pathD = buildContinuousBezierPathD(a.points, null, obj.type, a.firstCtrl, null, null, a.ctrls3);
          } else {
            a.y1 = 2 * Cy - a.y1;
            a.y2 = 2 * Cy - a.y2;
            if (a.cy !== undefined) a.cy = 2 * Cy - a.cy;
            if (a.c1y !== undefined) a.c1y = 2 * Cy - a.c1y;
            if (a.c2y !== undefined) a.c2y = 2 * Cy - a.c2y;
          }
        }
      } else if (action === 'rotate90' || action === 'rotateNeg90') {
        var deg = action === 'rotate90' ? 90 : -90;

        if (obj.type === 'point') {
          var pPt = rotatePoint(a.cx, a.cy, deg);
          a.cx = pPt.x; a.cy = pPt.y;
        } else if (obj.type === 'ellipse' || obj.type === 'arc') {
          var pEl = rotatePoint(a.cx, a.cy, deg);
          a.cx = pEl.x; a.cy = pEl.y;
          a.angle = ((a.angle || 0) + deg) % 360;
        } else if (obj.type === 'line') {
          var pL1 = rotatePoint(a.x1, a.y1, deg);
          var pL2 = rotatePoint(a.x2, a.y2, deg);
          a.x1 = pL1.x; a.y1 = pL1.y;
          a.x2 = pL2.x; a.y2 = pL2.y;
        } else if (obj.type === 'rect' || obj.type === 'rounded') {
          var rectCenter = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
          var pRectC = rotatePoint(rectCenter.x, rectCenter.y, deg);
          var oldW = a.width;
          var oldH = a.height;
          a.width = oldH;
          a.height = oldW;
          a.x = pRectC.x - a.width / 2;
          a.y = pRectC.y - a.height / 2;
        } else if (obj.type === 'bez2' || obj.type === 'bez3') {
          if (a.points && a.points.length > 0) {
            a.points.forEach(function(pt) {
              var pRot = rotatePoint(pt.px, pt.py, deg);
              pt.px = pRot.x; pt.py = pRot.y;
            });
            if (a.firstCtrl) {
              var pFC = rotatePoint(a.firstCtrl.cx, a.firstCtrl.cy, deg);
              a.firstCtrl.cx = pFC.x; a.firstCtrl.cy = pFC.y;
            }
            if (a.ctrls3) {
              a.ctrls3.forEach(function(cp) {
                var pC1 = rotatePoint(cp.c1.x, cp.c1.y, deg);
                var pC2 = rotatePoint(cp.c2.x, cp.c2.y, deg);
                cp.c1.x = pC1.x; cp.c1.y = pC1.y;
                cp.c2.x = pC2.x; cp.c2.y = pC2.y;
              });
            }
            a.pathD = buildContinuousBezierPathD(a.points, null, obj.type, a.firstCtrl, null, null, a.ctrls3);
          } else {
            var pB1 = rotatePoint(a.x1, a.y1, deg);
            var pB2 = rotatePoint(a.x2, a.y2, deg);
            a.x1 = pB1.x; a.y1 = pB1.y;
            a.x2 = pB2.x; a.y2 = pB2.y;
            if (a.cx !== undefined) {
              var pBC = rotatePoint(a.cx, a.cy, deg);
              a.cx = pBC.x; a.cy = pBC.y;
            }
            if (a.c1x !== undefined) {
              var pBC1 = rotatePoint(a.c1x, a.c1y, deg);
              a.c1x = pBC1.x; a.c1y = pBC1.y;
            }
            if (a.c2x !== undefined) {
              var pBC2 = rotatePoint(a.c2x, a.c2y, deg);
              a.c2x = pBC2.x; a.c2y = pBC2.y;
            }
          }
        }
      }

      render.updateElementAttributes(obj);
    });

    render.renderUI();
  };

  // Create SVG Object Data Struct
  function createSvgObject(type, stepStart, stepEnd) {
    var objectsGroup = document.getElementById('objectsGroup');
    var id = 'obj_' + (cfg.nextId++);
    var el, attrs = {};

    var px1 = (stepStart.stepX / cfg.STEPS_X) * cfg.SVG_WIDTH;
    var py1 = (stepStart.stepY / cfg.STEPS_Y) * cfg.SVG_HEIGHT;
    var px2 = (stepEnd.stepX / cfg.STEPS_X) * cfg.SVG_WIDTH;
    var py2 = (stepEnd.stepY / cfg.STEPS_Y) * cfg.SVG_HEIGHT;

    if (type === 'point') {
      el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      attrs = { cx: px1, cy: py1, r: cfg.pointRadius || 5, stepX: stepStart.stepX, stepY: stepStart.stepY };
    } else if (type === 'line') {
      el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      attrs = { x1: px1, y1: py1, x2: px2, y2: py2, stepX1: stepStart.stepX, stepY1: stepStart.stepY, stepX2: stepEnd.stepX, stepY2: stepEnd.stepY };
    } else if (type === 'rect' || type === 'rounded') {
      el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      var x = Math.min(px1, px2);
      var y = Math.min(py1, py2);
      var w = Math.max(10, Math.abs(px2 - px1));
      var h = Math.max(10, Math.abs(py2 - py1));
      var rx = type === 'rounded' ? 15 : 0;
      attrs = { x: x, y: y, width: w, height: h, rx: rx, stepX: Math.min(stepStart.stepX, stepEnd.stepX), stepY: Math.min(stepStart.stepY, stepEnd.stepY), stepW: Math.abs(stepEnd.stepX - stepStart.stepX), stepH: Math.abs(stepEnd.stepY - stepStart.stepY) };
    } else if (type === 'ellipse') {
      el = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      var cx = (px1 + px2) / 2;
      var cy = (py1 + py2) / 2;
      var rxEl = Math.max(10, Math.abs(px2 - px1) / 2);
      var ryEl = Math.max(10, Math.abs(py2 - py1) / 2);
      attrs = { cx: cx, cy: cy, rx: rxEl, ry: ryEl, angle: 0, stepCx: Math.round((stepStart.stepX + stepEnd.stepX) / 2), stepCy: Math.round((stepStart.stepY + stepEnd.stepY) / 2), stepRx: Math.abs(stepEnd.stepX - stepStart.stepX) / 2, stepRy: Math.abs(stepEnd.stepY - stepStart.stepY) / 2 };
    } else if (type === 'arc') {
      el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      var rxArc = Math.max(10, Math.abs(px2 - px1));
      var ryArc = Math.max(10, Math.abs(py2 - py1));
      var initialEndAngle = Math.round(Math.atan2(py2 - py1, px2 - px1) * (180 / Math.PI));
      attrs = {
        cx: px1,
        cy: py1,
        rx: rxArc,
        ry: ryArc,
        startAngle: -90,
        endAngle: initialEndAngle,
        angle: 0
      };
    } else if (type === 'bez2' || type === 'bez3') {
      el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      attrs = { pathD: 'M ' + px1 + ' ' + py1, points: [{px: px1, py: py1, stepX: stepStart.stepX, stepY: stepStart.stepY}], ctrls3: [] };
    }

    attrs.stroke = cfg.strokeColor || '#041e49';
    attrs.fill = cfg.fillColor || 'none';
    attrs.strokeWidth = cfg.strokeWidth || 2;
    attrs.strokeDashStyle = cfg.strokeDashStyle || 'solid';
    attrs.strokeDashArray = cfg.strokeDashArray || '6,6';
    attrs.strokeCap = cfg.strokeCap || 'butt';
    attrs.strokeJoin = cfg.strokeJoin || 'miter';

    el.setAttribute('id', id);
    el.setAttribute('stroke', cfg.strokeColor || '#041e49');
    el.setAttribute('fill', cfg.fillColor || 'none');
    el.setAttribute('stroke-width', cfg.strokeWidth || 2);
    el.setAttribute('stroke-linecap', attrs.strokeCap);
    el.setAttribute('stroke-linejoin', attrs.strokeJoin);

    if (cfg.strokeDashStyle === 'dashed' && cfg.strokeDashArray) {
      el.setAttribute('stroke-dasharray', cfg.strokeDashArray);
    }

    if (cfg.startMarker !== 'none') el.setAttribute('marker-start', 'url(#marker-start-' + cfg.startMarker + ')');
    if (cfg.endMarker !== 'none') el.setAttribute('marker-end', 'url(#marker-end-' + cfg.endMarker + ')');

    var objData = { id: id, type: type, parentId: null, attrs: attrs, el: el };
    cfg.objectsMap.set(id, objData);
    render.updateElementAttributes(objData);
    if (objectsGroup) objectsGroup.appendChild(el);
    render.updateDomTree();
    return objData;
  }

  // Finish Multi-Click Bezier Mode
  function finishMultiBezier() {
    if (!state.isMultiBezierActive) return;

    if (state.activeBezierObj) {
      var finalD = buildContinuousBezierPathD(state.bezierPoints, null, cfg.currentTool, state.activeBezierObj.attrs.firstCtrl, null, null, state.activeBezierObj.attrs.ctrls3);
      state.activeBezierObj.attrs.pathD = finalD;
      state.activeBezierObj.attrs.points = state.bezierPoints.slice();

      if (state.bezierPoints.length >= 2 && !state.activeBezierObj.attrs.firstCtrl && cfg.currentTool === 'bez2') {
        var p0 = state.bezierPoints[0], p1 = state.bezierPoints[1];
        state.activeBezierObj.attrs.firstCtrl = {
          cx: Math.round((p0.px + p1.px) / 2),
          cy: Math.min(p0.py, p1.py) - 100
        };
      }
      render.updateElementAttributes(state.activeBezierObj);
    }

    state.isMultiBezierActive = false;
    state.bezierPoints = [];
    state.activeBezierObj = null;
    state.isDrawing = false;
    state.activeTempObj = null;

    cfg.currentTool = 'select';
    render.renderRibbon();
    render.renderUI();
  }

  // Bind Global Window Scope Handlers
  window.switchTab = function(tab) {
    if (state.isMultiBezierActive) finishMultiBezier();
    cfg.currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(function(btn) { btn.classList.remove('active'); });
    if (window.event && window.event.target) {
      window.event.target.classList.add('active');
    } else {
      var activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(function(b) { return b.getAttribute('onclick') && b.getAttribute('onclick').includes(tab); });
      if (activeBtn) activeBtn.classList.add('active');
    }
    render.renderRibbon();
  };

  window.setTool = function(tool) {
    if (state.isMultiBezierActive && tool !== 'bez2' && tool !== 'bez3') {
      finishMultiBezier();
    }
    cfg.currentTool = tool;
    var mainSvg = document.getElementById('mainSvg');
    if (mainSvg) {
      if (tool === 'text') {
        mainSvg.style.cursor = 'text';
      } else if (tool === 'select') {
        mainSvg.style.cursor = 'default';
      } else {
        mainSvg.style.cursor = 'crosshair';
      }
    }
    render.renderRibbon();
  };

  window.toggleGridSnap = function(val) {
    cfg.gridSnapEnabled = val;
    render.renderGrid();
  };

  window.setGridDensity = function(val) {
    var parts = val.split('x').map(function(v) { return parseInt(v, 10); });
    cfg.STEPS_X = parts[0];
    cfg.STEPS_Y = parts[1];
    render.renderGrid();
  };

  window.setProximityThreshold = function(val) {
    cfg.proximityThreshold = parseInt(val, 10);
    render.renderRibbon();
  };

  window.setDefaultShapeSize = function(val) {
    cfg.defaultShapeSize = parseInt(val, 10);
    render.renderRibbon();
  };

  window.setCanvasRatio = function(val) {
    var parts = val.split('x').map(function(v) { return parseInt(v, 10); });
    cfg.SVG_WIDTH = parts[0];
    cfg.SVG_HEIGHT = parts[1];
    var mainSvg = document.getElementById('mainSvg');
    var svgWrapper = document.getElementById('svgWrapper');
    if (mainSvg) mainSvg.setAttribute('viewBox', '0 0 ' + cfg.SVG_WIDTH + ' ' + cfg.SVG_HEIGHT);
    if (svgWrapper) svgWrapper.style.aspectRatio = cfg.SVG_WIDTH + ' / ' + cfg.SVG_HEIGHT;
    render.renderGrid();
  };

  window.setCanvasBgColor = function(val) {
    cfg.canvasBgColor = val;
    render.renderGrid();
  };

  // Multi-Level Hierarchical Grouping
  window.groupSelected = function() {
    var objectsGroup = document.getElementById('objectsGroup');
    if (!objectsGroup) return;

    var topUnits = new Set();
    cfg.selectedIds.forEach(function(id) {
      var obj = cfg.objectsMap.get(id);
      if (obj) {
        var outerG = getOutermostGroupEl(obj.el);
        topUnits.add(outerG ? outerG : obj.el);
      }
    });

    if (topUnits.size < 2) return;

    var gId = 'g_' + (cfg.nextId++);
    var newGroupEl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    newGroupEl.setAttribute('id', gId);

    topUnits.forEach(function(unitEl) {
      newGroupEl.appendChild(unitEl);
    });

    objectsGroup.appendChild(newGroupEl);

    cfg.selectedIds.forEach(function(id) {
      var obj = cfg.objectsMap.get(id);
      if (obj) {
        var directP = obj.el.parentElement;
        obj.parentId = (directP && directP !== objectsGroup && directP.id) ? directP.id : gId;
      }
    });

    render.updateDomTree();
    render.renderUI();
    render.renderRibbon();
  };

  // Single 1-Level Down Hierarchical Ungrouping
  window.ungroupSelected = function() {
    var objectsGroup = document.getElementById('objectsGroup');
    if (!objectsGroup) return;

    var outerGroupsToUnpack = new Set();
    cfg.selectedIds.forEach(function(id) {
      var obj = cfg.objectsMap.get(id);
      if (obj) {
        var outerG = getOutermostGroupEl(obj.el);
        if (outerG) outerGroupsToUnpack.add(outerG);
      }
    });

    if (outerGroupsToUnpack.size === 0) return;

    outerGroupsToUnpack.forEach(function(outerG) {
      var children = Array.from(outerG.children);
      children.forEach(function(childEl) {
        outerG.parentElement.insertBefore(childEl, outerG);
      });
      outerG.remove();
    });

    cfg.objectsMap.forEach(function(obj, id) {
      var p = obj.el.parentElement;
      if (p && p !== objectsGroup && p.id) {
        obj.parentId = p.id;
      } else {
        obj.parentId = null;
      }
    });

    cfg.selectedIds.clear();
    outerGroupsToUnpack.forEach(function(outerG) {
      cfg.objectsMap.forEach(function(obj, id) {
        cfg.selectedIds.add(id);
      });
    });

    render.updateDomTree();
    render.renderUI();
    render.renderRibbon();
  };

  window.arrangeOrder = function(action) {
    var objectsGroup = document.getElementById('objectsGroup');
    if (!objectsGroup) return;
    cfg.selectedIds.forEach(function(id) {
      var obj = cfg.objectsMap.get(id);
      if (!obj) return;
      var el = obj.el;
      if (action === 'front') objectsGroup.appendChild(el);
      else if (action === 'back') objectsGroup.insertBefore(el, objectsGroup.firstChild);
      else if (action === 'forward' && el.nextSibling) objectsGroup.insertBefore(el.nextSibling, el);
      else if (action === 'backward' && el.previousSibling) objectsGroup.insertBefore(el, el.previousSibling);
    });
    render.updateDomTree();
  };

  // Precise Alignment Function (Align Left, Right, Top, Bottom, H-Center, V-Center, H-Distribute, V-Distribute)
  window.alignSelected = function(type) {
    if (cfg.selectedIds.size === 0) return;

    // Collect top-level units
    var topUnitsMap = new Map();
    cfg.selectedIds.forEach(function(id) {
      var obj = cfg.objectsMap.get(id);
      if (!obj) return;
      var outerG = getOutermostGroupEl(obj.el);
      var unitKey = outerG ? outerG : obj.el;
      if (!topUnitsMap.has(unitKey)) {
        topUnitsMap.set(unitKey, []);
      }
      topUnitsMap.get(unitKey).push(obj);
    });

    // Enforce unit count requirements:
    // Equal spacing (hdistribute, vdistribute) requires >= 3 units
    // Regular alignment (left, right, hcenter, top, bottom, vcenter) requires >= 2 units
    if (type === 'hdistribute' || type === 'vdistribute') {
      if (topUnitsMap.size < 3) return;
    } else {
      if (topUnitsMap.size < 2) return;
    }

    // Calculate bounds per unit and determine reference units
    var unitInfoList = [];
    var overallMinX = Infinity, overallMinY = Infinity, overallMaxX = -Infinity, overallMaxY = -Infinity;
    var leftmostUnit = null, topmostUnit = null;

    topUnitsMap.forEach(function(objectsInUnit, unitKey) {
      var uMinX = Infinity, uMinY = Infinity, uMaxX = -Infinity, uMaxY = -Infinity;
      objectsInUnit.forEach(function(obj) {
        var b = getObjectBounds(obj);
        uMinX = Math.min(uMinX, b.minX);
        uMaxX = Math.max(uMaxX, b.maxX);
        uMinY = Math.min(uMinY, b.minY);
        uMaxY = Math.max(uMaxY, b.maxY);
      });

      var info = {
        objects: objectsInUnit,
        minX: uMinX,
        maxX: uMaxX,
        minY: uMinY,
        maxY: uMaxY,
        width: uMaxX - uMinX,
        height: uMaxY - uMinY,
        centerX: (uMinX + uMaxX) / 2,
        centerY: (uMinY + uMaxY) / 2
      };

      if (uMinX < overallMinX) {
        overallMinX = uMinX;
        leftmostUnit = info;
      }
      if (uMaxX > overallMaxX) {
        overallMaxX = uMaxX;
      }
      if (uMinY < overallMinY) {
        overallMinY = uMinY;
        topmostUnit = info;
      }
      if (uMaxY > overallMaxY) {
        overallMaxY = uMaxY;
      }

      unitInfoList.push(info);
    });

    if (type === 'hdistribute') {
      // Horizontal Equal Spacing: Sort units by minX ascending
      unitInfoList.sort(function(a, b) { return a.minX - b.minX; });
      var nH = unitInfoList.length;
      var totalSpanH = unitInfoList[nH - 1].maxX - unitInfoList[0].minX;
      var totalWidthsH = 0;
      unitInfoList.forEach(function(info) { totalWidthsH += info.width; });
      var freeGapH = totalSpanH - totalWidthsH;
      var gapH = freeGapH / (nH - 1);

      var currX = unitInfoList[0].minX;
      unitInfoList.forEach(function(info, idx) {
        if (idx > 0) {
          var targetX = currX + gapH;
          var deltaX = targetX - info.minX;
          info.objects.forEach(function(obj) {
            shiftObject(obj, deltaX, 0);
          });
          currX = targetX + info.width;
        } else {
          currX = info.minX + info.width;
        }
      });
    } else if (type === 'vdistribute') {
      // Vertical Equal Spacing: Sort units by minY ascending
      unitInfoList.sort(function(a, b) { return a.minY - b.minY; });
      var nV = unitInfoList.length;
      var totalSpanV = unitInfoList[nV - 1].maxY - unitInfoList[0].minY;
      var totalHeightsV = 0;
      unitInfoList.forEach(function(info) { totalHeightsV += info.height; });
      var freeGapV = totalSpanV - totalHeightsV;
      var gapV = freeGapV / (nV - 1);

      var currY = unitInfoList[0].minY;
      unitInfoList.forEach(function(info, idx) {
        if (idx > 0) {
          var targetY = currY + gapV;
          var deltaY = targetY - info.minY;
          info.objects.forEach(function(obj) {
            shiftObject(obj, 0, deltaY);
          });
          currY = targetY + info.height;
        } else {
          currY = info.minY + info.height;
        }
      });
    } else {
      // Reference values based on spec:
      // H-Center: Reference is the horizontal center of the LEFTMOST unit
      // V-Center: Reference is the vertical center of the TOPMOST unit
      var refHCenterX = leftmostUnit ? leftmostUnit.centerX : (overallMinX + overallMaxX) / 2;
      var refVCenterY = topmostUnit ? topmostUnit.centerY : (overallMinY + overallMaxY) / 2;

      // Apply alignment delta to each top-level unit
      unitInfoList.forEach(function(info) {
        var deltaX = 0, deltaY = 0;
        if (type === 'left') {
          deltaX = overallMinX - info.minX;
        } else if (type === 'right') {
          deltaX = overallMaxX - info.maxX;
        } else if (type === 'hcenter') {
          deltaX = refHCenterX - info.centerX;
        } else if (type === 'top') {
          deltaY = overallMinY - info.minY;
        } else if (type === 'bottom') {
          deltaY = overallMaxY - info.maxY;
        } else if (type === 'vcenter') {
          deltaY = refVCenterY - info.centerY;
        }

        info.objects.forEach(function(obj) {
          shiftObject(obj, deltaX, deltaY);
        });
      });
    }

    render.renderUI();
  };

  window.setStrokeColor = function(val) {
    cfg.strokeColor = val;
    render.updateSvgDefs();
    window.applyStyleToSelected();
  };

  window.setFillColor = function(val) {
    cfg.fillColor = val;
    window.applyStyleToSelected();
  };

  window.setStrokeWidth = function(val) {
    cfg.strokeWidth = parseInt(val, 10) || 1;
    window.updateSvgDefs();
    window.applyStyleToSelected();
    render.renderRibbon();
  };

  window.adjustStrokeWidth = function(delta) {
    var cur = parseInt(cfg.strokeWidth, 10) || 2;
    var next = Math.max(1, cur + delta);
    window.setStrokeWidth(next);
  };

  window.setStrokeDashStyle = function(style) {
    console.log('[Webpointer Debug] setStrokeDashStyle called:', style);
    cfg.strokeDashStyle = style;
    if (!cfg.strokeDashArray) cfg.strokeDashArray = '6,6';

    var targets = [];
    if (cfg.selectedIds.size > 0) {
      targets = Array.from(cfg.selectedIds);
    } else if (cfg.objectsMap.size > 0) {
      var lastId = Array.from(cfg.objectsMap.keys()).pop();
      if (lastId) {
        cfg.selectedIds.add(lastId);
        targets = [lastId];
      }
    }

    targets.forEach(function(id) {
      var obj = cfg.objectsMap.get(id);
      if (obj && obj.attrs) {
        obj.attrs.strokeDashStyle = cfg.strokeDashStyle;
        obj.attrs.strokeDashArray = cfg.strokeDashArray;
        render.updateElementAttributes(obj);
      }
    });

    render.renderUI();
    render.renderRibbon();
  };

  window.setStrokeDashArray = function(pattern) {
    console.log('[Webpointer Debug] setStrokeDashArray called:', pattern);
    cfg.strokeDashArray = pattern;
    if (pattern && pattern.trim() !== '') {
      cfg.strokeDashStyle = 'dashed';
    }

    var targets = [];
    if (cfg.selectedIds.size > 0) {
      targets = Array.from(cfg.selectedIds);
    } else if (cfg.objectsMap.size > 0) {
      var lastId = Array.from(cfg.objectsMap.keys()).pop();
      if (lastId) {
        cfg.selectedIds.add(lastId);
        targets = [lastId];
      }
    }

    targets.forEach(function(id) {
      var obj = cfg.objectsMap.get(id);
      if (obj && obj.attrs) {
        obj.attrs.strokeDashStyle = cfg.strokeDashStyle;
        obj.attrs.strokeDashArray = cfg.strokeDashArray;
        render.updateElementAttributes(obj);
      }
    });

    render.renderUI();
  };

  window.setStrokeCap = function(val) {
    console.log('[Webpointer Debug] setStrokeCap called:', val);
    cfg.strokeCap = val;

    var targets = [];
    if (cfg.selectedIds.size > 0) {
      targets = Array.from(cfg.selectedIds);
    } else if (cfg.objectsMap.size > 0) {
      var lastId = Array.from(cfg.objectsMap.keys()).pop();
      if (lastId) {
        cfg.selectedIds.add(lastId);
        targets = [lastId];
      }
    }

    targets.forEach(function(id) {
      var obj = cfg.objectsMap.get(id);
      if (obj && obj.attrs) {
        obj.attrs.strokeCap = cfg.strokeCap;
        render.updateElementAttributes(obj);
      }
    });

    render.renderUI();
    render.renderRibbon();
  };

  window.setStrokeJoin = function(val) {
    console.log('[Webpointer Debug] setStrokeJoin called:', val);
    cfg.strokeJoin = val;

    var targets = [];
    if (cfg.selectedIds.size > 0) {
      targets = Array.from(cfg.selectedIds);
    } else if (cfg.objectsMap.size > 0) {
      var lastId = Array.from(cfg.objectsMap.keys()).pop();
      if (lastId) {
        cfg.selectedIds.add(lastId);
        targets = [lastId];
      }
    }

    targets.forEach(function(id) {
      var obj = cfg.objectsMap.get(id);
      if (obj && obj.attrs) {
        obj.attrs.strokeJoin = cfg.strokeJoin;
        render.updateElementAttributes(obj);
      }
    });

    render.renderUI();
    render.renderRibbon();
  };

  window.toggleCategoryCollapse = function(catKey) {
    if (!cfg.collapsedCategories) cfg.collapsedCategories = new Set();
    if (cfg.collapsedCategories.has(catKey)) {
      cfg.collapsedCategories.delete(catKey);
    } else {
      cfg.collapsedCategories.add(catKey);
    }
    render.renderRibbon();
  };

  window.addTextObject = function() {
    console.log('[Webpointer Debug] addTextObject called - switching to text tool mode');
    setTool('text');
  };

  function startDirectCanvasTyping(px, py, targetObj) {
    finishDirectCanvasTyping();

    var mainSvg = document.getElementById('mainSvg');
    var objectsGroup = document.getElementById('objectsGroup');
    var uiGroup = document.getElementById('uiGroup');
    if (!mainSvg || !objectsGroup) return;

    var textColor = (cfg.strokeColor && cfg.strokeColor !== 'none') ? cfg.strokeColor : '#041e49';
    var targetSvgObj = null;

    if (targetObj && targetObj.attrs) {
      targetSvgObj = targetObj;
    } else {
      var id = 'obj_' + (cfg.nextId++);
      var el = document.createElementNS('http://www.w3.org/2000/svg', 'text');

      el.setAttribute('id', id);
      el.setAttribute('x', px);
      el.setAttribute('y', py);
      el.setAttribute('fill', textColor);
      el.setAttribute('font-size', '20');
      el.setAttribute('font-family', 'sans-serif');
      el.setAttribute('dominant-baseline', 'alphabetic');

      var attrs = {
        x: px,
        y: py,
        text: '',
        fill: textColor,
        fontSize: 20
      };

      targetSvgObj = { id: id, type: 'text', parentId: null, attrs: attrs, el: el };
      cfg.objectsMap.set(id, targetSvgObj);
      render.updateElementAttributes(targetSvgObj);
      objectsGroup.appendChild(el);
    }

    state.typingSvgObj = targetSvgObj;

    var caretEl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    caretEl.setAttribute('id', 'canvasBlinkingCaret');
    caretEl.setAttribute('stroke', '#0284c7');
    caretEl.setAttribute('stroke-width', '2.5');
    caretEl.setAttribute('class', 'blinking-caret');
    if (uiGroup) uiGroup.appendChild(caretEl);
    state.typingCaretEl = caretEl;

    var hiddenInput = document.createElement('textarea');
    hiddenInput.id = 'hiddenCanvasInput';
    hiddenInput.style.position = 'fixed';
    hiddenInput.style.left = '-9999px';
    hiddenInput.style.top = '-9999px';
    hiddenInput.style.opacity = '0';
    hiddenInput.style.width = '1px';
    hiddenInput.style.height = '1px';
    hiddenInput.style.zIndex = '-1';
    hiddenInput.value = targetSvgObj.attrs.text || '';
    document.body.appendChild(hiddenInput);

    function updateCaretPosition() {
      if (!state.typingSvgObj || !state.typingCaretEl) return;
      var textEl = state.typingSvgObj.el;
      var fontSize = parseInt(state.typingSvgObj.attrs.fontSize || 20, 10);
      var fontBaselineY = state.typingSvgObj.attrs.y;
      var baseX = state.typingSvgObj.attrs.x;

      var cx = baseX;
      var cy1 = fontBaselineY - (fontSize * 0.85);
      var cy2 = fontBaselineY + (fontSize * 0.15);

      try {
        if (textEl) {
          var tspans = textEl.querySelectorAll('tspan');
          if (tspans && tspans.length > 0) {
            var lastIdx = tspans.length - 1;
            var lastTspan = tspans[lastIdx];
            var lastBBox = lastTspan.getBBox();
            if (lastBBox && (lastBBox.x > 0 || lastBBox.y > 0)) {
              var textWidth = (!lastTspan.textContent || lastTspan.textContent === '\u200B') ? 0 : lastBBox.width;
              cx = lastBBox.x + textWidth + 1.5;
              cy1 = fontBaselineY + (lastIdx * fontSize * 1.2) - (fontSize * 0.85);
              cy2 = fontBaselineY + (lastIdx * fontSize * 1.2) + (fontSize * 0.15);
            } else {
              cx = baseX;
              cy1 = fontBaselineY + (lastIdx * fontSize * 1.2) - (fontSize * 0.85);
              cy2 = fontBaselineY + (lastIdx * fontSize * 1.2) + (fontSize * 0.15);
            }
          } else {
            var bbox = textEl.getBBox();
            if (bbox && bbox.width > 0 && (bbox.x > 0 || bbox.y > 0)) {
              cx = bbox.x + bbox.width + 1.5;
              cy1 = bbox.y;
              cy2 = bbox.y + bbox.height;
            }
          }
        }
      } catch(err) {}

      state.typingCaretEl.setAttribute('x1', cx);
      state.typingCaretEl.setAttribute('y1', cy1);
      state.typingCaretEl.setAttribute('x2', cx);
      state.typingCaretEl.setAttribute('y2', cy2);
    }

    hiddenInput.addEventListener('input', function() {
      if (state.typingSvgObj) {
        state.typingSvgObj.attrs.text = hiddenInput.value;
        render.updateElementAttributes(state.typingSvgObj);
        updateCaretPosition();
      }
    });

    hiddenInput.addEventListener('keydown', function(e) {
      e.stopPropagation();
      if (e.key === 'Escape') {
        e.preventDefault();
        finishDirectCanvasTyping();
      }
    });

    setTimeout(function() {
      if (document.getElementById('hiddenCanvasInput')) {
        hiddenInput.focus();
        updateCaretPosition();
      }
    }, 50);

    setTimeout(function() {
      if (document.getElementById('hiddenCanvasInput')) {
        hiddenInput.addEventListener('blur', function() {
          finishDirectCanvasTyping();
        });
      }
    }, 250);
  }

  function finishDirectCanvasTyping() {
    var hiddenInput = document.getElementById('hiddenCanvasInput');
    if (hiddenInput && hiddenInput.dataset.isFinishing === 'true') return;
    if (hiddenInput) hiddenInput.dataset.isFinishing = 'true';

    var caretEl = document.getElementById('canvasBlinkingCaret');
    if (caretEl && caretEl.parentNode) {
      caretEl.parentNode.removeChild(caretEl);
    }
    state.typingCaretEl = null;

    if (state.typingSvgObj) {
      var textVal = (state.typingSvgObj.attrs.text || '').trim();
      if (!textVal) {
        if (state.typingSvgObj.el && state.typingSvgObj.el.parentNode) {
          state.typingSvgObj.el.parentNode.removeChild(state.typingSvgObj.el);
        }
        cfg.objectsMap.delete(state.typingSvgObj.id);
        cfg.selectedIds.delete(state.typingSvgObj.id);
      } else {
        cfg.selectedIds.clear();
        cfg.selectedIds.add(state.typingSvgObj.id);
      }
      state.typingSvgObj = null;
    }

    try {
      if (hiddenInput && hiddenInput.parentNode && hiddenInput.parentNode.contains(hiddenInput)) {
        hiddenInput.parentNode.removeChild(hiddenInput);
      }
    } catch(e) {}

    render.updateDomTree();
    render.renderUI();
    render.renderRibbon();
  }

  window.applyStyleToSelected = function() {
    console.log('[Webpointer Debug] applyStyleToSelected - selectedIds:', Array.from(cfg.selectedIds || []), 'strokeDashStyle:', cfg.strokeDashStyle, 'strokeDashArray:', cfg.strokeDashArray);
    cfg.selectedIds.forEach(function(id) {
      var obj = cfg.objectsMap.get(id);
      if (!obj) return;
      if (obj.attrs) {
        obj.attrs.stroke = cfg.strokeColor;
        obj.attrs.fill = cfg.fillColor;
        obj.attrs.strokeWidth = cfg.strokeWidth;
        obj.attrs.strokeDashStyle = cfg.strokeDashStyle;
        obj.attrs.strokeDashArray = cfg.strokeDashArray || '6,6';
        obj.attrs.strokeCap = cfg.strokeCap || 'butt';
        obj.attrs.strokeJoin = cfg.strokeJoin || 'miter';
      }
      obj.el.setAttribute('stroke', cfg.strokeColor);
      obj.el.setAttribute('fill', cfg.fillColor);
      obj.el.setAttribute('stroke-width', cfg.strokeWidth);
      obj.el.setAttribute('stroke-linecap', cfg.strokeCap || 'butt');
      obj.el.setAttribute('stroke-linejoin', cfg.strokeJoin || 'miter');

      if (cfg.strokeDashStyle === 'dashed' && cfg.strokeDashArray) {
        console.log('[Webpointer Debug] Setting stroke-dasharray on element #' + id + ' to:', cfg.strokeDashArray);
        obj.el.setAttribute('stroke-dasharray', cfg.strokeDashArray);
      } else {
        console.log('[Webpointer Debug] Removing stroke-dasharray from element #' + id);
        obj.el.removeAttribute('stroke-dasharray');
      }

      if (cfg.startMarker !== 'none') obj.el.setAttribute('marker-start', 'url(#marker-start-' + cfg.startMarker + ')');
      else obj.el.removeAttribute('marker-start');
      if (cfg.endMarker !== 'none') obj.el.setAttribute('marker-end', 'url(#marker-end-' + cfg.endMarker + ')');
      else obj.el.removeAttribute('marker-end');

      window.WebpointerRender.updateElementAttributes(obj);
      console.log('[Webpointer SVG Rendered Code] ID: ' + id + ' | Type: ' + obj.type + ' | SVG Code:\n' + obj.el.outerHTML);
    });
  };

  window.setStartMarker = function(val) {
    cfg.startMarker = val;
    window.updateSvgDefs();
    window.applyStyleToSelected();
    render.renderRibbon();
  };

  window.setEndMarker = function(val) {
    cfg.endMarker = val;
    window.updateSvgDefs();
    window.applyStyleToSelected();
    render.renderRibbon();
  };

  window.setStartMarkerFillStyle = function(style) {
    cfg.startMarkerFillStyle = style;
    window.updateSvgDefs();
    window.applyStyleToSelected();
    render.renderRibbon();
  };

  window.setEndMarkerFillStyle = function(style) {
    cfg.endMarkerFillStyle = style;
    window.updateSvgDefs();
    window.applyStyleToSelected();
    render.renderRibbon();
  };

  window.setMarkerFillStyle = function(style) {
    cfg.startMarkerFillStyle = style;
    cfg.endMarkerFillStyle = style;
    window.updateSvgDefs();
    window.applyStyleToSelected();
    render.renderRibbon();
  };

  // UniPalette Custom Color Swatch Modal Handlers
  window.openPaletteModal = function() {
    var modal = document.getElementById('paletteModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'paletteModal';
      modal.className = 'palette-modal-backdrop';
      modal.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15,23,42,0.75); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:9999; opacity:0; pointer-events:none; transition:opacity 0.2s ease;';
      modal.innerHTML = 
        '<div class="palette-modal-card" style="background:#ffffff; color:#0f172a; border-radius:12px; width:90%; max-width:520px; padding:24px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.3); display:flex; flex-direction:column; gap:14px;">' +
          '<div class="palette-modal-header" style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding-bottom:10px;">' +
            '<div class="palette-modal-title" style="font-size:1.1rem; font-weight:700; color:#0284c7; display:flex; align-items:center; gap:8px;">🎨 기본 색상 가져오기 (UniPalette 연동)</div>' +
          '</div>' +
          '<div class="palette-modal-desc" style="font-size:0.85rem; color:#64748b; line-height:1.4;">' +
            'UniPalette에서 클립보드로 복사한 코드(예: <code>const colorPalette = ["#2AA314", ...];</code>)를 아래 상자에 붙여넣고 [변경]을 클릭하세요. (최대 24개까지 순차 등록됩니다)' +
          '</div>' +
          '<textarea class="palette-modal-textarea" id="paletteTextarea" style="width:100%; height:130px; padding:10px; font-family:monospace; font-size:0.82rem; border:1px solid #cbd5e1; border-radius:8px; outline:none; resize:vertical; color:#0f172a; background:#f8fafc;" placeholder=\'const colorPalette = [\n  "#2AA314", "#14A36A", "#1471A3", "#2314A3", "#8E14A3", "#A3144D", "#A34614", "#95A314"\n];\'></textarea>' +
          '<div class="palette-modal-actions" style="display:flex; justify-content:flex-end; gap:10px; margin-top:4px;">' +
            '<button class="palette-modal-btn secondary" onclick="closePaletteModal()" style="padding:8px 18px; font-size:0.85rem; font-weight:600; border-radius:6px; cursor:pointer; border:none; background:#e2e8f0; color:#475569;">취소</button>' +
            '<button class="palette-modal-btn primary" onclick="applyImportedPalette()" style="padding:8px 18px; font-size:0.85rem; font-weight:600; border-radius:6px; cursor:pointer; border:none; background:#0284c7; color:#ffffff;">변경</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);
    }
    
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';
    modal.classList.add('show');
    var textarea = document.getElementById('paletteTextarea');
    if (textarea) {
      textarea.value = '';
      textarea.focus();
    }
  };

  window.closePaletteModal = function() {
    var modal = document.getElementById('paletteModal');
    if (modal) {
      modal.style.opacity = '0';
      modal.style.pointerEvents = 'none';
      modal.classList.remove('show');
    }
  };

  window.setActiveColorTarget = function(target) {
    cfg.activeColorTarget = target;
    render.renderRibbon();
  };

  window.applyImportedPalette = function() {
    var textarea = document.getElementById('paletteTextarea');
    if (!textarea) return;
    var rawText = textarea.value.trim();
    if (!rawText) {
      window.closePaletteModal();
      return;
    }

    // Parse hex colors from UniPalette JS output array string (Max 24 user slots for 9x3 grid)
    var regex = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
    var matches = rawText.match(regex);

    if (matches && matches.length > 0) {
      var extractedColors = [];
      matches.forEach(function(hex) {
        if (extractedColors.length < 24) {
          extractedColors.push(hex.toLowerCase());
        }
      });

      cfg.customPalette = extractedColors;
      render.renderRibbon();
    }

    window.closePaletteModal();
  };

  window.applyPaletteColor = function(hexColor) {
    var target = cfg.activeColorTarget || 'stroke';
    if (target === 'stroke') {
      window.setStrokeColor(hexColor);
    } else {
      window.setFillColor(hexColor);
    }
    render.renderRibbon();
  };

  window.applyStyleToSelected = function() {
    cfg.selectedIds.forEach(function(id) {
      var obj = cfg.objectsMap.get(id);
      if (!obj) return;
      if (obj.attrs) {
        obj.attrs.stroke = cfg.strokeColor;
        obj.attrs.fill = cfg.fillColor;
        obj.attrs.strokeWidth = cfg.strokeWidth;
      }
      obj.el.setAttribute('stroke', cfg.strokeColor);
      obj.el.setAttribute('fill', cfg.fillColor);
      obj.el.setAttribute('stroke-width', cfg.strokeWidth);
      if (cfg.startMarker !== 'none') obj.el.setAttribute('marker-start', 'url(#marker-start-' + cfg.startMarker + ')');
      else obj.el.removeAttribute('marker-start');
      if (cfg.endMarker !== 'none') obj.el.setAttribute('marker-end', 'url(#marker-end-' + cfg.endMarker + ')');
      else obj.el.removeAttribute('marker-end');
    });
  };

  window.scaleMarker = function(pos, factor) {
    if (pos === 'both') {
      cfg.startMarkerScale *= factor;
      cfg.endMarkerScale *= factor;
    } else if (pos === 'start') {
      cfg.startMarkerScale *= factor;
    } else {
      cfg.endMarkerScale *= factor;
    }
    render.updateSvgDefs();
    render.renderRibbon();
  };

  // Immediate App Initialization Function
  function initApp() {
    var mainSvg = document.getElementById('mainSvg');
    var statRaw = document.getElementById('statRaw');
    var statStep = document.getElementById('statStep');
    if (!mainSvg) return;

    if (mainSvg.dataset.initialized === 'true') {
      render.renderGrid();
      render.updateSvgDefs();
      render.renderRibbon();
      return;
    }
    mainSvg.dataset.initialized = 'true';

    mainSvg.addEventListener('mousedown', function(e) {
      var coords = getStepCoords(e);
      if (statRaw) statRaw.textContent = '(' + coords.rawX + ', ' + coords.rawY + ')';
      if (statStep) statStep.textContent = 'Step (' + coords.stepX + ', ' + coords.stepY + ')';

      if (state.isDraggingHandle) return;

      var targetObj = e.target.closest('circle, line, rect, ellipse, path, text, tspan');
      if (targetObj && targetObj.tagName.toLowerCase() === 'tspan') {
        targetObj = targetObj.closest('text');
      }

      if (cfg.currentTool === 'bez2' || cfg.currentTool === 'bez3') {
        if (!state.isMultiBezierActive) {
          state.isMultiBezierActive = true;
          state.bezierPoints = [coords];
          cfg.selectedIds.clear();
          state.activeBezierObj = createSvgObject(cfg.currentTool, coords, coords);
          cfg.selectedIds.add(state.activeBezierObj.id);
        } else {
          state.bezierPoints.push(coords);
          var pathD = buildContinuousBezierPathD(state.bezierPoints, null, cfg.currentTool, state.activeBezierObj.attrs.firstCtrl, null, null, state.activeBezierObj.attrs.ctrls3);
          state.activeBezierObj.attrs.pathD = pathD;
          state.activeBezierObj.attrs.points = state.bezierPoints.slice();
          render.updateElementAttributes(state.activeBezierObj);
        }
        render.renderUI();
        render.renderRibbon();
        return;
      }

      if (cfg.currentTool === 'select') {
        var isClickOnSelectionBorder = (e.target && e.target.parentNode && e.target.parentNode.id === 'uiGroup' && e.target.tagName.toLowerCase() === 'rect');
        if ((targetObj && cfg.objectsMap.has(targetObj.id)) || isClickOnSelectionBorder) {
          if (targetObj && cfg.objectsMap.has(targetObj.id)) {
            selectObjectWithGroup(targetObj.id, e.ctrlKey);
          }

          state.isDraggingObject = true;
          state.dragStartCoords = coords;
          state.initialObjAttrsMap.clear();
          cfg.selectedIds.forEach(function(id) {
            var obj = cfg.objectsMap.get(id);
            if (obj) {
              state.initialObjAttrsMap.set(id, JSON.parse(JSON.stringify(obj.attrs)));
            }
          });
        } else {
          var nearestObj = findNearestObject(coords.px, coords.py);
          if (nearestObj) {
            selectObjectWithGroup(nearestObj.id, e.ctrlKey);

            state.isDraggingObject = true;
            state.dragStartCoords = coords;
            state.initialObjAttrsMap.clear();
            cfg.selectedIds.forEach(function(id) {
              var obj = cfg.objectsMap.get(id);
              if (obj) {
                state.initialObjAttrsMap.set(id, JSON.parse(JSON.stringify(obj.attrs)));
              }
            });
          } else {
            if (!e.ctrlKey) cfg.selectedIds.clear();
            state.isMarquee = true;
          }
        }
        render.renderUI();
        render.renderRibbon();
      } else if (cfg.currentTool === 'text') {
        state.isDrawing = false;
        startDirectCanvasTyping(coords.px, coords.py);
        cfg.currentTool = 'select';
        render.renderRibbon();
        return;
      } else if (cfg.currentTool === 'point') {
        state.isDrawing = false;
        cfg.selectedIds.clear();
        var pointObj = createSvgObject('point', coords, coords);
        cfg.selectedIds.add(pointObj.id);
        render.renderUI();
        cfg.currentTool = 'select';
        render.renderRibbon();
      } else {
        if (targetObj && cfg.objectsMap.has(targetObj.id) && cfg.selectedIds.has(targetObj.id)) {
          state.isDraggingObject = true;
          state.dragStartCoords = coords;
          state.initialObjAttrsMap.clear();
          cfg.selectedIds.forEach(function(id) {
            var obj = cfg.objectsMap.get(id);
            if (obj) {
              state.initialObjAttrsMap.set(id, JSON.parse(JSON.stringify(obj.attrs)));
            }
          });
        } else {
          state.isDrawing = true;
          state.drawStartStep = coords;
          cfg.selectedIds.clear();
          state.activeTempObj = createSvgObject(cfg.currentTool, coords, coords);
          cfg.selectedIds.add(state.activeTempObj.id);
        }
        render.renderUI();
        render.renderRibbon();
      }
    });

    mainSvg.addEventListener('dblclick', function(e) {
      var targetObj = e.target.closest('text');
      if (!targetObj) {
        var allObjs = Array.from(cfg.objectsMap.values());
        var foundTextObj = allObjs.find(function(o) { return o.type === 'text' && (o.el === e.target || (o.el.contains && o.el.contains(e.target))); });
        if (foundTextObj) targetObj = foundTextObj.el;
      }
      if (targetObj && cfg.objectsMap.has(targetObj.id)) {
        var obj = cfg.objectsMap.get(targetObj.id);
        if (obj && obj.type === 'text') {
          startDirectCanvasTyping(obj.attrs.x, obj.attrs.y, obj);
        }
      }
    });

    mainSvg.addEventListener('mousemove', function(e) {
      var coords = getStepCoords(e);
      if (statRaw) statRaw.textContent = '(' + coords.rawX + ', ' + coords.rawY + ')';
      if (statStep) statStep.textContent = 'Step (' + coords.stepX + ', ' + coords.stepY + ')';

      if (cfg.currentTool === 'text') {
        mainSvg.style.cursor = 'text';
        return;
      }

      // Hover Mouse Cursor Dynamic Feedback in Select Tool Mode
      if (cfg.currentTool === 'select' && !state.isDraggingHandle && !state.isDraggingObject) {
        var hoverTarget = e.target.closest('circle, line, rect, ellipse, path, text, tspan');
        if (hoverTarget && hoverTarget.tagName.toLowerCase() === 'tspan') hoverTarget = hoverTarget.closest('text');
        if (hoverTarget && cfg.objectsMap.has(hoverTarget.id)) {
          mainSvg.style.cursor = cfg.selectedIds.has(hoverTarget.id) ? 'move' : 'pointer';
        } else {
          var nearObj = findNearestObject(coords.px, coords.py);
          mainSvg.style.cursor = nearObj ? 'pointer' : 'default';
        }
      }

      // 1. Handle Node Dragging (Real-time Redraw with Symmetric Reflected Control Points for 3차 Bezier)
      if (state.isDraggingHandle && state.activeHandleInfo) {
        var obj = cfg.objectsMap.get(state.activeHandleInfo.objId);
        if (obj) {
          var a = obj.attrs;
          if (state.activeHandleInfo.handleType === 'point_center') {
            a.cx = coords.px; a.cy = coords.py;
            a.stepX = coords.stepX; a.stepY = coords.stepY;
          } else if (state.activeHandleInfo.handleType === 'ellipse_center' || state.activeHandleInfo.handleType === 'arc_center') {
            a.cx = coords.px; a.cy = coords.py;
            a.stepCx = coords.stepX; a.stepCy = coords.stepY;
          } else if (state.activeHandleInfo.handleType === 'ellipse_width' || state.activeHandleInfo.handleType === 'arc_rx') {
            a.rx = Math.max(5, Math.abs(coords.px - a.cx));
          } else if (state.activeHandleInfo.handleType === 'ellipse_height' || state.activeHandleInfo.handleType === 'arc_ry') {
            a.ry = Math.max(5, Math.abs(coords.py - a.cy));
          } else if (state.activeHandleInfo.handleType === 'ellipse_rotate' || state.activeHandleInfo.handleType === 'arc_rotate') {
            var rad = Math.atan2(coords.py - a.cy, coords.px - a.cx);
            a.angle = Math.round((rad * (180 / Math.PI)) + 90);
          } else if (state.activeHandleInfo.handleType === 'arc_start_angle') {
            var radS = Math.atan2(coords.py - a.cy, coords.px - a.cx);
            a.startAngle = Math.round(radS * (180 / Math.PI)) - (a.angle || 0);
          } else if (state.activeHandleInfo.handleType === 'arc_end_angle') {
            var radE = Math.atan2(coords.py - a.cy, coords.px - a.cx);
            a.endAngle = Math.round(radE * (180 / Math.PI)) - (a.angle || 0);
          } else if (state.activeHandleInfo.handleType === 'bez2_ctrl') {
            a.cx = coords.px; a.cy = coords.py;
            a.firstCtrl = { cx: coords.px, cy: coords.py };
            if (a.points && a.points.length >= 2) {
              a.pathD = buildContinuousBezierPathD(a.points, null, obj.type, a.firstCtrl);
            }
          } else if (state.activeHandleInfo.handleType === 'bez_vertex') {
            var idx = state.activeHandleInfo.idx;
            if (a.points && a.points[idx]) {
              a.points[idx].px = coords.px;
              a.points[idx].py = coords.py;
              a.pathD = buildContinuousBezierPathD(a.points, null, obj.type, a.firstCtrl, null, null, a.ctrls3);
            }
          } else if (state.activeHandleInfo.handleType === 'bez3_c1') {
            var sIdx1 = state.activeHandleInfo.idx;
            if (a.ctrls3 && a.ctrls3[sIdx1]) {
              a.ctrls3[sIdx1].c1 = { x: coords.px, y: coords.py };
              // Symmetric reflection update for previous segment's c2
              if (sIdx1 > 0 && a.points && a.points[sIdx1]) {
                var vShared1 = a.points[sIdx1];
                a.ctrls3[sIdx1 - 1].c2 = { x: 2 * vShared1.px - coords.px, y: 2 * vShared1.py - coords.py };
              }
              a.pathD = buildContinuousBezierPathD(a.points, null, obj.type, a.firstCtrl, null, null, a.ctrls3);
            }
          } else if (state.activeHandleInfo.handleType === 'bez3_c2') {
            var sIdx2 = state.activeHandleInfo.idx;
            if (a.ctrls3 && a.ctrls3[sIdx2]) {
              a.ctrls3[sIdx2].c2 = { x: coords.px, y: coords.py };
              // Symmetric reflection update for next segment's c1
              if (sIdx2 < a.ctrls3.length - 1 && a.points && a.points[sIdx2 + 1]) {
                var vShared2 = a.points[sIdx2 + 1];
                a.ctrls3[sIdx2 + 1].c1 = { x: 2 * vShared2.px - coords.px, y: 2 * vShared2.py - coords.py };
              }
              a.pathD = buildContinuousBezierPathD(a.points, null, obj.type, a.firstCtrl, null, null, a.ctrls3);
            }
          } else if (state.activeHandleInfo.handleType === 'top_left') {
            var oldRight = a.x + a.width;
            var oldBottom = a.y + a.height;
            a.x = Math.min(oldRight - 10, coords.px);
            a.y = Math.min(oldBottom - 10, coords.py);
            a.width = oldRight - a.x;
            a.height = oldBottom - a.y;
          } else if (state.activeHandleInfo.handleType === 'bottom_right') {
            a.width = Math.max(10, coords.px - a.x);
            a.height = Math.max(10, coords.py - a.y);
          } else if (state.activeHandleInfo.handleType === 'corner_rx') {
            a.rx = Math.max(0, Math.min(Math.round(a.width / 2), coords.px - a.x));
          } else if (state.activeHandleInfo.handleType === 'start') {
            a.x1 = coords.px; a.y1 = coords.py;
          } else if (state.activeHandleInfo.handleType === 'end') {
            a.x2 = coords.px; a.y2 = coords.py;
          }
          render.updateElementAttributes(obj);
          render.renderUI();
        }
        return;
      }

      // 2. Object Body Drag Move
      if (state.isDraggingObject && state.dragStartCoords) {
        var deltaPx = coords.px - state.dragStartCoords.px;
        var deltaPy = coords.py - state.dragStartCoords.py;

        cfg.selectedIds.forEach(function(id) {
          var obj = cfg.objectsMap.get(id);
          var initialAttrs = state.initialObjAttrsMap.get(id);
          if (!obj || !initialAttrs) return;
          var a = obj.attrs;

          if (obj.type === 'point' || obj.type === 'ellipse' || obj.type === 'arc') {
            a.cx = initialAttrs.cx + deltaPx;
            a.cy = initialAttrs.cy + deltaPy;
          } else if (obj.type === 'line') {
            a.x1 = initialAttrs.x1 + deltaPx;
            a.y1 = initialAttrs.y1 + deltaPy;
            a.x2 = initialAttrs.x2 + deltaPx;
            a.y2 = initialAttrs.y2 + deltaPy;
          } else if (obj.type === 'rect' || obj.type === 'rounded' || obj.type === 'text') {
            a.x = initialAttrs.x + deltaPx;
            a.y = initialAttrs.y + deltaPy;
          } else if (obj.type === 'bez2' || obj.type === 'bez3') {
            if (initialAttrs.points && initialAttrs.points.length > 0) {
              a.points = initialAttrs.points.map(function(pt) {
                return { px: pt.px + deltaPx, py: pt.py + deltaPy, stepX: pt.stepX, stepY: pt.stepY };
              });
              if (initialAttrs.firstCtrl) {
                a.firstCtrl = { cx: initialAttrs.firstCtrl.cx + deltaPx, cy: initialAttrs.firstCtrl.cy + deltaPy };
              }
              if (initialAttrs.ctrls3) {
                a.ctrls3 = initialAttrs.ctrls3.map(function(cPair) {
                  return {
                    c1: { x: cPair.c1.x + deltaPx, y: cPair.c1.y + deltaPy },
                    c2: { x: cPair.c2.x + deltaPx, y: cPair.c2.y + deltaPy }
                  };
                });
              }
              a.pathD = buildContinuousBezierPathD(a.points, null, obj.type, a.firstCtrl, null, null, a.ctrls3);
            } else {
              a.x1 = initialAttrs.x1 + deltaPx;
              a.y1 = initialAttrs.y1 + deltaPy;
              a.x2 = initialAttrs.x2 + deltaPx;
              a.y2 = initialAttrs.y2 + deltaPy;
              if (a.cx !== undefined) { a.cx = initialAttrs.cx + deltaPx; a.cy = initialAttrs.cy + deltaPy; }
              if (a.c1x !== undefined) { a.c1x = initialAttrs.c1x + deltaPx; a.c1y = initialAttrs.c1y + deltaPy; }
              if (a.c2x !== undefined) { a.c2x = initialAttrs.c2x + deltaPx; a.c2y = initialAttrs.c2y + deltaPy; }
            }
          }
          render.updateElementAttributes(obj);
        });
        render.renderUI();
        return;
      }

      // 3. Continuous Multi-Click Bezier Real-time Mousemove Preview
      if (state.isMultiBezierActive && state.activeBezierObj) {
        var previewD = buildContinuousBezierPathD(state.bezierPoints, coords, cfg.currentTool, state.activeBezierObj.attrs.firstCtrl, null, null, state.activeBezierObj.attrs.ctrls3);
        state.activeBezierObj.attrs.pathD = previewD;
        render.updateElementAttributes(state.activeBezierObj);
        render.renderUI();
        return;
      }

      // 4. New Shape Drawing Drag (Real-time Preview for other shapes)
      if (state.isDrawing && state.activeTempObj && state.drawStartStep) {
        var px1 = (state.drawStartStep.stepX / cfg.STEPS_X) * cfg.SVG_WIDTH;
        var py1 = (state.drawStartStep.stepY / cfg.STEPS_Y) * cfg.SVG_HEIGHT;
        var px2 = coords.px;
        var py2 = coords.py;
        var aTemp = state.activeTempObj.attrs;

        if (state.activeTempObj.type === 'line') {
          aTemp.x2 = px2;
          aTemp.y2 = py2;
        } else if (state.activeTempObj.type === 'arc') {
          aTemp.cx = px1;
          aTemp.cy = py1;
          aTemp.rx = Math.max(10, Math.abs(px2 - px1));
          aTemp.ry = Math.max(10, Math.abs(py2 - py1));
          aTemp.startAngle = -90;
          aTemp.endAngle = Math.round(Math.atan2(py2 - py1, px2 - px1) * (180 / Math.PI));
        } else if (state.activeTempObj.type === 'rect' || state.activeTempObj.type === 'rounded') {
          aTemp.x = Math.min(px1, px2);
          aTemp.y = Math.min(py1, py2);
          aTemp.width = Math.max(10, Math.abs(px2 - px1));
          aTemp.height = Math.max(10, Math.abs(py2 - py1));
        } else if (state.activeTempObj.type === 'ellipse') {
          aTemp.cx = (px1 + px2) / 2;
          aTemp.cy = (py1 + py2) / 2;
          aTemp.rx = Math.max(5, Math.abs(px2 - px1) / 2);
          aTemp.ry = Math.max(5, Math.abs(py2 - py1) / 2);
        }
        render.updateElementAttributes(state.activeTempObj);
        render.renderUI();
      }
    });

    mainSvg.addEventListener('mouseup', function(e) {
      if (state.isMultiBezierActive) return;

      var coords = getStepCoords(e);
      if (state.isDrawing && state.activeTempObj && state.drawStartStep) {
        var startPx = (state.drawStartStep.stepX / cfg.STEPS_X) * cfg.SVG_WIDTH;
        var startPy = (state.drawStartStep.stepY / cfg.STEPS_Y) * cfg.SVG_HEIGHT;
        var dist = Math.sqrt((coords.px - startPx) * (coords.px - startPx) + (coords.py - startPy) * (coords.py - startPy));

        // Short click (distance <= 10px): Apply default shape size presets
        if (dist <= 10) {
          var sz = cfg.defaultShapeSize || 100;
          var a = state.activeTempObj.attrs;
          if (state.activeTempObj.type === 'line') {
            a.x1 = startPx; a.y1 = startPy;
            a.x2 = startPx + sz; a.y2 = startPy;
          } else if (state.activeTempObj.type === 'rect') {
            a.x = startPx; a.y = startPy;
            a.width = sz; a.height = sz;
          } else if (state.activeTempObj.type === 'ellipse') {
            a.cx = startPx; a.cy = startPy;
            a.rx = sz / 2; a.ry = sz / 2;
          } else if (state.activeTempObj.type === 'arc') {
            a.cx = startPx; a.cy = startPy;
            a.rx = sz / 2; a.ry = sz / 2;
            a.startAngle = -90; // 12 o'clock
            a.endAngle = 0;    // 3 o'clock
          } else if (state.activeTempObj.type === 'rounded') {
            a.x = startPx; a.y = startPy;
            a.width = sz; a.height = sz;
            a.rx = 15;
          }
          render.updateElementAttributes(state.activeTempObj);
          render.renderUI();
        }

        // Automatic tool switch back to 'select' after creation
        cfg.currentTool = 'select';
        render.renderRibbon();
      }

      state.isDrawing = false;
      state.isMarquee = false;
      state.isDraggingHandle = false;
      state.isDraggingObject = false;
      state.activeHandleInfo = null;
      state.dragStartCoords = null;
      state.initialObjAttrsMap.clear();
      state.activeTempObj = null;
    });

    window.addEventListener('keydown', function(e) {
      if (e.key === 'Alt') {
        document.body.classList.add('show-alt-keybinds');
      } else if (e.key === 'Escape') {
        // Esc Key: Finish Multi-Bezier or cancel active drawing and switch to Select Tool
        if (state.isMultiBezierActive) {
          finishMultiBezier();
        } else if (state.isDrawing && state.activeTempObj) {
          state.activeTempObj.el.remove();
          cfg.objectsMap.delete(state.activeTempObj.id);
          cfg.selectedIds.delete(state.activeTempObj.id);
          state.isDrawing = false;
          state.activeTempObj = null;
          cfg.currentTool = 'select';
          render.renderRibbon();
          render.renderUI();
        }
      }
    });

    window.addEventListener('keyup', function(e) {
      if (e.key === 'Alt') {
        document.body.classList.remove('show-alt-keybinds');
      }
    });

    // Boot Applications
    render.renderGrid();
    render.updateSvgDefs();
    render.renderRibbon();
  }

  // Execute immediate setup
  initApp();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  }
})();
