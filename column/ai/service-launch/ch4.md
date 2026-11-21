2026-11-21 작성

- 목표: 서버 없이 게시판·리더보드·공개방을 만들고, 보안 규칙과 App Check로 지키기
- 도구: Firebase Cloud Firestore (3장의 Firebase 프로젝트 `xxxx`에 추가)
- 실제 사례: `iseohyun.com`의 문의 대화, 랭킹, 사용자 설정 (`firestore.rules`)

# 온라인 DB를 쓰기 전에

## 먼저 던질 질문

- 온라인 DB는 마지막 선택: 쓰는 순간 보안 규칙, 비용, 개인정보, 모니터링이 함께 따라옴
- 데이터마다 세 가지 질문
  - 얼마나 자주 바뀌나
  - 누가 바꾸나 (나, 사용자 본인, 모든 사용자)
  - 다른 사람·다른 기기와 공유해야 하나
- 판단표

| 데이터 | 바뀌는 빈도 | 바꾸는 사람 | 공유 | 알맞은 곳 |
| --- | --- | --- | --- | --- |
| 서비스 목록, 문제은행, 공지 | 가끔 | 나 | 모두 | 저장소의 정적 파일 |
| 화면 설정(테마, 글자 크기, 목차 열림) | 자주 | 사용자 본인 | 안 함 | 브라우저 저장소 |
| 진행 중인 게임, 임시 작성 글 | 매우 자주 | 사용자 본인 | 안 함 | 브라우저 저장소 |
| 여러 기기에서 이어 하는 기록 | 자주 | 사용자 본인 | 본인 기기끼리 | 온라인 DB (본인 문서) |
| 게시판, 리더보드, 공개방 | 자주 | 모든 사용자 | 모두 | 온라인 DB |
| 외부 사이트의 소식·일정 | 하루 몇 번 | 자동 수집 | 모두 | 정적 파일 + 예약 실행 (7장) |

- 온라인 DB가 꼭 필요한 경우: "다른 사람이 쓴 것을 내가 봐야 할 때", "내 기록을 다른 기기에서 봐야 할 때"

## 정적 파일로 직접 관리

- 대상: 변동 폭이 작고 내가 관리하는 데이터
  - 서비스 목록(`service-list.json`), 문제은행, 메뉴 구성(`hierarchy.json`), 공지, 용어 사전
- 방법: 저장소에 JSON 파일로 두고 사이트가 `fetch`로 읽기

```js
const services = await fetch("/service-list.json").then(r => r.json());
```

- 장점
  - 비용 0원, 보안 규칙 불필요
  - git 이력이 곧 변경 기록과 백업
  - 잘못 고치면 이전 커밋으로 되돌리기
  - 검색엔진이 읽을 수 있음 (2장)
- 단점
  - 바꿀 때마다 커밋과 배포 필요
  - 사용자가 쓸 수 없음
  - 브라우저 캐시 때문에 새 파일이 늦게 보일 수 있음: 6장의 캐시 버스팅으로 해결
- 주의: 공개 저장소의 파일은 누구나 볼 수 있음
  - 문제은행의 정답, 미공개 공지처럼 숨길 내용은 넣지 않음

## 브라우저 저장소

- 대상: 자주 바뀌지만 서버와 주고받을 필요가 없는 데이터
- 문장 끝의 [`직접`](intro.md) 배지: 계정 가입·결제·비밀값 입력처럼 에이전트에게 맡기지 말고 직접 해야 하는 일, 누르면 개론의 정리로 이동
  - 화면 설정(테마, 글자 크기, 목차 열림·고정)
  - 최근 본 문서, 진행 중인 게임 상태, 작성 중인 글의 임시 저장
- 종류

| 저장소 | 용량 | 형식 | 맞는 용도 |
| --- | --- | --- | --- |
| `localStorage` | 출처당 약 5MB | 문자열 | 설정 몇 개, 작은 값 |
| `sessionStorage` | 출처당 약 5MB | 문자열 | 탭을 닫으면 지워도 되는 값 |
| IndexedDB | 디스크 여유에 따라 수백 MB 이상 | 객체, 파일 | 기보, 오프라인 데이터, 큰 목록 |
| Cache Storage | IndexedDB와 공유 | 요청·응답 | 오프라인용 파일 (6장 서비스 워커) |

```js
localStorage.setItem("theme", "dark");
const theme = localStorage.getItem("theme") || "light";
```

- 장점
  - 서버 왕복 없음: 즉시 반영, 비용 0원
  - 데이터가 사용자 기기에만 있음: 개인정보 부담이 가장 작음
- 단점과 주의
  - 기기·브라우저마다 따로: 휴대폰과 PC에서 설정이 다름
  - 사용자가 사이트 데이터 삭제, 시크릿 창, 브라우저 정리 도구로 언제든 지워짐
  - Safari는 사이트를 한동안 방문하지 않으면 스크립트가 저장한 데이터를 지울 수 있음
  - 서브도메인마다 따로: `xxxx.iseohyun.com`과 `iseohyun.com`은 서로의 값을 못 봄 (1장)
  - 같은 출처의 모든 스크립트가 읽을 수 있음: 토큰·개인정보는 넣지 않음
- 원칙: 지워져도 기본값으로 돌아갈 뿐 아무 문제가 없는 데이터만 저장
- 읽기·쓰기는 `try`로 감싸기: 저장소가 막힌 환경(일부 시크릿 창)에서 오류 방지

## 쿠키를 피하는 이유

- 쿠키의 원래 용도: 서버가 로그인 상태를 기억하려고 브라우저에 맡기는 작은 값
  - 요청할 때마다 서버로 자동 전송
  - 정적 사이트에는 읽을 서버가 없어 대부분 쓸모가 없음
- 쿠키가 미움받게 된 이유
  - 광고·분석 회사가 여러 사이트를 넘나들며 사용자를 추적하는 데 사용
  - 유럽은 필수가 아닌 쿠키에 사전 동의를 요구, 그래서 사이트마다 동의 배너가 생김
  - 쿠키라는 말만 나와도 거부감을 갖는 사용자가 많음
- 현실
  - 동의 배너를 띄우면 첫 화면이 가려지고 이탈이 늘어남
  - 사용자가 브라우저 정리 도구로 이유 없이 지우는 경우가 많음
  - 주요 브라우저가 다른 사이트의 쿠키(서드파티 쿠키)를 막는 추세
- 대책
  - 설정 저장은 쿠키 대신 `localStorage`
  - 로그인 상태는 Firebase가 알아서 관리 (IndexedDB 사용)
  - 추적용 분석 도구를 넣을 때만 동의 배너 고민 (7장)
- 참고: 화면 설정처럼 사용자가 요청한 기능을 위한 저장은 동의가 필요 없는 "필수" 범위로 보는 것이 일반적

## 그 밖의 선택지

- 주소에 담기
  - 작은 상태는 주소의 쿼리나 해시에 저장 (예: `?level=3`, `#/rules`)
  - 링크를 보내면 같은 화면이 그대로 열림, 저장소 불필요
  - 주소 설계와 공유 서랍: 6장 "공유"
  - 개인정보는 넣지 않음: 주소는 기록·공유·로그에 남음
- 파일로 내보내기·가져오기
  - 사용자 기록을 JSON 파일로 내려받고, 다른 기기에서 불러오기
  - 서버 없이 기기 이동과 백업을 해결, 데이터의 주인이 사용자
- 외부 서비스에 맡기기
  - 문의: Web3Forms 같은 폼 서비스 (5장)
  - 댓글: GitHub Discussions 기반 giscus 같은 댓글 위젯
  - 설문·신청: Google Forms + 스프레드시트
  - 장점: 보안·스팸 대응을 그 서비스가 담당 / 단점: 화면과 데이터가 내 서비스 밖에 있음
- 자동으로 만드는 정적 파일
  - 외부 소식·일정은 GitHub Actions 예약 실행으로 모아 JSON 파일로 커밋 (7장)
  - 사용자는 정적 파일만 읽음: DB 비용 없이 매일 새 데이터
- 한 서비스 안에서 섞어 쓰기
  - 예) 문제은행은 정적 파일, 화면 설정은 `localStorage`, 순위만 Firestore
  - 온라인 DB에 올리는 데이터가 적을수록 보안 규칙과 비용이 단순해짐

# 데이터 저장소 고르기

## 서버 없는 구조

- 기존 구조: 브라우저 → 내 서버(API) → 데이터베이스
- Firebase 구조: 브라우저 → 데이터베이스 직접 접속
- 장점
  - 서버를 만들고 관리할 필요 없음
  - 정적 호스팅(GitHub Pages)만으로 동작
  - 실시간 갱신 기본 제공
- 대가
  - 브라우저 코드는 누구나 보고 고칠 수 있음
  - 데이터베이스 앞의 유일한 문지기는 **보안 규칙**
  - 규칙이 허술하면 누구나 남의 글을 지우고, 점수를 조작하고, 전체 데이터를 내려받음

## Firestore와 Realtime Database

| 항목 | Cloud Firestore | Realtime Database |
| --- | --- | --- |
| 구조 | 컬렉션 → 문서 → 필드 | 하나의 큰 JSON 나무 |
| 쿼리 | 여러 조건, 정렬, 페이지 넘김 | 단순 정렬·필터 하나 |
| 요금 | 읽기·쓰기 건수 기준 | 내려받은 용량 기준 |
| 서울 지역 | 있음 (`asia-northeast3`) | 없음 (가까운 곳: 싱가포르) |
| 맞는 용도 | 게시판, 리더보드, 방 목록 대부분 | 접속 표시(온라인·오프라인), 아주 잦은 작은 갱신 |

- 대부분 Firestore로 시작
- 접속 표시처럼 "연결이 끊기면 자동으로 지우기"(`onDisconnect`)가 필요할 때만 Realtime Database 함께 사용
- 다른 선택지
  - Supabase: PostgreSQL 기반, SQL 사용, 행 단위 보안(RLS)
  - 둘 다 "브라우저가 직접 접속하고 규칙으로 지킨다"는 구조는 같음

## Firestore 데이터베이스 만들기

- Firebase 콘솔 → **빌드 → Firestore Database** 클릭 → **데이터베이스 만들기** 클릭 [`직접`](intro.md)
- 위치 선택
  - 국내 사용자 대상: `asia-northeast3 (서울)`
  - 한 번 정하면 바꿀 수 없음
  - Cloud Functions도 같은 지역에 두면 빠르고 저렴
- 보안 규칙 시작 모드
  - **프로덕션 모드** 선택: 모든 읽기·쓰기 차단에서 시작
  - **테스트 모드**는 비권장: 30일 동안 누구나 읽기·쓰기, 기한이 지나면 갑자기 전부 차단

```
// 테스트 모드 규칙: 공개 서비스에 절대 남기지 않음
allow read, write: if request.time < timestamp.date(2026, 12, 21);
```

- 사이트 코드에 Firestore 추가

```js
const db = firebase.firestore();
```

# 게시판

## 데이터 설계

- 컬렉션 `posts`

| 필드 | 형식 | 설명 |
| --- | --- | --- |
| `uid` | 문자열 | 작성자 (3장 로그인의 사용자 ID) |
| `name` | 문자열 | 작성자 이름, 목록 표시용 |
| `title` | 문자열 | 제목, 100자 이하 |
| `body` | 문자열 | 본문, 5,000자 이하 |
| `createdAt` | 시각 | 작성 시각, 서버 시각 |
| `updatedAt` | 시각 | 수정 시각 |

- 댓글: 하위 컬렉션 `posts/{postId}/comments`
- 첨부 이미지가 필요하면 Firebase Storage에 올리고 주소만 저장

## 읽기와 쓰기

- 글쓰기

```js
await db.collection("posts").add({
  uid: user.uid,
  name: user.displayName,
  title,
  body,
  createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  updatedAt: firebase.firestore.FieldValue.serverTimestamp()
});
```

- 시각은 반드시 `serverTimestamp()`: 사용자 컴퓨터 시계는 틀리거나 조작될 수 있음
- 최신 글 20개

```js
const snap = await db.collection("posts")
  .orderBy("createdAt", "desc")
  .limit(20)
  .get();
```

- 다음 페이지

```js
const last = snap.docs[snap.docs.length - 1];
const next = await db.collection("posts")
  .orderBy("createdAt", "desc")
  .startAfter(last)
  .limit(20)
  .get();
```

- `limit` 없이 전체를 읽지 않음: 글이 쌓일수록 읽기 비용이 그대로 늘어남

## 화면 표시와 운영

- 글 내용은 `textContent`로 표시, `innerHTML` 금지
  - 누군가 본문에 `<script>`나 `<img onerror=...>`를 넣으면 다른 사람 화면에서 실행됨(XSS)
- 링크·마크다운을 허용하려면 허용 목록 방식으로 직접 변환
- 운영 기능
  - 작성자 본인 수정·삭제
  - 관리자 삭제
  - 신고 버튼: 신고 컬렉션에 쌓고 관리자가 확인
  - 이용약관(3장)의 금지 행위와 삭제 기준을 화면에서 연결

# 리더보드

## 데이터 설계

- 컬렉션 `scores`, 문서 ID는 사용자 ID: 한 사람당 최고 기록 하나

| 필드 | 형식 | 설명 |
| --- | --- | --- |
| `uid` | 문자열 | 사용자 ID |
| `name` | 문자열 | 표시 이름, 20자 이하 |
| `score` | 숫자 | 점수 |
| `updatedAt` | 시각 | 기록 시각, 서버 시각 |

- 기간별 순위가 필요하면 `scores_2026w47`처럼 주간 컬렉션을 따로 두거나 `week` 필드 추가

## 순위 조회

```js
const top = await db.collection("scores")
  .orderBy("score", "desc")
  .limit(10)
  .get();
```

- 조건과 정렬을 함께 쓰면(예: `week == 47` + `score` 정렬) 복합 색인 필요
  - 처음 실행하면 콘솔에 색인 만들기 링크가 포함된 오류 표시 → 링크 클릭 → 생성
  - 만든 색인은 `firestore.indexes.json`으로 저장소에서 관리
- 내 순위: `score`가 내 점수보다 큰 문서 수 + 1

```js
const higher = await db.collection("scores")
  .where("score", ">", myScore)
  .count()
  .get();
const myRank = higher.data().count + 1;
```

## 점수 조작 문제

- 현실: 점수는 브라우저가 계산해서 보냄, 개발자 도구로 아무 숫자나 보낼 수 있음
- 규칙으로 할 수 있는 방어
  - 로그인한 본인 문서만 쓰기
  - 점수 범위 제한 (예: 0 이상 100,000 이하)
  - 기존 기록보다 높을 때만 갱신
  - 갱신 간격 제한 (예: 10초에 한 번)
  - 필드 목록 고정: 정해진 필드 외에는 거부
- 규칙으로 막을 수 없는 것: "그 점수를 정말 플레이해서 얻었는가"
- 더 강한 방어
  - 게임 기록(수순, 시간)을 Cloud Function에 보내 서버가 다시 계산해 점수 저장
  - 브라우저의 직접 쓰기는 막고(`allow write: if false`) 서버 함수만 쓰기
- 현실적 타협: 소규모 서비스는 규칙 방어 + 관리자 삭제 + 이상 기록 신고로 충분한 경우가 많음

# 공개방

## 데이터 설계

- 공개방: 누구나 방 목록을 보고 들어가 함께 쓰는 공간 (대국방, 채팅방, 협업 보드)
- 컬렉션 `rooms`

| 필드 | 형식 | 설명 |
| --- | --- | --- |
| `host` | 문자열 | 방장 사용자 ID |
| `title` | 문자열 | 방 제목 |
| `members` | 배열 | 참가자 사용자 ID 목록 |
| `capacity` | 숫자 | 정원 |
| `status` | 문자열 | `waiting`, `playing`, `closed` |
| `updatedAt` | 시각 | 마지막 활동 시각 |

- 방 안의 진행 기록: 하위 컬렉션 `rooms/{roomId}/events` (수, 메시지 하나가 문서 하나)

## 실시간 갱신

- `onSnapshot`: 데이터가 바뀌면 화면이 자동으로 갱신

```js
const unsubscribe = db.collection("rooms")
  .where("status", "==", "waiting")
  .orderBy("updatedAt", "desc")
  .limit(30)
  .onSnapshot(snap => renderRooms(snap.docs));
```

- 화면을 떠날 때 `unsubscribe()` 호출: 안 하면 보이지 않는 화면이 계속 읽기 비용 발생
- 듣는 범위는 좁게: 방 전체가 아니라 대기 중인 방 30개, 방 안에서는 최근 이벤트만

## 입장과 정원

- 두 사람이 동시에 마지막 자리에 들어오는 문제: 트랜잭션으로 해결

```js
await db.runTransaction(async tx => {
  const ref = db.collection("rooms").doc(roomId);
  const room = (await tx.get(ref)).data();
  if (room.members.length >= room.capacity) throw new Error("방이 가득 찼습니다");
  tx.update(ref, {
    members: firebase.firestore.FieldValue.arrayUnion(user.uid),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
});
```

## 오래된 방 정리

- 사용자가 창을 닫으면 방이 그대로 남음
- 방법
  - 목록에서 `updatedAt`이 오래된 방은 숨기기
  - Firestore **TTL 정책**: 만료 시각 필드(`expireAt`)를 정하면 지난 문서를 자동 삭제
  - Cloud Functions 예약 실행으로 주기적 정리
- 접속 표시(지금 방에 있는지)는 Realtime Database의 `onDisconnect`가 정확

# 보안 규칙

## 규칙의 기본 문법

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /posts/{postId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.uid;
    }
  }
}
```

| 표현 | 뜻 |
| --- | --- |
| `match /posts/{postId}` | 이 경로의 문서에 적용, `postId`는 문서 ID |
| `allow get` / `allow list` | 문서 한 건 읽기 / 목록 조회 |
| `allow read` | `get` + `list` |
| `allow create` / `update` / `delete` | 새로 쓰기 / 고치기 / 지우기 |
| `allow write` | `create` + `update` + `delete` |
| `request.auth` | 요청한 사람의 로그인 정보, 로그인 안 했으면 `null` |
| `request.auth.uid` | 요청한 사람의 사용자 ID |
| `resource.data` | 지금 저장되어 있는 문서 |
| `request.resource.data` | 쓰기가 성공하면 저장될 문서 |
| `request.time` | 서버가 요청을 받은 시각 |

- 규칙은 허용 목록 방식: 아무 규칙에도 맞지 않으면 거부
- 규칙은 필터가 아님: "내 글만 보여 줘"가 아니라, 쿼리 자체가 내 글만 요청해야 통과

## 자주 쓰는 패턴

- 본인 문서만

```
match /users/{uid} {
  allow get, write: if request.auth != null && request.auth.uid == uid;
}
```

- `get`만 열고 `list`는 닫기: 문서 ID를 아는 본인은 읽고, 남이 전체 목록을 훑지 못하게
- 필드 목록 고정과 길이 제한

```
allow create: if request.auth != null
  && request.resource.data.keys().hasOnly(['uid', 'name', 'title', 'body', 'createdAt', 'updatedAt'])
  && request.resource.data.uid == request.auth.uid
  && request.resource.data.title is string
  && request.resource.data.title.size() <= 100
  && request.resource.data.body is string
  && request.resource.data.body.size() <= 5000
  && request.resource.data.createdAt == request.time;
```

  - `hasOnly`: 정해지지 않은 필드(예: `isAdmin: true`)를 몰래 넣는 것을 차단
  - `uid == request.auth.uid`: 남의 이름으로 쓰기 차단
  - `createdAt == request.time`: 서버 시각만 허용, 날짜 조작 차단
- 특정 필드만 고치기 (예: 읽음 표시만)

```
allow update: if request.auth != null
  && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['read'])
  && request.resource.data.read == true;
```

- 관리자
  - 컬렉션 `admins/{uid}`에 관리자 문서를 콘솔에서 직접 추가
  - 이 컬렉션의 쓰기는 `if false`: 사이트에서는 누구도 관리자를 만들 수 없음

```
function isAdmin() {
  return request.auth != null
    && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
}
```

- 도배 방지 (`iseohyun.com` 문의 대화의 방식)
  - 사용자마다 `rate/{uid}` 문서에 마지막 작성 시각 기록
  - 글 쓰기와 시각 기록을 **일괄 쓰기(batch)**로 함께 요청
  - 규칙에서 "마지막 작성 후 10초가 지났는지", "이번 요청에서 시각을 지금으로 고쳤는지"(`getAfter`) 확인

```
match /rate/{uid} {
  allow create, update: if request.auth != null && request.auth.uid == uid
    && request.resource.data.keys().hasOnly(['lastAt'])
    && request.resource.data.lastAt == request.time
    && (resource == null || request.time > resource.data.lastAt + duration.value(10, 's'));
}
// 글 쓰기 규칙에 추가
&& getAfter(/databases/$(database)/documents/rate/$(request.auth.uid)).data.lastAt == request.time
```

## 비로그인 사용자

- `allow create: if true`처럼 아무나 쓰게 열면 생기는 일
  - 자동 프로그램이 문서를 수만 건 생성 → 저장 비용과 읽기 비용 증가
  - 욕설·광고 도배, 가짜 기록
- 방법
  - 쓰기는 로그인한 사람만 (3장)
  - 게스트 기능이 꼭 필요하면 Firebase **익명 로그인** 사용: 로그인 화면 없이 사용자 ID 발급, 규칙에서 `request.auth != null`로 구분 가능
  - 익명 사용자에게도 필드 고정, 길이 제한, 도배 방지 적용

## 규칙 시험과 배포

- 콘솔 시험: Firestore → 규칙 탭 → **규칙 플레이그라운드**
  - 경로, 작업(get, create 등), 로그인 여부, 보낼 데이터를 정하고 실행 → 허용·거부와 걸린 줄 표시
- 로컬 시험: Firebase 에뮬레이터

```powershell
firebase.cmd init emulators
firebase.cmd emulators:start --only firestore
```

  - `@firebase/rules-unit-testing`으로 "남의 글 삭제는 거부" 같은 시험을 코드로 작성
- 배포

```powershell
firebase.cmd deploy --only firestore:rules
```

- 규칙 파일(`firestore.rules`)은 저장소에 커밋해 이력 관리
  - 콘솔에서 직접 고치면 저장소 파일과 어긋남, 다음 배포 때 덮어씀

# App Check

## 하는 일

- 보안 규칙: "누가, 무엇을" 할 수 있는지
- App Check: 요청이 "내 사이트에서" 왔는지
- 막는 것
  - 내 `apiKey`를 복사해 다른 곳에서 내 데이터베이스를 부르는 자동 프로그램
  - 대량 요청으로 비용을 늘리는 공격
- 막지 못하는 것: 내 사이트를 연 실제 사용자가 개발자 도구로 보내는 요청 (이건 보안 규칙이 담당)

## 설정

- Firebase 콘솔 → **빌드 → App Check** 클릭 → **시작하기** 클릭
- 웹 앱 선택 → 제공자 **reCAPTCHA Enterprise** 선택
  - Google Cloud 콘솔에서 reCAPTCHA 키 생성 (도메인 `xxxx.iseohyun.com` 등록) [`직접`](intro.md)
  - 사이트 키를 Firebase에 작성 → 저장
- 사이트 코드: Firebase 초기화 직후, Firestore를 쓰기 전에

```js
firebase.appCheck().activate(
  new firebase.appCheck.ReCaptchaEnterpriseProvider("사이트_키"),
  true // 토큰 자동 갱신
);
```

- 개발용 `localhost`: 디버그 토큰 사용

```js
self.FIREBASE_APPCHECK_DEBUG_TOKEN = true; // 개발 환경에서만
```

  - 콘솔에 출력된 디버그 토큰을 App Check → 앱 → **디버그 토큰 관리**에 등록 [`직접`](intro.md)
  - 배포 코드에 남기지 않음

## 적용 순서

- 바로 적용하지 않음: 적용하면 App Check 토큰이 없는 요청은 모두 거부
- 순서
  - 코드 배포 후 App Check → **API** 탭에서 Firestore 요청 지표 확인 (확인된 요청 비율)
  - 대부분의 요청이 확인됨이 되면 **적용** 클릭 [`직접`](intro.md)
  - Cloud Functions도 같은 방식으로 적용 가능 (`enforceAppCheck: true`)
- reCAPTCHA Enterprise는 일정 사용량까지 무료, 넘으면 과금: 요금표 확인

# 비용과 모니터링

## 요금 구조

- Firestore는 건수로 과금
  - 문서 읽기, 쓰기, 삭제 건수
  - 저장 용량
  - 내보내는 네트워크 용량
- 무료 사용량 (Spark·Blaze 공통, 하루 기준)
  - 읽기 50,000건, 쓰기 20,000건, 삭제 20,000건
  - 저장 1GiB
  - 정확한 값은 [Firebase 요금표 ↗](https://firebase.google.com/pricing)에서 확인
- Spark(무료) 요금제: 한도를 넘으면 그날은 멈춤
- Blaze(종량제) 요금제: 한도를 넘으면 과금, 예산 알림 필수 (7장)
- 비용을 정하는 것은 코드보다 설계: 화면 하나를 그릴 때 문서를 몇 건 읽는지가 곧 요금

## 비용을 줄이는 설계

- 온라인 DB에 올리는 데이터 자체를 줄이기 (앞의 "온라인 DB를 쓰기 전에")
  - 정적 파일, 브라우저 저장소로 보낼 수 있는 것은 먼저 보내기
- 화면 하나 = 쿼리 하나
  - 목록에 필요한 이름·사진은 글 문서에 함께 저장, 사용자 문서를 매번 따로 읽지 않기
  - 화면을 설계할 때 "이 화면은 문서 몇 건을 읽나"를 함께 적기
- 읽는 양에 상한 두기
  - 모든 목록 쿼리에 `limit`
  - 페이지 넘김(`startAfter`)으로 나눠 읽기
- 실시간은 꼭 필요한 곳에만
  - `onSnapshot`은 방 안, 대화처럼 즉시 갱신이 필요한 화면에만
  - 화면을 떠날 때 해제
  - 게시판 목록 같은 곳은 한 번 읽기(`get`) + 새로고침 버튼
- 집계는 미리 만들어 두기
  - 개수는 문서를 다 읽지 말고 `count()` 집계 쿼리
  - 자주 보는 값(전체 글 수, 상위 10명)은 집계 문서 하나에 모아 두고, 쓰기 때 함께 갱신
- 큰 데이터는 다른 곳에
  - 이미지·파일은 Storage에, 문서에는 주소만
  - 긴 기록은 하위 컬렉션으로 나눠 필요한 부분만 읽기
- 쓰기 횟수 줄이기
  - 입력할 때마다 저장하지 말고, 멈춘 뒤 한 번(디바운스) 또는 화면을 떠날 때 저장
  - 여러 문서는 일괄 쓰기(batch)로 한 번에
- 오래된 데이터 정리
  - 다 끝난 방, 오래된 임시 문서는 TTL 정책으로 자동 삭제: 저장 비용과 목록 읽기 비용이 함께 줄어듦

## 모니터링

- 왜 필요한가
  - 서버가 없으니 서버 로그도 없음, 문제를 알려 주는 곳을 따로 마련해야 함
  - 비용 폭탄, 도배, 규칙 오류는 대부분 "누가 알려 주기 전까지" 모름
- 무엇을 볼 것인가

| 볼 것 | 위치 | 이상 신호 |
| --- | --- | --- |
| 읽기·쓰기·삭제 건수 | Firebase 콘솔 → Firestore → 사용량 | 평소보다 몇 배 급증: 무한 반복 코드, 공격 |
| 규칙 거부 건수 | Firestore → 규칙 → 모니터링 (규칙 평가 지표) | 배포 직후 급증: 규칙이 정상 사용자를 막음 / 평소 꾸준히 많음: 누군가 두드리는 중 |
| App Check 지표 | App Check → API 탭 | 확인되지 않은 요청 비율 증가: 내 사이트 밖에서 호출 |
| 함수 오류 | Functions → 로그, Google Cloud 로그 탐색기 | 로그인·알림 함수의 오류 반복 |
| 청구 금액 | Google Cloud 콘솔 → 결제 → 예산 및 알림 | 예산의 50%, 90%, 100% 도달 |
| 사용자 화면의 오류 | 오류 수집 도구 (7장) | 특정 브라우저·화면에서 반복되는 오류 |

- 알림 받기
  - 예산 알림: 결제 → 예산 및 알림 → 월 예산(예: 1만 원) → 50%, 90%, 100%에서 메일 (7장)
  - 사용량 알림: Google Cloud 콘솔 → Monitoring → 알림 정책 → Firestore 읽기 건수가 기준을 넘으면 메일
  - 예산 알림은 알려 줄 뿐 멈추지 않음: 자동으로 멈추려면 예산 알림에 Cloud Function을 연결해 결제를 끊는 별도 구성 필요
- 사람이 하는 점검
  - 새 규칙을 배포한 날은 규칙 거부 지표를 한 번 더 확인
  - 한 달에 한 번 사용량 그래프와 청구 금액 확인
  - 관리자 화면에 신고, 최근 글, 이상 기록(너무 높은 점수 등)을 모아 보기
- 기록 남기기
  - 서버 함수에서 중요한 일(로그인 실패, 알림 실패, 정리 작업)을 `logger`로 남기기
  - 토큰, 비밀값, 메일 주소 같은 개인정보는 로그에 남기지 않기
  - 사용자가 문의할 때 화면의 최근 오류를 함께 보내게 하면 원인 찾기가 빨라짐 (`iseohyun.com` 문의 창의 진단 정보)

## 백업

- 실수로 컬렉션을 지우면 복구 수단이 없음
- 방법
  - Firestore **백업 예약**(일간·주간): 콘솔 → Firestore → 재해 복구
  - 특정 시점 복구(PITR): 최근 7일 안의 시점으로 되돌리기
  - `gcloud firestore export`로 Cloud Storage에 내보내기
- 모두 Blaze 요금제에서 사용, 저장 용량만큼 과금
