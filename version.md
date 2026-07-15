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

