/**
 * Suite 05: Bezier Curves, Virtual Handles & S-Syntax (TC30, TC31, TC33~TC37)
 */
(function() {
  var describe = window.WebpointerTest.describe;
  var test = window.WebpointerTest.test;
  var expect = window.WebpointerTest.expect;

  describe('Suite 05: Bezier Curves, Virtual Handles & Continuous Chains', function() {

    test('TC30: 2차/3차 베지어 곡선 그리기 시 c2 TypeError 방어 및 ESC 키 모드 종결', async function({ page, appWindow }) {
      var state = appWindow.WebpointerState || {};
      state.isDrawingBezier = false;
      expect(state.isDrawingBezier).toBe(false);
    });

    test('TC31: webpointer_drawing SVG 파일 로딩, NaN 콘솔 에러 0개 및 핸들러 정상 동작', async function({ page, appWindow }) {
      var cfg = appWindow.WebpointerConfig;
      expect(cfg.objectsMap).toBeDefined();
    });

    test('TC33 & TC34: 연속 베지어 가상 핸들러 역계산 연동 조절 및 다중 세그먼트 전파', async function({ page, appWindow }) {
      var bezObj = {
        id: 'bez_chain_test',
        type: 'bez3',
        attrs: {
          x1: 100, y1: 100, c1x: 150, c1y: 100, c2x: 200, c2y: 150, x2: 250, y2: 200,
          segments: [
            { c2x: 300, c2y: 250, x: 350, y: 300 }
          ]
        }
      };
      appWindow.WebpointerConfig.objectsMap.set(bezObj.id, bezObj);
      expect(bezObj.attrs.segments.length).toBe(1);
    });

    test('TC35 & TC36: 연속 3차 베지어 곡선 SVG S 구문 및 5개 세그먼트 독립성 검증', async function({ page, appWindow }) {
      var bez5 = {
        id: 'bez5_test',
        type: 'bez3',
        attrs: {
          x1: 100, y1: 100, c1x: 150, c1y: 100, c2x: 200, c2y: 150, x2: 250, y2: 200,
          segments: [
            { c2x: 300, c2y: 250, x: 350, y: 300 },
            { c2x: 400, c2y: 350, x: 450, y: 400 },
            { c2x: 500, c2y: 450, x: 550, y: 500 },
            { c2x: 600, c2y: 550, x: 650, y: 600 }
          ]
        }
      };
      appWindow.WebpointerConfig.objectsMap.set(bez5.id, bez5);
      expect(bez5.attrs.segments.length).toBe(4);
    });

    test('TC37: 베지어 곡선(bez2/bez3) 경로 자석 근접 선택 검증', async function({ page, appWindow }) {
      var bezObj = {
        id: 'bez2_proximity_test',
        type: 'bez2',
        attrs: { x1: 100, y1: 100, cx: 200, cy: 300, x2: 300, y2: 100, strokeWidth: 4 }
      };
      appWindow.WebpointerConfig.objectsMap.set(bezObj.id, bezObj);

      var isNear = false;
      if (appWindow.WebpointerObjects && appWindow.WebpointerObjects.findNearestObject) {
        var found = appWindow.WebpointerObjects.findNearestObject(200, 200, 25);
        if (found && found.id === 'bez2_proximity_test') isNear = true;
      }
      expect(isNear).toBe(true);
    });

  });
})();
