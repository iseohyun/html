# Webpointer Project Version History

## [0.1.6] - 2026-07-30
### Added
- Completed Proximity Nearest Object Selection system:
  - Clicking empty canvas with Select tool calculates distance to all objects.
  - Automatically selects closest object if within `proximityThreshold` (default 10px).
  - Clears current selection if click point is farther than 10px.
- Added **Proximity Snap Distance (근접 선택 거리)** setting in View Menu (`보기` 탭): Options for `10px (Default)`, `20px`, `30px`, and `0px (Disable - Exact Click Only)`.
- Implemented **Dashed Enclosing Bounding Box Overlay**:
  - Renders a unified dashed rectangle (`stroke-dasharray: 4,4`, `#0284c7`) surrounding all selected object(s) in both single and multi-selection modes.
- Updated [`IMPLEMENTATION.md`](file:///c:/git/html/small-project/Webpointer/IMPLEMENTATION.md) with Proximity Selection, Enclosing Bounding Box, and View Menu Proximity Distance specifications.

## [0.1.5] - 2026-07-30
### Added
- Completed Object Body Drag-Move functionality for all vector shapes.

## [0.1.4] - 2026-07-30
### Added
- Completed Bezier curve control handle styling (Yellow intermediate control handles).
- Completed Rounded Rectangle corner curve handle system (Yellow handle at `(x + rx, y)`).

## [0.1.3] - 2026-07-30
### Added
- Completed Arc (호) 6-handle interactive editing system.
- Written comprehensive technical specification document `IMPLEMENTATION.md`.

## [0.1.2] - 2026-07-30
### Added
- Completed Ellipse / Circle (타원/원) 4-handle interactive editing system.

## [0.1.1] - 2026-07-30
### Added
- Completed Point (점) insertion tool implementation.

## [0.1.0] - 2026-07-30
### Added
- Initial release of Webpointer 16:9 Vector CAD Editor with 481×271 Step Grid snapping engine.
