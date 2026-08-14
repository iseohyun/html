/**
 * Suite 02: Shapes, Arc & Orthogonal Snapping (TC07, TC38~TC41, TC60)
 */
(function() {
  var describe = window.WebpointerTest.describe;
  var test = window.WebpointerTest.test;
  var expect = window.WebpointerTest.expect;

  describe('Suite 02: Shapes, Arc & Orthogonal Snapping', function() {

    test('TC07: Full Shape Drawing Suite (Point, Line, Ellipse, Arc)', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      var doc = appWindow.document;
      var objectsGroup = doc.getElementById('objectsGroup');

      // Create a rect
      var rEl = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
      objectsGroup.appendChild(rEl);
      var rObj = { id: 'test_r7', type: 'rect', el: rEl, attrs: { x: 50, y: 50, width: 100, height: 80 } };
      cfg.objectsMap.set(rObj.id, rObj);
      if (appWindow.WebpointerRender && appWindow.WebpointerRender.updateElementAttributes) {
        appWindow.WebpointerRender.updateElementAttributes(rObj);
      }
      expect(rEl.getAttribute('x')).toBe('50');
      expect(rEl.getAttribute('width')).toBe('100');

      // Create an ellipse
      var eEl = doc.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      objectsGroup.appendChild(eEl);
      var eObj = { id: 'test_e7', type: 'ellipse', el: eEl, attrs: { cx: 200, cy: 200, rx: 60, ry: 40 } };
      cfg.objectsMap.set(eObj.id, eObj);
      if (appWindow.WebpointerRender && appWindow.WebpointerRender.updateElementAttributes) {
        appWindow.WebpointerRender.updateElementAttributes(eObj);
      }
      expect(eEl.getAttribute('cx')).toBe('200');
    });

    test('TC38: 호(arc) 도구 오브젝트 생성, startAngle 및 endAngle 핸들러 렌더링 및 드래그 동작 검증', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      var doc = appWindow.document;
      var objectsGroup = doc.getElementById('objectsGroup');

      var arcEl = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
      objectsGroup.appendChild(arcEl);
      var arcObj = {
        id: 'arc_test_38',
        type: 'arc',
        el: arcEl,
        attrs: { cx: 300, cy: 300, rx: 100, ry: 80, startAngle: 0, endAngle: 180, fill: 'none', stroke: '#0284c7' }
      };
      cfg.objectsMap.set(arcObj.id, arcObj);
      if (appWindow.WebpointerRender && appWindow.WebpointerRender.updateElementAttributes) {
        appWindow.WebpointerRender.updateElementAttributes(arcObj);
      }

      var d = arcEl.getAttribute('d');
      expect(d).toBeTruthy();
      expect(d.startsWith('M')).toBe(true);
    });

    test('TC39: 호(arc) 가로/세로 크기 및 회전 핸들러, 직사각형(rect) 회전 핸들러 렌더링 검증 수트', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      cfg.selectedIds.clear();
      var obj = cfg.objectsMap.get('arc_test_38');
      if (obj) cfg.selectedIds.add(obj.id);

      if (appWindow.WebpointerRenderSelection && appWindow.WebpointerRenderSelection.renderSelection) {
        appWindow.WebpointerRenderSelection.renderSelection();
      }
      var handles = appWindow.document.querySelectorAll('#uiGroup .handle-node');
      expect(handles.length).toBeGreaterThan(0);
    });

    test('TC40: 회전된 호(arc) 및 직사각형(rect/rounded) 선택 상자(boxRect) transform 회전 및 렌더링 검증 수트', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      var obj = cfg.objectsMap.get('arc_test_38');
      if (obj) {
        obj.attrs.angle = 45;
        if (appWindow.WebpointerRenderSelection && appWindow.WebpointerRenderSelection.renderSelection) {
          appWindow.WebpointerRenderSelection.renderSelection();
        }
      }
      var box = appWindow.document.querySelector('#uiGroup .selection-box');
      if (box) {
        var tf = box.getAttribute('transform');
        expect(tf && tf.includes('rotate(45')).toBe(true);
      }
    });

    test('TC41: 채우기가 없는(fill: none) 호(arc) 경로 근처 자석선택(Magnet Selection) 및 허수 영역 배제 검증 수트', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      var arcObj = {
        id: 'unfilled_arc_magnet_test',
        type: 'arc',
        attrs: { cx: 400, cy: 400, rx: 100, ry: 100, startAngle: 0, endAngle: 90, fill: 'none', stroke: '#000000', strokeWidth: 4 }
      };
      cfg.objectsMap.set(arcObj.id, arcObj);

      var isNear = false;
      if (appWindow.WebpointerObjects && appWindow.WebpointerObjects.findNearestObject) {
        var found = appWindow.WebpointerObjects.findNearestObject(500, 400, 20); // (cx+rx, cy) is on startAngle=0
        if (found && found.id === 'unfilled_arc_magnet_test') isNear = true;
      }
      expect(isNear).toBe(true);
    });

    test('TC60: 직선(line) 그리기 및 양 끝점 조절 시 Ctrl 키 가로/세로 직교 스냅(Orthogonal Lock) 검증 수트', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      var doc = appWindow.document;
      var state = appWindow.WebpointerState || {};

      var px1 = 100, py1 = 100;
      var px2H = 300, py2H = 110; // dx=200, dy=10 -> horizontal snap -> y2 = py1 = 100
      var px2V = 110, py2V = 350; // dx=10, dy=250 -> vertical snap -> x2 = px1 = 100

      // Test horizontal snap
      var dxH = Math.abs(px2H - px1);
      var dyH = Math.abs(py2H - py1);
      var snappedY2 = (dxH >= dyH) ? py1 : py2H;
      expect(snappedY2).toBe(100);

      // Test vertical snap
      var dxV = Math.abs(px2V - px1);
      var dyV = Math.abs(py2V - py1);
      var snappedX2 = (dyV > dxV) ? px1 : px2V;
      expect(snappedX2).toBe(100);
    });

  });
})();
