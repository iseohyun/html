# Webpointer Changelog

Changelog document tracking major updates, feature additions, and bug fixes for the Webpointer Vector CAD Editor.

## [v0.7.2] - 2026-08-09
### Major Bug Fixes & Feature Refinements
- **Compact Selection Box & Resize Handles for Cropped Objects (`TC16`)**:
  - When an image or shape object with crop attributes is selected while crop mode is inactive, the selection bounding box and resize handles (`top_left`, `bottom_right`) now fit tightly and compactly around the **visible cropped region**, ignoring hidden cropped space.
- **Bezier `c2` TypeError Null-Safety Guard & Immediate `ESC` Key Drawing Termination (`TC30`)**:
  - Applied null-safety guards in `buildContinuousBezierPathD` for `ctrls3` segment control points, completely eliminating the `TypeError: Cannot read properties of undefined (reading 'c2')` exception stack overflow.
  - Bound `ESC` key press in `keydown` listener to trigger `bezier.finishMultiBezier()` and switch to selection mode immediately.
- **Restored Bezier Control Point Handle Nodes & Dashed Line Guides**:
  - Quadratic Bezier (`bez2`): Restored control point node (`bez2_ctrl`) and dashed guide line visualization connecting to adjacent vertices (`P0` and `P1`).
  - Cubic Bezier (`bez3`): Restored control point 1 and 2 nodes (`bez3_c1`, `bez3_c2`) per segment and dashed guide lines connecting each control point to its nearest vertex (`pStart` and `pEnd`).
- **Selection Box `NaN` Console Error Prevention & Fixture SVG Import Test (`TC31`)**:
  - Added `isFinite` and `!isNaN` guards in `getObjectBounds` to completely prevent `<rect> attribute x: Expected length, "NaN"` console errors.
  - Added E2E test `TC31` verifying successful loading of `webpointer_drawing_1786256123897.svg`, 0 NaN errors, and valid handle node rendering.
- **Layer Ordering Operations & Hotkey Bindings (`TC32`)**:
  - Implemented 4 layer ordering functions and bound them to global `window` scope: `bringToFront` (Shift + ] or }), `bringForward` (]), `sendToBack` (Shift + [ or {), and `sendBackward` ([).

## [v0.7.1] - 2026-08-09
### Image & Symbol Insertion Suite
- **Picture / Symbol Insert Button & Viewport Center Placement (Hotkey `I`)**:
  - Added **🖼️ Insert Symbol** button in Ribbon (`Insert` > `Shapes` category) and bound `Alt+I` / `I` hotkey.
  - Built `#imageSymbolPickerModal` supporting 8 built-in vector symbols, user registry symbols, and local file auto-loader.
  - Sized new dropped symbols at 120x120px in viewport center and auto-activated selection transform mode.

## [v0.7.0] - 2026-07-31
### SMIL Animation Suite & Canvas Vertical Resizing
- **8-Step SMIL SVG Animation Suite (Animation Ribbon Tab)**:
  - Multi-track parallel/series animation creator with support for `fill`, `stroke`, `stroke-width`, `opacity`, `transform`, and path `d` keyframes.
- **Vertical Canvas Resizer & Drag Handle**:
  - Added bottom canvas drag handle bar (`═══ Canvas Resize Height ═══`) and natural aspect ratio auto-expansion.
- **Pan Tool & Redesigned Layer Ordering Icons**:
  - Added Pan Tool (`Alt+H`) for canvas dragging and updated layer stack icons with gold highlight paper graphics.

## [v0.6.0] - 2026-07-31
### Milestone 6 ~ 17 Full Completion
- **3-Slot Temporary Save & Protection Modal (`TC24`)**.
- **Extended Image Fill Modes: Stretch, Tile, Single (`TC25`)**.
- **Multi-Stop Gradient Ramp & 2-Point Interactive Handles (`TC26`)**.
- **In-Shape Text Alignment Auto-Calculations (`TC27`)**.
- **Live Filter Preview & Reordering Stack (`TC28`)**.
- **11 SMIL Animation Presets & Zoom / Flip / Hotkeys (`TC29`)**.
- **All 29 Automated E2E Tests Passed (29/29 PASSED)**.
