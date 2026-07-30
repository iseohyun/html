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

      obj.el.setAttribute('font-size', fSize);
      obj.el.setAttribute('font-family', fFamily);
      obj.el.setAttribute('font-weight', fWeight);
      obj.el.setAttribute('font-style', fStyle);
      obj.el.setAttribute('text-decoration', tDeco);
      obj.el.setAttribute('text-anchor', tAnchor);
      obj.el.setAttribute('dominant-baseline', dBase);
      obj.el.setAttribute('writing-mode', wMode);

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
      var a = obj.attrs;

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
    });
  }

  function renderGrid() {
    var gridGroup = document.getElementById('gridGroup');
    if (!gridGroup) return;
    gridGroup.innerHTML = '';

    var w = cfg.SVG_WIDTH || 960;
    var h = cfg.SVG_HEIGHT || 540;
    var stepsX = cfg.STEPS_X || 40;
    var stepsY = cfg.STEPS_Y || 40;

    var bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', w);
    bgRect.setAttribute('height', h);
    bgRect.setAttribute('fill', '#ffffff');
    gridGroup.appendChild(bgRect);

    var stepW = w / stepsX;
    var stepH = h / stepsY;

    for (var i = 0; i <= stepsX; i++) {
      var x = i * stepW;
      var lineX = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      lineX.setAttribute('x1', x); lineX.setAttribute('y1', 0);
      lineX.setAttribute('x2', x); lineX.setAttribute('y2', h);
      lineX.setAttribute('stroke', (i % 5 === 0) ? '#e2e8f0' : '#f1f5f9');
      lineX.setAttribute('stroke-width', (i % 5 === 0) ? '1' : '0.5');
      gridGroup.appendChild(lineX);
    }

    for (var j = 0; j <= stepsY; j++) {
      var y = j * stepH;
      var lineY = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      lineY.setAttribute('x1', 0); lineY.setAttribute('y1', y);
      lineY.setAttribute('x2', w); lineY.setAttribute('y2', y);
      lineY.setAttribute('stroke', (j % 5 === 0) ? '#e2e8f0' : '#f1f5f9');
      lineY.setAttribute('stroke-width', (j % 5 === 0) ? '1' : '0.5');
      gridGroup.appendChild(lineY);
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

  window.WebpointerRenderCanvas = {
    updateElementAttributes: updateElementAttributes,
    createHandleNode: createHandleNode,
    renderUI: renderUI,
    renderGrid: renderGrid,
    updateSvgDefs: updateSvgDefs,
    updateDomTree: updateDomTree
  };
})(window);
