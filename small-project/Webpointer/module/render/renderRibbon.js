(function(window) {
  'use strict';

  var cfg = window.WebpointerConfig;

  var default24Colors = [
    "#660000", "#660000", "#086600", "#006627", "#002e66", "#000080", "#3a0066", "#660031",
    "#e44d1b", "#c27800", "#669900", "#00a879", "#009dd1", "#4182fb", "#a760e2", "#d94594",
    "#ff976b", "#ffbb00", "#aae43f", "#00f5c0", "#00eaff", "#85caff", "#ec99ff", "#ff8fda"
  ];

  function getOutermostGroupEl(el) {
    if (!el) return null;
    var objectsGroup = document.getElementById('objectsGroup');
    var current = el.parentElement;
    var topG = null;
    while (current && current !== objectsGroup && current.tagName && current.tagName.toLowerCase() === 'g') {
      topG = current;
      current = current.parentElement;
    }
    return topG;
  }

  function build3RowGridHtml(itemsHtmlArray) {
    var colCount = Math.ceil(itemsHtmlArray.length / 3);
    return '<div class="category-grid" style="grid-template-columns: repeat(' + colCount + ', 34px);">' + itemsHtmlArray.join('') + '</div>';
  }

  function buildCategoryHtml(catKey, catTitle, contentHtml) {
    var isCollapsed = cfg.collapsedCategories && cfg.collapsedCategories.has(catKey);
    return '<div class="ribbon-category ' + (isCollapsed ? 'collapsed' : '') + '">' +
             '<div class="category-content" style="' + (isCollapsed ? 'display:none;' : '') + '">' + contentHtml + '</div>' +
             '<div class="category-title" onclick="toggleCategoryCollapse(\'' + catKey + '\')" title="클릭하여 접기/펼치기" style="cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px;">' +
               '<span>' + catTitle + '</span>' +
               '<span style="font-size:0.6rem; opacity:0.6;">' + (isCollapsed ? '▲' : '▼') + '</span>' +
             '</div>' +
           '</div>';
  }

function renderRibbon() {
      var ribbonBar = document.getElementById('ribbonBar');
      if (!ribbonBar) return;
      var self = this;

      if (cfg.currentTab === 'insert') {
        var shapeTools = [
          '<button class="tool-btn ' + (cfg.currentTool==='select'?'active':'') + '" onclick="setTool(\'select\')"><span class="alt-badge">V</span><svg viewBox="0 0 24 24"><path d="M3 3l7 18 3-7 7-3L3 3z"/></svg><span class="tooltip-text">선택 도구 (V)</span></button>',
          '<button class="tool-btn ' + (cfg.currentTool==='point'?'active':'') + '" onclick="setTool(\'point\')"><span class="alt-badge">P</span><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="currentColor"/></svg><span class="tooltip-text">점 도구 (P)</span></button>',
          '<button class="tool-btn ' + (cfg.currentTool==='line'?'active':'') + '" onclick="setTool(\'line\')"><span class="alt-badge">L</span><svg viewBox="0 0 24 24"><line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" stroke-width="2"/></svg><span class="tooltip-text">직선 도구 (L)</span></button>',
          '<button class="tool-btn ' + (cfg.currentTool==='rect'?'active':'') + '" onclick="setTool(\'rect\')"><span class="alt-badge">R</span><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"/></svg><span class="tooltip-text">직사각형 도구 (R)</span></button>',
          '<button class="tool-btn ' + (cfg.currentTool==='rounded'?'active':'') + '" onclick="setTool(\'rounded\')"><span class="alt-badge">U</span><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/></svg><span class="tooltip-text">둥근 사각형 도구 (U)</span></button>',
          '<button class="tool-btn ' + (cfg.currentTool==='ellipse'?'active':'') + '" onclick="setTool(\'ellipse\')"><span class="alt-badge">E</span><svg viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="9" ry="9" fill="none" stroke="currentColor" stroke-width="2"/></svg><span class="tooltip-text">타원/원 도구 (E)</span></button>',
          '<button class="tool-btn ' + (cfg.currentTool==='arc'?'active':'') + '" onclick="setTool(\'arc\')"><span class="alt-badge">A</span><svg viewBox="0 0 24 24"><path d="M 4 20 A 16 16 0 0 1 20 4" fill="none" stroke="currentColor" stroke-width="2"/></svg><span class="tooltip-text">호 도구 (A)</span></button>',
          '<button class="tool-btn ' + (cfg.currentTool==='bez2'?'active':'') + '" onclick="setTool(\'bez2\')"><span class="alt-badge">Q</span><svg viewBox="0 0 24 24"><path d="M 4 20 Q 12 4 20 20" fill="none" stroke="currentColor" stroke-width="2"/></svg><span class="tooltip-text">2차 베지어 곡선 (Q)</span></button>',
          '<button class="tool-btn ' + (cfg.currentTool==='bez3'?'active':'') + '" onclick="setTool(\'bez3\')"><span class="alt-badge">C</span><svg viewBox="0 0 24 24"><path d="M 4 20 C 8 4 16 4 20 20" fill="none" stroke="currentColor" stroke-width="2"/></svg><span class="tooltip-text">3차 베지어 곡선 (C)</span></button>'
        ];

        var layerTools = [
          '<button class="tool-btn" onclick="bringToFront()"><span class="alt-badge">Shift+]</span><svg viewBox="0 0 24 24"><path d="M4 18h16v2H4zM4 14h16v2H4zM12 2l6 6h-4v4h-4V8H6z"/></svg><span class="tooltip-text">맨 앞으로 가져오기</span></button>',
          '<button class="tool-btn" onclick="bringForward()"><span class="alt-badge">]</span><svg viewBox="0 0 24 24"><path d="M4 18h16v2H4zM12 4l6 6h-4v6h-4V10H6z"/></svg><span class="tooltip-text">앞으로 가져오기</span></button>',
          '<button class="tool-btn" onclick="sendBackward()"><span class="alt-badge">[</span><svg viewBox="0 0 24 24"><path d="M4 4h16v2H4zM12 20l-6-6h4V8h4v6h4z"/></svg><span class="tooltip-text">뒤로 보내기</span></button>',
          '<button class="tool-btn" onclick="sendToBack()"><span class="alt-badge">Shift+[</span><svg viewBox="0 0 24 24"><path d="M4 4h16v2H4zM4 8h16v2H4zM12 22l-6-6h4v-4h4v4h4z"/></svg><span class="tooltip-text">맨 뒤로 보내기</span></button>'
        ];

        // Conditional Grouping & Ungrouping Ribbon Tools
        var topLevelUnits = new Set();
        var canUngroup = false;

        (cfg.selectedIds || new Set()).forEach(function(id) {
          var obj = cfg.objectsMap.get(id);
          if (obj && obj.el) {
            var outerG = getOutermostGroupEl(obj.el);
            if (outerG) {
              topLevelUnits.add(outerG);
              canUngroup = true;
            } else {
              topLevelUnits.add(obj.el);
            }
          }
        });

        var selectedTopCount = topLevelUnits.size;
        var canGroup = selectedTopCount >= 2;
        var canAlign2 = selectedTopCount >= 2;
        var canAlign3 = selectedTopCount >= 3;
        var canTransform = (cfg.selectedIds || new Set()).size >= 1;

        var groupTools = [
          '<button class="tool-btn ' + (canGroup ? '' : 'disabled') + '" ' + (canGroup ? 'onclick="groupSelected()"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">G</span><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" stroke-dasharray="3,3"/><rect x="6" y="6" width="6" height="6"/><rect x="12" y="12" width="6" height="6"/></svg><span class="tooltip-text">' + (canGroup ? '그룹화 (<g>)' : '그룹화 (독립 단위 2개 이상 선택 필요)') + '</span></button>',
          '<button class="tool-btn ' + (canUngroup ? '' : 'disabled') + '" ' + (canUngroup ? 'onclick="ungroupSelected()"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">U</span><svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" stroke-dasharray="2,2"/><rect x="13" y="13" width="8" height="8" stroke-dasharray="2,2"/></svg><span class="tooltip-text">' + (canUngroup ? '그룹 해제' : '그룹 해제 (그룹 객체 선택 필요)') + '</span></button>'
        ];

        var alignTools = [
          '<button class="tool-btn ' + (canAlign2 ? '' : 'disabled') + '" ' + (canAlign2 ? 'onclick="alignSelected(\'left\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">Alt+L</span><svg viewBox="0 0 24 24"><path d="M4 2v20M8 6h12v4H8zM8 14h8v4H8z"/></svg><span class="tooltip-text">' + (canAlign2 ? '왼쪽 정렬' : '왼쪽 정렬 (독립 단위 2개 이상 필요)') + '</span></button>',
          '<button class="tool-btn ' + (canAlign2 ? '' : 'disabled') + '" ' + (canAlign2 ? 'onclick="alignSelected(\'hcenter\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">Alt+C</span><svg viewBox="0 0 24 24"><path d="M12 2v20M6 6h12v4H6zM8 14h8v4H8z"/></svg><span class="tooltip-text">' + (canAlign2 ? '가로 중앙 정렬' : '가로 중앙 정렬 (독립 단위 2개 이상 필요)') + '</span></button>',
          '<button class="tool-btn ' + (canAlign2 ? '' : 'disabled') + '" ' + (canAlign2 ? 'onclick="alignSelected(\'right\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">Alt+R</span><svg viewBox="0 0 24 24"><path d="M20 2v20M4 6h12v4H4zM8 14h8v4H8z"/></svg><span class="tooltip-text">' + (canAlign2 ? '오른쪽 정렬' : '오른쪽 정렬 (독립 단위 2개 이상 필요)') + '</span></button>',
          '<button class="tool-btn ' + (canAlign2 ? '' : 'disabled') + '" ' + (canAlign2 ? 'onclick="alignSelected(\'top\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">Alt+T</span><svg viewBox="0 0 24 24"><path d="M2 4h20M6 8v12h4V8zM14 8v8h4V8z"/></svg><span class="tooltip-text">' + (canAlign2 ? '위쪽 정렬' : '위쪽 정렬 (독립 단위 2개 이상 필요)') + '</span></button>',
          '<button class="tool-btn ' + (canAlign2 ? '' : 'disabled') + '" ' + (canAlign2 ? 'onclick="alignSelected(\'vcenter\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">Alt+M</span><svg viewBox="0 0 24 24"><path d="M2 12h20M6 6v12h4V6zM14 8v8h4V8z"/></svg><span class="tooltip-text">' + (canAlign2 ? '세로 중앙 정렬' : '세로 중앙 정렬 (독립 단위 2개 이상 필요)') + '</span></button>',
          '<button class="tool-btn ' + (canAlign2 ? '' : 'disabled') + '" ' + (canAlign2 ? 'onclick="alignSelected(\'bottom\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">Alt+B</span><svg viewBox="0 0 24 24"><path d="M2 20h20M6 4v12h4V4zM14 8v8h4V8z"/></svg><span class="tooltip-text">' + (canAlign2 ? '아래쪽 정렬' : '아래쪽 정렬 (독립 단위 2개 이상 필요)') + '</span></button>',
          '<button class="tool-btn ' + (canAlign3 ? '' : 'disabled') + '" ' + (canAlign3 ? 'onclick="alignSelected(\'hspace\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">Alt+H</span><svg viewBox="0 0 24 24"><path d="M2 2v20M22 2v20M6 6h3v12H6zM15 6h3v12h-3z"/></svg><span class="tooltip-text">' + (canAlign3 ? '가로 간격 동일하게' : '가로 간격 동일하게 (독립 단위 3개 이상 필요)') + '</span></button>',
          '<button class="tool-btn ' + (canAlign3 ? '' : 'disabled') + '" ' + (canAlign3 ? 'onclick="alignSelected(\'vspace\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">Alt+V</span><svg viewBox="0 0 24 24"><path d="M2 2h20M2 22h20M6 6h12v3H6zM6 15h12v3H6z"/></svg><span class="tooltip-text">' + (canAlign3 ? '세로 간격 동일하게' : '세로 간격 동일하게 (독립 단위 3개 이상 필요)') + '</span></button>'
        ];

        var transformTools = [
          '<button class="tool-btn ' + (canTransform ? '' : 'disabled') + '" ' + (canTransform ? 'onclick="transformSelected(\'flipH\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">F</span><svg viewBox="0 0 24 24"><path d="M12 3v18M16 6l5 6-5 6V6zM8 6L3 12l5 6V6z"/></svg><span class="tooltip-text">' + (canTransform ? '좌우 대칭' : '좌우 대칭 (객체 선택 필요)') + '</span></button>',
          '<button class="tool-btn ' + (canTransform ? '' : 'disabled') + '" ' + (canTransform ? 'onclick="transformSelected(\'flipV\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">K</span><svg viewBox="0 0 24 24"><path d="M3 12h18M6 8l6-5 6 5H6zM6 16l6 5 6-5H6z"/></svg><span class="tooltip-text">' + (canTransform ? '상하 대칭' : '상하 대칭 (객체 선택 필요)') + '</span></button>',
          '<button class="tool-btn ' + (canTransform ? '' : 'disabled') + '" ' + (canTransform ? 'onclick="transformSelected(\'rotate90\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">R</span><svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.8 1 6.4 2.6L21 3v6h-6l2.5-2.5A6.9 6.9 0 1 0 19 12"/></svg><span class="tooltip-text">' + (canTransform ? '90도 회전 (시계방향)' : '90도 회전 (객체 선택 필요)') + '</span></button>',
          '<button class="tool-btn ' + (canTransform ? '' : 'disabled') + '" ' + (canTransform ? 'onclick="transformSelected(\'rotateNeg90\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">L</span><svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9c-2.5 0-4.8 1-6.4 2.6L3 3v6h6L6.5 6.5A6.9 6.9 0 1 1 5 12"/></svg><span class="tooltip-text">' + (canTransform ? '-90도 회전 (반시계방향)' : '-90도 회전 (객체 선택 필요)') + '</span></button>'
        ];

        ribbonBar.innerHTML = 
          buildCategoryHtml('insert_shapes', '도형 삽입', build3RowGridHtml(shapeTools)) +
          buildCategoryHtml('insert_layer', '레이어 순서', build3RowGridHtml(layerTools)) +
          buildCategoryHtml('insert_group', '그룹화', build3RowGridHtml(groupTools)) +
          buildCategoryHtml('insert_align', '정렬 및 간격', build3RowGridHtml(alignTools)) +
          buildCategoryHtml('insert_transform', '회전 및 대칭', build3RowGridHtml(transformTools));
      } else if (cfg.currentTab === 'view') {
        var proxVal = cfg.proximityThreshold !== undefined ? cfg.proximityThreshold : 30;
        var szVal = cfg.defaultShapeSize !== undefined ? cfg.defaultShapeSize : 100;

        var gridSettingsHtml =
          '<div class="category-grid" style="grid-template-columns: auto;">' +
            '<div class="ribbon-control-item"><label>격자 보이기:</label><input type="checkbox" id="chkGridToggle" ' + (cfg.gridSnapEnabled ? 'checked' : '') + ' onchange="toggleGridSnap(this.checked)"></div>' +
            '<div class="ribbon-control-item"><label>격자 크기:</label><select onchange="setGridDensity(this.value)"><option value="480x270" selected>481×271 Step (16:9 표준)</option><option value="240x135">241×136 Step (조밀하게)</option><option value="120x67">121×68 Step (성기게)</option></select></div>' +
            '<div class="ribbon-control-item"><label>근접 선택 거리:</label><select onchange="setProximityThreshold(this.value)"><option value="30" ' + (proxVal===30?'selected':'') + '>30px (기본값)</option><option value="10" ' + (proxVal===10?'selected':'') + '>10px</option><option value="20" ' + (proxVal===20?'selected':'') + '>20px</option><option value="0" ' + (proxVal===0?'selected':'') + '>0px (해제 - 정확한 클릭)</option></select></div>' +
            '<div class="ribbon-control-item"><label>기본 도형 크기:</label><select onchange="setDefaultShapeSize(this.value)"><option value="100" ' + (szVal===100?'selected':'') + '>100px (기본값)</option><option value="150" ' + (szVal===150?'selected':'') + '>150px</option><option value="200" ' + (szVal===200?'selected':'') + '>200px</option><option value="50" ' + (szVal===50?'selected':'') + '>50px</option></select></div>' +
          '</div>';

        var canvasSettingsHtml =
          '<div class="category-grid" style="grid-template-columns: auto;">' +
            '<div class="ribbon-control-item"><label>캔버스 크기:</label><select onchange="setCanvasRatio(this.value)"><option value="960x540" selected>16:9 (960×540 px)</option><option value="1280x720">16:9 HD (1280×720 px)</option><option value="800x600">4:3 (800×600 px)</option><option value="600x600">1:1 (600×600 px)</option></select></div>' +
            '<div class="ribbon-control-item"><label>캔버스 색상:</label><input type="color" value="' + cfg.canvasBgColor + '" onchange="setCanvasBgColor(this.value)"></div>' +
          '</div>';

        ribbonBar.innerHTML = 
          buildCategoryHtml('view_grid', '격자 및 스냅/선택/기본크기 설정', gridSettingsHtml) +
          buildCategoryHtml('view_canvas', '캔버스 화면 설정', canvasSettingsHtml);
      } else if (cfg.currentTab === 'style') {
        var userColors = (cfg.customPalette || []).slice();
        while (userColors.length < 24) {
          userColors.push(default24Colors[userColors.length % default24Colors.length]);
        }

        // Build 27-slot Seamless 9x3 Swatch Grid (Slots 9=White, 18=Black, 27=Transparent 'none')
        var swatchGridHtml = '<div style="display:grid; grid-template-columns:repeat(9, 24px); grid-template-rows:repeat(3, 24px); gap:0; border:1px solid #cbd5e1; border-radius:4px; overflow:hidden; margin:0; padding:0;">';
        var userIdx = 0;

        for (var slot = 1; slot <= 27; slot++) {
          if (slot === 9) {
            swatchGridHtml += '<div style="width:24px; height:24px; box-sizing:border-box; border:1px solid rgba(0,0,0,0.08); background:#ffffff; cursor:pointer;" onclick="applyPaletteColor(\'#ffffff\')" title="흰색 (#ffffff)"></div>';
          } else if (slot === 18) {
            swatchGridHtml += '<div style="width:24px; height:24px; box-sizing:border-box; border:1px solid rgba(0,0,0,0.08); background:#000000; cursor:pointer;" onclick="applyPaletteColor(\'#000000\')" title="검정색 (#000000)"></div>';
          } else if (slot === 27) {
            swatchGridHtml += '<div style="width:24px; height:24px; box-sizing:border-box; border:1px solid rgba(0,0,0,0.08); background:#ffffff; cursor:pointer; position:relative;" onclick="applyPaletteColor(\'none\')" title="투명색 (none)"><svg viewBox="0 0 24 24" style="width:100%; height:100%; display:block;"><line x1="0" y1="24" x2="24" y2="0" stroke="#ef4444" stroke-width="2.5"/></svg></div>';
          } else {
            var hex = userColors[userIdx++] || '#041e49';
            swatchGridHtml += '<div style="width:24px; height:24px; box-sizing:border-box; border:1px solid rgba(0,0,0,0.08); background:' + hex + '; cursor:pointer;" onclick="applyPaletteColor(\'' + hex + '\')" title="' + hex + '"></div>';
          }
        }
        swatchGridHtml += '</div>';

        var targetMode = cfg.activeColorTarget || 'stroke';
        var isStrokeActive = targetMode === 'stroke';
        var isFillActive = targetMode === 'fill';

        // 1x2 Radio Target Selection Buttons (Left Side: Stroke Icon / Fill Icon)
        var strokeBtnHtml = '<button class="tool-btn ' + (isStrokeActive ? 'active' : '') + '" onclick="setActiveColorTarget(\'stroke\')" style="width:34px; height:34px;"><span class="alt-badge">S</span><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" fill="#e2e8f0" stroke="#ef4444" stroke-width="3" rx="2"/></svg><span class="tooltip-text">테두리 색상 선택 (Active)</span></button>';
        var fillBtnHtml   = '<button class="tool-btn ' + (isFillActive ? 'active' : '') + '" onclick="setActiveColorTarget(\'fill\')" style="width:34px; height:34px;"><span class="alt-badge">F</span><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" fill="#ef4444" stroke="#cbd5e1" stroke-width="1.5" rx="2"/></svg><span class="tooltip-text">채우기 색상 선택 (Active)</span></button>';

        // 1x2 UniPalette Action Buttons (Right Side of Palette Grid)
        var openPaletteBtnHtml   = '<button class="tool-btn" onclick="window.open(\'https://iseohyun.github.io/UniPalette/\', \'_blank\')" style="width:34px; height:34px;"><span class="alt-badge">O</span><svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg><span class="tooltip-text">기본색상 정하기 (UniPalette 새탭)</span></button>';
        var importPaletteBtnHtml = '<button class="tool-btn" onclick="openPaletteModal()" style="width:34px; height:34px;"><span class="alt-badge">I</span><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span class="tooltip-text">기본색상 가져오기 (코드 붙여넣기)</span></button>';

        // 1. 색 Category Content
        var colorContent =
          '<div style="display:flex; flex-direction:row; align-items:center; gap:8px;">' +
            '<div style="display:flex; flex-direction:column; gap:4px;">' + strokeBtnHtml + fillBtnHtml + '</div>' +
            swatchGridHtml +
            '<div style="display:flex; flex-direction:column; gap:4px;">' + openPaletteBtnHtml + importPaletteBtnHtml + '</div>' +
          '</div>';

        // 2. 선 Category Content
        var curDashStyle = cfg.strokeDashStyle || 'solid';
        var curDashArray = cfg.strokeDashArray || '6,6';

        var solidLineBtn = '<button class="tool-btn ' + (curDashStyle==='solid'?'active':'') + '" onclick="setStrokeDashStyle(\'solid\')" style="width:34px; height:34px;"><svg viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="3"/></svg><span class="tooltip-text">선 모양: 실선</span></button>';
        var dashedLineBtn = '<button class="tool-btn ' + (curDashStyle==='dashed'?'active':'') + '" onclick="setStrokeDashStyle(\'dashed\')" style="width:34px; height:34px;"><svg viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="3" stroke-dasharray="4,3"/></svg><span class="tooltip-text">선 모양: 점선</span></button>';

        var lineContent =
          '<div style="display:flex; flex-direction:row; align-items:center; gap:8px;">' +
            '<div style="display:flex; flex-direction:column; align-items:center; gap:4px;">' +
              '<div style="display:flex; flex-direction:row; align-items:center; gap:4px;">' +
                '<label style="font-size:0.78rem; color:#475569; font-weight:600;">선 두께:</label>' +
                '<input type="number" min="1" max="50" value="' + cfg.strokeWidth + '" oninput="setStrokeWidth(this.value)" onchange="setStrokeWidth(this.value)" style="width:42px; padding:2px 4px; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:4px; text-align:center;">' +
              '</div>' +
              '<div style="display:flex; flex-direction:row; gap:4px;">' +
                '<button class="tool-btn" onclick="adjustStrokeWidth(1)" style="width:28px; height:24px;"><span class="alt-badge">+</span><svg viewBox="0 0 24 24" style="width:14px; height:14px;"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5"/></svg><span class="tooltip-text">선 두께 키우기 (+1)</span></button>' +
                '<button class="tool-btn" onclick="adjustStrokeWidth(-1)" style="width:28px; height:24px;"><span class="alt-badge">-</span><svg viewBox="0 0 24 24" style="width:14px; height:14px;"><path d="M5 12h14" stroke="currentColor" stroke-width="2.5"/></svg><span class="tooltip-text">선 두께 줄이기 (-1)</span></button>' +
              '</div>' +
            '</div>' +
            '<div style="width:1px; height:48px; background:#cbd5e1; margin:0 4px;"></div>' +
            '<div style="display:flex; flex-direction:column; align-items:center; gap:4px;">' +
              '<label style="font-size:0.78rem; color:#475569; font-weight:600;">선 종류:</label>' +
              '<div style="display:flex; flex-direction:row; gap:4px;">' + solidLineBtn + dashedLineBtn + '</div>' +
            '</div>' +
            '<div style="width:1px; height:48px; background:#cbd5e1; margin:0 4px;"></div>' +
            '<div style="display:flex; flex-direction:column; align-items:center; gap:4px;">' +
              '<label style="font-size:0.78rem; color:#475569; font-weight:600;">점선 패턴:</label>' +
              '<input type="text" value="' + curDashArray + '" placeholder="6,6" oninput="setStrokeDashArray(this.value)" style="width:65px; padding:2px 4px; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:4px; font-family:monospace; text-align:center;">' +
            '</div>' +
          '</div>';

        // 3. 선 끝 Category Content
        var curStartMarker = cfg.startMarker || 'none';
        var curEndMarker   = cfg.endMarker || 'none';
        var curStartFill   = cfg.startMarkerFillStyle || 'solid';
        var curEndFill     = cfg.endMarkerFillStyle || 'solid';

        var startNone = '<button class="tool-btn ' + (curStartMarker==='none'?'active':'') + '" onclick="setStartMarker(\'none\')" style="width:34px; height:34px;"><svg viewBox="0 0 24 24"><line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="2"/><line x1="4" y1="7" x2="4" y2="17" stroke="currentColor" stroke-width="2"/></svg><span class="tooltip-text">시작 모양: 없음</span></button>';
        var startArrow = '<button class="tool-btn ' + (curStartMarker==='arrow'?'active':'') + '" onclick="setStartMarker(\'arrow\')" style="width:34px; height:34px;"><svg viewBox="0 0 24 24"><line x1="21" y1="12" x2="8" y2="12" stroke="currentColor" stroke-width="2"/><path d="M10 6L4 12l6 6z" fill="currentColor"/></svg><span class="tooltip-text">시작 모양: 화살표 (왼쪽)</span></button>';
        var startCircle = '<button class="tool-btn ' + (curStartMarker==='circle'?'active':'') + '" onclick="setStartMarker(\'circle\')" style="width:34px; height:34px;"><svg viewBox="0 0 24 24"><line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" stroke-width="2"/><circle cx="6" cy="12" r="4" fill="currentColor"/></svg><span class="tooltip-text">시작 모양: 원 (왼쪽)</span></button>';
        var startDiamond = '<button class="tool-btn ' + (curStartMarker==='diamond'?'active':'') + '" onclick="setStartMarker(\'diamond\')" style="width:34px; height:34px;"><svg viewBox="0 0 24 24"><line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" stroke-width="2"/><path d="M6 7l4 5-4 5-4-5z" fill="currentColor"/></svg><span class="tooltip-text">시작 모양: 다이아몬드 (왼쪽)</span></button>';

        var startSolidBtn = '<button class="tool-btn ' + (curStartFill==='solid'?'active':'') + '" onclick="setStartMarkerFillStyle(\'solid\')" style="width:34px; height:34px;"><svg viewBox="0 0 24 24"><path d="M14 5L4 12l10 7z" fill="currentColor"/><line x1="14" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="2"/></svg><span class="tooltip-text">시작 마커: 꽉찬 모양</span></button>';
        var startHollowBtn = '<button class="tool-btn ' + (curStartFill==='hollow'?'active':'') + '" onclick="setStartMarkerFillStyle(\'hollow\')" style="width:34px; height:34px;"><svg viewBox="0 0 24 24"><path d="M14 5L4 12l10 7z" fill="#ffffff" stroke="currentColor" stroke-width="2"/><line x1="14" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="2"/></svg><span class="tooltip-text">시작 마커: 빈 모양 (테두리만)</span></button>';

        var startScalePlus = '<button class="tool-btn" onclick="scaleMarker(\'start\', 1.25)" style="width:34px; height:34px;"><span class="alt-badge">+</span><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5"/></svg><span class="tooltip-text">시작 마커 크기 키우기 (+)</span></button>';
        var startScaleMinus = '<button class="tool-btn" onclick="scaleMarker(\'start\', 0.8)" style="width:34px; height:34px;"><span class="alt-badge">-</span><svg viewBox="0 0 24 24"><path d="M5 12h14" stroke="currentColor" stroke-width="2.5"/></svg><span class="tooltip-text">시작 마커 크기 줄이기 (-)</span></button>';

        var endNone = '<button class="tool-btn ' + (curEndMarker==='none'?'active':'') + '" onclick="setEndMarker(\'none\')" style="width:34px; height:34px;"><svg viewBox="0 0 24 24"><line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="2"/><line x1="20" y1="7" x2="20" y2="17" stroke="currentColor" stroke-width="2"/></svg><span class="tooltip-text">끝 모양: 없음</span></button>';
        var endArrow = '<button class="tool-btn ' + (curEndMarker==='arrow'?'active':'') + '" onclick="setEndMarker(\'arrow\')" style="width:34px; height:34px;"><svg viewBox="0 0 24 24"><line x1="3" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2"/><path d="M14 6l6 6-6 6z" fill="currentColor"/></svg><span class="tooltip-text">끝 모양: 화살표 (오른쪽)</span></button>';
        var endCircle = '<button class="tool-btn ' + (curEndMarker==='circle'?'active':'') + '" onclick="setEndMarker(\'circle\')" style="width:34px; height:34px;"><svg viewBox="0 0 24 24"><line x1="3" y1="12" x2="15" y2="12" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="12" r="4" fill="currentColor"/></svg><span class="tooltip-text">끝 모양: 원 (오른쪽)</span></button>';
        var endDiamond = '<button class="tool-btn ' + (curEndMarker==='diamond'?'active':'') + '" onclick="setEndMarker(\'diamond\')" style="width:34px; height:34px;"><svg viewBox="0 0 24 24"><line x1="3" y1="12" x2="15" y2="12" stroke="currentColor" stroke-width="2"/><path d="M18 7l4 5-4 5-4-5z" fill="currentColor"/></svg><span class="tooltip-text">끝 모양: 다이아몬드 (오른쪽)</span></button>';

        var endSolidBtn = '<button class="tool-btn ' + (curEndFill==='solid'?'active':'') + '" onclick="setEndMarkerFillStyle(\'solid\')" style="width:34px; height:34px;"><svg viewBox="0 0 24 24"><path d="M10 5l10 7-10 7z" fill="currentColor"/><line x1="2" y1="12" x2="10" y2="12" stroke="currentColor" stroke-width="2"/></svg><span class="tooltip-text">끝 마커: 꽉찬 모양</span></button>';
        var endHollowBtn = '<button class="tool-btn ' + (curEndFill==='hollow'?'active':'') + '" onclick="setEndMarkerFillStyle(\'hollow\')" style="width:34px; height:34px;"><svg viewBox="0 0 24 24"><path d="M10 5l10 7-10 7z" fill="#ffffff" stroke="currentColor" stroke-width="2"/><line x1="2" y1="12" x2="10" y2="12" stroke="currentColor" stroke-width="2"/></svg><span class="tooltip-text">끝 마커: 빈 모양 (테두리만)</span></button>';

        var endScalePlus = '<button class="tool-btn" onclick="scaleMarker(\'end\', 1.25)" style="width:34px; height:34px;"><span class="alt-badge">+</span><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5"/></svg><span class="tooltip-text">끝 마커 크기 키우기 (+)</span></button>';
        var endScaleMinus = '<button class="tool-btn" onclick="scaleMarker(\'end\', 0.8)" style="width:34px; height:34px;"><span class="alt-badge">-</span><svg viewBox="0 0 24 24"><path d="M5 12h14" stroke="currentColor" stroke-width="2.5"/></svg><span class="tooltip-text">끝 마커 크기 줄이기 (-)</span></button>';

        var lineEndsContent =
          '<div style="display:flex; flex-direction:column; gap:4px; justify-content:center;">' +
            '<div style="display:flex; flex-direction:row; align-items:center; gap:4px;">' +
              '<div style="display:flex; flex-direction:row; gap:2px;">' + startNone + startArrow + startCircle + startDiamond + '</div>' +
              '<div style="width:1px; height:28px; background:#cbd5e1; margin:0 3px;"></div>' +
              '<div style="display:flex; flex-direction:row; gap:2px;">' + startSolidBtn + startHollowBtn + '</div>' +
              '<div style="width:1px; height:28px; background:#cbd5e1; margin:0 3px;"></div>' +
              '<div style="display:flex; flex-direction:row; gap:2px;">' + startScalePlus + startScaleMinus + '</div>' +
            '</div>' +
            '<div style="display:flex; flex-direction:row; align-items:center; gap:4px;">' +
              '<div style="display:flex; flex-direction:row; gap:2px;">' + endNone + endArrow + endCircle + endDiamond + '</div>' +
              '<div style="width:1px; height:28px; background:#cbd5e1; margin:0 3px;"></div>' +
              '<div style="display:flex; flex-direction:row; gap:2px;">' + endSolidBtn + endHollowBtn + '</div>' +
              '<div style="width:1px; height:28px; background:#cbd5e1; margin:0 3px;"></div>' +
              '<div style="display:flex; flex-direction:row; gap:2px;">' + endScalePlus + endScaleMinus + '</div>' +
            '</div>' +
          '</div>';

        // 4. 마감 Category Content (Cap & Join)
        var curCap = cfg.strokeCap || 'butt';
        var curJoin = cfg.strokeJoin || 'miter';

        // Magnified Cap Icons with Red Endpoint/Center Dot & Guideline
        var capButtIcon =
          '<svg viewBox="0 0 24 24" style="width:26px; height:26px;">' +
            '<line x1="2" y1="12" x2="13" y2="12" stroke="currentColor" stroke-width="12" stroke-linecap="butt"/>' +
            '<line x1="13" y1="2" x2="13" y2="22" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="2,2"/>' +
            '<circle cx="13" cy="12" r="2.5" fill="#ef4444" stroke="#ffffff" stroke-width="0.8"/>' +
          '</svg>';

        var capRoundIcon =
          '<svg viewBox="0 0 24 24" style="width:26px; height:26px;">' +
            '<line x1="2" y1="12" x2="13" y2="12" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>' +
            '<line x1="13" y1="2" x2="13" y2="22" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="2,2"/>' +
            '<circle cx="13" cy="12" r="2.5" fill="#ef4444" stroke="#ffffff" stroke-width="0.8"/>' +
          '</svg>';

        var capSquareIcon =
          '<svg viewBox="0 0 24 24" style="width:26px; height:26px;">' +
            '<line x1="2" y1="12" x2="13" y2="12" stroke="currentColor" stroke-width="12" stroke-linecap="square"/>' +
            '<line x1="13" y1="2" x2="13" y2="22" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="2,2"/>' +
            '<circle cx="13" cy="12" r="2.5" fill="#ef4444" stroke="#ffffff" stroke-width="0.8"/>' +
          '</svg>';

        var capButtBtn = '<button class="tool-btn ' + (curCap==='butt'?'active':'') + '" onclick="setStrokeCap(\'butt\')" style="width:34px; height:34px;">' + capButtIcon + '<span class="tooltip-text">선 마감: 평평함 (Butt - 중심점에서 딱 끎)</span></button>';
        var capRoundBtn = '<button class="tool-btn ' + (curCap==='round'?'active':'') + '" onclick="setStrokeCap(\'round\')" style="width:34px; height:34px;">' + capRoundIcon + '<span class="tooltip-text">선 마감: 둥글게 (Round - 중심점 밖 둥근 돌출)</span></button>';
        var capSquareBtn = '<button class="tool-btn ' + (curCap==='square'?'active':'') + '" onclick="setStrokeCap(\'square\')" style="width:34px; height:34px;">' + capSquareIcon + '<span class="tooltip-text">선 마감: 사각형 (Square - 중심점 밖 직각 돌출)</span></button>';

        // Magnified Join Icons with Red Corner Point Highlight
        var joinMiterIcon =
          '<svg viewBox="0 0 24 24" style="width:26px; height:26px;">' +
            '<path d="M 3 21 L 12 5 L 21 21" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="miter" stroke-linecap="butt"/>' +
            '<circle cx="12" cy="5" r="2.5" fill="#ef4444" stroke="#ffffff" stroke-width="0.8"/>' +
          '</svg>';

        var joinRoundIcon =
          '<svg viewBox="0 0 24 24" style="width:26px; height:26px;">' +
            '<path d="M 3 21 L 12 5 L 21 21" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/>' +
            '<circle cx="12" cy="7" r="2.5" fill="#ef4444" stroke="#ffffff" stroke-width="0.8"/>' +
          '</svg>';

        var joinBevelIcon =
          '<svg viewBox="0 0 24 24" style="width:26px; height:26px;">' +
            '<path d="M 3 21 L 12 5 L 21 21" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="bevel" stroke-linecap="butt"/>' +
            '<circle cx="12" cy="8" r="2.5" fill="#ef4444" stroke="#ffffff" stroke-width="0.8"/>' +
          '</svg>';

        var joinMiterBtn = '<button class="tool-btn ' + (curJoin==='miter'?'active':'') + '" onclick="setStrokeJoin(\'miter\')" style="width:34px; height:34px;">' + joinMiterIcon + '<span class="tooltip-text">모서리 마감: 뾰족함 (Miter - 날카로운 모서리)</span></button>';
        var joinRoundBtn = '<button class="tool-btn ' + (curJoin==='round'?'active':'') + '" onclick="setStrokeJoin(\'round\')" style="width:34px; height:34px;">' + joinRoundIcon + '<span class="tooltip-text">모서리 마감: 둥글게 (Round - 부드러운 곡선 모서리)</span></button>';
        var joinBevelBtn = '<button class="tool-btn ' + (curJoin==='bevel'?'active':'') + '" onclick="setStrokeJoin(\'bevel\')" style="width:34px; height:34px;">' + joinBevelIcon + '<span class="tooltip-text">모서리 마감: 깎임 (Bevel - 깎인 평평한 모서리)</span></button>';

        var capJoinContent =
          '<div style="display:flex; flex-direction:column; gap:4px; justify-content:center;">' +
            '<div style="display:flex; flex-direction:row; align-items:center; gap:6px;">' +
              '<span style="font-size:0.75rem; color:#475569; font-weight:600; min-width:32px;">끝:</span>' +
              '<div style="display:flex; flex-direction:row; gap:3px;">' + capButtBtn + capRoundBtn + capSquareBtn + '</div>' +
            '</div>' +
            '<div style="display:flex; flex-direction:row; align-items:center; gap:6px;">' +
              '<span style="font-size:0.75rem; color:#475569; font-weight:600; min-width:32px;">꺾임:</span>' +
              '<div style="display:flex; flex-direction:row; gap:3px;">' + joinMiterBtn + joinRoundBtn + joinBevelBtn + '</div>' +
            '</div>' +
          '</div>';

        ribbonBar.innerHTML =
          buildCategoryHtml('style_color', '색', colorContent) +
          buildCategoryHtml('style_line', '선', lineContent) +
          buildCategoryHtml('style_lineEnds', '선 끝', lineEndsContent) +
          buildCategoryHtml('style_capJoin', '마감', capJoinContent);
      } else if (cfg.currentTab === 'text') {
        var textContent =
          '<div class="category-grid" style="grid-template-columns: 34px;">' +
            '<button class="tool-btn" onclick="addTextObject()"><span class="alt-badge">T</span><svg viewBox="0 0 24 24"><path d="M4 7V4h16v3M12 4v16M9 20h6"/></svg><span class="tooltip-text">텍스트 상자 추가</span></button>' +
          '</div>';
        ribbonBar.innerHTML = buildCategoryHtml('text_font', '글 서식', textContent);
      } else if (cfg.currentTab === 'anim') {
        var animContent =
          '<div class="category-grid" style="grid-template-columns: 34px 34px;">' +
            '<button class="tool-btn" onclick="playAnimation(\'draw\')"><span class="alt-badge">P</span><svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg><span class="tooltip-text">선 그리기 애니메이션</span></button>' +
            '<button class="tool-btn" onclick="playAnimation(\'fade\')"><span class="alt-badge">F</span><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke-dasharray="4,4"/></svg><span class="tooltip-text">페이드 나타나기</span></button>' +
          '</div>';
        ribbonBar.innerHTML = buildCategoryHtml('anim_preview', '애니메이션 미리보기', animContent);
      }
    }

    
  window.WebpointerRenderRibbon = {
    getOutermostGroupEl: getOutermostGroupEl,
    build3RowGridHtml: build3RowGridHtml,
    buildCategoryHtml: buildCategoryHtml,
    renderRibbon: renderRibbon
  };
})(window);
