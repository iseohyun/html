(function(window) {
  'use strict';

  var cfg = window.WebpointerConfig;
  var state = window.WebpointerState;

  function getShapeTextInsertionPoint(shapeObj) {
    var fontSize = parseInt(cfg.fontSize || 20, 10);
    var type = shapeObj.type;
    var a = shapeObj.attrs || {};

    if (type === 'rect' || type === 'rounded') {
      return {
        px: (a.x !== undefined ? a.x : 0) + 10,
        py: (a.y !== undefined ? a.y : 0) + fontSize + 4,
        anchor: 'start'
      };
    }

    var bounds = window.WebpointerObjects ? window.WebpointerObjects.getObjectBounds(shapeObj) : null;
    var cx = 0, cy = 0;
    if (type === 'ellipse' || type === 'arc' || type === 'point') {
      cx = a.cx !== undefined ? a.cx : (bounds ? (bounds.minX + bounds.maxX) / 2 : 0);
      cy = a.cy !== undefined ? a.cy : (bounds ? (bounds.minY + bounds.maxY) / 2 : 0);
    } else if (bounds) {
      cx = (bounds.minX + bounds.maxX) / 2;
      cy = (bounds.minY + bounds.maxY) / 2;
    } else {
      cx = a.x1 || 0;
      cy = a.y1 || 0;
    }

    return {
      px: Math.round(cx),
      py: Math.round(cy + (fontSize * 0.35)),
      anchor: 'middle'
    };
  }

  function addTextObject() {
    console.log('[Webpointer Debug] addTextObject called');
    if (cfg.selectedIds && cfg.selectedIds.size === 1) {
      var selId = Array.from(cfg.selectedIds)[0];
      var shapeObj = cfg.objectsMap.get(selId);
      if (shapeObj && shapeObj.type !== 'text') {
        var pt = getShapeTextInsertionPoint(shapeObj);
        startDirectCanvasTyping(pt.px, pt.py, null, pt.anchor);
        return;
      }
    }

    if (window.WebpointerHandlers && window.WebpointerHandlers.setTool) {
      window.WebpointerHandlers.setTool('text');
    } else {
      cfg.currentTool = 'text';
      var mainSvg = document.getElementById('mainSvg');
      if (mainSvg) mainSvg.style.cursor = 'text';
      if (window.WebpointerRender && window.WebpointerRender.renderRibbon) {
        window.WebpointerRender.renderRibbon();
      }
    }
  }

  function startDirectCanvasTyping(px, py, targetObj, customAnchor) {
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
      var tAnchor = customAnchor || cfg.textAnchor || 'start';

      el.setAttribute('id', id);
      el.setAttribute('x', px);
      el.setAttribute('y', py);
      el.setAttribute('fill', textColor);
      el.setAttribute('font-size', cfg.fontSize || 20);
      el.setAttribute('font-family', cfg.fontFamily || 'sans-serif');
      el.setAttribute('text-anchor', tAnchor);
      el.setAttribute('dominant-baseline', 'alphabetic');

      var attrs = {
        x: px,
        y: py,
        text: '',
        fill: textColor,
        fontSize: cfg.fontSize || 20,
        fontFamily: cfg.fontFamily || 'sans-serif',
        textAnchor: tAnchor
      };

      var parentGroup = null;
      if (cfg.selectedIds && cfg.selectedIds.size === 1) {
        var selId = Array.from(cfg.selectedIds)[0];
        var parentShape = cfg.objectsMap.get(selId);
        if (parentShape && parentShape.type !== 'text') {
          if (!parentShape.parentId) {
            parentShape.parentId = 'group_' + (cfg.nextId++);
          }
          parentGroup = parentShape.parentId;
        }
      }

      targetSvgObj = { id: id, type: 'text', parentId: parentGroup, attrs: attrs, el: el };
      cfg.objectsMap.set(id, targetSvgObj);
      if (window.WebpointerRender && window.WebpointerRender.updateElementAttributes) {
        window.WebpointerRender.updateElementAttributes(targetSvgObj);
      }
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
        if (window.WebpointerRender && window.WebpointerRender.updateElementAttributes) {
          window.WebpointerRender.updateElementAttributes(state.typingSvgObj);
        }
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

    if (window.WebpointerRender) {
      if (window.WebpointerRender.updateDomTree) window.WebpointerRender.updateDomTree();
      if (window.WebpointerRender.renderUI) window.WebpointerRender.renderUI();
      if (window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
    }
  }

  window.addTextObject = addTextObject;

  window.WebpointerTextTool = {
    addTextObject: addTextObject,
    startDirectCanvasTyping: startDirectCanvasTyping,
    finishDirectCanvasTyping: finishDirectCanvasTyping,
    getShapeTextInsertionPoint: getShapeTextInsertionPoint
  };
})(window);
