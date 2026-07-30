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
    activeHandleInfo: null,
    drawStartStep: null,
    activeTempObj: null
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
    } else if (type === 'bez2') {
      el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      var midX = (px1 + px2) / 2;
      var midY = Math.min(py1, py2) - 50;
      attrs = { x1: px1, y1: py1, cx: midX, cy: midY, x2: px2, y2: py2, stepX1: stepStart.stepX, stepY1: stepStart.stepY, stepCx: Math.round((stepStart.stepX + stepEnd.stepX) / 2), stepCy: Math.max(0, Math.min(stepStart.stepY, stepEnd.stepY) - 25), stepX2: stepEnd.stepX, stepY2: stepEnd.stepY };
    } else if (type === 'bez3') {
      el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      var c1x = px1 + (px2 - px1) * 0.33;
      var c1y = py1 - 40;
      var c2x = px1 + (px2 - px1) * 0.66;
      var c2y = py2 - 40;
      attrs = { x1: px1, y1: py1, c1x: c1x, c1y: c1y, c2x: c2x, c2y: c2y, x2: px2, y2: py2, stepX1: stepStart.stepX, stepY1: stepStart.stepY, stepC1x: Math.round(stepStart.stepX + (stepEnd.stepX - stepStart.stepX) * 0.33), stepC1y: Math.max(0, stepStart.stepY - 20), stepC2x: Math.round(stepStart.stepX + (stepEnd.stepX - stepStart.stepX) * 0.66), stepC2y: Math.max(0, stepEnd.stepY - 20), stepX2: stepEnd.stepX, stepY2: stepEnd.stepY };
    } else if (type === 'arc') {
      el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      attrs = { x1: px1, y1: py1, rx: Math.abs(px2 - px1), ry: Math.abs(py2 - py1), x2: px2, y2: py2, stepX1: stepStart.stepX, stepY1: stepStart.stepY, stepX2: stepEnd.stepX, stepY2: stepEnd.stepY };
    }

    el.setAttribute('id', id);
    el.setAttribute('stroke', cfg.strokeColor || '#041e49');
    el.setAttribute('fill', cfg.fillColor || 'none'); // Default fill is transparent 'none'
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

  // Bind Global Window Scope Handlers
  window.switchTab = function(tab) {
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

  window.groupSelected = function() {
    if (cfg.selectedIds.size < 2) return;
    var objectsGroup = document.getElementById('objectsGroup');
    var gId = 'g_' + (cfg.nextId++);
    var groupEl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    groupEl.setAttribute('id', gId);

    cfg.selectedIds.forEach(function(id) {
      var obj = cfg.objectsMap.get(id);
      if (obj) {
        obj.parentId = gId;
        groupEl.appendChild(obj.el);
      }
    });
    if (objectsGroup) objectsGroup.appendChild(groupEl);
    render.updateDomTree();
    render.renderUI();
  };

  window.ungroupSelected = function() {
    var objectsGroup = document.getElementById('objectsGroup');
    cfg.selectedIds.forEach(function(id) {
      var obj = cfg.objectsMap.get(id);
      if (obj && obj.parentId) {
        var parentGroup = document.getElementById(obj.parentId);
        if (parentGroup && objectsGroup) {
          objectsGroup.appendChild(obj.el);
          if (parentGroup.children.length === 0) parentGroup.remove();
        }
        obj.parentId = null;
      }
    });
    render.updateDomTree();
    render.renderUI();
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

  window.alignSelected = function(type) {
    if (cfg.selectedIds.size === 0) return;
    cfg.selectedIds.forEach(function(id) {
      var obj = cfg.objectsMap.get(id);
      if (!obj) return;
      var a = obj.attrs;
      if (type === 'left') { if (a.x !== undefined) a.x = 20; if (a.cx !== undefined) a.cx = 40; }
      else if (type === 'hcenter') { if (a.x !== undefined) a.x = (cfg.SVG_WIDTH - a.width) / 2; if (a.cx !== undefined) a.cx = cfg.SVG_WIDTH / 2; }
      render.updateElementAttributes(obj);
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

      if (cfg.currentTool === 'select') {
        var targetObj = e.target.closest('circle, line, rect, ellipse, path');
        if (targetObj && cfg.objectsMap.has(targetObj.id)) {
          if (!e.ctrlKey) cfg.selectedIds.clear();
          cfg.selectedIds.add(targetObj.id);
        } else {
          if (!e.ctrlKey) cfg.selectedIds.clear();
          state.isMarquee = true;
        }
        render.renderUI();
      } else if (cfg.currentTool === 'point') {
        state.isDrawing = false;
        cfg.selectedIds.clear();
        var pointObj = createSvgObject('point', coords, coords);
        cfg.selectedIds.add(pointObj.id);
        render.renderUI();
      } else {
        state.isDrawing = true;
        state.drawStartStep = coords;
        cfg.selectedIds.clear();
        state.activeTempObj = createSvgObject(cfg.currentTool, coords, coords);
        cfg.selectedIds.add(state.activeTempObj.id);
        render.renderUI();
      }
    });

    mainSvg.addEventListener('mousemove', function(e) {
      var coords = getStepCoords(e);
      if (statRaw) statRaw.textContent = '(' + coords.rawX + ', ' + coords.rawY + ')';
      if (statStep) statStep.textContent = 'Step (' + coords.stepX + ', ' + coords.stepY + ')';

      if (state.isDraggingHandle && state.activeHandleInfo) {
        var obj = cfg.objectsMap.get(state.activeHandleInfo.objId);
        if (obj) {
          var a = obj.attrs;
          if (state.activeHandleInfo.handleType === 'point_center') {
            a.cx = coords.px;
            a.cy = coords.py;
            a.stepX = coords.stepX;
            a.stepY = coords.stepY;
          } else if (state.activeHandleInfo.handleType === 'ellipse_center') {
            a.cx = coords.px;
            a.cy = coords.py;
            a.stepCx = coords.stepX;
            a.stepCy = coords.stepY;
          } else if (state.activeHandleInfo.handleType === 'ellipse_width') {
            a.rx = Math.max(5, Math.abs(coords.px - a.cx));
          } else if (state.activeHandleInfo.handleType === 'ellipse_height') {
            a.ry = Math.max(5, Math.abs(coords.py - a.cy));
          } else if (state.activeHandleInfo.handleType === 'ellipse_rotate') {
            var rad = Math.atan2(coords.py - a.cy, coords.px - a.cx);
            a.angle = Math.round((rad * (180 / Math.PI)) + 90);
          } else if (state.activeHandleInfo.handleType === 'bez2_ctrl') {
            a.cx = coords.px;
            a.cy = coords.py;
          } else if (state.activeHandleInfo.handleType === 'bez3_ctrl1') {
            a.c1x = coords.px;
            a.c1y = coords.py;
          } else if (state.activeHandleInfo.handleType === 'bez3_ctrl2') {
            a.c2x = coords.px;
            a.c2y = coords.py;
          } else if (state.activeHandleInfo.handleType === 'start') {
            a.x1 = coords.px;
            a.y1 = coords.py;
          } else if (state.activeHandleInfo.handleType === 'end') {
            a.x2 = coords.px;
            a.y2 = coords.py;
          } else if (state.activeHandleInfo.handleType === 'bottom_right') {
            a.width = Math.max(10, coords.px - a.x);
            a.height = Math.max(10, coords.py - a.y);
          }
          render.updateElementAttributes(obj);
          render.renderUI();
        }
        return;
      }

      if (state.isDrawing && state.activeTempObj && state.drawStartStep) {
        var px1 = (state.drawStartStep.stepX / cfg.STEPS_X) * cfg.SVG_WIDTH;
        var py1 = (state.drawStartStep.stepY / cfg.STEPS_Y) * cfg.SVG_HEIGHT;
        var px2 = coords.px;
        var py2 = coords.py;
        var aTemp = state.activeTempObj.attrs;

        if (state.activeTempObj.type === 'line' || state.activeTempObj.type === 'arc') {
          aTemp.x2 = px2;
          aTemp.y2 = py2;
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
        } else if (state.activeTempObj.type === 'bez2') {
          aTemp.x2 = px2;
          aTemp.y2 = py2;
          aTemp.cx = (px1 + px2) / 2;
          aTemp.cy = Math.min(py1, py2) - 40;
        } else if (state.activeTempObj.type === 'bez3') {
          aTemp.x2 = px2;
          aTemp.y2 = py2;
          aTemp.c1x = px1 + (px2 - px1) * 0.33;
          aTemp.c1y = py1 - 40;
          aTemp.c2x = px1 + (px2 - px1) * 0.66;
          aTemp.c2y = py2 - 40;
        }
        render.updateElementAttributes(state.activeTempObj);
        render.renderUI();
      }
    });

    mainSvg.addEventListener('mouseup', function() {
      state.isDrawing = false;
      state.isMarquee = false;
      state.isDraggingHandle = false;
      state.activeHandleInfo = null;
      state.activeTempObj = null;
    });

    window.addEventListener('keydown', function(e) {
      if (e.key === 'Alt') {
        document.body.classList.add('show-alt-keybinds');
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
