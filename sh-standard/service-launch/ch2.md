2026-11-21 작성

- 목표: `https://xxxx.iseohyun.com`이 Google·Bing·네이버·다음 검색 결과에 노출
- 순서: 페이지가 읽힐 준비(SEO 기본기) → 검색엔진에 등록 → 노출 확인
- 예시: 1장에서 공개한 `xxxx.iseohyun.com`
- 문장 끝의 [`직접`](intro.md) 배지: 계정 가입·결제·비밀값 입력처럼 에이전트에게 맡기지 말고 직접 해야 하는 일, 누르면 개론의 정리로 이동

# SEO 기본기

## 검색노출의 원리

- 검색엔진의 세 단계

| 단계 | 하는 일 | 내가 도울 수 있는 것 |
| --- | --- | --- |
| 크롤링(수집) | 로봇이 링크를 따라 페이지를 방문 | `sitemap.xml`, `robots.txt`, 검색엔진 등록 |
| 색인(저장) | 페이지 내용을 읽어 검색용으로 저장 | `<title>`, `description`, 본문 텍스트, 구조화 데이터 |
| 순위(노출) | 검색어와 맞는 페이지를 골라 정렬 | 좋은 내용, 빠른 속도, 모바일 대응 |

- 정적 HTML의 장점: 서버 없이도 로봇이 바로 내용을 읽음
- 자바스크립트로 그리는 화면(SPA)의 주의점
  - Google은 자바스크립트를 실행해 읽지만 늦게 반영될 수 있음
  - 네이버·다음·Bing은 자바스크립트로 그린 내용을 잘 못 읽는 경우가 있음
  - 중요한 제목·설명은 HTML 원문에 직접 작성 권장
- 해시 경로(`#/xxxx`)의 한계
  - 검색엔진은 `#` 뒤를 같은 페이지로 취급
  - `iseohyun.com/#/a`와 `iseohyun.com/#/b`는 색인에서 한 페이지
  - 화면마다 검색에 걸려야 하면 실제 경로(`/a/`, `/b/`)의 HTML 파일 필요

## title과 description

- 모든 페이지의 `<head>`에 작성

```html
<title>웹 장기 - 브라우저에서 두는 장기 | iseohyun</title>
<meta name="description" content="설치 없이 브라우저에서 두는 장기. AI 대전, 친구 대국, 기보 저장을 지원합니다.">
```

- title
  - 검색 결과의 파란 제목으로 표시
  - 핵심 단어를 앞에 배치
  - 한국어 기준 30자 안팎 권장, 길면 잘림
  - 페이지마다 다르게 작성: 같은 제목이 많으면 검색엔진이 중복 페이지로 판단
  - 형식 예: `페이지 이름 - 한 줄 설명 | 사이트 이름`
- description
  - 검색 결과의 제목 아래 회색 설명으로 표시
  - 한국어 기준 80자 안팎 권장
  - 무엇을 할 수 있는지 문장으로 작성, 키워드 나열 금지
  - 검색엔진이 본문에서 골라 대신 쓰기도 함
- `keywords` 메타 태그는 Google·Bing이 무시, 작성 불필요

## 그 밖의 head 태그

```html
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="canonical" href="https://xxxx.iseohyun.com/">
</head>
```

- `lang="ko"`: 페이지 언어 알림, 한국어 검색 결과에 유리
- `charset="utf-8"`: 한글 깨짐 방지
- `viewport`: 모바일 화면 대응, 없으면 모바일 검색 순위 불리
- `canonical`: 대표 주소 지정
  - 같은 페이지가 여러 주소로 열릴 때 필요 (`iseohyun.github.io/xxxx/`와 `xxxx.iseohyun.com`)
  - 검색 결과에 대표 주소만 노출
- 검색에서 빼고 싶은 페이지(관리자, 테스트 화면)

```html
<meta name="robots" content="noindex">
```

## OG 태그와 공유 미리보기

- OG(Open Graph): 카카오톡·페이스북·디스코드·슬랙 등에 링크를 붙였을 때의 미리보기 카드

```html
<meta property="og:type" content="website">
<meta property="og:url" content="https://xxxx.iseohyun.com/">
<meta property="og:title" content="웹 장기">
<meta property="og:description" content="설치 없이 브라우저에서 두는 장기">
<meta property="og:image" content="https://xxxx.iseohyun.com/og.png">
<meta property="og:locale" content="ko_KR">
<meta name="twitter:card" content="summary_large_image">
```

- `og:image`
  - 크기 1200×630 권장 (가로:세로 약 1.91:1)
  - 반드시 `https://`로 시작하는 전체 주소, 상대 경로 불가
  - 글자는 가운데에 크게: 서비스마다 가장자리를 잘라 보여 줌
- `twitter:card`: X(트위터)용, 없으면 OG 태그를 대신 사용
- 해시 경로(`#/...`)의 화면마다 미리보기를 다르게 줄 수 없는 문제와 대안: 6장 "공유"
- 미리보기 캐시 초기화: 태그를 고쳐도 예전 카드가 계속 보일 때
  - 카카오톡: [카카오 공유 디버거](https://developers.kakao.com/tool/debugger/sharing)에 주소 작성 → 캐시 초기화 클릭
  - 페이스북: [Sharing Debugger](https://developers.facebook.com/tools/debug/)에서 다시 가져오기 클릭

## 파비콘

- 브라우저 탭, 북마크, 검색 결과 옆에 표시되는 아이콘

```html
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

| 파일 | 크기 | 용도 |
| --- | --- | --- |
| `favicon.ico` | 32×32 | 오래된 브라우저, 검색 결과 |
| `icon.svg` | 벡터 | 최신 브라우저, 다크 모드 대응 가능 |
| `apple-touch-icon.png` | 180×180 | iPhone 홈 화면 |
| `icon-192.png`, `icon-512.png` | 192, 512 | PWA 설치 아이콘 (6장) |

- Google 검색 결과의 아이콘: 48×48의 배수 크기 권장
- 사이트 루트(`/favicon.ico`)에 두면 태그 없이도 찾음

## sitemap.xml

- 검색엔진에 "이 주소들을 수집해 달라"고 알리는 목록
- 사이트 루트에 작성: `https://xxxx.iseohyun.com/sitemap.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://xxxx.iseohyun.com/</loc>
    <lastmod>2026-11-21</lastmod>
  </url>
  <url>
    <loc>https://xxxx.iseohyun.com/rules/</loc>
    <lastmod>2026-11-20</lastmod>
  </url>
</urlset>
```

- `loc`: 전체 주소, canonical과 같은 주소 사용
- `lastmod`: 마지막 수정일, 실제로 바뀐 날만 갱신
- 한 파일에 최대 50,000개 주소, 50MB
- `#` 주소는 넣어도 효과 없음 (해시 경로의 한계)
- 페이지가 많으면 빌드 때 자동 생성 권장
- 페이지가 한 장인 서비스는 생략 가능, 그래도 등록해 두면 수집이 빠름

## robots.txt

- 검색 로봇에게 수집해도 되는 범위를 알리는 파일
- 사이트 루트에 작성: `https://xxxx.iseohyun.com/robots.txt`

```
User-agent: *
Allow: /
Disallow: /admin/

Sitemap: https://xxxx.iseohyun.com/sitemap.xml
```

- `User-agent: *`: 모든 로봇에게 적용
- `Disallow`: 수집하지 말 경로
- `Sitemap`: sitemap 위치 알림, 등록하지 않은 검색엔진도 찾아감
- 주의
  - `Disallow`는 수집 금지일 뿐 색인 금지가 아님: 다른 곳에 링크되면 주소만 노출될 수 있음
  - 검색에서 확실히 빼려면 `<meta name="robots" content="noindex">` 사용
  - 공개 파일이므로 숨길 경로를 적으면 오히려 알려 주는 셈
- 서브도메인마다 따로 필요: `iseohyun.com/robots.txt`는 `xxxx.iseohyun.com`에 적용되지 않음

## 구조화 데이터

- 페이지가 무엇인지 검색엔진이 알아듣는 형식(JSON-LD)으로 알림
- 검색 결과에 별점, 가격, 사이트 이름 등 추가 정보(리치 결과)가 붙을 수 있음

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "웹 장기",
  "url": "https://xxxx.iseohyun.com/",
  "applicationCategory": "GameApplication",
  "operatingSystem": "Web",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "KRW" }
}
</script>
```

- 종류: 웹 앱은 `WebApplication`, 사이트 대표 페이지는 `WebSite`, 글은 `Article`
- 확인: [리치 결과 테스트](https://search.google.com/test/rich-results)에 주소 작성 → 오류 확인
- 필수는 아님, 기본기를 마친 뒤 추가

## 페이지 품질

- 속도와 화면 안정성: Google의 Core Web Vitals

| 지표 | 뜻 | 좋은 기준 |
| --- | --- | --- |
| LCP | 가장 큰 내용이 보일 때까지 걸린 시간 | 2.5초 이하 |
| INP | 클릭·입력에 반응하기까지 걸린 시간 | 200ms 이하 |
| CLS | 로딩 중 화면이 밀리는 정도 | 0.1 이하 |

- 측정: [PageSpeed Insights](https://pagespeed.web.dev/)에 주소 작성 → 모바일·데스크톱 점수 확인
- 자주 하는 개선
  - 이미지는 WebP·AVIF로 압축, `width`·`height` 작성 (화면 밀림 방지)
  - 화면 아래쪽 이미지는 `loading="lazy"`
  - 쓰지 않는 자바스크립트·CSS 제거
- 본문 구조
  - 페이지당 `<h1>` 하나, 그 아래 `<h2>`·`<h3>` 순서대로
  - `<header>`, `<main>`, `<nav>`, `<footer>` 같은 의미 있는 태그 사용
  - 이미지에 `alt` 작성: 이미지 검색 노출, 화면 낭독기 지원
  - 링크 글자는 "여기"보다 내용이 드러나게 작성

# 검색엔진 등록

## 등록 전 확인

- `https://xxxx.iseohyun.com/robots.txt`, `/sitemap.xml`이 브라우저에서 열리는지 확인
- 페이지 소스 보기(Ctrl + U)로 title·description·OG 태그 확인
- 검색엔진별 소유 확인 방법

| 검색엔진 | 소유 확인 방법 | 비용 |
| --- | --- | --- |
| Google | DNS TXT 레코드, HTML 파일, 메타 태그 | 무료 |
| Bing | Google Search Console 가져오기, DNS, HTML 파일, 메타 태그 | 무료 |
| 네이버 (국내) | HTML 파일, 메타 태그 | 무료 |
| 다음 (국내) | `robots.txt`에 PIN 코드 작성 | 무료 |

- HTML 파일·메타 태그 방식은 배포가 필요하므로, 저장소에 추가 → push → 배포 확인 후 인증 클릭

## Google Search Console

- Google은 등록하지 않아도 링크를 따라 자동 수집, 등록하면 빨라지고 상태를 볼 수 있음
- [Search Console](https://search.google.com/search-console) 접속 → Google 계정 로그인 [`직접`](intro.md)
- 속성 추가: 두 가지 유형

| 유형 | 입력 | 범위 | 소유 확인 |
| --- | --- | --- | --- |
| 도메인 | `iseohyun.com` | 모든 서브도메인, http·https 전부 | DNS TXT 레코드만 가능 |
| URL 접두어 | `https://xxxx.iseohyun.com/` | 그 주소로 시작하는 페이지만 | HTML 파일, 메타 태그, GA 등 |

- 도메인 속성 권장: 서브도메인 서비스를 새로 열 때마다 다시 등록할 필요 없음
- 도메인 속성 소유 확인
  - 안내된 TXT 값(`google-site-verification=...`) 복사
  - 도메인 업체 DNS 관리 화면에서 TXT 레코드 추가 (호스트 `@`) [`직접`](intro.md)
  - Search Console로 돌아와 **확인** 클릭, DNS 반영까지 몇 분 ~ 하루
- URL 접두어 속성 소유 확인 (DNS를 만질 수 없을 때)
  - 오른쪽 **URL 접두어**에 `https://xxxx.iseohyun.com/` 작성 → **계속** 클릭
  - 확인 방법 중 **HTML 태그** 선택 → 안내된 태그 복사

```html
<meta name="google-site-verification" content="발급받은 고유 코드">
```

  - `index.html`의 `<head>`에 추가 → push → 배포 확인
  - Search Console로 돌아와 **확인** 클릭
  - 인증 후에도 태그는 지우지 않음: 지우면 소유 확인이 풀림
- 배포를 다른 사람이 맡고 있을 때 (지인·회사 사이트)
  - 네이버(`naver-site-verification`)와 Google 메타 태그를 한 번에 모아 전달
  - 요청 내용: "`index.html`의 `<head>`에 아래 태그 두 줄 추가 후 배포"
  - 배포 완료 연락을 받은 뒤 각 검색엔진에서 **확인** 클릭
  - sitemap 파일이 없으면 함께 요청
- sitemap 제출
  - 왼쪽 메뉴 **Sitemaps** 클릭 → **새 사이트맵 추가**에 `sitemap.xml` 작성 → **제출** 클릭
  - URL 접두어 속성이면 앞 주소가 자동으로 붙음, 도메인 속성이면 전체 주소 `https://xxxx.iseohyun.com/sitemap.xml` 작성
  - 상태가 "성공"이면 완료
- 새 페이지 빨리 알리기
  - 위쪽 검색창에 주소 작성 → **URL 검사**
  - "URL이 Google에 등록되어 있지 않음"이면 **색인 생성 요청** 클릭
- 주기적으로 볼 화면
  - 페이지(색인 생성): 색인된 페이지 수, 제외된 이유
  - 실적: 검색어별 노출 수, 클릭 수, 평균 순위
  - 페이지 경험·Core Web Vitals: 느린 페이지 목록

## Bing Webmaster Tools

- Bing 색인은 Bing 외에도 DuckDuckGo, Yahoo, ChatGPT 검색 등에서 사용
- [Bing Webmaster Tools](https://www.bing.com/webmasters) 접속 → Microsoft·Google 계정 로그인 [`직접`](intro.md)
- 가장 쉬운 방법: **Google Search Console에서 가져오기** 클릭
  - 소유 확인과 sitemap이 함께 넘어옴
- 직접 추가: 사이트 주소 작성 → DNS·HTML 파일·메타 태그 중 하나로 소유 확인 → **Sitemaps** 메뉴에서 sitemap 제출
- **IndexNow**: 페이지가 바뀔 때 검색엔진에 바로 알리는 방식
  - Bing, 네이버, Yandex 등이 지원
  - 사이트 루트에 키 파일을 두고, 바뀐 주소를 API로 전송
  - 자주 바뀌는 사이트(크롤링 결과 페이지 등)에 유용, 7장 자동화와 연결 가능
- **URL 검사**, **URL 제출** 메뉴: Google의 색인 생성 요청과 같은 역할

## 네이버 서치어드바이저

- 국내 검색 점유율이 높아 국내 사용자 대상이면 필수
- 네이버는 등록하지 않으면 수집이 매우 느림
- [네이버 서치어드바이저](https://searchadvisor.naver.com/) 접속 → 네이버 로그인 [`직접`](intro.md)
- 사이트 등록
  - **웹마스터 도구** 클릭 → 사이트 주소 `https://xxxx.iseohyun.com` 작성 → 추가 클릭
  - 서브도메인은 사이트마다 따로 등록
- 소유 확인 (둘 중 하나)
  - HTML 파일: 안내된 `naverXXXX.html` 파일을 내려받아 사이트 루트에 추가 → push → 배포 확인
  - 메타 태그: `<meta name="naver-site-verification" content="...">`를 `<head>`에 추가 → push → 배포 확인
  - **소유확인** 클릭 [`직접`](intro.md)
- 등록 후 설정 (사이트 클릭 → 왼쪽 메뉴)
  - **요청 → 사이트맵 제출**: `https://xxxx.iseohyun.com/sitemap.xml` 작성 → 확인
  - **요청 → RSS 제출**: 블로그·소식 페이지가 있으면 RSS 주소 작성
  - **요청 → 웹 페이지 수집**: 새 페이지 주소를 직접 작성해 수집 요청
- 진단 화면
  - **검증 → robots.txt**: 네이버 로봇(Yeti)이 막혀 있지 않은지 확인
  - **리포트 → 검색 노출**: 노출·클릭 추이
  - **진단 → 사이트 최적화**: title·description·OG 태그 누락 점검
- 노출까지 며칠 ~ 몇 주, 기다리는 동안 수집 요청을 반복할 필요 없음

## 다음 웹마스터도구

- [다음 웹마스터도구](https://webmaster.daum.net/) 접속 → 카카오 계정 로그인 [`직접`](intro.md)
- 사이트 등록
  - 사이트 주소 `https://xxxx.iseohyun.com` 작성
  - 웹마스터도구용 PIN 코드 발급
- 소유 확인: `robots.txt`에 PIN 코드 한 줄 추가 → push → 배포 확인 → 확인 클릭

```
#DaumWebMasterTool:발급받은PIN코드
User-agent: *
Allow: /

Sitemap: https://xxxx.iseohyun.com/sitemap.xml
```

- PIN 코드 줄은 `#`으로 시작하므로 다른 로봇에는 영향 없음
- 등록 후 **수집 요청**, **사이트맵 제출** 메뉴 사용
- 다음 검색은 카카오톡 안 검색(샵 검색)에도 연결

## 노출 확인

- 검색창에 `site:xxxx.iseohyun.com` 작성: 색인된 페이지 목록
  - Google, Bing, 네이버, 다음 모두 지원
  - 결과가 없으면 아직 색인 전
- 서비스 이름으로 직접 검색: 순위 확인
- 색인까지 걸리는 시간
  - Google: 며칠 (색인 생성 요청 시 더 빠름)
  - Bing: 며칠 ~ 2주
  - 네이버·다음: 1주 ~ 몇 주
- 색인이 안 될 때 점검 순서
  - `robots.txt`가 막고 있지 않은지
  - `noindex` 메타 태그가 남아 있지 않은지 (테스트 때 넣고 잊은 경우)
  - canonical이 다른 주소를 가리키지 않는지
  - 본문이 자바스크립트로만 그려져 비어 보이지 않는지
  - 각 검색엔진의 URL 검사 화면에서 원인 확인

## AI 검색 대응

- ChatGPT, Perplexity, Google AI 개요 등도 검색 색인을 바탕으로 답변
- 기본기(title, description, 본문 텍스트, Bing 등록)를 갖추면 AI 검색에도 노출
- AI 학습용 수집을 막고 싶을 때 `robots.txt`에 추가

```
User-agent: GPTBot
Disallow: /

User-agent: Google-Extended
Disallow: /
```

- `GPTBot`: OpenAI 학습용 수집 로봇
- `Google-Extended`: Google AI 학습용 표시, 막아도 Google 검색 노출에는 영향 없음
- 막을지 여부는 서비스 성격에 따라 결정: 알려지는 것이 목적이면 열어 두기
