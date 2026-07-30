# Webpointer Project Version History

## [0.2.0] - 2026-07-30
### Added
- Standardized Continuous Bezier Curve SVG Path Generation:
  - Generates a SINGLE SVG `<path>` element with exact standard SVG path `d` attribute formatting (`M x0 y0 Q cx cy, x1 y1 T x2 y2 T x3 y3 ...`).
  - Example: `d="M 50 150 Q 125 50, 200 150 T 350 150 T 500 150"` upon entering points (50, 150), (200, 150), (350, 150), (500, 150) and pressing `Esc`.
- Rendered individual vertex node handles and control point handle for continuous Bezier paths.
- Updated [`IMPLEMENTATION.md`](file:///c:/git/html/small-project/Webpointer/IMPLEMENTATION.md) Section 2.2 with exact continuous SVG Path `d` attribute specification.

## [0.1.9] - 2026-07-30
### Added
- Completed Continuous Multi-Click Bezier Curve Input System.

## [0.1.8] - 2026-07-30
### Added
- Completed automatic tool return to Select Tool after shape creation.
- Implemented Short Click Default Shape Presets ($100\,\text{px}$).

## [0.1.7] - 2026-07-30
### Added
- Verified Proximity Selection, Dashed Selection Bounding Box Overlay, and View Menu Proximity Distance setting.

## [0.1.6] - 2026-07-30
### Added
- Completed Proximity Nearest Object Selection system.
- Implemented Dashed Enclosing Bounding Box Overlay.

## [0.1.5] - 2026-07-30
### Added
- Completed Object Body Drag-Move functionality for all vector shapes.

## [0.1.4] - 2026-07-30
### Added
- Completed Bezier curve control handle styling.

## [0.1.3] - 2026-07-30
### Added
- Completed Arc (호) 6-handle interactive editing system.

## [0.1.2] - 2026-07-30
### Added
- Completed Ellipse / Circle (타원/원) 4-handle interactive editing system.

## [0.1.1] - 2026-07-30
### Added
- Completed Point (점) insertion tool implementation.

## [0.1.0] - 2026-07-30
### Added
- Initial release of Webpointer 16:9 Vector CAD Editor with 481×271 Step Grid snapping engine.
