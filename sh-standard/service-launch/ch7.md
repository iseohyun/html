2026-11-21 작성

- 목표: 서비스를 연 뒤 누가 오는지, 무엇이 고장 났는지, 돈이 얼마나 드는지 알고, 반복 작업은 자동으로 돌리기
- 다루는 것: 방문 통계, 오류 수집, 비용과 한도, 자동 크롤링, 꾸준한 유지보수
- 실제 사례: `iseohyun.com`의 숨은 진단 정보, KoreaEvent·KoreaIssue의 매일 자동 수집

# 방문 통계

## 무엇을 알고 싶은가

- 통계 도구를 고르기 전에 질문부터
  - 하루에 몇 명이 오나 (방문자 수, 추이)
  - 어디서 오나 (검색, 카카오톡 공유, 직접 입력)
  - 어떤 화면을 많이 보나, 어디서 나가나
  - 휴대폰과 PC 비율, 브라우저 종류
- 개인을 식별할 필요는 대부분 없음: "누가"가 아니라 "몇 명이, 어디서"
- 검색어별 노출·클릭은 통계 도구가 아니라 검색엔진 도구에서 봄 (2장 Search Console, 서치어드바이저)

## 도구 비교

| 도구 | 쿠키 | 비용 | 장점 | 단점 |
| --- | --- | --- | --- | --- |
| Google Analytics 4 | 사용 | 무료 | 가장 자세함, 사용자 흐름·이벤트 분석 | 설정이 복잡, 해외 사용자 동의 배너 필요 |
| Cloudflare Web Analytics | 사용 안 함 | 무료 | 스크립트 한 줄, 개인정보 부담 적음 | 지표가 단순 (방문, 페이지, 출처, 기기) |
| GoatCounter, Umami | 사용 안 함 | 무료 또는 직접 설치 | 가볍고 개인정보 친화적 | 기능이 단순, 직접 설치는 서버 필요 |
| Firebase Analytics | 사용 | 무료 | Firebase와 같은 콘솔 | 사실상 GA4와 같음 |

- 소규모 서비스의 시작점: 쿠키 없는 도구 (4장의 쿠키 문제를 피함)
- 이벤트 분석(버튼 클릭, 완료율)이 필요해지면 GA4 검토

## Cloudflare Web Analytics 설정

- [Cloudflare 대시보드](https://dash.cloudflare.com/) 가입 → **Analytics & Logs → Web Analytics** 클릭 [`직접`](intro.md)
- **Add a site** 클릭 → `xxxx.iseohyun.com` 작성
- 안내된 스크립트를 `<head>`나 `</body>` 앞에 추가

```html
<script defer src="https://static.cloudflareinsights.com/beacon.min.js"
  data-cf-beacon='{"token": "발급받은_토큰"}'></script>
```

- 도메인 DNS가 Cloudflare에 없어도 사용 가능 (GitHub Pages 그대로)
- 토큰은 공개 값: 화면 코드에 넣어도 됨
- 하루 이틀 뒤 대시보드에서 방문 수, 인기 페이지, 출처(Referer), 국가, 기기 확인

## GA4 설정

- [Google 애널리틱스](https://analytics.google.com/) → **관리 → 만들기 → 속성** → 이름·시간대(대한민국)·통화 선택 [`직접`](intro.md)
- **데이터 스트림 → 웹** → 주소 작성 → 측정 ID(`G-XXXXXXX`) 발급
- 안내된 `gtag.js` 코드를 모든 페이지의 `<head>`에 추가
- SPA는 화면이 바뀔 때 직접 페이지뷰 전송: 주소가 바뀌어도 페이지를 새로 불러오지 않기 때문

```js
window.addEventListener("hashchange", () => {
  gtag("event", "page_view", { page_location: location.href, page_title: document.title });
});
```

- 데이터 보관 기간: 기본 2개월 → **관리 → 데이터 설정 → 데이터 보존**에서 조정
- IP 익명화는 GA4에서 기본 적용

## 개인정보와 동의

- 개인정보처리방침(3장)에 통계 도구 이름과 수집 항목 작성
- 쿠키를 쓰는 도구(GA4)
  - 유럽 사용자 대상이면 사전 동의 배너 필요
  - 국내만 대상이어도 방침에 쿠키 사용과 거부 방법 안내
- 통계에 개인정보를 보내지 않기
  - 사용자 ID, 메일, 이름을 이벤트 값에 넣지 않음
  - 주소(쿼리)에 개인정보가 있으면 그대로 통계에 남음 (6장 "넣지 말 것")
- 관리자 본인 방문은 빼고 보기: 필터 설정 또는 관리자 기기에서 스크립트 끄기

# 오류 수집

## 왜 필요한가

- 사용자 화면에서 난 오류는 내 컴퓨터에 보이지 않음
- 대부분의 사용자는 오류를 알려 주지 않고 그냥 떠남
- 브라우저·기기·인앱 브라우저마다 다른 오류가 남 (예: 카카오톡 안에서만 로그인 실패, 3장)
- 서버가 없으니 서버 로그도 없음 (4장 모니터링)

## 가볍게 시작: 숨은 진단 정보 (iseohyun.com의 방식)

- 페이지에서 난 최근 오류를 몇 개만 기억했다가, 사용자가 문의를 보낼 때 함께 전송
- 모으는 오류
  - `console.error`, `console.warn`
  - 잡히지 않은 오류 (`window.onerror`)
  - 처리되지 않은 Promise 거절 (`unhandledrejection`)

```js
const entries = [];
function record(kind, message) {
  entries.push({ kind, message: String(message).slice(0, 400), at: new Date().toISOString() });
  if (entries.length > 12) entries.shift();
}
window.addEventListener("error", (e) => record("error", e.message));
window.addEventListener("unhandledrejection", (e) => record("promise", e.reason && e.reason.message));
```

- 문의할 때 `entries`와 환경(브라우저, 화면 크기, 빌드 표시)을 함께 보내고, 보낸 뒤 비우기
- 화면에는 보이지 않고 관리자만 펼쳐 봄 (5장 문의 대화의 "진단")
- 장점: 비용 0원, 외부 서비스 없음, 사용자가 문의할 때만 전송
- 한계: 문의하지 않은 사용자의 오류는 모름
- 다른 모듈보다 먼저 불러와야 처음부터 오류를 모음

## Sentry

- 사용자 화면의 오류를 자동으로 모아 주는 서비스
- [sentry.io](https://sentry.io/) 가입 → **Create Project** → 플랫폼 **Browser JavaScript** 선택 [`직접`](intro.md)
- 발급된 DSN(오류를 보낼 주소)을 코드에 추가: 공개 값이라 화면 코드에 넣어도 됨

```html
<script src="https://browser.sentry-cdn.com/버전/bundle.min.js" crossorigin="anonymous"></script>
<script>
  Sentry.init({
    dsn: "https://...@sentry.io/...",
    release: window.SiteVersion,   // 6장의 빌드 표시
    sendDefaultPii: false,         // IP·쿠키 같은 개인정보 보내지 않기
    sampleRate: 1.0
  });
</script>
```

- `release`에 빌드 표시를 넣으면 "어느 배포본에서 난 오류인지" 바로 구분
- 빌드가 있는 프로젝트는 소스 맵을 올려야 원래 코드 줄 번호가 보임
- 알림: 새 오류가 처음 나면 메일, 같은 오류가 급증하면 알림
- 무료 한도(월 오류 수)를 넘지 않게
  - 같은 오류 반복은 묶어서 하나로 셈
  - 확장 프로그램·광고 차단기에서 나는 잡음 오류는 무시 목록에 추가
- 오류 메시지에 입력값·토큰·메일이 섞이지 않게 주의, 방침(3장)에 오류 수집 도구 작성

## 오류를 알게 된 뒤

- 재현에 필요한 정보: 빌드 표시, 브라우저·기기, 보던 화면 주소, 직전 동작
- 고친 뒤 빌드 표시를 올려 배포 → 같은 오류가 새 빌드에서 다시 나는지 확인
- 자주 나는 오류는 사용자에게 보이는 안내로 바꾸기 (예: "카카오톡 안에서는 로그인할 수 없어요. 외부 브라우저로 열어 주세요")

# 비용과 한도

## 무엇에 돈이 드나

| 항목 | 무료 범위 | 넘으면 | 확인할 곳 |
| --- | --- | --- | --- |
| GitHub Pages | 저장소 1GB 안팎, 월 전송량 100GB 안팎 (권장 한도) | 안내 메일, 심하면 제한 | GitHub 공식 문서 |
| GitHub Actions | 공개 저장소는 무료 | 비공개 저장소는 월 분 단위 한도 | 저장소 Settings → Billing |
| Firestore | 하루 읽기 5만, 쓰기 2만 건 등 (4장) | Blaze 요금제에서 과금 | Firebase 콘솔 → 사용량 |
| Cloud Functions | 월 호출·실행 시간 무료 범위 | 과금 | Firebase 콘솔 → Functions |
| 메일 (Web3Forms, Resend) | 월 전송 수 무료 범위 (5장) | 유료 요금제 | 각 서비스 대시보드 |
| 도메인 | 없음 | 연 단위 갱신비 (1장) | 도메인 업체 |
| Apple 개발자 멤버십 | 없음 | 연간 비용 (3장 Apple 로그인) | Apple Developer |

- 무료 범위의 정확한 값은 자주 바뀜: 각 요금표에서 확인
- 개인 서비스는 대부분 0원 ~ 몇 천 원, 위험은 "갑자기 늘어나는 경우"

## Blaze 요금제와 예산 알림

- Firebase의 Cloud Functions, 백업, 일부 기능은 Blaze(종량제) 요금제 필요 (3장, 4장)
- Blaze로 올리는 날 바로 예산 알림 설정
- 설정 순서
  - [Google Cloud 콘솔](https://console.cloud.google.com/billing) → **결제** → 결제 계정 선택 [`직접`](intro.md)
  - **예산 및 알림** → **예산 만들기** 클릭
  - 범위: 프로젝트 `xxxx` 선택
  - 금액: 월 1만 원처럼 "넘으면 이상하다" 싶은 금액
  - 알림 기준: 50%, 90%, 100% (실제 금액 기준), 필요하면 예상 금액 기준도 추가
  - 받는 사람: 결제 관리자 메일
- 예산 알림은 **알리기만 하고 멈추지 않음**
  - 알림을 받은 뒤 원인(4장 모니터링: 사용량 급증, 규칙 거부, App Check 지표) 확인
- 자동으로 멈추기 (선택)
  - 예산 알림을 Pub/Sub로 보내고, Cloud Function이 받아 프로젝트의 결제를 끊는 구성
  - 결제가 끊기면 서비스 전체가 멈추므로 개인 서비스에서만, 시험 후 사용

## 비용이 터지는 흔한 원인

- `limit` 없는 쿼리, 해제하지 않은 `onSnapshot` (4장)
- 화면이 무한 반복으로 같은 문서를 계속 읽는 버그
- 열린 보안 규칙을 노린 자동 프로그램의 대량 쓰기 (4장)
- 서버 함수가 자기 자신을 다시 깨우는 구조 (문서를 고치면 다시 실행되는 트리거)
- 대처: 예산 알림 → 사용량 그래프에서 급증한 시점 확인 → 그 시점의 배포·규칙 변경 확인

# 자동 크롤링

## 구조

- 외부 사이트의 소식·일정을 매일 모아 정적 JSON 파일로 저장하고, 사용자는 그 파일만 읽음
- 서버도, 온라인 DB도 필요 없음 (4장 "자동으로 만드는 정적 파일")
- 흐름
  - GitHub Actions 예약 실행 (매일 정해진 시각)
  - 수집 스크립트 실행 → 결과를 `public/data/` 같은 폴더의 JSON으로 저장
  - 바뀐 내용이 있으면 커밋·push
  - 배포 워크플로가 이어서 실행 → 사이트에 새 데이터 반영
- 실제 사례
  - KoreaEvent: 지자체·체육 행사 일정을 매일 자정(한국 시간) 수집
  - KoreaIssue: 이슈 요약을 하루 두 번(오전 7시, 오후 7시) 수집

## 워크플로 작성

```yaml
# .github/workflows/daily-crawl.yml
name: Daily Crawler
on:
  schedule:
    - cron: '0 15 * * *'   # UTC 15:00 = 한국 시간 자정
  workflow_dispatch:         # Actions 탭에서 수동 실행
permissions:
  contents: write
jobs:
  crawl:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run crawl
        env:
          API_KEY: ${{ secrets.API_KEY }}
      - name: 바뀐 데이터만 커밋
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add public/data/
          if git diff --staged --quiet; then
            echo "변경 없음"
          else
            git commit -m "chore(data): daily crawl [$(date -u +'%Y-%m-%d')]"
            git push
          fi
```

- `permissions: contents: write`: 워크플로가 저장소에 커밋할 권한
- `workflow_dispatch`: 고친 뒤 바로 시험해 볼 수 있게 수동 실행 버튼
- 바뀐 내용이 없으면 커밋하지 않기: 의미 없는 커밋이 쌓이지 않게

## cron과 예약 실행의 성질

- cron은 **UTC 기준**: 한국 시간에서 9시간 빼기
  - 한국 자정 → `0 15 * * *`
  - 한국 오전 7시·오후 7시 → `0 22,10 * * *`
- 정확한 시각에 실행되지 않음: GitHub가 붐비면 몇 분 ~ 수십 분 늦어짐, 정각(`0분`)이 특히 붐빔
- 공개 저장소에서 오랫동안 활동이 없으면 예약 실행이 자동으로 꺼질 수 있음: Actions 탭에서 다시 켜기
- 너무 잦은 실행은 피하기: 대상 사이트와 GitHub 모두에 부담

## 크롤러 커밋 뒤 배포 잇기

- 함정: 워크플로가 기본 토큰(`GITHUB_TOKEN`)으로 한 push는 다른 워크플로의 `push` 트리거를 깨우지 않음
  - 무한 반복을 막기 위한 GitHub의 규칙
  - 결과: 데이터는 커밋됐는데 사이트에는 반영되지 않음
- 해결 (KoreaEvent의 방식): 배포 워크플로에 `workflow_run` 트리거 추가

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]
  workflow_dispatch:
  workflow_run:
    workflows: ['Daily Crawler']
    types: [completed]
    branches: [main]
jobs:
  build:
    # 크롤러가 실패한 경우에는 배포하지 않음
    if: github.event_name != 'workflow_run' || github.event.workflow_run.conclusion == 'success'
```

- `workflows`의 이름은 크롤러 워크플로의 `name`과 글자 하나까지 같게
- 크롤러가 실패하면 배포하지 않음: 깨진 데이터가 사이트에 올라가지 않게

## 비밀값

- 공공데이터 API 키 같은 값은 저장소 **Settings → Secrets and variables → Actions → New repository secret**에 저장 [`직접`](intro.md)
- 워크플로에서 `${{ secrets.API_KEY }}`로 사용, 로그에는 자동으로 가려짐
- 스크립트에서 키를 `console.log`로 찍지 않기
- 수집 결과 JSON에 키나 요청 주소(키가 포함된)를 넣지 않기: 공개 저장소에 그대로 노출

## 예의와 법

- 공식 API가 있으면 API 우선: 공공데이터포털 등은 키를 받아 정해진 방식으로 사용
- 대상 사이트의 이용약관과 `robots.txt` 확인 (2장): 수집을 금지한 곳은 수집하지 않음
- 문장 끝의 [`직접`](intro.md) 배지: 계정 가입·결제·비밀값 입력처럼 에이전트에게 맡기지 말고 직접 해야 하는 일, 누르면 개론의 정리로 이동
- 요청 간격 두기: 페이지마다 1초 이상 쉬기, 한 번에 많은 페이지를 동시에 요청하지 않기
- 내 수집기임을 밝히는 User-Agent 사용 (예: `xxxx-crawler (+https://xxxx.iseohyun.com)`)
- 저작권
  - 제목·날짜·장소·원문 링크 같은 사실 정보 위주로 저장
  - 기사·글 본문을 통째로 복사해 다시 게시하지 않기, 요약과 원문 링크로
- 개인정보: 담당자 이름·전화번호 같은 정보는 꼭 필요할 때만, 필요 없으면 버리기

## 실패에 대비하기

- 실패 알림: GitHub 계정 **Settings → Notifications → Actions**에서 실패 메일 받기
- 일부 실패 허용: 대상 사이트 하나가 바뀌어도 전체가 멈추지 않게 사이트별로 나눠 처리
- 체크포인트: 어디까지 수집했는지 기록해 두고 다음 실행에서 이어 가기 (KoreaEvent의 `crawl-checkpoint-manager`)
- 결과 검증: 개수가 갑자기 0개가 되거나 절반 이하로 줄면 커밋하지 않고 실패 처리
- 화면에 "마지막 갱신 시각" 표시: 수집이 멈춘 것을 사용자도, 나도 바로 알아챔

# 꾸준한 유지보수

## 의존성과 보안 업데이트

- GitHub **Settings → Code security → Dependabot alerts** 켜기: 쓰는 패키지에 알려진 취약점이 생기면 알림
- **Dependabot version updates**: 패키지 새 판을 PR로 자동 제안 (`.github/dependabot.yml`)
- 외부 스크립트(CDN)는 판 번호를 고정해 불러오기: 예고 없이 바뀌지 않게
- 외부 코드를 새로 넣을 때의 라이선스 확인과 고지: 1장 "외부 코드와 라이선스"
- Firebase SDK, Node.js 런타임(Cloud Functions)의 지원 종료 일정 확인: 지원이 끝난 런타임은 배포가 막힘

## 만료되는 것들

- 도메인: 자동 갱신 켜기, 결제 수단 만료 확인 (도메인이 끊기면 모든 서비스가 멈춤)
- 카카오·네이버 Client Secret, API 키: 재발급 주기·만료일이 있으면 기록
- Apple 개발자 멤버십: 연간 갱신
- 인증서: GitHub Pages가 자동 갱신, DNS가 바뀌면 다시 확인

## 기록 남기기

- 설정한 콘솔, 계정, 비밀값 이름(값은 제외), 요금제를 저장소 문서에 기록
  - 예: `docs/online-setup.md`처럼 "처음부터 다시 만든다면 할 일 순서"
- 몇 달 뒤의 나, AI 도구, 다른 사람이 같은 순서로 다시 세울 수 있게
- 바뀐 것은 CHANGELOG(1장)와 릴리즈(6장)에
