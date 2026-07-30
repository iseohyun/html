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
    strokeDashStyle: 'solid',  // 'solid' (실선) vs 'dashed' (점선)
    strokeDashArray: '6,6',    // Default custom dash pattern ('6,6')
    strokeCap: 'butt',         // 'butt' (평평함), 'round' (둥글게), 'square' (돌출)
    strokeJoin: 'miter',       // 'miter' (뾰족함), 'round' (둥글게), 'bevel' (깎임)
    pointRadius: 5,           // Default Point Diameter 10px (radius = 5px)

    collapsedCategories: new Set(), // Set of collapsed category keys ('style_color', etc.)

    proximityThreshold: 30,   // Default 30px Proximity selection threshold
    defaultShapeSize: 100,    // Default 100px shape size for short clicks (<= 10px drag)

    startMarker: 'none',
    startMarkerScale: 1,
    startMarkerFillStyle: 'solid', // 'solid' vs 'hollow'

    endMarker: 'none',
    endMarkerScale: 1,
    endMarkerFillStyle: 'solid',   // 'solid' vs 'hollow'

    // Default 24 UniPalette Color Swatch Preset Memory
    customPalette: [
      "#660000", "#660000", "#086600", "#006627", "#002e66", "#000080", "#3a0066", "#660031",
      "#e44d1b", "#c27800", "#669900", "#00a879", "#009dd1", "#4182fb", "#a760e2", "#d94594",
      "#ff976b", "#ffbb00", "#aae43f", "#00f5c0", "#00eaff", "#85caff", "#ec99ff", "#ff8fda"
    ],
    activeColorTarget: 'stroke', // 'stroke' or 'fill'

    // Selection & Manipulation Memory
    selectedIds: new Set(),
    objectsMap: new Map(),
    nextId: 1
  };

  window.WebpointerConfig = WebpointerConfig;
})();
