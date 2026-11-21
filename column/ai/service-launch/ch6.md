2026-11-21 작성

- 목표: 웹 사이트를 홈 화면에 설치되는 앱(PWA)으로 만들고, 강제 새로고침 없이 늘 최신 판을 쓰게 하기
- 다루는 것: 설치 조건, manifest, 서비스 워커, 캐시와 캐시 버스팅, 이원화 버전 관리, 새 판 알림, 공유, 릴리즈
- 실제 사례: `iseohyun.com` (`manifest.webmanifest`, `sw.js`, `window.SiteVersion`, 새 판 알림 띠)

# 웹 앱 설치 (PWA)

## PWA란

- PWA(Progressive Web App): 웹 사이트를 앱처럼 홈 화면에 설치해 쓰는 방식
- 앱 스토어 심사·수수료 없음, 웹 주소 하나로 휴대폰·PC 모두 지원
- 설치하면 달라지는 것
  - 홈 화면·작업 표시줄 아이콘
  - 주소창 없는 전체 화면(standalone)
  - iPhone 웹 푸시 알림 (5장): 홈 화면에 설치한 앱에서만 가능
  - 오프라인 안내 화면, 빠른 다시 열기
- 앱 스토어 앱과의 차이

| 항목 | PWA | 앱 스토어 앱 |
| --- | --- | --- |
| 배포 | 웹에 올리면 끝 | 스토어 심사 |
| 업데이트 | 다음 접속 때 자동 | 스토어 업데이트 |
| 비용 | 없음 | 개발자 등록비, 결제 수수료 |
| 기기 기능 | 카메라·위치·알림 등 일부 | 거의 전부 |
| 스토어 노출 | 없음 (검색엔진으로 대신, 2장) | 있음 |

## 설치 조건

- HTTPS (1장)
- `manifest.webmanifest` 파일과 연결 태그
- 아이콘 192×192, 512×512
- 서비스 워커 등록 (Chrome 기준, 페이지 이동 요청을 처리하는 `fetch` 핸들러 권장)
- 조건이 맞으면
  - Android·PC Chrome·Edge: 주소창의 설치 아이콘, 메뉴의 "앱 설치"
  - iPhone·iPad Safari: 공유 버튼 → **홈 화면에 추가** (자동 안내 없음, 사이트에서 방법 안내 필요)

## manifest 작성

- 사이트 루트에 `manifest.webmanifest` 작성

```json
{
  "id": "/",
  "name": "웹 장기",
  "short_name": "장기",
  "description": "브라우저에서 두는 장기",
  "lang": "ko",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#f5f6f5",
  "theme_color": "#f5f6f5",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

| 항목 | 뜻 | 주의 |
| --- | --- | --- |
| `id` | 앱의 고유 이름 | 바꾸면 다른 앱으로 인식, 처음부터 고정 |
| `name` / `short_name` | 설치 화면 이름 / 아이콘 아래 이름 | `short_name`은 12자 안팎 |
| `start_url` | 아이콘을 눌렀을 때 열 주소 | `scope` 안이어야 함 |
| `scope` | 앱으로 취급할 주소 범위 | 범위 밖 링크는 브라우저로 열림 |
| `display` | `standalone`: 주소창 없음 | `browser`면 설치해도 그냥 탭 |
| `theme_color` | 상단 표시줄 색 | `<meta name="theme-color">`와 맞추기 |
| `icons` `maskable` | 안드로이드가 모양(원·둥근 사각형)에 맞춰 자르는 아이콘 | 가운데 80% 안에 그림 배치 |

- `<head>`에 연결

```html
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/icon-512.png">
<meta name="theme-color" content="#f5f6f5">
```

- 서브도메인 서비스는 manifest도 각자: `xxxx.iseohyun.com`과 `iseohyun.com`은 다른 앱
- 확인: Chrome 개발자 도구 → **Application → Manifest**에서 오류·경고 확인

## 설치 안내 버튼

- Chrome·Edge: 설치 가능해지면 `beforeinstallprompt` 이벤트 발생 → 저장해 두었다가 내 버튼으로 띄우기

```js
let installEvent = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installEvent = e;
  installButton.hidden = false;
});
installButton.addEventListener("click", async () => {
  if (!installEvent) return;
  installEvent.prompt();
  await installEvent.userChoice;
  installEvent = null;
  installButton.hidden = true;
});
```

- iPhone: 이 이벤트가 없음 → "공유 버튼 → 홈 화면에 추가" 그림 안내
- 이미 설치한 앱에서 열렸는지 확인: `matchMedia("(display-mode: standalone)").matches`
- 안내는 한 번 닫으면 다시 띄우지 않기 (`localStorage`에 기억, 4장)

# 서비스 워커

## 하는 일

- 서비스 워커: 페이지와 네트워크 사이에서 요청을 가로채는 백그라운드 스크립트
- 할 수 있는 것
  - 오프라인 안내 화면
  - 파일을 캐시에 담아 오프라인에서도 실행
  - 웹 푸시 알림 받기 (5장)
- 조건: HTTPS, 사이트와 같은 출처의 파일
- 범위: 서비스 워커 파일이 있는 폴더 아래만 관리 → 사이트 루트(`/sw.js`)에 두기

## 최소 구성 (iseohyun.com의 방식)

- 파일을 캐시에 담지 않고, 오프라인일 때 안내 화면만 돌려주기
- 새 판 반영은 서비스 워커가 아니라 캐시 버스팅이 담당 (아래)

```js
// sw.js
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return; // 페이지 이동 요청만
  event.respondWith(
    fetch(event.request).catch(() => new Response(OFFLINE_HTML, {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    }))
  );
});
```

- 등록

```js
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}
```

- `skipWaiting` + `clients.claim`: 새 서비스 워커가 기다리지 않고 바로 적용

## 캐시를 쓰는 서비스 워커의 함정

- 파일을 캐시에 담으면 빠르고 오프라인에서도 되지만, **옛 판에 갇히는 문제**가 생김
  - 캐시에서 옛 `index.html`을 꺼내 보여 줌 → 옛 스크립트 실행 → 새 판을 모름
  - 사용자는 강제 새로고침을 해도 안 바뀌는 경우가 있음
- 캐시를 쓴다면 지킬 것
  - `index.html`(페이지 이동)은 네트워크 우선, 실패할 때만 캐시
  - 캐시 이름에 판 번호를 넣고(`app-20261121v3`), `activate`에서 옛 캐시 삭제
  - 서비스 워커 파일(`sw.js`) 자체는 캐시하지 않기
- 오프라인 실행이 꼭 필요하지 않으면 iseohyun.com처럼 캐시 없는 최소 구성이 가장 안전
- 오프라인이 필요한 앱(예: 장기의 AI 엔진 파일)은 Workbox 같은 도구로 판마다 캐시 관리

## 확인과 디버깅

- Chrome 개발자 도구 → **Application → Service workers**
  - 지금 동작 중인 서비스 워커, 대기 중인 새 판
  - **Update on reload**: 개발 중에는 켜 두기
  - **Unregister**: 꼬였을 때 등록 해제
- **Application → Storage → Clear site data**: 캐시·저장소를 한 번에 지우고 처음 상태로

# 캐시와 강제 새로고침

## 왜 옛 판이 보이나

- 브라우저는 같은 주소의 파일을 다시 받지 않고 캐시에 저장된 것을 씀
- GitHub Pages는 파일을 약 10분 동안 캐시하라고 알려 줌 (`Cache-Control: max-age=600`)
- 그래서 배포 직후에는
  - `index.html`은 새것, `script.js`는 캐시의 옛것 → 섞인 판으로 오류
  - 사용자는 "강제 새로고침(Ctrl + Shift + R)"을 해야 고쳐짐
- 설치한 앱은 더 심함: 앱을 완전히 닫기 전까지 이미 연 화면을 계속 사용
- 사용자에게 강제 새로고침을 요구할 수는 없음: 방법을 모르고, 휴대폰에는 버튼도 없음

## 캐시 버스팅

- 파일 주소 뒤에 판 표시를 붙여, 판이 바뀌면 주소도 바뀌게 하기
  - `style.css?v=20261121v3` → 판이 바뀌면 `style.css?v=20261121v4`
  - 브라우저 입장에서는 처음 보는 주소라 새로 받음
- 방법 1: 빌드 도구가 파일 이름에 내용 해시를 붙임
  - Vite·webpack은 기본으로 `app.3f9a1c.js` 같은 이름 생성
  - 빌드가 있는 프로젝트는 이 방식이 가장 확실
- 방법 2: 빌드 없는 정적 사이트 (`iseohyun.com`의 방식)
  - 진입 스크립트 하나에 판 표시를 정의

```js
// modules/script.js
window.SiteVersion = "20261121v3";
```

  - 나머지 스크립트·CSS는 이 값을 붙여 불러옴

```js
function loadScript(src) {
  const s = document.createElement("script");
  s.src = src + "?v=" + window.SiteVersion;
  document.head.appendChild(s);
}
```

  - `index.html`에서 진입 스크립트를 부를 때도 판 표시 붙이기: `<script src="/modules/script.js?v=20261121v3">`
- 배포할 때마다 판 표시를 반드시 올리기: 잊으면 캐시 버스팅이 동작하지 않음

# 이원화 버전 관리

## 두 가지 버전

| 구분 | 형식 | 예 | 올리는 때 | 누가 정하나 |
| --- | --- | --- | --- | --- |
| 정식 버전 (SemVer) | `MAJOR.MINOR.PATCH` | `v2.1.0` | 의미 있는 변경을 묶어 공개할 때 | 사람이 검토 후 결정 |
| 빌드 표시 | `YYYYMMDDvN` | `20261121v3` | 배포할 때마다 | 규칙대로 자동 |

- 정식 버전: 사용자와 소통하는 번호
  - 업데이트 소식, CHANGELOG, GitHub Release에 사용 (1장의 SemVer 규칙)
  - 자주 올리면 의미가 흐려짐: 기능을 묶어서 올림
- 빌드 표시: 기계를 위한 번호
  - 캐시 버스팅과 새 판 확인에 사용
  - 오탈자 하나를 고쳐도 올림
  - 같은 날 다시 배포하면 `v1` → `v2` → `v3`
- 둘을 나누는 이유
  - 정식 버전을 배포마다 올리면 `v1.0.37` 같은 의미 없는 번호가 쌓임
  - 빌드 표시를 사람이 정하면 잊거나 겹침
  - 문의가 오면 "빌드 표시"로 정확히 어떤 배포본인지 확인

## 운영 규칙 예 (iseohyun.com)

- 배포(main에 push) 전
  - `window.SiteVersion`과 파일 머리 주석의 판 표시를 오늘 날짜로 갱신
  - 같은 날이면 끝의 `N`을 하나 올림
  - 검색 색인 검사(`npm run check:search`) 통과 확인
- 정식 버전
  - 변경 내역 초안을 먼저 작성해 검토
  - 사람이 버전 번호를 정한 뒤 `CHANGELOG.md`, `changelog.json` 갱신
- 화면 어딘가(설정, 정보 화면)에 두 버전을 함께 표시: `v2.1.0 (20261121v3)`
- 이 규칙을 저장소 문서(`.agents/rules/` 등)에 적어 두면 AI 도구도 같은 규칙을 따름

# 새 판 알림과 자동 업데이트

## 새 판 확인 (iseohyun.com의 방식)

- 문제: 설치한 앱은 열어 둔 채로 며칠씩 씀, 그동안 새 배포를 모름
- 방법
  - 화면이 다시 보일 때(앱으로 돌아올 때)와 30분마다 서버의 진입 스크립트를 캐시 없이 받기
  - 그 안의 `SiteVersion`을 읽어 지금 판과 비교
  - 다르면 화면 아래에 "새 판이 나왔어요 · 새로 고침" 띠 표시

```js
async function fetchServerVersion() {
  const res = await fetch(`/modules/script.js?check=${Date.now()}`, { cache: "no-store" });
  const match = /window\.SiteVersion\s*=\s*"([^"]+)"/.exec(await res.text());
  return match ? match[1] : "";
}

document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState !== "visible") return;
  const server = await fetchServerVersion();
  if (server && server !== window.SiteVersion) showUpdateBand(server);
});
```

- 새로 고침 버튼
  - 먼저 `index.html`을 캐시 없이 다시 받아 둔 뒤(`fetch(path, { cache: "reload" })`) `location.reload()`
  - GitHub Pages의 10분 캐시를 건너뛰어 섞인 판 방지
- 자동으로 새로고침하지 않는 이유: 작성 중인 글, 진행 중인 대국이 날아갈 수 있음 → 사용자가 고르게
- 너무 자주 확인하지 않기: 최소 간격(1분)을 두어 요청 낭비 방지

## 다른 방법

- 서비스 워커 업데이트 이벤트
  - 새 `sw.js`가 설치되면 `registration.onupdatefound` 발생 → 새 판 알림
  - 캐시를 쓰는 서비스 워커라면 이 방식이 자연스러움
- `version.json` 파일
  - 배포할 때 `{"build": "20261121v3", "version": "2.1.0"}` 파일을 함께 만들고, 앱이 이 파일을 확인
  - 스크립트 본문을 읽는 것보다 깔끔, 빌드 도구에서 자동 생성 가능
- 데이터 형식이 바뀌는 배포
  - 저장 키에 판 번호를 붙이기 (예: `iseohyun_settings_v1`)
  - 형식이 바뀌면 `v2`로 올리고, 옛 값을 읽어 옮기는 코드 추가 (4장 브라우저 저장소)

# 공유

## SPA에서 공유가 어려운 이유

- SPA(한 페이지 앱): 페이지를 새로 불러오지 않고 자바스크립트가 화면만 바꾸는 방식
- 문제
  - 화면 상태(보던 문서, 고른 탭, 진행 중인 단계)가 메모리에만 있고 주소에 없음
  - 주소를 복사해 보내면 받는 사람은 첫 화면만 봄
  - 새로고침해도 처음으로 돌아감
- 설치한 앱은 더 심함
  - 주소창이 없어 사용자가 주소를 복사할 방법 자체가 없음
  - 앱이 공유 버튼을 직접 줘야 함
- 해결의 두 축
  - 화면 상태를 주소에 담기: 공유할 "무엇"
  - 공유 서랍 호출: 공유하는 "방법"

## 상태를 주소에 담기

- 원칙: 다른 사람에게 보여 줄 수 있는 화면이라면 주소 하나로 다시 열 수 있어야 함
- 주소의 부분별 쓰임

| 부분 | 예 | 맞는 용도 | 특징 |
| --- | --- | --- | --- |
| 경로 | `/rules/` | 별도 페이지, 검색 노출이 필요한 화면 | 서버(정적 파일)가 있어야 함, OG 미리보기 개별 지정 가능 |
| 해시 | `#/column/ai/service-launch/ch6.md` | SPA 안의 문서·화면 | 서버에 전달되지 않음, 정적 호스팅에서 바로 동작 |
| 쿼리 | `?room=K7QM2XPA`, `?level=3` | 방 코드, 필터, 단계 같은 선택값 | 경로·해시와 함께 사용 |

- 실제 사례
  - `iseohyun.com`: 문서 위치를 해시에 담음 (`#/column/...`) → 주소만 보내면 같은 문서가 열림
  - 웹 장기: 방 코드를 쿼리에 담음 (`?room=...`) → 주소만으로 같은 대국방에 들어옴 (5장)
- 넣을 것
  - 다시 열었을 때 같은 화면을 만드는 데 필요한 최소한의 값: 문서 위치, 탭, 방 코드, 필터
- 넣지 말 것
  - 개인정보, 토큰, 메일 주소: 주소는 기록·로그·메신저 미리보기에 남음
  - 임시 상태: 입력 중인 글, 열린 메뉴, 스크롤 위치 (필요하면 앵커 `#절 제목` 정도만)
  - 너무 긴 값: 메신저에서 잘리거나 보기 흉함 → 긴 상태는 서버에 저장하고 짧은 ID만 주소에
- 주소와 화면을 함께 바꾸기

```js
// 화면을 바꿀 때 주소도 갱신 (새 기록을 쌓지 않으려면 replaceState)
function openTab(tab) {
  const url = new URL(location.href);
  url.searchParams.set("tab", tab);
  history.pushState(null, "", url);
  renderTab(tab);
}

// 주소가 바뀌면(뒤로 가기, 링크로 들어옴) 화면 복원
window.addEventListener("popstate", () => {
  renderTab(new URL(location.href).searchParams.get("tab") || "home");
});
```

- 해시 경로를 쓰면 `hashchange` 이벤트로 같은 처리
- 처음 열릴 때도 주소를 읽어 화면을 만들기: 공유받은 사람은 항상 "처음 열림"으로 들어옴
- 잘못된 주소(없는 문서, 닫힌 방)는 오류 대신 안내 화면과 첫 화면 링크

## 공유 서랍 호출

- 공유 서랍: 휴대폰 운영체제의 공유 화면 (카카오톡, 메시지, 메일, 복사 등이 한 번에 나옴)
- Web Share API: 웹에서 이 서랍을 여는 기능

```js
async function share() {
  const data = {
    title: document.title,
    text: "브라우저에서 두는 장기, 같이 둬요",
    url: location.href
  };
  if (navigator.share) {
    try {
      await navigator.share(data);
    } catch (err) {
      if (err.name === "AbortError") return; // 사용자가 닫음: 아무 말도 하지 않음
      await copyUrl(data.url);
    }
    return;
  }
  await copyUrl(data.url);
}

async function copyUrl(url) {
  try {
    await navigator.clipboard.writeText(url);
    showToast("주소를 복사했어요");
  } catch (err) {
    showUrlBox(url); // 복사도 안 되면 주소를 보여 주고 직접 복사하게
  }
}
```

- 순서: 공유 서랍 → 안 되면 주소 복사 → 복사도 안 되면 주소 표시
  - 퀴즈 앱 공통 규칙(QuizApp Common GUI)도 이 순서
  - `iseohyun.com` 헤더의 공유 버튼은 지금 주소 복사만 사용
- 지원 범위

| 환경 | 공유 서랍 | 주소 복사 |
| --- | --- | --- |
| Android Chrome | 지원 | 지원 |
| iPhone·iPad Safari | 지원 | 지원 |
| Mac Safari | 지원 | 지원 |
| Windows Chrome·Edge | 지원 (Windows 공유 창) | 지원 |
| Firefox (PC) | 대부분 미지원 | 지원 |
| 인앱 브라우저 | 앱마다 다름 | 대부분 지원 |

- 조건
  - HTTPS, 사용자가 버튼을 누른 직후에만 호출 가능 (자동 호출 불가)
  - 중간에 `await`로 오래 기다리면 "사용자 동작"이 끊겨 거부될 수 있음: 공유할 주소는 미리 준비
- 공유 버튼 위치
  - 설치한 앱에서는 헤더나 메뉴에 항상 보이게
  - 결과 화면(점수, 완성한 기보)처럼 공유하고 싶어지는 순간에 버튼 배치
- 파일 공유: `navigator.canShare({ files })`가 참이면 이미지(점수 카드, 기보 그림)도 함께 공유 가능

## 공유받기 (share_target)

- 반대 방향: 다른 앱에서 "공유 → 내 앱"으로 글·주소·파일을 받기
- 설치한 PWA만 공유 대상 목록에 나타남 (주로 Android, iPhone은 미지원)
- manifest에 추가

```json
"share_target": {
  "action": "/share",
  "method": "GET",
  "params": { "title": "title", "text": "text", "url": "url" }
}
```

- 받은 값은 `/share?title=...&text=...&url=...`로 들어옴 → 화면에서 읽어 처리
- 받은 내용은 남이 보낸 데이터: 그대로 `innerHTML`에 넣지 않기 (4장 XSS)
- 쓰임 예: 메모 앱에 글 보내기, 북마크 앱에 주소 보내기, 기보 파일 불러오기

## 미리보기 카드의 한계와 대안

- 링크를 메신저에 붙이면 2장의 OG 태그로 미리보기 카드 생성
- 해시 경로의 한계
  - 메신저 서버는 `#` 뒤를 보지 않고 `index.html`의 OG 태그만 읽음
  - `iseohyun.com/#/column/a`와 `iseohyun.com/#/column/b`의 미리보기가 같음
  - 자바스크립트로 OG 태그를 바꿔도 미리보기 서버는 자바스크립트를 실행하지 않음
- 대안
  - 중요한 화면은 실제 경로의 정적 공유용 페이지 만들기 (예: `/share/ch6.html`)
    - 그 페이지에 고유한 OG 태그를 두고, 열리면 SPA의 해당 화면으로 이동
    - 빌드 때 `hierarchy.json` 같은 목록에서 자동 생성 가능
  - 동적인 내용(점수, 방 초대)은 공통 카드 + 공유 문구로 보완
    - `navigator.share`의 `text`에 "3분 12초 만에 풀었어요" 같은 내용 넣기
  - 서버 함수로 OG 이미지를 그때그때 만들어 주는 방법도 있지만 비용·구현 부담이 큼
- 확인: 2장의 카카오 공유 디버거로 실제 카드 모양 점검

# 릴리즈

## 배포와 릴리즈의 차이

- 배포: main에 push → GitHub Pages가 공개 (1장), 빌드 표시만 올라감
- 릴리즈: 정식 버전을 붙여 "이번 판에서 바뀐 것"을 공개하는 일

## GitHub Release 만들기

- 태그 만들기

```powershell
git tag v2.1.0
git push origin v2.1.0
```

- GitHub 저장소 → **Releases → Draft a new release** 클릭
  - 태그 `v2.1.0` 선택
  - 제목: `v2.1.0 - 기보 공유`
  - 본문: CHANGELOG의 해당 버전 내용 (1장의 Added·Changed·Fixed·Removed)
  - **Generate release notes**: 커밋·PR 목록 자동 작성, 사용자용 문장으로 다듬기
- **Publish release** 클릭
- 자동화: 태그를 push하면 GitHub Actions가 CHANGELOG에서 해당 부분을 꺼내 릴리즈를 만들게 구성 가능

## 사용자에게 알리기

- 사이트 안 "업데이트 소식" 화면 또는 첫 화면 알림 (예: `changelog.json`을 읽어 표시)
- 큰 변경은 블로그 글, 카카오톡 채널 소식, 디스코드 공지 (5장)
- 새 판 알림 띠와 연결: 새로 고침 뒤 "이번 판에서 바뀐 것" 한 줄 보여 주기
