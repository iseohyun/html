/**
 * Webpointer Configuration & Global State Module
 * Encapsulates constants, state objects, and default settings.
 */
(function() {
  var WebpointerConfig = {
    // Canvas & Grid Dimensions
    SVG_WIDTH: 960,
    SVG_HEIGHT: 540,
    STEPS_X: 480, // 0 ~ 480 (481 points)
    STEPS_Y: 270, // 0 ~ 270 (271 points)

    // Dynamic State Variables & User Defaults
    currentTab: 'insert',
    currentTool: 'select',
    gridSnapEnabled: true,
    canvasBgColor: '#ffffff', // Default White Canvas

    strokeColor: '#041e49',   // Default Shape Color (#041e49)
    fillColor: 'none',        // Default Fill: Transparent ('none')
    strokeWidth: 2,
    pointRadius: 5,           // Default Point Diameter 10px (radius = 5px)

    proximityThreshold: 30,   // Default 30px Proximity selection threshold
    defaultShapeSize: 100,    // Default 100px shape size for short clicks (<= 10px drag)

    startMarker: 'none',
    startMarkerScale: 1,
    endMarker: 'none',
    endMarkerScale: 1,

    // Custom UniPalette Color Swatch Memory (Max 32 colors)
    customPalette: [
      '#2aa314', '#14a36a', '#1471a3', '#2314a3',
      '#8e14a3', '#a3144d', '#a34614', '#95a314'
    ],
    activeColorTarget: 'stroke', // 'stroke' or 'fill'

    // Selection & Manipulation Memory
    selectedIds: new Set(),
    objectsMap: new Map(),
    nextId: 1
  };

  window.WebpointerConfig = WebpointerConfig;
})();
