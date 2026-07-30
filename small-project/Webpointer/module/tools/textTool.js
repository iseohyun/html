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

    if (!document.getElementById('caretBlinkStyle')) {
      var st = document.createElement('style');
      st.id = 'caretBlinkStyle';
      st.innerHTML = '@keyframes caretBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } } .blinking-caret { animation: caretBlink 0.85s infinite !important; }';
      document.head.appendChild(st);
    }

    var caretEl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    caretEl.setAttribute('id', 'canvasBlinkingCaret');
    caretEl.setAttribute('stroke', '#0284c7');
    caretEl.setAttribute('stroke-width', '2.5');
    caretEl.setAttribute('class', 'blinking-caret');
    caretEl.style.cssText = 'animation: caretBlink 0.85s infinite !important;';
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

    function updateTextSelectionHighlight() {
      var oldGroup = document.getElementById('canvasTextSelectionGroup');
      if (oldGroup && oldGroup.parentNode) oldGroup.parentNode.removeChild(oldGroup);

      if (!hiddenInput || !state.typingSvgObj || !uiGroup) return;

      var selStart = hiddenInput.selectionStart;
      var selEnd = hiddenInput.selectionEnd;

      if (selStart === undefined || selEnd === undefined || selStart >= selEnd) return;

      var textEl = state.typingSvgObj.el;
      if (!textEl) return;

      var highlightGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      highlightGroup.setAttribute('id', 'canvasTextSelectionGroup');

      var totalChars = 0;
      var tspans = textEl.querySelectorAll('tspan');

      try {
        if (tspans && tspans.length > 0) {
          tspans.forEach(function(tspan) {
            var content = tspan.textContent || '';
            if (content === '\u200B') content = '';
            var len = content.length;
            var lineStart = totalChars;
            var lineEnd = totalChars + len;

            var overlapStart = Math.max(selStart, lineStart);
            var overlapEnd = Math.min(selEnd, lineEnd);

            if (overlapStart < overlapEnd && tspan.getExtentOfChar) {
              for (var chIdx = overlapStart - lineStart; chIdx < overlapEnd - lineStart; chIdx++) {
                try {
                  var ext = tspan.getExtentOfChar(chIdx);
                  if (ext && ext.width > 0 && ext.height > 0) {
                    var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    rect.setAttribute('x', Math.round(ext.x));
                    rect.setAttribute('y', Math.round(ext.y));
                    rect.setAttribute('width', Math.round(ext.width));
                    rect.setAttribute('height', Math.round(ext.height));
                    rect.setAttribute('fill', '#3b82f6');
                    rect.setAttribute('fill-opacity', '0.35');
                    highlightGroup.appendChild(rect);
                  }
                } catch(e) {}
              }
            }
            totalChars += (len + 1);
          });
        } else if (textEl.getExtentOfChar) {
          for (var i = selStart; i < selEnd; i++) {
            try {
              var ext = textEl.getExtentOfChar(i);
              if (ext && ext.width > 0 && ext.height > 0) {
                var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', Math.round(ext.x));
                rect.setAttribute('y', Math.round(ext.y));
                rect.setAttribute('width', Math.round(ext.width));
                rect.setAttribute('height', Math.round(ext.height));
                rect.setAttribute('fill', '#3b82f6');
                rect.setAttribute('fill-opacity', '0.35');
                highlightGroup.appendChild(rect);
              }
            } catch(e) {}
          }
        }
      } catch(err) {}

      if (caretEl && caretEl.parentNode === uiGroup) {
        uiGroup.insertBefore(highlightGroup, caretEl);
      } else {
        uiGroup.appendChild(highlightGroup);
      }
    }

    function updateCaretPosition() {
      if (!state.typingSvgObj || !state.typingCaretEl) return;
      var textEl = state.typingSvgObj.el;
      var fontSize = parseInt(state.typingSvgObj.attrs.fontSize || 20, 10);
      var fontBaselineY = state.typingSvgObj.attrs.y || 0;
      var baseX = state.typingSvgObj.attrs.x || 0;

      var cx = baseX;
      var cy1 = fontBaselineY - (fontSize * 0.85);
      var cy2 = fontBaselineY + (fontSize * 0.15);

      try {
        if (textEl) {
          var caretPos = hiddenInput.selectionDirection === 'backward' ? hiddenInput.selectionStart : hiddenInput.selectionEnd;
          if (caretPos === undefined) caretPos = (hiddenInput.value || '').length;

          var tspans = textEl.querySelectorAll('tspan');
          if (tspans && tspans.length > 0) {
            var accumChars = 0;
            var targetTspan = tspans[0];
            var targetLineIdx = 0;
            var chIdxInLine = caretPos;

            for (var l = 0; l < tspans.length; l++) {
              var content = tspans[l].textContent || '';
              if (content === '\u200B') content = '';
              var lineLen = content.length;

              if (caretPos <= accumChars + lineLen || l === tspans.length - 1) {
                targetTspan = tspans[l];
                targetLineIdx = l;
                chIdxInLine = Math.max(0, Math.min(lineLen, caretPos - accumChars));
                break;
              }
              accumChars += (lineLen + 1);
            }

            var lineY = fontBaselineY + (targetLineIdx * fontSize * (state.typingSvgObj.attrs.lineHeight || 1.2));
            cy1 = lineY - (fontSize * 0.85);
            cy2 = lineY + (fontSize * 0.15);

            if (targetTspan && targetTspan.getExtentOfChar) {
              if (chIdxInLine > 0) {
                var ext = targetTspan.getExtentOfChar(chIdxInLine - 1);
                if (ext && ext.width > 0) {
                  cx = Math.round(ext.x + ext.width + 1);
                } else {
                  var bbox = targetTspan.getBBox();
                  cx = (bbox && bbox.width > 0) ? Math.round(bbox.x + bbox.width + 1) : baseX;
                }
              } else {
                var ext0 = targetTspan.getExtentOfChar(0);
                if (ext0 && ext0.width > 0) {
                  cx = Math.round(ext0.x);
                } else {
                  cx = baseX;
                }
              }
            } else {
              cx = baseX;
            }
          } else {
            var bbox = textEl.getBBox();
            if (bbox && bbox.width > 0) {
              cx = Math.round(bbox.x + bbox.width + 1.5);
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

    updateCaretPosition();
    updateTextSelectionHighlight();

    hiddenInput.addEventListener('input', function() {
      if (state.typingSvgObj) {
        state.typingSvgObj.attrs.text = hiddenInput.value;
        if (window.WebpointerRender && window.WebpointerRender.updateElementAttributes) {
          window.WebpointerRender.updateElementAttributes(state.typingSvgObj);
        }
        updateCaretPosition();
        updateTextSelectionHighlight();
      }
    });

    function syncSelection() {
      updateCaretPosition();
      updateTextSelectionHighlight();
    }

    hiddenInput.addEventListener('keyup', syncSelection);
    hiddenInput.addEventListener('click', syncSelection);
    hiddenInput.addEventListener('select', syncSelection);

    hiddenInput.addEventListener('keydown', function(e) {
      e.stopPropagation();
      if (e.key === 'Escape') {
        e.preventDefault();
        finishDirectCanvasTyping();
      } else {
        setTimeout(syncSelection, 10);
      }
    });

    setTimeout(function() {
      if (document.getElementById('hiddenCanvasInput')) {
        hiddenInput.focus();
        updateCaretPosition();
        updateTextSelectionHighlight();
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

    var selGroup = document.getElementById('canvasTextSelectionGroup');
    if (selGroup && selGroup.parentNode) {
      selGroup.parentNode.removeChild(selGroup);
    }

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
