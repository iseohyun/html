# version.md
## Scope
/small-project/manualEuclidean/**

### [v1.0.0] - 역할별 모듈 분할 및 구조화 (UI/UX 개선 및 자동화 테스트 적용)
- 관심사 분리(SoC): 기존 단일 main.js 코드를 config.js, math.js, render.js, tooltip.js, keybinding.js, testRunner.js, main.js로 전면 모듈 분할 개편
- 디자인 일관성: manualSqrt 프로젝트의 CSS 스타일 가이드라인을 기반으로 UI/UX 디자인 일관성 100% 동기화 (색상 테마, 라벨 정렬, 드래그 지원 툴팁)
- 하이라이트 동적 부여: 참조1(연한 핑크), 참조2(연한 파랑), Target(노랑) 컬러 시스템 이식 완료
- 검증 및 시뮬레이션: 마크다운 문서를 읽어 각 스텝별 툴팁 문자열 및 셀 값을 실시간 정합 검증하는 자동화 테스트 러너 모듈 구축