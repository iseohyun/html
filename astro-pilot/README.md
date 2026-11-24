# Astro 시범 전환

iseohyun.com을 Astro로 옮길 수 있는지 보려고, 공학 > 프로그래밍 언어 > C 묶음(9편)만 옮겨 본 프로젝트입니다.
기존 사이트의 파일은 하나도 고치지 않았습니다.

## 실행

```bash
cd astro-pilot
npm.cmd install
npm.cmd run build
npm.cmd run preview
```

`http://localhost:4321/`에 옮긴 문서 목록이 나옵니다. 개발 중에는 `npm.cmd run dev`를 씁니다.

아직 옮기지 않은 문서로 가는 링크는 `https://iseohyun.com/#/…`(기존 사이트)로 이어집니다.
로컬 테스트 서버로 보내려면 빌드할 때 주소를 바꿉니다.

```bash
set LEGACY_BASE=http://localhost:5174/html/# && npm.cmd run build
```

## 구조

| 파일 | 하는 일 |
| :--- | :--- |
| `scripts/sync-public.mjs` | 저장소 루트의 공통 자원(`style.css`, `modules/`, `source/`, `basicStudy/engineering/language/svg/`, `hierarchy.json`)을 `public/`으로 복사합니다. dev · build 전에 저절로 실행됩니다. |
| `src/lib/site.mjs` | 사이트맵을 읽고, 옮긴 범위(`MIGRATED_PREFIXES`)와 기존 사이트로 보낼 주소를 정합니다. 사이트맵 순회는 `modules/core/hierarchy.js`를 그대로 불러 씁니다. |
| `src/lib/legacy-doc.mjs` | 기존 문서 HTML을 jsdom으로 읽어 `<article>` 본문, 문서 전용 CSS · 스크립트, 설명문, 마지막 수정일을 꺼냅니다. |
| `src/pages/[...slug].astro` | 옮긴 문서마다 `/basicStudy/engineering/language/C/function.html` 같은 기존 주소로 페이지를 만듭니다. |
| `src/layouts/Shell.astro` | 페이지 뼈대: 메타 태그(설명, canonical, OG, 이동 경로 JSON-LD), 본문, 공통 모듈. |
| `src/components/Sidebar.astro`, `SitemapNode.astro` | 레일과 사이트맵 트리를 빌드할 때 그립니다. |
| `public/pilot/navigation-static.js` | 기존 `navigation.js`(해시 라우터)를 대신합니다. 미리 그린 레일 · 트리에 동작을 붙이고 기존 모듈을 초기화합니다. |
| `src/pages/index.astro` | 옮긴 문서 목록. 예전 공유 주소(`/#/basicStudy/engineering/language/C/…`)로 오면 새 주소로 넘겨 줍니다. |

원본 문서는 저장소 루트에 그대로 있고, 빌드할 때 읽어 옵니다. 문서를 고치면 다시 빌드하면 됩니다.

## 결과 (2026-11-18)

### 그대로 동작한 것

- 슬라이드(읽어 주기, 전체 화면, 그림 크게 보기), 함수 문서의 실행 줄 · 콜 스택 시뮬레이터
- 헤더 제목 · 형제 문서 탭 · 화면 설정, 사이트맵 패널, 목차 이동, 제목 검색, 코드 하이라이트 · 복사 단추
- 좁은 화면의 서랍(열기 · 덮개를 눌러 닫기), 저장된 테마
- 9편 모두 콘솔 오류 없음 (Google 슬라이드 iframe 안에서 나는 `ERR_UNKNOWN_URL_SCHEME`만 있고, 기존 사이트와 같습니다)

기존 모듈 가운데 바꾼 것은 `navigation.js` 하나뿐입니다. 나머지 14개 모듈과 문서 안의 인라인 스크립트는 고치지 않고 그대로 씁니다.

### 측정 (로컬, 헤드리스 Chromium, 5회 중앙값)

| 문서 | 방식 | 본문이 보일 때까지 | FCP | 요청 수 | HTML에 본문이 있나 |
| :--- | :--- | ---: | ---: | ---: | :--- |
| 함수 | 기존 | 1272ms | 868ms | 75 | 없음 |
| 함수 | Astro | 913ms | 928ms | 70 | 있음 |
| 포인터 | 기존 | 1136ms | 884ms | 92 | 없음 |
| 포인터 | Astro | 808ms | 828ms | 85 | 있음 |
| 제어문 | 기존 | 1091ms | 912ms | 55 | 없음 |
| 제어문 | Astro | 785ms | 800ms | 52 | 있음 |

- 본문이 보이기까지 약 30% 빨라졌습니다. 기존 방식은 `index.html` → `script.js` → 모듈 17개 → `hierarchy.json` → 문서 순서로 받아야 본문이 나오지만, 새 방식은 첫 HTML에 본문이 들어 있습니다. 로컬 서버라 왕복 시간이 거의 없는 조건이므로, 실제 인터넷에서는 차이가 더 커질 것으로 봅니다(측정하지 않음).
- FCP와 LCP는 비슷합니다. 둘 다 highlight.js · Google 슬라이드 같은 외부 자원이 대부분을 차지합니다.
- 가장 큰 차이는 **검색 엔진이 받는 HTML에 본문이 있다는 것**입니다. 기존 사이트는 모든 주소가 `index.html` 하나라 검색 엔진에는 빈 페이지로 보입니다.

### 아직 하지 않은 것

| 항목 | 내용 |
| :--- | :--- |
| 홈 · 정보 · 설정 화면 | 새소식 달력, 프로젝트, 사이트 소개, 전체 설정, 단축키 화면 |
| 개론 화면 | 묶음을 누르면 나오는 자동 개론(`/sitemap/…`). 지금은 트리를 접고 펴기만 합니다 |
| 관리자 · 개발중 문서 | 정적 페이지라 개발중 문서를 빌드에서 뺄지, 따로 둘지 정해야 합니다 |
| 마크다운 문서, 소프로젝트(`small-project/*`) | 소프로젝트는 독립 페이지라 그대로 복사해도 될 것으로 봅니다 |
| 배포 | GitHub Actions에서 빌드해 GitHub Pages로 올리는 설정 |
| sitemap.xml · 버전 표기 | `@astrojs/sitemap` 추가, `?v=` 캐시 버스팅을 해시 파일 이름으로 바꾸기 |
| 테스트 | 기존 Playwright 테스트는 해시 주소를 가정하므로 주소를 바꿔야 합니다 |

## 전체 전환 비용 다시 보기

시범에 쓴 새 코드는 약 860줄입니다(`navigation-static.js` 240줄, Astro 쪽 600줄). 문서 본문은 손대지 않았습니다.

- **문서 이전**: 묶음 하나는 `MIGRATED_PREFIXES`에 경로를 더하는 한 줄입니다. 문서마다 손볼 일은 `<article>`이 없는 문서, 상대 경로 자원, 예전 전역 변수를 쓰는 소프로젝트에서만 생길 것으로 봅니다.
- **뼈대**: 이번에 옮긴 것은 문서 화면 하나입니다. 홈, 개론, 설정, 관리자 기능을 옮기는 것이 남은 일의 대부분이고, 1~2주로 봅니다.
- **배포와 테스트**: 빌드 자동화, 예전 주소 넘겨 주기, Playwright 테스트 수정에 1주 정도로 봅니다.

처음 제안한 3~5주 안에 들어갈 것으로 봅니다. 다만 기존 모듈을 그대로 쓰는 방식이라, 뼈대를 Astro 컴포넌트로 다시 짜는 일은 그 뒤의 선택입니다.
