## Document Name & Basic Rules
- This file (`AI_Coding_Rules.md`) shall be referred to as **"AI Requirements"** or **"LLM Requirements"** in the future. All rules herein must be strictly observed.
- Upon completion of all tasks, **always summarize and share the "Auto-Accepted Actions (actions executed automatically without explicit user approval)"**.
- Unless explicitly specified otherwise by the user, the target scope defaults to a project located within the `small-project` directory.

---

## Initial Project Entry Protocol
1. **Understand Status & Environment**: Run `git status` and `git branch` to inspect the current state of the workspace.
2. **Branch Creation & Switch**: Create and switch to a new git branch named after the specified scope.
3. **Pre-Analysis**: If `version.md` or `README.md` exists within the project directory, read them first to clarify history and project goals.
4. **Adhere to the Standard Structure**: To eliminate the overhead of re-analyzing past source codes, directly adopt and design according to the **Standard SPC Modular Architecture** defined below.

---

## Git Rules
- Do not search or modify files outside the designated scope.
  - If the scope is ambiguous, always confirm it with the user.
- Manage git branches using the scope name.
- Follow the 'Implementation' ➡️ 'Verification' ➡️ 'Commit' process.
  - Perform commits ONLY after the user has completed and approved the verification.
- Before committing, if there are any unidentified changes, always verify with the user if they were intended. (Mandatory)
- Push operations must only be executed if the user explicitly requests or authorizes them.

---

## Standard SPC Modular Architecture Specification
The standardized structure for small-scale projects (SPC) is defined as follows and must be enforced:

### 1. File and Directory Layout
```
[project_root]/
├── index.html            # Main entry page (defines UI markup, loads CSS and JS modules)
├── [project_name].css    # CSS file (excludes body/article layout styles, enforces style isolation)
├── version.md            # Version history and change log management
├── readme.md             # Project introduction and usage instructions
└── module/               # Script files segregated by functionality
    ├── config.js         # Configuration settings (constants, color themes, UI selector bindings)
    ├── simulation.js     # Core logical operations, simulations, or mathematical algorithms (strict DOM isolation)
    │                     # (Can be run on the main thread or offloaded to an inline/external Web Worker)
    ├── chart.js/render.js# UI rendering, SVG manipulations, DOM updates, and animation control
    └── main.js           # Application entry point (DOMContentLoaded, event binders, lifecycle management)
```

### 2. Separation of Concerns (SoC) Guidelines
- **Data/Logic Layer (`simulation.js` or `simulationWorker.js`)**:
  - Handles only pure mathematical calculations and state data updates.
  - Do NOT call DOM-manipulation or UI-update functions (such as `document.getElementById` or `querySelector`) in this file. Compute results as pure return values or post them as messages (in Worker threads).
- **Rendering Layer (`chart.js` or `render.js`)**:
  - Dynamically draws SVGs or updates DOM elements (text, styles, etc.) based on computed state data.
  - Focuses solely on drawing/updating the screen; it should not calculate business logic.
- **Entry & Event Layer (`main.js`)**:
  - References `config.js` and other modules to bind events, manage worker lifecycles, and initialize the application.
  - Acts as a bridge: when a user clicks a button, it calls/triggers the simulation layer to update data, and then triggers the rendering layer to update the screen.

### 3. `index.html` Standard Layout Components
- **Error Console (`#error-console`)**: Positioned at the top of the page to display runtime errors immediately.
  ```html
  <div id="error-console" style="color: #ef4444; background: #fef2f2; border: 1px solid #fee2e2; padding: 12px; margin-bottom: 20px; border-radius: 8px; font-family: monospace; display: none; font-size: 0.9rem; line-height: 1.4;"></div>
  <script>
    window.onerror = function(message, source, lineno, colno, error) {
      const consoleDiv = document.getElementById("error-console");
      if (consoleDiv) {
        consoleDiv.style.display = "block";
        consoleDiv.innerHTML += `<div><strong>JS Error:</strong> ${message} <br><small>at ${source}:${lineno}:${colno}</small></div>`;
      }
      return false;
    };
  </script>
  ```
- **Header Section**: Project title and configuration toggle.
- **Input Controls**: Form inputs for user parameters (numbers, conditions, etc.).
- **Output/Result Area**: Disabled inputs or spans displaying calculated results (numbers or texts).
- **Visualization Area**: Chart canvas, SVG grids, graphical diagrams.

---

## Implementation Rules
- Always refer to `/version.md` located at the root of each scope.
- **Clean Naming (Meaningful Identifiers)**: Avoid hasty naming or typos in variable names, function names, IDs, and classes (e.g., `resault`, `getDate`). Rename them to standard English words with correct spelling and clear meaning (e.g., `result`, `runSimulation`).
- **SPA/SPC Layout & Styling Isolation Rules**:
  - ⚠️ [IMPORTANT] This sub-project is dynamically rendered as a child node within the `<article>` tag of a parent SPA host website.
  - To prevent breaking the host layout and the top menu bar padding calculation, **never specify layout-related styles (e.g., margin, padding, display: flex, width, height, min-height, box-shadow, background-color) directly on the `body` and `article` tags** in your CSS.
  - Inherit the parent page's layout naturally, restricting custom styles on `body` and `article` to low-impact typography properties like font definitions (`font-family`) or `position: relative`. All custom layouts must be scoped within a project-specific container (e.g., `.simulation-container`).

---

## SPA Environmental Compatibility & Lifecycle Rules
To prevent syntax errors and resource leaks when switching pages back and forth dynamically in a Single Page Application (SPA) environment without a full browser reload:

### 1. Avoid Top-Level `let`, `const`, and `class` Declarations (Avoid Lexical Redeclaration)
- **Problem**: When a script is re-evaluated upon re-entering a page, declaring variables with `let`, `const`, or `class` at the top-level (outside functions) will throw `Uncaught SyntaxError: Identifier 'XXX' has already been declared` because the browser's global lexical scope is never wiped until a full reload.
- **Solution**:
  - Use `var` for all top-level global variables, constants, config maps, or states. `var` supports multiple redeclarations gracefully.
  - Do not define globally-scoped classes like `class GridInput` repeatedly. Bind them to unique names on the window object once (e.g., `window.MyProjectGridInput = class GridInput { ... }`) and retrieve them locally using `var GridInput = window.MyProjectGridInput;`.
  - For inline HTML script blocks, wrap non-module JS code within an Immediately Invoked Function Expression (IIFE) `(function() { ... })();` to restrict block variables within a temporary local scope.

### 2. Prevent Event Listener and ResizeObserver Leaks
- **Problem**: Adding scroll/resize window listeners or creating a `ResizeObserver` without tearing them down will cause memory leaks and runtime crashes on other pages.
- **Solution**:
  - Push all active `ResizeObserver` instances into `window.activeResizeObservers` immediately upon creation.
  - Push all window event listeners into `window.activeWindowListeners` (e.g., `{ type: 'scroll', fn: handleScroll }`).
  - The SPA router will automatically disconnect and unbind all instances in these arrays when transitioning pages.

### 3. Namespace Cleanup (Globals)
- When defining custom functions on the `window` object (e.g. `initChart`, `redrawChart`), ensure they are cleaned up. Add their identifiers to the `globalsToClean` array inside `navigation.js` so that the router can clean them up dynamically via `delete window[key]` upon navigation.

