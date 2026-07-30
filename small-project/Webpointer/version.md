# Webpointer Project Version History

## [0.1.1] - 2026-07-30
### Added
- Completed Point (점) insertion tool implementation with 10px diameter (`r = 5px`) and `#041e49` default color.
- Default Canvas background set to pure white (`#ffffff`) with subtle gray grid lines (`#e2e8f0`).
- Point selection highlight ring overlay and interactive center handle node.

### Fixed
- Fixed SPA lifecycle initialization in `module/main.js` so canvas mouse events bind immediately upon page load without waiting for `DOMContentLoaded`.

## [0.1.0] - 2026-07-30
### Added
- Initial release of Webpointer 16:9 Vector CAD Editor with 481×271 Step Grid snapping engine.
- MS Office Ribbon-style interface with 5 primary menu tabs: **삽입**, **보기**, **그림 서식**, **글 서식**, **애니메이션**.
- Standard SPC Modular Architecture (`module/config.js`, `module/render.js`, `module/main.js`, `Webpointer.css`, `version.md`, `readme.md`, `IMPLEMENTATION.md`, `#error-console`).
