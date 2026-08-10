# 🛠️ 개발 통일성 및 신규 모듈 구성 리마인더 가이드 (DEVELOPMENT_GUIDE.md)

이 문서는 developers 및 AI가 **신규 소프로젝트(`small-project/<ProjectName>`)를 추가하거나 기존 모듈을 유지보수할 때 개발 통일성(Consistency)과 경량화(Lightweight)를 보장하기 위해 준수해야 하는 5대 체크리스트 및 구조 표준안**입니다.

---

## 📁 1. 신규 소프로젝트 표준 디렉터리 구조

새로운 소프로젝트를 생성할 때는 반드시 아래의 표준 폴더 구조를 준수해야 합니다:

```text
small-project/<ProjectName>/
├── src/                      # 설정 파일 및 정적 리소스 (default-setting.json 등)
├── README.md                 # 글로벌 영문 프로젝트 안내
├── README.ko.md              # 한국어 프로젝트 안내
├── CHANGELOG.md              # 글로벌 영문 버전 변경 이력 (Keep a Changelog 규격)
├── CHANGELOG-KR.md           # 한국어 버전 변경 이력
└── index.html                # 메인 엔트리 포인트 UI (또나 main.js)
```

> ⚠️ **금지 사항**:
> - 서브 프로젝트 폴더 내부에 `node_modules`, `package.json`, `playwright.config.js`를 **개별 설치하지 않습니다**.
> - `version.md`나 소문자 `readme.md` 네이밍을 **사용하지 않습니다**.
> - 서브 프로젝트 내부에 임시 `scratch/` 디렉터리를 **생성하지 않습니다**.

---

## 📋 2. 개발 통일성 5대 체크리스트 (Reminders)

### ✅ Checklist 1: 테스트 케이스(TC)는 루트 `tests/` 폴더로 통일
* **규칙**: 신규 프로젝트의 자동화 테스트 케이스(TC)는 소프로젝트 내부가 아닌 **프로젝트 최상위 루트 `tests/<project-name>.spec.js`** 에 통합 작성합니다.
* **실행**: 프로젝트 루트에서 `npx playwright test` 명령 한 번으로 100% 일괄 검증됩니다.

### ✅ Checklist 2: 변경 이력 문서 표준화 (`CHANGELOG.md` & `CHANGELOG-KR.md`)
* **규칙**: 버전 변경 내역은 `version.md` 대신 **`CHANGELOG.md`** 및 **`CHANGELOG-KR.md`** 두 파일로 이원화하여 작성합니다.

### ✅ Checklist 3: 프로젝트 설명 문서 네이밍 대문자 통일 (`README.md`)
* **규칙**: 모듈 설명 파일은 대문자 **`README.md`** 및 **`README.ko.md`** 파일명 규격을 사용합니다.

### ✅ Checklist 4: absolute path 공유 자원 참조
* **규칙**: 공통 스타일 및 모듈을 불러올 때는 상대 경로 오차를 방지하기 위해 **루트 절대 경로**를 사용합니다.
  - CSS: `<link rel="stylesheet" href="/style.css">`
  - 공통 JS: `<script src="/modules/core/navigation.js"></script>`

### ✅ Checklist 5: 포털 카탈로그 시스템 등록 (`hierarchy.json` & `changelog.json`)
* **규칙**: 신규 모듈 개발 완료 시 사이드바 및 포털 카탈로그에 정상 노출되도록 프로젝트 최상위의 **`hierarchy.json`** 및 **`changelog.json`**에 정보를 등록합니다.

---

## 🧪 3. 통합 테스트 실행 명령어

```bash
# 루트 단일 Playwright 테스트 (15개 전체 프로젝트 일괄 검증)
npx playwright test

# 특정 프로젝트 TC만 개별 검증
npx playwright test tests/kakaotalk.spec.js
```
