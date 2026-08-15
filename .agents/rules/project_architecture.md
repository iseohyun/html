---
description: Architecture standards, unified testing, documentation naming, and clean sub-project guidelines.
---

# Project Architecture & Consistency Directives

## 1. Unified Test Automation
- Sub-projects MUST follow the **Zero-Dependency In-Browser Testing Standards** defined in `.agents/rules/testing_standards.md`.
- Do NOT install Playwright or `node_modules` inside sub-projects (`small-project/*`).
- Each sub-project MUST provide a native in-browser test runner (`tests/index.html` + `testEngine.js`) referencing the golden template `small-project/Webpointer/tests/`.

## 2. Standardized Documentation
- Use uppercase `README.md` and `README.ko.md` for sub-project documentation.

## 3. Clean Sub-project Directory
- Do NOT create `scratch/` or temporary files inside sub-project folders.
- Sub-projects MUST remain 100% lightweight, containing pure source code only.

## 4. Absolute Path Resolution
- All sub-projects MUST import shared assets via root absolute paths (e.g., `/modules/core/...`, `/style.css`).
