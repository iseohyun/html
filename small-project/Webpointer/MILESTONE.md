# Webpointer Development Milestones

Comprehensive milestone roadmap for the Webpointer Vector CAD Editor project.

---

## 🟢 Phase 1: Core Expansion & Diagnostic Suite (Completed)

- [x] **Milestone 1**: Font size hotkeys (`+`/`-`) & non-destructive image/shape cropping (`ClipPath`).
- [x] **Milestone 2**: Native SVG file importer & diagnostic parser suite (`TC17`).
- [x] **Milestone 3**: File Symbol Manager modal with thumbnail library and Import/Export capabilities (`TC18`).
- [x] **Milestone 4**: Picture filter effects suite with stacked popover and range coefficients (`TC20`).
- [x] **Milestone 5**: Smart alignment snap guides layer & snapping engine (`TC22`).

---

## 🟡 Phase 2: Advanced Editing & Persistence Suite (In Progress)

- [ ] **Milestone 6**: Auto-Save Slot Management & Safe File Import Defense (30% Progress).
  - 3-slot rotating local storage auto-save (`webpointer_autosave_slot_1, 2, 3`).
  - Slot card thumbnail preview modal.
  - Defensive canvas overwrite confirmation dialog on file import.
- [ ] **Milestone 7**: Image Fill Mode Options (Stretch, Tile/Repeat, Single/Contain).
- [ ] **Milestone 8**: Interactive Multi-Stop Gradient Editor & Canvas 2-Point Handles.
- [ ] **Milestone 9**: Shape Text Alignment & Bounding Box Formatting Calculations.
- [ ] **Milestone 10**: Real-Time Live Filter Preview & Stack Drag-and-Drop Reordering.

---

## 🔵 Phase 3: UI Consolidation, SVG Animations & Canvas Hotkeys (Newly Added)

- [ ] **Milestone 11: Picture Format Icon Consolidation**
  - **Stroke Marker Cycling**: Merge 4 end marker icons into 1 single toggle (`None` $\rightarrow$ `Arrow` $\rightarrow$ `Circle` $\rightarrow$ `Diamond` $\rightarrow$ `None`).
  - **Stroke LineCap Cycling**: Merge 3 cap icons into 1 single toggle (`Butt` $\rightarrow$ `Round` $\rightarrow$ `Square` $\rightarrow$ `Butt`).
  - **Stroke LineJoin Cycling**: Merge 3 join icons into 1 single toggle (`Miter` $\rightarrow$ `Round` $\rightarrow$ `Bevel` $\rightarrow$ `Miter`).
- [ ] **Milestone 12: Picture Format Alpha Removal & Filter Merger**
  - Remove alpha slider from Picture Format tab (moved to Filter suite).
  - Merge Filter Modal UI directly into `Edit` (`편집`) tab category.
- [ ] **Milestone 13: Text Format Alpha Removal & Filter Icon Insertion**
  - Remove alpha slider from Text Format color section.
  - Insert direct Filter launcher button into Text Color group.
- [ ] **Milestone 14: SMIL SVG Animation Suite (11 Properties)**
  - Panel to append SVG `<animate>` / `<animateTransform>` with 11 property controls:
    1) `attributeName`
    2) `values` / `to`
    3) `dur` (duration)
    4) `repeatCount`
    5) `max` (maximum duration/extent)
    6) `restart` (`always`/`whenNotActive`/`never`)
    7) `end`
    8) `path` / `d` (motion path)
    9) `type` (`rotate`, `scale`, `translate`, `skewX`, `skewY`)
    10) `begin` (`click`, `hover`, `touchstart`, `focus`, `window load`)
    11) `Add` button
- [ ] **Milestone 15: Canvas Mouse Zoom & Wheel Scroll**
  - Hovering canvas with no shape selected: `+` / `-` keys or mouse wheel scroll zooms canvas view.
- [ ] **Milestone 16: Canvas Select All Hotkey (`Ctrl + A`)**
  - Hovering/focusing canvas: `Ctrl + A` selects all SVG objects.
- [ ] **Milestone 17: Rotation & Flip E2E Test Suite (`TC29`)**
  - Add E2E test verifying `flipH`, `flipV`, `rotate90`, and `rotateNeg90`.
