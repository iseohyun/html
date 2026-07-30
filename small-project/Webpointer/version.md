# Webpointer Project Version History

## [0.1.0] - 2026-07-30
### Added
- Initial release of Webpointer 16:9 Vector CAD Editor with 481×271 Step Grid snapping engine.
- MS Office Ribbon-style interface with 5 primary menu tabs: **삽입**, **보기**, **그림 서식**, **글 서식**, **애니메이션**.
- 100% width gray menu bar (`#e2e8f0`) with seamless white active tab connection to 100% width white ribbon bar (`#ffffff`).
- Ribbon categories (`도형 삽입`, `레이어 순서`, `그룹화`, `정렬`, `격자 및 스냅`, `캔버스 화면`) arranged left-to-right with 3-row item grid wrapping and bottom-centered titles.
- Custom SVG icons, stationary tooltips on hover, and `Alt` keybind badge overlays.
- Shape insertion (Point, Line, Rectangle, Ellipse, Arc, Quadratic Bezier [1 handle], Cubic Bezier [2 handles], Rounded Rectangle).
- Layer ordering (Forward, Front, Backward, Back), SVG Grouping (`<g>`), Ungrouping, Alignment tools.
- Marker styles (Start/End markers: Arrow, Circle, Diamond) with scaling controls.
- View options: Grid toggle, Grid Step density (481×271, 241×136, 121×68), Canvas aspect ratio/resolution selection, background color picker.
- Standard SPC Modular Architecture (`module/config.js`, `module/render.js`, `module/main.js`, `Webpointer.css`, `version.md`, `readme.md`, `IMPLEMENTATION.md`, `#error-console`).
