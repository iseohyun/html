# 수기 제곱근 계산기 (Manual Square Root Calculator)

수기로 제곱근을 계산하는 과정을 격자(Grid)상에 단계별 시각화로 안내해 주는 교육용 웹 애플리케이션입니다.

---

## 📂 폴더 구조 및 파일 구성 (Folder Structure)

본 프로젝트는 대규모 리팩토링을 통해 기존의 단일 파일 구조에서 관심사 분리(SoC) 원칙을 준수하는 모듈화 구조로 개편되었습니다.

```text
/small-project/manualSqrt/
├── index.html          # 메인 HTML UI 인터페이스
├── manualSqrt.css      # 그리드 및 가이드 툴팁 레이아웃 스타일시트
├── readme.md           # 프로젝트 문서 및 폴더 구조 명세 (본 파일)
├── version.md          # 릴리즈 버전 및 개발자 패치 기록
├── tc/                 # 자동 테스트 검증용 마크다운 명세 케이스 폴더
│   ├── testcase_2.md
│   ├── testcase_333.md
│   └── testcase_12345.1.md
└── module/             # 역할별 분산 모듈 폴더
    ├── config.js       # [1] 전역 변수 설정, 상수 데이터 및 Undo/Redo 히스토리 관리
    ├── math.js         # [2] 자릿수 분류, 소수점 보정 및 제곱근 연산 상태 머신 알고리즘
    ├── render.js       # [3] 테이블 그리드 빌더, 값 드로잉 및 셀 하이라이트 제어
    ├── tooltip.js      # [4] 단계별 조사 보정 가이드 텍스트 및 연습 문제(Challenge) 검증
    ├── main.js         # [5] 프로그램 초기 실행 진입점, ResizeObserver 및 좌표 수집 연결
    ├── keybinding.js   # [6] 단축키 바인딩 리스너 및 단축키 커스텀 설정 모달 관리
    └── testRunner.js   # [7] 테스트 파일 파싱 및 스크롤 자동 검증 러너
```

---

## ⚙️ 모듈 로딩 방식

브라우저의 로컬 보안 CORS 차단 이슈(로컬 서버 없이 `file://` 프로토콜로 HTML을 직접 실행하는 상황)를 방지하고, 리소스를 안전하게 불러올 수 있도록 **순서 보장 비동기 로딩 방식(`defer`)**을 채택하여 글로벌 스코프를 통해 서로 유기적으로 결합됩니다:

```html
<!-- index.html 내 로딩 시퀀스 -->
<script src="module/config.js" defer></script>
<script src="module/math.js" defer></script>
<script src="module/render.js" defer></script>
<script src="module/tooltip.js" defer></script>
<script src="module/main.js" defer></script>
<script src="module/keybinding.js" defer></script>
<script src="module/testRunner.js" defer></script>
```
