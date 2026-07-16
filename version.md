## 20260716v1
### 수행한 작업 (Summary of Actions)
1. **카카오톡 대화방 생성기 v1.0.5 기능 최적화 및 안정화**:
   - 모듈 순차 로딩을 위한 Promise 로더 체인 이식 및 SPA 재진입용 init API 분리 완료
   - 무한 프레임 렌더러를 저전력 휴면 렌더러(Sleep/Wake Loop)로 전면 전환하여 CPU 과점유 및 마우스 대기 커서 스피너 현상 완벽 조치
   - 캔버스 높이 제한 시 상단바 잘림 버그(구식 물리 스크롤 업데이트 원인) 완전 제거 및 오리지널 레이아웃 Y좌표 복원

### LLM 가이드 (Future Prompting Instructions for LLMs)
- **카카오톡 스크립트 실행 순서**: `engine.js` -> `interface.js` -> `main.js` 순서대로 명시적으로 로드되어야 합니다. index.html의 하단 인라인 Promise 로더 체인 구조를 유지하십시오.

## 20260715v3
### 수행한 작업 (Summary of Actions)
1. **관리자 페이지(`admin.html`) 경로 감지 및 자동 링크 연동**:
   - 질문이나 답변 역사 내의 `@카테고리>토픽>페이지` 형태(예: `@basicStudy>science>middle>first>taxonomy`)의 문자열을 감지하여, 해당 문서(`/basicStudy/science/middle/first/taxonomy.html`)를 새 탭으로 여는 하이퍼링크로 자동 변환하는 `formatLinks` 기능을 구현 및 적용하였습니다.
   - 텍스트 뒤에 `.html` 확장자가 포함되어 있거나 누락되어 있는 경우 모두 중복 없이 `.html` 확장자가 정상적으로 붙어 `/#/경로.html` 형식으로 리다이렉트되도록 안정화 조치했습니다.

### LLM 가이드 (Future Prompting Instructions for LLMs)
- **`admin.html` 이스케이프 후 포맷팅**: 텍스트 내에서 특정 키워드나 경로를 포맷팅할 때는 반드시 `escapeHtml` 처리를 거쳐 특수기호(`>` 등)가 안전하게 이스케이프(`&gt;`)된 이후에 `formatLinks` 등의 정규식 치환을 가동해야 HTML 태그 인젝션을 막으면서도 안전하게 링크 태그를 꽂아 넣을 수 있습니다.

## 20260715v2
### 수행한 작업 (Summary of Actions)
1. **사이드바(Sidebar) 메뉴 및 기능 제거**:
   - `modules/core/navigation.js` 파일에서 `nav-toggle`("메뉴 접기/펴기"), `nav-recent`("방문 기록"), `nav-update`("최근 업데이트") 메뉴 요소를 HTML 구조에서 삭제하고 관련된 우측 확장 탭 패널(`tab-recent`, `tab-update`)을 제거하였습니다.
   - 로컬 및 서버 방문 기록 동기화/삭제 관련 메서드(`addPageVisit`, `deletePageVisit`, `renderRecentVisits`)를 `navigation.js`와 `modules/core/auth-handler.js`(`syncHistory`, `mergeHistory`)에서 전면 삭제하고 호출부를 정리하였습니다.
   - `modules/core/keybind-manager.js`에서 단축키 `4`(방문 기록)와 `5`(최근 업데이트) 클릭 바인딩 동작을 제거하였습니다.
2. **`/basicStudy/science/middle/first/taxonomy.html` 오류 수정**:
   - `a.detail` 링크 바로 뒤에 위치하는 `<tspan>`들의 외부를 감싸주는 `<span>` 태그가 누락되어 DOM 파싱 단계에서 `null`의 `innerHTML`을 탐색하려던 자바스크립트(`modules/core/document.js` 의 `initReferences`) 오류(`Cannot read properties of null`)를 해결하였습니다. 여는 `<span>` 태그를 추가하여 정상 감싸지도록 조치했습니다.

### LLM 가이드 (Future Prompting Instructions for LLMs)
- **사이드바 수정 시**: 사이드바 레이아웃과 탭 렌더링, 이벤트 핸들링은 `modules/core/navigation.js`에서 일체 처리합니다. 탭 상태(`tabs` 배열)에 따른 스타일 일괄 토글 동작이 구현되어 있으므로, 탭을 변경할 때는 이 배열도 함께 수정해야 합니다. 
- **단축키 수정 시**: 키보드 단축키 매핑은 `modules/core/keybind-manager.js`에서 관리하므로 사이드바 탭의 인덱스가 바뀌면 단축키 번호 매핑도 일치시켜야 합니다.
- **Reference HTML 구조**: 본문 내 `a.detail` 링크에 대한 팝업 설명(`description`)과 레퍼런스 주소(`reference`)는 `a.detail` 바로 다음에 오는 `<span>` 태그 내부의 자식 노드(`tspan.description`, `tspan.reference`)로 정의되어야 합니다. 누락되거나 구조가 깨질 경우 `document.js` 내의 `initReferences` 함수에서 `Cannot read properties of null (reading 'innerHTML')` 런타임 오류가 발생하므로 구조 유지에 각별히 유의해야 합니다.

