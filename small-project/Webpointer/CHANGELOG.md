# Webpointer Changelog

All notable changes to the Webpointer Vector CAD Editor project will be documented in this file.

## [v0.5.5] - 2026-07-30
### Added & Improved
- **File Menu Tab**: Added dedicated `"File"` (`파일`) tab with `openFile`, `saveFileToWeb`, and `downloadFile` tools.
- **Undo / Redo History Manager**: Implemented `undo` (`Ctrl+Z`) and `redo` (`Ctrl+Y` / `Ctrl+Shift+Z`) with automatic state snapshotting.
- **Global Floating Tooltip Manager**: Created `#webpointerGlobalTooltip` with fixed body positioning to prevent boundary clipping.

## [v0.5.4] - 2026-07-30
### Added & Improved
- **Ribbon Layout & Settings Tab Refactoring**: Removed menubar gap, right-aligned `"설정"` (`Settings`) tab.
- **Grid & Canvas Rendering Fixes**: Kept `bgRect` visible when grid is disabled; real-time updates for grid step size and canvas background color.

## [v0.5.3] - 2026-07-30
### Added & Improved
- **Text Ribbon Tab Upgrades**: Single cycling horizontal/vertical alignment buttons, 3-way text auto-fit mode toggle, custom SVG underline renderer (6 styles).

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

## [v0.1.0] ~ [v0.4.6] - Initial Phase 1 Baseline
- Core SVG rendering engine, 481x271 step grid snapping, MS Office ribbon UI, shape tools, grouping, alignment, transform, and Playwright E2E automation suite.
