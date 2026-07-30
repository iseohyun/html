# Webpointer Project Version History

## [0.3.4] - 2026-07-30
### Added & Updated
- Updated default 24 color palette preset to custom user palette:
  `["#660000", "#660000", "#086600", "#006627", "#002E66", "#000080", "#3A0066", "#660031", "#E44D1B", "#C27800", "#669900", "#00A879", "#009DD1", "#4182FB", "#A760E2", "#D94594", "#FF976B", "#FFBB00", "#AAE43F", "#00F5C0", "#00EAFF", "#85CAFF", "#EC99FF", "#FF8FDA"]`
- Fixed UniPalette action buttons placement to the right of the 9x3 palette grid in the `색` category.
- Enhanced modal popup logic so `openPaletteModal()` dynamically creates the `<textarea>` modal overlay if missing, guaranteeing 100% reliable popup execution.

## [0.3.3] - 2026-07-30
### Added
- Completed Style Ribbon Interface Redesign under Picture Format (`style`) Tab:
  - Added new category **`색` (Color Category)**:
    - 1×2 Radio Target Selector: Stroke Icon (gray bg + red border) & Fill Icon (gray border + red fill).
    - 1×2 UniPalette Action Buttons: `기본색상 정하기` (opens UniPalette in new tab) & `기본색상 가져오기` (opens JS code import modal).
    - 9×3 Seamless (27-slot) Color Palette Grid with `gap: 0`, `margin: 0`, `padding: 0`.
    - Mandatory Fixed Palette Slots: Slot 9 = White (`#ffffff`), Slot 18 = Black (`#000000`), Slot 27 = Transparent (`none` with red diagonal slash).
    - User/UniPalette Swatch Slots: Slots 1~8, 10~17, 19~26 (up to 24 user colors).
  - Added new category **`선` (Line Category)** for stroke width and marker controls.
- Updated [`IMPLEMENTATION.md`](file:///c:/git/html/small-project/Webpointer/IMPLEMENTATION.md) with Style Ribbon Redesign specifications.

## [0.3.2] - 2026-07-30
### Fixed
- Fixed inline event handler `ReferenceError: updateSvgDefs is not defined` when changing stroke color.
- Added global style handler functions (`setStrokeColor`, `setFillColor`, `setStrokeWidth`, `setStartMarker`, `setEndMarker`).
- Enabled real-time (`oninput` + `onchange`) color updates so shape stroke and fill colors update dynamically as color picker is adjusted.

## [0.3.1] - 2026-07-30
### Added
- Completed Rotation & Flip (회전 및 대칭) Transformation System under Insert Ribbon Tab:
  - Added new 3-row grid ribbon category "회전 및 대칭" with 4 tool buttons.
  - Horizontal Flip (`flipH`, `F`): Mirrors objects/groups horizontally across bounding box center.
  - Vertical Flip (`flipV`, `K`): Mirrors objects/groups vertically across bounding box center.
  - 90° Clockwise Rotation (`rotate90`, `R`): Rotates objects/groups +90 degrees around bounding box center.
  - -90° Counter-Clockwise Rotation (`rotateNeg90`, `L`): Rotates objects/groups -90 degrees around bounding box center.
  - Horizontal & Vertical Equal Spacing alignment tools (requiring 3+ selected units).
- Updated [`IMPLEMENTATION.md`](file:///c:/git/html/small-project/Webpointer/IMPLEMENTATION.md) with Rotation & Flip specifications.

## [0.3.0] - 2026-07-30
### Added
- Completed Precision Geometric Boundary Alignment Engine:
  - Supports 6-way geometric alignment (Align Left, Right, Top, Bottom, H-Center, V-Center).
  - Align Left / Right / Top / Bottom matches outermost geometric bounds ($X_{\min}, X_{\max}, Y_{\min}, Y_{\max}$).
  - Align H-Center uses the horizontal center of the **leftmost selected unit** as the reference axis.
  - Align V-Center uses the vertical center of the **topmost selected unit** as the reference axis.
  - Full support for top-level group unit boundary calculations and shift operations.
- Updated [`IMPLEMENTATION.md`](file:///c:/git/html/small-project/Webpointer/SECTION_4.md) Section 4 with complete alignment specifications.

## [0.2.1] - 2026-07-30
### Added
- Completed Ctrl + Click Object/Group Deselection (Toggle OFF) System:
  - Supports clicking already selected objects or groups with `Ctrl` key pressed to deselect (toggle off) specific items.
- Updated [`IMPLEMENTATION.md`](file:///c:/git/html/small-project/Webpointer/IMPLEMENTATION.md) with comprehensive Hierarchical Multi-Level Grouping & Ctrl Deselection technical specifications.

## [0.2.0] - 2026-07-30
### Added
- Completed Hierarchical Multi-Level Grouping & Step-by-Step Ungrouping System:
  - Conditional activation of Group (`G`) & Ungroup (`U`) ribbon tools based on top-level unit counts.
  - Multi-level nested group creation support (`<g>` inside `<g>`).
  - 1-level-at-a-time hierarchical ungrouping (unpacks outermost group layer first, preserving inner subgroup relations).
  - Outermost group ancestor resolution (`getOutermostGroupEl`) ensuring single nested groups selected alone properly disable the Group tool.

## [0.1.9] - 2026-07-30
### Added
- Completed 2nd-order (Quadratic) & 3rd-order (Cubic) Bezier Curve Control System:
  - Real-time redraw of Bezier curves on control handle drag (`bez2_ctrl`, `bez3_c1`, `bez3_c2`, `bez_vertex`).
  - High-precision 20-sample parametric curve proximity distance calculation for accurate snap-selection near curve bodies.
  - Proximity hover dynamic mouse cursor feedback (`pointer` on near object hover in Select tool mode).
  - Dual symmetric control handle drag sync for 3rd-order Cubic Bezier curves (`bez3`), supporting smooth C1 continuity with automatic point-reflection.

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
