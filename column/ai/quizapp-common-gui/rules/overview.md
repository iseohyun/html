---
title: "QuizApp Common GUI · 개요"
status: "설계문서"
category: "QuizApp Common GUI"
---
> 판: v0.1.0 · 홈페이지에는 이 문서의 견본이 없습니다.
> 다루는 것: 퀴즈 앱 계열이 같이 쓰는 화면과 동작의 지도, 앱마다 바꾸는 곳, 새 앱을 낼 때의 순서

# QuizApp Common GUI

간격 반복으로 익히는 4지선다 퀴즈 앱들이 같이 쓰는 화면과 동작입니다. 대상은 CharQuiz(문자), NameQuiz(캐릭터 이름)와 출시 예정인 NationQuiz(나라), WordQuiz(단어)입니다.

- 화면 틀, 로그인, 설치, 업데이트 알림, 푸시 알림처럼 퀴즈가 아닌 앱에도 쓰는 규칙은 [WebApp Common GUI](#/column/ai/webapp-common-gui/rules/screen.md)를 따릅니다. 이 묶음은 그 위에 퀴즈 앱만의 것을 더합니다.
- 규칙은 두 앱의 실제 코드(`main.js`, `components/`, `view/`)에서 옮겼습니다. 두 앱이 다른 곳은 표에 둘 다 적고, 새 앱이 따를 쪽을 「기본」으로 정했습니다.
- 백엔드는 퀴즈 앱 전체가 Firebase 프로젝트 하나(`quizquiz-quiz`)를 함께 쓰고, 규칙·인덱스·함수는 공용 저장소 `QuizQuiz`에서만 배포합니다([「Firebase 준비」](#/column/ai/quizapp-common-gui/rules/firebase.md)).

## 문서 지도

| 문서 | 다루는 것 |
| :--- | :--- |
| [「처음 화면」](#/column/ai/quizapp-common-gui/rules/home.md) | 헤더, 모드 카드(학습 / 기록 20문제·30초 / 관전), 학습범위 요약 카드 |
| [「문제 화면」](#/column/ai/quizapp-common-gui/rules/quiz.md) | 간격 반복 엔진, 출제, 같은 발음·같은 이름 보기 막기, 채점, 단축키 |
| [「학습 결과」](#/column/ai/quizapp-common-gui/rules/result.md) | 학습 결과표(맞힘, 응답속도 이전→이번, 상태 5가지) |
| [「설정·순위·학습현황」](#/column/ai/quizapp-common-gui/rules/screens.md) | 전체 화면 설정, 리더보드, 학습현황 |
| [「힌트」](#/column/ai/quizapp-common-gui/rules/hints.md) | 기본 힌트, 사용자 힌트 1개, 따봉, 힌트 따봉 순위, 여는 곳 |
| [「알림함」](#/column/ai/quizapp-common-gui/rules/inbox.md) | 알림함, 읽지 않은 수 배지, 설정 톱니의 new 점 |
| [「Firebase 준비」](#/column/ai/quizapp-common-gui/rules/firebase.md) | 공용 프로젝트의 구조, 콘솔 준비, 배포, 새 앱을 더하는 순서 |
| [「이전 프로젝트에서 옮기기」](#/column/ai/quizapp-common-gui/rules/migration.md) | 옛 프로젝트의 로그인 기록을 이메일(`legacy_users`)로 이어 받기 |
| [「판 이력」](#/column/ai/quizapp-common-gui/rules/changes.md) | 판마다 바뀐 항목과 받아 가는 법 |

## 두 앱의 현재 모습

CharQuiz가 기능이 더 많고, NameQuiz는 그림 문제와 질문 퀴즈가 있습니다. 새 앱은 CharQuiz 쪽을 기본으로 삼습니다.

| 기능 | CharQuiz | NameQuiz | 새 앱의 기본 |
| :--- | :--- | :--- | :--- |
| 기록 모드 | 20문제 + 30초 | 20문제 | 둘 다 |
| 학습범위 요약 카드 | 있음(범위 여러 개 함께) | 안내 카드(시즌 하나) | 요약 카드 |
| 학습 결과표 | 있음 | 없음 | 있음 |
| 학습현황에서 힌트 | 길게 누르기 | 상세 프로필의 대표 힌트 | 길게 누르기 |
| 알림함 입구 | 설정 화면의 종 | 헤더의 종 | 설정 화면의 종 + 톱니 new 점 |
| 설정 톱니 new 점 | 있음 | 없음 | 있음 |
| 기록을 마친 뒤 | 처음 화면 | 리더보드를 열고 방금 기록을 강조 | 리더보드를 열고 강조 |
| 다국어 / 소리 | 있음 / 있음 | 없음 / 없음(그림) | 앱마다 |

## 앱마다 바꾸는 곳

| 자리 | 바꿀 것 |
| :--- | :--- |
| 문제 데이터 | 도메인(범위) 목록, 문제마다 고정 ID(진도의 열쇠), 보기에 쓸 이름, 같은 답을 가리는 열쇠. 늘리기 쉬운 NameQuiz 방식(`character-data.js` + 표 파일 + 그림 폴더)을 권합니다. |
| 엔진 | 같은 보기 막기 열쇠, 조기 소환 기준(CharQuiz 1200ms, NameQuiz 1500ms) |
| 저장 이름 | localStorage 접두(`CHARQUIZ_`, `NAMEQUIZ_`), 알림함 IndexedDB 이름(`charquiz-inbox`), 서비스 워커와 주고받는 메시지 이름 |
| Firestore | 순위 컬렉션 접두어(`{앱}_speedrun_rankings` 등), 힌트 컬렉션 이름(`{앱}_hints`), 사용자 문서의 설정 필드(`{앱}Config`), 다른 앱과 겹치지 않는 범위 이름. 규칙·인덱스는 `QuizQuiz` 저장소에 더합니다. |
| Firebase 웹 앱 | 공용 프로젝트에 앱마다 웹 앱을 등록해 받은 `firebaseConfig`(`appId`가 앱마다 다름). `ENDPOINTS`와 `FCM_VAPID_KEY`는 퀴즈 앱끼리 같음 |
| `index.html` | 제목, `APP_VERSION`, `CACHE_BUST`, 헤더의 범위 단추 글자, 매니페스트 |
| 문구 | 모드 카드 설명, 복습 알림 제목·본문, 공유 문구, 도움말(`view/help.html`), 힌트 입력칸 예시 |
| `components/hint-seeds.js` | 새 데이터의 기본 힌트 |

## 새 앱을 낼 때

1. CharQuiz 저장소의 `components/`, `view/`, `main.js`, `common.css`를 바탕으로 시작합니다.
2. [「Firebase 준비」](#/column/ai/quizapp-common-gui/rules/firebase.md)의 「새 퀴즈 앱을 더할 때」를 합니다.
3. 위 「앱마다 바꾸는 곳」을 차례로 바꿉니다.
4. 이 묶음의 각 문서를 보며 화면이 규칙대로인지 확인합니다.
5. 앱의 `.agents/rules/quizapp-common-gui.md`에 확인한 판을 적습니다([「판 이력」](#/column/ai/quizapp-common-gui/rules/changes.md)).
