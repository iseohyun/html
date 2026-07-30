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

      if (window.pushHistoryState) window.pushHistoryState();

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
        var clickedTextEl = e.target ? (e.target.closest('text') || (e.target.closest('tspan') ? e.target.closest('tspan').closest('text') : null)) : null;
        var targetTextObj = null;
        if (clickedTextEl && cfg.objectsMap.has(clickedTextEl.id)) {
          targetTextObj = cfg.objectsMap.get(clickedTextEl.id);
        } else {
          var nearest = selection.findNearestObject(coords.px, coords.py);
          if (nearest && nearest.type === 'text') {
            targetTextObj = nearest;
          }
        }

        if (targetTextObj) {
          cfg.selectedIds.clear();
          cfg.selectedIds.add(targetTextObj.id);
          textTool.startDirectCanvasTyping(targetTextObj.attrs.x, targetTextObj.attrs.y, targetTextObj);
        } else {
          textTool.startDirectCanvasTyping(coords.px, coords.py);
        }
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

      if (cfg.currentTool === 'pan') {
        state.isPanning = true;
        state.panStartClientX = e.clientX;
        state.panStartClientY = e.clientY;
        var viewBoxAttr = mainSvg.getAttribute('viewBox');
        if (viewBoxAttr) {
          var vbParts = viewBoxAttr.trim().split(/[\s,]+/).map(Number);
          if (vbParts.length === 4) {
            state.initialVbX = vbParts[0];
            state.initialVbY = vbParts[1];
            state.initialVbW = vbParts[2];
            state.initialVbH = vbParts[3];
          }
        }
        if (state.initialVbX === undefined) {
          state.initialVbX = 0;
          state.initialVbY = 0;
          state.initialVbW = cfg.SVG_WIDTH || 960;
          state.initialVbH = cfg.SVG_HEIGHT || 540;
        }
        mainSvg.style.cursor = 'grabbing';
        return;
      }

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

      if (cfg.currentTool === 'pan') {
        mainSvg.style.cursor = state.isPanning ? 'grabbing' : 'grab';
        if (state.isPanning) {
          var dx = e.clientX - state.panStartClientX;
          var dy = e.clientY - state.panStartClientY;
          var rect = mainSvg.getBoundingClientRect();
          var scaleX = (state.initialVbW || cfg.SVG_WIDTH || 960) / (rect.width || 1);
          var scaleY = (state.initialVbH || cfg.SVG_HEIGHT || 540) / (rect.height || 1);
          var newX = state.initialVbX - dx * scaleX;
          var newY = state.initialVbY - dy * scaleY;
          mainSvg.setAttribute('viewBox', newX + ' ' + newY + ' ' + state.initialVbW + ' ' + state.initialVbH);
        }
        return;
      }

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
        } else if (hType === 'crop_top' || hType === 'crop_bottom' || hType === 'crop_left' || hType === 'crop_right') {
          var bounds = window.WebpointerObjects ? window.WebpointerObjects.getObjectBounds(obj) : null;
          if (bounds) {
            var bX = bounds.minX;
            var bY = bounds.minY;
            var bW = Math.max(1, bounds.maxX - bounds.minX);
            var bH = Math.max(1, bounds.maxY - bounds.minY);

            if (hType === 'crop_top') {
              var newCropTop = (coords.py - bY) / bH;
              a.cropTop = Math.max(0, Math.min(0.9 - (a.cropBottom || 0), newCropTop));
            } else if (hType === 'crop_bottom') {
              var newCropBottom = (bY + bH - coords.py) / bH;
              a.cropBottom = Math.max(0, Math.min(0.9 - (a.cropTop || 0), newCropBottom));
            } else if (hType === 'crop_left') {
              var newCropLeft = (coords.px - bX) / bW;
              a.cropLeft = Math.max(0, Math.min(0.9 - (a.cropRight || 0), newCropLeft));
            } else if (hType === 'crop_right') {
              var newCropRight = (bX + bW - coords.px) / bW;
              a.cropRight = Math.max(0, Math.min(0.9 - (a.cropLeft || 0), newCropRight));
            }
          }
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
          } else if (obj.type === 'rect' || obj.type === 'rounded' || obj.type === 'text' || obj.type === 'image') {
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

    mainSvg.addEventListener('mouseup', function(e) {
      if (state.isDrawingNewObject && state.activeNewObj) {
        var obj = state.activeNewObj;
        var start = state.drawStartCoords;
        var coords = selection.getStepCoords(e);
        var dist = start ? Math.hypot(coords.px - start.px, coords.py - start.py) : 0;

        if (dist < 10 && obj.attrs) {
          var a = obj.attrs;
          if (obj.type === 'line') {
            a.x2 = a.x1 + 80;
            a.y2 = a.y1 + 50;
          } else if (obj.type === 'rect' || obj.type === 'rounded') {
            a.width = 100;
            a.height = 60;
          } else if (obj.type === 'ellipse') {
            a.rx = 50;
            a.ry = 30;
          } else if (obj.type === 'arc') {
            a.rx = 50;
            a.ry = 50;
            a.startAngle = -90;
            a.endAngle = 0;
          }
          render.updateElementAttributes(obj);
        }
      }

      if (state.isPanning) {
        state.isPanning = false;
        mainSvg.style.cursor = cfg.currentTool === 'pan' ? 'grab' : 'default';
      }
      if (state.isDrawingNewObject || state.isDraggingHandle || state.isDraggingObject) {
        if (window.pushHistoryState) window.pushHistoryState();
      }
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

    mainSvg.addEventListener('wheel', function(e) {
      e.preventDefault();
      var zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      var curZoom = cfg.zoomLevel || 1.0;
      var newZoom = Math.min(5.0, Math.max(0.2, curZoom * zoomFactor));
      cfg.zoomLevel = newZoom;

      mainSvg.style.transformOrigin = e.offsetX + 'px ' + e.offsetY + 'px';
      mainSvg.style.transform = 'scale(' + newZoom + ')';
    }, { passive: false });

    var resizeHandle = document.getElementById('canvasResizeHandle');
    if (resizeHandle) {
      var isResizingCanvas = false;
      var startY = 0;
      var startH = 0;

      resizeHandle.addEventListener('mousedown', function(e) {
        e.preventDefault();
        isResizingCanvas = true;
        startY = e.clientY;
        startH = cfg.SVG_HEIGHT || 540;
        document.body.style.cursor = 'ns-resize';
      });

      window.addEventListener('mousemove', function(e) {
        if (!isResizingCanvas) return;
        var dy = e.clientY - startY;
        var newH = Math.max(200, Math.min(5000, Math.round(startH + dy)));
        cfg.SVG_HEIGHT = newH;

        var viewBoxAttr = mainSvg.getAttribute('viewBox');
        if (viewBoxAttr) {
          var vbParts = viewBoxAttr.trim().split(/[\s,]+/).map(Number);
          if (vbParts.length === 4) {
            mainSvg.setAttribute('viewBox', vbParts[0] + ' ' + vbParts[1] + ' ' + vbParts[2] + ' ' + newH);
          } else {
            mainSvg.setAttribute('viewBox', '0 0 ' + (cfg.SVG_WIDTH || 960) + ' ' + newH);
          }
        } else {
          mainSvg.setAttribute('viewBox', '0 0 ' + (cfg.SVG_WIDTH || 960) + ' ' + newH);
        }

        mainSvg.style.height = newH + 'px';
        if (render.renderGrid) render.renderGrid();
        if (render.renderUI) render.renderUI();
      });

      window.addEventListener('mouseup', function() {
        if (isResizingCanvas) {
          isResizingCanvas = false;
          document.body.style.cursor = 'default';
          if (window.pushHistoryState) window.pushHistoryState();
        }
      });
    }

    mainSvg.addEventListener('dblclick', function(e) {
      var targetObj = e.target.closest('text, tspan');
      if (targetObj) {
        if (targetObj.tagName.toLowerCase() === 'tspan') targetObj = targetObj.closest('text');
        if (targetObj && cfg.objectsMap.has(targetObj.id)) {
          var textObj = cfg.objectsMap.get(targetObj.id);
          if (textObj) {
            cfg.selectedIds.clear();
            cfg.selectedIds.add(textObj.id);
            textTool.startDirectCanvasTyping(textObj.attrs.x, textObj.attrs.y, textObj);
          }
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

      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        cfg.selectedIds.clear();
        cfg.objectsMap.forEach(function(obj) {
          cfg.selectedIds.add(obj.id);
        });
        if (render && render.renderUI) render.renderUI();
        if (render && render.renderRibbon) render.renderRibbon();
        return;
      }

      if (e.key === 'F2') {
        if (cfg.selectedIds.size === 1) {
          var selId = Array.from(cfg.selectedIds)[0];
          var selObj = cfg.objectsMap.get(selId);
          if (selObj && selObj.type === 'text') {
            e.preventDefault();
            textTool.startDirectCanvasTyping(selObj.attrs.x, selObj.attrs.y, selObj);
            return;
          }
        }
      }

      if (cfg.selectedIds.size === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        var selId2 = Array.from(cfg.selectedIds)[0];
        var selObj2 = cfg.objectsMap.get(selId2);
        if (selObj2 && selObj2.type !== 'text') {
          if (e.key.length === 1 && !['Escape', 'Tab', 'CapsLock'].includes(e.key)) {
            var pt = textTool.getShapeTextInsertionPoint(selObj2);
            textTool.startDirectCanvasTyping(pt.px, pt.py, null, pt.anchor);
            return;
          }
        }
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
            if (obj && obj.underlineEl && obj.underlineEl.parentNode) {
              obj.underlineEl.parentNode.removeChild(obj.underlineEl);
            }
            cfg.objectsMap.delete(id);
          });
          cfg.selectedIds.clear();
          render.renderUI();
          render.renderRibbon();
          render.updateDomTree();
        }
      }

      var isPlusKey = e.key === '+' || e.key === '=' || e.code === 'NumpadAdd' || e.code === 'Equal';
      var isMinusKey = e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract' || e.code === 'Minus';
      if (isPlusKey || isMinusKey) {
        var isInputTarget = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT');
        if (!state.typingSvgObj && !isInputTarget && cfg.selectedIds.size > 0) {
          var hasTextObj = false;
          var delta = isPlusKey ? 2 : -2;
          cfg.selectedIds.forEach(function(id) {
            var obj = cfg.objectsMap.get(id);
            if (obj && obj.type === 'text') {
              hasTextObj = true;
              var curSize = parseInt(obj.attrs.fontSize || cfg.fontSize || 20, 10);
              var newSize = Math.max(6, Math.min(200, curSize + delta));
              obj.attrs.fontSize = newSize;
              cfg.fontSize = newSize;
            }
          });
          if (hasTextObj) {
            e.preventDefault();
            render.renderUI();
            render.renderRibbon();
            if (window.pushHistoryState) window.pushHistoryState();
          }
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
        if (key === 'H') handlers.setTool('pan');
        else if (key === 'S') handlers.setTool('select');
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
