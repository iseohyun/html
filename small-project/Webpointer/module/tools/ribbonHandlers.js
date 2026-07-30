(function(window) {
  'use strict';

  var cfg = window.WebpointerConfig;
  var state = window.WebpointerState;

  function setTool(tool) {
    if (state.isMultiBezierActive && tool !== 'bez2' && tool !== 'bez3') {
      if (window.WebpointerBezier && window.WebpointerBezier.finishMultiBezier) {
        window.WebpointerBezier.finishMultiBezier();
      }
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
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) {
      window.WebpointerRender.renderRibbon();
    }
  }

  function getAllGroupMembers(selectedIds) {
    var memberMap = new Map();

    function addObj(obj) {
      if (!obj || memberMap.has(obj.id)) return;
      memberMap.set(obj.id, obj);
      if (obj.parentId) {
        cfg.objectsMap.forEach(function(o) {
          if (o.parentId === obj.parentId && !memberMap.has(o.id)) {
            addObj(o);
          }
        });
      }
    }

    (selectedIds || new Set()).forEach(function(id) {
      var obj = cfg.objectsMap.get(id);
      if (obj) addObj(obj);
    });

    return Array.from(memberMap.values());
  }

  function applyStyleToSelected() {
    var objectsGroup = document.getElementById('objectsGroup');
    var members = getAllGroupMembers(cfg.selectedIds);
    var targetShapes = [];
    var standaloneTexts = [];

    var hasShapeInGroup = members.some(function(m) { return m.type !== 'text'; });
    members.forEach(function(m) {
      if (m.type !== 'text') {
        if (targetShapes.indexOf(m) === -1) targetShapes.push(m);
      } else if (!hasShapeInGroup) {
        if (standaloneTexts.indexOf(m) === -1) standaloneTexts.push(m);
      }
    });

    targetShapes.forEach(function(obj) {
      if (obj.attrs) {
        obj.attrs.stroke = cfg.strokeColor;
        obj.attrs.fill = cfg.fillColor;
        obj.attrs.strokeWidth = cfg.strokeWidth;
        obj.attrs.strokeDashStyle = cfg.strokeDashStyle;
        obj.attrs.strokeDashArray = cfg.strokeDashArray || '6,6';
        obj.attrs.strokeCap = cfg.strokeCap || 'butt';
        obj.attrs.strokeJoin = cfg.strokeJoin || 'miter';
      }
      if (window.WebpointerRender && window.WebpointerRender.updateElementAttributes) {
        window.WebpointerRender.updateElementAttributes(obj);
      }
    });

    standaloneTexts.forEach(function(textObj) {
      var bounds = window.WebpointerObjects ? window.WebpointerObjects.getObjectBounds(textObj) : null;
      if (!bounds) return;

      var rectX = Math.round(bounds.minX - 8);
      var rectY = Math.round(bounds.minY - 8);
      var rectW = Math.max(20, Math.round(bounds.maxX - bounds.minX + 16));
      var rectH = Math.max(20, Math.round(bounds.maxY - bounds.minY + 16));

      var shapeId = 'obj_' + (cfg.nextId++);
      var el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');

      var groupId = textObj.parentId || ('group_' + (cfg.nextId++));
      textObj.parentId = groupId;

      var attrs = {
        x: rectX,
        y: rectY,
        width: rectW,
        height: rectH,
        rx: 10,
        stroke: cfg.strokeColor || '#041e49',
        fill: cfg.fillColor || 'none',
        strokeWidth: cfg.strokeWidth || 2,
        strokeDashStyle: cfg.strokeDashStyle || 'solid',
        strokeDashArray: cfg.strokeDashArray || '6,6',
        strokeCap: cfg.strokeCap || 'butt',
        strokeJoin: cfg.strokeJoin || 'miter'
      };

      var newShapeObj = { id: shapeId, type: 'rounded', parentId: groupId, attrs: attrs, el: el };
      cfg.objectsMap.set(shapeId, newShapeObj);
      cfg.selectedIds.add(shapeId);

      if (window.WebpointerRender && window.WebpointerRender.updateElementAttributes) {
        window.WebpointerRender.updateElementAttributes(newShapeObj);
      }

      if (objectsGroup && textObj.el) {
        objectsGroup.insertBefore(el, textObj.el);
      } else if (objectsGroup) {
        objectsGroup.appendChild(el);
      }
    });
  }

  function setStrokeColor(val) {
    cfg.strokeColor = val;
    applyStyleToSelected();
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function setFillColor(val) {
    cfg.fillColor = val;
    applyStyleToSelected();
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function setStrokeWidth(val) {
    cfg.strokeWidth = parseInt(val, 10) || 2;
    applyStyleToSelected();
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function adjustStrokeWidth(delta) {
    var cur = cfg.strokeWidth || 2;
    var nextW = Math.max(1, Math.min(50, cur + delta));
    setStrokeWidth(nextW);
  }

  function setStrokeDashStyle(style) {
    cfg.strokeDashStyle = style;
    applyStyleToSelected();
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function toggleStrokeDashStyle() {
    if (state.holdTriggered) {
      state.holdTriggered = false;
      return;
    }
    var cur = cfg.strokeDashStyle || 'solid';
    cfg.strokeDashStyle = (cur === 'dashed') ? 'solid' : 'dashed';
    applyStyleToSelected();
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function startHoldDashArray(e, btnEl) {
    state.holdTriggered = false;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(function() {
      state.holdTriggered = true;
      showDashArraySelectPopup(btnEl);
    }, 400);
  }

  function endHoldDashArray() {
    clearTimeout(holdTimer);
  }

  function showDashArraySelectPopup(btnEl) {
    var old = document.getElementById('dashArrayPopupSelect');
    if (old && old.parentNode) old.parentNode.removeChild(old);

    var popup = document.createElement('div');
    popup.id = 'dashArrayPopupSelect';
    popup.style.cssText = 'position:fixed; z-index:99999; padding:6px; border:1px solid #0284c7; border-radius:6px; background:#ffffff; box-shadow:0 6px 16px rgba(0,0,0,0.18); outline:none; font-family:sans-serif; display:flex; flex-direction:column; gap:4px; width:110px;';
    var rect = btnEl.getBoundingClientRect();
    popup.style.left = Math.max(10, rect.left) + 'px';
    popup.style.top = (rect.bottom + 4) + 'px';

    var cur = cfg.strokeDashArray || '6,6';
    popup.innerHTML =
      '<div style="font-size:0.75rem; font-weight:700; color:#0f172a;">점선 패턴</div>' +
      '<input type="text" id="dashArrayInput" value="' + cur + '" style="width:100%; box-sizing:border-box; padding:4px 6px; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:4px; font-family:monospace; text-align:center;" placeholder="6,6">';

    document.body.appendChild(popup);
    var inputEl = document.getElementById('dashArrayInput');

    function closePopup() {
      var p = document.getElementById('dashArrayPopupSelect');
      if (p && p.parentNode) p.parentNode.removeChild(p);
    }

    if (inputEl) {
      inputEl.focus();
      inputEl.select();

      inputEl.onkeydown = function(ev) {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          var val = inputEl.value.trim() || '6,6';
          closePopup();
          setStrokeDashArray(val);
        } else if (ev.key === 'Escape') {
          closePopup();
        }
      };

      inputEl.onblur = function() {
        setTimeout(function() {
          var val = inputEl ? inputEl.value.trim() : '';
          if (val) {
            closePopup();
            setStrokeDashArray(val);
          } else {
            closePopup();
          }
        }, 100);
      };
    }

    function onOutsideClick(evt) {
      if (popup && !popup.contains(evt.target) && !btnEl.contains(evt.target)) {
        closePopup();
        document.removeEventListener('mousedown', onOutsideClick);
      }
    }
    setTimeout(function() { document.addEventListener('mousedown', onOutsideClick); }, 50);
  }

  function setStrokeDashArray(arrStr) {
    cfg.strokeDashArray = arrStr;
    cfg.strokeDashStyle = 'dashed';
    applyStyleToSelected();
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function setStrokeCap(val) {
    cfg.strokeCap = val;
    applyStyleToSelected();
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function setStrokeJoin(val) {
    cfg.strokeJoin = val;
    applyStyleToSelected();
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function setStartMarker(val) {
    cfg.startMarker = val;
    applyStyleToSelected();
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function setEndMarker(val) {
    cfg.endMarker = val;
    applyStyleToSelected();
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function setStartMarkerFillStyle(style) {
    cfg.startMarkerFillStyle = style;
    applyStyleToSelected();
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function toggleStartMarkerFillStyle() {
    var cur = cfg.startMarkerFillStyle || 'solid';
    cfg.startMarkerFillStyle = (cur === 'solid') ? 'hollow' : 'solid';
    applyStyleToSelected();
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function setEndMarkerFillStyle(style) {
    cfg.endMarkerFillStyle = style;
    applyStyleToSelected();
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function toggleEndMarkerFillStyle() {
    var cur = cfg.endMarkerFillStyle || 'solid';
    cfg.endMarkerFillStyle = (cur === 'solid') ? 'hollow' : 'solid';
    applyStyleToSelected();
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function scaleMarker(type, factor) {
    if (type === 'start') {
      cfg.startMarkerScale = Math.max(0.2, Math.min(5.0, (cfg.startMarkerScale || 1.0) * factor));
    } else {
      cfg.endMarkerScale = Math.max(0.2, Math.min(5.0, (cfg.endMarkerScale || 1.0) * factor));
    }
    applyStyleToSelected();
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function toggleCategoryCollapse(catId) {
    if (!cfg.collapsedCategories || !(cfg.collapsedCategories instanceof Set)) {
      cfg.collapsedCategories = new Set();
    }
    if (cfg.collapsedCategories.has(catId)) {
      cfg.collapsedCategories.delete(catId);
    } else {
      cfg.collapsedCategories.add(catId);
    }
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) {
      window.WebpointerRender.renderRibbon();
    }
  }

  var default24Colors = [
    "#660000", "#660000", "#086600", "#006627", "#002e66", "#000080", "#3a0066", "#660031",
    "#e44d1b", "#c27800", "#669900", "#00a879", "#009dd1", "#4182fb", "#a760e2", "#d94594",
    "#ff976b", "#ffbb00", "#aae43f", "#00f5c0", "#00eaff", "#85caff", "#ec99ff", "#ff8fda"
  ];

  function toggleColorPalettePopover(btnEl, targetMode) {
    var old = document.getElementById('colorPalettePopover');
    if (old) {
      var isSame = old.dataset.targetMode === targetMode;
      old.remove();
      if (isSame) return;
    }

    var popover = document.createElement('div');
    popover.id = 'colorPalettePopover';
    popover.dataset.targetMode = targetMode;
    popover.style.cssText = 'position:fixed; z-index:99999; padding:6px; border:1px solid #0284c7; border-radius:6px; background:#ffffff; box-shadow:0 6px 16px rgba(0,0,0,0.18); outline:none;';

    var rect = btnEl.getBoundingClientRect();
    popover.style.left = Math.max(10, Math.min(window.innerWidth - 245, rect.left)) + 'px';
    popover.style.top = (rect.bottom + 4) + 'px';

    var userColors = (cfg.customPalette || cfg.paletteColors || []).slice();
    while (userColors.length < 24) {
      userColors.push(default24Colors[userColors.length % default24Colors.length]);
    }

    var swatchGridHtml = '<div style="display:grid; grid-template-columns:repeat(9, 24px); grid-template-rows:repeat(3, 24px); gap:2px; margin:0; padding:0;">';
    var userIdx = 0;

    for (var slot = 1; slot <= 27; slot++) {
      var hex = '#ffffff';
      var title = '';
      if (slot === 9) {
        hex = '#ffffff'; title = '흰색 (#ffffff)';
      } else if (slot === 18) {
        hex = '#000000'; title = '검정색 (#000000)';
      } else if (slot === 27) {
        hex = 'none'; title = '투명색 (none)';
      } else {
        hex = userColors[userIdx++] || '#041e49';
        title = hex;
      }

      var innerContent = (hex === 'none') ? '<svg viewBox="0 0 24 24" style="width:100%; height:100%; display:block;"><line x1="0" y1="24" x2="24" y2="0" stroke="#ef4444" stroke-width="2.5"/></svg>' : '';
      swatchGridHtml += '<div style="width:24px; height:24px; box-sizing:border-box; border:1px solid rgba(0,0,0,0.15); border-radius:3px; background:' + (hex === 'none' ? '#ffffff' : hex) + '; cursor:pointer; position:relative;" onclick="selectColorFromPopover(\'' + targetMode + '\', \'' + hex + '\')" title="' + title + '">' + innerContent + '</div>';
    }
    swatchGridHtml += '</div>';

    popover.innerHTML = swatchGridHtml;
    document.body.appendChild(popover);

    function onOutsideClick(evt) {
      if (popover && !popover.contains(evt.target) && !btnEl.contains(evt.target)) {
        if (popover.parentNode) popover.parentNode.removeChild(popover);
        document.removeEventListener('mousedown', onOutsideClick);
      }
    }
    setTimeout(function() {
      document.addEventListener('mousedown', onOutsideClick);
    }, 50);
  }

  function selectColorFromPopover(targetMode, hex) {
    if (targetMode === 'stroke') {
      setStrokeColor(hex);
    } else if (targetMode === 'fill') {
      setFillColor(hex);
    } else if (targetMode === 'text_stroke' || targetMode === 'text') {
      cfg.textStrokeColor = hex;
      var members = getAllGroupMembers(cfg.selectedIds);
      var textObjs = members.filter(function(m) { return m.type === 'text'; });
      textObjs.forEach(function(obj) {
        if (obj && obj.attrs) {
          obj.attrs.stroke = hex;
          if (window.WebpointerRender && window.WebpointerRender.updateElementAttributes) {
            window.WebpointerRender.updateElementAttributes(obj);
          }
        }
      });
    } else if (targetMode === 'text_fill' || targetMode === 'bg') {
      cfg.textFillColor = hex;
      var members = getAllGroupMembers(cfg.selectedIds);
      var textObjs = members.filter(function(m) { return m.type === 'text'; });
      textObjs.forEach(function(obj) {
        if (obj && obj.attrs) {
          obj.attrs.fill = hex;
          if (window.WebpointerRender && window.WebpointerRender.updateElementAttributes) {
            window.WebpointerRender.updateElementAttributes(obj);
          }
        }
      });
    } else if (targetMode === 'text_underline') {
      cfg.textUnderlineColor = hex;
      var members = getAllGroupMembers(cfg.selectedIds);
      var textObjs = members.filter(function(m) { return m.type === 'text'; });
      textObjs.forEach(function(obj) {
        if (obj && obj.attrs) {
          obj.attrs.underlineColor = hex;
          if (window.WebpointerRender && window.WebpointerRender.updateElementAttributes) {
            window.WebpointerRender.updateElementAttributes(obj);
          }
        }
      });
    }

    var popover = document.getElementById('colorPalettePopover');
    if (popover && popover.parentNode) popover.parentNode.removeChild(popover);
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function setTextUnderlineStyle(val) {
    cfg.textUnderlineStyle = val;
    var members = getAllGroupMembers(cfg.selectedIds);
    var textObjs = members.filter(function(m) { return m.type === 'text'; });
    textObjs.forEach(function(obj) {
      if (obj && obj.attrs) {
        obj.attrs.underlineStyle = val;
        if (window.WebpointerRender && window.WebpointerRender.updateElementAttributes) {
          window.WebpointerRender.updateElementAttributes(obj);
        }
      }
    });
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function setTextUnderlineOffset(val) {
    var num = parseInt(val, 10);
    cfg.textUnderlineOffset = isNaN(num) ? 3 : num;
    var members = getAllGroupMembers(cfg.selectedIds);
    var textObjs = members.filter(function(m) { return m.type === 'text'; });
    textObjs.forEach(function(obj) {
      if (obj && obj.attrs) {
        obj.attrs.underlineOffset = cfg.textUnderlineOffset;
        if (window.WebpointerRender && window.WebpointerRender.updateElementAttributes) {
          window.WebpointerRender.updateElementAttributes(obj);
        }
      }
    });
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function setTextStrokeWidth(val) {
    var num = parseInt(val, 10);
    cfg.textStrokeWidth = isNaN(num) ? 1 : num;
    var members = getAllGroupMembers(cfg.selectedIds);
    var textObjs = members.filter(function(m) { return m.type === 'text'; });
    textObjs.forEach(function(obj) {
      if (obj && obj.attrs) {
        obj.attrs.strokeWidth = cfg.textStrokeWidth;
        if (window.WebpointerRender && window.WebpointerRender.updateElementAttributes) {
          window.WebpointerRender.updateElementAttributes(obj);
        }
      }
    });
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function toggleTextWritingMode() {
    var cur = cfg.textWritingMode || 'horizontal-tb';
    cfg.textWritingMode = (cur === 'vertical-rl' || cur === 'vertical') ? 'horizontal-tb' : 'vertical-rl';
    var members = getAllGroupMembers(cfg.selectedIds);
    var textObjs = members.filter(function(m) { return m.type === 'text'; });
    textObjs.forEach(function(obj) {
      if (obj && obj.attrs) {
        obj.attrs.writingMode = cfg.textWritingMode;
        if (window.WebpointerRender && window.WebpointerRender.updateElementAttributes) {
          window.WebpointerRender.updateElementAttributes(obj);
        }
      }
    });
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function getParentShapeBounds(textObj) {
    if (!textObj || !textObj.parentId) return null;
    var groupMembers = [];
    cfg.objectsMap.forEach(function(o) {
      if (o.parentId === textObj.parentId && o.id !== textObj.id && o.type !== 'text') {
        groupMembers.push(o);
      }
    });
    if (groupMembers.length === 0) return null;

    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    groupMembers.forEach(function(m) {
      var b = window.WebpointerObjects ? window.WebpointerObjects.getObjectBounds(m) : null;
      if (b) {
        if (b.minX < minX) minX = b.minX;
        if (b.maxX > maxX) maxX = b.maxX;
        if (b.minY < minY) minY = b.minY;
        if (b.maxY > maxY) maxY = b.maxY;
      }
    });
    if (minX === Infinity) return null;
    return { minX: minX, maxX: maxX, minY: minY, maxY: maxY };
  }

  function setTextVerticalAlign(val) {
    cfg.textDominantBaseline = val;
    var members = getAllGroupMembers(cfg.selectedIds);
    var textObjs = members.filter(function(m) { return m.type === 'text'; });

    textObjs.forEach(function(obj) {
      if (obj && obj.attrs) {
        var shapeBounds = getParentShapeBounds(obj);
        var fSize = obj.attrs.fontSize || cfg.fontSize || 20;

        if (shapeBounds) {
          var cy = (shapeBounds.minY + shapeBounds.maxY) / 2;
          var ty = shapeBounds.minY + (fSize * 0.8) + 4;
          var by = shapeBounds.maxY - (fSize * 0.2) - 4;
          var targetY = cy;
          if (val === 'hanging') {
            targetY = ty;
          } else if (val === 'central' || val === 'middle') {
            targetY = cy + (fSize * 0.35);
          } else if (val === 'alphabetic' || val === 'bottom') {
            targetY = by;
          }
          obj.attrs.y = Math.round(targetY);
          obj.attrs.dominantBaseline = val;
        } else {
          obj.attrs.dominantBaseline = val;
        }

        if (window.WebpointerRender && window.WebpointerRender.updateElementAttributes) {
          window.WebpointerRender.updateElementAttributes(obj);
        }
      }
    });
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function cycleTextVerticalAlign() {
    var cur = cfg.textDominantBaseline || 'alphabetic';
    var nextBaseline = 'hanging';
    if (cur === 'hanging') {
      nextBaseline = 'central';
    } else if (cur === 'central' || cur === 'middle') {
      nextBaseline = 'alphabetic';
    } else {
      nextBaseline = 'hanging';
    }
    setTextVerticalAlign(nextBaseline);
  }

  function cycleTextHorizontalAlign() {
    var cur = cfg.textAnchor || 'start';
    var nextAnchor = 'start';
    if (cur === 'start') {
      nextAnchor = 'middle';
    } else if (cur === 'middle') {
      nextAnchor = 'end';
    } else if (cur === 'end') {
      nextAnchor = 'justify';
    } else {
      nextAnchor = 'start';
    }
    setTextAnchor(nextAnchor);
  }

  function applyAutoFitToGroup(textObj) {
    if (!textObj || !textObj.parentId) return;
    var mode = textObj.attrs.autoFitMode || cfg.textAutoFitMode || 'fitShapeToText';
    if (mode === 'none') return;

    var groupMembers = [];
    cfg.objectsMap.forEach(function(o) {
      if (o.parentId === textObj.parentId && o.id !== textObj.id && o.type !== 'text') {
        groupMembers.push(o);
      }
    });
    if (groupMembers.length === 0) return;

    var textWidth = 100, textHeight = 30;
    try {
      if (textObj.el) {
        var bbox = textObj.el.getBBox();
        textWidth = bbox.width;
        textHeight = bbox.height;
      }
    } catch(e) {}

    var shapeObj = groupMembers[0];
    var sAttrs = shapeObj.attrs || {};

    if (mode === 'fitShapeToText') {
      var reqWidth = textWidth + 30;
      var reqHeight = textHeight + 20;

      if (shapeObj.type === 'rect' || shapeObj.type === 'rounded') {
        if ((sAttrs.width || 100) < reqWidth) sAttrs.width = Math.round(reqWidth);
        if ((sAttrs.height || 60) < reqHeight) sAttrs.height = Math.round(reqHeight);
      } else if (shapeObj.type === 'ellipse') {
        if ((sAttrs.rx || 50) * 2 < reqWidth) sAttrs.rx = Math.round(reqWidth / 2);
        if ((sAttrs.ry || 30) * 2 < reqHeight) sAttrs.ry = Math.round(reqHeight / 2);
      }
      if (window.WebpointerRender && window.WebpointerRender.updateElementAttributes) {
        window.WebpointerRender.updateElementAttributes(shapeObj);
      }
    } else if (mode === 'fitTextToShape') {
      var shapeWidth = sAttrs.width || (sAttrs.rx ? sAttrs.rx * 2 : 100);
      var shapeHeight = sAttrs.height || (sAttrs.ry ? sAttrs.ry * 2 : 60);

      var availW = shapeWidth - 20;
      var availH = shapeHeight - 16;

      if (textWidth > availW || textHeight > availH) {
        var scale = Math.min(availW / textWidth, availH / textHeight);
        if (scale < 1) {
          var curFont = textObj.attrs.fontSize || cfg.fontSize || 20;
          var newFont = Math.max(8, Math.floor(curFont * scale));
          textObj.attrs.fontSize = newFont;
          if (window.WebpointerRender && window.WebpointerRender.updateElementAttributes) {
            window.WebpointerRender.updateElementAttributes(textObj);
          }
        }
      }
    }
  }

  function setTextAutoFitMode(mode) {
    cfg.textAutoFitMode = mode;
    var members = getAllGroupMembers(cfg.selectedIds);
    var textObjs = members.filter(function(m) { return m.type === 'text'; });
    textObjs.forEach(function(obj) {
      if (obj && obj.attrs) {
        obj.attrs.autoFitMode = mode;
        applyAutoFitToGroup(obj);
        if (window.WebpointerRender && window.WebpointerRender.updateElementAttributes) {
          window.WebpointerRender.updateElementAttributes(obj);
        }
      }
    });
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function cycleTextAutoFitMode() {
    var cur = cfg.textAutoFitMode || 'fitShapeToText';
    var nextMode = 'fitShapeToText';
    if (cur === 'fitShapeToText') {
      nextMode = 'fitTextToShape';
    } else if (cur === 'fitTextToShape') {
      nextMode = 'none';
    } else {
      nextMode = 'fitShapeToText';
    }
    setTextAutoFitMode(nextMode);
  }

  function setTextUnderlineWidth(val) {
    var num = parseInt(val, 10);
    cfg.textUnderlineWidth = isNaN(num) ? 1 : num;
    var members = getAllGroupMembers(cfg.selectedIds);
    var textObjs = members.filter(function(m) { return m.type === 'text'; });
    textObjs.forEach(function(obj) {
      if (obj && obj.attrs) {
        obj.attrs.underlineWidth = cfg.textUnderlineWidth;
        if (window.WebpointerRender && window.WebpointerRender.updateElementAttributes) {
          window.WebpointerRender.updateElementAttributes(obj);
        }
      }
    });
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function setElementOpacity(val) {
    var num = parseFloat(val);
    if (isNaN(num)) num = 1;
    num = Math.max(0, Math.min(1, num));
    cfg.opacity = num;

    var members = getAllGroupMembers(cfg.selectedIds);
    var isTextTab = (cfg.currentTab === 'text');

    members.forEach(function(obj) {
      if (obj && obj.attrs) {
        if ((isTextTab && obj.type === 'text') || (!isTextTab && obj.type !== 'text')) {
          obj.attrs.opacity = num;
          if (window.WebpointerRenderCanvas && window.WebpointerRenderCanvas.updateElementAttributes) {
            window.WebpointerRenderCanvas.updateElementAttributes(obj);
          }
        }
      }
    });
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) {
      window.WebpointerRender.renderRibbon();
    }
  }

  function setAlphaStepCount(val) {
    var count = parseInt(val, 10);
    cfg.alphaStepCount = (isNaN(count) || count <= 0) ? 5 : count;
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) {
      window.WebpointerRender.renderRibbon();
    }
  }

  function setGridStepSize(val) {
    var num = parseInt(val, 10);
    cfg.gridStepSize = (isNaN(num) || num <= 0) ? 24 : num;
    if (window.WebpointerRenderCanvas && window.WebpointerRenderCanvas.renderGrid) {
      window.WebpointerRenderCanvas.renderGrid();
    }
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) {
      window.WebpointerRender.renderRibbon();
    }
  }

  function openPaletteModal() {
    var modal = document.getElementById('paletteModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'paletteModal';
      modal.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15,23,42,0.6); display:flex; align-items:center; justify-content:center; z-index:9999; backdrop-filter:blur(3px);';
      modal.innerHTML =
        '<div style="background:#ffffff; width:480px; max-width:90vw; padding:24px; border-radius:12px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); font-family:sans-serif;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">' +
            '<h3 style="margin:0; font-size:1.1rem; color:#0f172a; font-weight:700;">사용자 팔레트 프리셋 수정 (Array 입력)</h3>' +
            '<button onclick="closePaletteModal()" style="background:none; border:none; font-size:1.2rem; cursor:pointer; color:#64748b;">✕</button>' +
          '</div>' +
          '<textarea class="palette-modal-textarea" id="paletteTextarea" style="width:100%; height:130px; padding:10px; font-family:monospace; font-size:0.82rem; border:1px solid #cbd5e1; border-radius:8px; outline:none; resize:vertical; color:#0f172a; background:#f8fafc;" placeholder=\'const colorPalette = [\n  "#2AA314", "#14A36A", "#1471A3"\n];\'></textarea>' +
          '<div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">' +
            '<button onclick="closePaletteModal()" style="padding:8px 16px; border:1px solid #cbd5e1; background:#ffffff; border-radius:6px; cursor:pointer; font-weight:600; color:#475569;">취소</button>' +
            '<button onclick="importPaletteFromText()" style="padding:8px 16px; border:none; background:#0284c7; color:#ffffff; border-radius:6px; cursor:pointer; font-weight:600;">적용하기</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);
    }
    var textarea = document.getElementById('paletteTextarea');
    if (textarea) {
      textarea.value = '';
      textarea.focus();
    }
    modal.style.display = 'flex';
  }

  function closePaletteModal() {
    var modal = document.getElementById('paletteModal');
    if (modal) modal.style.display = 'none';
  }

  function importPaletteFromText() {
    var textarea = document.getElementById('paletteTextarea');
    if (!textarea) return;
    var rawText = textarea.value.trim();
    if (!rawText) { closePaletteModal(); return; }

    var matches = rawText.match(/#(?:[0-9a-fA-F]{3}){1,2}\b/g);
    if (matches && matches.length > 0) {
      cfg.paletteColors = matches.slice(0, 27);
      if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
    }
    closePaletteModal();
  }

  function switchTab(tabKey) {
    cfg.currentTab = tabKey;
    var menuBar = document.querySelector('.menu-bar');
    if (menuBar) {
      menuBar.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').indexOf("'" + tabKey + "'") !== -1) {
          btn.classList.add('active');
        }
      });
    }
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) {
      window.WebpointerRender.renderRibbon();
    }
  }

  function setActiveColorTarget(target) {
    cfg.activeColorTarget = target;
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function setActiveTextColorTarget(target) {
    cfg.activeTextColorTarget = target;
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function applyPaletteColor(hex) {
    if (cfg.currentTab === 'text') {
      var target = cfg.activeTextColorTarget || 'text';
      var members = getAllGroupMembers(cfg.selectedIds);
      var textObjs = members.filter(function(m) { return m.type === 'text'; });

      textObjs.forEach(function(obj) {
        if (obj && obj.attrs) {
          if (target === 'text') {
            obj.attrs.fill = hex;
          } else {
            obj.attrs.bgColor = hex;
          }
          if (window.WebpointerRender && window.WebpointerRender.updateElementAttributes) {
            window.WebpointerRender.updateElementAttributes(obj);
          }
        }
      });
      if (target === 'text') cfg.strokeColor = hex;
    } else {
      var mode = cfg.activeColorTarget || 'stroke';
      if (mode === 'stroke') {
        setStrokeColor(hex);
      } else {
        setFillColor(hex);
      }
    }
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function setTextFontFamily(val) {
    cfg.fontFamily = val;
    applyTextStyleToSelected();
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function setTextFontSize(val) {
    cfg.fontSize = parseInt(val, 10) || 20;
    applyTextStyleToSelected();
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function setTextFontWeight(val) {
    cfg.fontWeight = val;
    applyTextStyleToSelected();
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function setTextFontStyle(val) {
    cfg.fontStyle = val;
    applyTextStyleToSelected();
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function setTextLineHeight(val) {
    cfg.lineHeight = parseFloat(val) || 1.2;
    applyTextStyleToSelected();
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function applyTextStyleToSelected() {
    var members = getAllGroupMembers(cfg.selectedIds);
    var textObjs = members.filter(function(m) { return m.type === 'text'; });

    textObjs.forEach(function(obj) {
      if (obj && obj.attrs) {
        obj.attrs.fontFamily = cfg.fontFamily;
        obj.attrs.fontSize = cfg.fontSize;
        obj.attrs.fontWeight = cfg.fontWeight;
        obj.attrs.fontStyle = cfg.fontStyle;
        obj.attrs.textDecoration = cfg.textDecoration || 'none';
        obj.attrs.textAnchor = cfg.textAnchor || 'start';
        obj.attrs.lineHeight = cfg.lineHeight;
        if (window.WebpointerRender && window.WebpointerRender.updateElementAttributes) {
          window.WebpointerRender.updateElementAttributes(obj);
        }
      }
    });
  }

  function toggleTextStrikethrough() {
    var cur = cfg.textDecoration || 'none';
    cfg.textDecoration = (cur === 'line-through') ? 'none' : 'line-through';
    applyTextStyleToSelected();
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function setTextAnchor(newAnchor) {
    cfg.textAnchor = newAnchor;
    var members = getAllGroupMembers(cfg.selectedIds);
    var textObjs = members.filter(function(m) { return m.type === 'text'; });

    textObjs.forEach(function(obj) {
      if (obj && obj.attrs) {
        var shapeBounds = getParentShapeBounds(obj);
        if (shapeBounds) {
          var cx = (shapeBounds.minX + shapeBounds.maxX) / 2;
          var lx = shapeBounds.minX + 10;
          var rx = shapeBounds.maxX - 10;
          var targetX = cx;
          if (newAnchor === 'start') targetX = lx;
          else if (newAnchor === 'middle') targetX = cx;
          else if (newAnchor === 'end') targetX = rx;

          obj.attrs.x = Math.round(targetX);
          obj.attrs.textAnchor = newAnchor;
        } else {
          var oldAnchor = obj.attrs.textAnchor || 'start';
          if (oldAnchor !== newAnchor) {
            var currX = obj.attrs.x || 0;
            var width = 0;
            try {
              if (obj.el) {
                var bbox = obj.el.getBBox();
                width = bbox.width;
              }
            } catch(e) {}

            if (!width || width <= 0) {
              var lines = (obj.attrs.text || '').split('\n');
              var maxLen = 0;
              lines.forEach(function(l) { if (l.length > maxLen) maxLen = l.length; });
              width = maxLen * (obj.attrs.fontSize || 20) * 0.55;
            }

            var xLeft = currX;
            if (oldAnchor === 'start') {
              xLeft = currX;
            } else if (oldAnchor === 'middle') {
              xLeft = currX - (width / 2);
            } else if (oldAnchor === 'end') {
              xLeft = currX - width;
            }

            var newX = xLeft;
            if (newAnchor === 'start') {
              newX = xLeft;
            } else if (newAnchor === 'middle') {
              newX = xLeft + (width / 2);
            } else if (newAnchor === 'end') {
              newX = xLeft + width;
            }

            obj.attrs.x = Math.round(newX);
            obj.attrs.textAnchor = newAnchor;
          }
        }
        if (window.WebpointerRender && window.WebpointerRender.updateElementAttributes) {
          window.WebpointerRender.updateElementAttributes(obj);
        }
      }
    });
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
  }

  function toggleTextLineHeight() {
    if (state.holdTriggered) {
      state.holdTriggered = false;
      return;
    }
    var cur = cfg.lineHeight || 1.2;
    var nextLH = (cur == 1.2) ? 1.5 : 1.2;
    setTextLineHeight(nextLH);
  }

  function startHoldLineHeight(e, btnEl) {
    state.holdTriggered = false;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(function() {
      state.holdTriggered = true;
      showLineHeightPopup(btnEl);
    }, 400);
  }

  function endHoldLineHeight() {
    clearTimeout(holdTimer);
  }

  function showLineHeightPopup(btnEl) {
    var old = document.getElementById('lineHeightPopupSelect');
    if (old) old.remove();

    var sel = document.createElement('select');
    sel.id = 'lineHeightPopupSelect';
    sel.style.cssText = 'position:fixed; z-index:99999; font-size:0.78rem; padding:4px; border:1px solid #0284c7; border-radius:4px; background:#ffffff; box-shadow:0 4px 12px rgba(0,0,0,0.15); outline:none;';
    var rect = btnEl.getBoundingClientRect();
    sel.style.left = rect.left + 'px';
    sel.style.top = (rect.bottom + 2) + 'px';

    var heights = [
      { v: '1', l: '1.0 (좁게)' },
      { v: '1.2', l: '1.2 (기본)' },
      { v: '1.5', l: '1.5 (보통)' },
      { v: '2', l: '2.0 (넓게)' },
      { v: '2.5', l: '2.5' },
      { v: '3', l: '3.0' }
    ];

    var cur = cfg.lineHeight || 1.2;
    sel.innerHTML = heights.map(function(h) {
      var selected = (cur == h.v) ? 'selected' : '';
      return '<option value="' + h.v + '" ' + selected + '>' + h.l + '</option>';
    }).join('');

    sel.onchange = function() {
      setTextLineHeight(sel.value);
      sel.remove();
    };

    sel.onblur = function() {
      setTimeout(function() { if (sel.parentElement) sel.remove(); }, 150);
    };

    document.body.appendChild(sel);
    sel.focus();
  }

  var holdTimer = null;

  function toggleTextBold() {
    if (state.holdTriggered) {
      state.holdTriggered = false;
      return;
    }
    var current = cfg.fontWeight || 'normal';
    var isBold = (current === 'bold' || parseInt(current, 10) >= 600);
    var nextWeight = isBold ? 'normal' : 'bold';
    setTextFontWeight(nextWeight);
  }

  function toggleTextItalic() {
    if (state.holdTriggered) {
      state.holdTriggered = false;
      return;
    }
    var current = cfg.fontStyle || 'normal';
    var isItalic = (current === 'italic' || current === 'oblique');
    var nextStyle = isItalic ? 'normal' : 'italic';
    setTextFontStyle(nextStyle);
  }

  function startHoldWeight(e, btnEl) {
    state.holdTriggered = false;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(function() {
      state.holdTriggered = true;
      showWeightSelectPopup(btnEl);
    }, 400);
  }

  function endHoldWeight() {
    clearTimeout(holdTimer);
  }

  function showWeightSelectPopup(btnEl) {
    var old = document.getElementById('weightPopupSelect');
    if (old) old.remove();

    var sel = document.createElement('select');
    sel.id = 'weightPopupSelect';
    sel.style.cssText = 'position:fixed; z-index:99999; font-size:0.78rem; padding:4px; border:1px solid #0284c7; border-radius:4px; background:#ffffff; box-shadow:0 4px 12px rgba(0,0,0,0.15); outline:none;';
    var rect = btnEl.getBoundingClientRect();
    sel.style.left = rect.left + 'px';
    sel.style.top = (rect.bottom + 2) + 'px';

    var weights = [
      { v: '100', l: '100 (Thin)' },
      { v: '200', l: '200 (Extra Light)' },
      { v: '300', l: '300 (Light)' },
      { v: '400', l: '400 (Normal)' },
      { v: '500', l: '500 (Medium)' },
      { v: '600', l: '600 (Semi Bold)' },
      { v: '700', l: '700 (Bold)' },
      { v: '800', l: '800 (Extra Bold)' },
      { v: '900', l: '900 (Black)' }
    ];

    var cur = cfg.fontWeight || '400';
    sel.innerHTML = weights.map(function(w) {
      var selected = (cur == w.v || (cur === 'bold' && w.v === '700') || (cur === 'normal' && w.v === '400')) ? 'selected' : '';
      return '<option value="' + w.v + '" ' + selected + '>' + w.l + '</option>';
    }).join('');

    sel.onchange = function() {
      setTextFontWeight(sel.value);
      sel.remove();
    };

    sel.onblur = function() {
      setTimeout(function() { if (sel.parentElement) sel.remove(); }, 150);
    };

    document.body.appendChild(sel);
    sel.focus();
  }

  function startHoldStyle(e, btnEl) {
    state.holdTriggered = false;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(function() {
      state.holdTriggered = true;
      showStyleSelectPopup(btnEl);
    }, 400);
  }

  function endHoldStyle() {
    clearTimeout(holdTimer);
  }

  function showStyleSelectPopup(btnEl) {
    var old = document.getElementById('stylePopupSelect');
    if (old) old.remove();

    var sel = document.createElement('select');
    sel.id = 'stylePopupSelect';
    sel.style.cssText = 'position:fixed; z-index:99999; font-size:0.78rem; padding:4px; border:1px solid #0284c7; border-radius:4px; background:#ffffff; box-shadow:0 4px 12px rgba(0,0,0,0.15); outline:none;';
    var rect = btnEl.getBoundingClientRect();
    sel.style.left = rect.left + 'px';
    sel.style.top = (rect.bottom + 2) + 'px';

    var styles = [
      { v: 'normal', l: 'Normal (보통)' },
      { v: 'italic', l: 'Italic (이탤릭)' },
      { v: 'oblique', l: 'Oblique (사선)' }
    ];

    var cur = cfg.fontStyle || 'normal';
    sel.innerHTML = styles.map(function(s) {
      var selected = (cur === s.v) ? 'selected' : '';
      return '<option value="' + s.v + '" ' + selected + '>' + s.l + '</option>';
    }).join('');

    sel.onchange = function() {
      setTextFontStyle(sel.value);
      sel.remove();
    };

    sel.onblur = function() {
      setTimeout(function() { if (sel.parentElement) sel.remove(); }, 150);
    };

    document.body.appendChild(sel);
    sel.focus();
  }

  async function fetchLocalSystemFonts() {
    if ('queryLocalFonts' in window) {
      try {
        var availableFonts = await window.queryLocalFonts();
        var fontSet = new Set(cfg.systemFonts || []);
        availableFonts.forEach(function(f) {
          if (f.family) fontSet.add(f.family);
        });
        var sorted = Array.from(fontSet).sort();
        if (sorted.length !== (cfg.systemFonts ? cfg.systemFonts.length : 0)) {
          cfg.systemFonts = sorted;
          if (window.WebpointerRender && window.WebpointerRender.renderRibbon) {
            window.WebpointerRender.renderRibbon();
          }
        }
      } catch (err) {
        console.warn('Local font query error/denied:', err);
      }
    }
  }

  window.switchTab = switchTab;
  window.applyImportedPalette = importPaletteFromText;
  window.applyPaletteColor = applyPaletteColor;
  window.setActiveColorTarget = setActiveColorTarget;
  window.setActiveTextColorTarget = setActiveTextColorTarget;
  window.setTextFontFamily = setTextFontFamily;
  window.setTextFontSize = setTextFontSize;
  window.setTextFontWeight = setTextFontWeight;
  window.setTextFontStyle = setTextFontStyle;
  window.setTextLineHeight = setTextLineHeight;
  window.toggleTextStrikethrough = toggleTextStrikethrough;
  window.setTextAnchor = setTextAnchor;
  window.toggleTextLineHeight = toggleTextLineHeight;
  window.startHoldLineHeight = startHoldLineHeight;
  window.endHoldLineHeight = endHoldLineHeight;
  window.fetchLocalSystemFonts = fetchLocalSystemFonts;
  window.toggleTextBold = toggleTextBold;
  window.toggleTextItalic = toggleTextItalic;
  window.startHoldWeight = startHoldWeight;
  window.endHoldWeight = endHoldWeight;
  window.startHoldStyle = startHoldStyle;
  window.endHoldStyle = endHoldStyle;
  window.setTool = setTool;
  window.setStrokeColor = setStrokeColor;
  window.setFillColor = setFillColor;
  window.setStrokeWidth = setStrokeWidth;
  window.setStrokeDashStyle = setStrokeDashStyle;
  window.toggleStrokeDashStyle = toggleStrokeDashStyle;
  window.startHoldDashArray = startHoldDashArray;
  window.endHoldDashArray = endHoldDashArray;
  window.setStrokeDashArray = setStrokeDashArray;
  window.setStrokeCap = setStrokeCap;
  window.setStrokeJoin = setStrokeJoin;
  window.setStartMarker = setStartMarker;
  window.setEndMarker = setEndMarker;
  window.adjustStrokeWidth = adjustStrokeWidth;
  window.setStartMarkerFillStyle = setStartMarkerFillStyle;
  window.toggleStartMarkerFillStyle = toggleStartMarkerFillStyle;
  window.setEndMarkerFillStyle = setEndMarkerFillStyle;
  window.toggleEndMarkerFillStyle = toggleEndMarkerFillStyle;
  window.scaleMarker = scaleMarker;
  window.toggleCategoryCollapse = toggleCategoryCollapse;
  window.toggleColorPalettePopover = toggleColorPalettePopover;
  window.selectColorFromPopover = selectColorFromPopover;
  window.openPaletteModal = openPaletteModal;
  window.closePaletteModal = closePaletteModal;
  window.importPaletteFromText = importPaletteFromText;
  window.applyStyleToSelected = applyStyleToSelected;
  window.setTextStrokeWidth = setTextStrokeWidth;
  window.toggleTextWritingMode = toggleTextWritingMode;
  window.setTextVerticalAlign = setTextVerticalAlign;
  window.setElementOpacity = setElementOpacity;
  window.setAlphaStepCount = setAlphaStepCount;
  window.startHoldAlphaInput = function() {};
  window.endHoldAlphaInput = function() {};
  function toggleGridSnap(enabled) {
    cfg.gridSnapEnabled = !!enabled;
    if (window.WebpointerRenderCanvas && window.WebpointerRenderCanvas.renderGrid) {
      window.WebpointerRenderCanvas.renderGrid();
    }
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) {
      window.WebpointerRender.renderRibbon();
    }
  }

  function setGridDensity(val) {
    cfg.gridDensity = val;
    if (window.WebpointerRenderCanvas && window.WebpointerRenderCanvas.renderGrid) {
      window.WebpointerRenderCanvas.renderGrid();
    }
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) {
      window.WebpointerRender.renderRibbon();
    }
  }

  function setProximityThreshold(val) {
    var num = parseInt(val, 10);
    cfg.proximityThreshold = isNaN(num) ? 30 : num;
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) {
      window.WebpointerRender.renderRibbon();
    }
  }

  function setDefaultShapeSize(val) {
    var num = parseInt(val, 10);
    cfg.defaultShapeSize = isNaN(num) ? 100 : num;
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) {
      window.WebpointerRender.renderRibbon();
    }
  }

  function setCanvasRatio(val) {
    cfg.canvasRatio = val;
    var mainSvg = document.getElementById('mainSvg');
    if (mainSvg) {
      var parts = val.split('x');
      if (parts.length === 2) {
        var w = parseInt(parts[0], 10);
        var h = parseInt(parts[1], 10);
        if (!isNaN(w) && !isNaN(h)) {
          cfg.SVG_WIDTH = w;
          cfg.SVG_HEIGHT = h;
          mainSvg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
        }
      }
    }
    if (window.WebpointerRenderCanvas && window.WebpointerRenderCanvas.renderGrid) {
      window.WebpointerRenderCanvas.renderGrid();
    }
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) {
      window.WebpointerRender.renderRibbon();
    }
  }

  function setCanvasBgColor(val) {
    cfg.canvasBgColor = val;
    var mainSvg = document.getElementById('mainSvg');
    if (mainSvg) {
      mainSvg.style.backgroundColor = val;
    }
    if (window.WebpointerRender && window.WebpointerRender.renderRibbon) {
      window.WebpointerRender.renderRibbon();
    }
  }

  window.toggleGridSnap = toggleGridSnap;
  window.setGridDensity = setGridDensity;
  window.setGridStepSize = setGridStepSize;
  window.setProximityThreshold = setProximityThreshold;
  window.setDefaultShapeSize = setDefaultShapeSize;
  window.setCanvasRatio = setCanvasRatio;
  window.setCanvasBgColor = setCanvasBgColor;

  window.setTextUnderlineStyle = setTextUnderlineStyle;
  window.setTextUnderlineOffset = setTextUnderlineOffset;
  window.setTextUnderlineWidth = setTextUnderlineWidth;
  window.cycleTextVerticalAlign = cycleTextVerticalAlign;
  window.cycleTextHorizontalAlign = cycleTextHorizontalAlign;
  window.setTextAutoFitMode = setTextAutoFitMode;
  window.cycleTextAutoFitMode = cycleTextAutoFitMode;
  window.applyAutoFitToGroup = applyAutoFitToGroup;

  window.WebpointerHandlers = {
    setTool: setTool,
    toggleColorPalettePopover: toggleColorPalettePopover,
    selectColorFromPopover: selectColorFromPopover,
    applyStyleToSelected: applyStyleToSelected,
    setStrokeColor: setStrokeColor,
    setFillColor: setFillColor,
    setStrokeWidth: setStrokeWidth,
    adjustStrokeWidth: adjustStrokeWidth,
    setStrokeDashStyle: setStrokeDashStyle,
    toggleStrokeDashStyle: toggleStrokeDashStyle,
    startHoldDashArray: startHoldDashArray,
    endHoldDashArray: endHoldDashArray,
    setStrokeDashArray: setStrokeDashArray,
    setStrokeCap: setStrokeCap,
    setStrokeJoin: setStrokeJoin,
    setStartMarker: setStartMarker,
    setEndMarker: setEndMarker,
    setStartMarkerFillStyle: setStartMarkerFillStyle,
    toggleStartMarkerFillStyle: toggleStartMarkerFillStyle,
    setEndMarkerFillStyle: setEndMarkerFillStyle,
    toggleEndMarkerFillStyle: toggleEndMarkerFillStyle,
    scaleMarker: scaleMarker,
    toggleCategoryCollapse: toggleCategoryCollapse,
    openPaletteModal: openPaletteModal,
    closePaletteModal: closePaletteModal,
    importPaletteFromText: importPaletteFromText,
    applyPaletteColor: applyPaletteColor,
    setActiveColorTarget: setActiveColorTarget,
    setActiveTextColorTarget: setActiveTextColorTarget,
    setTextFontFamily: setTextFontFamily,
    setTextFontSize: setTextFontSize,
    setTextFontWeight: setTextFontWeight,
    setTextFontStyle: setTextFontStyle,
    setTextLineHeight: setTextLineHeight,
    toggleTextStrikethrough: toggleTextStrikethrough,
    setTextAnchor: setTextAnchor,
    toggleTextLineHeight: toggleTextLineHeight,
    startHoldLineHeight: startHoldLineHeight,
    endHoldLineHeight: endHoldLineHeight,
    fetchLocalSystemFonts: fetchLocalSystemFonts,
    toggleTextBold: toggleTextBold,
    toggleTextItalic: toggleTextItalic,
    startHoldWeight: startHoldWeight,
    endHoldWeight: endHoldWeight,
    startHoldStyle: startHoldStyle,
    endHoldStyle: endHoldStyle
  };
})(window);
