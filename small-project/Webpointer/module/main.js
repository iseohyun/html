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
    } else if (obj.type === 'rect' || obj.type === 'rounded') {
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

    el.setAttribute('id', id);
    el.setAttribute('stroke', cfg.strokeColor || '#041e49');
    el.setAttribute('fill', cfg.fillColor || 'none');
    el.setAttribute('stroke-width', cfg.strokeWidth || 2);

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

  // Precise Alignment Function (Align Left, Right, Top, Bottom, H-Center, V-Center)
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

    if (topUnitsMap.size < 2) return;

    // Calculate bounds per unit and overall selection bounds
    var unitInfoList = [];
    var overallMinX = Infinity, overallMinY = Infinity, overallMaxX = -Infinity, overallMaxY = -Infinity;

    topUnitsMap.forEach(function(objectsInUnit, unitKey) {
      var uMinX = Infinity, uMinY = Infinity, uMaxX = -Infinity, uMaxY = -Infinity;
      objectsInUnit.forEach(function(obj) {
        var b = getObjectBounds(obj);
        uMinX = Math.min(uMinX, b.minX);
        uMaxX = Math.max(uMaxX, b.maxX);
        uMinY = Math.min(uMinY, b.minY);
        uMaxY = Math.max(uMaxY, b.maxY);
      });

      overallMinX = Math.min(overallMinX, uMinX);
      overallMaxX = Math.max(overallMaxX, uMaxX);
      overallMinY = Math.min(overallMinY, uMinY);
      overallMaxY = Math.max(overallMaxY, uMaxY);

      unitInfoList.push({
        objects: objectsInUnit,
        minX: uMinX,
        maxX: uMaxX,
        minY: uMinY,
        maxY: uMaxY,
        centerX: (uMinX + uMaxX) / 2,
        centerY: (uMinY + uMaxY) / 2
      });
    });

    var overallCenterX = (overallMinX + overallMaxX) / 2;
    var overallCenterY = (overallMinY + overallMaxY) / 2;

    // Apply alignment delta to each top-level unit
    unitInfoList.forEach(function(info) {
      var deltaX = 0, deltaY = 0;
      if (type === 'left') {
        deltaX = overallMinX - info.minX;
      } else if (type === 'right') {
        deltaX = overallMaxX - info.maxX;
      } else if (type === 'hcenter') {
        deltaX = overallCenterX - info.centerX;
      } else if (type === 'top') {
        deltaY = overallMinY - info.minY;
      } else if (type === 'bottom') {
        deltaY = overallMaxY - info.maxY;
      } else if (type === 'vcenter') {
        deltaY = overallCenterY - info.centerY;
      }

      info.objects.forEach(function(obj) {
        shiftObject(obj, deltaX, deltaY);
      });
    });

    render.renderUI();
  };

  window.applyStyleToSelected = function() {
    cfg.selectedIds.forEach(function(id) {
      var obj = cfg.objectsMap.get(id);
      if (!obj) return;
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
    if (pos === 'start') cfg.startMarkerScale *= factor;
    else cfg.endMarkerScale *= factor;
    render.updateSvgDefs();
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

      var targetObj = e.target.closest('circle, line, rect, ellipse, path');

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
        if (targetObj && cfg.objectsMap.has(targetObj.id)) {
          selectObjectWithGroup(targetObj.id, e.ctrlKey);

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

    mainSvg.addEventListener('mousemove', function(e) {
      var coords = getStepCoords(e);
      if (statRaw) statRaw.textContent = '(' + coords.rawX + ', ' + coords.rawY + ')';
      if (statStep) statStep.textContent = 'Step (' + coords.stepX + ', ' + coords.stepY + ')';

      // Hover Mouse Cursor Dynamic Feedback in Select Tool Mode
      if (cfg.currentTool === 'select' && !state.isDraggingHandle && !state.isDraggingObject) {
        var hoverTarget = e.target.closest('circle, line, rect, ellipse, path');
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
          } else if (obj.type === 'rect' || obj.type === 'rounded') {
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
