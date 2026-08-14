---
description: Directives for Git workflow, commit conventions, versioning, and release approval.
---

# Git & Release Directives

## 1. Git Push Restrictions
- **Do NOT perform automatic `git push`**.
- Local `git commit` is permitted after completing code or documentation changes.
- Execute `git push` or merge to `main` ONLY when explicitly requested by the user.

## 2. Versioning & Release Approval
- Do NOT automatically bump version numbers or create version release commits upon code/design changes.
- The AI MUST wait for the user to inspect and approve the completed work.
- Update version numbers in changelog files (`CHANGELOG.md`, `CHANGELOG-KR.md`, `changelog.json`) and execute release commits **ONLY after the user inspects the work and explicitly assigns the version number (e.g., v1.0.1)**.

## 3. Standard Changelog Management
- **Do NOT create `version.md`**.
- Manage version history and release notes exclusively via standard changelog files (`CHANGELOG.md`, `CHANGELOG-KR.md`, and `changelog.json`).
