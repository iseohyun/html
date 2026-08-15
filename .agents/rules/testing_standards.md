---
description: Zero-dependency in-browser testing standard, 100% function coverage mandate, batch matrix testing, and golden template runner specification.
---

# Zero-Dependency In-Browser Testing Standards

## 1. Zero-Dependency 원칙 (No External Test Frameworks)
- **외부 테스트 의존성 절대 금지**: Playwright, Jest, Vitest, Cypress, Puppeteer 등 npm/CLI 기반 테스트 도구를 sub-project 내에 절대 설치하거나 요구하지 않는다.
- **브라우저 네이티브 실행**: 모든 단위/통합/E2E 테스트는 브라우저에서 직접 구동되는 순수 HTML/JS 테스트 러너(`tests/index.html`)와 경량 테스트 엔진(`tests/testEngine.js`)을 통해 2~3초 내에 고속 실행되어야 한다.
- **표준 골든 레퍼런스 (Golden Reference)**:
  - 러너 UI: `small-project/Webpointer/tests/index.html`
  - 테스트 엔진: `small-project/Webpointer/tests/testEngine.js`
  - 스위트 폴더: `small-project/Webpointer/tests/suites/`
  - 카탈로그 문서: `small-project/Webpointer/tests/TEST_CATALOG.md`

---

## 2. 함수 커버리지 100% 강제 및 설계 프로세스
- **설계 단계 (Planning Mode) 함수 명세표 의무화**:
  - 모든 기능 구현 및 리팩토링 전, Implementation Plan에 생성/수정되는 모든 함수의 명세를 표로 작성해야 한다.
  ```markdown
  | 모듈 파일 | 함수명 | 입력 인자 및 타입 | 정상 반환값 / 기대 상태 변경(Side-effects) | 검증 TC ID |
  | :--- | :--- | :--- | :--- | :--- |
  | ribbonHandlers.js | setTextUnderlineStyle | (style: string) | cfg.textUnderlineStyle = style | S04_TC01 |
  ```
- **함수 커버리지 100% (Function Coverage 100%)**:
  - 프로젝트 내 선언된 모든 공개/내부 함수는 최소 1회 이상 유효하게 호출되고 반환값 또는 상태 변화가 검증되어야 한다.

---

## 3. 그룹화 매트릭스 (Batch Matrix) 테스트 원칙
- **TC 폭증 방지**: 함수가 수백 개에 달할 경우 함수당 개별 TC를 만들지 않고, 유사 계열의 함수들(단순 게터/세터, 레이아웃 빌더, 좌표 변환, 아이콘 생성기 등)은 **1개의 TC 내에서 Batch Matrix(일괄 순회 루프) 방식으로 묶어 검증**한다.
- **목표 TC 규모**: 프로젝트당 50~120개 내외의 컴팩트한 TC로 100% 함수 커버리지를 달성하며, 전체 실행 시간은 3초 미만을 유지한다.

---

## 4. 필수 테스트 러너 UI & 인터랙션 명세 (Mandatory UI Controls)
모든 sub-project의 `tests/index.html`은 다음의 필수 기능들을 100% 동일하게 탑재해야 한다.

### 4.1 글로벌 제어 바 (Top Global Toolbar)
1. **🔍 실시간 검색창 (Filter Input)**: TC ID(`S02_TC06`), 스위트명(`S08`), 한글/영문 키워드 실시간 필터링.
2. **▶ [전체 실행] (Run All)**: 전체 스위트 순차 고속 실행.
3. **↺ [실패만 재실행] (Run Failed)**: 실패(Failed) 상태의 TC들만 타겟 재실행.
4. **🧹 [전체 초기화] (Reset All)**: 모든 테스트 상태(Pending) 및 통계 초기화.
5. **📋 [전체 에러 복사] (Copy All Errors)**: 실패한 모든 TC의 에러 스택트레이스를 클립보드에 일괄 복사.

### 4.2 개별 TC 제어 항목 (Per-TC Row Controls)
1. **▶ [실행]**: 해당 TC 단독 실행.
2. **🧹 [초기화]**: 해당 TC 상태 초기화.
3. **📋 [에러 복사]**: 해당 TC의 실패 에러 메시지/스택 복사.
4. **🔻 실시간 에러 로그 아코디언**: 실패 시 상세 에러 및 Diff를 즉시 펼쳐서 확인.

### 4.3 대시보드 지표 (Dashboard Badges & Stats)
- **통계 바**: Total / Passed / Failed / Pending 실시간 카운터 및 진행 프로그레스 바.
- **커버리지 배지**: 상단 서브헤더에 `함수커버리지: 100.0% | 분기커버리지: XX.X%` 명시.

---

## 5. 계층형 스위트 및 명명 규약 (Naming & Isolation)
- **스위트 파일 경로**: `tests/suites/suite-{스위트번호 2자리}-{도메인명}.js` (예: `suite-01-basic.js`)
- **테스트 케이스 명명**: `S{스위트번호 2자리}_TC{케이스번호 2자리}: {검증 목적 요약}` (예: `S01_TC01: Canvas Viewport & Initialization`)
- **상태 격리 (Hermetic Test Isolation)**:
  - 스위트 간 전역 객체 오염을 원천 차단하기 위해, 각 스위트는 `beforeEach()` 훅에서 공유 `Config`, `State`, `DOM`을 기본값으로 반드시 리셋해야 한다.

---

## 6. 카탈로그 동기화 규약
- 새로운 TC가 추가되거나 변경될 때마다 `tests/TEST_CATALOG.md` 문서를 동기화하여 전체 테스트 카탈로그를 항상 최신 상태로 유지한다.
