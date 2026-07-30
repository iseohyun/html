# Webpointer Project Version History

## [0.1.8] - 2026-07-30
### Added
- Completed automatic tool return to **Select Tool (`select`)** after any shape creation.
- Implemented **Short Click Default Shape Presets** (when drag distance $\le 10\,\text{px}$):
  - **Line**: Horizontal line of length $100\,\text{px}$.
  - **Rectangle**: $100 \times 100\,\text{px}$ square from Top-Left click point.
  - **Circle**: Circle of diameter $100\,\text{px}$ ($rx=50, ry=50$) from Center click point.
  - **Arc**: Arc from 12 o'clock ($-90^\circ$) to 3 o'clock ($0^\circ$) of diameter $100\,\text{px}$ from Center click point.
  - **1st Bezier (`bez2`)**: Real-time control point at $(x_1, y_2)$ (start's X, end's Y).
  - **2nd Bezier (`bez3`)**: Real-time control points at $(x_1, \frac{y_1+y_2}{2})$ and $(\frac{x_1+x_2}{2}, y_2)$ using virtual center $V = (x_1, y_2)$.
  - **Rounded Rect**: $100 \times 100\,\text{px}$ square with $rx=15\,\text{px}$ corner curve.
- Added `Esc` key shortcut to cancel active drawing and switch immediately to Select Tool.
- Added **Default Shape Size (기본 도형 크기)** setting in View Menu (`보기` 탭): Options for `100px (Default)`, `150px`, `200px`, and `50px`.
- Updated default **Proximity Snap Distance (근접 선택 거리)** from `10px` to **`30px`**.
- Updated [`IMPLEMENTATION.md`](file:///c:/git/html/small-project/Webpointer/IMPLEMENTATION.md) with all new specifications.

## [0.1.7] - 2026-07-30
### Added
- Verified Proximity Selection, Dashed Selection Bounding Box Overlay, and View Menu Proximity Distance setting.

## [0.1.6] - 2026-07-30
### Added
- Completed Proximity Nearest Object Selection system.
- Implemented Dashed Enclosing Bounding Box Overlay.

## [0.1.5] - 2026-07-30
### Added
- Completed Object Body Drag-Move functionality for all vector shapes.

## [0.1.4] - 2026-07-30
### Added
- Completed Bezier curve control handle styling (Yellow intermediate control handles).

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
