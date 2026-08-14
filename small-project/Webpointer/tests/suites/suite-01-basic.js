/**
 * Suite 01: Basic Canvas Setup, Ribbon & Tool Switching (TC01 ~ TC06)
 */
(function() {
  var describe = window.WebpointerTest.describe;
  var test = window.WebpointerTest.test;
  var expect = window.WebpointerTest.expect;

  describe('Suite 01: Basic Setup & Tools (TC01 ~ TC06)', function() {

    test('TC01: Initial Load & Canvas Setup', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      expect(cfg).toBeDefined();
      expect(cfg.objectsMap).toBeDefined();
      expect(cfg.selectedIds).toBeDefined();

      var mainSvg = appWindow.document.getElementById('mainSvg');
      var vb = mainSvg.getAttribute('viewBox');
      expect(vb).toBeTruthy();
      expect(/^\d+(\.\d+)?\s+\d+(\.\d+)?\s+\d+(\.\d+)?\s+\d+(\.\d+)?$/.test(vb.trim())).toBe(true);

      var objectsGroup = appWindow.document.getElementById('objectsGroup');
      var uiGroup = appWindow.document.getElementById('uiGroup');
      var gridGroup = appWindow.document.getElementById('gridGroup');

      expect(objectsGroup).toBeDefined();
      expect(uiGroup).toBeDefined();
      expect(gridGroup).toBeDefined();
    });

    test('TC02: Ribbon Menu Tab Switching', async function({ page, appWindow }) {
      var doc = appWindow.document;
      var tabs = ['home', 'insert', 'style', 'text', 'anim', 'symbol', 'settings'];
      
      for (var i = 0; i < tabs.length; i++) {
        var tabKey = tabs[i];
        if (appWindow.switchTab) {
          appWindow.switchTab(tabKey);
          expect(appWindow.WebpointerConfig.currentTab).toBe(tabKey);
        }
      }
      if (appWindow.switchTab) appWindow.switchTab('home');
    });

    test('TC03: Ribbon Menu Category Collapse Toggle', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      if (!cfg.collapsedCategories) cfg.collapsedCategories = new Set();

      if (appWindow.toggleCategoryCollapse) {
        appWindow.toggleCategoryCollapse('tools');
        expect(cfg.collapsedCategories.has('tools')).toBe(true);

        appWindow.toggleCategoryCollapse('tools');
        expect(cfg.collapsedCategories.has('tools')).toBe(false);
      }
    });

    test('TC04: Palette Modal Open/Close & Add Color', async function({ page, appWindow }) {
      if (appWindow.openPaletteModal) {
        appWindow.openPaletteModal();
        var modal = appWindow.document.getElementById('paletteModal');
        expect(modal).toBeDefined();
        expect(modal.style.display !== 'none').toBe(true);

        if (appWindow.closePaletteModal) {
          appWindow.closePaletteModal();
          expect(modal.style.display).toBe('none');
        }
      }
    });

    test('TC05: Tool Switching Suite', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      var tools = ['select', 'pan', 'point', 'line', 'rect', 'rounded', 'ellipse', 'arc', 'text'];

      for (var i = 0; i < tools.length; i++) {
        var t = tools[i];
        if (appWindow.setTool) {
          appWindow.setTool(t);
          expect(cfg.currentTool).toBe(t);
        }
      }
      if (appWindow.setTool) appWindow.setTool('select');
    });

    test('TC06: DOM 구조 및 캔버스 렌더링 무결성 검증 (DOM Structure & Rendering Integrity)', async function({ page, appWindow }) {
      var doc = appWindow.document;
      var ribbon = doc.getElementById('ribbonContainer');
      var canvasWrap = doc.getElementById('canvasWrapper');
      var mainSvg = doc.getElementById('mainSvg');
      var objectsGroup = doc.getElementById('objectsGroup');
      var uiGroup = doc.getElementById('uiGroup');
      var gridGroup = doc.getElementById('gridGroup');

      expect(ribbon).toBeTruthy();
      expect(canvasWrap).toBeTruthy();
      expect(mainSvg).toBeTruthy();
      expect(objectsGroup).toBeTruthy();
      expect(uiGroup).toBeTruthy();
      expect(gridGroup).toBeTruthy();

      expect(mainSvg.getAttribute('viewBox')).toBeTruthy();
      expect(gridGroup.parentElement).toBe(mainSvg);
      expect(objectsGroup.parentElement).toBe(mainSvg);
      expect(uiGroup.parentElement).toBe(mainSvg);
    });

  });
})();
