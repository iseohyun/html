# version.md
## Scope
/small-project/manualEuclidean/**

### [v1.0.7] - 2026-07-22
- **GridInput 클래스 재선언 SyntaxError 해결**: 서로 다른 생성자 스펙을 가지는 `class GridInput`이 SPA 라우팅 간 중복 해석되어 SyntaxError를 유발하는 문제를 차단하기 위해, 글로벌 영역에 `EuclideanGridInput`으로 고유하게 선언 등록한 뒤 내부적으로 `GridInput`으로 바인딩하여 렉시컬 격리를 완성했습니다.

### [v1.0.6] - 2026-07-22
- **전역 let/const 변수 var 치환 패치**: SPA 리로드 없이 페이지를 반복 전환해 진입할 때, 전역 렉시컬 스코프 변수(`max_line`, `inputs`, `V`, `stepsData` 등)가 중복 선언되어 브라우저 구문 오류(`SyntaxError: Identifier has already been declared`)를 일으키는 문제를 해결하기 위해, 모든 전역 let/const 선언을 var로 변환했습니다.

### [v1.0.5] - 2026-07-22
- **const 변수 전역 스코프 격리 패치 및 리스너 클린업**: SPA 내 스크립트 실행 격리로 인해 `stepsData` 참조 시 `ReferenceError`가 유발되던 오류를 방지하기 위해 `window.stepsData` 전역 브릿지를 보강했습니다. 또한 다른 페이지로 라우팅 시 `ResizeObserver` 인스턴스가 파괴되지 않고 누수되어 오작동하는 문제를 방지하기 위해 activeResizeObservers 수집 배열 연동을 이식했습니다.

### [v1.0.4] - 랜덤 시작 기능 추가
- 유클리드 호제법 교육용 시각화를 다양한 수식 쌍으로 즉시 학습할 수 있도록 **🎲 랜덤 시작** 버튼을 추가했습니다.
- 입력값에 따른 최적화된 학습 단계(4~8단계)를 갖는 무작위 정수 쌍(A, B)을 생성하여 실시간으로 격자를 재배치하고 가이드합니다.

### [v1.0.3] - SPC(Small Project Client) 래퍼 연동 최적화
- 부모 페이지와의 CSS 레이아웃 충돌 방지를 위해 `manualEuclidean.css` 내 body 및 article의 배치/크기 관련 스타일 규칙을 제거하고, SPA 레이아웃 스크롤 및 높이 연산이 정상 작동하도록 개선했습니다.

### [v1.0.2] - 툴팁 및 자동검증기 닫기 버그 수정 및 강조 스타일 정렬
- 툴팁 닫기(X) 버튼 및 자동검증기 닫기 오작동 수정 (.hidden 글로벌 클래스화 및 isHidden 상태 분리)
- C단계 대입 대상 수식 밑줄(`<u>`) 표기 및 F열 강조 기능 적용
- A단계 짝수-2 스텝 툴팁 한 칸 아래 정렬 및 G열 왼쪽 정렬 적용
- 랜덤 Start 기능 추가 및 7열 오버플로우 방지 모의 주행 엔진 추가
- A1, D1 셀 라벨 비우기 및 Step 0 중복 출력 수정

### [v1.0.0] - 역할별 모듈 분할 및 구조화 (UI/UX 개선 및 자동화 테스트 적용)
- 관심사 분리(SoC): 기존 단일 main.js 코드를 config.js, math.js, render.js, tooltip.js, keybinding.js, testRunner.js, main.js로 전면 모듈 분할 개편
- 디자인 일관성: manualSqrt 프로젝트의 CSS 스타일 가이드라인을 기반으로 UI/UX 디자인 일관성 100% 동기화 (색상 테마, 라벨 정렬, 드래그 지원 툴팁)
- 하이라이트 동적 부여: 참조1(연한 핑크), 참조2(연한 파랑), Target(노랑) 컬러 시스템 이식 완료
- 검증 및 시뮬레이션: 마크다운 문서를 읽어 각 스텝별 툴팁 문자열 및 셀 값을 실시간 정합 검증하는 자동화 테스트 러너 모듈 구축