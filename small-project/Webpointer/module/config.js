/**
 * Webpointer Configuration & Global State Module
 * Encapsulates constants, state objects, and configuration maps.
 */
(function() {
  var WebpointerConfig = {
    // Canvas & Grid Dimensions
    SVG_WIDTH: 960,
    SVG_HEIGHT: 540,
    STEPS_X: 480, // 0 ~ 480 (481 points)
    STEPS_Y: 270, // 0 ~ 270 (271 points)

    // Dynamic State Variables
    currentTab: 'insert',
    currentTool: 'select', // select, point, line, rect, ellipse, arc, bez2, bez3, rounded
    gridSnapEnabled: true,
    canvasBgColor: '#020617',

    strokeColor: '#38bdf8',
    fillColor: 'rgba(56, 189, 248, 0.2)',
    strokeWidth: 2,

    startMarker: 'none',
    startMarkerScale: 1,
    endMarker: 'none',
    endMarkerScale: 1,

    // Selection & Manipulation Memory
    selectedIds: new Set(),
    objectsMap: new Map(),
    nextId: 1
  };

  window.WebpointerConfig = WebpointerConfig;
})();
