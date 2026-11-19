---
title: "QuizApp Common GUI · Firebase 준비"
status: "설계문서"
category: "QuizApp Common GUI"
---
> 판: v0.2.0 · 홈페이지에는 이 문서의 견본이 없습니다.
> 다루는 것: 퀴즈 앱 전체가 함께 쓰는 Firebase 프로젝트 하나의 구조, 처음 한 번의 콘솔 준비, 새 퀴즈 앱을 더하는 순서

# Firebase 준비

퀴즈 앱은 **Firebase 프로젝트 하나를 함께 씁니다.** 프로젝트 ID는 `quizquiz-quiz`, 표시 이름은 「QuizQuiz」입니다. 규칙·인덱스·함수는 공용 백엔드 저장소 `QuizQuiz` 한 곳에서만 배포하고, 앱 저장소(CharQuiz, NameQuiz, …)에는 Firebase 배포 파일을 두지 않습니다.

## 하나로 묶은 까닭

처음에는 CharQuiz와 NameQuiz가 `kana-loop`를 같이 쓰다가 앱마다 프로젝트를 나누려 했지만, 다시 퀴즈 앱 전체를 한 프로젝트로 묶었습니다. Google Workspace나 비즈니스 계정은 만들 수 있는 프로젝트 수와 한 결제 계정에 연결할 수 있는 프로젝트 수에 한도가 있어, 앱을 낼 때마다 프로젝트를 늘리기 어렵습니다. 자매품끼리는 한 계정으로 로그인하고 사용자 문서를 함께 쓰는 편이 자연스럽습니다. 무료 사용량도 프로젝트마다의 `(default)` 데이터베이스 하나를 기준으로 주어지므로, 작은 앱 여럿이 한 데이터베이스를 나눠 쓰면 무료 범위 안에 머물기 쉽습니다.

## 구조

| 부분 | 함께 쓰나 | 규칙 |
| :--- | :--- | :--- |
| Firebase 프로젝트 | 함께 | `quizquiz-quiz` 하나. 프로젝트 ID는 바꿀 수 없고 표시 이름만 바꿀 수 있습니다. |
| 웹 앱(`appId`) | **앱마다** | 앱마다 웹 앱을 따로 등록합니다. 아래 「웹 앱을 나누는 까닭」 |
| Authentication | 함께 | 한 계정으로 모든 퀴즈 앱에 로그인합니다. UID가 앱끼리 같습니다. |
| Firestore | 함께 | `(default)` 데이터베이스 하나, `asia-northeast3`(서울) |
| `users/{uid}` | 함께 | 앱끼리 공유합니다. 진도는 범위(도메인) 이름으로 나뉘므로 **범위 이름이 앱끼리 겹치지 않게** 정합니다. |
| 순위 | 앱마다 | 앱 이름 접두어 컬렉션: `charquiz_speedrun_rankings`, `charquiz_study_rankings`, `charquiz_timeattack_rankings`, `namequiz_speedrun_rankings`, `namequiz_study_rankings`. 누구나 읽고, 만들기는 로그인한 본인 `uid`만(`isOwnRanking()`, 두 앱 공통), 학습 순위는 본인 문서(`{uid}_…`)만 고치기, 나머지 고치기·지우기는 관리자. 새 앱의 순위 규칙도 같게 둡니다. |
| 힌트 | 앱마다 | `char_hints`·`char_hint_likes`(CharQuiz), `name_hints`·`name_hint_likes`(NameQuiz). 새 앱은 `{앱}_hints`, `{앱}_hint_likes` |
| VAPID 키 | 함께 | 웹 푸시 인증서는 프로젝트에 하나 |
| 함수 | 함께 | 카카오·네이버 로그인, 복습 알림 예약·발송. `us-central1` |
| Cloud Tasks 큐 | 함께 | `asia-northeast3`의 `notification-queue` |

- 사용자 문서 안의 앱 설정은 필드 이름에 앱 이름을 붙입니다(NameQuiz는 `namequizConfig`, `namequizConfigUpdatedAt`). 접두어 없이 `config`를 쓰면 다른 앱의 설정을 덮어씁니다. CharQuiz는 처음 앱이라 `config`를 쓰고 있으므로, 새 앱은 반드시 접두어를 붙입니다.

## 웹 앱을 나누는 까닭

CharQuiz와 NameQuiz는 같은 도메인(`iseohyun.github.io`)의 하위 폴더에서 열립니다. Firebase는 받은 알림 토큰을 도메인 단위 저장소(IndexedDB `firebase-messaging-database`)에 `appId`를 열쇠로 하나만 적어 둡니다. 두 앱이 `appId`를 함께 쓰면 한 앱이 토큰을 받을 때 다른 앱의 기록을 보고 그 토큰을 지운 뒤 새로 받습니다. 두 앱을 번갈아 열 때마다 서로의 토큰이 지워져 예약해 둔 복습 알림이 오지 않습니다. 자세한 내용은 WebApp Common GUI의 [「푸시 알림」](#/column/ai/webapp-common-gui/rules/push.md) 「한 사이트에 앱이 여럿일 때」에 있습니다.

| 웹 앱 | appId |
| :--- | :--- |
| CharQuiz | `1:47580752278:web:8d823880e319c0fc1615b7` |
| NameQuiz | `1:47580752278:web:5512a584a3e83b651615b7` |

## 콘솔 준비 (한 번만)

공용 프로젝트를 만들 때 한 번 합니다. 이미 끝났으므로 새 앱을 더할 때는 다음 절 「새 퀴즈 앱을 더할 때」만 하면 됩니다.

| 순서 | 할 일 | 빠지면 |
| :--- | :--- | :--- |
| 1 | 프로젝트 만들기. 만들 때 연필 아이콘으로 프로젝트 ID를 먼저 고릅니다(나중에 바꿀 수 없음). | — |
| 2 | Firestore 「데이터베이스 만들기」: ID `(default)`, 위치 `asia-northeast3`. 위치도 나중에 바꿀 수 없습니다. | 기록·순위·힌트가 저장되지 않음 |
| 3 | Blaze 요금제로 올리고, 결제 계정에 예산 알림을 겁니다. | 함수 배포가 거절됨 |
| 4 | Authentication에서 Google을 켜고, 승인된 도메인에 `iseohyun.github.io`, `localhost`를 넣습니다. 다른 도메인에서도 열면 그 도메인도 넣습니다. | 로그인 창이 「승인되지 않은 도메인」으로 닫힘 |
| 5 | 「프로젝트 설정」 → 「클라우드 메시징」 → 「웹 푸시 인증서」에서 키 쌍을 만들고 공개키를 받습니다. | 알림 토큰을 받지 못함 |
| 6 | Google Cloud 콘솔에서 「Cloud Tasks API」를 켜고, `asia-northeast3`에 `notification-queue` 큐를 만듭니다. | 복습 알림 예약이 500으로 실패 |
| 7 | 함수의 서비스 계정 `{프로젝트 번호}-compute@developer.gserviceaccount.com`에 「서비스 계정 토큰 생성자」(`roles/iam.serviceAccountTokenCreator`)를 줍니다. | 카카오·네이버 로그인만 실패 |
| 8 | `QuizQuiz` 저장소에서 규칙·인덱스·함수를 배포합니다(아래 「배포」). | 규칙이 테스트 모드로 남거나 순위 조회가 인덱스 오류로 멈춤 |
| 9 | 관리자 계정으로 앱에 한 번 로그인한 뒤, Firestore 콘솔에서 `admins` 컬렉션에 **문서 ID = 그 UID**인 문서를 만듭니다. | 관리자 기능(순위·힌트 지우기)이 막힘 |

```bash
gcloud tasks queues create notification-queue --location=asia-northeast3 --project=quizquiz-quiz
```

```bash
gcloud projects add-iam-policy-binding quizquiz-quiz --member=serviceAccount:47580752278-compute@developer.gserviceaccount.com --role=roles/iam.serviceAccountTokenCreator
```

- **이름 붙은 데이터베이스를 만들지 않습니다.** 무료 사용량은 `(default)` 데이터베이스에만 있고, 이름 붙은 데이터베이스는 첫 읽기부터 요금이 붙습니다. `npx.cmd firebase-tools firestore:databases:list --project quizquiz-quiz`로 `(default)` 한 줄만 있는지 확인합니다.
- 카카오·네이버는 Authentication의 제공자로 켜지 않습니다. 함수가 카카오·네이버 계정을 확인한 뒤 **커스텀 토큰**을 만들어 주고, 앱이 그 토큰으로 로그인합니다. 7단계의 역할이 그래서 필요합니다. Google 로그인은 이 역할 없이도 되므로 빠진 것을 놓치기 쉽습니다.
- 큐는 서울에 있지만 함수는 지역을 정하지 않아 `us-central1`에 배포됩니다. 발송 주소는 **함수의 지역**으로 만듭니다. 큐의 지역으로 만들면 404가 나고 작업이 큐에 쌓입니다.
- 함수의 기본 서비스 계정에 「편집자」 역할이 없는 프로젝트라면 「Cloud Tasks 큐에 추가자」(`roles/cloudtasks.enqueuer`)도 줍니다.

## 배포

`QuizQuiz` 저장소에만 다음 파일이 있습니다.

| 파일 | 내용 | git |
| :--- | :--- | :--- |
| `firebase.json` | `firestore`(rules, indexes)와 `functions`(source `functions`) | 올림 |
| `.firebaserc` | `{"projects": {"default": "quizquiz-quiz"}}` | 올림 |
| `firestore.rules` | 모든 앱의 규칙 | 올림 |
| `firestore.indexes.json` | 모든 앱의 순위 복합 인덱스 | 올림 |
| `functions/` | 로그인·알림 함수(Node 24, `firebase-functions` 2세대) | 올림 |
| `functions/.env` | 카카오·네이버 비밀값(`KAKAO_REST_API_KEY`, `KAKAO_CLIENT_SECRET`, `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`) | **올리지 않음.** `.gitignore`에 `.env`, `.env.*` |

```bash
npx.cmd -y firebase-tools deploy --only firestore,functions --project quizquiz-quiz
```

- 첫 줄의 `Deploying to 'quizquiz-quiz'`를 확인합니다.
- 인덱스는 배포 뒤 만들어지는 데 몇 분 걸립니다. 그동안 리더보드가 「인덱스 필요」 오류를 낼 수 있습니다.
- 함수를 고치면 앱 판과 따로 다시 배포해야 반영됩니다. 이미 큐에 들어간 작업은 옛 주소를 그대로 씁니다.
- 앱 하나를 위해 규칙을 고쳐도 **모든 앱의 규칙이 함께 배포됩니다.** 배포 전에 다른 앱의 컬렉션 규칙을 건드리지 않았는지 차이를 봅니다.

## 앱의 설정 파일

앱 저장소에는 배포 파일 대신 다음 세 곳만 둡니다.

| 파일 | 넣을 값 |
| :--- | :--- |
| `components/firebase-config.js` | 그 앱 웹 앱의 `firebaseConfig` 여섯 값(`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`) |
| `firebase-messaging-sw.js` | `firebase.initializeApp({...})`에 **같은** 여섯 값. 화면과 서비스 워커의 `appId`가 다르면 토큰을 받는 쪽과 받는 쪽이 다른 앱이 됩니다. |
| `components/app-config.js` | `ENDPOINTS`의 세 주소(`https://us-central1-quizquiz-quiz.cloudfunctions.net/naverLogin`, `/kakaoLogin`, `/scheduleNotification`)와 `FCM_VAPID_KEY`(프로젝트의 공개키) |

- 여섯 값과 VAPID 공개키는 브라우저에 공개되는 식별자이고 비밀값이 아닙니다. 보호는 규칙과 승인 도메인이 맡습니다.
- 값을 바꾼 뒤 앱 판(빌드 표시)을 올려야 이미 앱을 연 사용자도 새 설정을 받습니다.

## 새 퀴즈 앱을 더할 때

NationQuiz, WordQuiz처럼 앱을 더할 때 하는 일입니다.

1. **웹 앱 등록**: Firebase 콘솔 「프로젝트 설정」 → 「앱 추가」 → 웹. 닉네임은 앱 이름, 호스팅은 설정하지 않습니다. 받은 `firebaseConfig`를 앱의 `firebase-config.js`와 `firebase-messaging-sw.js`에 넣습니다.
2. **이름 정하기**: 순위 컬렉션 `{앱}_speedrun_rankings`, `{앱}_study_rankings`(30초 타임어택을 쓰면 `{앱}_timeattack_rankings`), 힌트 컬렉션 `{앱}_hints`, `{앱}_hint_likes`, 사용자 문서의 설정 필드 `{앱}Config`. 범위(도메인) 이름은 다른 앱과 겹치지 않게 합니다.
3. **규칙과 인덱스**: `QuizQuiz` 저장소의 `firestore.rules`에 새 컬렉션의 규칙(기존 앱 것을 복사해 범위 목록과 항목 필드를 바꿈)을, `firestore.indexes.json`에 순위 인덱스를 더해 배포합니다.
4. **함수**: 카카오·네이버 계정을 기존 계정에 합칠 때 진도를 옮기는 범위 목록(`functions/index.js`의 `PROGRESS_DOMAINS`)에 새 앱의 범위를 더해 배포합니다.
5. **카카오·네이버**: 두 개발자 콘솔에 새 앱의 주소(`APP_BASE_URL`, 예: `https://iseohyun.com/NationQuiz/`)를 리다이렉트 URI로 글자 하나까지 같게 더합니다.
6. **앱 설정**: `app-config.js`의 `ENDPOINTS`와 `FCM_VAPID_KEY`는 다른 퀴즈 앱과 같은 값을 넣습니다.
7. **확인**: 로그인 → 학습 한 판 → Firestore에 `users/{uid}/progress/{새 범위}/…`가 생겼는지, 리더보드가 열리는지, 설정의 알림 줄이 「마지막 예약: … 알림 예정」인지 봅니다. 다른 퀴즈 앱을 열어 그 앱의 알림 예약도 여전히 되는지 봅니다(`appId` 충돌 확인).

## 이전 프로젝트에서 옮겨 온 기록

CharQuiz와 NameQuiz는 `kana-loop`에서 옮겨 왔습니다. 로그인 사용자 기록은 이메일로 이어 받습니다. 자세한 방식은 [「이전 프로젝트에서 옮기기」](#/column/ai/quizapp-common-gui/rules/migration.md)에 있습니다. 처음부터 공용 프로젝트에서 시작하는 새 앱은 할 일이 없습니다.

> 참조: 공용 백엔드 저장소 `QuizQuiz`의 `README.md`, 각 앱의 `.agents/rules/firebase-migration.md`.
