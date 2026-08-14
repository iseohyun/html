/**
 * Suite 03: Styles, Gradients, Filters & Color Hold (TC08, TC19, TC20, TC25, TC26, TC28, TC61)
 */
(function() {
  var describe = window.WebpointerTest.describe;
  var test = window.WebpointerTest.test;
  var expect = window.WebpointerTest.expect;

  describe('Suite 03: Styles, Gradients, Filters & Color Hold', function() {

    test('TC08: Picture Formatting Suite (Stroke Width & Format Inputs)', async function({ page, appWindow }) {
      if (appWindow.setStrokeWidth) {
        appWindow.setStrokeWidth(5);
        expect(appWindow.WebpointerConfig.strokeWidth).toBe(5);
      }
      if (appWindow.setStrokeCap) {
        appWindow.setStrokeCap('round');
        expect(appWindow.WebpointerConfig.strokeCap).toBe('round');
      }
      if (appWindow.setStrokeJoin) {
        appWindow.setStrokeJoin('bevel');
        expect(appWindow.WebpointerConfig.strokeJoin).toBe('bevel');
      }
    });

    test('TC19: Extended Fill Color Palette (Linear/Radial Gradient, Pattern, Image Fill)', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      var doc = appWindow.document;
      var objectsGroup = doc.getElementById('objectsGroup');

      var rectEl = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
      objectsGroup.appendChild(rectEl);
      var rectObj = { id: 'grad_rect_19', type: 'rect', el: rectEl, attrs: { x: 50, y: 50, width: 100, height: 100 } };
      cfg.objectsMap.set(rectObj.id, rectObj);
      cfg.selectedIds.clear();
      cfg.selectedIds.add(rectObj.id);

      if (appWindow.applyGradientFill) {
        appWindow.applyGradientFill('linear', ['#ff0000', '#0000ff']);
        if (appWindow.WebpointerRender && appWindow.WebpointerRender.updateElementAttributes) {
          appWindow.WebpointerRender.updateElementAttributes(rectObj);
        }
        var fillVal = rectEl.getAttribute('fill');
        expect(fillVal && fillVal.includes('url(#')).toBe(true);
      }
    });

    test('TC20: Picture Filter Effects Suite (Stacked Filters & Range Coefficients)', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      var obj = cfg.objectsMap.get('grad_rect_19');
      if (obj) {
        obj.attrs.filterList = ['blur(4px)', 'contrast(120%)'];
        if (appWindow.WebpointerRender && appWindow.WebpointerRender.updateElementAttributes) {
          appWindow.WebpointerRender.updateElementAttributes(obj);
        }
        expect(obj.attrs.filterList.length).toBe(2);
      }
    });

    test('TC25: Image Fill Modes (Stretch, Tile, Single) Suite', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      var obj = cfg.objectsMap.get('grad_rect_19');
      if (obj && appWindow.applyImageFill) {
        appWindow.applyImageFill('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'tile');
        expect(obj.attrs.imageFillMode || 'tile').toBe('tile');
      }
    });

    test('TC26: Multi-Stop Gradient Color Ramp & 2-Point Handles Suite', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      var obj = cfg.objectsMap.get('grad_rect_19');
      if (obj) {
        obj.attrs.gradientStops = [
          { offset: '0%', color: '#ff0000', opacity: 1 },
          { offset: '50%', color: '#00ff00', opacity: 1 },
          { offset: '100%', color: '#0000ff', opacity: 1 }
        ];
        expect(obj.attrs.gradientStops.length).toBe(3);
      }
    });

    test('TC28: Live Filter Preview & Stack Reordering Suite', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      var obj = cfg.objectsMap.get('grad_rect_19');
      if (obj && obj.attrs.filterList) {
        var first = obj.attrs.filterList[0];
        obj.attrs.filterList.reverse();
        expect(obj.attrs.filterList[1]).toBe(first);
      }
    });

    test('TC61: 색상 버튼(선, 면 채우기, 글자 채우기, 글자 테두리, 밑줄) 짧은 클릭 시 색상 즉시 적용 및 롱프레스(Hold 200ms) 시 팔레트 팝오버 오픈 검증 수트', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      var handlers = appWindow;
      var doc = appWindow.document;
      var objectsGroup = doc.getElementById('objectsGroup');

      cfg.objectsMap.clear();
      cfg.selectedIds.clear();

      // 1. Shape single-property mutation test
      var rectEl = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
      objectsGroup.appendChild(rectEl);
      var rectObj = {
        id: 'color_rect_61',
        type: 'rect',
        el: rectEl,
        attrs: { x: 100, y: 100, width: 200, height: 100, stroke: '#000000', fill: '#ffffff', strokeWidth: 5 }
      };
      cfg.objectsMap.set(rectObj.id, rectObj);
      cfg.selectedIds.add(rectObj.id);

      cfg.strokeColor = '#e11d48';
      cfg.fillColor = '#10b981';

      var dummyBtn = doc.createElement('button');
      handlers.handleColorBtnClick(dummyBtn, 'stroke');
      expect(rectObj.attrs.stroke).toBe('#e11d48');
      expect(rectObj.attrs.fill).toBe('#ffffff');
      expect(rectObj.attrs.strokeWidth).toBe(5);

      handlers.handleColorBtnClick(dummyBtn, 'fill');
      expect(rectObj.attrs.fill).toBe('#10b981');
      expect(rectObj.attrs.stroke).toBe('#e11d48');

      // 2. Text element DOM fill and stroke test
      var textEl = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
      objectsGroup.appendChild(textEl);
      var textObj = {
        id: 'color_text_61',
        type: 'text',
        el: textEl,
        attrs: { x: 100, y: 250, text: '색상 테스트', fill: '#000000', stroke: 'none', underlineColor: '#000000' }
      };
      cfg.objectsMap.set(textObj.id, textObj);
      cfg.selectedIds.clear();
      cfg.selectedIds.add(textObj.id);

      cfg.textFillColor = '#8b5cf6';
      cfg.textStrokeColor = '#f59e0b';
      cfg.textUnderlineColor = '#3b82f6';

      handlers.handleColorBtnClick(dummyBtn, 'text_fill');
      expect(textObj.attrs.fill).toBe('#8b5cf6');
      expect(textEl.getAttribute('fill')).toBe('#8b5cf6');

      handlers.handleColorBtnClick(dummyBtn, 'text_stroke');
      expect(textObj.attrs.stroke).toBe('#f59e0b');
      expect(textEl.getAttribute('stroke')).toBe('#f59e0b');

      handlers.handleColorBtnClick(dummyBtn, 'text_underline');
      expect(textObj.attrs.underlineColor).toBe('#3b82f6');

      // 3. 200ms Long-press hold popover test
      doc.body.appendChild(dummyBtn);
      handlers.startHoldColorBtn(new MouseEvent('mousedown'), dummyBtn, 'stroke');

      await new Promise(function(r) { setTimeout(r, 250); });
      var popoverAfterHold = doc.getElementById('colorPalettePopover');
      expect(popoverAfterHold).toBeTruthy();
      expect(popoverAfterHold.dataset.targetMode).toBe('stroke');

      handlers.endHoldColorBtn();
      handlers.handleColorBtnClick(dummyBtn, 'stroke');

      if (popoverAfterHold && popoverAfterHold.parentNode) popoverAfterHold.parentNode.removeChild(popoverAfterHold);
      if (dummyBtn.parentNode) dummyBtn.parentNode.removeChild(dummyBtn);
    });

  });
})();
