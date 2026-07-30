(function(window) {
  'use strict';

  var cfg = window.WebpointerConfig;
  var state = window.WebpointerState;

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

    if (cfg.currentTab === 'file') {
      var openFileBtn  = '<button class="tool-btn" onclick="openFile()" style="width:38px; height:38px;"><span class="alt-badge">O</span>' + (icons.openFile || '') + '<span class="tooltip-text">파일 불러오기 (.json / .webpointer / .svg)</span></button>';
      var saveWebBtn   = '<button class="tool-btn" onclick="saveFileToWeb()" style="width:38px; height:38px;"><span class="alt-badge">S</span>' + (icons.saveFile || '') + '<span class="tooltip-text">파일 저장하기 (웹 LocalStorage)</span></button>';
      var downloadBtn  = '<button class="tool-btn" onclick="downloadFile()" style="width:38px; height:38px;"><span class="alt-badge">D</span>' + (icons.downloadFile || '') + '<span class="tooltip-text">파일 다운로드 (.json 프로젝트 / .svg 이미지)</span></button>';
      var symbolMgrBtn = '<button class="tool-btn" onclick="openSymbolManagerModal()" style="width:38px; height:38px;"><span class="alt-badge">M</span>' + (icons.shapes || '') + '<span class="tooltip-text">심볼 관리자 (Symbol Manager)</span></button>';

      var fileOpsContent =
        '<div style="display:flex; flex-direction:row; gap:6px; align-items:center;">' +
          openFileBtn + saveWebBtn + downloadBtn + symbolMgrBtn +
        '</div>';

      var undoBtn = '<button class="tool-btn" onclick="undo()" style="width:38px; height:38px;"><span class="alt-badge">Ctrl+Z</span>' + (icons.undo || '') + '<span class="tooltip-text">뒤로가기 (Ctrl + Z)</span></button>';
      var redoBtn = '<button class="tool-btn" onclick="redo()" style="width:38px; height:38px;"><span class="alt-badge">Ctrl+Y</span>' + (icons.redo || '') + '<span class="tooltip-text">앞으로가기 (Ctrl + Y / Ctrl+Shift+Z)</span></button>';

      var historyContent =
        '<div style="display:flex; flex-direction:row; gap:6px; align-items:center;">' +
          undoBtn + redoBtn +
        '</div>';

      ribbonBar.innerHTML =
        buildCategoryHtml('file_ops', '파일 입출력', fileOpsContent) +
        buildCategoryHtml('file_history', '작업 히스토리', historyContent);
    } else if (cfg.currentTab === 'insert') {
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
      var stepPx = cfg.gridStepSize || 24;

      var canvasSettingsContentHtml =
        '<div style="display:flex; flex-direction:column; gap:4px; justify-content:center;">' +
          '<div style="display:flex; flex-direction:row; align-items:center; gap:6px;">' +
            '<span style="font-size:0.78rem; font-weight:600; color:#475569;">격자</span>' +
            '<input type="checkbox" id="chkGridToggle" ' + (cfg.gridSnapEnabled ? 'checked' : '') + ' onchange="toggleGridSnap(this.checked)" style="width:16px; height:16px; cursor:pointer;">' +
            '<input type="number" min="5" max="200" value="' + stepPx + '" oninput="setGridStepSize(this.value)" onchange="setGridStepSize(this.value)" style="width:55px; padding:2px 4px; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:4px; text-align:center;" title="격자 크기 (px)">' +
          '</div>' +
          '<div style="display:flex; flex-direction:row; align-items:center; gap:6px;">' +
            '<select onchange="setCanvasRatio(this.value)" style="width:130px; padding:2px 4px; font-size:0.78rem; border:1px solid #cbd5e1; border-radius:4px;" title="캔버스 크기">' +
              '<option value="960x540" ' + ((cfg.canvasRatio||'960x540')==='960x540'?'selected':'') + '>16:9 (960×540)</option>' +
              '<option value="1280x720" ' + (cfg.canvasRatio==='1280x720'?'selected':'') + '>16:9 HD (1280×720)</option>' +
              '<option value="800x600" ' + (cfg.canvasRatio==='800x600'?'selected':'') + '>4:3 (800×600)</option>' +
              '<option value="600x600" ' + (cfg.canvasRatio==='600x600'?'selected':'') + '>1:1 (600×600)</option>' +
            '</select>' +
            '<input type="color" value="' + (cfg.canvasBgColor || '#ffffff') + '" onchange="setCanvasBgColor(this.value)" style="width:34px; height:24px; padding:0; border:1px solid #cbd5e1; border-radius:4px; cursor:pointer;" title="캔버스 색상">' +
          '</div>' +
        '</div>';

      var openDetailedBtnHtml = '<button class="tool-btn" id="btnDetailedSettings" onclick="openDetailedSettingsModal()" style="width:34px; height:34px;"><span class="alt-badge">S</span>' + (icons.settingsGear || '⚙') + '<span class="tooltip-text">세부 설정 (근접선택거리, 기본크기, 투명도단계)</span></button>';
      var openShortcutBtnHtml = '<button class="tool-btn" id="btnShortcutGuide" onclick="openShortcutModal()" style="width:34px; height:34px;"><span class="alt-badge">K</span>' + (icons.keyboardShortcut || '⌨') + '<span class="tooltip-text">단축키 안내 (전체 키보드 매핑)</span></button>';

      var settingsContentHtml =
        '<div style="display:flex; flex-direction:row; gap:4px; align-items:center;">' +
          openDetailedBtnHtml + openShortcutBtnHtml +
        '</div>';

      var openPaletteBtnHtml   = '<button class="tool-btn" onclick="window.open(\'https://iseohyun.github.io/UniPalette/\', \'_blank\')" style="width:34px; height:34px;"><span class="alt-badge">O</span>' + (icons.openPalette || '') + '<span class="tooltip-text">기본색상 정하기 (UniPalette 새탭)</span></button>';
      var importPaletteBtnHtml = '<button class="tool-btn" onclick="openPaletteModal()" style="width:34px; height:34px;"><span class="alt-badge">I</span>' + (icons.importPalette || '') + '<span class="tooltip-text">기본색상 가져오기 (코드 붙여넣기)</span></button>';

      var themeSettingsHtml =
        '<div style="display:flex; flex-direction:row; gap:4px; align-items:center;">' +
          openPaletteBtnHtml + importPaletteBtnHtml +
        '</div>';

      ribbonBar.innerHTML =
        buildCategoryHtml('view_canvas', '캔버스 설정', canvasSettingsContentHtml) +
        buildCategoryHtml('view_settings', '설정', settingsContentHtml) +
        buildCategoryHtml('view_theme', '테마', themeSettingsHtml);
    } else if (cfg.currentTab === 'style') {
      var strokeBtnHtml = '<button class="tool-btn" onclick="toggleColorPalettePopover(this, \'stroke\')" style="width:34px; height:34px; position:relative;">' + (icons.targetStroke || '') + '<span style="position:absolute; bottom:2px; left:4px; right:4px; height:4px; background:' + (cfg.strokeColor==='none'?'transparent':cfg.strokeColor) + '; border-radius:2px;"></span><span class="tooltip-text">선 색상 (클릭하여 팔레트 열기)</span></button>';
      var fillBtnHtml   = '<button class="tool-btn" onclick="toggleColorPalettePopover(this, \'fill\')" style="width:34px; height:34px; position:relative;">' + (icons.targetFill || '') + '<span style="position:absolute; bottom:2px; left:4px; right:4px; height:4px; background:' + (cfg.fillColor==='none'?'transparent':cfg.fillColor) + '; border-radius:2px;"></span><span class="tooltip-text">면 채우기 색상 (클릭하여 팔레트 열기)</span></button>';

      var widthInputHtml = '<input type="number" min="1" max="50" value="' + cfg.strokeWidth + '" oninput="setStrokeWidth(this.value)" onchange="setStrokeWidth(this.value)" style="width:34px; height:34px; box-sizing:border-box; padding:2px; font-size:0.85rem; font-weight:700; border:1px solid #cbd5e1; border-radius:6px; text-align:center; outline:none; background:#ffffff; color:#0f172a;" title="선 두께 (px)">';

      var isDashed = cfg.strokeDashStyle === 'dashed';
      var dashedLineBtn = '<button class="tool-btn ' + (isDashed ? 'active' : '') + '" onclick="toggleStrokeDashStyle()" onmousedown="startHoldDashArray(event, this)" onmouseup="endHoldDashArray()" onmouseleave="endHoldDashArray()" style="width:34px; height:34px;">' + (icons.lineDashed || '') + '<span class="tooltip-text">선 모양: 점선 (클릭 토글 / 길게 눌러 패턴 설정)</span></button>';

      var stepVal = 1 / (cfg.alphaStepCount || 5);
      var curAlpha = cfg.opacity !== undefined ? cfg.opacity : 1;
      var alphaPct = Math.round(curAlpha * 100);

      var alphaRangeHtml =
        '<div style="display:flex; flex-direction:column; justify-content:center; align-items:center; gap:2px; height:72px; padding:0 4px; border-left:1px solid #cbd5e1;">' +
          '<span style="font-size:0.72rem; font-weight:700; color:#475569;">a: ' + alphaPct + '%</span>' +
          '<input type="range" min="0" max="1" step="' + stepVal + '" value="' + curAlpha + '" oninput="setElementOpacity(this.value)" style="width:72px; cursor:pointer;" title="투명도(Alpha)">' +
        '</div>';

      var lineGridHtml =
        '<div style="display:flex; flex-direction:row; align-items:center; gap:6px;">' +
          '<div style="display:grid; grid-template-columns:34px 34px; grid-template-rows:34px 34px; gap:4px;">' +
            strokeBtnHtml + fillBtnHtml +
            widthInputHtml + dashedLineBtn +
          '</div>' +
          alphaRangeHtml +
        '</div>';

      var curStartMarker = cfg.startMarker || 'none';
      var curEndMarker   = cfg.endMarker || 'none';

      var startNone = '<button class="tool-btn ' + (curStartMarker==='none'?'active':'') + '" onclick="setStartMarker(\'none\')" style="width:34px; height:34px;">' + (icons.startNone || '') + '<span class="tooltip-text">시작 모양: 없음</span></button>';
      var startArrow = '<button class="tool-btn ' + (curStartMarker==='arrow'?'active':'') + '" onclick="setStartMarker(\'arrow\')" style="width:34px; height:34px;">' + (icons.startArrow || '') + '<span class="tooltip-text">시작 모양: 화살표 (왼쪽)</span></button>';
      var startCircle = '<button class="tool-btn ' + (curStartMarker==='circle'?'active':'') + '" onclick="setStartMarker(\'circle\')" style="width:34px; height:34px;">' + (icons.startCircle || '') + '<span class="tooltip-text">시작 모양: 원 (왼쪽)</span></button>';
      var startDiamond = '<button class="tool-btn ' + (curStartMarker==='diamond'?'active':'') + '" onclick="setStartMarker(\'diamond\')" style="width:34px; height:34px;">' + (icons.startDiamond || '') + '<span class="tooltip-text">시작 모양: 다이아몬드 (왼쪽)</span></button>';

      var isStartSolid = (cfg.startMarkerFillStyle || 'solid') === 'solid';
      var startFillToggleBtn = '<button class="tool-btn ' + (isStartSolid ? 'active' : '') + '" onclick="toggleStartMarkerFillStyle()" style="width:34px; height:34px;">' + (isStartSolid ? (icons.startSolid || '') : (icons.startHollow || '')) + '<span class="tooltip-text">시작 마커 채우기 (클릭 토글: 꽉찬/빈모양)</span></button>';

      var startScalePlus = '<button class="tool-btn" onclick="scaleMarker(\'start\', 1.25)" style="width:34px; height:34px;"><span class="alt-badge">+</span>' + (icons.markerPlus || '') + '<span class="tooltip-text">시작 마커 크기 키우기 (+)</span></button>';
      var startScaleMinus = '<button class="tool-btn" onclick="scaleMarker(\'start\', 0.8)" style="width:34px; height:34px;"><span class="alt-badge">-</span>' + (icons.markerMinus || '') + '<span class="tooltip-text">시작 마커 크기 줄이기 (-)</span></button>';

      var endNone = '<button class="tool-btn ' + (curEndMarker==='none'?'active':'') + '" onclick="setEndMarker(\'none\')" style="width:34px; height:34px;">' + (icons.endNone || '') + '<span class="tooltip-text">끝 모양: 없음</span></button>';
      var endArrow = '<button class="tool-btn ' + (curEndMarker==='arrow'?'active':'') + '" onclick="setEndMarker(\'arrow\')" style="width:34px; height:34px;">' + (icons.endArrow || '') + '<span class="tooltip-text">끝 모양: 화살표 (오른쪽)</span></button>';
      var endCircle = '<button class="tool-btn ' + (curEndMarker==='circle'?'active':'') + '" onclick="setEndMarker(\'circle\')" style="width:34px; height:34px;">' + (icons.endCircle || '') + '<span class="tooltip-text">끝 모양: 원 (오른쪽)</span></button>';
      var endDiamond = '<button class="tool-btn ' + (curEndMarker==='diamond'?'active':'') + '" onclick="setEndMarker(\'diamond\')" style="width:34px; height:34px;">' + (icons.endDiamond || '') + '<span class="tooltip-text">끝 모양: 다이아몬드 (오른쪽)</span></button>';

      var isEndSolid = (cfg.endMarkerFillStyle || 'solid') === 'solid';
      var endFillToggleBtn = '<button class="tool-btn ' + (isEndSolid ? 'active' : '') + '" onclick="toggleEndMarkerFillStyle()" style="width:34px; height:34px;">' + (isEndSolid ? (icons.endSolid || '') : (icons.endHollow || '')) + '<span class="tooltip-text">끝 마커 채우기 (클릭 토글: 꽉찬/빈모양)</span></button>';

      var endScalePlus = '<button class="tool-btn" onclick="scaleMarker(\'end\', 1.25)" style="width:34px; height:34px;"><span class="alt-badge">+</span>' + (icons.markerPlus || '') + '<span class="tooltip-text">끝 마커 크기 키우기 (+)</span></button>';
      var endScaleMinus = '<button class="tool-btn" onclick="scaleMarker(\'end\', 0.8)" style="width:34px; height:34px;"><span class="alt-badge">-</span>' + (icons.markerMinus || '') + '<span class="tooltip-text">끝 마커 크기 줄이기 (-)</span></button>';

      var lineEndsContent =
        '<div style="display:flex; flex-direction:column; gap:4px; justify-content:center;">' +
          '<div style="display:flex; flex-direction:row; align-items:center; gap:4px;">' +
            '<div style="display:flex; flex-direction:row; gap:2px;">' + startNone + startArrow + startCircle + startDiamond + '</div>' +
            '<div style="width:1px; height:28px; background:#cbd5e1; margin:0 3px;"></div>' +
            startFillToggleBtn +
            '<div style="width:1px; height:28px; background:#cbd5e1; margin:0 3px;"></div>' +
            '<div style="display:flex; flex-direction:row; gap:2px;">' + startScalePlus + startScaleMinus + '</div>' +
          '</div>' +
          '<div style="display:flex; flex-direction:row; align-items:center; gap:4px;">' +
            '<div style="display:flex; flex-direction:row; gap:2px;">' + endNone + endArrow + endCircle + endDiamond + '</div>' +
            '<div style="width:1px; height:28px; background:#cbd5e1; margin:0 3px;"></div>' +
            endFillToggleBtn +
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

      var cropBtnHtml = '<button class="tool-btn ' + (state.isCropModeActive ? 'active' : '') + '" onclick="toggleCropMode()" style="width:34px; height:34px;">' + (icons.crop || '✂️') + '<span class="tooltip-text">자르기 (마우스 드래그로 자르기 영역 조절)</span></button>';

      var editContent =
        '<div style="display:flex; flex-direction:row; align-items:center; gap:4px;">' +
          cropBtnHtml +
        '</div>';

      var filterBtnHtml = '<button class="tool-btn" onclick="openFilterPopover(this)" style="width:34px; height:34px;">🪄<span class="tooltip-text">필터 효과 설정 (blur, brightness, contrast, drop-shadow 등 중복 선택 가능)</span></button>';

      var filterContent =
        '<div style="display:flex; flex-direction:row; align-items:center; gap:4px;">' +
          filterBtnHtml +
        '</div>';

      ribbonBar.innerHTML =
        buildCategoryHtml('style_line', '선 및 색상', lineGridHtml) +
        buildCategoryHtml('style_lineEnds', '선 끝', lineEndsContent) +
        buildCategoryHtml('style_capJoin', '마감', capJoinContent) +
        buildCategoryHtml('style_filter', '필터', filterContent) +
        buildCategoryHtml('style_edit', '편집', editContent);
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
          '<span class="tooltip-text">글자 기울임 (클릭: Italic, 길게누르기: Normal/Italic/Oblique)</span>' +
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

      var hIconSvg = icons.alignTextLeft;
      var hTooltipText = "왼쪽 맞춤 (클릭 시 좌/중/우/양쪽 순환)";
      if (curTextAnchor === 'middle') {
        hIconSvg = icons.alignTextCenter;
        hTooltipText = "가운데 맞춤 (클릭 시 좌/중/우/양쪽 순환)";
      } else if (curTextAnchor === 'end') {
        hIconSvg = icons.alignTextRight;
        hTooltipText = "오른쪽 맞춤 (클릭 시 좌/중/우/양쪽 순환)";
      } else if (curTextAnchor === 'justify') {
        hIconSvg = icons.alignTextJustify;
        hTooltipText = "양쪽 맞춤 (클릭 시 좌/중/우/양쪽 순환)";
      }

      var alignHorizCycleBtnHtml =
        '<button class="tool-btn active" onclick="cycleTextHorizontalAlign()" style="width:34px; height:34px;">' +
          (hIconSvg || '≡') +
          '<span class="tooltip-text">' + hTooltipText + '</span>' +
        '</button>';

      var isVertical = (cfg.textWritingMode === 'vertical-rl' || cfg.textWritingMode === 'vertical');
      var textDirectionBtnHtml =
        '<button class="tool-btn ' + (isVertical ? 'active' : '') + '" onclick="toggleTextWritingMode()" style="width:34px; height:34px;">' +
          (icons.textDirection || 'T↓') +
          '<span class="tooltip-text">텍스트 방향 (클릭 토글: 가로/세로)</span>' +
        '</button>';

      var curVertAlign = cfg.textDominantBaseline || 'alphabetic';
      var vIconSvg = icons.alignVertBottom;
      var vTooltipText = "아래쪽 맞춤 (클릭 시 위/중앙/아래 순환)";
      if (curVertAlign === 'hanging') {
        vIconSvg = icons.alignVertTop;
        vTooltipText = "위쪽 맞춤 (클릭 시 위/중앙/아래 순환)";
      } else if (curVertAlign === 'central' || curVertAlign === 'middle') {
        vIconSvg = icons.alignVertMiddle;
        vTooltipText = "중앙 맞춤 (클릭 시 위/중앙/아래 순환)";
      }

      var alignVertCycleBtnHtml =
        '<button class="tool-btn active" onclick="cycleTextVerticalAlign()" style="width:34px; height:34px;">' +
          (vIconSvg || '↕') +
          '<span class="tooltip-text">' + vTooltipText + '</span>' +
        '</button>';

      var curAutoFit = cfg.textAutoFitMode || 'fitShapeToText';
      var fitIconSvg = icons.autoFitShape;
      var fitTooltipText = "텍스트에 맞춤 (기본): 글자가 도형을 넘어가면 도형 크기를 키움 (클릭 시 순환)";
      if (curAutoFit === 'fitTextToShape') {
        fitIconSvg = icons.autoFitText;
        fitTooltipText = "도형에 맞춤: 텍스트가 도형을 넘어가면 텍스트 크기를 줄임 (클릭 시 순환)";
      } else if (curAutoFit === 'none') {
        fitIconSvg = icons.autoFitNone;
        fitTooltipText = "안 맞춤: 도형이나 텍스트 크기를 변경하지 않음 (클릭 시 순환)";
      }

      var autoFitCycleBtnHtml =
        '<button class="tool-btn active" onclick="cycleTextAutoFitMode()" style="width:34px; height:34px;">' +
          (fitIconSvg || '⇱') +
          '<span class="tooltip-text">' + fitTooltipText + '</span>' +
        '</button>';

      var fontOptionsHtml =
        '<div style="display:flex; flex-direction:column; gap:3px;">' +
          '<div style="display:flex; flex-direction:row; align-items:center; gap:4px;">' +
            '<select onfocus="fetchLocalSystemFonts()" onchange="setTextFontFamily(this.value)" style="max-width:130px; padding:2px 4px; font-size:0.78rem; border:1px solid #cbd5e1; border-radius:4px;">' +
              fontOptionsStr +
            '</select>' +
            '<input type="number" min="8" max="200" value="' + curFontSize + '" oninput="setTextFontSize(this.value)" onchange="setTextFontSize(this.value)" style="width:45px; padding:2px 4px; font-size:0.78rem; border:1px solid #cbd5e1; border-radius:4px; text-align:center;">' +
          '</div>' +
          '<div style="display:flex; flex-direction:row; align-items:center; gap:3px;">' +
            boldBtnHtml +
            italicBtnHtml +
            strikethroughBtnHtml +
            lineHeightBtnHtml +
            textDirectionBtnHtml +
          '</div>' +
          '<div style="display:flex; flex-direction:row; align-items:center; gap:3px;">' +
            alignHorizCycleBtnHtml +
            alignVertCycleBtnHtml +
            autoFitCycleBtnHtml +
          '</div>' +
        '</div>';

      var strokeColor = cfg.textStrokeColor || cfg.strokeColor || 'none';
      var fillColor   = cfg.textFillColor || cfg.fillColor || '#041e49';
      var strokeWidth = cfg.textStrokeWidth !== undefined ? cfg.textStrokeWidth : 1;
      var stepVal     = 1 / (cfg.alphaStepCount || 5);
      var curAlpha    = cfg.opacity !== undefined ? cfg.opacity : 1;
      var alphaPct    = Math.round(curAlpha * 100);

      var textFillBtnHtml   = '<button class="tool-btn" onclick="toggleColorPalettePopover(this, \'text_fill\')" style="width:34px; height:34px; position:relative;"><span class="alt-badge">F</span>' + (icons.targetFill || '') + '<span style="position:absolute; bottom:2px; left:4px; right:4px; height:4px; background:' + (fillColor==='none'?'transparent':fillColor) + '; border-radius:2px;"></span><span class="tooltip-text">글자 채우기 색상 (fill)</span></button>';
      var textStrokeBtnHtml = '<button class="tool-btn" onclick="toggleColorPalettePopover(this, \'text_stroke\')" style="width:34px; height:34px; position:relative;"><span class="alt-badge">S</span>' + (icons.targetStroke || '') + '<span style="position:absolute; bottom:2px; left:4px; right:4px; height:4px; background:' + (strokeColor==='none'?'transparent':strokeColor) + '; border-radius:2px;"></span><span class="tooltip-text">글자 테두리 색상 (stroke)</span></button>';
      var strokeWidthInputHtml = '<input type="number" min="0" max="50" value="' + strokeWidth + '" oninput="setTextStrokeWidth(this.value)" onchange="setTextStrokeWidth(this.value)" style="width:34px; height:34px; box-sizing:border-box; padding:2px; font-size:0.85rem; font-weight:700; border:1px solid #cbd5e1; border-radius:6px; text-align:center; outline:none; background:#ffffff; color:#0f172a;" title="글자 테두리 두께 (px)">';

      var textColorContent =
        '<div style="display:flex; flex-direction:column; gap:4px; justify-content:center;">' +
          '<div style="display:flex; flex-direction:row; align-items:center; gap:4px;">' +
            textFillBtnHtml + textStrokeBtnHtml + strokeWidthInputHtml +
          '</div>' +
          '<div style="display:flex; flex-direction:row; align-items:center; gap:4px;">' +
            '<span style="font-size:0.75rem; font-weight:700; color:#475569; white-space:nowrap;">a: ' + alphaPct + '%</span>' +
            '<input type="range" min="0" max="1" step="' + stepVal + '" value="' + curAlpha + '" oninput="setElementOpacity(this.value)" style="width:70px; cursor:pointer;" title="투명도(Alpha)">' +
          '</div>' +
        '</div>';

      var underlineColor   = cfg.textUnderlineColor || cfg.strokeColor || '#041e49';
      var underlineStyle   = cfg.textUnderlineStyle || 'none';
      var underlineOffset  = cfg.textUnderlineOffset !== undefined ? cfg.textUnderlineOffset : 3;
      var underlineWidth   = cfg.textUnderlineWidth !== undefined ? cfg.textUnderlineWidth : 1;

      var underlineColorBtnHtml = '<button class="tool-btn" onclick="toggleColorPalettePopover(this, \'text_underline\')" style="width:34px; height:34px; position:relative;"><span class="alt-badge">U</span>' + (icons.targetStroke || '') + '<span style="position:absolute; bottom:2px; left:4px; right:4px; height:4px; background:' + (underlineColor==='none'?'transparent':underlineColor) + '; border-radius:2px;"></span><span class="tooltip-text">밑줄 색상</span></button>';

      var underlineStyleSelectHtml =
        '<select onchange="setTextUnderlineStyle(this.value)" style="padding:2px 4px; font-size:0.78rem; border:1px solid #cbd5e1; border-radius:4px; height:34px; max-width:95px;" title="밑줄 종류">' +
          '<option value="none" ' + (underlineStyle==='none'?'selected':'') + '>없음</option>' +
          '<option value="solid" ' + (underlineStyle==='solid'?'selected':'') + '>실선</option>' +
          '<option value="dashed" ' + (underlineStyle==='dashed'?'selected':'') + '>점선</option>' +
          '<option value="dotted" ' + (underlineStyle==='dotted'?'selected':'') + '>점</option>' +
          '<option value="double" ' + (underlineStyle==='double'?'selected':'') + '>이중선</option>' +
          '<option value="wavy" ' + (underlineStyle==='wavy'?'selected':'') + '>물결선</option>' +
        '</select>';

      var underlineOffsetInputHtml =
        '<div style="display:flex; flex-direction:row; align-items:center; gap:2px;">' +
          '<span style="font-size:0.75rem; font-weight:600; color:#475569;">거리:</span>' +
          '<input type="number" min="0" max="30" value="' + underlineOffset + '" oninput="setTextUnderlineOffset(this.value)" onchange="setTextUnderlineOffset(this.value)" style="width:36px; padding:2px 4px; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:4px; text-align:center;" title="밑줄 거리">' +
        '</div>';

      var underlineWidthInputHtml =
        '<div style="display:flex; flex-direction:row; align-items:center; gap:2px;">' +
          '<span style="font-size:0.75rem; font-weight:600; color:#475569;">두께:</span>' +
          '<input type="number" min="1" max="20" value="' + underlineWidth + '" oninput="setTextUnderlineWidth(this.value)" onchange="setTextUnderlineWidth(this.value)" style="width:36px; padding:2px 4px; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:4px; text-align:center;" title="밑줄 두께">' +
        '</div>';

      var underlineCategoryContent =
        '<div style="display:flex; flex-direction:column; gap:4px; justify-content:center;">' +
          '<div style="display:flex; flex-direction:row; align-items:center; gap:4px;">' +
            underlineStyleSelectHtml + underlineColorBtnHtml +
          '</div>' +
          '<div style="display:flex; flex-direction:row; align-items:center; gap:6px;">' +
            underlineOffsetInputHtml + underlineWidthInputHtml +
          '</div>' +
        '</div>';

      ribbonBar.innerHTML =
        buildCategoryHtml('text_font', '글꼴', fontOptionsHtml) +
        buildCategoryHtml('text_color', '색', textColorContent) +
        buildCategoryHtml('text_underline', '밑줄', underlineCategoryContent);
    } else if (cfg.currentTab === 'anim') {
      var animContent =
        '<div class="category-grid" style="grid-template-columns: 34px 34px;">' +
          '<button class="tool-btn" onclick="playAnimation(\'draw\')"><span class="alt-badge">P</span>' + (icons.animDraw || '') + '<span class="tooltip-text">선 그리기 애니메이션</span></button>' +
          '<button class="tool-btn" onclick="playAnimation(\'fade\')"><span class="alt-badge">F</span>' + (icons.animFade || '') + '<span class="tooltip-text">페이드 나타나기</span></button>' +
        '</div>';
      ribbonBar.innerHTML = buildCategoryHtml('anim_preview', '애니메이션 미리보기', animContent);
    }
  }

  // Global Fixed Floating Tooltip Manager (Positioned fixed to body, bypassing parent overflow/z-index/clipping)
  (function initGlobalTooltipManager() {
    var globalTooltip = document.getElementById('webpointerGlobalTooltip');
    if (!globalTooltip) {
      globalTooltip = document.createElement('div');
      globalTooltip.id = 'webpointerGlobalTooltip';
      globalTooltip.style.cssText =
        'position:fixed; z-index:999999; display:none; padding:4px 8px; ' +
        'background:#0f172a; border:1px solid #0284c7; color:#ffffff; ' +
        'font-size:0.75rem; font-weight:500; white-space:nowrap; border-radius:4px; ' +
        'box-shadow:0 4px 14px rgba(0,0,0,0.35); pointer-events:none; font-family:sans-serif; transition:opacity 0.1s ease;';
      document.body.appendChild(globalTooltip);
    }

    document.addEventListener('mouseover', function(e) {
      var btn = e.target.closest('.tool-btn, [title], [data-original-title], .ribbon-control-item');
      if (!btn) return;

      var tooltipStr = '';
      var tooltipChild = btn.querySelector('.tooltip-text');
      if (tooltipChild) {
        tooltipStr = tooltipChild.textContent || tooltipChild.innerText;
      } else if (btn.getAttribute('title')) {
        tooltipStr = btn.getAttribute('title');
        btn.setAttribute('data-original-title', tooltipStr);
        btn.removeAttribute('title');
      } else if (btn.getAttribute('data-original-title')) {
        tooltipStr = btn.getAttribute('data-original-title');
      }

      if (!tooltipStr) return;

      globalTooltip.textContent = tooltipStr;
      globalTooltip.style.display = 'block';
      globalTooltip.style.opacity = '1';

      var rect = btn.getBoundingClientRect();
      var tipRect = globalTooltip.getBoundingClientRect();

      var left = rect.left + (rect.width / 2) - (tipRect.width / 2);
      left = Math.max(8, Math.min(window.innerWidth - tipRect.width - 8, left));

      var top = rect.bottom + 6;
      if (top + tipRect.height > window.innerHeight - 8) {
        top = rect.top - tipRect.height - 6;
      }

      globalTooltip.style.left = left + 'px';
      globalTooltip.style.top = top + 'px';
    }, true);

    document.addEventListener('mouseout', function(e) {
      var btn = e.target.closest('.tool-btn, [title], [data-original-title], .ribbon-control-item');
      if (btn) {
        globalTooltip.style.display = 'none';
        globalTooltip.style.opacity = '0';
      }
    }, true);
  })();

  window.WebpointerRenderRibbon = {
    getOutermostGroupEl: getOutermostGroupEl,
    build3RowGridHtml: build3RowGridHtml,
    buildCategoryHtml: buildCategoryHtml,
    renderRibbon: renderRibbon
  };
})(window);
