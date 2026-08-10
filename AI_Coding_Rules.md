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

## 4. Architecture & Consistency Directives (개발 통일성 및 아키텍처 지침)
- **Unified Test Automation (루트 단일 테스트 시스템)**:
  - Do NOT install Playwright or `node_modules` inside sub-projects (`small-project/*`).
  - All test cases (TC) MUST reside in the root `tests/` directory (e.g., `tests/<project>.spec.js`).
- **Standardized Change Log Documentation (변경 이력 문서 규격)**:
  - Do NOT use `version.md`.
  - Always manage release notes using `CHANGELOG.md` (Global/English) and `CHANGELOG-KR.md` (Korean).
- **Standardized Project Documentation (설명 문서 규격)**:
  - Use uppercase `README.md` and `README.ko.md` for sub-project documentations.
- **Clean Sub-project Directory (서브 디렉터리 청정 유지)**:
  - Do NOT create `scratch/` or temporary files inside sub-project folders.
  - Sub-projects MUST remain 100% lightweight pure source code.
- **Absolute Path Resolution (절대 경로 참조 원칙)**:
  - All sub-projects MUST import shared assets via root absolute paths (e.g., `/modules/core/...`, `/style.css`).