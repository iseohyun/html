(function(window) {
  'use strict';

  function getCfg() { return window.WebpointerConfig; }
  function getState() { return window.WebpointerState; }
  function getRender() { return window.WebpointerRender; }
  function getObjects() { return window.WebpointerObjects; }
  function getSelection() { return window.WebpointerSelection; }
  function getBezier() { return window.WebpointerBezier; }
  function getTextTool() { return window.WebpointerTextTool; }
  function getHandlers() { return window.WebpointerHandlers; }

  function initApp() {
    console.log('[Webpointer Debug] Initializing Webpointer Application...');
    try {
      var r = getRender();
      if (!r) {
        console.error('[Webpointer Error] window.WebpointerRender is missing!');
        return;
      }
      r.renderGrid();
      r.updateSvgDefs();
      r.renderRibbon();
      setupTabSwitching();
      setupMouseEvents();
      setupKeyboardEvents();
      setupWindowResize();

      var mainSvg = document.getElementById('mainSvg');
      if (mainSvg) mainSvg.style.cursor = 'default';
      console.log('[Webpointer Debug] Webpointer Application Initialized Successfully!');
    } catch (err) {
      console.error('[Webpointer Error] Failed during initApp:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

  function setupTabSwitching() {
    var cfg = getCfg();
    var render = getRender();
    var tabContainer = document.querySelector('.ribbon-tabs');
    if (!tabContainer) return;
    tabContainer.addEventListener('click', function(e) {
      var tabBtn = e.target.closest('.ribbon-tab');
      if (!tabBtn) return;

      document.querySelectorAll('.ribbon-tab').forEach(function(b) {
        b.classList.remove('active');
      });
      tabBtn.classList.add('active');

      cfg.currentTab = tabBtn.dataset.tab;
      render.renderRibbon();
    });
  }

  function setupMouseEvents() {
    var cfg = getCfg();
    var state = getState();
    var render = getRender();
    var objects = getObjects();
    var selection = getSelection();
    var bezier = getBezier();
    var textTool = getTextTool();
    var handlers = getHandlers();

    var mainSvg = document.getElementById('mainSvg');
    if (!mainSvg) return;

    mainSvg.addEventListener('mousedown', function(e) {
      var coords = selection.getStepCoords(e);

      if (cfg.currentTool === 'text') {
        textTool.startDirectCanvasTyping(coords.px, coords.py);
        return;
      }

      if (state.typingSvgObj || document.getElementById('hiddenCanvasInput')) {
        textTool.finishDirectCanvasTyping();
      }

      var handleNode = e.target.closest('.handle-node');
      if (handleNode) {
        state.isDraggingHandle = true;
        state.activeHandleInfo = {
          objId: handleNode.dataset.objId,
          handleType: handleNode.dataset.handleType,
          idx: parseInt(handleNode.dataset.idx, 10)
        };
        var activeObj = cfg.objectsMap.get(state.activeHandleInfo.objId);
        if (activeObj) {
          state.initialObjAttrsMap.clear();
          state.initialObjAttrsMap.set(activeObj.id, JSON.parse(JSON.stringify(activeObj.attrs)));
        }
        return;
      }

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
          state.activeBezierObj = objects.createSvgObject(cfg.currentTool, coords, coords);
          cfg.selectedIds.add(state.activeBezierObj.id);
        } else {
          state.bezierPoints.push(coords);
          var pathD = bezier.buildContinuousBezierPathD(state.bezierPoints, null, cfg.currentTool, state.activeBezierObj.attrs.firstCtrl, null, null, state.activeBezierObj.attrs.ctrls3);
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
            selection.selectObjectWithGroup(targetObj.id, e.ctrlKey);
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
          var nearestObj = selection.findNearestObject(coords.px, coords.py);
          if (nearestObj) {
            selection.selectObjectWithGroup(nearestObj.id, e.ctrlKey);

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
            state.isMarqueeSelecting = true;
            state.marqueeStartCoords = coords;
          }
        }
        render.renderUI();
        render.renderRibbon();
        return;
      }

      state.isDrawingNewObject = true;
      state.drawStartCoords = coords;
      cfg.selectedIds.clear();
      state.activeNewObj = objects.createSvgObject(cfg.currentTool, coords, coords);
      cfg.selectedIds.add(state.activeNewObj.id);
      render.renderUI();
      render.renderRibbon();
    });

    mainSvg.addEventListener('mousemove', function(e) {
      var coords = selection.getStepCoords(e);

      if (cfg.currentTool === 'text') {
        mainSvg.style.cursor = 'text';
        return;
      }

      if (cfg.currentTool === 'select' && !state.isDraggingHandle && !state.isDraggingObject) {
        var hoverTarget = e.target.closest('circle, line, rect, ellipse, path, text, tspan');
        if (hoverTarget && hoverTarget.tagName.toLowerCase() === 'tspan') hoverTarget = hoverTarget.closest('text');
        if (hoverTarget && cfg.objectsMap.has(hoverTarget.id)) {
          mainSvg.style.cursor = cfg.selectedIds.has(hoverTarget.id) ? 'move' : 'pointer';
        } else {
          var nearObj = selection.findNearestObject(coords.px, coords.py);
          mainSvg.style.cursor = nearObj ? 'pointer' : 'default';
        }
      }

      if (state.isDrawingNewObject && state.activeNewObj) {
        var type = state.activeNewObj.type;
        var a = state.activeNewObj.attrs;
        var start = state.drawStartCoords;

        var px1 = (start.stepX / cfg.STEPS_X) * cfg.SVG_WIDTH;
        var py1 = (start.stepY / cfg.STEPS_Y) * cfg.SVG_HEIGHT;
        var px2 = coords.px;
        var py2 = coords.py;

        if (type === 'line') {
          a.x2 = px2; a.y2 = py2;
        } else if (type === 'rect' || type === 'rounded') {
          a.x = Math.min(px1, px2);
          a.y = Math.min(py1, py2);
          a.width = Math.max(5, Math.abs(px2 - px1));
          a.height = Math.max(5, Math.abs(py2 - py1));
        } else if (type === 'ellipse') {
          a.cx = (px1 + px2) / 2;
          a.cy = (py1 + py2) / 2;
          a.rx = Math.max(5, Math.abs(px2 - px1) / 2);
          a.ry = Math.max(5, Math.abs(py2 - py1) / 2);
        } else if (type === 'arc') {
          a.rx = Math.max(5, Math.abs(px2 - px1));
          a.ry = Math.max(5, Math.abs(py2 - py1));
          a.endAngle = Math.round(Math.atan2(py2 - py1, px2 - px1) * (180 / Math.PI));
        }

        render.updateElementAttributes(state.activeNewObj);
        render.renderUI();
        return;
      }

      if (state.isMultiBezierActive && state.activeBezierObj) {
        var liveD = bezier.buildContinuousBezierPathD(state.bezierPoints, coords, cfg.currentTool, state.activeBezierObj.attrs.firstCtrl, null, null, state.activeBezierObj.attrs.ctrls3);
        state.activeBezierObj.attrs.pathD = liveD;
        render.updateElementAttributes(state.activeBezierObj);
        return;
      }

      if (state.isDraggingHandle && state.activeHandleInfo) {
        var obj = cfg.objectsMap.get(state.activeHandleInfo.objId);
        var initialAttrs = state.initialObjAttrsMap.get(state.activeHandleInfo.objId);
        if (!obj || !initialAttrs) return;

        var hType = state.activeHandleInfo.handleType;
        var idx = state.activeHandleInfo.idx;
        var a = obj.attrs;

        if (hType === 'point_center') {
          a.cx = coords.px; a.cy = coords.py;
        } else if (hType === 'start') {
          a.x1 = coords.px; a.y1 = coords.py;
        } else if (hType === 'end') {
          a.x2 = coords.px; a.y2 = coords.py;
        } else if (hType === 'top_left') {
          var oldRight = initialAttrs.x + initialAttrs.width;
          var oldBottom = initialAttrs.y + initialAttrs.height;
          a.x = Math.min(oldRight - 10, coords.px);
          a.y = Math.min(oldBottom - 10, coords.py);
          a.width = oldRight - a.x;
          a.height = oldBottom - a.y;
        } else if (hType === 'bottom_right') {
          a.width = Math.max(10, coords.px - a.x);
          a.height = Math.max(10, coords.py - a.y);
        } else if (hType === 'corner_rx') {
          a.rx = Math.max(0, Math.min(a.width / 2, coords.px - a.x));
        } else if (hType === 'ellipse_center') {
          a.cx = coords.px; a.cy = coords.py;
        } else if (hType === 'ellipse_width') {
          a.rx = Math.max(5, Math.hypot(coords.px - a.cx, coords.py - a.cy));
        } else if (hType === 'ellipse_height') {
          a.ry = Math.max(5, Math.hypot(coords.px - a.cx, coords.py - a.cy));
        } else if (hType === 'ellipse_rotate') {
          a.angle = Math.round(Math.atan2(coords.py - a.cy, coords.px - a.cx) * (180 / Math.PI)) + 90;
        } else if (hType === 'bez_vertex') {
          if (a.points && a.points[idx]) {
            a.points[idx].px = coords.px;
            a.points[idx].py = coords.py;
            a.pathD = bezier.buildContinuousBezierPathD(a.points, null, obj.type, a.firstCtrl, null, null, a.ctrls3);
          }
        } else if (hType === 'bez2_ctrl') {
          a.firstCtrl = { cx: coords.px, cy: coords.py };
          a.pathD = bezier.buildContinuousBezierPathD(a.points, null, obj.type, a.firstCtrl, null, null, a.ctrls3);
        } else if (hType === 'bez3_c1') {
          a.ctrls3 = a.ctrls3 || [];
          a.ctrls3[idx] = a.ctrls3[idx] || {};
          a.ctrls3[idx].c1 = { x: coords.px, y: coords.py };
          a.pathD = bezier.buildContinuousBezierPathD(a.points, null, obj.type, a.firstCtrl, null, null, a.ctrls3);
        } else if (hType === 'bez3_c2') {
          a.ctrls3 = a.ctrls3 || [];
          a.ctrls3[idx] = a.ctrls3[idx] || {};
          a.ctrls3[idx].c2 = { x: coords.px, y: coords.py };
          a.pathD = bezier.buildContinuousBezierPathD(a.points, null, obj.type, a.firstCtrl, null, null, a.ctrls3);
        }

        render.updateElementAttributes(obj);
        render.renderUI();
        return;
      }

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
                a.ctrls3 = initialAttrs.ctrls3.map(function(cp) {
                  return {
                    c1: { x: cp.c1.x + deltaPx, y: cp.c1.y + deltaPy },
                    c2: { x: cp.c2.x + deltaPx, y: cp.c2.y + deltaPy }
                  };
                });
              }
              a.pathD = bezier.buildContinuousBezierPathD(a.points, null, obj.type, a.firstCtrl, null, null, a.ctrls3);
            }
          }
          render.updateElementAttributes(obj);
        });
        render.renderUI();
      }
    });

    mainSvg.addEventListener('mouseup', function() {
      if (state.isDrawingNewObject) {
        state.isDrawingNewObject = false;
        state.activeNewObj = null;
      }
      if (state.isDraggingHandle) {
        state.isDraggingHandle = false;
        state.activeHandleInfo = null;
      }
      if (state.isDraggingObject) {
        state.isDraggingObject = false;
        state.dragStartCoords = null;
      }
      render.renderUI();
      render.renderRibbon();
    });

    mainSvg.addEventListener('dblclick', function(e) {
      var targetObj = e.target.closest('text, tspan');
      if (!targetObj) {
        var allObjs = Array.from(cfg.objectsMap.values());
        var foundTextObj = allObjs.find(function(o) { return o.type === 'text' && (o.el === e.target || (o.el.contains && o.el.contains(e.target))); });
        if (foundTextObj) targetObj = foundTextObj.el;
      }
      if (targetObj && cfg.objectsMap.has(targetObj.id)) {
        var obj = cfg.objectsMap.get(targetObj.id);
        if (obj && obj.type === 'text') {
          textTool.startDirectCanvasTyping(obj.attrs.x, obj.attrs.y, obj);
        }
      }
    });
  }

  function setupKeyboardEvents() {
    window.addEventListener('keydown', function(e) {
      var cfg = getCfg();
      var state = getState();
      var render = getRender();
      var bezier = getBezier();
      var textTool = getTextTool();
      var handlers = getHandlers();

      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.key === 'Alt') {
        document.body.classList.add('alt-pressed');
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (cfg.selectedIds.size > 0) {
          cfg.selectedIds.forEach(function(id) {
            var obj = cfg.objectsMap.get(id);
            if (obj && obj.el && obj.el.parentNode) {
              obj.el.parentNode.removeChild(obj.el);
            }
            cfg.objectsMap.delete(id);
          });
          cfg.selectedIds.clear();
          render.renderUI();
          render.renderRibbon();
          render.updateDomTree();
        }
      }

      if (e.key === 'Enter') {
        if (state.isMultiBezierActive) {
          bezier.finishMultiBezier();
          render.renderUI();
          render.renderRibbon();
        }
      }

      if (e.altKey) {
        var key = e.key.toUpperCase();
        if (key === 'S') handlers.setTool('select');
        else if (key === 'R') handlers.setTool('rect');
        else if (key === 'U') handlers.setTool('rounded');
        else if (key === 'E') handlers.setTool('ellipse');
        else if (key === 'L') handlers.setTool('line');
        else if (key === 'P') handlers.setTool('point');
        else if (key === 'A') handlers.setTool('arc');
        else if (key === 'B') handlers.setTool('bez2');
        else if (key === 'C') handlers.setTool('bez3');
        else if (key === 'T') textTool.addTextObject();
      }
    });

    window.addEventListener('keyup', function(e) {
      if (e.key === 'Alt') {
        document.body.classList.remove('alt-pressed');
      }
    });
  }

  function setupWindowResize() {
    window.addEventListener('resize', function() {
      var render = getRender();
      if (render) {
        render.renderGrid();
        render.renderUI();
      }
    });
  }
})(window);
