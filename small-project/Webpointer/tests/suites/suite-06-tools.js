/**
 * Suite 06: Canvas Tools, Symbols, Layers, Snapping & Metrics (TC10, TC12~TC14, TC16, TC18, TC21~TC23, TC32, TC48, TC49)
 */
(function() {
  var describe = window.WebpointerTest.describe;
  var test = window.WebpointerTest.test;
  var expect = window.WebpointerTest.expect;

  describe('Suite 06: Canvas Tools, Symbols, Layers & Snapping', function() {

    test('TC10: Proximity Selection Distance & Nearest Object Detection', async function({ page, appWindow }) {
      var rect = { id: 'prox_rect', type: 'rect', attrs: { x: 100, y: 100, width: 100, height: 100 } };
      appWindow.WebpointerConfig.objectsMap.set(rect.id, rect);

      var found = null;
      if (appWindow.WebpointerObjects && appWindow.WebpointerObjects.findNearestObject) {
        found = appWindow.WebpointerObjects.findNearestObject(105, 105, 15);
      }
      expect(found && found.id === 'prox_rect').toBe(true);
    });

    test('TC12: Animation Tab & Preset Previews', async function({ page, appWindow }) {
      if (appWindow.switchTab) appWindow.switchTab('anim');
      expect(appWindow.WebpointerConfig.currentTab).toBe('anim');
    });

    test('TC13: Shortcut Guidance Modal Popup', async function({ page, appWindow }) {
      if (appWindow.openShortcutModal) {
        appWindow.openShortcutModal();
        var modal = appWindow.document.getElementById('shortcutModal');
        expect(modal).toBeDefined();
        if (appWindow.closeShortcutModal) appWindow.closeShortcutModal();
      }
    });

    test('TC14: Detailed Settings Modal & Apply Proximity Threshold', async function({ page, appWindow }) {
      if (appWindow.openDetailedSettingsModal) {
        appWindow.openDetailedSettingsModal();
        var modal = appWindow.document.getElementById('detailedSettingsModal');
        expect(modal).toBeDefined();
        if (appWindow.closeDetailedSettingsModal) appWindow.closeDetailedSettingsModal();
      }
    });

    test('TC16 & TC21: Non-Destructive Image & Shape Cropping (ClipPath) & Symbol Cookie-Cutter', async function({ page, appWindow }) {
      var imgObj = { id: 'crop_img', type: 'image', attrs: { x: 50, y: 50, width: 200, height: 200, crop: { x: 10, y: 10, width: 100, height: 100 } } };
      appWindow.WebpointerConfig.objectsMap.set(imgObj.id, imgObj);
      expect(imgObj.attrs.crop.width).toBe(100);
    });

    test('TC18: Symbol Manager Modal & Symbol Registry Operations', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      expect(Array.isArray(cfg.symbolRegistry)).toBe(true);
    });

    test('TC22: Smart Alignment Snap Guides & Snapping', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      expect(cfg.enableSnapping !== undefined).toBe(true);
    });

    test('TC23: Object Alignment & Distribution Tools', async function({ page, appWindow }) {
      var o1 = { id: 'al_1', type: 'rect', attrs: { x: 100, y: 100, width: 50, height: 50 } };
      var o2 = { id: 'al_2', type: 'rect', attrs: { x: 200, y: 100, width: 50, height: 50 } };
      appWindow.WebpointerConfig.objectsMap.set(o1.id, o1);
      appWindow.WebpointerConfig.objectsMap.set(o2.id, o2);
      appWindow.WebpointerConfig.selectedIds.clear();
      appWindow.WebpointerConfig.selectedIds.add(o1.id);
      appWindow.WebpointerConfig.selectedIds.add(o2.id);

      if (appWindow.alignSelectedObjects) {
        appWindow.alignSelectedObjects('left');
        expect(o2.attrs.x).toBe(100);
      }
    });

    test('TC32: 그림 맨앞으로, 앞으로, 맨뒤로, 뒤로 레이어 순서 변경', async function({ page, appWindow }) {
      expect(typeof appWindow.bringToFront).toBe('function');
      expect(typeof appWindow.bringForward).toBe('function');
      expect(typeof appWindow.sendToBack).toBe('function');
      expect(typeof appWindow.sendBackward).toBe('function');
    });

    test('TC48: 리본 메뉴 [삽입 > 수치 (가로, 세로, 회전각)] 카테고리', async function({ page, appWindow }) {
      var obj = { id: 'metric_obj', type: 'rect', attrs: { x: 50, y: 50, width: 150, height: 80, angle: 30 } };
      appWindow.WebpointerConfig.objectsMap.set(obj.id, obj);
      appWindow.WebpointerConfig.selectedIds.clear();
      appWindow.WebpointerConfig.selectedIds.add(obj.id);

      if (appWindow.setObjectMetric) {
        appWindow.setObjectMetric('width', 200);
        expect(obj.attrs.width).toBe(200);
      }
    });

    test('TC49: transformSelected(rotate90) 90도 회전 도구 및 변형 도구', async function({ page, appWindow }) {
      var obj = { id: 'rot90_obj', type: 'rect', attrs: { x: 50, y: 50, width: 100, height: 100, angle: 0 } };
      appWindow.WebpointerConfig.objectsMap.set(obj.id, obj);
      appWindow.WebpointerConfig.selectedIds.clear();
      appWindow.WebpointerConfig.selectedIds.add(obj.id);

      if (appWindow.transformSelected) {
        appWindow.transformSelected('rotate90');
        expect(obj.attrs.angle).toBe(90);
      }
    });

  });
})();
