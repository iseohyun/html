(function(window) {
  'use strict';

  var cfg = window.WebpointerConfig;

  function createCapSvg(capType) {
    if (capType === 'butt') {
      return '<svg viewBox="0 0 24 24" class="icon-svg cap-join-svg">' +
        '<line x1="13" y1="2" x2="13" y2="22" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="2,2"/>' +
        '<line x1="3" y1="12" x2="13" y2="12" stroke="currentColor" stroke-width="12" stroke-linecap="butt"/>' +
        '<circle cx="13" cy="12" r="2.5" fill="#ef4444"/>' +
      '</svg>';
    } else if (capType === 'round') {
      return '<svg viewBox="0 0 24 24" class="icon-svg cap-join-svg">' +
        '<line x1="13" y1="2" x2="13" y2="22" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="2,2"/>' +
        '<line x1="3" y1="12" x2="13" y2="12" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>' +
        '<circle cx="13" cy="12" r="2.5" fill="#ef4444"/>' +
      '</svg>';
    } else if (capType === 'square') {
      return '<svg viewBox="0 0 24 24" class="icon-svg cap-join-svg">' +
        '<line x1="13" y1="2" x2="13" y2="22" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="2,2"/>' +
        '<line x1="3" y1="12" x2="13" y2="12" stroke="currentColor" stroke-width="12" stroke-linecap="square"/>' +
        '<circle cx="13" cy="12" r="2.5" fill="#ef4444"/>' +
      '</svg>';
    }
    return '';
  }

  function createJoinSvg(joinType) {
    if (joinType === 'miter') {
      return '<svg viewBox="0 0 24 24" class="icon-svg cap-join-svg">' +
        '<path d="M 4 20 L 12 6 L 20 20" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="miter" stroke-linecap="butt"/>' +
        '<circle cx="12" cy="6" r="2.5" fill="#ef4444"/>' +
      '</svg>';
    } else if (joinType === 'round') {
      return '<svg viewBox="0 0 24 24" class="icon-svg cap-join-svg">' +
        '<path d="M 4 20 L 12 6 L 20 20" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round" stroke-linecap="butt"/>' +
        '<circle cx="12" cy="6" r="2.5" fill="#ef4444"/>' +
      '</svg>';
    } else if (joinType === 'bevel') {
      return '<svg viewBox="0 0 24 24" class="icon-svg cap-join-svg">' +
        '<path d="M 4 20 L 12 6 L 20 20" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="bevel" stroke-linecap="butt"/>' +
        '<circle cx="12" cy="6" r="2.5" fill="#ef4444"/>' +
      '</svg>';
    }
    return '';
  }

  function renderRibbon() {
    var ribbon = document.getElementById('ribbonBar') || document.getElementById('ribbonContainer');
    if (!ribbon) return;

    if (!cfg.collapsedCategories) cfg.collapsedCategories = new Set();

    var activeTab = cfg.currentTab || 'style';

    var html = '';

    if (activeTab === 'insert') {
      html += '<div class="ribbon-category">' +
        '<div class="category-content row-2">' +
          '<button class="tool-btn ' + (cfg.currentTool === 'rect' ? 'active' : '') + '" onclick="setTool(\'rect\')"><span class="alt-badge">R</span><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" fill="none" stroke="currentColor" stroke-width="2"/></svg><span class="tooltip-text">직사각형 (Rect)</span></button>' +
          '<button class="tool-btn ' + (cfg.currentTool === 'rounded' ? 'active' : '') + '" onclick="setTool(\'rounded\')"><span class="alt-badge">U</span><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="4" fill="none" stroke="currentColor" stroke-width="2"/></svg><span class="tooltip-text">둥근 사각형</span></button>' +
          '<button class="tool-btn ' + (cfg.currentTool === 'ellipse' ? 'active' : '') + '" onclick="setTool(\'ellipse\')"><span class="alt-badge">E</span><svg viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="9" ry="6" fill="none" stroke="currentColor" stroke-width="2"/></svg><span class="tooltip-text">타원 (Ellipse)</span></button>' +
          '<button class="tool-btn ' + (cfg.currentTool === 'line' ? 'active' : '') + '" onclick="setTool(\'line\')"><span class="alt-badge">L</span><svg viewBox="0 0 24 24"><line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" stroke-width="2"/></svg><span class="tooltip-text">직선 (Line)</span></button>' +
          '<button class="tool-btn ' + (cfg.currentTool === 'point' ? 'active' : '') + '" onclick="setTool(\'point\')"><span class="alt-badge">P</span><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" fill="currentColor"/></svg><span class="tooltip-text">점 (Point)</span></button>' +
          '<button class="tool-btn ' + (cfg.currentTool === 'arc' ? 'active' : '') + '" onclick="setTool(\'arc\')"><span class="alt-badge">A</span><svg viewBox="0 0 24 24"><path d="M 4 18 A 9 9 0 0 1 20 18" fill="none" stroke="currentColor" stroke-width="2"/></svg><span class="tooltip-text">원호 (Arc)</span></button>' +
          '<button class="tool-btn ' + (cfg.currentTool === 'bez2' ? 'active' : '') + '" onclick="setTool(\'bez2\')"><span class="alt-badge">B</span><svg viewBox="0 0 24 24"><path d="M 3 18 Q 12 3 21 18" fill="none" stroke="currentColor" stroke-width="2"/></svg><span class="tooltip-text">2차 베지어 (Bez2)</span></button>' +
          '<button class="tool-btn ' + (cfg.currentTool === 'bez3' ? 'active' : '') + '" onclick="setTool(\'bez3\')"><span class="alt-badge">C</span><svg viewBox="0 0 24 24"><path d="M 3 18 C 8 2, 16 22, 21 6" fill="none" stroke="currentColor" stroke-width="2"/></svg><span class="tooltip-text">3차 베지어 (Bez3)</span></button>' +
        '</div>' +
        '<div class="category-title">도구 (Tools)</div>' +
      '</div>';

    } else if (activeTab === 'style') {
      var isCatColorCollapsed = cfg.collapsedCategories.has('color');
      html += '<div class="ribbon-category ' + (isCatColorCollapsed ? 'collapsed' : '') + '">' +
        '<div class="category-title" onclick="toggleCategoryCollapse(\'color\')">' +
          '<span class="title-text">색 (Color)</span>' +
          '<span class="toggle-icon">' + (isCatColorCollapsed ? '▶' : '▼') + '</span>' +
        '</div>';

      if (!isCatColorCollapsed) {
        html += '<div class="category-content row-3" style="align-items:center;">' +
          '<div style="display:flex; flex-direction:column; gap:4px; align-items:center;">' +
            '<div style="display:flex; align-items:center; gap:4px;"><label style="font-size:0.68rem; color:#475569; font-weight:600;">테두리</label><input type="color" value="' + (cfg.strokeColor === 'none' ? '#041e49' : cfg.strokeColor) + '" onchange="setStrokeColor(this.value)" style="width:24px; height:24px; border:none; cursor:pointer; background:none;"/></div>' +
            '<div style="display:flex; align-items:center; gap:4px;"><label style="font-size:0.68rem; color:#475569; font-weight:600;">채우기</label><input type="color" value="' + (cfg.fillColor === 'none' ? '#ffffff' : cfg.fillColor) + '" onchange="setFillColor(this.value)" style="width:24px; height:24px; border:none; cursor:pointer; background:none;"/></div>' +
          '</div>' +
          '<div style="display:grid; grid-template-columns: repeat(8, 1fr); gap:3px; max-width:210px;">';
        (cfg.paletteColors || []).slice(0, 24).forEach(function(c) {
          html += '<button class="palette-swatch" style="background-color:' + c + ';" onclick="setStrokeColor(\'' + c + '\')" title="' + c + '"></button>';
        });
        html += '</div>' +
          '<div style="display:flex; flex-direction:column; gap:4px;">' +
            '<button class="tool-btn flex-col" onclick="setStrokeColor(\'none\')"><span style="font-size:0.75rem; font-weight:bold; color:#ef4444;">✕</span><span style="font-size:0.65rem;">선 없음</span></button>' +
            '<button class="tool-btn flex-col" onclick="setFillColor(\'none\')"><span style="font-size:0.75rem; font-weight:bold; color:#ef4444;">∅</span><span style="font-size:0.65rem;">채우기없음</span></button>' +
            '<button class="tool-btn flex-col" onclick="openPaletteModal()"><span style="font-size:0.75rem;">🎨</span><span style="font-size:0.65rem;">UniPalette</span></button>' +
          '</div>' +
        '</div>';
      }
      html += '</div>';

      var isCatLineCollapsed = cfg.collapsedCategories.has('line');
      html += '<div class="ribbon-category ' + (isCatLineCollapsed ? 'collapsed' : '') + '">' +
        '<div class="category-title" onclick="toggleCategoryCollapse(\'line\')">' +
          '<span class="title-text">선 (Line)</span>' +
          '<span class="toggle-icon">' + (isCatLineCollapsed ? '▶' : '▼') + '</span>' +
        '</div>';

      if (!isCatLineCollapsed) {
        html += '<div class="category-content row-2">' +
          '<div style="display:flex; align-items:center; gap:6px;">' +
            '<label style="font-size:0.72rem; color:#475569; font-weight:600;">두께</label>' +
            '<input type="number" min="1" max="20" value="' + (cfg.strokeWidth || 2) + '" onchange="setStrokeWidth(this.value)" style="width:45px; padding:2px 4px; font-size:0.75rem; border:1px solid #cbd5e1; border-radius:4px;"/>' +
          '</div>' +
          '<div style="display:flex; align-items:center; gap:4px;">' +
            '<button class="tool-btn ' + (cfg.strokeDashStyle === 'solid' ? 'active' : '') + '" onclick="setStrokeDashStyle(\'solid\')"><span class="tooltip-text">실선 (Solid)</span>━━━</button>' +
            '<button class="tool-btn ' + (cfg.strokeDashStyle === 'dashed' ? 'active' : '') + '" onclick="setStrokeDashStyle(\'dashed\')"><span class="tooltip-text">점선 (Dashed)</span>┅┅┅</button>' +
          '</div>' +
          '<div style="display:flex; align-items:center; gap:4px; grid-column: span 2;">' +
            '<label style="font-size:0.72rem; color:#475569; font-weight:600;">패턴</label>' +
            '<input type="text" value="' + (cfg.strokeDashArray || '6,6') + '" oninput="setStrokeDashArray(this.value)" style="width:80px; padding:2px 4px; font-size:0.75rem; border:1px solid #cbd5e1; border-radius:4px;" placeholder="6,6"/>' +
          '</div>' +
        '</div>';
      }
      html += '</div>';

      var isCatLineEndsCollapsed = cfg.collapsedCategories.has('lineEnds');
      html += '<div class="ribbon-category ' + (isCatLineEndsCollapsed ? 'collapsed' : '') + '">' +
        '<div class="category-title" onclick="toggleCategoryCollapse(\'lineEnds\')">' +
          '<span class="title-text">선 끝 (Line Ends)</span>' +
          '<span class="toggle-icon">' + (isCatLineEndsCollapsed ? '▶' : '▼') + '</span>' +
        '</div>';

      if (!isCatLineEndsCollapsed) {
        html += '<div class="category-content row-2">' +
          '<div style="display:flex; align-items:center; gap:2px;">' +
            '<button class="tool-btn ' + (cfg.startMarker === 'none' ? 'active' : '') + '" onclick="setStartMarker(\'none\')">━</button>' +
            '<button class="tool-btn ' + (cfg.startMarker === 'arrow' ? 'active' : '') + '" onclick="setStartMarker(\'arrow\')">◄━</button>' +
            '<button class="tool-btn ' + (cfg.startMarker === 'circle' ? 'active' : '') + '" onclick="setStartMarker(\'circle\')">◀━</button>' +
            '<button class="tool-btn ' + (cfg.startMarker === 'square' ? 'active' : '') + '" onclick="setStartMarker(\'square\')">■━</button>' +
          '</div>' +
          '<div style="display:flex; align-items:center; gap:2px;">' +
            '<button class="tool-btn ' + (cfg.endMarker === 'none' ? 'active' : '') + '" onclick="setEndMarker(\'none\')">━</button>' +
            '<button class="tool-btn ' + (cfg.endMarker === 'arrow' ? 'active' : '') + '" onclick="setEndMarker(\'arrow\')">━►</button>' +
            '<button class="tool-btn ' + (cfg.endMarker === 'circle' ? 'active' : '') + '" onclick="setEndMarker(\'circle\')">━▶</button>' +
            '<button class="tool-btn ' + (cfg.endMarker === 'square' ? 'active' : '') + '" onclick="setEndMarker(\'square\')">━■</button>' +
          '</div>' +
        '</div>';
      }
      html += '</div>';

      var isCatCapJoinCollapsed = cfg.collapsedCategories.has('capJoin');
      html += '<div class="ribbon-category ' + (isCatCapJoinCollapsed ? 'collapsed' : '') + '">' +
        '<div class="category-title" onclick="toggleCategoryCollapse(\'capJoin\')">' +
          '<span class="title-text">마감 (Cap & Join)</span>' +
          '<span class="toggle-icon">' + (isCatCapJoinCollapsed ? '▶' : '▼') + '</span>' +
        '</div>';

      if (!isCatCapJoinCollapsed) {
        html += '<div class="category-content row-2">' +
          '<div style="display:flex; align-items:center; gap:2px;">' +
            '<label style="font-size:0.68rem; color:#475569; font-weight:600; margin-right:2px;">Cap</label>' +
            '<button class="tool-btn ' + (cfg.strokeCap === 'butt' ? 'active' : '') + '" onclick="setStrokeCap(\'butt\')">' + createCapSvg('butt') + '<span class="tooltip-text">butt (평평함)</span></button>' +
            '<button class="tool-btn ' + (cfg.strokeCap === 'round' ? 'active' : '') + '" onclick="setStrokeCap(\'round\')">' + createCapSvg('round') + '<span class="tooltip-text">round (둥글게)</span></button>' +
            '<button class="tool-btn ' + (cfg.strokeCap === 'square' ? 'active' : '') + '" onclick="setStrokeCap(\'square\')">' + createCapSvg('square') + '<span class="tooltip-text">square (돌출 사각형)</span></button>' +
          '</div>' +
          '<div style="display:flex; align-items:center; gap:2px;">' +
            '<label style="font-size:0.68rem; color:#475569; font-weight:600; margin-right:2px;">Join</label>' +
            '<button class="tool-btn ' + (cfg.strokeJoin === 'miter' ? 'active' : '') + '" onclick="setStrokeJoin(\'miter\')">' + createJoinSvg('miter') + '<span class="tooltip-text">miter (뾰족함)</span></button>' +
            '<button class="tool-btn ' + (cfg.strokeJoin === 'round' ? 'active' : '') + '" onclick="setStrokeJoin(\'round\')">' + createJoinSvg('round') + '<span class="tooltip-text">round (둥글게)</span></button>' +
            '<button class="tool-btn ' + (cfg.strokeJoin === 'bevel' ? 'active' : '') + '" onclick="setStrokeJoin(\'bevel\')">' + createJoinSvg('bevel') + '<span class="tooltip-text">bevel (깎임)</span></button>' +
          '</div>' +
        '</div>';
      }
      html += '</div>';

    } else if (activeTab === 'text') {
      html += '<div class="ribbon-category">' +
        '<div class="category-content row-2">' +
          '<button class="tool-btn" onclick="addTextObject()"><span class="alt-badge">T</span><svg viewBox="0 0 24 24"><path d="M4 7V4h16v3M12 4v16M9 20h6"/></svg><span class="tooltip-text">텍스트 상자 추가</span></button>' +
        '</div>' +
        '<div class="category-title">글 서식</div>' +
      '</div>';
    }

    ribbon.innerHTML = html;
  }

  window.WebpointerRenderRibbon = {
    createCapSvg: createCapSvg,
    createJoinSvg: createJoinSvg,
    renderRibbon: renderRibbon
  };
})(window);
