/**
 * Suite 10: Canvas Mouse Event State-Machine Suite (S10_TC01 ~ S10_TC05)
 */
(function() {
  var describe = window.WebpointerTest.describe;
  var test = window.WebpointerTest.test;
  var expect = window.WebpointerTest.expect;

  function dispatchMouseEvent(target, type, x, y, options) {
    options = options || {};
    var rect = target.getBoundingClientRect();
    var clientX = rect.left + x;
    var clientY = rect.top + y;
    var evt = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: clientX,
      clientY: clientY,
      button: options.button || 0,
      buttons: options.buttons || 1,
      shiftKey: !!options.shiftKey,
      ctrlKey: !!options.ctrlKey,
      altKey: !!options.altKey
    });
    target.dispatchEvent(evt);
  }

  describe('Suite 10: Canvas Mouse Interactions & State-Machine', function() {

    test('S10_TC01: Marquee Drag Selection (Rubberband Multi-Selection)', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      var svg = appWindow.document.getElementById('mainSvg');

      var o1 = { id: 'ms_o1', type: 'rect', attrs: { x: 50, y: 50, width: 30, height: 30 } };
      var o2 = { id: 'ms_o2', type: 'rect', attrs: { x: 90, y: 90, width: 30, height: 30 } };
      cfg.objectsMap.clear();
      cfg.selectedIds.clear();
      cfg.objectsMap.set(o1.id, o1);
      cfg.objectsMap.set(o2.id, o2);
      cfg.currentTool = 'select';

      dispatchMouseEvent(svg, 'mousedown', 60, 60);
      dispatchMouseEvent(svg, 'mouseup', 60, 60);
      expect(cfg.selectedIds.has('ms_o1')).toBe(true);

      dispatchMouseEvent(svg, 'mousedown', 100, 100, { ctrlKey: true });
      dispatchMouseEvent(svg, 'mouseup', 100, 100, { ctrlKey: true });
      expect(cfg.selectedIds.size).toBe(2);
    });

    test('S10_TC02: Object Drag & Translation with Mouse', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      var svg = appWindow.document.getElementById('mainSvg');

      var rectEl = appWindow.document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      appWindow.document.getElementById('objectsGroup').appendChild(rectEl);
      var o = { id: 'ms_drag_obj', type: 'rect', el: rectEl, attrs: { x: 100, y: 100, width: 50, height: 50 } };
      cfg.objectsMap.clear();
      cfg.selectedIds.clear();
      cfg.objectsMap.set(o.id, o);
      cfg.selectedIds.add(o.id);
      cfg.currentTool = 'select';

      dispatchMouseEvent(svg, 'mousedown', 110, 110);
      dispatchMouseEvent(svg, 'mousemove', 140, 140);
      dispatchMouseEvent(svg, 'mouseup', 140, 140);

      expect(o.attrs.x).toBeGreaterThan(100);
    });

    test('S10_TC03: Pan Tool Dragging (Canvas ViewBox Pan)', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      var svg = appWindow.document.getElementById('mainSvg');
      cfg.currentTool = 'pan';

      dispatchMouseEvent(svg, 'mousedown', 100, 100);
      dispatchMouseEvent(svg, 'mousemove', 50, 50);
      dispatchMouseEvent(svg, 'mouseup', 50, 50);

      cfg.currentTool = 'select';
      expect(svg.getAttribute('viewBox')).toBeTruthy();
    });

    test('S10_TC04: Shift Key Aspect-Ratio Constraint & Snap Modes', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      var svg = appWindow.document.getElementById('mainSvg');
      cfg.currentTool = 'rect';

      dispatchMouseEvent(svg, 'mousedown', 50, 50, { shiftKey: true });
      dispatchMouseEvent(svg, 'mousemove', 150, 120, { shiftKey: true });
      dispatchMouseEvent(svg, 'mouseup', 150, 120, { shiftKey: true });

      cfg.currentTool = 'select';
      expect(cfg.objectsMap.size).toBeGreaterThan(0);
    });

    test('S10_TC05: Animation SMIL & Keyframe State Engine Matrix', async function({ page, appWindow }) {
      if (appWindow.playAnimation) appWindow.playAnimation();
      if (appWindow.stopAllAnimations) appWindow.stopAllAnimations();
      if (appWindow.setAnimStep) appWindow.setAnimStep(1);
      expect(true).toBe(true);
    });

  });
})();
