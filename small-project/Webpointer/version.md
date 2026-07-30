# Webpointer Project Version History

## [0.1.3] - 2026-07-30
### Added
- Completed Arc (호) 6-handle interactive editing system:
  - Center handle (White fill `#ffffff`, Black border `#000000`): Moves entire arc shape.
  - Horizontal radius `rx` handle (White fill `#ffffff`, Black border `#000000`): Adjusts `rx`.
  - Vertical radius `ry` handle (White fill `#ffffff`, Black border `#000000`): Adjusts `ry`.
  - Rotation handle (Yellow fill `#facc15`, Black border `#000000`): Controls overall `angle` rotation.
  - Start Angle handle (White fill `#ffffff`, Black border `#000000`): Adjusts `startAngle` without changing radius.
  - End Angle handle (White fill `#ffffff`, Black border `#000000`): Adjusts `endAngle` without changing radius.
- Initial Arc creation starts from Center `(cx, cy)` to Radius `(rx, ry)` starting at 12 o'clock ($-90^\circ$).
- Written comprehensive technical specification document [`IMPLEMENTATION.md`](file:///c:/git/html/small-project/Webpointer/IMPLEMENTATION.md) detailing shape handles, math, default colors, and ribbon layout standards.

## [0.1.2] - 2026-07-30
### Added
- Completed Ellipse / Circle (타원/원) 4-handle interactive editing system:
  - Center handle (White fill `#ffffff`, Black border `#000000`): Moves entire shape.
  - Horizontal width handle (White fill `#ffffff`, Black border `#000000`): Adjusts `rx`.
  - Vertical height handle (White fill `#ffffff`, Black border `#000000`): Adjusts `ry`.
  - Rotation handle (Yellow fill `#facc15`, Black border `#000000`): Controls `transform="rotate(angle, cx, cy)"`.
- Changed default shape fill color to transparent (`fill: 'none'`) for all vector shapes.

## [0.1.1] - 2026-07-30
### Added
- Completed Point (점) insertion tool implementation with 10px diameter (`r = 5px`) and `#041e49` default color.
- Default Canvas background set to pure white (`#ffffff`) with subtle gray grid lines (`#e2e8f0`).
- Point selection highlight ring overlay and interactive center handle node.

## [0.1.0] - 2026-07-30
### Added
- Initial release of Webpointer 16:9 Vector CAD Editor with 481×271 Step Grid snapping engine.
- MS Office Ribbon-style interface with 5 primary menu tabs: **삽입**, **보기**, **그림 서식**, **글 서식**, **애니메이션**.
- Standard SPC Modular Architecture (`module/config.js`, `module/render.js`, `module/main.js`, `Webpointer.css`, `version.md`, `readme.md`, `IMPLEMENTATION.md`, `#error-console`).
