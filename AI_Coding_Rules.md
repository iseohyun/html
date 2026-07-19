## Git관련
- 지정된 scope 이외의 내용 검색 및 수정 금지.
  - scope가 명확하지 않을 때, 반드시 사용자에게 scope 확인
- scope 이름으로 git branch관리
- '구현'->'검증'->'commit' 프로세스 준수. 
  - 오로지 사용자가 검증을 완료할 때만 commit 수행
- commit작업 전에 파악되지 않은 변경사항이 있을 때, 반드시 사용자에게 의도된 것인지 확인 작업. 필수

---
## 구현관련
- 각 scope의 root의 /version.md 참조
- **SPA/SPC(Small Project) 스타일 선언 규칙**:
  - 서브프로젝트 개발 시, 개별 CSS 파일에서 `body`와 `article` 태그에 대한 직접적인 레이아웃 관련 스타일(`margin`, `padding`, `display: flex`, `justify-content`, `width`, `max-width`, `height`, `min-height` 등)을 절대 정의하지 마십시오.
  - 상위 호스트(SPA 사이트)의 고정 메뉴 바 영역 계산 및 전체 레이아웃 렌더링에 오작동을 유발하므로, `body`와 `article`에는 서체 정의(`font-family`)나 `position: relative`와 같이 영향도가 적은 최소한의 스타일 외에는 레이아웃을 덮어씌우는 정의를 일절 금지하며 부모 페이지의 스타일을 상속받도록 해야 합니다.
  
  ⚠️ [중요 - 레이아웃 격리 및 스타일 규칙]
이 소프로젝트(Small Project)는 단독 페이지가 아니라, 상위 SPA 호스트 웹사이트의 <article> 영역 내부에 자식 노드로 동적으로 렌더링될 예정입니다.
따라서 개별 CSS 파일 작성 시, 상위 사이트의 전체 레이아웃 계산 및 상단 고정 메뉴 바의 가려짐 방지 여백 계산이 깨지지 않도록 body와 article 태그에 대한 직접적인 레이아웃 스타일(margin, padding, width, height, min-height, display, justify-content, box-shadow, background-color 등)을 절대 정의하지 마십시오.
body와 article에는 서체 지정(font-family)이나 툴팁 배치를 위한 position: relative 정도의 최소한의 규칙만 지정하고, 그 외에는 부모 페이지의 스타일을 자연스럽게 상속받도록(Inherit) 설계하십시오.