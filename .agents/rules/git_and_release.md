---
description: Directives for Git workflow, commit conventions, versioning, release approval, and cache busting.
---

# Git & Release Directives

## 1. Git Push & Commit Restrictions
- **Do NOT perform automatic `git push`**.
- Execute local `git commit` **ONLY after the user tests the work and provides an explicit success/approval message**.
- Execute `git push` or merge to `main` ONLY when explicitly requested by the user.

## 2. Versioning & Release Approval
- Do NOT automatically bump version numbers or create version release commits upon code/design changes.
- Update version numbers in changelog files (`CHANGELOG.md`, `CHANGELOG-KR.md`, `changelog.json`) and execute release commits **ONLY after the user inspects the work and explicitly assigns the version number (e.g., v1.0.1)**.

## 3. Sub-project Merge & Changelog Verification
- When merging a sub-project branch into `main`:
  - The AI MUST prepare a draft of the changelog notes first.
  - Present the draft to the user and obtain explicit review/approval **BEFORE** updating `CHANGELOG.md`, `CHANGELOG-KR.md`, or `changelog.json`.

## 4. Release Versioning & Cache Busting
- Before executing a release commit or push to `main`:
  - Update `window.SiteVersion` and the top version comment in `/modules/script.js` using the format `YYYYMMDDvN` (e.g., `20260814v1`).
  - If updated on the same day, increment `N` (e.g., `v1` -> `v2`).
