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
    popover.style.cssText = 'position:fixed; z-index:99999; padding:8px; border:1px solid #0284c7; border-radius:8px; background:#ffffff; box-shadow:0 8px 24px rgba(0,0,0,0.2); outline:none; font-family:sans-serif; width:250px;';

    var rect = btnEl.getBoundingClientRect();
    popover.style.left = Math.max(10, Math.min(window.innerWidth - 260, rect.left)) + 'px';
    popover.style.top = (rect.bottom + 4) + 'px';

    var isFillMode = (targetMode === 'fill' || targetMode === 'text_fill');

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

    var finalHtml = '';

    if (isFillMode) {
      var tabsHeader =
        '<div style="display:flex; gap:2px; margin-bottom:8px; border-bottom:1px solid #cbd5e1; padding-bottom:4px; font-size:0.75rem;">' +
          '<button class="pop-tab" style="flex:1; padding:3px; background:#0284c7; color:#ffffff; font-weight:700; border:none; border-radius:4px; cursor:pointer;" onclick="switchPopoverTab(this, \'swatch\')">단색</button>' +
          '<button class="pop-tab" style="flex:1; padding:3px; background:#f1f5f9; color:#475569; font-weight:500; border:none; border-radius:4px; cursor:pointer;" onclick="switchPopoverTab(this, \'gradient\')">그라디언트</button>' +
          '<button class="pop-tab" style="flex:1; padding:3px; background:#f1f5f9; color:#475569; font-weight:500; border:none; border-radius:4px; cursor:pointer;" onclick="switchPopoverTab(this, \'pattern\')">패턴</button>' +
          '<button class="pop-tab" style="flex:1; padding:3px; background:#f1f5f9; color:#475569; font-weight:500; border:none; border-radius:4px; cursor:pointer;" onclick="switchPopoverTab(this, \'image\')">그림</button>' +
        '</div>';

      var swatchTab = '<div class="pop-tab-content" data-tab="swatch" style="display:flex; flex-direction:column;">' + swatchGridHtml + '</div>';

      var gradTab =
        '<div class="pop-tab-content" data-tab="gradient" style="display:none; flex-direction:column; gap:6px; font-size:0.78rem; color:#334155;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center;">' +
            '<span>유형:</span>' +
            '<select id="popGradType" style="padding:2px; font-size:0.75rem;"><option value="linear">직선 (Linear)</option><option value="radial">원형 (Radial)</option></select>' +
          '</div>' +
          '<div style="display:flex; justify-content:space-between; align-items:center;">' +
            '<span>시작/끝 색상:</span>' +
            '<div style="display:flex; gap:4px;"><input type="color" id="popGradStart" value="#38bdf8"><input type="color" id="popGradEnd" value="#0369a1"></div>' +
          '</div>' +
          '<div style="display:flex; justify-content:space-between; align-items:center;">' +
            '<span>각도:</span>' +
            '<input type="number" id="popGradAngle" value="90" style="width:55px; padding:2px; font-size:0.75rem; text-align:center;">' +
          '</div>' +
          '<button onclick="applyGradientFromPopover(\'' + targetMode + '\')" style="margin-top:4px; padding:4px; background:#0284c7; color:#fff; border:none; border-radius:4px; font-size:0.78rem; font-weight:600; cursor:pointer;">그라디언트 적용</button>' +
        '</div>';

      var patTab =
        '<div class="pop-tab-content" data-tab="pattern" style="display:none; flex-direction:column; gap:6px; font-size:0.78rem; color:#334155;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center;">' +
            '<span>패턴 종류:</span>' +
            '<select id="popPatType" style="padding:2px; font-size:0.75rem;"><option value="dots">점 (Dots)</option><option value="grid">격자 (Grid)</option><option value="diagonal">사선 (Diagonal)</option><option value="stripes">줄무늬 (Stripes)</option></select>' +
          '</div>' +
          '<div style="display:flex; justify-content:space-between; align-items:center;">' +
            '<span>패턴 색상:</span>' +
            '<input type="color" id="popPatColor" value="#0284c7">' +
          '</div>' +
          '<div style="display:flex; justify-content:space-between; align-items:center;">' +
            '<span>크기 (px):</span>' +
            '<input type="number" id="popPatSize" value="16" style="width:55px; padding:2px; font-size:0.75rem; text-align:center;">' +
          '</div>' +
          '<button onclick="applyPatternFromPopover(\'' + targetMode + '\')" style="margin-top:4px; padding:4px; background:#0284c7; color:#fff; border:none; border-radius:4px; font-size:0.78rem; font-weight:600; cursor:pointer;">패턴 적용</button>' +
        '</div>';

      var symbols = cfg.symbolRegistry || [];
      var symbolOptionsHtml = '<option value="">심볼 선택 (선택사항)</option>';
      for (var s = 0; s < symbols.length; s++) {
        symbolOptionsHtml += '<option value="' + symbols[s].id + '">' + symbols[s].name + '</option>';
      }

      var imgTab =
        '<div class="pop-tab-content" data-tab="image" style="display:none; flex-direction:column; gap:6px; font-size:0.78rem; color:#334155;">' +
          '<span>등록된 심볼 사용:</span>' +
          '<select id="popImgSymbolSelect" style="width:100%; padding:2px; font-size:0.75rem;">' + symbolOptionsHtml + '</select>' +
          '<span>또는 이미지 파일 업로드:</span>' +
          '<input type="file" id="popImgFileInput" accept="image/*" style="font-size:0.72rem;">' +
          '<button onclick="applyImageFillFromPopover(\'' + targetMode + '\')" style="margin-top:4px; padding:4px; background:#0284c7; color:#fff; border:none; border-radius:4px; font-size:0.78rem; font-weight:600; cursor:pointer;">그림 채우기 적용</button>' +
        '</div>';

      finalHtml = tabsHeader + swatchTab + gradTab + patTab + imgTab;
    } else {
      finalHtml = swatchGridHtml;
    }

    popover.innerHTML = finalHtml;
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
  window.switchTab = switchTab;

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

  // =========================================================================
  // History Manager (Undo / Redo with Ctrl+Z & Ctrl+Y)
  // =========================================================================
  var undoStack = [];
  var redoStack = [];
  var isRestoringHistory = false;

  function captureSnapshot() {
    var objs = [];
    cfg.objectsMap.forEach(function(obj) {
      objs.push({
        id: obj.id,
        type: obj.type,
        attrs: JSON.parse(JSON.stringify(obj.attrs))
      });
    });
    return JSON.stringify({
      canvas: {
        width: cfg.SVG_WIDTH || 960,
        height: cfg.SVG_HEIGHT || 540,
        bgColor: cfg.canvasBgColor || '#ffffff',
        gridSnapEnabled: !!cfg.gridSnapEnabled,
        gridStepSize: cfg.gridStepSize || 24
      },
      objects: objs
    });
  }

  function pushHistoryState() {
    if (isRestoringHistory) return;
    var snap = captureSnapshot();
    if (undoStack.length > 0 && undoStack[undoStack.length - 1] === snap) return;
    undoStack.push(snap);
    if (undoStack.length > 50) undoStack.shift();
    redoStack = [];
  }

  function restoreSnapshot(jsonStr) {
    if (!jsonStr) return;
    isRestoringHistory = true;
    try {
      var data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
      if (data.canvas) {
        cfg.SVG_WIDTH = data.canvas.width || 960;
        cfg.SVG_HEIGHT = data.canvas.height || 540;
        cfg.canvasBgColor = data.canvas.bgColor || '#ffffff';
        cfg.gridSnapEnabled = !!data.canvas.gridSnapEnabled;
        cfg.gridStepSize = data.canvas.gridStepSize || 24;

        var mainSvg = document.getElementById('mainSvg');
        if (mainSvg) {
          mainSvg.setAttribute('viewBox', '0 0 ' + cfg.SVG_WIDTH + ' ' + cfg.SVG_HEIGHT);
          mainSvg.style.backgroundColor = cfg.canvasBgColor;
        }
      }

      cfg.objectsMap.forEach(function(obj) {
        if (obj.el && obj.el.parentNode) {
          obj.el.parentNode.removeChild(obj.el);
        }
        if (obj.underlineEl && obj.underlineEl.parentNode) {
          obj.underlineEl.parentNode.removeChild(obj.underlineEl);
        }
      });
      cfg.objectsMap.clear();
      cfg.selectedIds.clear();

      var objectsGroup = document.getElementById('objectsGroup');
      if (objectsGroup) {
        var orphans = objectsGroup.querySelectorAll('.custom-text-underline');
        orphans.forEach(function(el) {
          if (el.parentNode) el.parentNode.removeChild(el);
        });
      }
      if (data.objects && Array.isArray(data.objects)) {
        var maxIdNum = 0;
        data.objects.forEach(function(oData) {
          if (!oData || !oData.type) return;
          var idNum = parseInt((oData.id || '').replace('obj_', ''), 10);
          if (!isNaN(idNum) && idNum > maxIdNum) maxIdNum = idNum;

          var tag = 'rect';
          if (oData.type === 'point' || oData.type === 'circle') tag = 'circle';
          else if (oData.type === 'line') tag = 'line';
          else if (oData.type === 'ellipse') tag = 'ellipse';
          else if (oData.type === 'arc' || oData.type === 'bez2' || oData.type === 'bez3') tag = 'path';
          else if (oData.type === 'text') tag = 'text';

          var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
          el.setAttribute('id', oData.id);
          if (objectsGroup) objectsGroup.appendChild(el);

          var newObj = {
            id: oData.id,
            type: oData.type,
            el: el,
            attrs: oData.attrs || {}
          };
          cfg.objectsMap.set(oData.id, newObj);
          if (window.WebpointerRenderCanvas && window.WebpointerRenderCanvas.updateElementAttributes) {
            window.WebpointerRenderCanvas.updateElementAttributes(newObj);
          }
        });
        if (maxIdNum > 0) cfg.nextId = maxIdNum + 1;
      }

      if (window.WebpointerRenderCanvas && window.WebpointerRenderCanvas.renderUI) {
        window.WebpointerRenderCanvas.renderUI();
      }
      if (window.WebpointerRenderCanvas && window.WebpointerRenderCanvas.renderGrid) {
        window.WebpointerRenderCanvas.renderGrid();
      }
      if (window.WebpointerRender && window.WebpointerRender.renderRibbon) {
        window.WebpointerRender.renderRibbon();
      }
    } catch(e) {
      console.error('[Webpointer] Error restoring state:', e);
    }
    isRestoringHistory = false;
  }

  function undo() {
    if (undoStack.length <= 1) return;
    var currentSnap = undoStack.pop();
    redoStack.push(currentSnap);
    var prevSnap = undoStack[undoStack.length - 1];
    restoreSnapshot(prevSnap);
  }

  function redo() {
    if (redoStack.length === 0) return;
    var nextSnap = redoStack.pop();
    undoStack.push(nextSnap);
    restoreSnapshot(nextSnap);
  }

  window.addEventListener('keydown', function(e) {
    var isCtrl = e.ctrlKey || e.metaKey;
    if (!isCtrl) return;
    var activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

    if (e.key === 'z' || e.key === 'Z') {
      if (e.shiftKey) {
        e.preventDefault();
        redo();
      } else {
        e.preventDefault();
        undo();
      }
    } else if (e.key === 'y' || e.key === 'Y') {
      e.preventDefault();
      redo();
    }
  });

  // Initial snapshot after load
  setTimeout(function() {
    if (undoStack.length === 0) {
      pushHistoryState();
    }
  }, 300);

  // =========================================================================
  // File Operations (불러오기, 저장하기(웹에 저장), 다운로드)
  // =========================================================================
  function openFile() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.webpointer,.svg';
    input.onchange = function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        var content = ev.target.result;
        try {
          if (file.name.toLowerCase().endsWith('.svg')) {
            pushHistoryState();
            if (window.WebpointerSVGImporter) {
              window.WebpointerSVGImporter.importSVGContent(content);
            }
            pushHistoryState();
            alert('SVG 벡터 객체를 성공적으로 불러왔습니다!');
          } else {
            pushHistoryState();
            restoreSnapshot(content);
            pushHistoryState();
            alert('파일을 성공적으로 불러왔습니다!');
          }
        } catch(err) {
          alert('파일을 읽는 중 오류가 발생했습니다: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function saveFileToWeb() {
    try {
      var snap = captureSnapshot();
      localStorage.setItem('webpointer_saved_doc', snap);
      alert('웹(LocalStorage)에 성공적으로 저장되었습니다!');
    } catch(e) {
      alert('웹 저장 실패: ' + e.message);
    }
  }

  function downloadFile() {
    var pop = document.createElement('div');
    pop.style.cssText = 'position:fixed; z-index:99999; padding:12px; border:1px solid #0284c7; border-radius:8px; background:#ffffff; box-shadow:0 8px 24px rgba(0,0,0,0.2); outline:none; font-family:sans-serif; display:flex; flex-direction:column; gap:8px; width:220px; top:50%; left:50%; transform:translate(-50%, -50%);';
    pop.innerHTML =
      '<div style="font-size:0.9rem; font-weight:700; color:#0f172a; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">파일 다운로드 선택</div>' +
      '<button id="dlJsonBtn" style="padding:6px 10px; font-size:0.82rem; font-weight:600; background:#0284c7; color:#ffffff; border:none; border-radius:4px; cursor:pointer;">프로젝트 저장 (.json)</button>' +
      '<button id="dlSvgBtn" style="padding:6px 10px; font-size:0.82rem; font-weight:600; background:#059669; color:#ffffff; border:none; border-radius:4px; cursor:pointer;">SVG 벡터 이미지 (.svg)</button>' +
      '<button id="dlCancelBtn" style="padding:4px 8px; font-size:0.78rem; background:#cbd5e1; color:#0f172a; border:none; border-radius:4px; cursor:pointer; margin-top:4px;">취소</button>';

    document.body.appendChild(pop);

    function closePop() {
      if (pop && pop.parentNode) pop.parentNode.removeChild(pop);
    }

    document.getElementById('dlJsonBtn').onclick = function() {
      closePop();
      var snap = captureSnapshot();
      var blob = new Blob([snap], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'webpointer_project_' + Date.now() + '.json';
      a.click();
      URL.revokeObjectURL(url);
    };

    document.getElementById('dlSvgBtn').onclick = function() {
      closePop();
      var mainSvg = document.getElementById('mainSvg');
      if (!mainSvg) return;
      var clone = mainSvg.cloneNode(true);
      var uiG = clone.querySelector('#uiGroup');
      if (uiG) uiG.parentNode.removeChild(uiG);
      var serializer = new XMLSerializer();
      var svgStr = '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(clone);
      var blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'webpointer_drawing_' + Date.now() + '.svg';
      a.click();
      URL.revokeObjectURL(url);
    };

    document.getElementById('dlCancelBtn').onclick = closePop;
  }

  function openShortcutModal() {
    var modal = document.getElementById('shortcutModal');
    if (modal) modal.classList.add('show');
  }

  function closeShortcutModal() {
    var modal = document.getElementById('shortcutModal');
    if (modal) modal.classList.remove('show');
  }

  function openDetailedSettingsModal() {
    var modal = document.getElementById('detailedSettingsModal');
    if (modal) {
      var proxInput = document.getElementById('settingProximityThreshold');
      var sizeInput = document.getElementById('settingDefaultShapeSize');
      var stepInput = document.getElementById('settingAlphaStepCount');
      if (proxInput) proxInput.value = cfg.proximityThreshold !== undefined ? cfg.proximityThreshold : 12;
      if (sizeInput) sizeInput.value = cfg.defaultShapeSize || 100;
      if (stepInput) stepInput.value = cfg.alphaStepCount || 5;
      modal.classList.add('show');
    }
  }

  function closeDetailedSettingsModal() {
    var modal = document.getElementById('detailedSettingsModal');
    if (modal) modal.classList.remove('show');
  }

  function applyDetailedSettings() {
    var proxInput = document.getElementById('settingProximityThreshold');
    var sizeInput = document.getElementById('settingDefaultShapeSize');
    var stepInput = document.getElementById('settingAlphaStepCount');
    if (proxInput && proxInput.value !== '') setProximityThreshold(proxInput.value);
    if (sizeInput && sizeInput.value !== '') setDefaultShapeSize(sizeInput.value);
    if (stepInput && stepInput.value !== '') setAlphaStepCount(stepInput.value);
    closeDetailedSettingsModal();
  }

  window.openShortcutModal = openShortcutModal;
  window.closeShortcutModal = closeShortcutModal;
  window.openDetailedSettingsModal = openDetailedSettingsModal;
  window.closeDetailedSettingsModal = closeDetailedSettingsModal;
  window.applyDetailedSettings = applyDetailedSettings;

  window.pushHistoryState = pushHistoryState;
  window.undo = undo;
  window.redo = redo;
  window.openFile = openFile;
  window.saveFileToWeb = saveFileToWeb;
  window.downloadFile = downloadFile;

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

  function toggleCropMode() {
    state.isCropModeActive = !state.isCropModeActive;
    if (window.WebpointerRender) {
      if (window.WebpointerRender.renderUI) window.WebpointerRender.renderUI();
      if (window.WebpointerRender.renderRibbon) window.WebpointerRender.renderRibbon();
    }
  }
  window.toggleCropMode = toggleCropMode;

  function renderSymbolList() {
    var container = document.getElementById('symbolListContainer');
    if (!container) return;
    var symbols = cfg.symbolRegistry || [];
    if (symbols.length === 0) {
      container.innerHTML = '<div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 0.85rem;">등록된 심볼이 없습니다.<br>"불러오기" 버튼으로 이미지/SVG 심볼을 추가하세요.</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < symbols.length; i++) {
      var sym = symbols[i];
      html +=
        '<div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px;">' +
          '<div style="display: flex; align-items: center; gap: 10px;">' +
            '<img src="' + (sym.thumb || sym.data) + '" style="width: 48px; height: 48px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 4px; background: #ffffff;">' +
            '<div style="display: flex; flex-direction: column;">' +
              '<span style="font-weight: 600; font-size: 0.88rem; color: #0f172a;">' + sym.name + '</span>' +
              '<span style="font-size: 0.72rem; color: #64748b;">ID: ' + sym.id + ' (' + sym.type.toUpperCase() + ')</span>' +
            '</div>' +
          '</div>' +
          '<button onclick="deleteSymbol(\'' + sym.id + '\')" style="background: #ef4444; color: #ffffff; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">삭제</button>' +
        '</div>';
    }
    container.innerHTML = html;
  }

  function openSymbolManagerModal() {
    var modal = document.getElementById('symbolManagerModal');
    if (modal) {
      modal.classList.add('show');
      renderSymbolList();
    }
  }

  function closeSymbolManagerModal() {
    var modal = document.getElementById('symbolManagerModal');
    if (modal) modal.classList.remove('show');
  }

  function importSymbolFromFile() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.svg,.png,.jpg,.jpeg';
    input.onchange = function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        var content = ev.target.result;
        var symName = file.name.replace(/\.[^/.]+$/, "");
        var symId = 'sym_' + Date.now();
        var isSvg = file.name.toLowerCase().endsWith('.svg');

        var newSym = {
          id: symId,
          name: symName,
          type: isSvg ? 'svg' : 'image',
          thumb: isSvg ? 'data:image/svg+xml;utf8,' + encodeURIComponent(content) : content,
          data: content
        };

        cfg.symbolRegistry.push(newSym);
        localStorage.setItem('webpointer_symbols', JSON.stringify(cfg.symbolRegistry));
        renderSymbolList();
      };
      if (file.name.toLowerCase().endsWith('.svg')) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }

  function deleteSymbol(symId) {
    cfg.symbolRegistry = cfg.symbolRegistry.filter(function(s) { return s.id !== symId; });
    localStorage.setItem('webpointer_symbols', JSON.stringify(cfg.symbolRegistry));
    renderSymbolList();
  }

  function ensureSvgDefs() {
    var mainSvg = document.getElementById('mainSvg');
    if (!mainSvg) return null;
    var defs = mainSvg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.setAttribute('id', 'svgDefs');
      mainSvg.insertBefore(defs, mainSvg.firstChild);
    }
    return defs;
  }

  function createLinearGradient(color1, color2, angleDeg) {
    var defs = ensureSvgDefs();
    if (!defs) return 'none';
    var id = 'grad_lin_' + Date.now();
    var rad = ((angleDeg || 90) * Math.PI) / 180;
    var x1 = Math.round(50 - Math.cos(rad) * 50) + '%';
    var y1 = Math.round(50 - Math.sin(rad) * 50) + '%';
    var x2 = Math.round(50 + Math.cos(rad) * 50) + '%';
    var y2 = Math.round(50 + Math.sin(rad) * 50) + '%';

    var grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    grad.setAttribute('id', id);
    grad.setAttribute('x1', x1);
    grad.setAttribute('y1', y1);
    grad.setAttribute('x2', x2);
    grad.setAttribute('y2', y2);

    var stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', color1);

    var stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', color2);

    grad.appendChild(stop1);
    grad.appendChild(stop2);
    defs.appendChild(grad);

    return 'url(#' + id + ')';
  }

  function createRadialGradient(color1, color2) {
    var defs = ensureSvgDefs();
    if (!defs) return 'none';
    var id = 'grad_rad_' + Date.now();

    var grad = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
    grad.setAttribute('id', id);
    grad.setAttribute('cx', '50%');
    grad.setAttribute('cy', '50%');
    grad.setAttribute('r', '50%');

    var stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', color1);

    var stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', color2);

    grad.appendChild(stop1);
    grad.appendChild(stop2);
    defs.appendChild(grad);

    return 'url(#' + id + ')';
  }

  function createPatternFill(type, color, size) {
    var defs = ensureSvgDefs();
    if (!defs) return 'none';
    var id = 'pat_' + type + '_' + Date.now();
    var pSize = parseInt(size, 10) || 16;

    var pat = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    pat.setAttribute('id', id);
    pat.setAttribute('width', pSize);
    pat.setAttribute('height', pSize);
    pat.setAttribute('patternUnits', 'userSpaceOnUse');

    if (type === 'dots') {
      var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', pSize / 2);
      circle.setAttribute('cy', pSize / 2);
      circle.setAttribute('r', Math.max(1, pSize / 4));
      circle.setAttribute('fill', color || '#0ea5e9');
      pat.appendChild(circle);
    } else if (type === 'grid') {
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M ' + pSize + ' 0 L 0 0 0 ' + pSize);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', color || '#0ea5e9');
      path.setAttribute('stroke-width', '1.5');
      pat.appendChild(path);
    } else if (type === 'diagonal') {
      var pathD = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathD.setAttribute('d', 'M 0 ' + pSize + ' L ' + pSize + ' 0 M -' + (pSize/4) + ' ' + (pSize/4) + ' L ' + (pSize/4) + ' -' + (pSize/4) + ' M ' + (pSize*3/4) + ' ' + (pSize*5/4) + ' L ' + (pSize*5/4) + ' ' + (pSize*3/4));
      pathD.setAttribute('fill', 'none');
      pathD.setAttribute('stroke', color || '#0ea5e9');
      pathD.setAttribute('stroke-width', '1.5');
      pat.appendChild(pathD);
    } else if (type === 'stripes') {
      var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '0');
      rect.setAttribute('y', '0');
      rect.setAttribute('width', pSize / 2);
      rect.setAttribute('height', pSize);
      rect.setAttribute('fill', color || '#0ea5e9');
      pat.appendChild(rect);
    }

    defs.appendChild(pat);
    return 'url(#' + id + ')';
  }

  function createImageFill(imgUrl, width, height) {
    var defs = ensureSvgDefs();
    if (!defs) return 'none';
    var id = 'imgpat_' + Date.now();
    var w = width || 60;
    var h = height || 60;

    var pat = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    pat.setAttribute('id', id);
    pat.setAttribute('width', w);
    pat.setAttribute('height', h);
    pat.setAttribute('patternUnits', 'userSpaceOnUse');

    var img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    img.setAttribute('href', imgUrl);
    img.setAttribute('width', w);
    img.setAttribute('height', h);
    img.setAttribute('preserveAspectRatio', 'xMidYMid slice');

    pat.appendChild(img);
    defs.appendChild(pat);
    return 'url(#' + id + ')';
  }

  function switchPopoverTab(tabBtn, tabName) {
    var popover = document.getElementById('colorPalettePopover');
    if (!popover) return;
    popover.querySelectorAll('.pop-tab').forEach(function(b) {
      b.style.background = '#f1f5f9';
      b.style.color = '#475569';
      b.style.fontWeight = '500';
    });
    tabBtn.style.background = '#0284c7';
    tabBtn.style.color = '#ffffff';
    tabBtn.style.fontWeight = '700';

    popover.querySelectorAll('.pop-tab-content').forEach(function(c) {
      c.style.display = 'none';
    });
    var target = popover.querySelector('.pop-tab-content[data-tab="' + tabName + '"]');
    if (target) target.style.display = 'flex';
  }

  function applyGradientFromPopover(targetMode) {
    var startCol = document.getElementById('popGradStart') ? document.getElementById('popGradStart').value : '#38bdf8';
    var endCol = document.getElementById('popGradEnd') ? document.getElementById('popGradEnd').value : '#0369a1';
    var type = document.getElementById('popGradType') ? document.getElementById('popGradType').value : 'linear';
    var angle = document.getElementById('popGradAngle') ? parseInt(document.getElementById('popGradAngle').value, 10) : 90;

    var fillUrl = (type === 'radial') ? createRadialGradient(startCol, endCol) : createLinearGradient(startCol, endCol, angle);
    selectColorFromPopover(targetMode, fillUrl);
  }

  function applyPatternFromPopover(targetMode) {
    var type = document.getElementById('popPatType') ? document.getElementById('popPatType').value : 'dots';
    var col = document.getElementById('popPatColor') ? document.getElementById('popPatColor').value : '#0284c7';
    var size = document.getElementById('popPatSize') ? parseInt(document.getElementById('popPatSize').value, 10) : 16;

    var fillUrl = createPatternFill(type, col, size);
    selectColorFromPopover(targetMode, fillUrl);
  }

  function applyImageFillFromPopover(targetMode) {
    var select = document.getElementById('popImgSymbolSelect');
    var fileInput = document.getElementById('popImgFileInput');

    if (fileInput && fileInput.files && fileInput.files[0]) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var fillUrl = createImageFill(e.target.result);
        selectColorFromPopover(targetMode, fillUrl);
      };
      reader.readAsDataURL(fileInput.files[0]);
    } else if (select && select.value) {
      var symId = select.value;
      var sym = (cfg.symbolRegistry || []).find(function(s) { return s.id === symId; });
      if (sym) {
        var fillUrl = createImageFill(sym.data || sym.thumb);
        selectColorFromPopover(targetMode, fillUrl);
      }
    }
  }

  function openFilterPopover(btnEl) {
    var old = document.getElementById('filterEffectPopover');
    if (old) {
      old.remove();
      return;
    }

    var popover = document.createElement('div');
    popover.id = 'filterEffectPopover';
    popover.style.cssText = 'position:fixed; z-index:99999; padding:10px; border:1px solid #0284c7; border-radius:8px; background:#ffffff; box-shadow:0 8px 24px rgba(0,0,0,0.2); outline:none; font-family:sans-serif; width:260px; display:flex; flex-direction:column; gap:8px;';

    var rect = btnEl.getBoundingClientRect();
    popover.style.left = Math.max(10, Math.min(window.innerWidth - 275, rect.left)) + 'px';
    popover.style.top = (rect.bottom + 4) + 'px';

    var html =
      '<div style="font-size:0.82rem; font-weight:700; color:#0f172a; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">🪄 필터 효과 설정 (중복 가능)</div>' +
      '<div style="display:flex; justify-content:space-between; align-items:center; font-size:0.78rem;">' +
        '<span>필터 종류:</span>' +
        '<select id="popFilterType" style="padding:3px; font-size:0.75rem;" onchange="updateFilterRangeConfig()">' +
          '<option value="blur">블러 (blur)</option>' +
          '<option value="brightness">밝기 (brightness)</option>' +
          '<option value="contrast">대비 (contrast)</option>' +
          '<option value="drop-shadow">그림자 (drop-shadow)</option>' +
          '<option value="grayscale">흑백 (grayscale)</option>' +
          '<option value="hue-rotate">색상 회전 (hue-rotate)</option>' +
          '<option value="invert">반전 (invert)</option>' +
          '<option value="opacity">불투명도 (opacity)</option>' +
          '<option value="saturate">채도 (saturate)</option>' +
          '<option value="sepia">세피아 (sepia)</option>' +
        '</select>' +
      '</div>' +
      '<div style="display:flex; flex-direction:column; gap:2px; font-size:0.75rem;">' +
        '<div style="display:flex; justify-content:space-between;">' +
          '<span>계수 범위:</span>' +
          '<span id="popFilterValDisp" style="font-weight:700; color:#0284c7;">3px</span>' +
        '</div>' +
        '<input type="range" id="popFilterRange" min="0" max="30" value="3" step="1" oninput="document.getElementById(\'popFilterValDisp\').innerText = this.value + (window.filterUnit || \'px\')">' +
      '</div>' +
      '<div style="display:flex; gap:6px;">' +
        '<button onclick="addFilterFromPopover()" style="flex:1; padding:4px; background:#0284c7; color:#fff; border:none; border-radius:4px; font-size:0.75rem; font-weight:600; cursor:pointer;">➕ 필터 추가</button>' +
        '<button onclick="clearAllFiltersFromPopover()" style="padding:4px 8px; background:#ef4444; color:#fff; border:none; border-radius:4px; font-size:0.75rem; cursor:pointer;">🧹 전체 삭제</button>' +
      '</div>' +
      '<div id="popFilterStackList" style="display:flex; flex-wrap:wrap; gap:4px; max-height:80px; overflow-y:auto; font-size:0.72rem; padding:4px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:4px;">' +
      '</div>';

    popover.innerHTML = html;
    document.body.appendChild(popover);

    updateFilterRangeConfig();
    renderFilterStackListInPopover();

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

  function updateFilterRangeConfig() {
    var select = document.getElementById('popFilterType');
    var range = document.getElementById('popFilterRange');
    var disp = document.getElementById('popFilterValDisp');
    if (!select || !range || !disp) return;

    var type = select.value;
    var unit = 'px';
    var min = 0, max = 100, val = 100, step = 1;

    if (type === 'blur') {
      min = 0; max = 30; val = 3; unit = 'px';
    } else if (type === 'brightness') {
      min = 0; max = 300; val = 120; unit = '%';
    } else if (type === 'contrast') {
      min = 0; max = 300; val = 150; unit = '%';
    } else if (type === 'drop-shadow') {
      min = 0; max = 30; val = 4; unit = 'px';
    } else if (type === 'grayscale') {
      min = 0; max = 100; val = 100; unit = '%';
    } else if (type === 'hue-rotate') {
      min = 0; max = 360; val = 90; unit = 'deg';
    } else if (type === 'invert') {
      min = 0; max = 100; val = 100; unit = '%';
    } else if (type === 'opacity') {
      min = 0; max = 100; val = 80; unit = '%';
    } else if (type === 'saturate') {
      min = 0; max = 500; val = 200; unit = '%';
    } else if (type === 'sepia') {
      min = 0; max = 100; val = 100; unit = '%';
    }

    window.filterUnit = unit;
    range.min = min;
    range.max = max;
    range.value = val;
    range.step = step;
    disp.innerText = val + unit;
  }

  function getSelectedObjectsForFilter() {
    var members = getAllGroupMembers(cfg.selectedIds);
    if (members.length === 0) {
      return Array.from(cfg.objectsMap.values());
    }
    return members;
  }

  function renderFilterStackListInPopover() {
    var listContainer = document.getElementById('popFilterStackList');
    if (!listContainer) return;
    var targets = getSelectedObjectsForFilter();
    if (targets.length === 0) {
      listContainer.innerHTML = '<span style="color:#94a3b8;">대상을 선택하세요</span>';
      return;
    }
    var firstObj = targets[0];
    var filters = (firstObj.attrs && firstObj.attrs.filterList) ? firstObj.attrs.filterList : [];
    if (filters.length === 0) {
      listContainer.innerHTML = '<span style="color:#94a3b8;">적용된 필터가 없습니다</span>';
      return;
    }

    var tagsHtml = '';
    for (var i = 0; i < filters.length; i++) {
      tagsHtml +=
        '<span style="display:inline-flex; align-items:center; gap:2px; background:#e0f2fe; color:#0369a1; padding:2px 6px; border-radius:4px; border:1px solid #bae6fd;">' +
          filters[i] +
          '<button onclick="removeFilterAtIndexFromPopover(' + i + ')" style="background:none; border:none; color:#ef4444; font-weight:bold; cursor:pointer; font-size:0.75rem; padding:0 2px;">×</button>' +
        '</span>';
    }
    listContainer.innerHTML = tagsHtml;
  }

  function addFilterFromPopover() {
    var select = document.getElementById('popFilterType');
    var range = document.getElementById('popFilterRange');
    if (!select || !range) return;

    var type = select.value;
    var val = range.value;
    var unit = window.filterUnit || 'px';

    var filterExpr = '';
    if (type === 'drop-shadow') {
      filterExpr = 'drop-shadow(' + val + 'px ' + val + 'px ' + (parseInt(val, 10) + 2) + 'px rgba(0,0,0,0.5))';
    } else {
      filterExpr = type + '(' + val + unit + ')';
    }

    var targets = getSelectedObjectsForFilter();
    targets.forEach(function(obj) {
      if (!obj.attrs) obj.attrs = {};
      if (!obj.attrs.filterList) obj.attrs.filterList = [];
      obj.attrs.filterList.push(filterExpr);
      obj.attrs.filter = obj.attrs.filterList.join(' ');
      if (window.WebpointerRenderCanvas && window.WebpointerRenderCanvas.updateElementAttributes) {
        window.WebpointerRenderCanvas.updateElementAttributes(obj);
      }
      if (window.WebpointerRender && window.WebpointerRender.renderCanvas) {
        window.WebpointerRender.renderCanvas();
      }
    });

    renderFilterStackListInPopover();
  }

  function removeFilterAtIndexFromPopover(idx) {
    var targets = getSelectedObjectsForFilter();
    targets.forEach(function(obj) {
      if (obj.attrs && obj.attrs.filterList) {
        obj.attrs.filterList.splice(idx, 1);
        obj.attrs.filter = obj.attrs.filterList.join(' ');
        if (window.WebpointerRenderCanvas && window.WebpointerRenderCanvas.updateElementAttributes) {
          window.WebpointerRenderCanvas.updateElementAttributes(obj);
        }
        if (window.WebpointerRender && window.WebpointerRender.renderCanvas) {
          window.WebpointerRender.renderCanvas();
        }
      }
    });
    renderFilterStackListInPopover();
  }

  function clearAllFiltersFromPopover() {
    var targets = getSelectedObjectsForFilter();
    targets.forEach(function(obj) {
      if (obj.attrs) {
        obj.attrs.filterList = [];
        obj.attrs.filter = '';
        if (window.WebpointerRenderCanvas && window.WebpointerRenderCanvas.updateElementAttributes) {
          window.WebpointerRenderCanvas.updateElementAttributes(obj);
        }
        if (window.WebpointerRender && window.WebpointerRender.renderCanvas) {
          window.WebpointerRender.renderCanvas();
        }
      }
    });
    renderFilterStackListInPopover();
  }

  function openSymbolClipPopover(anchorBtn) {
    var popover = document.getElementById('symbolClipPopover');
    if (!popover) return;

    if (popover.style.display === 'flex' || popover.style.display === 'block') {
      popover.style.display = 'none';
      return;
    }

    if (anchorBtn) {
      var rect = anchorBtn.getBoundingClientRect();
      popover.style.position = 'fixed';
      popover.style.top = (rect.bottom + 6) + 'px';
      popover.style.left = Math.min(rect.left, window.innerWidth - 330) + 'px';
      popover.style.zIndex = '99999';
    }

    renderSymbolClipListInPopover();
    popover.style.display = 'block';
  }

  function closeSymbolClipPopover() {
    var popover = document.getElementById('symbolClipPopover');
    if (popover) popover.style.display = 'none';
  }

  function renderSymbolClipListInPopover() {
    var grid = document.getElementById('popSymbolClipGrid');
    if (!grid) return;

    var symbols = cfg.symbolRegistry || [];
    if (symbols.length === 0) {
      symbols = [
        { id: 'sym_def_star', name: '별 (Star)', data: 'M 25 2 L 32 17 L 48 19 L 36 31 L 40 47 L 25 39 L 10 47 L 14 31 L 2 19 L 18 17 Z' },
        { id: 'sym_def_heart', name: '하트 (Heart)', data: 'M 25 10 C 25 3, 10 3, 10 16 C 10 28, 25 38, 25 44 C 25 38, 40 28, 40 16 C 40 3, 25 3, 25 10 Z' },
        { id: 'sym_def_circle', name: '원 (Circle)', data: 'M 25 5 A 20 20 0 1 0 25 45 A 20 20 0 1 0 25 5 Z' },
        { id: 'sym_def_hexagon', name: '육각형 (Hexagon)', data: 'M 25 2 L 46 14 L 46 36 L 25 48 L 4 36 L 4 14 Z' }
      ];
    }

    var html = symbols.map(function(sym) {
      var d = sym.data || '';
      var svgPreview = '<svg width="36" height="36" viewBox="0 0 50 50"><path d="' + d + '" fill="#0284c7" stroke="#0369a1" stroke-width="2"/></svg>';
      return '<div onclick="WebpointerHandlers.applySymbolClip(\'' + sym.id + '\')" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:6px; background:#ffffff; border:1px solid #e2e8f0; border-radius:6px; cursor:pointer; text-align:center; transition:all 0.15s ease;" onmouseover="this.style.borderColor=\'#0284c7\';this.style.background=\'#f0f9ff\'" onmouseout="this.style.borderColor=\'#e2e8f0\';this.style.background=\'#ffffff\'" title="' + sym.name + '">' +
               svgPreview +
               '<span style="font-size:0.7rem; color:#334155; max-width:70px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-top:4px;">' + sym.name + '</span>' +
             '</div>';
    }).join('');

    grid.innerHTML = html;
  }

  function applySymbolClip(symbolId) {
    var symbols = cfg.symbolRegistry || [];
    var defaultSymbols = [
      { id: 'sym_def_star', name: '별 (Star)', data: 'M 25 2 L 32 17 L 48 19 L 36 31 L 40 47 L 25 39 L 10 47 L 14 31 L 2 19 L 18 17 Z' },
      { id: 'sym_def_heart', name: '하트 (Heart)', data: 'M 25 10 C 25 3, 10 3, 10 16 C 10 28, 25 38, 25 44 C 25 38, 40 28, 40 16 C 40 3, 25 3, 25 10 Z' },
      { id: 'sym_def_circle', name: '원 (Circle)', data: 'M 25 5 A 20 20 0 1 0 25 45 A 20 20 0 1 0 25 5 Z' },
      { id: 'sym_def_hexagon', name: '육각형 (Hexagon)', data: 'M 25 2 L 46 14 L 46 36 L 25 48 L 4 36 L 4 14 Z' }
    ];

    var sym = symbols.find(function(s) { return s.id === symbolId; }) || defaultSymbols.find(function(s) { return s.id === symbolId; }) || defaultSymbols[0];
    if (!sym) return;

    var targets = getSelectedObjectsForFilter();
    var mainSvg = document.getElementById('mainSvg');
    if (!mainSvg) return;
    var defs = mainSvg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.setAttribute('id', 'svgDefs');
      mainSvg.insertBefore(defs, mainSvg.firstChild);
    }

    targets.forEach(function(obj) {
      if (!obj.attrs) obj.attrs = {};
      var clipId = 'sym_clip_' + obj.id;
      var clipEl = document.getElementById(clipId);
      if (!clipEl) {
        clipEl = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
        clipEl.setAttribute('id', clipId);
        defs.appendChild(clipEl);
      }

      var ox = obj.attrs.x || obj.attrs.cx || 0;
      var oy = obj.attrs.y || obj.attrs.cy || 0;
      var ow = obj.attrs.width || (obj.attrs.r ? obj.attrs.r * 2 : 100);
      var oh = obj.attrs.height || (obj.attrs.r ? obj.attrs.r * 2 : 100);

      var scaleX = ow / 50;
      var scaleY = oh / 50;
      var transformStr = 'translate(' + ox + ' ' + oy + ') scale(' + scaleX + ' ' + scaleY + ')';

      clipEl.innerHTML = '<path d="' + (sym.data || '') + '" transform="' + transformStr + '"/>';

      obj.attrs.symbolClip = symbolId;
      obj.attrs.clipPath = 'url(#' + clipId + ')';

      if (window.WebpointerRenderCanvas && window.WebpointerRenderCanvas.updateElementAttributes) {
        window.WebpointerRenderCanvas.updateElementAttributes(obj);
      }
      if (window.WebpointerRender && window.WebpointerRender.renderCanvas) {
        window.WebpointerRender.renderCanvas();
      }
    });

    closeSymbolClipPopover();
  }

  function removeSymbolClipFromSelected() {
    var targets = getSelectedObjectsForFilter();
    targets.forEach(function(obj) {
      if (obj.attrs) {
        delete obj.attrs.symbolClip;
        delete obj.attrs.clipPath;
        var clipId = 'sym_clip_' + obj.id;
        var clipEl = document.getElementById(clipId);
        if (clipEl && clipEl.parentNode) clipEl.parentNode.removeChild(clipEl);

        if (window.WebpointerRenderCanvas && window.WebpointerRenderCanvas.updateElementAttributes) {
          window.WebpointerRenderCanvas.updateElementAttributes(obj);
        }
        if (window.WebpointerRender && window.WebpointerRender.renderCanvas) {
          window.WebpointerRender.renderCanvas();
        }
      }
    });
    closeSymbolClipPopover();
  }

  window.openFilterPopover = openFilterPopover;
  window.updateFilterRangeConfig = updateFilterRangeConfig;
  window.addFilterFromPopover = addFilterFromPopover;
  window.removeFilterAtIndexFromPopover = removeFilterAtIndexFromPopover;
  window.clearAllFiltersFromPopover = clearAllFiltersFromPopover;
  window.openSymbolClipPopover = openSymbolClipPopover;
  window.closeSymbolClipPopover = closeSymbolClipPopover;
  window.applySymbolClip = applySymbolClip;
  window.removeSymbolClipFromSelected = removeSymbolClipFromSelected;
  window.openSymbolManagerModal = openSymbolManagerModal;
  window.closeSymbolManagerModal = closeSymbolManagerModal;
  window.importSymbolFromFile = importSymbolFromFile;
  window.deleteSymbol = deleteSymbol;
  window.renderSymbolList = renderSymbolList;
  window.switchPopoverTab = switchPopoverTab;
  window.applyGradientFromPopover = applyGradientFromPopover;
  window.applyPatternFromPopover = applyPatternFromPopover;
  window.applyImageFillFromPopover = applyImageFillFromPopover;
  window.createLinearGradient = createLinearGradient;
  window.createRadialGradient = createRadialGradient;
  window.createPatternFill = createPatternFill;
  window.createImageFill = createImageFill;

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
    openShortcutModal: openShortcutModal,
    closeShortcutModal: closeShortcutModal,
    openDetailedSettingsModal: openDetailedSettingsModal,
    closeDetailedSettingsModal: closeDetailedSettingsModal,
    applyDetailedSettings: applyDetailedSettings,
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
    endHoldStyle: endHoldStyle,
    toggleCropMode: toggleCropMode,
    openFilterPopover: openFilterPopover,
    addFilterFromPopover: addFilterFromPopover,
    openSymbolClipPopover: openSymbolClipPopover,
    closeSymbolClipPopover: closeSymbolClipPopover,
    applySymbolClip: applySymbolClip,
    removeSymbolClipFromSelected: removeSymbolClipFromSelected,
    openSymbolManagerModal: openSymbolManagerModal,
    closeSymbolManagerModal: closeSymbolManagerModal,
    importSymbolFromFile: importSymbolFromFile,
    deleteSymbol: deleteSymbol,
    renderSymbolList: renderSymbolList,
    createLinearGradient: createLinearGradient,
    createRadialGradient: createRadialGradient,
    createPatternFill: createPatternFill,
    createImageFill: createImageFill
  };
})(window);
