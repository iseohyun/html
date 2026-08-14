---
description: Architecture standards, unified testing, documentation naming, and clean sub-project guidelines.
---

# Project Architecture & Consistency Directives

## 1. Unified Test Automation
- Do NOT install Playwright or `node_modules` inside sub-projects (`small-project/*`).
- All test cases MUST reside in the root `tests/` directory (e.g., `tests/<project>.spec.js`).

## 2. Standardized Documentation
- Do NOT create `version.md`.
- Always manage release notes using `CHANGELOG.md` (Global/English) and `CHANGELOG-KR.md` (Korean).
- Use uppercase `README.md` and `README.ko.md` for sub-project documentation.

## 3. Clean Sub-project Directory
- Do NOT create `scratch/` or temporary files inside sub-project folders.
- Sub-projects MUST remain 100% lightweight, containing pure source code only.

## 4. Absolute Path Resolution
- All sub-projects MUST import shared assets via root absolute paths (e.g., `/modules/core/...`, `/style.css`).
