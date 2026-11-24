2026-11-21 작성

- 목표: 내 컴퓨터의 코드를 정리된 규칙으로 관리해 GitHub에 올리고 `https://xxxx.iseohyun.com` 주소로 공개
- 다루는 것: 소스 코드 공개, 코드 관리, 외부 코드와 라이선스, 호스팅
- 예시: 프로젝트 이름 `xxxx`, GitHub 계정 `iseohyun`

# 소스 코드 공개

## GitHub 가입

- [github.com/signup](https://github.com/signup)에서 회원가입 [`직접`](intro.md)
- 사용자 이름(username)은 신중히 결정
  - 저장소 주소 `github.com/iseohyun/...`에 사용
  - 기본 배포 주소 `iseohyun.github.io`에 사용
- Settings → Password and authentication: 2단계 인증(2FA), 코드 업로드 계정은 필수 [`직접`](intro.md)

## 저장소(repository) 생성

- 오른쪽 위 **+ → New repository** 클릭
- Repository name: 프로젝트 이름 작성
  - 영어 소문자와 하이픈(`-`)만 사용 권장 (예: `janggi`, `korea-event`)
  - 배포 주소 `iseohyun.github.io/xxxx/`, 서브도메인 `xxxx.iseohyun.com`의 기본값
- **Public** 선택: 무료 계정의 GitHub Pages 배포 조건
- README, `.gitignore`, 라이선스는 선택하지 않음: 로컬 코드를 올릴 때 충돌 방지
- 저장소 첫 화면 오른쪽 **About** 옆 톱니바퀴 클릭 → 검색용 정보 작성

| 항목 | 위치 | 작성법 |
| --- | --- | --- |
| Description | About 창 | 무엇을 하는 서비스인지 한 문장 (예: 브라우저에서 두는 장기, AI 대전) |
| Website | About 창 | 서비스 주소, 배포 후 작성 |
| Topics | About 창 | 검색용 태그 (예: `janggi`, `board-game`, `pwa`, `firebase`) |
| Keywords | `package.json`의 `"keywords"` | npm 패키지용, 웹 앱은 Topics와 같게 작성 |

## 로컬 저장소 생성과 코드 작업

- 프로젝트 폴더 생성, git 초기화

```powershell
mkdir xxxx
cd xxxx
git init -b main
```

- `.gitignore` 먼저 작성: 한 번 커밋된 파일은 지워도 이력에 남음

```
node_modules/
dist/
.env
.env.*
```

- 코드 작업 후 첫 커밋

```powershell
git add .
git commit -m "feat: 첫 화면"
```

## 원격 저장소 연결

- SSH 키 생성 (처음 한 번)

```powershell
ssh-keygen -t ed25519 -C "내 메일 주소"
```

- 공개 키 `~/.ssh/id_ed25519.pub` 내용 복사
  - `.pub`이 없는 파일은 개인 키, 절대 공유 금지
- GitHub Settings → SSH and GPG keys → **New SSH key** 클릭 → 붙여 넣기 [`직접`](intro.md)
- 연결 확인: `Hi iseohyun! You've successfully authenticated` 출력 시 성공

```powershell
ssh -T git@github.com
```

- remote 등록과 push

```powershell
git remote add origin git@github.com:iseohyun/xxxx.git
git push -u origin main
```

- `origin`: 원격 저장소의 별명
- `-u`: 이후 `git push`만으로 `origin main`에 전송
- 확인: `git remote -v`
- SSH 대신 `https://github.com/iseohyun/xxxx.git` 주소도 가능: 첫 push 때 브라우저 로그인

## README.md와 CHANGELOG.md

- README.md: 저장소 첫 화면의 소개 글, 작성 순서
  - 한 줄 소개와 서비스 주소
  - 화면 한 장
  - 주요 기능
  - 실행 방법 (`npm install`, `npm run dev`)
  - 사용 기술, 라이선스
- CHANGELOG.md: 버전별 변경 기록, [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/) 형식

| 분류 | 뜻 | 예 |
| --- | --- | --- |
| Added | 새 기능 | 카카오 로그인 추가 |
| Changed | 기존 동작 변경 | 리더보드를 주간 기준으로 변경 |
| Fixed | 버그 수정 | 새로고침 시 로그인 풀림 수정 |
| Removed | 기능 삭제 | 옛 게스트 모드 삭제 |

```markdown
## [1.2.0] - 2026-11-21
### Added
- 카카오 로그인
### Fixed
- 새로고침하면 로그인이 풀리던 문제
```

- 최신 버전을 위에 작성
- 날짜는 `YYYY-MM-DD`
- 커밋 메시지 복사 금지, 사용자가 알아야 할 변화만 작성
- 버전 규칙: `MAJOR.MINOR.PATCH`, [유의적 버전(SemVer)](https://semver.org/lang/ko/)

| 자리 | 올리는 때 | 예 |
| --- | --- | --- |
| MAJOR | 이전과 호환되지 않는 변화 (저장 데이터 형식 변경 등) | `1.4.2` → `2.0.0` |
| MINOR | 기능 추가 (Added 위주) | `1.4.2` → `1.5.0` |
| PATCH | 버그 수정 (Fixed 위주) | `1.4.2` → `1.4.3` |

- 윗자리를 올리면 아랫자리는 0
- 정식 공개 전 `0.x.x`, 공개일에 `1.0.0`
- 배포마다 자동으로 바뀌는 빌드 표시(예: `20261121v3`)는 별도 관리: 6장

# 코드 관리

## 프로젝트 규칙 문서

- 혼자 만들어도 규칙은 문서로: 몇 달 뒤의 나, AI 도구, 다른 사람이 같은 방식으로 작업하게
- 무엇을 적나
  - 폴더 구조와 파일 역할
  - CSS 방식 (한 파일에 모으기 / 컴포넌트별 나누기)
  - 버전 규칙 (SemVer, 빌드 표시: 6장)
  - 커밋·배포 규칙 (사용자 확인 후 커밋, 빌드 검사 통과 후 푸시)
  - 건드리면 안 되는 폴더, 비밀값 위치
- 어디에 두나

| 파일 | 읽는 쪽 | 용도 |
| --- | --- | --- |
| `README.md` | 사람 (처음 온 방문자) | 무엇인지, 어떻게 실행하나 |
| `CLAUDE.md`, `AGENTS.md` | AI 코딩 도구 | 작업할 때 지킬 규칙의 입구 |
| `.agents/rules/*.md` | AI 도구, 나 | 주제별 상세 규칙 (구조, 릴리즈, 테스트, 범위 보호) |
| `docs/*.md` | 나, 다른 개발자 | 설정 순서, 설계 결정 (예: `docs/online-setup.md`) |

- 새 프로젝트를 시작할 때 AI 도구에게 먼저 규칙을 묻게 하기: CSS 방식, 버전 관리 방식 같은 결정을 처음에 정하고 문서에 기록
- 규칙과 코드가 어긋나면 둘 중 하나를 바로 고치기: 낡은 규칙은 AI 도구를 잘못된 방향으로 이끎

## 공통 UI 틀 가져오기

- 서비스가 여러 개가 되면 화면 규칙을 하나로 모으기
  - 헤더·설정·목록·달력·지도 같은 화면 부품
  - 색·글자 크기 토큰(`tokens.css`), 아이콘 묶음(`icons.svg`)
  - 단축키, 접근성, 다크 모드 규칙
- 실제 사례
  - WebApp Common GUI: 웹 앱 공통 화면 규칙 (`iseohyun.com/sh-standard/webapp-common-gui/`)
  - QuizApp Common GUI: 퀴즈 앱 공통 화면·순위·Firebase 규칙
- 판 이력으로 관리
  - 공통 규칙이 바뀔 때마다 판 번호(예: `v0.5.8`)와 항목 ID(예: `slide-rate-keys`)를 붙여 `changes.md`에 한 줄씩 기록
  - 각 앱은 어느 판까지 확인했는지 자기 저장소에 기록 (`.agents/rules/common-gui.md`)
- 새 판 받아 오기
  - 앱의 기록 판보다 새로운 항목만 골라 하나씩 결정: 적용 / 적용 안 함 / 보류 / 해당 없음
  - 적용하지 않은 항목이 있어도 확인을 마치면 앱의 기록 판을 지금 판으로 올림
  - 다음에는 그 뒤의 새 항목만 확인 → 몇 판을 건너뛰어도 한 번에 따라잡음
  - 이 과정을 AI 도구의 스킬(예: `common-gui-sync`)로 만들어 두면 "Common GUI 동기화" 한마디로 반복
- 복사가 아니라 규칙을 가져오기
  - 공통 코드를 통째로 복사하면 앱마다 조금씩 달라져 다시 맞추기 어려움
  - 규칙 문서 + 견본 화면을 원본으로 두고, 앱은 규칙에 맞춰 구현

## 브랜치와 커밋

- `main`에 바로 고치지 않기: 작업 브랜치에서 고치고 확인한 뒤 병합
  - 브랜치 배포(1장 호스팅)는 `main`이 곧 공개 사이트, 실수가 바로 사용자에게 보임
- 커밋 메시지 형식: `종류: 무엇을 바꿨나`
  - `feat` 새 기능, `fix` 버그 수정, `docs` 문서, `chore` 잡일(데이터 갱신 등), `refactor` 동작은 같고 구조만 변경
  - 예: `fix: 새로고침하면 로그인이 풀리던 문제`
- 한 커밋에 한 가지 일: 문서 수정과 보안 규칙 변경을 섞지 않기 (되돌릴 때 함께 되돌아감)
- 커밋하면 안 되는 것
  - 비밀값(`.env`, 서비스 계정 키, Client Secret)
  - 빌드 결과물(`dist/`), 패키지 폴더(`node_modules/`)
  - 개인정보가 담긴 시험 데이터 (실제 대화, 연락처)
- 실수로 비밀값을 커밋했다면
  - 지워도 이력에 남음: 그 키는 즉시 폐기·재발급
  - 이력에서 지우는 작업(`git filter-repo` + 강제 푸시)은 되돌릴 수 없으므로 백업 후 신중하게

## 코드 전수 검사

- 기능을 계속 붙이다 보면 쌓이는 것: 비대한 파일, 죽은 코드, 하드코딩된 값, 빠진 오류 처리, 열린 보안 규칙
- 전수 검사: 정해진 기준표로 저장소 전체를 빠짐없이 점검하는 일
- 기준표의 예 ([Full Code Review Checklist](#/engineering/tools/full-code-review-checklist.md))

| 묶음 | 점검 항목 |
| --- | --- |
| 구조 | 파일 크기·복잡도, 응집도, 결합도, 중복·죽은 코드, 이름 규칙 |
| 안전성 | 하드코딩·비밀값, 보안(입력 검증, 인증·인가), 의존성, 개인정보 |
| 견고성 | 오류 처리, 타입·정적 분석, 테스트, 로그 |
| 성능 | 병목, 자원 해제, 동시성 |
| 문서·명세 | AI가 읽기 좋은 파일 머리 설명, 문서와 코드의 일치, 명세 대비 구현 |

- 운영 방식
  - 검사는 읽기만: 고치는 것은 보고서를 본 뒤 고를 것만
  - 지적마다 파일·줄 번호와 실패 시나리오 (무엇이 들어오면 어떻게 망가지나)
  - "안 쓰는 코드" 같은 주장은 모든 사용처를 검색해 확인한 뒤 보고
  - 개선 목록을 세 단계로: 바로 해도 안전한 것 / 구조를 바꾸는 것 / 결정이 필요한 것
- 언제 돌리나
  - 큰 기능을 마친 뒤, 공개 전, 몇 달에 한 번
  - 보안 규칙·로그인·결제처럼 사고가 크게 나는 곳을 바꾼 뒤
- AI 도구에 맡길 때
  - 기준표를 스킬로 만들어 두고 "코드 전수 검사"로 같은 절차를 반복
  - 결과는 반드시 사람이 검토: AI의 지적도 틀릴 수 있음, 확인됨(Confirmed)과 추정(Suspected) 구분 요청
- 실제로 찾은 예
  - 쓰지 않는 컬렉션에 비로그인 쓰기가 열려 있던 보안 규칙 (4장)
  - 첫 화면이 부르는 스크립트의 판 표시가 진입 스크립트와 어긋난 캐시 버스팅 (6장)

## 시험(테스트)

- 바꿀 때마다 손으로 다 눌러 볼 수 없음: 중요한 흐름은 자동 시험으로
- 웹 화면 시험 도구: Playwright (실제 브라우저로 클릭·입력·확인)
- 우선순위
  - 로그인, 저장, 공유처럼 깨지면 사용자가 바로 떠나는 흐름
  - 보안 규칙: Firebase 에뮬레이터로 "남의 글 삭제는 거부" 같은 시험 (4장)
  - 한 번 고친 버그: 같은 버그가 다시 나지 않게 시험 하나 추가
- 커밋·배포 전에 시험과 빌드 검사가 오류 0개인지 확인

# 외부 코드와 라이선스

## 내 저장소의 라이선스 고르기

- 공개 저장소에 라이선스가 없으면: 코드는 보이지만 법적으로는 "모든 권리 보유", 남이 가져다 쓸 수 없음
- 대표 라이선스

| 라이선스 | 성격 | 남이 내 코드를 쓸 때 | 맞는 경우 |
| --- | --- | --- | --- |
| MIT | 허용형 | 저작권 고지만 남기면 자유롭게 사용·수정·상업 이용 | 널리 쓰이길 원할 때 |
| Apache-2.0 | 허용형 + 특허 | MIT와 비슷, 특허 사용권 명시, 변경 사항 표시 | 회사·특허가 걸린 코드 |
| GPL-3.0 | 전염형(카피레프트) | 가져다 배포하면 그 결과물도 GPL로 소스 공개 | 파생물도 공개되길 원할 때 |
| 라이선스 없음 | 비공개와 같음 | 사용 불가 | 공개만 하고 쓰게 하지 않을 때 |

- 정하는 법: GitHub 저장소 → **Add file → Create new file** → 파일 이름 `LICENSE` 작성 → **Choose a license template** 클릭
- 이미 GPL 코드를 함께 배포 중이면 내 라이선스 선택이 그 영향을 받음 (아래)
- 참고: [choosealicense.com](https://choosealicense.com/)

## 가져오는 방식별 차이

| 방식 | 예 | 저장소에 남는 것 | 관리 포인트 |
| --- | --- | --- | --- |
| npm 패키지 | `firebase`, `vite` | `package.json`, lock 파일 | 버전 고정, 취약점 알림 (7장) |
| CDN 스크립트 | `gstatic.com/firebasejs/버전/...` | 주소 한 줄 | 판 번호 고정, 출처 신뢰 |
| 파일 복사 (`vendor/`) | 엔진, 폰트, 아이콘 묶음 | 원본 파일 전체 | 출처·버전·라이선스 파일 함께 보관 |
| 브라우저 AI 엔진·모델 | WASM 엔진, 음성·이미지 모델 파일 | 엔진 파일, 모델 파일 | 코드와 모델의 라이선스가 따로, 파일 크기 |

- CDN은 판 번호를 꼭 고정: `@latest` 같은 주소는 예고 없이 바뀌어 사이트가 깨질 수 있음
- `vendor/`로 복사할 때 함께 남길 것
  - 원본의 라이선스 파일 (`LICENSE`, `COPYING` 등)
  - 출처 주소와 버전, 가져온 날짜 (`vendor/엔진/README.md`)
  - 내가 고친 부분이 있으면 그 기록

## 브라우저 AI 엔진과 모델

- 브라우저 안에서 도는 AI: 서버 비용 없이 사용자 기기에서 계산 (예: 장기·체스 엔진, 음성 인식, 번역 모델)
- 실제 사례: 웹 장기의 Fairy-Stockfish
- 문장 끝의 [`직접`](intro.md) 배지: 계정 가입·결제·비밀값 입력처럼 에이전트에게 맡기지 말고 직접 해야 하는 일, 누르면 개론의 정리로 이동
  - 장기를 지원하는 체스 계열 엔진을 WASM으로 빌드해 `vendor/fairy-stockfish/`에 포함
  - 라이선스: GPL-3.0 (`Copying.txt`)
- GPL 엔진을 함께 배포할 때 생각할 것
  - 엔진 자체의 라이선스 파일과 소스 출처 안내를 함께 배포
  - 엔진과 앱이 얼마나 강하게 묶였는지에 따라 앱 코드에도 GPL 의무가 미칠 수 있음
  - 가장 단순한 길: 앱 저장소도 공개하고 GPL 호환 라이선스로 정하기
  - 상업 서비스·비공개 코드라면 허용형 라이선스 엔진을 찾거나 전문가 확인
- 모델 파일은 코드와 별도
  - AI 모델은 자체 라이선스(예: 연구용만, 상업 이용 금지, 사용 제한 조항)가 붙는 경우가 많음
  - 엔진 코드가 MIT여도 모델이 상업 이용 금지일 수 있음: 둘 다 확인
- 파일 크기와 성능
  - 엔진·모델은 수 MB ~ 수백 MB: 첫 접속이 느려짐
  - 필요할 때만 내려받기, 받은 뒤에는 Cache Storage·IndexedDB에 보관 (4장, 6장)
  - 여러 스레드를 쓰는 WASM 엔진은 특별한 보안 헤더(교차 출처 격리)가 필요할 수 있음: GitHub Pages처럼 헤더를 못 바꾸는 곳에서는 서비스 워커로 우회 (웹 장기의 `coi-sw.js`)

## 고지하기

- 저장소: `LICENSE`(내 코드), 외부 코드마다 원본 라이선스 파일
- 여러 개를 쓰면 `THIRD_PARTY_NOTICES.md` 한 파일에 이름·버전·라이선스·출처를 모아 정리
- 앱 화면: 설정이나 정보 화면에 "오픈소스 라이선스" 항목
  - 쓰는 라이브러리·엔진·폰트·아이콘의 이름과 라이선스, 원문 링크
- 폰트·아이콘·이미지도 라이선스 대상: 무료 폰트라도 웹 배포 허용 여부 확인 (예: SIL Open Font License는 허용)
- 정리 시점: 외부 코드를 새로 넣을 때마다 바로 기록, 공개 전에 한 번 전체 확인
- 이 장의 내용은 일반적인 안내: 상업 서비스나 판단이 애매한 경우는 라이선스 원문과 전문가 확인

# 호스팅

## 도메인 등록 업체

- 도메인(`iseohyun.com`)은 등록 업체에서 1년 단위로 임대 [`직접`](intro.md)
- 대부분 DNS 관리 화면 함께 제공
- 선택 기준: 첫해 가격보다 **갱신 가격**

| 업체 | 장점 | 단점 |
| --- | --- | --- |
| [가비아](https://www.gabia.com/) | 한국어 화면·고객센터, `.kr`·`.co.kr` 등록 쉬움 | 갱신가가 첫해보다 높은 경우 많음 |
| [후이즈](https://whois.co.kr/) | 국내 업체, `.kr` 도메인 | 가비아와 비슷 |
| [GoDaddy](https://www.godaddy.com/) | 세계 최대, 도메인 종류 많음 | 첫해 할인 뒤 갱신가 높음, 부가 상품 권유 많음 |
| [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) | 원가 수준 가격, 빠른 DNS, 무료 CDN·통계 | 영어 화면, 다른 업체 도메인은 이전 필요한 경우 있음 |
| [Namecheap](https://www.namecheap.com/) | 갱신가 비교적 안정, 개인정보 보호 무료 | 영어 화면 |

## 서브도메인, 경로, 해시 경로

| 주소 | 정체 | 장점 | 단점 |
| --- | --- | --- | --- |
| `xxxx.iseohyun.com` | 서브도메인, 독립 사이트 | 저장소·배포 완전 분리, 로그인·저장 공간이 다른 서비스와 섞이지 않음 | 서비스마다 DNS 레코드 추가, Firebase 승인된 도메인도 따로 추가 |
| `iseohyun.com/xxxx/` | 경로, 메인 사이트 아래 폴더 | DNS 설정 불필요 | `localStorage`·쿠키를 메인 사이트와 공유, 빌드 기준 경로(`base: '/xxxx/'`) 설정 필요 |
| `iseohyun.com/#/xxxx` | 해시 경로, 한 페이지 앱 안의 화면 | 앱 하나로 모든 화면 관리, 서버 설정 불필요 | `#` 뒤는 서버에 전달되지 않음, 검색엔진의 화면별 색인 어려움 |

- 이 사이트의 칼럼: 해시 경로 (`iseohyun.com/#/column/...`)
- 장기처럼 따로 자라는 서비스: 서브도메인
- 판단 기준: 따로 로그인하고 따로 데이터를 가지면 서브도메인, 메인 사이트의 일부면 경로
- 해시 경로로 만든 화면을 공유할 때의 주소 설계와 미리보기 한계: 6장 "공유"

## GitHub Pages 배포 방식

- 저장소 Settings → Pages → Source 선택

| Source | 동작 | 맞는 프로젝트 |
| --- | --- | --- |
| Deploy from a branch | 고른 브랜치의 `/` 또는 `/docs` 폴더를 그대로 공개 | 빌드 없는 순수 HTML·CSS·JS |
| GitHub Actions | push마다 워크플로가 빌드, 결과물(`dist/`)만 공개 | Vite, React 등 빌드가 필요한 프로젝트 |

- 브랜치 배포: Branch `main`, 폴더 `/ (root)` → **Save** 클릭 → 1~2분 뒤 공개 (이 사이트의 방식)
- GitHub Actions 배포: Source를 GitHub Actions로 변경 → 추천 워크플로 표시
  - Static HTML: 저장소 파일을 그대로 공개, 올릴 폴더 지정 가능
  - Jekyll: 마크다운 블로그용
  - 빌드가 필요하면 직접 작성
- 빌드 결과물을 커밋하지 않아도 되므로, 빌드가 있는 프로젝트는 Actions 권장

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - uses: actions/deploy-pages@v4
```

- 기본 주소
  - 프로젝트 저장소 `xxxx` → `https://iseohyun.github.io/xxxx/`
  - 이름이 `iseohyun.github.io`인 저장소 → `https://iseohyun.github.io/` (사용자 사이트)
  - 사용자 사이트에 `iseohyun.com`을 연결하면, 도메인을 따로 붙이지 않은 프로젝트는 자동으로 `iseohyun.com/xxxx/`로 열림

## http와 https

| | http | https |
| --- | --- | --- |
| 전송 | 평문, 중간에서 읽기·변조 가능 | 암호화 |
| 브라우저 표시 | "주의 요함" | 자물쇠 |
| 기능 | 로그인, 알림, 서비스 워커, 위치·카메라 사용 불가 | 모두 사용 가능 |

- GitHub Pages가 인증서(Let's Encrypt) 무료 자동 발급
- 할 일: **Enforce HTTPS** 체크

## xxxx.iseohyun.com 등록

- DNS에 CNAME 레코드 추가 (도메인 업체의 DNS 관리 화면) [`직접`](intro.md)

| 타입 | 호스트(이름) | 값 |
| --- | --- | --- |
| CNAME | `xxxx` | `iseohyun.github.io.` |

- 값에 저장소 이름은 넣지 않음, `iseohyun.github.io`까지만
- 값 끝의 점(`.`)은 업체에 따라 직접 작성하거나 자동 추가
- 저장소 Settings → Pages → Custom domain에 `xxxx.iseohyun.com` 작성 → **Save** 클릭
- **DNS check successful** 표시까지 대기: 몇 분 ~ 최대 하루
- 브랜치 배포: 저장소에 `CNAME` 파일(내용 `xxxx.iseohyun.com`) 자동 커밋, 지우면 연결 해제
- Actions 배포: `CNAME` 파일 불필요
- 인증서 발급 후 **Enforce HTTPS** 체크: `http://` 접속도 `https://`로 이동
- 도메인 소유 인증 (권장, 처음 한 번)
  - 계정 Settings → Pages → **Add a domain** 클릭 → `iseohyun.com` 작성 [`직접`](intro.md)
  - 안내된 TXT 레코드를 DNS에 추가
  - 다른 사람이 내 서브도메인을 자기 저장소에 연결하는 도메인 탈취 방지

## 메인 도메인 iseohyun.com 연결

- 맨 도메인은 CNAME 불가, A 레코드 네 개 사용

| 타입 | 호스트 | 값 |
| --- | --- | --- |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `iseohyun.github.io.` |

- IP 주소는 바뀔 수 있음: [GitHub 공식 문서](https://docs.github.com/ko/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)에서 최신 값 확인
