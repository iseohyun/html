# Webpointer Vector CAD Editor Implementation Specification

## 1. Executive Summary & Goals
Webpointer is a 16:9 responsive vector graphic CAD editor and simulator built with native SVG DOM elements and 481×271 Step Grid snapping.
It features an MS Office Ribbon-style user interface with 5 primary menu tabs: **삽입 (Insert)**, **보기 (View)**, **그림 서식 (Shape Formatting)**, **글 서식 (Text Formatting)**, and **애니메이션 (Animation)**.

---

## 2. Menu Tabs & Ribbon Bar Layout Specification

### 2.1 Tab Architecture
- **Tab Switching**: Clicking a tab highlights the menu button (MS Ribbon active tab style) and dynamically renders the corresponding ribbon toolbar.
- **Global Function Exposing**: All UI event handlers (`switchTab`, `setTool`, `applyStyleToSelected`, etc.) are attached to `window` to prevent `Uncaught ReferenceError` in SPA / sandbox environments.

### 2.2 Ribbon Layout & Icon Grid Rules
- **Minimum 3-Row Height**: Each ribbon category group is formatted as a 3-row grid layout (`grid-template-rows: repeat(3, 34px)`).
- **Uniform Icon Dimensions**: All tool icons have identical sizes ($32 \times 32\,\text{px}$ SVG canvas inside a $34 \times 34\,\text{px}$ button).
- **Category Group Dividers**: Groups are separated by a vertical divider line (`border-right: 1px solid var(--border-color)`).
- **Category Title Alignment**: Category names (e.g. `도형 삽입`, `레이어 순서`, `그룹화`, `정렬`, `보기 설정`) are centered at the very bottom of each category block.
- **Tooltip & Alt Keybind Behavior**:
  - Icon names/labels are **hidden by default** under the icon.
  - Hovering (`mouseover`) or pressing the `Alt` key displays a fixed tooltip positioned directly below the tool button.
  - Pressing `Alt` reveals keybind badges on each tool button.

---

## 3. Ribbon Tool Groups by Tab

### 3.1 `삽입` (Insert Tab)
1. **도형 삽입 (Insert Shapes)**:
   - 점 (Point / Circle)
   - 선 (Line)
   - 사각 (Rectangle)
   - 타원 (Ellipse)
   - 호 (Arc)
   - 2차 베지어 (Quadratic Bezier: 1 Control Point Handle icon)
   - 3차 베지어 (Cubic Bezier: 2 Control Point Handles icon)
   - 둥근사각 (Rounded Rectangle)
2. **레이어 순서 (Layer Ordering)**:
   - 뒤로, 맨 뒤로, 앞으로, 맨 앞으로
3. **그룹화 (Grouping)**:
   - 그룹 (`<g>`), 그룹 해제
4. **정렬 (Alignment)**:
   - 왼쪽, 중앙, 오른쪽, 위, 중앙, 아래 정렬

### 3.2 `보기` (View Tab) - NEW
1. **격자 보이기 (Toggle Grid)**: On/Off toggle for 481×271 Step grid lines.
2. **격자 크기 (Grid Step Density)**:
   - 481×271 Step (Standard 16:9)
   - 241×136 Step (Dense 2x)
   - 121×69 Step (Coarse 4x)
3. **캔버스 크기 선택 (Canvas Ratio / Resolution)**:
   - 16:9 (960×540 px)
   - 16:9 (1280×720 px)
   - 4:3 (800×600 px)
   - 1:1 (600×600 px)
4. **캔버스 색 (Canvas Background Color)**: Color picker for SVG canvas background.

### 3.3 `그림 서식` (Shape Formatting Tab)
1. **기본 스타일**: 테두리 색상, 채우기 색상, 선 두께 (1~20px), 선 스타일 (실선, 점선).
2. **시작/끝 모양 마커 (Markers)**:
   - 시작 모양: 없음, 화살표, 동그라미, 다이아몬드 + 크기 키우기(+)/줄이기(-)
   - 끝 모양: 없음, 화살표, 동그라미, 다이아몬드 + 크기 키우기(+)/줄이기(-)

### 3.4 `글 서식` (Text Formatting Tab)
- 텍스트 상자 추가, 폰트 종류, 폰트 크기, Bold/Italic.

### 3.5 `애니메이션` (Animation Tab)
- 그리기 애니메이션 (Path Draw), 페이드 애니메이션 (Fade In).

---

## 4. Canvas Engine & Step Snap Math

### 4.1 Step Quantization
Canvas resolution is 16:9 aspect ratio ($960 \times 540\,\text{px}$).
Grid contains 481 horizontal points (0 to 480) and 271 vertical points (0 to 270):
$$\text{Step}_X = \text{Math.round}\left(\frac{X_{\text{raw}}}{\text{CanvasWidth}} \times 480\right)$$
$$\text{Step}_Y = \text{Math.round}\left(\frac{Y_{\text{raw}}}{\text{CanvasHeight}} \times 270\right)$$
$$\text{Pixel}_X = \frac{\text{Step}_X}{480} \times \text{CanvasWidth}$$
$$\text{Pixel}_Y = \frac{\text{Step}_Y}{270} \times \text{CanvasHeight}$$

### 4.2 Real SVG DOM Elements & Handles
- All objects are instantiated as actual SVG elements (`<circle>`, `<line>`, `<rect>`, `<ellipse>`, `<path>`, `<g>`).
- Interactive Control Handles (`<circle class="handle-node">`) allow dragging Bezier control points (P1 for 2nd order, P1/P2 for 3rd order) and shape dimensions with real-time grid snapping.

---

## 5. Verification & Testing Plan
- Validate tab switching and eliminate any `switchTab is not defined` console errors.
- Test "보기" menu view controls (grid toggle, grid step density, canvas ratio, background color).
- Verify 3-row ribbon icon layout, uniform icon sizes, category dividers, and bottom-centered titles.
- Verify tooltips appearing stationary below icons on hover and Alt key badges when `Alt` is pressed.
- Verify marquee selection, Ctrl multi-selection, SVG grouping (`<g>`), and marker start/end scaling.
