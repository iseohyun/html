# Webpointer Project Version History

## [0.1.4] - 2026-07-30
### Added
- Completed Bezier curve (2-nd & 3-rd order) control handle styling:
  - Start / End handles: White fill `#ffffff`, Black border `#000000`.
  - Intermediate Control Point handles (중간점): **Yellow fill `#facc15`, Black border `#000000`**.
- Completed Rounded Rectangle (둥근 사각형) corner curve handle system:
  - Top-Left / Bottom-Right handles: White fill `#ffffff`, Black border `#000000`.
  - Corner Curve handle (굴곡각): **Yellow fill `#facc15`, Black border `#000000`** positioned at **`(x + rx, y)`** where the curve ends on the top edge of the top-left corner.
  - Dragging the Corner Curve handle along the top edge dynamically adjusts corner radius `rx`.
- Updated [`IMPLEMENTATION.md`](file:///c:/git/html/small-project/Webpointer/IMPLEMENTATION.md) with exact specifications for Bezier intermediate control handles and Rounded Rectangle corner curve handle.

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
