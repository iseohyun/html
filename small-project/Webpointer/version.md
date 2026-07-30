# Webpointer Project Version History

## [0.2.1] - 2026-07-30
### Added
- Implemented **Intermediate Control Point Handles** for Multi-Segment Bezier Curves:
  - Renders yellow control point handles (`#facc15`) at all control point locations (including 1st segment control point and smooth `T` reflected control points) connected with blue dashed guide lines (`#0284c7`).
- Implemented Dynamic Mouse Cursor Styles in Selection Tool Mode:
  - **`pointer` (손가락)**: Displayed when hovering over an unselected selectable object.
  - **`move` (이동 십자가)**: Displayed when hovering over a selected object or dragging an object body.
  - **`grab`**: Displayed when hovering over control handles.
  - **`crosshair`**: Displayed during shape drawing.
- Updated [`IMPLEMENTATION.md`](file:///c:/git/html/small-project/Webpointer/IMPLEMENTATION.md) with mouse cursor states and multi-segment Bezier control handle specifications.

## [0.2.0] - 2026-07-30
### Added
- Standardized Continuous Bezier Curve SVG Path Generation (`M..Q..T`).

## [0.1.9] - 2026-07-30
### Added
- Completed Continuous Multi-Click Bezier Curve Input System.

## [0.1.8] - 2026-07-30
### Added
- Completed automatic tool return to Select Tool after shape creation.

## [0.1.7] - 2026-07-30
### Added
- Verified Proximity Selection, Dashed Selection Bounding Box Overlay, and View Menu Proximity Distance setting.

## [0.1.6] - 2026-07-30
### Added
- Completed Proximity Nearest Object Selection system.

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
