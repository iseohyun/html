# AI Coding Rules & Directives

## 1. Versioning & Commit Directives (버전 및 커밋 지침)
- **Git Push Halt Directive (Git Push 중단)**:
  - **Do NOT perform automatic `git push`**.
  - Local `git commit` is permitted after code changes.
  - Execute `git push` or merge to `main` ONLY when explicitly requested by the user.
- **User Inspection & Version Delegation Approval Directive (검수 및 버전 정보 위임 후 릴리즈 커밋)**:
  - Do NOT automatically bump version numbers or write version release commits upon code/design changes.
  - **The AI MUST wait for the user to inspect and approve the completed work**.
  - Update version numbers (`CHANGELOG.md`, `CHANGELOG-KR.md`, `changelog.json`) and execute version release commits **ONLY after the user inspects the work and explicitly delegates/assigns the version number (e.g., v1.0.1)**.
- **Changelog Versioning Directive (체인지로그 전용 버전 관리)**:
  - **Do NOT create `version.md`**.
  - Version history and release notes MUST be managed exclusively via standard changelog files (`CHANGELOG.md`, `CHANGELOG-KR.md`, and `changelog.json`).

## 2. Response Directives (응답 지침)
- Append `### 📋 Auto-Accepted Actions` at the end of **every response** detailing all tool invocations or write `- 없음`.

## 3. Project Scoping Rules (프로젝트 범위 지침)
- Do NOT touch `small-project/janggi/` unless explicitly requested.