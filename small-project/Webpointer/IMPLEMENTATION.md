# Webpointer Implementation Specification (v0.7.2)

Technical design document and functional architecture specification for the Webpointer Vector CAD Editor.

---

## 1. System Architecture & Module Boundaries

The Webpointer project is organized into modular JavaScript layers:

* `module/core/config.js`: Global configuration constants, state, and symbol registries.
* `module/core/objects.js`: SVG object creation, property getters/setters, and tight bounding box calculations (`getObjectBounds`).
* `module/core/historyManager.js`: History stack for Undo/Redo state management.
* `module/core/bezier.js`: Bezier curve generation algorithms (`bez2`, `bez3`), continuous path string formatting (`buildContinuousBezierPathD`), null-safety guards, and multi-bezier termination handlers.
* `module/render/renderCanvas.js`: Main SVG canvas renderer, grid background renderer, selection bounding boxes, and handle nodes (`createHandleNode`).
* `module/render/renderRibbon.js`: Dynamic Ribbon UI renderer supporting 5 ribbon tabs: File, Insert, Picture Format, Text Format, and Animation.
* `module/tools/ribbonHandlers.js`: Handlers for file operations, slot auto-saves, image/symbol pickers, canvas drag-and-drop auto-loaders, and 4 layer ordering functions (`bringToFront`, `bringForward`, `sendBackward`, `sendToBack`).
* `module/tools/textTool.js`: Canvas inline text editor, SVG underline renderer, and font size hotkeys.
* `module/main.js`: Event listeners, keyboard shortcuts, canvas resize height handle bar, and application initializer.

---

## 2. Detailed Functional Specifications

### 2.1 File Tab & Slot Protection Suite
* **Web Save (`saveFileToWeb`)**: Redirects to the 3-Slot Temporary Save modal (`#fileSlotsModal`) supporting slot save, load, overwrite protection, and download.
* **Download File (`downloadFile`)**: Downloads `.webpointer` project JSON and clean `.svg` files with optional grid removal (`#gridGroup`).
* **Undo / Redo (`Ctrl+Z` / `Ctrl+Y`)**: Restores canvas history states.

### 2.2 Insert Tab (Shapes, Symbols, Layer Ordering)
* **Shape Tools (`shapeTools`)**:
  1. **Pan Tool (`Alt+H`)**: Mouse drag real-time canvas viewport panning.
  2. **Select Tool**: Click and marquee box multi-selection.
  3. **Point / Line / Rectangle / Ellipse / Arc / Bez2 / Bez3 / Text**.
  4. **Insert Symbol / Picture (`Alt+I` / `I`)**: Popup modal `#imageSymbolPickerModal` supporting built-in symbols, custom registry, and file loading. Automatically places dropped images in viewport center with active transform handles.
* **Layer Ordering Tools (`layerTools`)**:
  * **Bring to Front (`bringToFront`: `Shift + ]` or `}`)**: Moves selected object SVG DOM node to top of `#objectsGroup`.
  * **Bring Forward (`bringForward`: `]`)**: Moves selected object node 1 step forward.
  * **Send Backward (`sendBackward`: `[`)**: Moves selected object node 1 step backward.
  * **Send to Back (`sendToBack`: `Shift + [` or `{`)**: Moves selected object node to bottom (`firstChild`) of `#objectsGroup`.
* **Group Operations (`groupTools`)**: Group (`Ctrl+G`) and Ungroup (`Ctrl+Shift+G`).
* **Alignment & Flip Tools**: 6-way geometric alignment, 2-way distribution, and 4-way flip/rotation.

### 2.3 Picture Format & Style Tab
* **Color & Pattern Fill**: 27-slot UniPalette, 3 image fill modes (Stretch, Tile, Single), and Multi-Stop Gradient Editor.
* **Stroke & Line Ends**: Line width, dashed line parameters, start/end marker cycling, line cap cycling (`butt`, `round`, `square`), and line join cycling (`miter`, `round`, `bevel`).
* **Picture Filters & Compact Crop (`TC16`)**:
  * Stacked filter sliders with live preview and reordering stack (▲/▼).
  * **Compact Cropped Bounding Box**: When crop mode is inactive, selection bounding boxes and handles fit tightly around the visible cropped region.

### 2.4 Text Format Tab
* **Typography**: Font family, font size (`+/-` hotkeys), bold, italic, strikethrough, and line-height.
* **Text Alignment**: Single cycling 4-way horizontal alignment (Left $\rightarrow$ Center $\rightarrow$ Right $\rightarrow$ Justify) and 3-way vertical alignment (Top $\rightarrow$ Middle $\rightarrow$ Bottom).
* **Custom SVG Underline Renderer**: 6 underline styles (Solid, Dashed, Dotted, Double, Wavy, None).

### 2.5 Animation Tab (SVG SMIL Animation Suite)
* **8-Step SMIL Animation Creator**:
  * Target ID selection, attribute type (`fill`, `stroke`, `stroke-width`, `opacity`, `transform`, `d`), keyframes (`from`, `to`, `values`), trigger timing (`begin`), duration (`dur`), repeat count (`repeatCount`), max limits (`max`), restart conditions (`restart`), and forced end conditions (`end`).

---

## 3. Automated E2E Test Suite (32/32 PASSED)

* `TC01` ~ `TC29`: Base test suite covering shape drawing, history stack, grid persistence, text formatting, filter effects, gradient ramps, and SMIL presets.
* `TC30`: Bezier null-safety guard against `TypeError: c2` and immediate `ESC` key drawing termination.
* `TC31`: SVG fixture (`webpointer_drawing_1786256123897.svg`) loading, 0 NaN errors, and handle node rendering.
* `TC32`: Layer ordering operations (`bringToFront`, `bringForward`, `sendBackward`, `sendToBack`) and hotkey bindings.
