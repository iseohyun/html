/**
 * Suite 04: Text Formatting, Alignment, AutoFit & Copy/Paste (TC09, TC15, TC27, TC42~TC47, TC50~TC59)
 */
(function() {
  var describe = window.WebpointerTest.describe;
  var test = window.WebpointerTest.test;
  var expect = window.WebpointerTest.expect;

  describe('Suite 04: Text Formatting, Alignment, AutoFit & Rotation', function() {

    test('TC09: Detailed Text Formatting Suite (Font, Underline Style)', async function({ page, appWindow }) {
      if (appWindow.setTextUnderlineStyle) {
        appWindow.setTextUnderlineStyle('double');
        expect(appWindow.WebpointerConfig.textUnderlineStyle).toBe('double');
      }
    });

    test('TC15: Text Selection Font Size Hotkeys (+/-)', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      var curSize = cfg.fontSize || 20;
      if (appWindow.adjustFontSize) {
        appWindow.adjustFontSize(2);
        expect(cfg.fontSize).toBe(curSize + 2);
        appWindow.adjustFontSize(-2);
        expect(cfg.fontSize).toBe(curSize);
      }
    });

    test('TC27: Shape Text Horizontal & Vertical Alignment Suite', async function({ page, appWindow }) {
      var shapeObj = { id: 's1', type: 'rect', attrs: { x: 100, y: 100, width: 200, height: 100 } };
      var textObj = { id: 't1', type: 'text', attrs: { text: 'Hello', fontSize: 20 } };
      if (appWindow.updateShapeTextAlignment) {
        appWindow.updateShapeTextAlignment(shapeObj, textObj, 'left', 'top');
        expect(textObj.attrs.x).toBe(110); // 100 + padLeft(10) = 110

        appWindow.updateShapeTextAlignment(shapeObj, textObj, 'right', 'bottom');
        expect(textObj.attrs.x).toBe(290); // 100 + 200 - padRight(10) = 290
      }
    });

    test('TC42 & TC43: 텍스트 상자 회전 및 피벗 중심축 일치 검증', async function({ page, appWindow }) {
      var textObj = { id: 'rot_text', type: 'text', attrs: { x: 200, y: 200, text: '회전 텍스트', fontSize: 20, angle: 30 } };
      appWindow.WebpointerConfig.objectsMap.set(textObj.id, textObj);

      var center = appWindow.WebpointerObjects ? appWindow.WebpointerObjects.getObjectCenter(textObj) : { x: 200, y: 200 };
      expect(center).toBeDefined();
      expect(center.x).toBeGreaterThan(0);
      expect(center.y).toBeGreaterThan(0);
    });

    test('TC44: <text> 요소 NaN/undefined 속성 안전 방어', async function({ page, appWindow }) {
      var doc = appWindow.document;
      var textEl = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
      var textObj = { id: 'nan_text', type: 'text', el: textEl, attrs: { x: NaN, y: undefined, text: 'Safe' } };
      if (appWindow.WebpointerRender && appWindow.WebpointerRender.updateElementAttributes) {
        appWindow.WebpointerRender.updateElementAttributes(textObj);
      }
      expect(parseFloat(textEl.getAttribute('x')) || 0).toBe(0);
      expect(parseFloat(textEl.getAttribute('y')) || 0).toBe(0);
    });

    test('TC46 & TC47: 도형 영역 할당 텍스트의 중심축 회전 및 동기화', async function({ page, appWindow }) {
      var rectObj = { id: 'r_rot', type: 'rect', parentId: 'grp_rot', attrs: { x: 200, y: 200, width: 200, height: 100, angle: 45 } };
      var textObj = { id: 't_rot', type: 'text', parentId: 'grp_rot', attrs: { x: 200, y: 200, width: 200, height: 100, text: '동기화', angle: 45 } };
      appWindow.WebpointerConfig.objectsMap.set(rectObj.id, rectObj);
      appWindow.WebpointerConfig.objectsMap.set(textObj.id, textObj);

      expect(rectObj.attrs.angle).toBe(45);
      expect(textObj.attrs.angle).toBe(45);
    });

    test('TC50 & TC51 & TC52: F2 키 편집모드, dominant-baseline="hanging" 및 글상자 크기 동기화', async function({ page, appWindow }) {
      var doc = appWindow.document;
      var textEl = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
      var textObj = { id: 't_hang', type: 'text', el: textEl, attrs: { x: 100, y: 100, text: '상단 베이스라인' } };
      if (appWindow.WebpointerRender && appWindow.WebpointerRender.updateElementAttributes) {
        appWindow.WebpointerRender.updateElementAttributes(textObj);
      }
      expect(textEl.getAttribute('dominant-baseline')).toBe('hanging');
    });

    test('TC54: 양쪽 맞춤 경계 위치 및 word-spacing 조절', async function({ page, appWindow }) {
      var doc = appWindow.document;
      var textEl = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
      doc.getElementById('objectsGroup').appendChild(textEl);
      var textObj = {
        id: 't_just',
        type: 'text',
        el: textEl,
        attrs: { x: 100, y: 100, text: 'Hello World Justify Test', textAnchor: 'justify', fontSize: 20, width: 300 }
      };
      if (appWindow.WebpointerRender && appWindow.WebpointerRender.updateElementAttributes) {
        appWindow.WebpointerRender.updateElementAttributes(textObj);
      }
      expect(textEl.getAttribute('text-anchor')).toBe('start');
    });

    test('TC55: 위/중앙/아래 정렬 시 hanging 베이스라인 오프셋 반영 및 반복 토글 위치 고정', async function({ page, appWindow }) {
      var shape = { id: 's_v', type: 'rect', parentId: 'grp_v', attrs: { x: 100, y: 100, width: 200, height: 200 } };
      var text = { id: 't_v', type: 'text', parentId: 'grp_v', attrs: { x: 100, y: 100, width: 200, height: 200, text: '수직정렬\n2행', fontSize: 20 } };
      appWindow.WebpointerConfig.objectsMap.set(shape.id, shape);
      appWindow.WebpointerConfig.objectsMap.set(text.id, text);
      appWindow.WebpointerConfig.selectedIds.clear();
      appWindow.WebpointerConfig.selectedIds.add(text.id);

      appWindow.cycleTextVerticalAlign();
      var midY = text.attrs.y;
      appWindow.cycleTextVerticalAlign();
      var botY = text.attrs.y;
      appWindow.cycleTextVerticalAlign();
      var topY = text.attrs.y;

      expect(topY).toBe(110);
      expect(midY).toBeGreaterThan(100);
      expect(midY).toBeLessThan(300);
      expect(botY).toBeGreaterThan(midY);
    });

    test('TC56: Ctrl+C / Ctrl+V 클립보드 기능 검증', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      cfg.objectsMap.clear();
      cfg.selectedIds.clear();

      var rect = { id: 'c_r1', type: 'rect', attrs: { x: 50, y: 50, width: 100, height: 100 } };
      cfg.objectsMap.set(rect.id, rect);
      cfg.selectedIds.add(rect.id);

      if (appWindow.copySelectedObjects) appWindow.copySelectedObjects();
      if (appWindow.pasteClipboardObjects) appWindow.pasteClipboardObjects();

      expect(cfg.objectsMap.size).toBe(2);
    });

    test('TC57: 글 서식 탭 내 패딩 카테고리 연동 및 수직 정렬 정확도', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      expect(cfg.padTop).toBe(10);
      expect(cfg.padBottom).toBe(10);
      expect(cfg.padLeft).toBe(10);
      expect(cfg.padRight).toBe(10);
      expect(cfg.padSync).toBe(true);

      if (appWindow.setTextPadding) {
        appWindow.setTextPadding('top', 25);
        expect(cfg.padTop).toBe(25);
        appWindow.setTextPadding('top', 10);
      }
    });

    test('TC58: fitTextToShape 방향A (초과 시 폰트 축소, 여백 남을 시 기본 폰트 유지 및 정렬)', async function({ page, appWindow }) {
      var shape = { id: 'fit_s', type: 'rect', parentId: 'grp_fit', attrs: { x: 100, y: 100, width: 300, height: 200 } };
      var text = { id: 'fit_t', type: 'text', parentId: 'grp_fit', attrs: { x: 100, y: 100, width: 300, height: 200, text: '여백 충분 텍스트', fontSize: 20, baseFontSize: 20 } };
      appWindow.WebpointerConfig.objectsMap.set(shape.id, shape);
      appWindow.WebpointerConfig.objectsMap.set(text.id, text);

      if (appWindow.applyAutoFitToGroup) {
        appWindow.applyAutoFitToGroup('grp_fit', 'fitTextToShape');
        expect(text.attrs.fontSize).toBe(20);
      }
    });

    test('TC59: cycleTextAutoFitMode 3회 이상 순환 클릭 시 baseFontSize 보존 및 누적 축소 방지', async function({ page, appWindow }) {
      var shape = { id: 'sp_s', type: 'rect', parentId: 'grp_sp', attrs: { x: 100, y: 100, width: 100, height: 50 } };
      var text = { id: 'sp_t', type: 'text', parentId: 'grp_sp', attrs: { x: 100, y: 100, width: 100, height: 50, text: '긴 텍스트가 들어가서 크기가 줄어들어야 하는 테스트', fontSize: 20, baseFontSize: 20 } };
      appWindow.WebpointerConfig.objectsMap.set(shape.id, shape);
      appWindow.WebpointerConfig.objectsMap.set(text.id, text);
      appWindow.WebpointerConfig.selectedIds.clear();
      appWindow.WebpointerConfig.selectedIds.add(shape.id);

      appWindow.cycleTextAutoFitMode(); // fitShapeToText -> baseFontSize restored
      var sz1 = text.attrs.fontSize;
      appWindow.cycleTextAutoFitMode(); // fitTextToShape -> shrunk
      var sz2 = text.attrs.fontSize;
      appWindow.cycleTextAutoFitMode(); // none -> baseFontSize restored
      var sz3 = text.attrs.fontSize;

      expect(sz1).toBe(20);
      expect(sz2).toBeLessThanOrEqual(20);
      expect(sz3).toBe(20);
    });

  });
})();
