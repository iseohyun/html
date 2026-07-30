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
    var ribbonBar = document.getElementById('ribbonBar') || document.getElementById('ribbonContainer');
    if (!ribbonBar) return;
    var self = this;
    var icons = window.WebpointerIcons || {};

    if (cfg.currentTab === 'insert') {
      var shapeTools = [
        '<button class="tool-btn ' + (cfg.currentTool==='select'?'active':'') + '" onclick="setTool(\'select\')"><span class="alt-badge">V</span>' + (icons.select || '') + '<span class="tooltip-text">선택 도구 (V)</span></button>',
        '<button class="tool-btn ' + (cfg.currentTool==='text'?'active':'') + '" onclick="setTool(\'text\')"><span class="alt-badge">T</span>' + (icons.addText || '') + '<span class="tooltip-text">텍스트 상자 도구 (T)</span></button>',
        '<button class="tool-btn ' + (cfg.currentTool==='point'?'active':'') + '" onclick="setTool(\'point\')"><span class="alt-badge">P</span>' + (icons.point || '') + '<span class="tooltip-text">점 도구 (P)</span></button>',
        '<button class="tool-btn ' + (cfg.currentTool==='line'?'active':'') + '" onclick="setTool(\'line\')"><span class="alt-badge">L</span>' + (icons.line || '') + '<span class="tooltip-text">직선 도구 (L)</span></button>',
        '<button class="tool-btn ' + (cfg.currentTool==='rect'?'active':'') + '" onclick="setTool(\'rect\')"><span class="alt-badge">R</span>' + (icons.rect || '') + '<span class="tooltip-text">직사각형 도구 (R)</span></button>',
        '<button class="tool-btn ' + (cfg.currentTool==='rounded'?'active':'') + '" onclick="setTool(\'rounded\')"><span class="alt-badge">U</span>' + (icons.rounded || '') + '<span class="tooltip-text">둥근 사각형 도구 (U)</span></button>',
        '<button class="tool-btn ' + (cfg.currentTool==='ellipse'?'active':'') + '" onclick="setTool(\'ellipse\')"><span class="alt-badge">E</span>' + (icons.ellipse || '') + '<span class="tooltip-text">타원/원 도구 (E)</span></button>',
        '<button class="tool-btn ' + (cfg.currentTool==='arc'?'active':'') + '" onclick="setTool(\'arc\')"><span class="alt-badge">A</span>' + (icons.arc || '') + '<span class="tooltip-text">호 도구 (A)</span></button>',
        '<button class="tool-btn ' + (cfg.currentTool==='bez2'?'active':'') + '" onclick="setTool(\'bez2\')"><span class="alt-badge">Q</span>' + (icons.bez2 || '') + '<span class="tooltip-text">2차 베지어 곡선 (Q)</span></button>',
        '<button class="tool-btn ' + (cfg.currentTool==='bez3'?'active':'') + '" onclick="setTool(\'bez3\')"><span class="alt-badge">C</span>' + (icons.bez3 || '') + '<span class="tooltip-text">3차 베지어 곡선 (C)</span></button>'
      ];

      var layerTools = [
        '<button class="tool-btn" onclick="bringToFront()"><span class="alt-badge">Shift+]</span>' + (icons.bringToFront || '') + '<span class="tooltip-text">맨 앞으로 가져오기</span></button>',
        '<button class="tool-btn" onclick="bringForward()"><span class="alt-badge">]</span>' + (icons.bringForward || '') + '<span class="tooltip-text">앞으로 가져오기</span></button>',
        '<button class="tool-btn" onclick="sendBackward()"><span class="alt-badge">[</span>' + (icons.sendBackward || '') + '<span class="tooltip-text">뒤로 보내기</span></button>',
        '<button class="tool-btn" onclick="sendToBack()"><span class="alt-badge">Shift+[</span>' + (icons.sendToBack || '') + '<span class="tooltip-text">맨 뒤로 보내기</span></button>'
      ];

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
        '<button class="tool-btn ' + (canGroup ? '' : 'disabled') + '" ' + (canGroup ? 'onclick="groupSelected()"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">G</span>' + (icons.group || '') + '<span class="tooltip-text">' + (canGroup ? '그룹화 (<g>)' : '그룹화 (독립 단위 2개 이상 선택 필요)') + '</span></button>',
        '<button class="tool-btn ' + (canUngroup ? '' : 'disabled') + '" ' + (canUngroup ? 'onclick="ungroupSelected()"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">U</span>' + (icons.ungroup || '') + '<span class="tooltip-text">' + (canUngroup ? '그룹 해제' : '그룹 해제 (그룹 객체 선택 필요)') + '</span></button>'
      ];

      var alignTools = [
        '<button class="tool-btn ' + (canAlign2 ? '' : 'disabled') + '" ' + (canAlign2 ? 'onclick="alignSelected(\'left\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">Alt+L</span>' + (icons.alignLeft || '') + '<span class="tooltip-text">' + (canAlign2 ? '왼쪽 정렬' : '왼쪽 정렬 (독립 단위 2개 이상 필요)') + '</span></button>',
        '<button class="tool-btn ' + (canAlign2 ? '' : 'disabled') + '" ' + (canAlign2 ? 'onclick="alignSelected(\'hcenter\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">Alt+C</span>' + (icons.alignHcenter || '') + '<span class="tooltip-text">' + (canAlign2 ? '가로 중앙 정렬' : '가로 중앙 정렬 (독립 단위 2개 이상 필요)') + '</span></button>',
        '<button class="tool-btn ' + (canAlign2 ? '' : 'disabled') + '" ' + (canAlign2 ? 'onclick="alignSelected(\'right\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">Alt+R</span>' + (icons.alignRight || '') + '<span class="tooltip-text">' + (canAlign2 ? '오른쪽 정렬' : '오른쪽 정렬 (독립 단위 2개 이상 필요)') + '</span></button>',
        '<button class="tool-btn ' + (canAlign2 ? '' : 'disabled') + '" ' + (canAlign2 ? 'onclick="alignSelected(\'top\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">Alt+T</span>' + (icons.alignTop || '') + '<span class="tooltip-text">' + (canAlign2 ? '위쪽 정렬' : '위쪽 정렬 (독립 단위 2개 이상 필요)') + '</span></button>',
        '<button class="tool-btn ' + (canAlign2 ? '' : 'disabled') + '" ' + (canAlign2 ? 'onclick="alignSelected(\'vcenter\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">Alt+M</span>' + (icons.alignVcenter || '') + '<span class="tooltip-text">' + (canAlign2 ? '세로 중앙 정렬' : '세로 중앙 정렬 (독립 단위 2개 이상 필요)') + '</span></button>',
        '<button class="tool-btn ' + (canAlign2 ? '' : 'disabled') + '" ' + (canAlign2 ? 'onclick="alignSelected(\'bottom\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">Alt+B</span>' + (icons.alignBottom || '') + '<span class="tooltip-text">' + (canAlign2 ? '아래쪽 정렬' : '아래쪽 정렬 (독립 단위 2개 이상 필요)') + '</span></button>',
        '<button class="tool-btn ' + (canAlign3 ? '' : 'disabled') + '" ' + (canAlign3 ? 'onclick="alignSelected(\'hspace\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">Alt+H</span>' + (icons.alignHspace || '') + '<span class="tooltip-text">' + (canAlign3 ? '가로 간격 동일하게' : '가로 간격 동일하게 (독립 단위 3개 이상 필요)') + '</span></button>',
        '<button class="tool-btn ' + (canAlign3 ? '' : 'disabled') + '" ' + (canAlign3 ? 'onclick="alignSelected(\'vspace\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">Alt+V</span>' + (icons.alignVspace || '') + '<span class="tooltip-text">' + (canAlign3 ? '세로 간격 동일하게' : '세로 간격 동일하게 (독립 단위 3개 이상 필요)') + '</span></button>'
      ];

      var transformTools = [
        '<button class="tool-btn ' + (canTransform ? '' : 'disabled') + '" ' + (canTransform ? 'onclick="transformSelected(\'flipH\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">F</span>' + (icons.flipH || '') + '<span class="tooltip-text">' + (canTransform ? '좌우 대칭' : '좌우 대칭 (객체 선택 필요)') + '</span></button>',
        '<button class="tool-btn ' + (canTransform ? '' : 'disabled') + '" ' + (canTransform ? 'onclick="transformSelected(\'flipV\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">K</span>' + (icons.flipV || '') + '<span class="tooltip-text">' + (canTransform ? '상하 대칭' : '상하 대칭 (객체 선택 필요)') + '</span></button>',
        '<button class="tool-btn ' + (canTransform ? '' : 'disabled') + '" ' + (canTransform ? 'onclick="transformSelected(\'rotate90\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">R</span>' + (icons.rotate90 || '') + '<span class="tooltip-text">' + (canTransform ? '90도 회전 (시계방향)' : '90도 회전 (객체 선택 필요)') + '</span></button>',
        '<button class="tool-btn ' + (canTransform ? '' : 'disabled') + '" ' + (canTransform ? 'onclick="transformSelected(\'rotateNeg90\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">L</span>' + (icons.rotateNeg90 || '') + '<span class="tooltip-text">' + (canTransform ? '-90도 회전 (반시계방향)' : '-90도 회전 (객체 선택 필요)') + '</span></button>'
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

      var strokeBtnHtml = '<button class="tool-btn ' + (isStrokeActive ? 'active' : '') + '" onclick="setActiveColorTarget(\'stroke\')" style="width:34px; height:34px;"><span class="alt-badge">S</span>' + (icons.targetStroke || '') + '<span class="tooltip-text">테두리 색상 선택 (Active)</span></button>';
      var fillBtnHtml   = '<button class="tool-btn ' + (isFillActive ? 'active' : '') + '" onclick="setActiveColorTarget(\'fill\')" style="width:34px; height:34px;"><span class="alt-badge">F</span>' + (icons.targetFill || '') + '<span class="tooltip-text">채우기 색상 선택 (Active)</span></button>';

      var openPaletteBtnHtml   = '<button class="tool-btn" onclick="window.open(\'https://iseohyun.github.io/UniPalette/\', \'_blank\')" style="width:34px; height:34px;"><span class="alt-badge">O</span>' + (icons.openPalette || '') + '<span class="tooltip-text">기본색상 정하기 (UniPalette 새탭)</span></button>';
      var importPaletteBtnHtml = '<button class="tool-btn" onclick="openPaletteModal()" style="width:34px; height:34px;"><span class="alt-badge">I</span>' + (icons.importPalette || '') + '<span class="tooltip-text">기본색상 가져오기 (코드 붙여넣기)</span></button>';

      var colorContent =
        '<div style="display:flex; flex-direction:row; align-items:center; gap:8px;">' +
          '<div style="display:flex; flex-direction:column; gap:4px;">' + strokeBtnHtml + fillBtnHtml + '</div>' +
          swatchGridHtml +
          '<div style="display:flex; flex-direction:column; gap:4px;">' + openPaletteBtnHtml + importPaletteBtnHtml + '</div>' +
        '</div>';

      var curDashStyle = cfg.strokeDashStyle || 'solid';
      var curDashArray = cfg.strokeDashArray || '6,6';

      var solidLineBtn = '<button class="tool-btn ' + (curDashStyle==='solid'?'active':'') + '" onclick="setStrokeDashStyle(\'solid\')" style="width:34px; height:34px;">' + (icons.lineSolid || '') + '<span class="tooltip-text">선 모양: 실선</span></button>';
      var dashedLineBtn = '<button class="tool-btn ' + (curDashStyle==='dashed'?'active':'') + '" onclick="setStrokeDashStyle(\'dashed\')" style="width:34px; height:34px;">' + (icons.lineDashed || '') + '<span class="tooltip-text">선 모양: 점선</span></button>';

      var lineContent =
        '<div style="display:flex; flex-direction:row; align-items:center; gap:8px;">' +
          '<div style="display:flex; flex-direction:column; align-items:center; gap:4px;">' +
            '<div style="display:flex; flex-direction:row; align-items:center; gap:4px;">' +
              '<label style="font-size:0.78rem; color:#475569; font-weight:600;">선 두께:</label>' +
              '<input type="number" min="1" max="50" value="' + cfg.strokeWidth + '" oninput="setStrokeWidth(this.value)" onchange="setStrokeWidth(this.value)" style="width:42px; padding:2px 4px; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:4px; text-align:center;">' +
            '</div>' +
            '<div style="display:flex; flex-direction:row; gap:4px;">' +
              '<button class="tool-btn" onclick="adjustStrokeWidth(1)" style="width:28px; height:24px;"><span class="alt-badge">+</span>' + (icons.markerPlus || '') + '<span class="tooltip-text">선 두께 키우기 (+1)</span></button>' +
              '<button class="tool-btn" onclick="adjustStrokeWidth(-1)" style="width:28px; height:24px;"><span class="alt-badge">-</span>' + (icons.markerMinus || '') + '<span class="tooltip-text">선 두께 줄이기 (-1)</span></button>' +
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

      var curStartMarker = cfg.startMarker || 'none';
      var curEndMarker   = cfg.endMarker || 'none';
      var curStartFill   = cfg.startMarkerFillStyle || 'solid';
      var curEndFill     = cfg.endMarkerFillStyle || 'solid';

      var startNone = '<button class="tool-btn ' + (curStartMarker==='none'?'active':'') + '" onclick="setStartMarker(\'none\')" style="width:34px; height:34px;">' + (icons.startNone || '') + '<span class="tooltip-text">시작 모양: 없음</span></button>';
      var startArrow = '<button class="tool-btn ' + (curStartMarker==='arrow'?'active':'') + '" onclick="setStartMarker(\'arrow\')" style="width:34px; height:34px;">' + (icons.startArrow || '') + '<span class="tooltip-text">시작 모양: 화살표 (왼쪽)</span></button>';
      var startCircle = '<button class="tool-btn ' + (curStartMarker==='circle'?'active':'') + '" onclick="setStartMarker(\'circle\')" style="width:34px; height:34px;">' + (icons.startCircle || '') + '<span class="tooltip-text">시작 모양: 원 (왼쪽)</span></button>';
      var startDiamond = '<button class="tool-btn ' + (curStartMarker==='diamond'?'active':'') + '" onclick="setStartMarker(\'diamond\')" style="width:34px; height:34px;">' + (icons.startDiamond || '') + '<span class="tooltip-text">시작 모양: 다이아몬드 (왼쪽)</span></button>';

      var startSolidBtn = '<button class="tool-btn ' + (curStartFill==='solid'?'active':'') + '" onclick="setStartMarkerFillStyle(\'solid\')" style="width:34px; height:34px;">' + (icons.startSolid || '') + '<span class="tooltip-text">시작 마커: 꽉찬 모양</span></button>';
      var startHollowBtn = '<button class="tool-btn ' + (curStartFill==='hollow'?'active':'') + '" onclick="setStartMarkerFillStyle(\'hollow\')" style="width:34px; height:34px;">' + (icons.startHollow || '') + '<span class="tooltip-text">시작 마커: 빈 모양 (테두리만)</span></button>';

      var startScalePlus = '<button class="tool-btn" onclick="scaleMarker(\'start\', 1.25)" style="width:34px; height:34px;"><span class="alt-badge">+</span>' + (icons.markerPlus || '') + '<span class="tooltip-text">시작 마커 크기 키우기 (+)</span></button>';
      var startScaleMinus = '<button class="tool-btn" onclick="scaleMarker(\'start\', 0.8)" style="width:34px; height:34px;"><span class="alt-badge">-</span>' + (icons.markerMinus || '') + '<span class="tooltip-text">시작 마커 크기 줄이기 (-)</span></button>';

      var endNone = '<button class="tool-btn ' + (curEndMarker==='none'?'active':'') + '" onclick="setEndMarker(\'none\')" style="width:34px; height:34px;">' + (icons.endNone || '') + '<span class="tooltip-text">끝 모양: 없음</span></button>';
      var endArrow = '<button class="tool-btn ' + (curEndMarker==='arrow'?'active':'') + '" onclick="setEndMarker(\'arrow\')" style="width:34px; height:34px;">' + (icons.endArrow || '') + '<span class="tooltip-text">끝 모양: 화살표 (오른쪽)</span></button>';
      var endCircle = '<button class="tool-btn ' + (curEndMarker==='circle'?'active':'') + '" onclick="setEndMarker(\'circle\')" style="width:34px; height:34px;">' + (icons.endCircle || '') + '<span class="tooltip-text">끝 모양: 원 (오른쪽)</span></button>';
      var endDiamond = '<button class="tool-btn ' + (curEndMarker==='diamond'?'active':'') + '" onclick="setEndMarker(\'diamond\')" style="width:34px; height:34px;">' + (icons.endDiamond || '') + '<span class="tooltip-text">끝 모양: 다이아몬드 (오른쪽)</span></button>';

      var endSolidBtn = '<button class="tool-btn ' + (curEndFill==='solid'?'active':'') + '" onclick="setEndMarkerFillStyle(\'solid\')" style="width:34px; height:34px;">' + (icons.endSolid || '') + '<span class="tooltip-text">끝 마커: 꽉찬 모양</span></button>';
      var endHollowBtn = '<button class="tool-btn ' + (curEndFill==='hollow'?'active':'') + '" onclick="setEndMarkerFillStyle(\'hollow\')" style="width:34px; height:34px;">' + (icons.endHollow || '') + '<span class="tooltip-text">끝 마커: 빈 모양 (테두리만)</span></button>';

      var endScalePlus = '<button class="tool-btn" onclick="scaleMarker(\'end\', 1.25)" style="width:34px; height:34px;"><span class="alt-badge">+</span>' + (icons.markerPlus || '') + '<span class="tooltip-text">끝 마커 크기 키우기 (+)</span></button>';
      var endScaleMinus = '<button class="tool-btn" onclick="scaleMarker(\'end\', 0.8)" style="width:34px; height:34px;"><span class="alt-badge">-</span>' + (icons.markerMinus || '') + '<span class="tooltip-text">끝 마커 크기 줄이기 (-)</span></button>';

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

      var curCap = cfg.strokeCap || 'butt';
      var curJoin = cfg.strokeJoin || 'miter';

      var capButtBtn = '<button class="tool-btn ' + (curCap==='butt'?'active':'') + '" onclick="setStrokeCap(\'butt\')" style="width:34px; height:34px;">' + (icons.capButt || '') + '<span class="tooltip-text">선 마감: 평평함 (Butt - 중심점에서 딱 끎)</span></button>';
      var capRoundBtn = '<button class="tool-btn ' + (curCap==='round'?'active':'') + '" onclick="setStrokeCap(\'round\')" style="width:34px; height:34px;">' + (icons.capRound || '') + '<span class="tooltip-text">선 마감: 둥글게 (Round - 중심점 밖 둥근 돌출)</span></button>';
      var capSquareBtn = '<button class="tool-btn ' + (curCap==='square'?'active':'') + '" onclick="setStrokeCap(\'square\')" style="width:34px; height:34px;">' + (icons.capSquare || '') + '<span class="tooltip-text">선 마감: 사각형 (Square - 중심점 밖 직각 돌출)</span></button>';

      var joinMiterBtn = '<button class="tool-btn ' + (curJoin==='miter'?'active':'') + '" onclick="setStrokeJoin(\'miter\')" style="width:34px; height:34px;">' + (icons.joinMiter || '') + '<span class="tooltip-text">모서리 마감: 뾰족함 (Miter - 날카로운 모서리)</span></button>';
      var joinRoundBtn = '<button class="tool-btn ' + (curJoin==='round'?'active':'') + '" onclick="setStrokeJoin(\'round\')" style="width:34px; height:34px;">' + (icons.joinRound || '') + '<span class="tooltip-text">모서리 마감: 둥글게 (Round - 부드러운 곡선 모서리)</span></button>';
      var joinBevelBtn = '<button class="tool-btn ' + (curJoin==='bevel'?'active':'') + '" onclick="setStrokeJoin(\'bevel\')" style="width:34px; height:34px;">' + (icons.joinBevel || '') + '<span class="tooltip-text">모서리 마감: 깎임 (Bevel - 깎인 평평한 모서리)</span></button>';

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
      var curFontFamily = cfg.fontFamily || 'sans-serif';
      var curFontSize = cfg.fontSize || 20;
      var curFontWeight = cfg.fontWeight || 'normal';
      var curFontStyle = cfg.fontStyle || 'normal';
      var curTextAnchor = cfg.textAnchor || 'start';

      var systemFonts = cfg.systemFonts || [
        "맑은 고딕", "나눔고딕", "나눔명조", "굴림", "돋움", "바탕", "궁서",
        "Arial", "Calibri", "Comic Sans MS", "Consolas", "Courier New", "Georgia",
        "Impact", "Segoe UI", "Tahoma", "Times New Roman", "Trebuchet MS", "Verdana",
        "sans-serif", "serif", "monospace"
      ];

      var fontOptionsStr = systemFonts.map(function(fName) {
        var isSel = (curFontFamily === fName) ? 'selected' : '';
        return '<option value="' + fName + '" ' + isSel + '>' + fName + '</option>';
      }).join('');

      var isBoldActive = (curFontWeight === 'bold' || parseInt(curFontWeight, 10) >= 600);
      var isItalicActive = (curFontStyle === 'italic' || curFontStyle === 'oblique');
      var isStrikethroughActive = (cfg.textDecoration === 'line-through');

      var boldBtnHtml =
        '<button class="tool-btn ' + (isBoldActive ? 'active' : '') + '" onclick="toggleTextBold()" onmousedown="startHoldWeight(event, this)" onmouseup="endHoldWeight()" onmouseleave="endHoldWeight()" style="width:34px; height:34px; font-weight:bold; font-size:1.1rem; font-family:serif;">' +
          'B' +
          '<span class="tooltip-text">글자 두께 (클릭: Bold, 길게누르기: 100~900)</span>' +
        '</button>';

      var italicBtnHtml =
        '<button class="tool-btn ' + (isItalicActive ? 'active' : '') + '" onclick="toggleTextItalic()" onmousedown="startHoldStyle(event, this)" onmouseup="endHoldStyle()" onmouseleave="endHoldStyle()" style="width:34px; height:34px; font-style:italic; font-size:1.1rem; font-family:serif;">' +
          'I' +
          '<span class="tooltip-text">글자 기울임 (클릭: Italic, 길게누르기: 옵션)</span>' +
        '</button>';

      var strikethroughBtnHtml =
        '<button class="tool-btn ' + (isStrikethroughActive ? 'active' : '') + '" onclick="toggleTextStrikethrough()" style="width:34px; height:34px;">' +
          (icons.strikethrough || 'S') +
          '<span class="tooltip-text">취소선</span>' +
        '</button>';

      var lineHeightBtnHtml =
        '<button class="tool-btn" onclick="toggleTextLineHeight()" onmousedown="startHoldLineHeight(event, this)" onmouseup="endHoldLineHeight()" onmouseleave="endHoldLineHeight()" style="width:34px; height:34px;">' +
          (icons.lineHeight || '↕') +
          '<span class="tooltip-text">줄간격 (클릭: 1.2/1.5 토글, 길게누르기: 선택)</span>' +
        '</button>';

      var alignLeftBtnHtml =
        '<button class="tool-btn ' + (curTextAnchor==='start'?'active':'') + '" onclick="setTextAnchor(\'start\')" style="width:34px; height:34px;">' +
          (icons.alignTextLeft || '') +
          '<span class="tooltip-text">왼쪽 맞춤</span>' +
        '</button>';

      var alignCenterBtnHtml =
        '<button class="tool-btn ' + (curTextAnchor==='middle'?'active':'') + '" onclick="setTextAnchor(\'middle\')" style="width:34px; height:34px;">' +
          (icons.alignTextCenter || '') +
          '<span class="tooltip-text">가운데 맞춤</span>' +
        '</button>';

      var alignRightBtnHtml =
        '<button class="tool-btn ' + (curTextAnchor==='end'?'active':'') + '" onclick="setTextAnchor(\'end\')" style="width:34px; height:34px;">' +
          (icons.alignTextRight || '') +
          '<span class="tooltip-text">오른쪽 맞춤</span>' +
        '</button>';

      var alignJustifyBtnHtml =
        '<button class="tool-btn" onclick="setTextAnchor(\'start\')" style="width:34px; height:34px;">' +
          (icons.alignTextJustify || '') +
          '<span class="tooltip-text">양쪽 맞춤</span>' +
        '</button>';

      var fontOptionsHtml =
        '<div style="display:flex; flex-direction:row; align-items:center; gap:8px;">' +
          '<div style="display:flex; flex-direction:column; gap:4px;">' +
            '<div style="display:flex; flex-direction:row; align-items:center; gap:4px;">' +
              '<select onfocus="fetchLocalSystemFonts()" onchange="setTextFontFamily(this.value)" style="max-width:130px; padding:2px 4px; font-size:0.78rem; border:1px solid #cbd5e1; border-radius:4px;">' +
                fontOptionsStr +
              '</select>' +
              '<input type="number" min="8" max="200" value="' + curFontSize + '" oninput="setTextFontSize(this.value)" onchange="setTextFontSize(this.value)" style="width:45px; padding:2px 4px; font-size:0.78rem; border:1px solid #cbd5e1; border-radius:4px; text-align:center;">' +
              '<div style="width:1px; height:24px; background:#cbd5e1; margin:0 2px;"></div>' +
              lineHeightBtnHtml +
              strikethroughBtnHtml +
            '</div>' +
            '<div style="display:flex; flex-direction:row; align-items:center; gap:4px;">' +
              boldBtnHtml +
              italicBtnHtml +
              '<div style="width:1px; height:24px; background:#cbd5e1; margin:0 2px;"></div>' +
              alignLeftBtnHtml +
              alignCenterBtnHtml +
              alignRightBtnHtml +
              alignJustifyBtnHtml +
            '</div>' +
          '</div>' +
        '</div>';

      // Swatch grid for Text Colors
      var userColors = (cfg.customPalette || []).slice();
      while (userColors.length < 24) {
        userColors.push(default24Colors[userColors.length % default24Colors.length]);
      }

      var textColorSwatchGrid = '<div style="display:grid; grid-template-columns:repeat(9, 24px); grid-template-rows:repeat(3, 24px); gap:0; border:1px solid #cbd5e1; border-radius:4px; overflow:hidden; margin:0; padding:0;">';
      var userIdx = 0;

      for (var slot = 1; slot <= 27; slot++) {
        if (slot === 9) {
          textColorSwatchGrid += '<div style="width:24px; height:24px; box-sizing:border-box; border:1px solid rgba(0,0,0,0.08); background:#ffffff; cursor:pointer;" onclick="applyPaletteColor(\'#ffffff\')" title="흰색 (#ffffff)"></div>';
        } else if (slot === 18) {
          textColorSwatchGrid += '<div style="width:24px; height:24px; box-sizing:border-box; border:1px solid rgba(0,0,0,0.08); background:#000000; cursor:pointer;" onclick="applyPaletteColor(\'#000000\')" title="검정색 (#000000)"></div>';
        } else if (slot === 27) {
          textColorSwatchGrid += '<div style="width:24px; height:24px; box-sizing:border-box; border:1px solid rgba(0,0,0,0.08); background:#ffffff; cursor:pointer; position:relative;" onclick="applyPaletteColor(\'none\')" title="투명색 (none)"><svg viewBox="0 0 24 24" style="width:100%; height:100%; display:block;"><line x1="0" y1="24" x2="24" y2="0" stroke="#ef4444" stroke-width="2.5"/></svg></div>';
        } else {
          var hex = userColors[userIdx++] || '#041e49';
          textColorSwatchGrid += '<div style="width:24px; height:24px; box-sizing:border-box; border:1px solid rgba(0,0,0,0.08); background:' + hex + '; cursor:pointer;" onclick="applyPaletteColor(\'' + hex + '\')" title="' + hex + '"></div>';
        }
      }
      textColorSwatchGrid += '</div>';

      var textTargetMode = cfg.activeTextColorTarget || 'text';
      var isTextActive = textTargetMode === 'text';
      var isBgActive = textTargetMode === 'bg';

      var textColorBtnHtml = '<button class="tool-btn ' + (isTextActive ? 'active' : '') + '" onclick="setActiveTextColorTarget(\'text\')" style="width:34px; height:34px;"><span class="alt-badge">T</span>' + (icons.targetStroke || '') + '<span class="tooltip-text">글자색 선택 (Active)</span></button>';
      var textBgBtnHtml   = '<button class="tool-btn ' + (isBgActive ? 'active' : '') + '" onclick="setActiveTextColorTarget(\'bg\')" style="width:34px; height:34px;"><span class="alt-badge">B</span>' + (icons.targetFill || '') + '<span class="tooltip-text">배경색(하이라이트) 선택 (Active)</span></button>';

      var openPaletteBtnHtml   = '<button class="tool-btn" onclick="window.open(\'https://iseohyun.github.io/UniPalette/\', \'_blank\')" style="width:34px; height:34px;"><span class="alt-badge">O</span>' + (icons.openPalette || '') + '<span class="tooltip-text">기본색상 정하기 (UniPalette 새탭)</span></button>';
      var importPaletteBtnHtml = '<button class="tool-btn" onclick="openPaletteModal()" style="width:34px; height:34px;"><span class="alt-badge">I</span>' + (icons.importPalette || '') + '<span class="tooltip-text">기본색상 가져오기 (코드 붙여넣기)</span></button>';

      var textColorContent =
        '<div style="display:flex; flex-direction:row; align-items:center; gap:8px;">' +
          '<div style="display:flex; flex-direction:column; gap:4px;">' + textColorBtnHtml + textBgBtnHtml + '</div>' +
          textColorSwatchGrid +
          '<div style="display:flex; flex-direction:column; gap:4px;">' + openPaletteBtnHtml + importPaletteBtnHtml + '</div>' +
        '</div>';

      ribbonBar.innerHTML =
        buildCategoryHtml('text_font', '글꼴', fontOptionsHtml) +
        buildCategoryHtml('text_color', '색', textColorContent);
    } else if (cfg.currentTab === 'anim') {
      var animContent =
        '<div class="category-grid" style="grid-template-columns: 34px 34px;">' +
          '<button class="tool-btn" onclick="playAnimation(\'draw\')"><span class="alt-badge">P</span>' + (icons.animDraw || '') + '<span class="tooltip-text">선 그리기 애니메이션</span></button>' +
          '<button class="tool-btn" onclick="playAnimation(\'fade\')"><span class="alt-badge">F</span>' + (icons.animFade || '') + '<span class="tooltip-text">페이드 나타나기</span></button>' +
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
