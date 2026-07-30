# Webpointer Changelog

All notable changes to the Webpointer Vector CAD Editor project are documented in this file.

## [v0.7.0] - 2026-07-31
### Added & Improved (8-Step SMIL Animation Specification Suite & Canvas Resizing)
- **8-Step SMIL SVG Animation Ribbon Suite**:
  - **1. Target & Attribute Type**: Displays selected object ID (`targetId`) and supports `fill`, `stroke`, `stroke-width`, `opacity`, `transform:translate/scale/rotate`, `d` (path morph).
  - **2. Values & Coordinates**: `from`, `to`, and multi-step `values="v1;v2;v3"` input fields.
  - **3. Trigger & Duration**: `begin` (`0s`, `click`, `mouseover`, `mouseleave`, `anim1.end` sequence), `dur` (1-cycle duration), `repeatCount` (`indefinite`, `1`, `2`, `3`, `5`).
  - **4. Limits & End Conditions**: `max` (absolute max time limit), `restart` (`always`, `whenNotActive`, `never`), `end` (forced termination trigger).
  - **5. Multi-Track Stacking & Preset Manager**: Add multiple parallel/serial animation tracks to a single object (`addCustomSmilAnimation`), clear all tracks (`removeAllAnimationsFromSelected`), 11 quick presets, and stop all.
- **Canvas Aspect-Ratio Auto-Height & Bottom Resize Handle**:
  - Auto-scales height on SVG import (`성경요약.svg`, etc.) matching native viewBox aspect ratio 1:1.
  - Added bottom mouse drag resize handle (`═══ 캔버스 세로 높이 조절 ═══`).
- **Pan Tool (1st Row 1st Col)**: Added Pan hand tool in Insert > Shapes tab (Alt+H) for real-time canvas dragging and panning.
- **Updated Layer Ordering Icons**: Redesigned `bringToFront`, `bringForward`, `sendBackward`, `sendToBack` with white paper (#ffffff) and gold highlight paper stacking graphics.

## [v0.6.0] - 2026-07-31
### Major Improvements (Milestone 6 ~ 17 Full Completion)
- **3-Slot Auto-Save & Defensive Import Modal (`TC24`)**: Rotating local storage slots and dirty canvas defense dialog.
- **Image Fill Modes (`TC25`)**: Stretch, Tile (repeat), and Single (contain) image patterns.
- **Multi-Stop Gradient & 2-Point Handles (`TC26`)**: Multi-stop ramp editor with interactive canvas handles.
- **Shape Text In-Box Alignment (`TC27`)**: Calculated horizontal and vertical in-box alignment.
- **Live Filter Preview & Stack Reordering (`TC28`)**: Instant filter slider preview and ▲/▼ stack order reordering.
- **Single Cycling Buttons (Milestone 11)**: `cycleStartMarker`, `cycleEndMarker`, `cycleStrokeCap`, `cycleStrokeJoin`.
- **UI Consolidation (Milestone 12, 13)**: Filter popovers integrated into Edit tab; alpha sliders streamlined.
- **SMIL Animation & Hotkeys (`TC29`)**: 11 SMIL animation presets, canvas wheel zoom, `Ctrl+A` select all, rotation/flip tests.
- **29/29 E2E Test Suite Passed (100%)**.

## [v0.5.5] - 2026-07-30
### Added & Improved
- **File Menu Tab**: Added `"File"` (`파일`) tab with `openFile`, `saveFileToWeb`, and `downloadFile`.
- **Undo / Redo History Manager**: Implemented `undo` (`Ctrl+Z`) and `redo` (`Ctrl+Y` / `Ctrl+Shift+Z`).
- **Global Floating Tooltip Manager**: `#webpointerGlobalTooltip` with fixed body positioning.

## [v0.5.4] - 2026-07-30
### Added & Improved
- **Ribbon Layout & Settings Tab Refactoring**: Removed menubar gap, right-aligned `"설정"` (`Settings`) tab.
- **Grid & Canvas Fixes**: Kept `bgRect` visible when grid is disabled; real-time updates for step size and canvas color.

## [v0.5.3] - 2026-07-30
### Added & Improved
- **Text Ribbon Tab Upgrades**: Single cycling alignment buttons, 3-way text auto-fit mode toggle, custom SVG underline renderer (6 styles).

## [v0.5.2] - 2026-07-30
### Added & Improved
- **Shape-Text Auto-Grouping**: Grouped shape and overlay text automatically with isolated formatting controls.
- **Swatch Color Palette Popovers**: Converted color pickers to popovers with UniPalette swatches.

## [v0.5.1] - 2026-07-30
### Added & Improved
- **Text Editing Hotkeys & Inline Edit**: Double-click, `F2`, and text tool inline canvas text editing.

## [v0.5.0] - 2026-07-30
### Added & Improved
- **Text Ribbon Tab Major Enhancement**: Added font family, font size, font weight, font style, line height, text color, and background highlight controls.

## [v0.4.6] - 2026-07-30
### Refactored & Improved
- SVG Icon Asset Modularization into `icons/` folder and `module/render/icons.js`.

## [v0.4.5] - 2026-07-30
### Refactored & Improved
- Restored Ribbon Bar UI & SVG Icons; expanded `.content-area` to 100% full-width layout.

## [v0.4.4] - 2026-07-30
### Refactored & Improved
- Modularized codebase into `core/objects.js`, `core/selection.js`, `core/bezier.js`, `tools/textTool.js`, `tools/ribbonHandlers.js`, `render/renderRibbon.js`, `render/renderCanvas.js`.

## [v0.4.3] - 2026-07-30
### Fixed & Improved
- Text selection bounding box accuracy and caret position fixes.

## [v0.4.2] - 2026-07-30
### Added & Improved
- Direct in-canvas text typing mode with blinking caret line (`.blinking-caret`).

## [v0.4.1] - 2026-07-30
### Added & Fixed
- Interactive in-place text editing workflow and live typing preview.

## [v0.4.0] - 2026-07-30
### Added & Updated
- Picture format category reordering and new Cap & Join category (`strokeCap`, `strokeJoin`).

## [v0.3.6] - 2026-07-30
### Fixed
- Line category dash style & pattern management fixes.

## [v0.3.5] - 2026-07-30
### Added & Updated
- Line Ends category redesign (Start/End markers with solid/hollow fill styles).

## [v0.3.4] - 2026-07-30
### Added & Updated
- UniPalette 24-color preset and popup modal.

## [v0.3.3] - 2026-07-30
### Added
- Style Ribbon redesign (27-slot color palette grid, target selectors).

## [v0.3.2] - 2026-07-30
### Fixed
- Real-time color updates on canvas.

## [v0.3.1] - 2026-07-30
### Added
- Rotation & Flip transformation system (`flipH`, `flipV`, `rotate90`, `rotateNeg90`).

## [v0.3.0] - 2026-07-30
### Added
- Precision geometric boundary alignment engine (6-way alignment).

## [v0.2.1] - 2026-07-30
### Added
- Ctrl + Click object/group deselection system.

## [v0.2.0] - 2026-07-30
### Added
- Hierarchical multi-level grouping (`Group`, `Ungroup`).

## [v0.1.9] - 2026-07-30
### Added
- 2nd-order (Quadratic) & 3rd-order (Cubic) Bezier curve control handle system.

## [v0.1.0] ~ [v0.1.8] - 2026-07-30
### Initial Baseline
- 16:9 Vector CAD Editor, 481x271 step grid snapping engine, MS Office ribbon UI, shape tools, proximity selection, and E2E automation suite.
