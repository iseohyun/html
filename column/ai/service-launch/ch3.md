2026-11-21 작성

- 목표: Google·카카오·네이버·메일 로그인을 Firebase Authentication 하나로 관리
- 예시: 서비스 `xxxx.iseohyun.com`, Firebase 프로젝트 `xxxx`
- 실제 사례: `iseohyun.com`의 문의 창 로그인 (Google · 카카오 · 네이버)
- 대상: 보안 전담 인력이 없는 개인·소규모 업체
- 문장 끝의 [`직접`](intro.md) 배지: 계정 가입·결제·비밀값 입력처럼 에이전트에게 맡기지 말고 직접 해야 하는 일, 누르면 개론의 정리로 이동

# 왜 OAuth 2.0인가

## OAuth 2.0을 쓰는 이유

- OAuth 2.0: 사용자가 Google·카카오·네이버에 로그인하고, 내 서비스는 "이 사람이 맞다"는 결과(토큰)만 받는 방식
- 내 서비스가 받지 않는 것: 비밀번호
- 내 서비스가 받는 것: 회원 고유번호, 닉네임, (동의한 경우) 메일 주소·프로필 사진
- 대기업이 대신 해 주는 일 (직접 하면 모두 내 책임)
  - 비밀번호 저장과 유출 방지
  - 2단계 인증, 새 기기 로그인 알림
  - 무차별 대입 공격 차단, 이상 로그인 탐지
  - 비밀번호 찾기, 계정 복구, 휴대폰 본인 확인
- 사용자 입장의 장점: 새 비밀번호를 만들 필요 없음, 버튼 한 번으로 가입

## 개인정보는 최대한 가지고 있지 않는다

- 원칙: 가지고 있지 않은 정보는 유출될 수 없음
- 표준
  - 사이트마다 다른 비밀번호 사용
  - 브라우저·비밀번호 관리자가 무작위 비밀번호를 만들어 저장
- 현실
  - 컴퓨터에 익숙하지 않은 사람은 쓰던 비밀번호 하나를 모든 곳에 사용
  - 그 비밀번호는 이미 어딘가에서 유출되어 사실상 공공재
  - 내 서비스가 그 비밀번호를 받는 순간, 다른 서비스 계정까지 지켜야 하는 책임이 생김
- 대책
  - 비밀번호는 받지 않음, 인증은 OAuth 2.0에 위임
  - 받는 정보는 기능에 꼭 필요한 것만: 리더보드면 닉네임, 문의 답장이면 메일 주소
  - 메일 주소도 사용자 편의(답장, 계정 찾기)에 꼭 필요할 때만 수집
  - 이름, 생년월일, 전화번호, 주소는 요청하지 않음
  - 카카오·네이버 동의항목도 최소로: 받지 않으면 비즈 앱 전환·검수 부담도 줄어듦

## 비밀번호를 받을 구실을 만들지 않는다

- 표준
  - 서버는 비밀번호 원문을 저장하지 않음
  - 느린 해시 함수(bcrypt, Argon2 등)에 사용자마다 다른 무작위 값(salt)을 섞어 저장
  - 전송 구간은 HTTPS(TLS)로 암호화, 로그인 시 해시를 다시 계산해 비교
- 현실
  - 큰 회사에서도 비밀번호를 원문이나 약한 해시로 저장했다가 유출되는 사고가 반복
  - 소규모 서비스가 표준을 지켰는지 사용자는 확인할 수 없음
  - 유출 사고가 나면 "비밀번호를 왜 모았나"부터 의심받음
- 대책
  - 비밀번호 입력 칸 자체를 만들지 않음
  - "무작위 비밀번호를 만들어 쓰세요" 같은 안내도 비권장: 결국 비밀번호를 받는 구조
  - 메일 로그인이 필요하면 비밀번호 없는 이메일 링크 방식만 사용
  - 인증은 Google·카카오·네이버·Apple 같은 큰 회사에 맡김
- 참고: 패스키(passkey)
  - 비밀번호 대신 기기의 지문·얼굴 인식으로 로그인하는 차세대 표준
  - 서버에는 공개 키만 남아 유출돼도 피해가 적음
  - Google·Apple 계정이 이미 패스키를 지원하므로, OAuth 2.0에 위임하면 그 혜택을 함께 받음

## 아이들의 계정과 보호자 제한

- 보호자가 자녀 기기·계정의 로그인을 막는 경우
  - Google Family Link: 자녀 Google 계정으로 다른 사이트·앱에 로그인하는 것을 보호자가 제한
  - Apple 스크린타임: 웹사이트·앱 사용 제한
  - Microsoft Family Safety: 웹 필터링, 앱 제한
- 증상: 로그인 버튼을 눌러도 차단 화면, 또는 보호자 승인 요청
- 대책
  - 로그인 없이도 핵심 기능(게임, 읽기)은 쓸 수 있게 설계
  - 로그인은 점수 저장, 글쓰기처럼 꼭 필요한 기능에만 요구
  - "로그인이 안 되면 보호자 계정 설정을 확인해 주세요" 안내 문구 준비
- 법적 주의: 국내에서는 만 14세 미만 아동의 개인정보를 모으려면 법정대리인 동의 필요
  - 아이들이 많이 쓰는 서비스일수록 정보를 모으지 않는 설계가 안전

# Firebase 준비

## 로그인 방식 한눈에 보기

| 방식 | Firebase 기본 지원 | 서버(Cloud Functions) | 비용 | 난이도 |
| --- | --- | --- | --- | --- |
| Google | O | 불필요 | 무료 | 쉬움 |
| 메일(링크·비밀번호) | O | 불필요 | 무료 | 쉬움 |
| GitHub, Microsoft (해외) | O | 불필요 | 무료 | 보통 |
| Apple (해외) | O | 불필요 | Apple 개발자 멤버십 유료 | 보통 |
| 카카오 (국내) | X | 필요 | Blaze 요금제 | 어려움 |
| 네이버 (국내) | X | 필요 + 검수 | Blaze 요금제 | 어려움 |

- Firebase가 기본 지원하는 방식: 콘솔에서 켜기만 하면 됨
- 카카오·네이버: Firebase 목록에 없음, 직접 만든 서버 함수로 연결

## Firebase 프로젝트 생성

- [Firebase 콘솔](https://console.firebase.google.com/) 접속 → Google 계정 로그인 [`직접`](intro.md)
- **프로젝트 만들기** 클릭 → 프로젝트 이름 `xxxx` 작성
  - 프로젝트 ID는 나중에 바꿀 수 없음, 주소(`xxxx.firebaseapp.com`)에 사용
- Google 애널리틱스: 지금은 꺼도 됨 (7장에서 다룸)
- 프로젝트 개요 → **웹(`</>`) 아이콘** 클릭 → 앱 닉네임 작성 → **앱 등록** 클릭
- 표시되는 설정값(`firebaseConfig`)을 사이트 코드에 추가

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "xxxx.firebaseapp.com",
  projectId: "xxxx",
  appId: "1:...:web:..."
};
firebase.initializeApp(firebaseConfig);
```

- `apiKey`는 비밀번호가 아님
  - 브라우저에 그대로 드러나는 공개 값, 저장소에 커밋해도 됨
  - 실제 보호는 승인된 도메인, 보안 규칙(4장), App Check(4장)가 담당
- 반대로 절대 공개하면 안 되는 값: 서비스 계정 키(JSON), 카카오·네이버 Client Secret

## Authentication 시작과 승인된 도메인

- 왼쪽 메뉴 **빌드 → Authentication** 클릭 → **시작하기** 클릭
- **Sign-in method** 탭: 로그인 방식 켜기
- **설정 → 승인된 도메인** 탭: 로그인을 허용할 주소 목록
  - 기본 포함: `localhost`, `xxxx.firebaseapp.com`, `xxxx.web.app`
  - **도메인 추가** 클릭 → `xxxx.iseohyun.com` 작성
  - 서브도메인마다 따로 추가 (`iseohyun.com`을 넣어도 `xxxx.iseohyun.com`은 포함되지 않음)
  - 빠뜨리면 `auth/unauthorized-domain` 오류
- 사용자 계정 연결 설정
  - **설정 → 사용자 계정 연결**: 기본값 "이메일 주소당 계정 1개"
  - 같은 메일로 Google·메일 로그인을 하면 한 계정으로 묶임
  - 카카오·네이버는 아래 방식으로 별도 계정 (`kakao:회원번호`, `naver:id`)

# Google 로그인

## 설정

- **Sign-in method → 새 제공업체 추가 → Google** 클릭
- **사용 설정** 켜기 → 프로젝트 지원 이메일 선택 → **저장** 클릭
- 사이트 코드

```js
const provider = new firebase.auth.GoogleAuthProvider();
provider.addScope("email");
await firebase.auth().signInWithPopup(provider);
```

- 로그인 상태 확인

```js
firebase.auth().onAuthStateChanged(user => {
  if (user) console.log(user.displayName, user.email);
});
```

## 자주 겪는 문제

- 로그인 창에 "xxxx.firebaseapp.com(으)로 이동" 표시
  - Google OAuth 동의 화면의 앱 이름·로고 설정: [Google Cloud 콘솔](https://console.cloud.google.com/) → API 및 서비스 → OAuth 동의 화면
  - 내 도메인으로 바꾸려면 `authDomain`을 내 도메인으로 바꾸는 별도 설정 필요 (Firebase Hosting 사용 시 쉬움)
- 카카오톡·인스타그램 안에서 열면 Google 로그인 실패 (`403 disallowed_useragent`)
  - Google이 앱 안 브라우저(인앱 브라우저)의 로그인을 막음
  - 대응: 인앱 브라우저를 감지해 "외부 브라우저로 열기" 안내
  - `iseohyun.com`은 `kakaotalk`, `instagram`, `line` 사용자 에이전트를 감지해 안내
- 팝업 차단
  - 버튼 클릭 직후 바로 `signInWithPopup` 호출: 중간에 `await`가 길면 차단될 수 있음
  - 모바일에서 팝업이 불안정하면 `signInWithRedirect` 고려

# 메일 로그인

## 두 가지 방식

| 방식 | 사용자 경험 | 장점 | 단점 |
| --- | --- | --- | --- |
| 이메일 링크 (권장) | 메일 주소 작성 → 받은 메일의 링크 클릭 | 비밀번호를 받지 않음 | 메일이 늦거나 스팸함에 빠질 수 있음 |
| 이메일·비밀번호 (비권장) | 회원가입 후 비밀번호로 로그인 | 익숙함 | 비밀번호를 받는 구조, 비밀번호 찾기·메일 인증 화면 필요 |

- 소규모 서비스는 이메일 링크만 사용 (앞의 "비밀번호를 받을 구실을 만들지 않는다")
- 메일 로그인은 Google·카카오·네이버 계정이 없는 사람을 위한 보조 수단

## 이메일 링크 설정

- **Sign-in method → 이메일/비밀번호** 클릭 → **사용 설정** 켜기 → **이메일 링크(비밀번호가 없는 로그인)** 켜기 → **저장** 클릭
- 링크 보내기

```js
await firebase.auth().sendSignInLinkToEmail(email, {
  url: "https://xxxx.iseohyun.com/login-finish.html",
  handleCodeInApp: true
});
localStorage.setItem("emailForSignIn", email);
```

- 링크를 누르고 돌아온 페이지에서 로그인 마무리

```js
if (firebase.auth().isSignInWithEmailLink(location.href)) {
  const email = localStorage.getItem("emailForSignIn") || prompt("메일 주소를 다시 입력해 주세요");
  await firebase.auth().signInWithEmailLink(email, location.href);
}
```

- `url`의 도메인도 승인된 도메인에 있어야 함
- 다른 기기에서 링크를 열면 `localStorage`가 비어 있음: 메일 주소를 다시 묻는 화면 필요

## 메일 템플릿과 발신 주소

- **Authentication → 템플릿** 탭: 로그인 링크 메일의 문구 수정
- 기본 발신 주소 `noreply@xxxx.firebaseapp.com`: 스팸함에 빠지기 쉬움
- 발신 도메인을 내 도메인으로 바꾸기
  - 템플릿 화면 → **도메인 맞춤설정** 클릭 → `iseohyun.com` 작성
  - 안내된 TXT·CNAME 레코드를 DNS에 추가 → 인증 [`직접`](intro.md)

# 카카오·네이버 로그인

## 동작 구조

- Firebase가 카카오·네이버를 모르기 때문에 중간에 서버 함수가 필요
- 흐름
  - 사이트: 작은 창(팝업)으로 카카오·네이버 로그인 화면 열기
  - 사용자: 카카오·네이버에서 로그인과 동의
  - 카카오·네이버: 등록한 Redirect URI(`/auth/kakao-callback.html`)로 **인가 코드** 전달
  - 콜백 페이지: 인가 코드를 원래 창에 넘기고 스스로 닫힘
  - 사이트: 인가 코드를 Cloud Function(`kakaoLogin`)에 전송
  - Cloud Function: Client Secret으로 인가 코드를 액세스 토큰으로 교환 → 사용자 정보 조회 → Firebase **커스텀 토큰** 발급
  - 사이트: `signInWithCustomToken(token)`으로 Firebase 로그인 완료
- Client Secret이 서버 함수에만 있어야 하는 이유: 브라우저 코드는 누구나 볼 수 있음
- 결과 사용자 ID 예: `kakao:1234567890`, `naver:abcDEF...`

## 서버 함수 준비 (공통)

- Cloud Functions는 **Blaze 요금제(종량제)** 필요
  - Firebase 콘솔 왼쪽 아래 **업그레이드** 클릭 → 결제 계정 연결 [`직접`](intro.md)
  - 무료 사용량이 있어 개인 서비스는 대부분 0원, 그래도 예산 알림 필수 (7장)
- Firebase CLI 설치와 로그인 [`직접`](intro.md)

```powershell
npm.cmd install -g firebase-tools
firebase.cmd login
firebase.cmd init functions
```

- Client Secret은 Firebase 비밀값(Secret Manager)에 저장 [`직접`](intro.md)

```powershell
firebase.cmd functions:secrets:set KAKAO_CLIENT_SECRET
firebase.cmd functions:secrets:set NAVER_CLIENT_SECRET
```

  - 붙여 넣을 때 끝에 줄바꿈이 들어가면 값이 달라짐 주의
  - `iseohyun.com`은 값을 화면에 보이지 않게 입력받는 스크립트(`scripts/set-login-secret.ps1`) 사용
- 함수 코드에서 비밀값 사용

```js
const { defineSecret } = require("firebase-functions/params");
const KAKAO_CLIENT_SECRET = defineSecret("KAKAO_CLIENT_SECRET");

exports.kakaoLogin = onRequest(
  { cors: ["https://xxxx.iseohyun.com"], secrets: [KAKAO_CLIENT_SECRET] },
  async (req, res) => { /* 인가 코드 → 토큰 → 사용자 정보 → 커스텀 토큰 */ }
);
```

- **IAM 설정**: 커스텀 토큰을 만들려면 함수의 서비스 계정에 권한 필요 [`직접`](intro.md)
  - [Google Cloud 콘솔](https://console.cloud.google.com/iam-admin/iam) → IAM 및 관리자 → IAM
  - 함수가 쓰는 서비스 계정(기본: `프로젝트번호-compute@developer.gserviceaccount.com`) 옆 연필 아이콘 클릭
  - **역할 추가** → **서비스 계정 토큰 생성자** 선택 → 저장
  - 빠뜨리면 `createCustomToken`에서 권한 오류 (`iam.serviceAccounts.signBlob`)
- 배포

```powershell
firebase.cmd deploy --only functions:kakaoLogin,functions:naverLogin
```

- 함수 안전장치
  - `cors`에 내 사이트 주소만 허용
  - Redirect URI를 등록한 값과 정확히 같은지 검사
  - 인가 코드 길이·형식 검사, 로그에 토큰·비밀값 남기지 않기

## 카카오 설정

- [Kakao Developers](https://developers.kakao.com/) 접속 → 카카오 계정 로그인 [`직접`](intro.md)
- **내 애플리케이션 → 애플리케이션 추가하기** 클릭
  - 앱 이름(로그인 화면에 표시), 회사명(개인은 본인 이름), 앱 아이콘 작성
- **앱 키**: **REST API 키** 복사 → 사이트 코드와 서버 함수의 Client ID로 사용
- **플랫폼 → Web 플랫폼 등록** 클릭 → 사이트 도메인 작성
  - `https://xxxx.iseohyun.com`
  - 개발용 `http://localhost:포트`
- **카카오 로그인** 메뉴
  - **활성화 설정** 켜기
  - **Redirect URI 등록** 클릭 → `https://xxxx.iseohyun.com/auth/kakao-callback.html` 작성
  - 개발용 `http://localhost:포트/auth/kakao-callback.html`도 추가
- **카카오 로그인 → 동의항목**
  - 닉네임, 프로필 사진: 필수 또는 선택 동의로 설정
  - 이메일: 비즈 앱 전환(사업자 정보 또는 본인 인증) 후 사용 가능
  - 받는 항목이 적을수록 동의 화면이 간단하고 개인정보 부담이 적음
- **보안 → Client Secret** 클릭 → 코드 생성 → **활성화 상태** 켜기 [`직접`](intro.md)
  - 이 값을 `KAKAO_CLIENT_SECRET` 비밀값에 저장
- 로그인 화면 주소

```
https://kauth.kakao.com/oauth/authorize?response_type=code
  &client_id=REST_API_키
  &redirect_uri=https://xxxx.iseohyun.com/auth/kakao-callback.html
  &state=무작위값
```

- 서버 함수가 부르는 주소
  - 토큰 교환: `POST https://kauth.kakao.com/oauth/token`
  - 사용자 정보: `GET https://kapi.kakao.com/v2/user/me`
- 콘솔 메뉴 이름은 개편으로 바뀔 수 있음: 항목 이름(Redirect URI, 동의항목, Client Secret)으로 찾기
- 다른 방법: 카카오는 OpenID Connect(OIDC)를 지원
  - Firebase를 Identity Platform으로 업그레이드하면 OIDC 제공업체로 직접 연결 가능, 서버 함수 불필요
  - 대신 Identity Platform 요금 정책 적용

## 네이버 설정

- [NAVER Developers](https://developers.naver.com/) 접속 → 네이버 로그인 [`직접`](intro.md)
- **Application → 애플리케이션 등록** 클릭
  - 애플리케이션 이름: 로그인 화면에 표시
  - 사용 API: **네이버 로그인** 선택
  - 제공 정보: 별명, 프로필 사진 선택 (필수·추가 구분)
  - 로그인 오픈 API 서비스 환경: **PC 웹** 선택
    - 서비스 URL: `https://xxxx.iseohyun.com`
    - 네이버 로그인 Callback URL: `https://xxxx.iseohyun.com/auth/naver-callback.html`, 개발용 localhost 주소도 추가
  - **등록하기** 클릭
- **Client ID**, **Client Secret** 확인
  - Client ID: 사이트 코드와 서버 함수에 사용
  - Client Secret: `NAVER_CLIENT_SECRET` 비밀값에 저장
- 로그인 화면 주소

```
https://nid.naver.com/oauth2.0/authorize?response_type=code
  &client_id=CLIENT_ID
  &redirect_uri=https://xxxx.iseohyun.com/auth/naver-callback.html
  &state=무작위값
```

- 서버 함수가 부르는 주소
  - 토큰 교환: `POST https://nid.naver.com/oauth2.0/token` (`state`도 함께 전송)
  - 사용자 정보: `GET https://openapi.naver.com/v1/nid/me`, 결과 코드 `00`이 성공
- 네이버는 OIDC 미지원: 서버 함수 방식 사용

## 네이버 검수 요청

- 등록 직후 상태는 **개발 중**
  - 관리자와 **멤버 관리** 탭에 등록한 테스터만 로그인 가능
  - 다른 사람이 로그인하면 오류 화면
- 모든 사용자에게 열려면 **검수 요청** [`직접`](intro.md)
  - 애플리케이션 → **검수 요청** 탭
  - 서비스 소개, 네이버 로그인 적용 화면 캡처(로그인 버튼, 로그인 후 화면), 받는 정보의 사용 목적 작성
  - 로그인 버튼은 네이버 디자인 가이드(초록색 버튼, 로고) 준수
  - 개인정보처리방침 주소 필요 (아래)
- 검수 기간: 영업일 기준 며칠, 반려되면 사유를 고쳐 다시 요청
- 카카오도 이메일 같은 추가 정보를 받으려면 비즈 앱 전환과 검수 필요

## 콜백 페이지

- Redirect URI로 등록한 정적 HTML 한 장
- 하는 일: 주소의 `code`, `state`를 읽어 원래 창에 전달하고 닫기

```js
const params = new URLSearchParams(location.search);
window.opener.postMessage(
  { type: "oauth-callback", code: params.get("code"), state: params.get("state") },
  location.origin
);
window.close();
```

- `postMessage`의 두 번째 인자에 내 출처(`location.origin`) 지정: 다른 사이트로 코드가 새지 않게
- 원래 창은 보낸 `state`와 돌아온 `state`가 같은지 확인: 위조 요청(CSRF) 방지
- `<meta name="robots" content="noindex">`: 검색 결과에서 제외

# 해외 로그인

## Apple

- iPhone 사용자가 많은 서비스, iOS 앱으로 확장할 계획이면 고려
- [Apple Developer](https://developer.apple.com/) 멤버십 필요 (연간 유료) [`직접`](intro.md)
- Apple 쪽: Services ID 생성 → Sign in with Apple 켜기 → 도메인과 Return URL(`https://xxxx.firebaseapp.com/__/auth/handler`) 등록 → 키(.p8) 생성
- Firebase 쪽: Sign-in method → Apple → Services ID, 팀 ID, 키 ID, 키 파일 작성
- 사용자가 "이메일 가리기"를 고르면 `...@privaterelay.appleid.com` 주소가 옴

## GitHub

- 개발자 대상 서비스에 적합
- GitHub **Settings → Developer settings → OAuth Apps → New OAuth App** 클릭 [`직접`](intro.md)
  - Homepage URL: `https://xxxx.iseohyun.com`
  - Authorization callback URL: Firebase가 안내하는 `https://xxxx.firebaseapp.com/__/auth/handler`
- 발급된 Client ID, Client Secret을 Firebase Sign-in method → GitHub에 작성
- 이 경우 Client Secret은 Firebase가 보관, 서버 함수 불필요

## Microsoft

- 회사·학교 계정 사용자 대상 서비스에 적합
- [Azure 포털](https://portal.azure.com/) → **앱 등록** → 새 등록 [`직접`](intro.md)
  - 리디렉션 URI: Firebase가 안내하는 `__/auth/handler` 주소
- 애플리케이션(클라이언트) ID와 클라이언트 암호를 Firebase Sign-in method → Microsoft에 작성

# 개인정보처리방침과 이용약관

## 왜 필요한가

- 로그인을 붙이면 이름·메일·프로필 사진 같은 개인정보를 다루게 됨
- 국내: 개인정보 보호법상 개인정보처리방침 공개 의무
- 네이버 검수, 카카오 비즈 앱, Google OAuth 동의 화면, 앱 스토어 모두 방침 주소 요구
- 해외 사용자: 유럽 GDPR, 캘리포니아 CCPA 등도 고려

## 최소 수집과 방침의 관계

- 오해: OAuth 2.0으로 비밀번호를 받지 않으니 방침이 필요 없다
- 사실: 회원 고유번호, 닉네임, 메일 주소도 개인정보, 받는 순간 방침 필요
- 최소 수집의 효과
  - 방침이 짧고 단순해짐: "닉네임과 회원 고유번호만 저장"
  - 유출 사고가 나도 피해 범위가 작음
  - 국외 이전(Firebase 미국 서버 등), 만 14세 미만 동의 같은 부담 항목이 줄어듦
- 방침은 실제와 같아야 함
  - 쓰지 않는 항목을 템플릿 그대로 남기지 않음
  - 수집 항목을 늘리면 방침도 먼저 고치고 공지

## 개인정보처리방침에 쓸 내용

- 모으는 항목: 예) 닉네임, 프로필 사진, 메일 주소, 로그인 기록
- 모으는 목적: 예) 로그인, 리더보드 이름 표시, 문의 답변
- 보관 기간과 파기 방법: 예) 탈퇴 시 즉시 삭제
- 제3자 제공·처리 위탁: 예) Google Firebase(미국)에 저장
- 국외 이전 사실: Firebase 서버 위치, 이전 항목
- 이용자의 권리: 열람, 정정, 삭제, 탈퇴 방법
- 책임자 연락처
- 작성 도구: [개인정보 포털의 처리방침 만들기](https://www.privacy.go.kr/) 활용 가능

## 이용약관에 쓸 내용

- 서비스 내용, 금지 행위(욕설, 도배, 부정 점수 등)
- 게시물의 권리와 삭제 기준 (4장 게시판과 연결)
- 서비스 중단·변경, 책임의 한계

## 화면에 반영

- 사이트 아래쪽(footer)에 **개인정보처리방침**, **이용약관** 링크
- 로그인 버튼 근처에 "로그인하면 이용약관과 개인정보처리방침에 동의하는 것으로 봅니다" 안내
- 해외 사용자 대상이면 분석·광고 쿠키 사용 전에 동의 배너
- 회원 탈퇴 기능
  - 사용자 데이터 삭제와 Firebase 계정 삭제(`user.delete()`)
  - 카카오·네이버는 연결 끊기 API까지 호출하면 깔끔
