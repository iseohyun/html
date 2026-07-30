/**
 * Webpointer Rendering Layer Module
 * Focuses solely on dynamic SVG manipulation, ribbon UI rendering, and DOM updates.
 */
(function() {
  var cfg = window.WebpointerConfig;

  var WebpointerRender = {
    // Render 481x271 Step Grid Lines
    renderGrid: function() {
      var gridGroup = document.getElementById('gridGroup');
      var mainSvg = document.getElementById('mainSvg');
      if (!gridGroup || !mainSvg) return;

      gridGroup.innerHTML = '';
      mainSvg.style.backgroundColor = cfg.canvasBgColor;

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
      gridPath.setAttribute('stroke', 'rgba(51, 65, 85, 0.4)');
      gridPath.setAttribute('stroke-width', '0.6');
      gridGroup.appendChild(gridPath);
    },

    // Update SVG Defs for Arrow/Circle/Diamond Markers
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
          path.setAttribute('fill', cfg.strokeColor);

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

    // Helper: Build 3-Row Item Grid (Sequential Row 1, Row 2, Row 3 Filling)
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
          self.makeToolHtml('bez2', '2차 베지어 (1 핸들)', '7', '<svg viewBox="0 0 24 24"><path d="M 3 18 Q 12 3 21 18"/><circle cx="12" cy="3" r="2" fill="currentColor"/></svg>'),
          self.makeToolHtml('bez3', '3차 베지어 (2 핸들)', '8', '<svg viewBox="0 0 24 24"><path d="M 3 18 C 7 3, 17 3, 21 18"/><circle cx="7" cy="3" r="2" fill="currentColor"/><circle cx="17" cy="3" r="2" fill="currentColor"/></svg>'),
          self.makeToolHtml('rounded', '둥근 사각형', '9', '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="5"/></svg>')
        ];

        var layerTools = [
          '<button class="tool-btn" onclick="arrangeOrder(\'backward\')"><span class="alt-badge">Q</span><svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12"/><rect x="4" y="4" width="12" height="12" fill="rgba(56,189,248,0.3)"/></svg><span class="tooltip-text">뒤로</span></button>',
          '<button class="tool-btn" onclick="arrangeOrder(\'back\')"><span class="alt-badge">W</span><svg viewBox="0 0 24 24"><rect x="10" y="10" width="10" height="10"/><rect x="4" y="4" width="10" height="10" fill="rgba(56,189,248,0.3)"/></svg><span class="tooltip-text">맨뒤로</span></button>',
          '<button class="tool-btn" onclick="arrangeOrder(\'forward\')"><span class="alt-badge">E</span><svg viewBox="0 0 24 24"><rect x="4" y="4" width="12" height="12"/><rect x="8" y="8" width="12" height="12" fill="rgba(56,189,248,0.3)"/></svg><span class="tooltip-text">앞으로</span></button>',
          '<button class="tool-btn" onclick="arrangeOrder(\'front\')"><span class="alt-badge">R</span><svg viewBox="0 0 24 24"><rect x="4" y="4" width="10" height="10"/><rect x="10" y="10" width="10" height="10" fill="rgba(56,189,248,0.3)"/></svg><span class="tooltip-text">맨앞으로</span></button>'
        ];

        var groupTools = [
          '<button class="tool-btn" onclick="groupSelected()"><span class="alt-badge">G</span><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" stroke-dasharray="3,3"/><rect x="6" y="6" width="6" height="6"/><rect x="12" y="12" width="6" height="6"/></svg><span class="tooltip-text">그룹화 (&lt;g&gt;)</span></button>',
          '<button class="tool-btn" onclick="ungroupSelected()"><span class="alt-badge">U</span><svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" stroke-dasharray="2,2"/><rect x="13" y="13" width="8" height="8" stroke-dasharray="2,2"/></svg><span class="tooltip-text">그룹 해제</span></button>'
        ];

        var alignTools = [
          '<button class="tool-btn" onclick="alignSelected(\'left\')"><span class="alt-badge">A</span><svg viewBox="0 0 24 24"><line x1="4" y1="3" x2="4" y2="21"/><rect x="8" y="6" width="12" height="4"/><rect x="8" y="14" width="8" height="4"/></svg><span class="tooltip-text">왼쪽 정렬</span></button>',
          '<button class="tool-btn" onclick="alignSelected(\'hcenter\')"><span class="alt-badge">S</span><svg viewBox="0 0 24 24"><line x1="12" y1="3" x2="12" y2="21"/><rect x="6" y="6" width="12" height="4"/><rect x="8" y="14" width="8" height="4"/></svg><span class="tooltip-text">수평 중앙 정렬</span></button>',
          '<button class="tool-btn" onclick="alignSelected(\'right\')"><span class="alt-badge">D</span><svg viewBox="0 0 24 24"><line x1="20" y1="3" x2="20" y2="21"/><rect x="4" y="6" width="12" height="4"/><rect x="8" y="14" width="8" height="4"/></svg><span class="tooltip-text">오른쪽 정렬</span></button>',
          '<button class="tool-btn" onclick="alignSelected(\'top\')"><span class="alt-badge">Z</span><svg viewBox="0 0 24 24"><line x1="3" y1="4" x2="21" y2="4"/><rect x="6" y="8" width="4" height="12"/><rect x="14" y="8" width="4" height="8"/></svg><span class="tooltip-text">위 정렬</span></button>',
          '<button class="tool-btn" onclick="alignSelected(\'vcenter\')"><span class="alt-badge">X</span><svg viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><rect x="6" y="6" width="4" height="12"/><rect x="14" y="8" width="4" height="8"/></svg><span class="tooltip-text">수직 중앙 정렬</span></button>',
          '<button class="tool-btn" onclick="alignSelected(\'bottom\')"><span class="alt-badge">C</span><svg viewBox="0 0 24 24"><line x1="3" y1="20" x2="21" y2="20"/><rect x="6" y="4" width="4" height="12"/><rect x="14" y="8" width="4" height="8"/></svg><span class="tooltip-text">아래 정렬</span></button>'
        ];

        ribbonBar.innerHTML = 
          '<div class="ribbon-category">' + self.build3RowGridHtml(shapeTools) + '<div class="category-title">도형 삽입</div></div>' +
          '<div class="ribbon-category">' + self.build3RowGridHtml(layerTools) + '<div class="category-title">레이어 순서</div></div>' +
          '<div class="ribbon-category">' + self.build3RowGridHtml(groupTools) + '<div class="category-title">그룹화</div></div>' +
          '<div class="ribbon-category">' + self.build3RowGridHtml(alignTools) + '<div class="category-title">정렬</div></div>';
      } else if (cfg.currentTab === 'view') {
        ribbonBar.innerHTML = 
          '<div class="ribbon-category">' +
            '<div class="category-grid" style="grid-template-columns: auto;">' +
              '<div class="ribbon-control-item"><label>격자 보이기:</label><input type="checkbox" id="chkGridToggle" ' + (cfg.gridSnapEnabled ? 'checked' : '') + ' onchange="toggleGridSnap(this.checked)"></div>' +
              '<div class="ribbon-control-item"><label>격자 크기:</label><select onchange="setGridDensity(this.value)"><option value="480x270" selected>481×271 Step (16:9 표준)</option><option value="240x135">241×136 Step (조밀하게)</option><option value="120x67">121×68 Step (성기게)</option></select></div>' +
            '</div>' +
            '<div class="category-title">격자 및 스냅 설정</div>' +
          '</div>' +
          '<div class="ribbon-category">' +
            '<div class="category-grid" style="grid-template-columns: auto;">' +
              '<div class="ribbon-control-item"><label>캔버스 크기:</label><select onchange="setCanvasRatio(this.value)"><option value="960x540" selected>16:9 (960×540 px)</option><option value="1280x720">16:9 HD (1280×720 px)</option><option value="800x600">4:3 (800×600 px)</option><option value="600x600">1:1 (600×600 px)</option></select></div>' +
              '<div class="ribbon-control-item"><label>캔버스 색상:</label><input type="color" value="' + cfg.canvasBgColor + '" onchange="setCanvasBgColor(this.value)"></div>' +
            '</div>' +
            '<div class="category-title">캔버스 화면 설정</div>' +
          '</div>';
      } else if (cfg.currentTab === 'style') {
        ribbonBar.innerHTML = 
          '<div class="ribbon-category">' +
            '<div class="category-grid" style="grid-template-columns: auto;">' +
              '<div class="ribbon-control-item"><label>테두리 색상:</label><input type="color" value="' + cfg.strokeColor + '" onchange="strokeColor=this.value; updateSvgDefs(); applyStyleToSelected();"></div>' +
              '<div class="ribbon-control-item"><label>채우기 색상:</label><input type="color" value="' + (cfg.fillColor.startsWith('#') ? cfg.fillColor : '#38bdf8') + '" onchange="fillColor=this.value; applyStyleToSelected();"></div>' +
              '<div class="ribbon-control-item"><label>선 두께:</label><input type="number" min="1" max="20" value="' + cfg.strokeWidth + '" onchange="strokeWidth=parseInt(this.value); applyStyleToSelected();" style="width:55px;"></div>' +
            '</div>' +
            '<div class="category-title">기본 스타일</div>' +
          '</div>' +
          '<div class="ribbon-category">' +
            '<div class="category-grid" style="grid-template-columns: auto 34px 34px;">' +
              '<div class="ribbon-control-item" style="grid-row: 1 / span 3;"><label>시작 모양:</label><select onchange="startMarker=this.value; applyStyleToSelected();"><option value="none" ' + (cfg.startMarker==='none'?'selected':'') + '>없음</option><option value="arrow" ' + (cfg.startMarker==='arrow'?'selected':'') + '>화살표</option><option value="circle" ' + (cfg.startMarker==='circle'?'selected':'') + '>동그라미</option><option value="diamond" ' + (cfg.startMarker==='diamond'?'selected':'') + '>다이아몬드</option></select></div>' +
              '<button class="tool-btn" onclick="scaleMarker(\'start\', 1.25)" style="grid-row: 1;"><span class="alt-badge">+</span><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg><span class="tooltip-text">시작모양 키우기</span></button>' +
              '<button class="tool-btn" onclick="scaleMarker(\'start\', 0.8)" style="grid-row: 2;"><span class="alt-badge">-</span><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg><span class="tooltip-text">시작모양 줄이기</span></button>' +
            '</div>' +
            '<div class="category-title">시작 모양 마커</div>' +
          '</div>' +
          '<div class="ribbon-category">' +
            '<div class="category-grid" style="grid-template-columns: auto 34px 34px;">' +
              '<div class="ribbon-control-item" style="grid-row: 1 / span 3;"><label>끝 모양:</label><select onchange="endMarker=this.value; applyStyleToSelected();"><option value="none" ' + (cfg.endMarker==='none'?'selected':'') + '>없음</option><option value="arrow" ' + (cfg.endMarker==='arrow'?'selected':'') + '>화살표</option><option value="circle" ' + (cfg.endMarker==='circle'?'selected':'') + '>동그라미</option><option value="diamond" ' + (cfg.endMarker==='diamond'?'selected':'') + '>다이아몬드</option></select></div>' +
              '<button class="tool-btn" onclick="scaleMarker(\'end\', 1.25)" style="grid-row: 1;"><span class="alt-badge">+</span><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg><span class="tooltip-text">끝모양 키우기</span></button>' +
              '<button class="tool-btn" onclick="scaleMarker(\'end\', 0.8)" style="grid-row: 2;"><span class="alt-badge">-</span><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg><span class="tooltip-text">끝모양 줄이기</span></button>' +
            '</div>' +
            '<div class="category-title">끝 모양 마커</div>' +
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

    // Update Object Element Attributes
    updateElementAttributes: function(obj) {
      var a = obj.attrs;
      if (obj.type === 'point') {
        obj.el.setAttribute('cx', a.cx);
        obj.el.setAttribute('cy', a.cy);
        obj.el.setAttribute('r', a.r || 6);
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
        if (a.rx) obj.el.setAttribute('rx', a.rx);
      } else if (obj.type === 'ellipse') {
        obj.el.setAttribute('cx', a.cx);
        obj.el.setAttribute('cy', a.cy);
        obj.el.setAttribute('rx', a.rx);
        obj.el.setAttribute('ry', a.ry);
      } else if (obj.type === 'bez2') {
        obj.el.setAttribute('d', 'M ' + a.x1 + ' ' + a.y1 + ' Q ' + a.cx + ' ' + a.cy + ' ' + a.x2 + ' ' + a.y2);
      } else if (obj.type === 'bez3') {
        obj.el.setAttribute('d', 'M ' + a.x1 + ' ' + a.y1 + ' C ' + a.c1x + ' ' + a.c1y + ', ' + a.c2x + ' ' + a.c2y + ', ' + a.x2 + ' ' + a.y2);
      } else if (obj.type === 'arc') {
        obj.el.setAttribute('d', 'M ' + a.x1 + ' ' + a.y1 + ' A ' + a.rx + ' ' + a.ry + ' 0 0 1 ' + a.x2 + ' ' + a.y2);
      }
    },

    // Render Handle Overlay Node
    createHandleNode: function(x, y, objId, handleType, idx) {
      var uiGroup = document.getElementById('uiGroup');
      if (!uiGroup) return;

      var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x);
      circle.setAttribute('cy', y);
      circle.setAttribute('r', '5');
      circle.setAttribute('fill', '#38bdf8');
      circle.setAttribute('stroke', '#ffffff');
      circle.setAttribute('stroke-width', '1.5');
      circle.setAttribute('class', 'handle-node');

      circle.addEventListener('mousedown', function(e) {
        e.stopPropagation();
        window.WebpointerState.isDraggingHandle = true;
        window.WebpointerState.activeHandleInfo = { objId: objId, handleType: handleType, idx: idx };
      });
      uiGroup.appendChild(circle);
    },

    // Render Selection Bounding Overlay
    renderUI: function() {
      var uiGroup = document.getElementById('uiGroup');
      var statSelected = document.getElementById('statSelected');
      if (!uiGroup) return;
      uiGroup.innerHTML = '';
      if (statSelected) statSelected.textContent = cfg.selectedIds.size + '개';

      if (cfg.selectedIds.size === 0) return;

      var self = this;
      cfg.selectedIds.forEach(function(id) {
        var obj = cfg.objectsMap.get(id);
        if (!obj) return;
        var a = obj.attrs;

        if (obj.type === 'bez2') {
          var guide = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          guide.setAttribute('d', 'M ' + a.x1 + ' ' + a.y1 + ' L ' + a.cx + ' ' + a.cy + ' L ' + a.x2 + ' ' + a.y2);
          guide.setAttribute('stroke', '#38bdf8');
          guide.setAttribute('stroke-dasharray', '3,3');
          guide.setAttribute('fill', 'none');
          uiGroup.appendChild(guide);
          self.createHandleNode(a.cx, a.cy, id, 'bez2_ctrl', 1);
        } else if (obj.type === 'bez3') {
          var guide2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          guide2.setAttribute('d', 'M ' + a.x1 + ' ' + a.y1 + ' L ' + a.c1x + ' ' + a.c1y + ' L ' + a.c2x + ' ' + a.c2y + ' L ' + a.x2 + ' ' + a.y2);
          guide2.setAttribute('stroke', '#38bdf8');
          guide2.setAttribute('stroke-dasharray', '3,3');
          guide2.setAttribute('fill', 'none');
          uiGroup.appendChild(guide2);
          self.createHandleNode(a.c1x, a.c1y, id, 'bez3_ctrl1', 1);
          self.createHandleNode(a.c2x, a.c2y, id, 'bez3_ctrl2', 2);
        } else if (obj.type === 'line' || obj.type === 'arc') {
          self.createHandleNode(a.x1, a.y1, id, 'start', 1);
          self.createHandleNode(a.x2, a.y2, id, 'end', 2);
        } else if (obj.type === 'rect' || obj.type === 'rounded') {
          self.createHandleNode(a.x, a.y, id, 'top_left', 1);
          self.createHandleNode(a.x + a.width, a.y + a.height, id, 'bottom_right', 2);
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
          self.updateDomTree();
        };
        domTree.appendChild(item);
      });
    }
  };

  window.WebpointerRender = WebpointerRender;
})();
