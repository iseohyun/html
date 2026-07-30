# AI Coding Rules & Directives

## 1. Versioning & Commit Directives (버전 및 커밋 지침)
- **Git Push Halt Directive (Git Push 중단)**:
  - **Do NOT perform automatic `git push`**.
  - Local `git commit` is permitted after code changes.
  - Execute `git push` or merge to `main` ONLY when explicitly requested by the user.
- **Explicit Version Bump Only Directive (버전정보 업데이트 명시 지침)**:
  - **Do NOT bump version numbers (`version.md` / `changelog.json`) automatically**.
  - Update version numbers and release notes ONLY when the user explicitly requests a version update!

## 2. Response Directives (응답 지침)
- Append `### 📋 Auto-Accepted Actions` at the end of **every response** detailing all tool invocations or write `- 없음`.

## 3. Project Scoping Rules (프로젝트 범위 지침)
- Do NOT touch `small-project/janggi/` unless explicitly requested.