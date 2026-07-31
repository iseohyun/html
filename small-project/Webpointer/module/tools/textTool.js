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

    function getSharpContrastColor(hexColor) {
      if (!hexColor || hexColor === 'none' || hexColor === 'transparent') return '#ef4444';
      if (hexColor.startsWith('#')) {
        var hex = hexColor.substring(1);
        if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
        if (hex.length === 6) {
          var r = parseInt(hex.substring(0,2), 16);
          var g = parseInt(hex.substring(2,4), 16);
          var b = parseInt(hex.substring(4,6), 16);
          var lum = (0.299 * r + 0.587 * g + 0.114 * b);
          return (lum < 128) ? '#ef4444' : '#00f5c0';
        }
      }
      return '#ef4444';
    }

    if (state.caretBlinkTimer) {
      clearInterval(state.caretBlinkTimer);
      state.caretBlinkTimer = null;
    }

    var caretColor = getSharpContrastColor(textColor);

    var caretEl = document.getElementById('canvasBlinkingCaret');
    if (!caretEl) {
      caretEl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      caretEl.setAttribute('id', 'canvasBlinkingCaret');
    }
    caretEl.setAttribute('stroke', caretColor);
    caretEl.setAttribute('stroke-width', '2.5');
    caretEl.setAttribute('shape-rendering', 'crispEdges');
    caretEl.setAttribute('class', 'blinking-caret');
    caretEl.style.visibility = 'visible';
    caretEl.style.opacity = '1';

    var smilAnim = caretEl.querySelector('animate');
    if (!smilAnim) {
      smilAnim = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      caretEl.appendChild(smilAnim);
    }
    smilAnim.setAttribute('attributeName', 'opacity');
    smilAnim.setAttribute('values', '1;1;0;0;1');
    smilAnim.setAttribute('keyTimes', '0;0.499;0.5;0.999;1');
    smilAnim.setAttribute('dur', '1s');
    smilAnim.setAttribute('repeatCount', 'indefinite');

    if (uiGroup) uiGroup.appendChild(caretEl);
    state.typingCaretEl = caretEl;

    // Strict 1s cycle timer: 0.5s ON (0~500ms), 0.5s OFF (500~1000ms)
    var caretVisible = true;
    var startTime = Date.now();

    function resetCaretBlinkTimer() {
      startTime = Date.now();
      caretVisible = true;
      var el = document.getElementById('canvasBlinkingCaret');
      if (el) {
        el.style.visibility = 'visible';
        el.style.opacity = '1';
      }
    }

    state.resetCaretBlinkTimer = resetCaretBlinkTimer;

    state.caretBlinkTimer = setInterval(function() {
      var el = document.getElementById('canvasBlinkingCaret');
      if (!el) return;
      var elapsed = (Date.now() - startTime) % 1000;
      var shouldBeVisible = (elapsed < 500);
      if (caretVisible !== shouldBeVisible) {
        caretVisible = shouldBeVisible;
        el.style.visibility = caretVisible ? 'visible' : 'hidden';
        el.style.opacity = caretVisible ? '1' : '0';
      }
    }, 50);

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
      var caretEl = state.typingCaretEl || document.getElementById('canvasBlinkingCaret');
      if (!state.typingSvgObj || !caretEl) return;
      state.typingCaretEl = caretEl;

      var textEl = state.typingSvgObj.el;
      if (!textEl) return;

      var hiddenInput = document.getElementById('hiddenCanvasInput');
      if (!hiddenInput) return;

      var fontSize = parseInt(state.typingSvgObj.attrs.fontSize || 20, 10);
      var fontBaselineY = state.typingSvgObj.attrs.y || 0;
      var baseX = state.typingSvgObj.attrs.x || 0;
      var textAnchor = state.typingSvgObj.attrs.textAnchor || 'start';

      var cx = baseX;
      var cy1 = fontBaselineY - (fontSize * 0.85);
      var cy2 = fontBaselineY + (fontSize * 0.15);

      var caretPos = hiddenInput.selectionDirection === 'backward' ? hiddenInput.selectionStart : hiddenInput.selectionEnd;
      if (caretPos === undefined || caretPos === null) caretPos = (hiddenInput.value || '').length;

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

        if (targetTspan) {
          var tspanText = targetTspan.textContent || '';
          if (tspanText === '\u200B') tspanText = '';

          var calculatedX = null;

          if (tspanText.length === 0) {
            calculatedX = baseX;
          } else if (chIdxInLine === 0) {
            // START OF LINE (Home key / Position 0): Left edge of first character
            if (targetTspan.getStartPositionOfChar) {
              try { calculatedX = Math.round(targetTspan.getStartPositionOfChar(0).x); } catch(e) {}
            }
            if (calculatedX === null && targetTspan.getExtentOfChar) {
              try {
                var ext0 = targetTspan.getExtentOfChar(0);
                if (ext0 && ext0.width >= 0) calculatedX = Math.round(ext0.x);
              } catch(e) {}
            }
            if (calculatedX === null && targetTspan.getBBox) {
              try {
                var bbox0 = targetTspan.getBBox();
                if (bbox0) calculatedX = Math.round(bbox0.x);
              } catch(e) {}
            }
          } else {
            // AFTER CHARACTER chIdxInLine - 1 (Right edge of character at chIdxInLine - 1)
            var charIdxToQuery = Math.min(chIdxInLine - 1, tspanText.length - 1);
            if (targetTspan.getExtentOfChar) {
              try {
                var ext = targetTspan.getExtentOfChar(charIdxToQuery);
                if (ext && ext.width >= 0) {
                  calculatedX = Math.round(ext.x + ext.width);
                }
              } catch(e) {}
            }

            if (calculatedX === null && targetTspan.getSubStringLength) {
              try {
                var subLen = targetTspan.getSubStringLength(0, Math.min(chIdxInLine, tspanText.length));
                var startX = baseX;
                if (targetTspan.getStartPositionOfChar) {
                  try { startX = targetTspan.getStartPositionOfChar(0).x; } catch(eStart) {}
                }
                if (textAnchor === 'middle') {
                  var totalLen = targetTspan.getComputedTextLength ? targetTspan.getComputedTextLength() : subLen;
                  startX = baseX - (totalLen / 2);
                } else if (textAnchor === 'end' || textAnchor === 'right') {
                  var totalLen = targetTspan.getComputedTextLength ? targetTspan.getComputedTextLength() : subLen;
                  startX = baseX - totalLen;
                }
                calculatedX = Math.round(startX + subLen);
              } catch(e) {}
            }

            if (calculatedX === null && targetTspan.getBBox) {
              try {
                var bbox = targetTspan.getBBox();
                if (bbox && bbox.width > 0) {
                  var ratio = Math.min(1, chIdxInLine / Math.max(1, tspanText.length));
                  calculatedX = Math.round(bbox.x + bbox.width * ratio);
                }
              } catch(e) {}
            }
          }

          if (calculatedX !== null && !isNaN(calculatedX)) {
            cx = calculatedX;
          }
        }
      } else {
        try {
          var bbox = textEl.getBBox();
          if (bbox && bbox.width > 0) {
            cx = Math.round(bbox.x + bbox.width + 1.5);
            cy1 = bbox.y;
            cy2 = bbox.y + bbox.height;
          }
        } catch(eBbox) {}
      }

      caretEl.setAttribute('x1', cx);
      caretEl.setAttribute('y1', cy1);
      caretEl.setAttribute('x2', cx);
      caretEl.setAttribute('y2', cy2);
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
      resetCaretBlinkTimer();
      updateCaretPosition();
      updateTextSelectionHighlight();
    }

    state.syncCaretFunc = syncSelection;

    hiddenInput.addEventListener('keyup', syncSelection);
    hiddenInput.addEventListener('click', syncSelection);
    hiddenInput.addEventListener('select', syncSelection);
    hiddenInput.addEventListener('selectionchange', syncSelection);

    function getLineAndColFromPos(text, pos) {
      var lines = text.split('\n');
      var accum = 0;
      for (var i = 0; i < lines.length; i++) {
        var len = lines[i].length;
        if (pos <= accum + len || i === lines.length - 1) {
          var col = Math.max(0, Math.min(len, pos - accum));
          return { lineIdx: i, colIdx: col, accumStart: accum, lineLen: len };
        }
        accum += len + 1;
      }
      return { lineIdx: 0, colIdx: 0, accumStart: 0, lineLen: text.length };
    }

    function getPosFromLineAndCol(text, lineIdx, colIdx) {
      var lines = text.split('\n');
      var targetLine = Math.max(0, Math.min(lines.length - 1, lineIdx));
      var accum = 0;
      for (var i = 0; i < targetLine; i++) {
        accum += lines[i].length + 1;
      }
      var targetCol = Math.max(0, Math.min(lines[targetLine].length, colIdx));
      return accum + targetCol;
    }

    function applyNavSelection(newPos, isShift) {
      var val = hiddenInput.value || '';
      var clampedPos = Math.max(0, Math.min(val.length, newPos));

      if (isShift) {
        if (state.selectionAnchorPos === null || state.selectionAnchorPos === undefined) {
          state.selectionAnchorPos = (hiddenInput.selectionDirection === 'backward') ? hiddenInput.selectionEnd : hiddenInput.selectionStart;
        }
        var anchor = state.selectionAnchorPos;
        var start = Math.min(anchor, clampedPos);
        var end = Math.max(anchor, clampedPos);
        var dir = (clampedPos < anchor) ? 'backward' : 'forward';
        try {
          hiddenInput.setSelectionRange(start, end, dir);
        } catch(e) {
          hiddenInput.selectionStart = start;
          hiddenInput.selectionEnd = end;
        }
      } else {
        state.selectionAnchorPos = null;
        try {
          hiddenInput.setSelectionRange(clampedPos, clampedPos);
        } catch(e) {
          hiddenInput.selectionStart = clampedPos;
          hiddenInput.selectionEnd = clampedPos;
        }
      }
    }

    hiddenInput.addEventListener('keydown', function(e) {
      e.stopPropagation();
      if (e.key === 'Escape') {
        e.preventDefault();
        finishDirectCanvasTyping();
        return;
      }

      if (!e.shiftKey && e.key !== 'Shift' && e.key !== 'Control' && e.key !== 'Alt') {
        state.selectionAnchorPos = null;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        var val = hiddenInput.value || '';
        var currentActivePos = (hiddenInput.selectionDirection === 'backward') ? hiddenInput.selectionStart : hiddenInput.selectionEnd;
        var info = getLineAndColFromPos(val, currentActivePos);
        if (info.lineIdx > 0) {
          var newPos = getPosFromLineAndCol(val, info.lineIdx - 1, info.colIdx);
          applyNavSelection(newPos, e.shiftKey);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        var val = hiddenInput.value || '';
        var currentActivePos = (hiddenInput.selectionDirection === 'backward') ? hiddenInput.selectionStart : hiddenInput.selectionEnd;
        var info = getLineAndColFromPos(val, currentActivePos);
        var lines = val.split('\n');
        if (info.lineIdx < lines.length - 1) {
          var newPos = getPosFromLineAndCol(val, info.lineIdx + 1, info.colIdx);
          applyNavSelection(newPos, e.shiftKey);
        }
      } else if (e.key === 'Home') {
        e.preventDefault();
        var val = hiddenInput.value || '';
        var targetPos = 0;
        if (!e.ctrlKey) {
          var currentActivePos = (hiddenInput.selectionDirection === 'backward') ? hiddenInput.selectionStart : hiddenInput.selectionEnd;
          var lineStart = val.lastIndexOf('\n', currentActivePos - 1);
          targetPos = lineStart === -1 ? 0 : lineStart + 1;
        }
        applyNavSelection(targetPos, e.shiftKey);
      } else if (e.key === 'End') {
        e.preventDefault();
        var val = hiddenInput.value || '';
        var targetPos = val.length;
        if (!e.ctrlKey) {
          var currentActivePos = (hiddenInput.selectionDirection === 'backward') ? hiddenInput.selectionStart : hiddenInput.selectionEnd;
          var lineEnd = val.indexOf('\n', currentActivePos);
          targetPos = lineEnd === -1 ? val.length : lineEnd;
        }
        applyNavSelection(targetPos, e.shiftKey);
      }

      syncSelection();
      setTimeout(syncSelection, 0);
      setTimeout(syncSelection, 15);
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
        hiddenInput.addEventListener('blur', function(e) {
          setTimeout(function() {
            var active = document.activeElement;
            var input = document.getElementById('hiddenCanvasInput');
            if (!input || input.dataset.isFinishing === 'true') return;

            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'BUTTON' || active.tagName === 'SELECT')) {
              if (active.id !== 'hiddenCanvasInput') {
                finishDirectCanvasTyping();
              }
            } else if (state.typingSvgObj) {
              input.focus();
            } else {
              finishDirectCanvasTyping();
            }
          }, 120);
        });
      }
    }, 250);
  }

  function finishDirectCanvasTyping() {
    var hiddenInput = document.getElementById('hiddenCanvasInput');
    if (hiddenInput && hiddenInput.dataset.isFinishing === 'true') return;
    if (hiddenInput) hiddenInput.dataset.isFinishing = 'true';

    if (state.caretBlinkTimer) {
      clearInterval(state.caretBlinkTimer);
      state.caretBlinkTimer = null;
    }

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
        if (state.typingSvgObj.underlineEl && state.typingSvgObj.underlineEl.parentNode) {
          state.typingSvgObj.underlineEl.parentNode.removeChild(state.typingSvgObj.underlineEl);
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

  function updateShapeTextAlignment(shapeObj, textObj, hAlign, vAlign) {
    if (!shapeObj || !textObj) return;
    var bounds = window.WebpointerObjects ? window.WebpointerObjects.getObjectBounds(shapeObj) : null;
    if (!bounds) {
      var a = shapeObj.attrs || {};
      bounds = {
        minX: a.x !== undefined ? a.x : 0,
        minY: a.y !== undefined ? a.y : 0,
        maxX: (a.x !== undefined ? a.x : 0) + (a.width || 100),
        maxY: (a.y !== undefined ? a.y : 0) + (a.height || 100)
      };
    }

    var fontSize = parseInt(textObj.attrs ? textObj.attrs.fontSize || cfg.fontSize || 20 : 20, 10);
    var h = hAlign || (textObj.attrs ? textObj.attrs.textAnchor : 'middle') || 'middle';
    var v = vAlign || (textObj.attrs ? textObj.attrs.verticalAlign : 'middle') || 'middle';

    var newX = (bounds.minX + bounds.maxX) / 2;
    if (h === 'start' || h === 'left') {
      newX = bounds.minX + 12;
    } else if (h === 'end' || h === 'right') {
      newX = bounds.maxX - 12;
    }

    var newY = (bounds.minY + bounds.maxY) / 2 + (fontSize * 0.35);
    if (v === 'top') {
      newY = bounds.minY + fontSize + 8;
    } else if (v === 'bottom') {
      newY = bounds.maxY - 8;
    }

    var anchor = (h === 'left') ? 'start' : ((h === 'right') ? 'end' : h);

    if (textObj.attrs) {
      textObj.attrs.x = Math.round(newX);
      textObj.attrs.y = Math.round(newY);
      textObj.attrs.textAnchor = anchor;
      textObj.attrs.verticalAlign = v;
    }

    if (textObj.el) {
      textObj.el.setAttribute('x', Math.round(newX));
      textObj.el.setAttribute('y', Math.round(newY));
      textObj.el.setAttribute('text-anchor', anchor);
    }
  }

  function findCharIndexAtCoords(textObj, clickX, clickY) {
    if (!textObj || !textObj.el) return 0;
    var textEl = textObj.el;
    var tspans = textEl.querySelectorAll('tspan');

    if (!tspans || tspans.length === 0) {
      var fullText = textEl.textContent || '';
      if (!textEl.getExtentOfChar) return fullText.length;
      var bestIdx = fullText.length;
      var minDist = Infinity;
      for (var i = 0; i < fullText.length; i++) {
        try {
          var ext = textEl.getExtentOfChar(i);
          if (ext && ext.width > 0) {
            var midX = ext.x + ext.width / 2;
            var dist = Math.abs(clickX - midX);
            if (dist < minDist) {
              minDist = dist;
              bestIdx = (clickX < midX) ? i : i + 1;
            }
          }
        } catch(e) {}
      }
      return bestIdx;
    }

    var accumChars = 0;
    var bestGlobalIdx = 0;
    var minLineDist = Infinity;

    for (var l = 0; l < tspans.length; l++) {
      var tspan = tspans[l];
      var content = tspan.textContent || '';
      if (content === '\u200B') content = '';
      var lineLen = content.length;

      var bbox = tspan.getBBox();
      var lineMidY = bbox.y + bbox.height / 2;
      var lineDistY = Math.abs(clickY - lineMidY);

      if (lineDistY < minLineDist) {
        minLineDist = lineDistY;
        var lineBestIdx = lineLen;
        var minCharDistX = Infinity;

        if (tspan.getExtentOfChar && lineLen > 0) {
          for (var c = 0; c < lineLen; c++) {
            try {
              var extC = tspan.getExtentOfChar(c);
              if (extC && extC.width > 0) {
                var midX = extC.x + extC.width / 2;
                var distX = Math.abs(clickX - midX);
                if (distX < minCharDistX) {
                  minCharDistX = distX;
                  lineBestIdx = (clickX < midX) ? c : c + 1;
                }
              }
            } catch(e) {}
          }
        }
        bestGlobalIdx = accumChars + lineBestIdx;
      }
      accumChars += (lineLen + 1);
    }
    return bestGlobalIdx;
  }

  function setCaretIndex(charIdx) {
    var hiddenInput = document.getElementById('hiddenCanvasInput');
    if (!hiddenInput) return;
    var len = (hiddenInput.value || '').length;
    var idx = Math.max(0, Math.min(len, charIdx));
    try {
      hiddenInput.focus();
      hiddenInput.setSelectionRange(idx, idx);
    } catch(e) {
      hiddenInput.selectionStart = idx;
      hiddenInput.selectionEnd = idx;
    }
    if (state.syncCaretFunc) state.syncCaretFunc();
  }

  window.addTextObject = addTextObject;
  window.updateShapeTextAlignment = updateShapeTextAlignment;

  window.WebpointerTextTool = {
    addTextObject: addTextObject,
    startDirectCanvasTyping: startDirectCanvasTyping,
    finishDirectCanvasTyping: finishDirectCanvasTyping,
    getShapeTextInsertionPoint: getShapeTextInsertionPoint,
    updateShapeTextAlignment: updateShapeTextAlignment,
    findCharIndexAtCoords: findCharIndexAtCoords,
    setCaretIndex: setCaretIndex
  };
})(window);
