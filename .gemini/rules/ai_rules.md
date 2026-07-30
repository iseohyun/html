# Mandatory AI Coding Rules & Workflow Protocol

This workspace enforces strict system-level rules. The AI assistant MUST observe all directives herein across all turns without exception.

## 1. Primary Reference
- Always refer to and strictly follow [AI_Coding_Rules.md](file:///c:/git/html/AI_Coding_Rules.md) ("AI Requirements") for project architecture, code conventions, and Git workflows.

## 2. Git & Verification Protocol
- **HALT ALL AUTOMATIC PUSH**: Do NOT perform `git push` automatically.
- Merge to `main` and execute push ONLY when explicitly requested by the user.
- Enforce the lifecycle: **Implementation ➡️ Verification ➡️ User Approval ➡️ Local Commit**.

## 3. Mandatory Response Summary Section
- At the very end of **EVERY SINGLE RESPONSE**, always append the following section:
  ```markdown
  ### 📋 Auto-Accepted Actions
  - [Action Summary / Tool calls list]
  ```
- If no tools were called in the turn, explicitly write `- 없음`.

## 4. Standard SPC Modular Architecture Specification
- All projects under `small-project/` MUST follow the modular structure:
  - `index.html` (Must include `#error-console` div and `window.onerror` script block)
  - `[project_name].css` (Scoped container styles; no layout properties on `body` or `article`)
  - `version.md` (Version history and change log)
  - `readme.md` (Project introduction and documentation)
  - `module/`
    - `config.js` (Constants and color theme bindings)
    - `simulation.js` or `render.js` (Core logic and SVG/DOM rendering)
    - `main.js` (App entry and event lifecycle management)

## 5. SPA Environment & Lexical Scope Protection
- Use IIFE `(function() { ... })();` or `var` for top-level variables to prevent `Uncaught SyntaxError: Identifier 'XXX' has already been declared` when re-entering pages in SPA routers.
- Clean up global listeners and observers appropriately.
