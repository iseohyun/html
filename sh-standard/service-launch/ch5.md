2026-11-21 작성

- 목표: 사용자가 연락할 길을 열고, 내가 놓치지 않고 답하기
- 다루는 것: 문의 메일, 메일 보내기, 카카오톡 채널, 해외 사용자 채널, 웹 푸시 알림, 사이트 안 채팅
- 실제 사례: `iseohyun.com`의 문의 창 (Web3Forms 메일 · 카카오톡 채널 · Firestore 대화 + 푸시 알림)
- 문장 끝의 [`직접`](intro.md) 배지: 계정 가입·결제·비밀값 입력처럼 에이전트에게 맡기지 말고 직접 해야 하는 일, 누르면 개론의 정리로 이동

# 소통 방식 고르기

## 방식 비교

| 방식 | 사용자 경험 | 만드는 데 드는 일 | 비용 | 맞는 경우 |
| --- | --- | --- | --- | --- |
| 문의 메일 폼 (Web3Forms) | 폼 작성 → 전송 | 폼 하나 | 무료 한도 있음 | 모든 서비스의 기본 |
| 카카오톡 채널 (국내) | 카카오톡으로 1:1 대화 | 채널 개설, 링크 | 무료 | 국내 사용자, 빠른 답장 |
| Discord, Telegram (해외) | 커뮤니티·봇에서 대화 | 서버·봇 개설, 링크 | 무료 | 해외 사용자, 커뮤니티 |
| 사이트 안 대화 + 푸시 알림 | 사이트 안에서 대화, 답장이 오면 알림 | Firestore, 서버 함수, 서비스 워커 | Blaze 요금제 | 로그인한 사용자와 이어지는 대화 |

- 원칙
  - 처음에는 메일 폼 하나로 시작, 문의가 늘면 채널 추가
  - 연락 창구를 늘릴수록 확인할 곳도 늘어남: 내가 매일 보는 곳으로 모이게 설계
  - 답장할 수 없는 창구는 만들지 않음 (예: 답장 주소 없는 익명 폼만 두기)

# 문의 메일 받기 (Web3Forms)

## 서버 없이 메일 받기

- Web3Forms: 사이트의 폼 내용을 내 메일로 전달해 주는 서비스
- 서버도, 메일 계정 비밀번호도 필요 없음
- [web3forms.com](https://web3forms.com/) 접속 → 받을 메일 주소 작성 → **Create Access Key** 클릭 [`직접`](intro.md)
- 메일로 온 **Access Key** 복사
  - 이 키는 받는 주소에 묶인 공개용 값: 화면 코드에 넣어도 됨
  - 키를 아는 사람은 내게 메일을 보낼 수만 있고, 내 메일함을 볼 수는 없음
- 가장 간단한 HTML 폼

```html
<form action="https://api.web3forms.com/submit" method="POST">
  <input type="hidden" name="access_key" value="발급받은_ACCESS_KEY">
  <input type="hidden" name="subject" value="[xxxx] 문의">
  <input type="email" name="email" placeholder="답장 받을 메일 (선택)">
  <textarea name="message" required></textarea>
  <input type="checkbox" name="botcheck" style="display:none">
  <button type="submit">보내기</button>
</form>
```

- 페이지 이동 없이 보내기 (`iseohyun.com`의 방식)

```js
const response = await fetch("https://api.web3forms.com/submit", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Accept": "application/json" },
  body: JSON.stringify({
    access_key: "발급받은_ACCESS_KEY",
    subject: "[xxxx] 문의",
    email: replyTo,
    message
  })
});
const data = await response.json();
if (!data.success) throw new Error(data.message);
```

- 실패해도 작성한 내용은 지우지 않고 "다시 시도" 안내: 긴 문의를 날리면 다시 쓰지 않음

## 스팸 대책

- 숨은 체크박스(`botcheck`): 사람에게 보이지 않는 칸, 자동 프로그램이 체크하면 Web3Forms가 버림
- 보내기 버튼을 누른 뒤 응답이 올 때까지 비활성화: 두 번 전송 방지
- 짧은 시간에 반복 전송하면 화면에서 막기
- 스팸이 많아지면 Web3Forms의 hCaptcha 연동 검토
- 무료 한도(월 전송 수)는 [요금표](https://web3forms.com/pricing)에서 확인

## 답장 주소와 개인정보

- 답장 받을 메일은 선택 항목으로: 메일 없이 의견만 남기고 싶은 사람도 많음
- 메일 주소 형식 검사 후 전송
- 개인정보처리방침(3장)에 "문의 시 입력한 메일 주소는 답장에만 사용" 작성
- 화면 오류 정보를 함께 보내면 원인 찾기가 빠름
  - `iseohyun.com`은 최근 오류와 환경 정보를 메일에만 붙이고 보내는 사람 화면에는 보이지 않음
  - 오류 정보에 개인정보(입력값, 토큰)가 섞이지 않게 주의
- 현재 보던 페이지 이름 포함 여부를 사용자가 고르게 하기

# 메일 보내기 (Resend)

## 언제 필요한가

- Web3Forms는 "내가 받는" 메일, Resend는 "내가 보내는" 메일
- 필요한 경우
  - 가입 환영, 알림 요약, 예약 확인처럼 서비스가 사용자에게 보내는 메일
  - 관리자 답장을 서비스 이름의 주소로 보낼 때
- 3장의 로그인 링크 메일은 Firebase가 보내므로 Resend 불필요
- API 키가 필요하므로 반드시 서버(Cloud Functions)에서 보냄: 브라우저 코드에 키를 넣으면 누구나 내 이름으로 메일을 보냄

## 설정

- [resend.com](https://resend.com/) 가입 [`직접`](intro.md)
- **Domains → Add Domain** 클릭 → 보내는 도메인 작성
  - 메인 도메인 대신 `mail.iseohyun.com` 같은 서브도메인 권장: 문제가 생겨도 메인 도메인 평판에 영향이 적음
- 안내된 DNS 레코드를 도메인 업체 DNS 관리 화면에 추가 (SPF, DKIM 등) [`직접`](intro.md)
- **Verify** 클릭 → 상태가 Verified가 될 때까지 대기 (몇 분 ~ 하루)
- **API Keys → Create API Key** 클릭 [`직접`](intro.md)
  - 권한: Sending access, 도메인 한정
  - 키는 생성할 때 한 번만 보임: Firebase 비밀값에 저장

```powershell
firebase.cmd functions:secrets:set RESEND_API_KEY
```

- 서버 함수에서 보내기

```js
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

exports.sendWelcome = onDocumentCreated({ document: "users/{uid}", secrets: [RESEND_API_KEY] }, async (event) => {
  const user = event.data.data();
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY.value()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "xxxx <hello@mail.iseohyun.com>",
      to: user.email,
      subject: "가입을 환영합니다",
      text: "안녕하세요. xxxx입니다."
    })
  });
});
```

- 무료 한도(하루·월 전송 수)는 [요금표](https://resend.com/pricing)에서 확인

## 메일 도메인 인증

- 인증 없이 보낸 메일은 스팸함에 빠지거나 거부됨
- 세 가지 DNS 설정

| 설정 | 하는 일 | 레코드 |
| --- | --- | --- |
| SPF | 이 도메인으로 메일을 보내도 되는 서버 목록 | TXT `v=spf1 include:... ~all` |
| DKIM | 메일에 전자 서명을 붙여 위조·변조 확인 | TXT 또는 CNAME (업체가 안내한 값) |
| DMARC | SPF·DKIM 검사에 실패한 메일을 어떻게 할지 정책 | TXT `_dmarc` 에 `v=DMARC1; p=none; rua=mailto:...` |

- SPF는 도메인당 하나: 여러 서비스를 쓰면 `include:`를 한 레코드에 합침
- DMARC는 `p=none`(보고만)으로 시작해 문제없으면 `p=quarantine`으로 강화
- Gmail·네이버 메일은 대량 발송자에게 SPF·DKIM·DMARC를 요구하는 추세
- 받는 쪽 확인: 받은 메일의 **원본 보기**에서 `spf=pass`, `dkim=pass` 확인

# 카카오톡 채널 (국내)

## 채널 개설

- 카카오톡 채널: 사용자가 카카오톡으로 1:1 대화를 거는 공식 창구
- [카카오톡 채널 관리자센터](https://center-pf.kakao.com/) 접속 → 카카오 계정 로그인 [`직접`](intro.md)
- **새 채널 만들기** 클릭
  - 채널 이름, 검색용 아이디, 프로필 사진, 소개 작성
- 채널 설정
  - **채널 공개** 켜기, **검색 허용** 켜기
  - **채팅** 메뉴 → 1:1 채팅 켜기
  - 상담 가능 시간과 자동 응답 문구 설정: "평일 저녁에 답장드립니다"
- 채널 주소 확인
  - 채널 홈: `http://pf.kakao.com/_채널ID`
  - 바로 대화: `http://pf.kakao.com/_채널ID/chat`

## 사이트에 연결

- 문의 창이나 사이트 아래쪽에 링크 두 개

```html
<a href="http://pf.kakao.com/_채널ID/chat" target="_blank" rel="noopener noreferrer">카카오톡 1:1 채팅</a>
<a href="http://pf.kakao.com/_채널ID" target="_blank" rel="noopener noreferrer">채널 추가</a>
```

- 휴대폰에서는 카카오톡 앱이, PC에서는 카카오톡 PC 앱이나 웹 화면이 열림
- 장점: 구현이 링크뿐, 사용자에게 익숙, 답장 알림을 카카오톡으로 받음
- 단점
  - 대화가 서비스 밖(카카오)에 남음
  - 카카오 계정이 없는 사용자, 해외 사용자는 쓰기 어려움

## 운영

- 관리자는 **카카오톡 채널 관리자** 앱으로 휴대폰에서 답장
- 채널 친구에게 소식 보내기(메시지 발송)는 유료일 수 있음: 요금 확인 후 사용
- 개인 번호·메일을 대화에서 받지 않도록 안내: 받은 개인정보는 방침(3장)에 따라 관리
- 비즈니스 채널 인증(사업자)은 선택: 검색 노출과 신뢰 표시가 늘어남

# 해외 사용자 채널

## Discord

- 게임·개발 도구 사용자에게 익숙한 커뮤니티
- 서버 만들기 → 채널 구성 (공지, 질문, 버그 신고)
- **초대 링크** 생성 → 만료 없음으로 설정 → 사이트에 연결
- 장점: 사용자끼리 서로 돕는 커뮤니티가 생김
- 단점: 관리(스팸, 규칙, 운영자)가 필요, 1:1 문의에는 부적합

## Telegram

- 해외 메신저 사용자 대상
- 공개 채널(공지용) 또는 그룹(대화용) 생성 → `https://t.me/채널이름` 링크 연결
- 봇: BotFather에서 봇을 만들면 사이트 문의를 텔레그램으로 받는 알림 창구로도 사용 가능
  - 봇 토큰은 비밀값: 서버 함수에서만 사용 [`직접`](intro.md)

# 웹 푸시 알림

## 구조

- 웹 푸시: 사이트를 닫아도 기기에 알림을 띄우는 기능
- 구성 요소
  - 서비스 워커(`sw.js`): 백그라운드에서 알림을 받아 띄우는 스크립트 (6장과 같은 파일)
  - FCM(Firebase Cloud Messaging): 알림을 기기까지 배달
  - VAPID 키: 내 사이트가 보낸 알림임을 증명하는 키 쌍
  - 기기 토큰: 알림을 받을 기기의 주소, 기기·브라우저마다 다름
- 흐름
  - 사용자가 알림 켜기 클릭 → 브라우저 권한 허용
  - 사이트가 FCM 기기 토큰 발급 → Firestore에 사용자 ID와 함께 저장
  - 이벤트(새 메시지) 발생 → 서버 함수가 그 사용자의 토큰들로 알림 전송
  - 서비스 워커가 알림 표시 → 클릭하면 사이트의 해당 화면 열기
- 보내는 쪽은 서버 함수: Blaze 요금제 필요 (3장)

## Firebase 설정

- Firebase 콘솔 → **프로젝트 설정 → 클라우드 메시징** 탭
- **웹 구성 → 웹 푸시 인증서** → **키 쌍 생성** 클릭 [`직접`](intro.md)
- 생성된 공개 키(VAPID 키)를 사이트 설정에 추가: 공개 값이라 화면 코드에 넣어도 됨

## 알림 켜기

- 권한 요청은 사용자가 버튼을 눌렀을 때만
  - 첫 화면에서 바로 묻으면 대부분 거부, 한 번 거부하면 사이트에서 다시 물을 수 없음
  - "답장이 오면 알려 드릴까요?"처럼 이유를 먼저 보여 주고 요청

```js
if (!("serviceWorker" in navigator && "PushManager" in window && "Notification" in window)) {
  // 이 브라우저는 알림을 지원하지 않음
}
const permission = await Notification.requestPermission();
if (permission !== "granted") return;

const registration = await navigator.serviceWorker.register("/sw.js");
await navigator.serviceWorker.ready;
const token = await firebase.messaging().getToken({
  vapidKey: "VAPID_공개_키",
  serviceWorkerRegistration: registration
});
```

- 토큰 저장 (`iseohyun.com`의 방식)
  - 문서 ID를 토큰의 SHA-256 값으로: 같은 기기가 다시 켜도 문서가 하나
  - 필드: `token`, `uid`, `device`(브라우저·OS 요약), `updatedAt`
  - 규칙: 로그인한 본인 기기의 토큰만 쓰고 지우기 (4장)
- 알림 끄기: 이 기기의 토큰 문서 삭제 + `deleteToken()`

## 서비스 워커에서 표시

```js
self.addEventListener("push", (event) => {
  const data = (event.data ? event.data.json() : {}).data || {};
  event.waitUntil(self.registration.showNotification(data.title || "xxxx", {
    body: data.body || "",
    icon: "/icon-192.png",
    tag: data.tag || "message",
    data: { url: data.url || "/" }
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data.url, self.location.origin);
  if (target.origin !== self.location.origin) return; // 내 사이트 주소만 열기
  event.waitUntil(clients.openWindow(target.href));
});
```

- `tag`: 같은 대화의 알림은 하나로 묶어 갱신, 알림이 쌓이지 않음
- 클릭 시 이미 열린 사이트 창이 있으면 새 창 대신 그 창을 앞으로 가져오기
- 알림이 여는 주소는 내 사이트로 제한: 알림 내용이 조작돼도 다른 사이트로 보내지 않게

## 서버에서 보내기

```js
exports.notifyMessage = onDocumentCreated("messages/{id}", async (event) => {
  const msg = event.data.data();
  const tokens = await admin.firestore().collection("push_tokens").where("uid", "==", msg.to).get();
  const result = await admin.messaging().sendEach(tokens.docs.map(d => ({
    token: d.get("token"),
    data: { title: msg.fromName, body: msg.text.slice(0, 180), url: "/?chat=" + msg.thread, tag: "chat-" + msg.thread },
    webpush: { headers: { Urgency: "high", TTL: "86400" } }
  })));
  // 더 이상 쓸 수 없는 토큰 정리
  result.responses.forEach((r, i) => {
    if (!r.success && r.error.code === "messaging/registration-token-not-registered") tokens.docs[i].ref.delete();
  });
});
```

- `data`만 담아 보내고 표시는 서비스 워커가 담당: 브라우저마다 다른 기본 표시를 피하고 모양을 직접 관리
- 본문은 짧게 자르기: 알림 화면에 긴 글은 잘림
- 죽은 토큰(앱 삭제, 권한 철회)은 바로 지우기: 쌓이면 보내기 비용과 오류만 늘어남

## 기기별 주의

| 환경 | 지원 | 조건 |
| --- | --- | --- |
| Android Chrome | 지원 | 권한 허용 |
| PC Chrome·Edge·Firefox | 지원 | 권한 허용, 브라우저가 실행 중이어야 받음 |
| Mac Safari | 지원 | 권한 허용 |
| iPhone·iPad Safari | 조건부 지원 | 홈 화면에 추가한 웹 앱(6장 PWA)에서만, 그 앱 안에서 권한 허용 |
| 카카오톡 등 인앱 브라우저 | 대부분 미지원 | 외부 브라우저로 열기 안내 |

- iPhone 사용자에게는 "홈 화면에 추가 → 앱에서 알림 켜기" 순서 안내가 필요
- 권한을 거부한 사용자: 브라우저 주소창의 사이트 설정에서 직접 허용해야 함, 방법 안내 문구 준비
- 운영체제의 방해 금지·집중 모드에서는 알림이 조용히 쌓임

# 사이트 안 채팅

## 알림을 이용한 채팅

- `iseohyun.com`의 문의 대화 방식
- 구조
  - 메시지 하나 = Firestore 문서 하나 (`contact_messages`)
  - 문서가 생기면 서버 함수가 받는 사람 기기에 푸시
  - 받는 사람이 알림을 누르면 사이트가 열리고 그 대화 표시
- 장점
  - 사용자가 사이트를 닫아도 답장이 왔다는 것을 앎
  - 대화가 서비스 안에 남음, 메일 주소를 받지 않아도 됨 (3장의 최소 수집)
- 단점
  - 실시간 대화보다 느린 "편지 주고받기"에 가까움
  - 알림을 켜지 않은 사용자는 다시 들어와야 답장을 봄
- 대화 묶음: `thread` 필드에 관리자가 아닌 쪽의 사용자 ID → 한 사람과의 대화가 한 묶음
- 규칙 요점 (4장 패턴)
  - 로그인한 사람만 작성, 관리자가 아니면 받는 사람은 관리자만
  - 필드 고정, 길이 제한, 서버 시각, 10초에 한 번(도배 방지)
  - 받은 사람은 읽음 표시(`read`)만 바꿀 수 있음

## Firebase 실시간 채팅

- 대화방을 열어 둔 동안 메시지가 바로 보이는 방식
- `onSnapshot`으로 최근 메시지 구독

```js
const unsubscribe = db.collection("rooms").doc(roomId).collection("messages")
  .orderBy("createdAt", "desc")
  .limit(50)
  .onSnapshot(snap => renderMessages(snap.docs.reverse()));
```

- 화면을 열어 둔 동안은 실시간 구독, 닫은 뒤에는 푸시 알림: 두 방식을 함께 쓰는 것이 일반적
- 추가로 만들 것
  - 읽음 표시: 마지막으로 읽은 시각을 사용자별로 저장
  - 안 읽은 수: 새 메시지 쿼리의 `count()` 또는 집계 문서
  - 입력 중 표시: 잦은 쓰기가 생기므로 꼭 필요할 때만

## 예시: 웹 장기의 대국 채팅

- `janggi.iseohyun.com`의 온라인 대국: 수와 채팅을 Firestore로 주고받음
- 두 기기가 직접 연결되는 방식(P2P)이 아님: 둘 다 서버의 같은 문서를 구독
- 주소만으로 서로를 찾는 원리
  - 방장이 방을 만들면 8자리 방 코드 생성 (예: `K7QM2XPA`, 헷갈리는 `0`·`O`·`1`·`I` 제외한 32글자)
  - 이 코드가 곧 Firestore 문서 ID: `games/janggi/rooms/{방 코드}`
  - 초대 링크: `https://janggi.iseohyun.com/?room=K7QM2XPA`
  - 상대가 링크를 열면 사이트가 주소에서 `room`을 읽어 같은 문서에 접속하고 빈 자리에 앉음
  - 이후 두 화면이 같은 방 문서와 그 아래 `moves`(수), `chat`(채팅)을 `onSnapshot`으로 구독
  - 한쪽이 수를 두거나 채팅을 쓰면 문서가 추가되고, 다른 쪽 화면이 바로 받아 그림
- 서로의 IP·기기를 알 필요 없음: "서버의 같은 주소"만 알면 됨
- 안전장치 (보안 규칙)
  - 방 목록 조회 금지: 코드를 모르면 남의 방을 찾을 수 없음 (경우의 수 32⁸ ≈ 1조)
  - 초대 링크로 온 사람은 기다리는 방만 읽고, 빈 자리에 자기만 앉기
  - 채팅은 참가자만 읽고 쓰기, 300자 이하, 필드 고정, 고치기·지우기 금지
  - 공개 방의 관전자는 수만 읽고 채팅은 읽지 못함

## 채팅 비용과 대책

- 비용 계산
  - 메시지 1개 = 쓰기 1건 + 그 방을 구독 중인 사람 수만큼 읽기
  - 2인 대국: 메시지 1개에 쓰기 1건, 읽기 약 2건
  - 새로고침·재접속: 구독을 다시 시작하면 불러오는 지난 메시지 수만큼 읽기가 다시 발생
  - 관전자가 많은 공개 방: 수 하나에 관전자 수만큼 읽기, 채팅보다 이쪽이 먼저 커질 수 있음
- 무료 한도로 어림잡기 (하루 읽기 5만 건, 쓰기 2만 건)
  - 2인 방 기준 하루 약 2만 5천 개 메시지까지 무료
  - 같은 사람이 하루 열 번 재접속하고 매번 지난 메시지 300개를 읽으면 그것만으로 읽기 3,000건
- 위험 신호
  - 한 사람이 자동 프로그램으로 메시지를 연속 전송 (도배)
  - 끝난 방의 채팅이 지워지지 않고 쌓임 → 저장 비용, 다시 열 때 읽기 비용
  - 구독을 해제하지 않은 화면이 백그라운드에서 계속 읽기
- 대책

| 대책 | 방법 | 효과 |
| --- | --- | --- |
| 불러오는 양 줄이기 | 접속 시 최근 50개만 `limit(50)`, 더 보기는 버튼으로 | 재접속 읽기 감소 |
| 간격 제한 | 사용자별 rate 문서 + `getAfter` 규칙으로 1초~3초에 한 번 (4장 도배 방지) | 도배 차단 |
| 길이·필드 제한 | 300자 이하, `keys().hasOnly` | 저장 용량과 악용 감소 |
| 끝난 방 정리 | 방 문서에 `expireAt`(끝난 뒤 7일 등)을 두고 TTL 정책으로 `chat`·`moves`까지 자동 삭제 | 저장 비용, 개인정보 보관 기간 단축 |
| 구독 해제 | 방을 나가거나 화면이 숨겨지면 `unsubscribe()` | 보이지 않는 읽기 차단 |
| 관전 분리 | 관전자는 요약 문서 하나만 구독, 수 목록은 끝난 뒤 한 번에 읽기 | 관전자 수만큼 늘던 읽기 감소 |
| 예산 알림 | 월 예산의 50%·90%·100%에서 메일 (7장) | 비용 급증을 바로 인지 |

- 웹 장기에 적용할 점검 항목
  - 지금은 채팅 구독이 최근 300개(`limit(300)`): 대국 채팅에는 50개면 충분
  - 메시지 길이 제한은 있지만 보내는 간격 제한은 없음: 4장의 rate 문서 방식 추가 검토
  - 로그인 요청 기록에는 TTL 필드가 있지만 방·채팅에는 없음: 끝난 방 정리 정책 검토

## 운영

- 도배·욕설: 규칙의 간격 제한 + 관리자 삭제 + 신고
- 보관 기간: 오래된 대화는 TTL 정책으로 자동 삭제, 방침(3장)에 기간 작성
- 관리자 부재: 자동 응답("평일 저녁에 답장드립니다")과 답장 예상 시간 표시
- 대화 내용에 개인정보가 오가지 않도록 안내, 받은 정보는 답장 후 삭제
