(function(window) {
  'use strict';

  var cfg = window.WebpointerConfig;

  function updateElementAttributes(obj) {
    if (!obj || !obj.el) return;
    var a = obj.attrs;

    if (obj.type === 'point') {
      obj.el.setAttribute('cx', a.cx);
      obj.el.setAttribute('cy', a.cy);
      obj.el.setAttribute('r', a.r || cfg.pointRadius || 5);
    } else if (obj.type === 'line') {
      obj.el.setAttribute('x1', a.x1);
      obj.el.setAttribute('y1', a.y1);
      obj.el.setAttribute('x2', a.x2);
      obj.el.setAttribute('y2', a.y2);
    } else if (obj.type === 'rect' || obj.type === 'rounded') {
      obj.el.setAttribute('x', a.x);
      obj.el.setAttribute('y', a.y);
      obj.el.setAttribute('width', Math.max(1, a.width));
      obj.el.setAttribute('height', Math.max(1, a.height));
      if (obj.type === 'rounded') {
        obj.el.setAttribute('rx', a.rx !== undefined ? a.rx : 15);
      }
    } else if (obj.type === 'ellipse') {
      obj.el.setAttribute('cx', a.cx);
      obj.el.setAttribute('cy', a.cy);
      obj.el.setAttribute('rx', Math.max(1, a.rx));
      obj.el.setAttribute('ry', Math.max(1, a.ry));
      if (a.angle) {
        obj.el.setAttribute('transform', 'rotate(' + a.angle + ' ' + a.cx + ' ' + a.cy + ')');
      } else {
        obj.el.removeAttribute('transform');
      }
    } else if (obj.type === 'arc') {
      obj.el.setAttribute('cx', a.cx);
      obj.el.setAttribute('cy', a.cy);
      obj.el.setAttribute('rx', Math.max(1, a.rx));
      obj.el.setAttribute('ry', Math.max(1, a.ry));

      var rot = a.angle || 0;
      var sAng = a.startAngle !== undefined ? a.startAngle : -90;
      var eAng = a.endAngle !== undefined ? a.endAngle : 0;

      function getArcPoint(cx, cy, rx, ry, deg, rotDeg) {
        var rad = deg * (Math.PI / 180);
        var rotRad = rotDeg * (Math.PI / 180);
        var px = rx * Math.cos(rad);
        var py = ry * Math.sin(rad);
        var rxRot = px * Math.cos(rotRad) - py * Math.sin(rotRad);
        var ryRot = px * Math.sin(rotRad) + py * Math.cos(rotRad);
        return { x: cx + rxRot, y: cy + ryRot };
      }

      var p1 = getArcPoint(a.cx, a.cy, a.rx, a.ry, sAng, rot);
      var p2 = getArcPoint(a.cx, a.cy, a.rx, a.ry, eAng, rot);

      var sweepDiff = (eAng - sAng + 360) % 360;
      var largeArcFlag = sweepDiff > 180 ? 1 : 0;

      var d = 'M ' + p1.x + ' ' + p1.y +
              ' A ' + a.rx + ' ' + a.ry + ' ' + rot + ' ' + largeArcFlag + ' 1 ' + p2.x + ' ' + p2.y;
      obj.el.setAttribute('d', d);
    } else if (obj.type === 'bez2' || obj.type === 'bez3') {
      if (a.pathD) {
        obj.el.setAttribute('d', a.pathD);
      } else if (obj.type === 'bez2') {
        obj.el.setAttribute('d', 'M ' + a.x1 + ' ' + a.y1 + ' Q ' + a.cx + ' ' + a.cy + ' ' + a.x2 + ' ' + a.y2);
      } else if (obj.type === 'bez3') {
        obj.el.setAttribute('d', 'M ' + a.x1 + ' ' + a.y1 + ' C ' + a.c1x + ' ' + a.c1y + ', ' + a.c2x + ' ' + a.c2y + ', ' + a.x2 + ' ' + a.y2);
      }
    } else if (obj.type === 'text') {
      obj.el.setAttribute('x', a.x);
      obj.el.setAttribute('y', a.y);
      var fSize = a.fontSize !== undefined ? a.fontSize : (cfg.fontSize || 20);
      var fFamily = a.fontFamily || cfg.fontFamily || 'sans-serif';
      var fWeight = a.fontWeight || cfg.fontWeight || 'normal';
      var fStyle = a.fontStyle || cfg.fontStyle || 'normal';
      var tDeco = a.textDecoration || cfg.textDecoration || 'none';
      var tAnchor = a.textAnchor || cfg.textAnchor || 'start';
      var lHeight = a.lineHeight !== undefined ? a.lineHeight : (cfg.lineHeight || 1.2);

      var dBase = a.dominantBaseline || cfg.textDominantBaseline || 'alphabetic';
      var wMode = a.writingMode || cfg.textWritingMode || 'horizontal-tb';

      var uColor  = a.underlineColor || cfg.textUnderlineColor || 'currentColor';
      var uStyle  = a.underlineStyle || cfg.textUnderlineStyle || 'solid';
      var uOffset = a.underlineOffset !== undefined ? a.underlineOffset : (cfg.textUnderlineOffset !== undefined ? cfg.textUnderlineOffset : 3);
      var uWidth  = a.underlineWidth !== undefined ? a.underlineWidth : (cfg.textUnderlineWidth !== undefined ? cfg.textUnderlineWidth : 1);

      obj.el.setAttribute('font-size', fSize);
      obj.el.setAttribute('font-family', fFamily);
      obj.el.setAttribute('font-weight', fWeight);
      obj.el.setAttribute('font-style', fStyle);
      var isJustify = (tAnchor === 'justify');
      obj.el.setAttribute('text-anchor', isJustify ? 'start' : tAnchor);
      obj.el.setAttribute('dominant-baseline', dBase);
      obj.el.setAttribute('writing-mode', wMode);

      if (uStyle !== 'none') {
        var decoVal = (tDeco && tDeco !== 'none') ? (tDeco + ' underline') : 'underline';
        obj.el.setAttribute('text-decoration', decoVal);
        obj.el.style.textDecorationLine = decoVal;
        obj.el.style.textDecorationColor = uColor;
        obj.el.style.textDecorationStyle = uStyle;
        obj.el.style.textUnderlineOffset = uOffset + 'px';
        obj.el.style.textDecorationThickness = uWidth + 'px';
      } else {
        obj.el.setAttribute('text-decoration', tDeco);
        obj.el.style.textDecorationLine = tDeco;
        obj.el.style.textDecorationColor = '';
        obj.el.style.textDecorationStyle = '';
        obj.el.style.textUnderlineOffset = '';
        obj.el.style.textDecorationThickness = '';
      }

      if (a.fill) {
        obj.el.setAttribute('fill', a.fill);
      } else {
        obj.el.setAttribute('fill', cfg.fillColor && cfg.fillColor !== 'none' ? cfg.fillColor : '#041e49');
      }

      if (a.stroke && a.stroke !== 'none') {
        obj.el.setAttribute('stroke', a.stroke);
        obj.el.setAttribute('stroke-width', a.strokeWidth !== undefined ? a.strokeWidth : (cfg.textStrokeWidth || 1));
      } else {
        obj.el.removeAttribute('stroke');
        obj.el.removeAttribute('stroke-width');
      }

      var lines = (a.text || '').split('\n');
      obj.el.innerHTML = '';
      if (lines.length <= 1) {
        obj.el.textContent = a.text || '';
      } else {
        var fontSizeNum = parseInt(fSize, 10);
        lines.forEach(function(lineStr, idx) {
          var tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
          tspan.setAttribute('x', a.x);
          if (idx === 0) {
            tspan.setAttribute('dy', 0);
          } else {
            tspan.setAttribute('dy', (fontSizeNum * lHeight) + 'px');
          }
          tspan.textContent = lineStr || '\u200B';
          obj.el.appendChild(tspan);
        });
      }

      // Render Custom SVG Underline Path Element
      if (uStyle !== 'none') {
        if (!obj.underlineEl) {
          var uEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          uEl.setAttribute('class', 'custom-text-underline');
          obj.underlineEl = uEl;
        }
        var objectsGroup = document.getElementById('objectsGroup');
        if (objectsGroup && (!obj.underlineEl.parentNode || obj.underlineEl.parentNode !== objectsGroup)) {
          objectsGroup.appendChild(obj.underlineEl);
        }

        var fontSizeNum = parseInt(fSize, 10);
        var strokeDash = 'none';
        if (uStyle === 'dashed') strokeDash = '6,4';
        else if (uStyle === 'dotted') strokeDash = '2,3';

        var dPath = '';
        lines.forEach(function(lineStr, idx) {
          var lineY = a.y + (idx * fontSizeNum * lHeight);
          var uY = lineY + uOffset;

          var lWidth = (lineStr || '').length * fontSizeNum * 0.55;
          try {
            if (obj.el && obj.el.getBBox) {
              var bb = obj.el.getBBox();
              if (bb.width > 0) lWidth = bb.width;
            }
          } catch(e) {}

          var x1 = a.x;
          var x2 = a.x + lWidth;
          if (tAnchor === 'middle') {
            x1 = a.x - (lWidth / 2);
            x2 = a.x + (lWidth / 2);
          } else if (tAnchor === 'end') {
            x1 = a.x - lWidth;
            x2 = a.x;
          }

          if (uStyle === 'double') {
            dPath += 'M ' + x1 + ' ' + uY + ' L ' + x2 + ' ' + uY + ' ';
            dPath += 'M ' + x1 + ' ' + (uY + Math.max(2, uWidth + 1)) + ' L ' + x2 + ' ' + (uY + Math.max(2, uWidth + 1)) + ' ';
          } else if (uStyle === 'wavy') {
            dPath += 'M ' + x1 + ' ' + uY + ' ';
            for (var wx = x1; wx < x2; wx += 6) {
              var nextX = Math.min(x2, wx + 6);
              var midX = (wx + nextX) / 2;
              dPath += 'Q ' + midX + ' ' + (uY - 2.5) + ' ' + nextX + ' ' + uY + ' ';
            }
          } else {
            dPath += 'M ' + x1 + ' ' + uY + ' L ' + x2 + ' ' + uY + ' ';
          }
        });

        obj.underlineEl.setAttribute('d', dPath);
        obj.underlineEl.setAttribute('stroke', uColor);
        obj.underlineEl.setAttribute('stroke-width', uWidth);
        obj.underlineEl.setAttribute('fill', 'none');
        obj.underlineEl.setAttribute('stroke-linecap', 'round');
        if (strokeDash !== 'none') {
          obj.underlineEl.setAttribute('stroke-dasharray', strokeDash);
        } else {
          obj.underlineEl.removeAttribute('stroke-dasharray');
        }

        var opVal = a.opacity !== undefined ? a.opacity : (cfg.opacity !== undefined ? cfg.opacity : 1);
        if (opVal < 1) {
          obj.underlineEl.setAttribute('opacity', opVal);
        } else {
          obj.underlineEl.removeAttribute('opacity');
        }
      } else {
        if (obj.underlineEl) {
          if (obj.underlineEl.parentNode) {
            obj.underlineEl.parentNode.removeChild(obj.underlineEl);
          }
          obj.underlineEl = null;
        }
      }
    }

    if (obj.type !== 'text') {
      if (a.stroke !== undefined) obj.el.setAttribute('stroke', a.stroke);
      if (a.fill !== undefined) obj.el.setAttribute('fill', a.fill);
      if (a.strokeWidth !== undefined) obj.el.setAttribute('stroke-width', a.strokeWidth);
    }

    var op = a.opacity !== undefined ? a.opacity : (cfg.opacity !== undefined ? cfg.opacity : 1);
    if (op < 1) {
      obj.el.setAttribute('opacity', op);
    } else {
      obj.el.removeAttribute('opacity');
    }

    var dashStyle = a.strokeDashStyle || 'solid';
    var dashArray = a.strokeDashArray || '6,6';
    if (dashStyle === 'dashed' && dashArray) {
      obj.el.setAttribute('stroke-dasharray', dashArray);
    } else {
      obj.el.removeAttribute('stroke-dasharray');
    }

    var strokeCap = a.strokeCap || cfg.strokeCap || 'butt';
    var strokeJoin = a.strokeJoin || cfg.strokeJoin || 'miter';
    obj.el.setAttribute('stroke-linecap', strokeCap);
    obj.el.setAttribute('stroke-linejoin', strokeJoin);

    // Stacked Non-destructive Filter Effects
    var filterStr = a.filter || cfg.filterStr || '';
    if (filterStr) {
      obj.el.setAttribute('filter', filterStr);
      obj.el.style.filter = filterStr;
    } else {
      obj.el.removeAttribute('filter');
      obj.el.style.filter = '';
    }

    // Non-destructive Clip-path Cropping
    var mainSvg = document.getElementById('mainSvg');
    if (mainSvg) {
      var clipId = 'crop_clip_' + obj.id;
      var existingClip = document.getElementById(clipId);
      var cL = a.cropLeft || 0, cT = a.cropTop || 0, cR = a.cropRight || 0, cB = a.cropBottom || 0;
      var hasCrop = a.crop || (cL > 0 || cT > 0 || cR > 0 || cB > 0);
      if (hasCrop) {
        var defs = mainSvg.querySelector('defs');
        if (!defs) {
          defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
          defs.setAttribute('id', 'svgDefs');
          mainSvg.insertBefore(defs, mainSvg.firstChild);
        }
        if (!existingClip) {
          existingClip = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
          existingClip.setAttribute('id', clipId);
          defs.appendChild(existingClip);
        }
        var cx = a.x || 0, cy = a.y || 0, cw = a.width || a.w || 100, ch = a.height || a.h || 100;
        var cL = a.cropLeft || 0, cT = a.cropTop || 0, cR = a.cropRight || 0, cB = a.cropBottom || 0;
        if (a.crop) {
          cx = a.crop.x; cy = a.crop.y; cw = a.crop.w; ch = a.crop.h;
        } else {
          cx = (a.x || 0) + (cw * cL);
          cy = (a.y || 0) + (ch * cT);
          cw = cw * (1 - cL - cR);
          ch = ch * (1 - cT - cB);
        }
        var rectChild = existingClip.querySelector('rect');
        if (!rectChild) {
          rectChild = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          existingClip.appendChild(rectChild);
        }
        rectChild.setAttribute('x', cx);
        rectChild.setAttribute('y', cy);
        rectChild.setAttribute('width', Math.max(1, cw));
        rectChild.setAttribute('height', Math.max(1, ch));
        obj.el.setAttribute('clip-path', 'url(#' + clipId + ')');
      } else if (a.clipPath || a.symbolClip) {
        var symClipId = 'sym_clip_' + obj.id;
        var clipUrl = a.clipPath || ('url(#' + symClipId + ')');
        obj.el.setAttribute('clip-path', clipUrl);
      } else {
        if (existingClip && existingClip.parentNode) {
          existingClip.parentNode.removeChild(existingClip);
        }
        obj.el.removeAttribute('clip-path');
      }
    }

    if (cfg.currentTool === 'select') {
      if (cfg.selectedIds.has(obj.id)) {
        obj.el.style.cursor = 'move';
      } else {
        obj.el.style.cursor = 'pointer';
      }
    } else {
      obj.el.style.cursor = 'crosshair';
    }
  }

  function createHandleNode(x, y, objId, handleType, idx, isSpecial) {
    var uiGroup = document.getElementById('uiGroup');
    if (!uiGroup) return;

    var handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    handle.setAttribute('cx', x);
    handle.setAttribute('cy', y);
    handle.setAttribute('r', isSpecial ? 5 : 4.5);
    handle.setAttribute('fill', isSpecial ? '#0284c7' : '#ffffff');
    handle.setAttribute('stroke', '#0284c7');
    handle.setAttribute('stroke-width', '1.5');
    handle.setAttribute('class', 'handle-node');
    handle.dataset.objId = objId;
    handle.dataset.handleType = handleType;
    handle.dataset.idx = idx;
    uiGroup.appendChild(handle);
  }

  function renderUI() {
    var uiGroup = document.getElementById('uiGroup');
    if (!uiGroup) return;
    uiGroup.innerHTML = '';

    if (cfg.selectedIds.size === 0) return;

    var self = this;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    cfg.selectedIds.forEach(function(id) {
      var obj = cfg.objectsMap.get(id);
      if (!obj) return;
      var a = obj.attrs || obj;

      if (obj.type === 'point') {
        var r = a.r || 5;
        minX = Math.min(minX, a.cx - r);
        maxX = Math.max(maxX, a.cx + r);
        minY = Math.min(minY, a.cy - r);
        maxY = Math.max(maxY, a.cy + r);
      } else if (obj.type === 'line') {
        minX = Math.min(minX, a.x1, a.x2);
        maxX = Math.max(maxX, a.x1, a.x2);
        minY = Math.min(minY, a.y1, a.y2);
        maxY = Math.max(maxY, a.y1, a.y2);
      } else if (obj.type === 'rect' || obj.type === 'rounded') {
        minX = Math.min(minX, a.x);
        maxX = Math.max(maxX, a.x + a.width);
        minY = Math.min(minY, a.y);
        maxY = Math.max(maxY, a.y + a.height);
      } else if (obj.type === 'ellipse' || obj.type === 'arc') {
        minX = Math.min(minX, a.cx - a.rx);
        maxX = Math.max(maxX, a.cx + a.rx);
        minY = Math.min(minY, a.cy - a.ry);
        maxY = Math.max(maxY, a.cy + a.ry);
      } else if (obj.type === 'bez2' || obj.type === 'bez3') {
        if (a.points && a.points.length > 0) {
          a.points.forEach(function(pt) {
            minX = Math.min(minX, pt.px);
            maxX = Math.max(maxX, pt.px);
            minY = Math.min(minY, pt.py);
            maxY = Math.max(maxY, pt.py);
          });
        } else {
          minX = Math.min(minX, a.x1, a.x2, a.cx !== undefined ? a.cx : a.x1);
          maxX = Math.max(maxX, a.x1, a.x2, a.cx !== undefined ? a.cx : a.x1);
          minY = Math.min(minY, a.y1, a.y2, a.cy !== undefined ? a.cy : a.y1);
          maxY = Math.max(maxY, a.y1, a.y2, a.cy !== undefined ? a.cy : a.y1);
        }
      } else if (obj.type === 'text') {
        var hasBBox = false;
        try {
          if (obj.el) {
            var bb = obj.el.getBBox();
            if (bb && bb.width > 0 && bb.height > 0) {
              minX = Math.min(minX, bb.x);
              maxX = Math.max(maxX, bb.x + bb.width);
              minY = Math.min(minY, bb.y);
              maxY = Math.max(maxY, bb.y + bb.height);
              hasBBox = true;
            }
          }
        } catch(e) {}
        if (!hasBBox) {
          var fontSize = parseInt(a.fontSize || 20, 10);
          var approxW = (a.text || '').length * (fontSize * 0.55);
          minX = Math.min(minX, a.x);
          maxX = Math.max(maxX, a.x + approxW);
          minY = Math.min(minY, a.y - fontSize);
          maxY = Math.max(maxY, a.y + 4);
        }
      }
    });

    if (minX !== Infinity) {
      var pad = 4;
      var boxRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      boxRect.setAttribute('x', minX - pad);
      boxRect.setAttribute('y', minY - pad);
      boxRect.setAttribute('width', (maxX - minX) + pad * 2);
      boxRect.setAttribute('height', (maxY - minY) + pad * 2);
      boxRect.setAttribute('fill', 'none');
      boxRect.setAttribute('stroke', '#0284c7');
      boxRect.setAttribute('stroke-width', '1.2');
      boxRect.setAttribute('stroke-dasharray', '4,4');
      boxRect.setAttribute('pointer-events', 'stroke');
      boxRect.style.cursor = 'move';
      uiGroup.appendChild(boxRect);
    }

    // Render Active Crop Overlay & 4 Side Drag Handles
    var state = window.WebpointerState || {};
    if (state.isCropModeActive && cfg.selectedIds.size === 1) {
      var cropId = Array.from(cfg.selectedIds)[0];
      var cropObj = cfg.objectsMap.get(cropId);
      if (cropObj) {
        var bounds = window.WebpointerObjects ? window.WebpointerObjects.getObjectBounds(cropObj) : null;
        if (bounds) {
          var bX = bounds.minX;
          var bY = bounds.minY;
          var bW = Math.max(1, bounds.maxX - bounds.minX);
          var bH = Math.max(1, bounds.maxY - bounds.minY);

          var cL = cropObj.attrs.cropLeft || 0;
          var cT = cropObj.attrs.cropTop || 0;
          var cR = cropObj.attrs.cropRight || 0;
          var cB = cropObj.attrs.cropBottom || 0;

          var cX = bX + bW * cL;
          var cY = bY + bH * cT;
          var cW = Math.max(1, bW * (1 - cL - cR));
          var cH = Math.max(1, bH * (1 - cT - cB));

          function createDimRect(rx, ry, rw, rh) {
            if (rw <= 0 || rh <= 0) return;
            var dimEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            dimEl.setAttribute('x', rx); dimEl.setAttribute('y', ry);
            dimEl.setAttribute('width', rw); dimEl.setAttribute('height', rh);
            dimEl.setAttribute('fill', 'rgba(15, 23, 42, 0.45)');
            dimEl.setAttribute('pointer-events', 'none');
            uiGroup.appendChild(dimEl);
          }

          createDimRect(bX, bY, bW, cY - bY);
          createDimRect(bX, cY + cH, bW, (bY + bH) - (cY + cH));
          createDimRect(bX, cY, cX - bX, cH);
          createDimRect(cX + cW, cY, (bX + bW) - (cX + cW), cH);

          var cropBorder = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          cropBorder.setAttribute('x', cX); cropBorder.setAttribute('y', cY);
          cropBorder.setAttribute('width', cW); cropBorder.setAttribute('height', cH);
          cropBorder.setAttribute('fill', 'none'); cropBorder.setAttribute('stroke', '#0284c7');
          cropBorder.setAttribute('stroke-width', '2');
          uiGroup.appendChild(cropBorder);

          createHandleNode(cX + cW / 2, cY, cropObj.id, 'crop_top', 1, true);
          createHandleNode(cX + cW / 2, cY + cH, cropObj.id, 'crop_bottom', 2, true);
          createHandleNode(cX, cY + cH / 2, cropObj.id, 'crop_left', 3, true);
          createHandleNode(cX + cW, cY + cH / 2, cropObj.id, 'crop_right', 4, true);
        }
      }
    }

    cfg.selectedIds.forEach(function(id) {
      var obj = cfg.objectsMap.get(id);
      if (!obj) return;
      var a = obj.attrs;

      if (obj.type === 'point') {
        createHandleNode(a.cx, a.cy, id, 'point_center', 1, false);
      } else if (obj.type === 'ellipse') {
        var angleRad = (a.angle || 0) * (Math.PI / 180);
        function getRotatedPoint(px, py) {
          var dx = px - a.cx;
          var dy = py - a.cy;
          var rxRot = dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
          var ryRot = dx * Math.sin(angleRad) + dy * Math.cos(angleRad);
          return { x: a.cx + rxRot, y: a.cy + ryRot };
        }
        var ptCenter = { x: a.cx, y: a.cy };
        var ptWidth  = getRotatedPoint(a.cx + a.rx, a.cy);
        var ptHeight = getRotatedPoint(a.cx, a.cy - a.ry);
        var ptRotate = getRotatedPoint(a.cx, a.cy - a.ry - 25);

        var rotStem = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        rotStem.setAttribute('x1', ptHeight.x); rotStem.setAttribute('y1', ptHeight.y);
        rotStem.setAttribute('x2', ptRotate.x); rotStem.setAttribute('y2', ptRotate.y);
        rotStem.setAttribute('stroke', '#0284c7'); rotStem.setAttribute('stroke-dasharray', '3,3');
        rotStem.setAttribute('stroke-width', '1.5');
        uiGroup.appendChild(rotStem);

        createHandleNode(ptCenter.x, ptCenter.y, id, 'ellipse_center', 1, false);
        createHandleNode(ptWidth.x, ptWidth.y, id, 'ellipse_width', 2, false);
        createHandleNode(ptHeight.x, ptHeight.y, id, 'ellipse_height', 3, false);
        createHandleNode(ptRotate.x, ptRotate.y, id, 'ellipse_rotate', 4, true);

      } else if (obj.type === 'line') {
        createHandleNode(a.x1, a.y1, id, 'start', 1, false);
        createHandleNode(a.x2, a.y2, id, 'end', 2, false);
      } else if (obj.type === 'rect') {
        createHandleNode(a.x, a.y, id, 'top_left', 1, false);
        createHandleNode(a.x + a.width, a.y + a.height, id, 'bottom_right', 2, false);
      } else if (obj.type === 'rounded') {
        var cornerRx = a.rx !== undefined ? a.rx : 15;
        createHandleNode(a.x, a.y, id, 'top_left', 1, false);
        createHandleNode(a.x + a.width, a.y + a.height, id, 'bottom_right', 2, false);
        createHandleNode(a.x + cornerRx, a.y, id, 'corner_rx', 3, true);
      }

      if (obj.attrs && obj.attrs.fill && typeof obj.attrs.fill === 'string' && obj.attrs.fill.indexOf('url(#grad_') !== -1) {
        var gMinX = a.x !== undefined ? a.x : (a.cx !== undefined ? a.cx - (a.rx || 30) : 100);
        var gMinY = a.y !== undefined ? a.y : (a.cy !== undefined ? a.cy - (a.ry || 30) : 100);
        var gW = a.width || (a.rx ? a.rx * 2 : 80);
        var gH = a.height || (a.ry ? a.ry * 2 : 80);

        var gStartX = gMinX;
        var gStartY = gMinY + gH / 2;
        var gEndX = gMinX + gW;
        var gEndY = gMinY + gH / 2;

        var gStem = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        gStem.setAttribute('x1', gStartX); gStem.setAttribute('y1', gStartY);
        gStem.setAttribute('x2', gEndX); gStem.setAttribute('y2', gEndY);
        gStem.setAttribute('stroke', '#eab308'); gStem.setAttribute('stroke-dasharray', '4,4');
        gStem.setAttribute('stroke-width', '2');
        uiGroup.appendChild(gStem);

        createHandleNode(gStartX, gStartY, id, 'gradient_start', 10, true);
        createHandleNode(gEndX, gEndY, id, 'gradient_end', 11, true);
      }
    });
  }

  function renderGrid() {
    var gridGroup = document.getElementById('gridGroup');
    if (!gridGroup) return;
    gridGroup.innerHTML = '';
    gridGroup.style.display = 'block';

    var w = cfg.SVG_WIDTH || 960;
    var h = cfg.SVG_HEIGHT || 540;
    var bgColor = cfg.canvasBgColor || '#ffffff';

    var bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', '0');
    bgRect.setAttribute('y', '0');
    bgRect.setAttribute('width', w);
    bgRect.setAttribute('height', h);
    bgRect.setAttribute('fill', bgColor);
    gridGroup.appendChild(bgRect);

    if (cfg.gridSnapEnabled) {
      var stepSize = cfg.gridStepSize || 24;

      var countX = Math.floor(w / stepSize);
      for (var i = 0; i <= countX; i++) {
        var x = i * stepSize;
        var lineX = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        lineX.setAttribute('x1', x); lineX.setAttribute('y1', 0);
        lineX.setAttribute('x2', x); lineX.setAttribute('y2', h);
        lineX.setAttribute('stroke', (i % 5 === 0) ? '#cbd5e1' : '#f1f5f9');
        lineX.setAttribute('stroke-width', (i % 5 === 0) ? '1' : '0.5');
        gridGroup.appendChild(lineX);
      }

      var countY = Math.floor(h / stepSize);
      for (var j = 0; j <= countY; j++) {
        var y = j * stepSize;
        var lineY = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        lineY.setAttribute('x1', 0); lineY.setAttribute('y1', y);
        lineY.setAttribute('x2', w); lineY.setAttribute('y2', y);
        lineY.setAttribute('stroke', (j % 5 === 0) ? '#cbd5e1' : '#f1f5f9');
        lineY.setAttribute('stroke-width', (j % 5 === 0) ? '1' : '0.5');
        gridGroup.appendChild(lineY);
      }
    }
  }

  function updateSvgDefs() {
    var defs = document.getElementById('markerDefs');
    if (!defs) return;
    defs.innerHTML = '';

    ['arrow', 'circle', 'square', 'diamond'].forEach(function(mType) {
      ['start', 'end'].forEach(function(pos) {
        var isStart = (pos === 'start');
        var isHollow = isStart ? (cfg.startMarkerFillStyle === 'hollow') : (cfg.endMarkerFillStyle === 'hollow');

        var marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'marker-' + pos + '-' + mType);
        marker.setAttribute('viewBox', '0 0 10 10');
        marker.setAttribute('refX', '5');
        marker.setAttribute('refY', '5');
        marker.setAttribute('markerWidth', '6');
        marker.setAttribute('markerHeight', '6');
        marker.setAttribute('orient', 'auto-start-reverse');

        var strokeColor = cfg.strokeColor || '#041e49';
        var fillColor = isHollow ? '#ffffff' : strokeColor;

        if (mType === 'arrow') {
          var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', isStart ? 'M 10 0 L 0 5 L 10 10 z' : 'M 0 0 L 10 5 L 0 10 z');
          path.setAttribute('fill', fillColor);
          path.setAttribute('stroke', strokeColor);
          path.setAttribute('stroke-width', '1');
          marker.appendChild(path);
        } else if (mType === 'circle') {
          var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', '5'); circle.setAttribute('cy', '5'); circle.setAttribute('r', '4');
          circle.setAttribute('fill', fillColor);
          circle.setAttribute('stroke', strokeColor);
          circle.setAttribute('stroke-width', '1');
          marker.appendChild(circle);
        } else if (mType === 'square') {
          var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', '1'); rect.setAttribute('y', '1');
          rect.setAttribute('width', '8'); rect.setAttribute('height', '8');
          rect.setAttribute('fill', fillColor);
          rect.setAttribute('stroke', strokeColor);
          rect.setAttribute('stroke-width', '1');
          marker.appendChild(rect);
        } else if (mType === 'diamond') {
          var diamond = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          diamond.setAttribute('d', 'M 5 0 L 10 5 L 5 10 L 0 5 z');
          diamond.setAttribute('fill', fillColor);
          diamond.setAttribute('stroke', strokeColor);
          diamond.setAttribute('stroke-width', '1');
          marker.appendChild(diamond);
        }
        defs.appendChild(marker);
      });
    });
  }

  function updateDomTree() {}

  function renderCanvas() {
    if (!cfg.objectsMap) return;
    cfg.objectsMap.forEach(function(obj) {
      updateElementAttributes(obj);
    });
  }

  function renderSnapGuides(lines) {
    var group = document.getElementById('snapGuidesGroup');
    if (!group) return;
    group.innerHTML = '';
    if (!lines || !lines.length) return;
    lines.forEach(function(l) {
      var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', l.x1);
      line.setAttribute('y1', l.y1);
      line.setAttribute('x2', l.x2);
      line.setAttribute('y2', l.y2);
      line.setAttribute('stroke', l.color || '#ec4899');
      line.setAttribute('stroke-width', '1');
      line.setAttribute('stroke-dasharray', '4 4');
      line.setAttribute('pointer-events', 'none');
      group.appendChild(line);
    });
  }

  function clearSnapGuides() {
    var group = document.getElementById('snapGuidesGroup');
    if (group) group.innerHTML = '';
  }

  window.WebpointerRenderCanvas = {
    updateElementAttributes: updateElementAttributes,
    createHandleNode: createHandleNode,
    renderUI: renderUI,
    renderGrid: renderGrid,
    updateSvgDefs: updateSvgDefs,
    updateDomTree: updateDomTree,
    renderCanvas: renderCanvas,
    renderAllObjects: renderCanvas,
    renderSnapGuides: renderSnapGuides,
    clearSnapGuides: clearSnapGuides
  };
})(window);
