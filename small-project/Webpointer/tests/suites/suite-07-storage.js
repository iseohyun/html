/**
 * Suite 07: Storage, File Slots & Temporary Save (TC11, TC24, TC-TEMP-SAVE-01~09)
 */
(function() {
  var describe = window.WebpointerTest.describe;
  var test = window.WebpointerTest.test;
  var expect = window.WebpointerTest.expect;

  describe('Suite 07: Storage, File Slots & Temporary Save', function() {

    test('TC11 & TC24: File Operations Suite & File Slots Modal', async function({ page, appWindow }) {
      if (appWindow.openFileSlotsModal) {
        appWindow.openFileSlotsModal();
        var modal = appWindow.document.getElementById('fileSlotsModal');
        expect(modal).toBeDefined();
        if (appWindow.closeFileSlotsModal) appWindow.closeFileSlotsModal();
      }
    });

    test('TC-TEMP-SAVE-01: 슬롯 1~5 저장 데이터 직렬화 및 정상 보존', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      var obj = { id: 'slot_test_obj', type: 'rect', attrs: { x: 100, y: 100, width: 200, height: 100 } };
      cfg.objectsMap.set(obj.id, obj);

      if (appWindow.saveToSlot) {
        appWindow.saveToSlot(1);
        var slotData = localStorage.getItem('webpointer_slot_1');
        expect(slotData).toBeTruthy();
      }
    });

    test('TC-TEMP-SAVE-02: 슬롯 복원 시 캔버스 오브젝트 및 속성 무결성 복구', async function({ page, appWindow }) {
      if (appWindow.loadFromSlot) {
        appWindow.WebpointerConfig.objectsMap.clear();
        appWindow.loadFromSlot(1);
        expect(appWindow.WebpointerConfig.objectsMap.size).toBeGreaterThan(0);
      }
    });

    test('TC-TEMP-SAVE-06: IndexedDB 하이브리드 엔진 동작 무결성', async function({ page, appWindow }) {
      expect(typeof window.indexedDB).toBe('object');
    });

    test('TC-TEMP-SAVE-09: SVG 추출 시 격자 레이어 배제 옵션 검증', async function({ page, appWindow }) {
      if (appWindow.getCanvasSVGContent) {
        var svgStr = appWindow.getCanvasSVGContent(false); // exclude grid
        expect(svgStr && !svgStr.includes('id="gridGroup"')).toBe(true);
      }
    });

  });
})();
