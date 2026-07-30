# Webpointer Project Version History

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
- Updated [`IMPLEMENTATION.md`](file:///c:/git/html/small-project/Webpointer/IMPLEMENTATION.md) Section 4 with complete alignment specifications.

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
