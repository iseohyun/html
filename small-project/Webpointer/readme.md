# Webpointer Vector CAD Editor (v0.7.2)

**Webpointer** is a modern, high-performance web-based vector CAD editor designed on a 16:9 canvas with real-time **SVG DOM tags** and an accurate **Grid Snap Engine** for precise vector graphic drawing, manipulation, SMIL animation, and picture styling.

---

## 🌟 Key Functional Features

1. **MS Office Style Ribbon UI**:
   - **File Tab**: Web 3-Slot Temporary Save/Load modal (`#fileSlotsModal`) with quota overflow download protection, `.webpointer` JSON project & clean `.svg` export, and Undo/Redo (`Ctrl+Z` / `Ctrl+Y`).
   - **Insert Tab**:
     - **Pan Tool (`Alt+H`)**: Drag-to-pan canvas viewport.
     - **Shape Drawing**: Point, Line, Rectangle, Ellipse, Arc, Quadratic Bezier (`bez2`), Cubic Bezier (`bez3`), Rounded Rect, and Text.
     - **Symbol / Picture Insertion (`Alt+I` / `I`)**: Insert 8 built-in symbols, custom registry symbols, or local images into viewport center with active transform handles.
     - **Layer Ordering**: Bring to Front (`Shift+]`), Bring Forward (`]`), Send Backward (`[`), and Send to Back (`Shift+[`).
     - **Grouping & Alignment**: Group (`Ctrl+G`), Ungroup (`Ctrl+Shift+G`), 6-way geometric alignment, and 4-way flip/rotation.
   - **Picture Format Tab**:
     - **Color & Fill Palette**: 27-slot UniPalette, 3 image fill modes (Stretch, Tile, Single), and Multi-Stop Gradient Editor.
     - **Line Ends, Cap & Join**: Arrow/Circle/Diamond markers, stroke cap toggle (`butt`/`round`/`square`), and stroke join toggle (`miter`/`round`/`bevel`).
     - **Filter Stack & Compact Crop (`TC16`)**: Stacked picture filters (brightness, contrast, blur, shadow, etc.) and compact selection handles on cropped objects.
   - **Text Format Tab**: Font family, font size (`+/-` hotkeys), bold, italic, strikethrough, 4-way horizontal & 3-way vertical text alignment, and 6 custom SVG underline styles.
   - **Animation Tab**: 8-step SVG SMIL animation suite with keyframes, timing triggers, and repeat conditions.

2. **Bezier Curve Engine & Control Point Visualization**:
   - Quadratic (`bez2`) and Cubic (`bez3`) Bezier curves with interactive control point handles and dashed line guides connecting handles to adjacent vertices.
   - Immediate `ESC` key drawing termination and `TypeError: c2` null-safety guards.

3. **32 Automated E2E Test Suite (32/32 PASSED)**:
   - Full Playwright E2E test coverage verifying app initialization, SVG import/export, SMIL animations, NaN error prevention, and layer ordering operations.
