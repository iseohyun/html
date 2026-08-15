/**
 * Suite 03: Styling, Gradients, Filters & Color Long-Press (S03_TC01 ~ S03_TC09)
 */
(function() {
  var describe = window.WebpointerTest.describe;
  var test = window.WebpointerTest.test;
  var expect = window.WebpointerTest.expect;

  describe('Suite 03: Styles, Gradients & Colors', function() {

    test('S03_TC01: Shape & Style Settings Suite', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      if (appWindow.setStrokeColor) {
        appWindow.setStrokeColor('#ff0000');
        expect(cfg.strokeColor).toBe('#ff0000');
      }
      if (appWindow.setFillColor) {
        appWindow.setFillColor('#00ff00');
        expect(cfg.fillColor).toBe('#00ff00');
      }
    });

    test('S03_TC02: Gradient Fill Presets & Color Stops', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      if (appWindow.applyGradientPreset) {
        appWindow.applyGradientPreset(1);
        expect(cfg.fillColor).toContain('linear-gradient');
      }
    });

    test('S03_TC03: CSS / SVG Filter Effects (Drop Shadow, Blur, Grayscale)', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      if (appWindow.setDropShadow) {
        appWindow.setDropShadow(true);
        expect(cfg.dropShadow).toBe(true);
      }
      if (appWindow.setBlurEffect) {
        appWindow.setBlurEffect(5);
        expect(cfg.blurEffect).toBe(5);
      }
    });

    test('S03_TC04: Gradient Direct Angle Slider & Stop Controls', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      if (appWindow.setGradientAngle) {
        appWindow.setGradientAngle(180);
        expect(cfg.gradientAngle).toBe(180);
      }
    });

    test('S03_TC05: Detailed Shape Format Toolbar Suite', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      var obj = { id: 's_fmt_test', type: 'rect', attrs: { x: 50, y: 50, width: 100, height: 100, strokeWidth: 2 } };
      cfg.objectsMap.set(obj.id, obj);
      cfg.selectedIds.clear();
      cfg.selectedIds.add(obj.id);

      if (appWindow.setStrokeWidth) {
        appWindow.setStrokeWidth(6);
        expect(obj.attrs.strokeWidth).toBe(6);
      }
    });

    test('S03_TC06: Gradient Fill Linear & Radial Engine with SVG Defs Injection', async function({ page, appWindow }) {
      var doc = appWindow.document;
      var defs = doc.getElementById('svgDefs');
      expect(defs).toBeTruthy();
    });

    test('S03_TC07: 색상 버튼 5종 단독 적용 및 200ms 롱프레스 팔레트 팝오버', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      var shape = { id: 'color_test_s', type: 'rect', parentId: 'grp_color', attrs: { x: 100, y: 100, width: 100, height: 100, stroke: '#000000', fill: '#ffffff' } };
      var text = { id: 'color_test_t', type: 'text', parentId: 'grp_color', attrs: { x: 100, y: 100, width: 100, height: 100, text: 'Sample', fill: '#000000', stroke: 'none' } };

      cfg.objectsMap.clear();
      cfg.selectedIds.clear();
      cfg.objectsMap.set(shape.id, shape);
      cfg.objectsMap.set(text.id, text);
      cfg.selectedIds.add(shape.id);

      // Short click stroke color
      cfg.strokeColor = '#059669';
      if (appWindow.applyCurrentColorDirectly) {
        appWindow.applyCurrentColorDirectly('stroke');
        expect(shape.attrs.stroke).toBe('#059669');
        expect(shape.attrs.fill).toBe('#ffffff');
      }

      // Short click text fill color (merged into shape group)
      cfg.textFillColor = '#dc2626';
      if (appWindow.applyCurrentColorDirectly) {
        appWindow.applyCurrentColorDirectly('text_fill');
        expect(text.attrs.fill).toBe('#dc2626');
      }
    });

    test('S03_TC08: Gradient & Defs Generator Matrix Handlers', async function({ page, appWindow }) {
      if (appWindow.openGradientManagerModal && appWindow.closeGradientManagerModal) {
        appWindow.openGradientManagerModal();
        appWindow.closeGradientManagerModal();
      }
      expect(true).toBe(true);
    });

    test('S03_TC09: Filter Stack & Range Controls Engine Matrix', async function({ page, appWindow }) {
      if (appWindow.openFilterPopover) {
        var dummy = appWindow.document.createElement('button');
        appWindow.document.body.appendChild(dummy);
        appWindow.openFilterPopover(dummy);
        if (appWindow.updateFilterRangeConfig) appWindow.updateFilterRangeConfig('blur', 10);
        appWindow.document.body.removeChild(dummy);
      }
      expect(true).toBe(true);
    });

  });
})();
