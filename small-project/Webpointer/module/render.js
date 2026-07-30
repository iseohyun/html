/**
 * Webpointer Rendering Layer Module
 * Focuses solely on dynamic SVG manipulation, ribbon UI rendering, and DOM updates.
 */
(function() {
  var cfg = window.WebpointerConfig;

  // Utility to calculate point on an rotated elliptical arc
  function getArcPoint(cx, cy, rx, ry, angleDeg, rotationDeg) {
    var aRad = angleDeg * (Math.PI / 180);
    var rRad = (rotationDeg || 0) * (Math.PI / 180);
    var xLocal = rx * Math.cos(aRad);
    var yLocal = ry * Math.sin(aRad);
    var xRot = xLocal * Math.cos(rRad) - yLocal * Math.sin(rRad);
    var yRot = xLocal * Math.sin(rRad) + yLocal * Math.cos(rRad);
    return { x: cx + xRot, y: cy + yRot };
  }

  // Get Outermost <g> Element for DOM Element
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

  // Default 24 Harmonious User Palette Fallback Colors
  var default24Colors = [
    "#2aa314", "#14a36a", "#1471a3", "#2314a3", "#8e14a3", "#a3144d", "#a34614", "#95a314",
    "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981", "#06b6d4", "#3b82f6", "#6366f1",
    "#8b5cf6", "#ec4899", "#f43f5e", "#64748b", "#0284c7", "#38bdf8", "#fbbf24", "#a855f7"
  ];

  var WebpointerRender = {
    getArcPoint: getArcPoint,

    // Render Step Grid Lines for White Canvas
    renderGrid: function() {
      var gridGroup = document.getElementById('gridGroup');
      var mainSvg = document.getElementById('mainSvg');
      if (!gridGroup || !mainSvg) return;

      gridGroup.innerHTML = '';
      mainSvg.style.backgroundColor = cfg.canvasBgColor || '#ffffff';

      if (!cfg.gridSnapEnabled) return;

      var pathData = '';
      var stepW = cfg.SVG_WIDTH / cfg.STEPS_X;
      for (var s = 0; s <= cfg.STEPS_X; s += 30) {
        var x = s * stepW;
        pathData += 'M ' + x + ' 0 V ' + cfg.SVG_HEIGHT + ' ';
      }
      var stepH = cfg.SVG_HEIGHT / cfg.STEPS_Y;
      for (var s = 0; s <= cfg.STEPS_Y; s += 30) {
        var y = s * stepH;
        pathData += 'M 0 ' + y + ' H ' + cfg.SVG_WIDTH + ' ';
      }

      var gridPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      gridPath.setAttribute('d', pathData);
      gridPath.setAttribute('stroke', '#e2e8f0');
      gridPath.setAttribute('stroke-width', '0.8');
      gridGroup.appendChild(gridPath);
    },

    // Update SVG Defs for Markers
    updateSvgDefs: function() {
      var svgDefs = document.getElementById('svgDefs');
      if (!svgDefs) return;
      svgDefs.innerHTML = '';

      ['arrow', 'circle', 'diamond'].forEach(function(type) {
        ['start', 'end'].forEach(function(pos) {
          var markerId = 'marker-' + pos + '-' + type;
          var marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
          marker.setAttribute('id', markerId);
          marker.setAttribute('viewBox', '0 0 10 10');
          marker.setAttribute('refX', pos === 'start' ? '2' : '8');
          marker.setAttribute('refY', '5');
          var scale = pos === 'start' ? cfg.startMarkerScale : cfg.endMarkerScale;
          marker.setAttribute('markerWidth', (6 * scale).toString());
          marker.setAttribute('markerHeight', (6 * scale).toString());
          marker.setAttribute('orient', 'auto');

          var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('fill', cfg.strokeColor || '#041e49');

          if (type === 'arrow') {
            path.setAttribute('d', pos === 'start' ? 'M 10 0 L 0 5 L 10 10 Z' : 'M 0 0 L 10 5 L 0 10 Z');
          } else if (type === 'circle') {
            path.setAttribute('d', 'M 5 1 A 4 4 0 1 1 4.99 1 Z');
          } else if (type === 'diamond') {
            path.setAttribute('d', 'M 5 0 L 10 5 L 5 10 L 0 5 Z');
          }
          marker.appendChild(path);
          svgDefs.appendChild(marker);
        });
      });
    },

    // Helper: Make Tool Button HTML
    makeToolHtml: function(toolId, title, keybind, svgPath) {
      var isActive = cfg.currentTool === toolId ? 'active' : '';
      return '<button class="tool-btn ' + isActive + '" onclick="setTool(\'' + toolId + '\')">' +
               '<span class="alt-badge">' + keybind + '</span>' +
               svgPath +
               '<span class="tooltip-text">' + title + '</span>' +
             '</button>';
    },

    // Helper: Build 3-Row Item Grid
    build3RowGridHtml: function(itemsHtmlArray) {
      var colCount = Math.ceil(itemsHtmlArray.length / 3);
      return '<div class="category-grid" style="grid-template-columns: repeat(' + colCount + ', 34px);">' + itemsHtmlArray.join('') + '</div>';
    },

    // Render Ribbon Bar Controls
    renderRibbon: function() {
      var ribbonBar = document.getElementById('ribbonBar');
      if (!ribbonBar) return;
      ribbonBar.innerHTML = '';

      var self = this;
      if (cfg.currentTab === 'insert') {
        var shapeTools = [
          self.makeToolHtml('select', '선택 도구', '1', '<svg viewBox="0 0 24 24"><path d="M3 3l7 18 3-7 7-3L3 3z"/></svg>'),
          self.makeToolHtml('point', '점 (Point)', '2', '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="currentColor"/></svg>'),
          self.makeToolHtml('line', '선 (Line)', '3', '<svg viewBox="0 0 24 24"><line x1="4" y1="20" x2="20" y2="4"/></svg>'),
          self.makeToolHtml('rect', '사각형', '4', '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="1"/></svg>'),
          self.makeToolHtml('ellipse', '타원', '5', '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="9" ry="6"/></svg>'),
          self.makeToolHtml('arc', '호 (Arc)', '6', '<svg viewBox="0 0 24 24"><path d="M 4 18 A 9 9 0 0 1 20 18"/></svg>'),
          self.makeToolHtml('bez2', '2차 베지어 (Quadratic Bezier)', '7', '<svg viewBox="0 0 24 24"><path d="M 3 18 Q 12 3 21 18"/><circle cx="12" cy="3" r="2" fill="currentColor"/></svg>'),
          self.makeToolHtml('bez3', '3차 베지어 (Cubic Bezier)', '8', '<svg viewBox="0 0 24 24"><path d="M 3 18 C 7 3, 17 3, 21 18"/><circle cx="7" cy="3" r="2" fill="currentColor"/><circle cx="17" cy="3" r="2" fill="currentColor"/></svg>'),
          self.makeToolHtml('rounded', '둥근 사각형', '9', '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="5"/></svg>')
        ];

        var layerTools = [
          '<button class="tool-btn" onclick="arrangeOrder(\'backward\')"><span class="alt-badge">Q</span><svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12"/><rect x="4" y="4" width="12" height="12" fill="rgba(4,30,73,0.3)"/></svg><span class="tooltip-text">뒤로</span></button>',
          '<button class="tool-btn" onclick="arrangeOrder(\'back\')"><span class="alt-badge">W</span><svg viewBox="0 0 24 24"><rect x="10" y="10" width="10" height="10"/><rect x="4" y="4" width="10" height="10" fill="rgba(4,30,73,0.3)"/></svg><span class="tooltip-text">맨뒤로</span></button>',
          '<button class="tool-btn" onclick="arrangeOrder(\'forward\')"><span class="alt-badge">E</span><svg viewBox="0 0 24 24"><rect x="4" y="4" width="12" height="12"/><rect x="8" y="8" width="12" height="12" fill="rgba(4,30,73,0.3)"/></svg><span class="tooltip-text">앞으로</span></button>',
          '<button class="tool-btn" onclick="arrangeOrder(\'front\')"><span class="alt-badge">R</span><svg viewBox="0 0 24 24"><rect x="4" y="4" width="10" height="10"/><rect x="10" y="10" width="10" height="10" fill="rgba(4,30,73,0.3)"/></svg><span class="tooltip-text">맨앞으로</span></button>'
        ];

        // Root Outermost Group Element counts as 1 single top-level unit!
        var topLevelUnits = new Set();
        var canUngroup = false;

        cfg.selectedIds.forEach(function(id) {
          var obj = cfg.objectsMap.get(id);
          if (obj) {
            var outerG = getOutermostGroupEl(obj.el);
            if (outerG) {
              topLevelUnits.add(outerG);
              canUngroup = true;
            } else {
              topLevelUnits.add(obj.el);
            }
          }
        });

        var canGroup = topLevelUnits.size >= 2;
        var canAlign2 = topLevelUnits.size >= 2;
        var canAlign3 = topLevelUnits.size >= 3;
        var canTransform = cfg.selectedIds.size >= 1;

        var groupTools = [
          '<button class="tool-btn ' + (canGroup ? '' : 'disabled') + '" ' + (canGroup ? 'onclick="groupSelected()"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">G</span><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" stroke-dasharray="3,3"/><rect x="6" y="6" width="6" height="6"/><rect x="12" y="12" width="6" height="6"/></svg><span class="tooltip-text">' + (canGroup ? '그룹화 (<g>)' : '그룹화 (독립 단위 2개 이상 선택 필요)') + '</span></button>',
          '<button class="tool-btn ' + (canUngroup ? '' : 'disabled') + '" ' + (canUngroup ? 'onclick="ungroupSelected()"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">U</span><svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" stroke-dasharray="2,2"/><rect x="13" y="13" width="8" height="8" stroke-dasharray="2,2"/></svg><span class="tooltip-text">' + (canUngroup ? '그룹 해제' : '그룹 해제 (그룹 객체 선택 필요)') + '</span></button>'
        ];

        var alignTools = [
          '<button class="tool-btn ' + (canAlign2 ? '' : 'disabled') + '" ' + (canAlign2 ? 'onclick="alignSelected(\'left\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">A</span><svg viewBox="0 0 24 24"><line x1="4" y1="3" x2="4" y2="21"/><rect x="8" y="6" width="12" height="4"/><rect x="8" y="14" width="8" height="4"/></svg><span class="tooltip-text">' + (canAlign2 ? '왼쪽 정렬' : '왼쪽 정렬 (2개 이상 선택 필요)') + '</span></button>',
          '<button class="tool-btn ' + (canAlign2 ? '' : 'disabled') + '" ' + (canAlign2 ? 'onclick="alignSelected(\'hcenter\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">S</span><svg viewBox="0 0 24 24"><line x1="12" y1="3" x2="12" y2="21"/><rect x="6" y="6" width="12" height="4"/><rect x="8" y="14" width="8" height="4"/></svg><span class="tooltip-text">' + (canAlign2 ? '수평 중앙 정렬 (가장 왼쪽 항목 중심 기준)' : '수평 중앙 정렬 (2개 이상 선택 필요)') + '</span></button>',
          '<button class="tool-btn ' + (canAlign2 ? '' : 'disabled') + '" ' + (canAlign2 ? 'onclick="alignSelected(\'right\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">D</span><svg viewBox="0 0 24 24"><line x1="20" y1="3" x2="20" y2="21"/><rect x="4" y="6" width="12" height="4"/><rect x="8" y="14" width="8" height="4"/></svg><span class="tooltip-text">' + (canAlign2 ? '오른쪽 정렬' : '오른쪽 정렬 (2개 이상 선택 필요)') + '</span></button>',
          '<button class="tool-btn ' + (canAlign2 ? '' : 'disabled') + '" ' + (canAlign2 ? 'onclick="alignSelected(\'top\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">Z</span><svg viewBox="0 0 24 24"><line x1="3" y1="4" x2="21" y2="4"/><rect x="6" y="8" width="4" height="12"/><rect x="14" y="8" width="4" height="8"/></svg><span class="tooltip-text">' + (canAlign2 ? '위 정렬' : '위 정렬 (2개 이상 선택 필요)') + '</span></button>',
          '<button class="tool-btn ' + (canAlign2 ? '' : 'disabled') + '" ' + (canAlign2 ? 'onclick="alignSelected(\'vcenter\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">X</span><svg viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><rect x="6" y="6" width="4" height="12"/><rect x="14" y="8" width="4" height="8"/></svg><span class="tooltip-text">' + (canAlign2 ? '수직 중앙 정렬 (가장 위 항목 중심 기준)' : '수직 중앙 정렬 (2개 이상 선택 필요)') + '</span></button>',
          '<button class="tool-btn ' + (canAlign2 ? '' : 'disabled') + '" ' + (canAlign2 ? 'onclick="alignSelected(\'bottom\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">C</span><svg viewBox="0 0 24 24"><line x1="3" y1="20" x2="21" y2="20"/><rect x="6" y="4" width="4" height="12"/><rect x="14" y="8" width="4" height="8"/></svg><span class="tooltip-text">' + (canAlign2 ? '아래 정렬' : '아래 정렬 (2개 이상 선택 필요)') + '</span></button>',
          '<button class="tool-btn ' + (canAlign3 ? '' : 'disabled') + '" ' + (canAlign3 ? 'onclick="alignSelected(\'hdistribute\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">H</span><svg viewBox="0 0 24 24"><line x1="3" y1="4" x2="3" y2="20"/><line x1="21" y1="4" x2="21" y2="20"/><rect x="7" y="7" width="4" height="10"/><rect x="13" y="7" width="4" height="10"/></svg><span class="tooltip-text">' + (canAlign3 ? '가로 동일 간격' : '가로 동일 간격 (독립 단위 3개 이상 선택 필요)') + '</span></button>',
          '<button class="tool-btn ' + (canAlign3 ? '' : 'disabled') + '" ' + (canAlign3 ? 'onclick="alignSelected(\'vdistribute\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">V</span><svg viewBox="0 0 24 24"><line x1="4" y1="3" x2="20" y2="3"/><line x1="4" y1="21" x2="20" y2="21"/><rect x="7" y="7" width="10" height="4"/><rect x="7" y="13" width="10" height="4"/></svg><span class="tooltip-text">' + (canAlign3 ? '세로 동일 간격' : '세로 동일 간격 (독립 단위 3개 이상 선택 필요)') + '</span></button>'
        ];

        var transformTools = [
          '<button class="tool-btn ' + (canTransform ? '' : 'disabled') + '" ' + (canTransform ? 'onclick="transformSelected(\'flipH\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">F</span><svg viewBox="0 0 24 24"><path d="M12 3v18M16 6l5 6-5 6V6zM8 6L3 12l5 6V6z"/></svg><span class="tooltip-text">' + (canTransform ? '좌우 대칭' : '좌우 대칭 (객체 선택 필요)') + '</span></button>',
          '<button class="tool-btn ' + (canTransform ? '' : 'disabled') + '" ' + (canTransform ? 'onclick="transformSelected(\'flipV\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">K</span><svg viewBox="0 0 24 24"><path d="M3 12h18M6 8l6-5 6 5H6zM6 16l6 5 6-5H6z"/></svg><span class="tooltip-text">' + (canTransform ? '상하 대칭' : '상하 대칭 (객체 선택 필요)') + '</span></button>',
          '<button class="tool-btn ' + (canTransform ? '' : 'disabled') + '" ' + (canTransform ? 'onclick="transformSelected(\'rotate90\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">R</span><svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.8 1 6.4 2.6L21 3v6h-6l2.5-2.5A6.9 6.9 0 1 0 19 12"/></svg><span class="tooltip-text">' + (canTransform ? '90도 회전 (시계방향)' : '90도 회전 (객체 선택 필요)') + '</span></button>',
          '<button class="tool-btn ' + (canTransform ? '' : 'disabled') + '" ' + (canTransform ? 'onclick="transformSelected(\'rotateNeg90\')"' : 'disabled style="opacity:0.4; cursor:not-allowed;"') + '><span class="alt-badge">L</span><svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9c-2.5 0-4.8 1-6.4 2.6L3 3v6h6L6.5 6.5A6.9 6.9 0 1 1 5 12"/></svg><span class="tooltip-text">' + (canTransform ? '-90도 회전 (반시계방향)' : '-90도 회전 (객체 선택 필요)') + '</span></button>'
        ];

        ribbonBar.innerHTML = 
          '<div class="ribbon-category">' + self.build3RowGridHtml(shapeTools) + '<div class="category-title">도형 삽입</div></div>' +
          '<div class="ribbon-category">' + self.build3RowGridHtml(layerTools) + '<div class="category-title">레이어 순서</div></div>' +
          '<div class="ribbon-category">' + self.build3RowGridHtml(groupTools) + '<div class="category-title">그룹화</div></div>' +
          '<div class="ribbon-category">' + self.build3RowGridHtml(alignTools) + '<div class="category-title">정렬 및 간격</div></div>' +
          '<div class="ribbon-category">' + self.build3RowGridHtml(transformTools) + '<div class="category-title">회전 및 대칭</div></div>';
      } else if (cfg.currentTab === 'view') {
        var proxVal = cfg.proximityThreshold !== undefined ? cfg.proximityThreshold : 30;
        var szVal = cfg.defaultShapeSize !== undefined ? cfg.defaultShapeSize : 100;
        ribbonBar.innerHTML = 
          '<div class="ribbon-category">' +
            '<div class="category-grid" style="grid-template-columns: auto;">' +
              '<div class="ribbon-control-item"><label>격자 보이기:</label><input type="checkbox" id="chkGridToggle" ' + (cfg.gridSnapEnabled ? 'checked' : '') + ' onchange="toggleGridSnap(this.checked)"></div>' +
              '<div class="ribbon-control-item"><label>격자 크기:</label><select onchange="setGridDensity(this.value)"><option value="480x270" selected>481×271 Step (16:9 표준)</option><option value="240x135">241×136 Step (조밀하게)</option><option value="120x67">121×68 Step (성기게)</option></select></div>' +
              '<div class="ribbon-control-item"><label>근접 선택 거리:</label><select onchange="setProximityThreshold(this.value)"><option value="30" ' + (proxVal===30?'selected':'') + '>30px (기본값)</option><option value="10" ' + (proxVal===10?'selected':'') + '>10px</option><option value="20" ' + (proxVal===20?'selected':'') + '>20px</option><option value="0" ' + (proxVal===0?'selected':'') + '>0px (해제 - 정확한 클릭)</option></select></div>' +
              '<div class="ribbon-control-item"><label>기본 도형 크기:</label><select onchange="setDefaultShapeSize(this.value)"><option value="100" ' + (szVal===100?'selected':'') + '>100px (기본값)</option><option value="150" ' + (szVal===150?'selected':'') + '>150px</option><option value="200" ' + (szVal===200?'selected':'') + '>200px</option><option value="50" ' + (szVal===50?'selected':'') + '>50px</option></select></div>' +
            '</div>' +
            '<div class="category-title">격자 및 스냅/선택/기본크기 설정</div>' +
          '</div>' +
          '<div class="ribbon-category">' +
            '<div class="category-grid" style="grid-template-columns: auto;">' +
              '<div class="ribbon-control-item"><label>캔버스 크기:</label><select onchange="setCanvasRatio(this.value)"><option value="960x540" selected>16:9 (960×540 px)</option><option value="1280x720">16:9 HD (1280×720 px)</option><option value="800x600">4:3 (800×600 px)</option><option value="600x600">1:1 (600×600 px)</option></select></div>' +
              '<div class="ribbon-control-item"><label>캔버스 색상:</label><input type="color" value="' + cfg.canvasBgColor + '" onchange="setCanvasBgColor(this.value)"></div>' +
            '</div>' +
            '<div class="category-title">캔버스 화면 설정</div>' +
          '</div>';
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

        ribbonBar.innerHTML = 
          // === 1. 색 Category (Color) ===
          '<div class="ribbon-category">' +
            '<div style="display:flex; flex-direction:row; align-items:center; gap:8px;">' +
              // Left: 1x2 Radio Mode Target Selector
              '<div style="display:flex; flex-direction:column; gap:4px;">' + strokeBtnHtml + fillBtnHtml + '</div>' +
              // Middle: 9x3 Seamless Swatch Grid
              swatchGridHtml +
              // Right: 1x2 UniPalette Action Buttons
              '<div style="display:flex; flex-direction:column; gap:4px;">' + openPaletteBtnHtml + importPaletteBtnHtml + '</div>' +
            '</div>' +
            '<div class="category-title">색</div>' +
          '</div>' +

          // === 2. 선 Category (Line - Future Dev) ===
          '<div class="ribbon-category">' +
            '<div class="category-grid" style="grid-template-columns: auto 34px 34px;">' +
              '<div class="ribbon-control-item" style="grid-row: 1;"><label>선 두께:</label><input type="number" min="1" max="20" value="' + cfg.strokeWidth + '" oninput="setStrokeWidth(this.value)" onchange="setStrokeWidth(this.value)" style="width:55px;"></div>' +
              '<div class="ribbon-control-item" style="grid-row: 2;"><label>시작 모양:</label><select onchange="setStartMarker(this.value)"><option value="none" ' + (cfg.startMarker==='none'?'selected':'') + '>없음</option><option value="arrow" ' + (cfg.startMarker==='arrow'?'selected':'') + '>화살표</option><option value="circle" ' + (cfg.startMarker==='circle'?'selected':'') + '>동그라미</option><option value="diamond" ' + (cfg.startMarker==='diamond'?'selected':'') + '>다이아몬드</option></select></div>' +
              '<button class="tool-btn" onclick="scaleMarker(\'start\', 1.25)" style="grid-row: 2; grid-column:2;"><span class="alt-badge">+</span><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg><span class="tooltip-text">시작모양 키우기</span></button>' +
              '<button class="tool-btn" onclick="scaleMarker(\'start\', 0.8)" style="grid-row: 2; grid-column:3;"><span class="alt-badge">-</span><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg><span class="tooltip-text">시작모양 줄이기</span></button>' +
              '<div class="ribbon-control-item" style="grid-row: 3;"><label>끝 모양:</label><select onchange="setEndMarker(this.value)"><option value="none" ' + (cfg.endMarker==='none'?'selected':'') + '>없음</option><option value="arrow" ' + (cfg.endMarker==='arrow'?'selected':'') + '>화살표</option><option value="circle" ' + (cfg.endMarker==='circle'?'selected':'') + '>동그라미</option><option value="diamond" ' + (cfg.endMarker==='diamond'?'selected':'') + '>다이아몬드</option></select></div>' +
              '<button class="tool-btn" onclick="scaleMarker(\'end\', 1.25)" style="grid-row: 3; grid-column:2;"><span class="alt-badge">+</span><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg><span class="tooltip-text">끝모양 키우기</span></button>' +
              '<button class="tool-btn" onclick="scaleMarker(\'end\', 0.8)" style="grid-row: 3; grid-column:3;"><span class="alt-badge">-</span><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg><span class="tooltip-text">끝모양 줄이기</span></button>' +
            '</div>' +
            '<div class="category-title">선</div>' +
          '</div>';
      } else if (cfg.currentTab === 'text') {
        ribbonBar.innerHTML = 
          '<div class="ribbon-category">' +
            '<div class="category-grid" style="grid-template-columns: 34px;">' +
              '<button class="tool-btn" onclick="addTextObject()"><span class="alt-badge">T</span><svg viewBox="0 0 24 24"><path d="M4 7V4h16v3M12 4v16M9 20h6"/></svg><span class="tooltip-text">텍스트 상자 추가</span></button>' +
            '</div>' +
            '<div class="category-title">글 서식</div>' +
          '</div>';
      } else if (cfg.currentTab === 'anim') {
        ribbonBar.innerHTML = 
          '<div class="ribbon-category">' +
            '<div class="category-grid" style="grid-template-columns: 34px 34px;">' +
              '<button class="tool-btn" onclick="playAnimation(\'draw\')"><span class="alt-badge">P</span><svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg><span class="tooltip-text">선 그리기 애니메이션</span></button>' +
              '<button class="tool-btn" onclick="playAnimation(\'fade\')"><span class="alt-badge">F</span><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke-dasharray="4,4"/></svg><span class="tooltip-text">페이드 나타나기</span></button>' +
            '</div>' +
            '<div class="category-title">애니메이션 미리보기</div>' +
          '</div>';
      }
    },

    // Update SVG Element Attributes & Cursors
    updateElementAttributes: function(obj) {
      var a = obj.attrs;
      if (obj.type === 'point') {
        obj.el.setAttribute('cx', a.cx);
        obj.el.setAttribute('cy', a.cy);
        obj.el.setAttribute('r', a.r || cfg.pointRadius || 5);
      } else if (obj.type === 'line') {
        obj.el.setAttribute('x1', a.x1);
        obj.el.setAttribute('y1', a.y1);
        obj.el.setAttribute('x2', a.x2);
        obj.el.setAttribute('y2', a.y2);
      } else if (obj.type === 'rect' || obj.type === 'rounded') {
        obj.el.setAttribute('x', a.x);
        obj.el.setAttribute('y', a.y);
        obj.el.setAttribute('width', a.width);
        obj.el.setAttribute('height', a.height);
        if (a.rx !== undefined) obj.el.setAttribute('rx', a.rx);
      } else if (obj.type === 'ellipse') {
        obj.el.setAttribute('cx', a.cx);
        obj.el.setAttribute('cy', a.cy);
        obj.el.setAttribute('rx', a.rx);
        obj.el.setAttribute('ry', a.ry);
        if (a.angle) {
          obj.el.setAttribute('transform', 'rotate(' + a.angle + ' ' + a.cx + ' ' + a.cy + ')');
        } else {
          obj.el.removeAttribute('transform');
        }
      } else if (obj.type === 'arc') {
        var sAng = a.startAngle !== undefined ? a.startAngle : -90;
        var eAng = a.endAngle !== undefined ? a.endAngle : 0;
        var rot = a.angle || 0;

        var p1 = getArcPoint(a.cx, a.cy, a.rx, a.ry, sAng, rot);
        var p2 = getArcPoint(a.cx, a.cy, a.rx, a.ry, eAng, rot);

        var sweepDiff = (eAng - sAng + 360) % 360;
        var largeArcFlag = sweepDiff > 180 ? 1 : 0;

        var d = 'M ' + p1.x + ' ' + p1.y +
                ' A ' + a.rx + ' ' + a.ry + ' ' + rot + ' ' + largeArcFlag + ' 1 ' + p2.x + ' ' + p2.y;
        obj.el.setAttribute('d', d);
      } else if (obj.type === 'bez2' || obj.type === 'bez3') {
        if (a.pathD) {
          obj.el.setAttribute('d', a.pathD);
        } else if (obj.type === 'bez2') {
          obj.el.setAttribute('d', 'M ' + a.x1 + ' ' + a.y1 + ' Q ' + a.cx + ' ' + a.cy + ' ' + a.x2 + ' ' + a.y2);
        } else if (obj.type === 'bez3') {
          obj.el.setAttribute('d', 'M ' + a.x1 + ' ' + a.y1 + ' C ' + a.c1x + ' ' + a.c1y + ', ' + a.c2x + ' ' + a.c2y + ', ' + a.x2 + ' ' + a.y2);
        }
      }

      // Dynamic Mouse Cursor Styles
      if (cfg.currentTool === 'select') {
        if (cfg.selectedIds.has(obj.id)) {
          obj.el.style.cursor = 'move';
        } else {
          obj.el.style.cursor = 'pointer';
        }
      } else {
        obj.el.style.cursor = 'crosshair';
      }
    },

    // Render Control Handle Node
    createHandleNode: function(x, y, objId, handleType, idx, isSpecial) {
      var uiGroup = document.getElementById('uiGroup');
      if (!uiGroup) return;

      var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x);
      circle.setAttribute('cy', y);
      circle.setAttribute('r', isSpecial ? '6' : '5');
      circle.setAttribute('fill', isSpecial ? '#facc15' : '#ffffff');
      circle.setAttribute('stroke', '#000000');
      circle.setAttribute('stroke-width', '1.5');
      circle.setAttribute('class', 'handle-node');
      circle.style.cursor = 'grab';

      circle.addEventListener('mousedown', function(e) {
        e.stopPropagation();
        window.WebpointerState.isDraggingHandle = true;
        window.WebpointerState.activeHandleInfo = { objId: objId, handleType: handleType, idx: idx };
      });
      uiGroup.appendChild(circle);
    },

    // Render Selection Bounding Overlay & Handles
    renderUI: function() {
      var uiGroup = document.getElementById('uiGroup');
      var statSelected = document.getElementById('statSelected');
      if (!uiGroup) return;
      uiGroup.innerHTML = '';
      if (statSelected) statSelected.textContent = cfg.selectedIds.size + '개';

      if (cfg.selectedIds.size === 0) return;

      var self = this;
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      // 1. Calculate Overall Selection Bounding Box
      cfg.selectedIds.forEach(function(id) {
        var obj = cfg.objectsMap.get(id);
        if (!obj) return;
        var a = obj.attrs;

        if (obj.type === 'point') {
          minX = Math.min(minX, a.cx - (a.r || 5));
          maxX = Math.max(maxX, a.cx + (a.r || 5));
          minY = Math.min(minY, a.cy - (a.r || 5));
          maxY = Math.max(maxY, a.cy + (a.r || 5));
        } else if (obj.type === 'line') {
          minX = Math.min(minX, a.x1, a.x2);
          maxX = Math.max(maxX, a.x1, a.x2);
          minY = Math.min(minY, a.y1, a.y2);
          maxY = Math.max(maxY, a.y1, a.y2);
        } else if (obj.type === 'rect' || obj.type === 'rounded') {
          minX = Math.min(minX, a.x);
          maxX = Math.max(maxX, a.x + a.width);
          minY = Math.min(minY, a.y);
          maxY = Math.max(maxY, a.y + a.height);
        } else if (obj.type === 'ellipse' || obj.type === 'arc') {
          minX = Math.min(minX, a.cx - a.rx);
          maxX = Math.max(maxX, a.cx + a.rx);
          minY = Math.min(minY, a.cy - a.ry);
          maxY = Math.max(maxY, a.cy + a.ry);
        } else if (obj.type === 'bez2' || obj.type === 'bez3') {
          if (a.points && a.points.length > 0) {
            a.points.forEach(function(pt) {
              minX = Math.min(minX, pt.px);
              maxX = Math.max(maxX, pt.px);
              minY = Math.min(minY, pt.py);
              maxY = Math.max(maxY, pt.py);
            });
          } else {
            minX = Math.min(minX, a.x1, a.x2, a.cx !== undefined ? a.cx : a.x1);
            maxX = Math.max(maxX, a.x1, a.x2, a.cx !== undefined ? a.cx : a.x1);
            minY = Math.min(minY, a.y1, a.y2, a.cy !== undefined ? a.cy : a.y1);
            maxY = Math.max(maxY, a.y1, a.y2, a.cy !== undefined ? a.cy : a.y1);
          }
        }
      });

      if (minX !== Infinity) {
        var pad = 6;
        var boxRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        boxRect.setAttribute('x', minX - pad);
        boxRect.setAttribute('y', minY - pad);
        boxRect.setAttribute('width', (maxX - minX) + pad * 2);
        boxRect.setAttribute('height', (maxY - minY) + pad * 2);
        boxRect.setAttribute('fill', 'none');
        boxRect.setAttribute('stroke', '#0284c7');
        boxRect.setAttribute('stroke-width', '1.2');
        boxRect.setAttribute('stroke-dasharray', '4,4');
        uiGroup.appendChild(boxRect);
      }

      // 2. Render Individual Shape Handles
      cfg.selectedIds.forEach(function(id) {
        var obj = cfg.objectsMap.get(id);
        if (!obj) return;
        var a = obj.attrs;

        if (obj.type === 'point') {
          self.createHandleNode(a.cx, a.cy, id, 'point_center', 1, false);
        } else if (obj.type === 'ellipse') {
          var angleRad = (a.angle || 0) * (Math.PI / 180);
          
          function getRotatedPoint(px, py) {
            var dx = px - a.cx;
            var dy = py - a.cy;
            var rxRot = dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
            var ryRot = dx * Math.sin(angleRad) + dy * Math.cos(angleRad);
            return { x: a.cx + rxRot, y: a.cy + ryRot };
          }

          var ptCenter = { x: a.cx, y: a.cy };
          var ptWidth  = getRotatedPoint(a.cx + a.rx, a.cy);
          var ptHeight = getRotatedPoint(a.cx, a.cy - a.ry);
          var ptRotate = getRotatedPoint(a.cx, a.cy - a.ry - 25);

          var rotStem = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          rotStem.setAttribute('x1', ptHeight.x);
          rotStem.setAttribute('y1', ptHeight.y);
          rotStem.setAttribute('x2', ptRotate.x);
          rotStem.setAttribute('y2', ptRotate.y);
          rotStem.setAttribute('stroke', '#0284c7');
          rotStem.setAttribute('stroke-dasharray', '3,3');
          rotStem.setAttribute('stroke-width', '1.5');
          uiGroup.appendChild(rotStem);

          self.createHandleNode(ptCenter.x, ptCenter.y, id, 'ellipse_center', 1, false);
          self.createHandleNode(ptWidth.x, ptWidth.y, id, 'ellipse_width', 2, false);
          self.createHandleNode(ptHeight.x, ptHeight.y, id, 'ellipse_height', 3, false);
          self.createHandleNode(ptRotate.x, ptRotate.y, id, 'ellipse_rotate', 4, true);

        } else if (obj.type === 'arc') {
          var rotArc = a.angle || 0;
          var sAng = a.startAngle !== undefined ? a.startAngle : -90;
          var eAng = a.endAngle !== undefined ? a.endAngle : 0;

          var ptCenterArc = { x: a.cx, y: a.cy };
          var ptWidthArc  = getArcPoint(a.cx, a.cy, a.rx, a.ry, 0, rotArc);
          var ptHeightArc = getArcPoint(a.cx, a.cy, a.rx, a.ry, -90, rotArc);
          var ptRotateArc = getArcPoint(a.cx, a.cy, a.rx, a.ry - 25, -90, rotArc);

          var ptStartAng = getArcPoint(a.cx, a.cy, a.rx, a.ry, sAng, rotArc);
          var ptEndAng   = getArcPoint(a.cx, a.cy, a.rx, a.ry, eAng, rotArc);

          var lineStart = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          lineStart.setAttribute('x1', a.cx); lineStart.setAttribute('y1', a.cy);
          lineStart.setAttribute('x2', ptStartAng.x); lineStart.setAttribute('y2', ptStartAng.y);
          lineStart.setAttribute('stroke', '#38bdf8'); lineStart.setAttribute('stroke-dasharray', '2,2');
          uiGroup.appendChild(lineStart);

          var lineEnd = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          lineEnd.setAttribute('x1', a.cx); lineEnd.setAttribute('y1', a.cy);
          lineEnd.setAttribute('x2', ptEndAng.x); lineEnd.setAttribute('y2', ptEndAng.y);
          lineEnd.setAttribute('stroke', '#38bdf8'); lineEnd.setAttribute('stroke-dasharray', '2,2');
          uiGroup.appendChild(lineEnd);

          var stemArc = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          stemArc.setAttribute('x1', ptHeightArc.x); stemArc.setAttribute('y1', ptHeightArc.y);
          stemArc.setAttribute('x2', ptRotateArc.x); stemArc.setAttribute('y2', ptRotateArc.y);
          stemArc.setAttribute('stroke', '#0284c7'); stemArc.setAttribute('stroke-dasharray', '3,3');
          uiGroup.appendChild(stemArc);

          self.createHandleNode(ptCenterArc.x, ptCenterArc.y, id, 'arc_center', 1, false);
          self.createHandleNode(ptWidthArc.x, ptWidthArc.y, id, 'arc_rx', 2, false);
          self.createHandleNode(ptHeightArc.x, ptHeightArc.y, id, 'arc_ry', 3, false);
          self.createHandleNode(ptRotateArc.x, ptRotateArc.y, id, 'arc_rotate', 4, true);
          self.createHandleNode(ptStartAng.x, ptStartAng.y, id, 'arc_start_angle', 5, false);
          self.createHandleNode(ptEndAng.x, ptEndAng.y, id, 'arc_end_angle', 6, false);

        } else if (obj.type === 'bez2') {
          if (a.points && a.points.length > 0) {
            a.points.forEach(function(pt, idx) {
              self.createHandleNode(pt.px, pt.py, id, 'bez_vertex', idx, false);
            });
            if (a.points.length >= 2) {
              var P0 = a.points[0];
              var P1 = a.points[1];
              var c1x = a.firstCtrl ? a.firstCtrl.cx : Math.round((P0.px + P1.px) / 2);
              var c1y = a.firstCtrl ? a.firstCtrl.cy : (Math.min(P0.py, P1.py) - 100);

              self.createHandleNode(c1x, c1y, id, 'bez2_ctrl', 0, true);

              var guideLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              var gD = 'M ' + P0.px + ' ' + P0.py + ' L ' + c1x + ' ' + c1y + ' L ' + P1.px + ' ' + P1.py;

              var prevC = { x: c1x, y: c1y };
              for (var k = 2; k < a.points.length; k++) {
                var prevP = a.points[k-1];
                var currP = a.points[k];
                var reflX = 2 * prevP.px - prevC.x;
                var reflY = 2 * prevP.py - prevC.y;
                self.createHandleNode(reflX, reflY, id, 'bez2_ctrl_refl', k-1, true);
                gD += ' L ' + reflX + ' ' + reflY + ' L ' + currP.px + ' ' + currP.py;
                prevC = { x: reflX, y: reflY };
              }

              guideLine.setAttribute('d', gD);
              guideLine.setAttribute('stroke', '#0284c7');
              guideLine.setAttribute('stroke-dasharray', '3,3');
              guideLine.setAttribute('fill', 'none');
              uiGroup.appendChild(guideLine);
            }
          } else {
            var guide = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            guide.setAttribute('d', 'M ' + a.x1 + ' ' + a.y1 + ' L ' + a.cx + ' ' + a.cy + ' L ' + a.x2 + ' ' + a.y2);
            guide.setAttribute('stroke', '#0284c7');
            guide.setAttribute('stroke-dasharray', '3,3');
            guide.setAttribute('fill', 'none');
            uiGroup.appendChild(guide);

            self.createHandleNode(a.x1, a.y1, id, 'start', 1, false);
            self.createHandleNode(a.x2, a.y2, id, 'end', 2, false);
            self.createHandleNode(a.cx, a.cy, id, 'bez2_ctrl', 3, true);
          }

        } else if (obj.type === 'bez3') {
          if (a.points && a.points.length > 0) {
            // 1. Render All Vertex Handles (White)
            a.points.forEach(function(pt, idx) {
              self.createHandleNode(pt.px, pt.py, id, 'bez_vertex', idx, false);
            });

            // 2. Render Control Handles for ALL segments of bez3 (3차 베지어 대칭 핸들 동기화)
            if (a.points.length >= 2) {
              a.ctrls3 = a.ctrls3 || [];
              var gD3 = '';

              for (var seg = 0; seg < a.points.length - 1; seg++) {
                var pStart = a.points[seg];
                var pEnd = a.points[seg + 1];

                if (!a.ctrls3[seg]) {
                  if (seg === 0) {
                    a.ctrls3[seg] = {
                      c1: { x: pStart.px, y: Math.round((pStart.py + pEnd.py) / 2 - 50) },
                      c2: { x: pEnd.px, y: Math.round((pStart.py + pEnd.py) / 2 - 50) }
                    };
                  } else {
                    var prevC2 = a.ctrls3[seg - 1].c2;
                    a.ctrls3[seg] = {
                      c1: { x: 2 * pStart.px - prevC2.x, y: 2 * pStart.py - prevC2.y },
                      c2: { x: pEnd.px, y: Math.round((pStart.py + pEnd.py) / 2 - 50) }
                    };
                  }
                }

                var ctrl1 = a.ctrls3[seg].c1;
                var ctrl2 = a.ctrls3[seg].c2;

                // Render Yellow Handles for both c1 and c2
                self.createHandleNode(ctrl1.x, ctrl1.y, id, 'bez3_c1', seg, true);
                self.createHandleNode(ctrl2.x, ctrl2.y, id, 'bez3_c2', seg, true);

                if (seg === 0) {
                  gD3 += 'M ' + pStart.px + ' ' + pStart.py;
                }
                gD3 += ' L ' + ctrl1.x + ' ' + ctrl1.y + ' L ' + ctrl2.x + ' ' + ctrl2.y + ' L ' + pEnd.px + ' ' + pEnd.py;
              }

              var guideLine3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              guideLine3.setAttribute('d', gD3);
              guideLine3.setAttribute('stroke', '#0284c7');
              guideLine3.setAttribute('stroke-dasharray', '3,3');
              guideLine3.setAttribute('fill', 'none');
              uiGroup.appendChild(guideLine3);
            }
          } else {
            var guide2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            guide2.setAttribute('d', 'M ' + a.x1 + ' ' + a.y1 + ' L ' + a.c1x + ' ' + a.c1y + ' L ' + a.c2x + ' ' + a.c2y + ' L ' + a.x2 + ' ' + a.y2);
            guide2.setAttribute('stroke', '#0284c7');
            guide2.setAttribute('stroke-dasharray', '3,3');
            guide2.setAttribute('fill', 'none');
            uiGroup.appendChild(guide2);

            self.createHandleNode(a.x1, a.y1, id, 'start', 1, false);
            self.createHandleNode(a.x2, a.y2, id, 'end', 2, false);
            self.createHandleNode(a.c1x, a.c1y, id, 'bez3_ctrl1', 3, true);
            self.createHandleNode(a.c2x, a.c2y, id, 'bez3_ctrl2', 4, true);
          }

        } else if (obj.type === 'line') {
          self.createHandleNode(a.x1, a.y1, id, 'start', 1, false);
          self.createHandleNode(a.x2, a.y2, id, 'end', 2, false);

        } else if (obj.type === 'rect') {
          self.createHandleNode(a.x, a.y, id, 'top_left', 1, false);
          self.createHandleNode(a.x + a.width, a.y + a.height, id, 'bottom_right', 2, false);

        } else if (obj.type === 'rounded') {
          var cornerRx = a.rx !== undefined ? a.rx : 15;
          self.createHandleNode(a.x, a.y, id, 'top_left', 1, false);
          self.createHandleNode(a.x + a.width, a.y + a.height, id, 'bottom_right', 2, false);
          self.createHandleNode(a.x + cornerRx, a.y, id, 'corner_rx', 3, true);
        }
      });
    },

    // Update DOM Tree Inspector
    updateDomTree: function() {
      var domTree = document.getElementById('domTree');
      if (!domTree) return;
      domTree.innerHTML = '';
      var self = this;
      cfg.objectsMap.forEach(function(obj, id) {
        var item = document.createElement('div');
        item.className = 'tree-item ' + (cfg.selectedIds.has(id) ? 'selected' : '');
        item.textContent = '<' + obj.type + '> #' + id + (obj.parentId ? ' [Group: ' + obj.parentId + ']' : '');
        item.onclick = function(e) {
          if (!e.ctrlKey) cfg.selectedIds.clear();
          cfg.selectedIds.add(id);
          self.renderUI();
          self.renderRibbon();
          self.updateDomTree();
        };
        domTree.appendChild(item);
      });
    }
  };

  // Expose global updateSvgDefs helper to guarantee global accessibility
  window.updateSvgDefs = function() {
    WebpointerRender.updateSvgDefs();
  };

  window.WebpointerRender = WebpointerRender;
})();
