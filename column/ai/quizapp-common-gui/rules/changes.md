---
title: "QuizApp Common GUI · 판 이력"
status: "설계문서"
category: "QuizApp Common GUI"
---
> 판: v0.2.0 · 홈페이지에는 이 문서의 견본이 없습니다.
> 다루는 것: 판마다 바뀐 항목, 앱이 새 판을 받아 가는 방법, 판을 올리는 규칙

# 판 이력

QuizApp Common GUI가 바뀔 때마다 바뀐 항목을 한 줄씩 적고 항목 ID를 붙입니다. 받아 가는 방법은 WebApp Common GUI의 [「판 이력」](#/column/ai/webapp-common-gui/rules/changes.md)과 같습니다. 앱은 자기가 어느 판까지 확인했는지 기록해 두고, 그보다 새 판의 항목만 하나씩 골라 받습니다.

## 지금 판

| 항목 | 값 |
| :--- | :--- |
| 판 | v0.2.0 |
| 날짜 | 2026-11-19 |

## 바뀐 항목

새 판이 위에 옵니다.

| 항목 ID | 판 | 날짜 | 종류 | 무엇이 | 앱에 할 일 | 규칙 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `season-stage` | v0.2.0 | 2026-11-19 | 추가 | 요약 카드 뒤의 계절·날씨 무대. 날씨는 IP 위치로 짐작(위치 권한 없음, 1시간 저장), 설정 「날씨 반영」으로 끔 | 무대를 넣고 설정에 스위치를 단다 | [「처음 화면」](#/column/ai/quizapp-common-gui/rules/home.md) 「계절·날씨 무대」 |
| `guest-ranking` | v0.2.0 | 2026-11-19 | 바꿈 | 게스트는 학습·기록은 하되 순위에 올리지 않음. 결과 창 아래 안내 줄, 결과 창이 없으면 「순위 안내」 창(학습 모드는 앱을 열 때마다 한 번). 규칙도 본인 `uid`만 순위를 만듦. CharQuiz·NameQuiz 공통 | 순위 등록 앞에 로그인 확인, 안내 줄이나 안내 창, `QuizQuiz` 규칙 고치기 | [「처음 화면」](#/column/ai/quizapp-common-gui/rules/home.md) 「게스트와 순위」 |
| `combo` | v0.2.0 | 2026-11-19 | 추가 | 학습 모드 연속 정답 「N COMBO!」(2연속부터, 5·10·20·30…은 크게) | `combo-fx.js`와 CSS를 넣고 학습 답 처리에서 정답일 때 부른다 | [「문제 화면」](#/column/ai/quizapp-common-gui/rules/quiz.md) 「Combo」 |
| `install-sister` | v0.2.0 | 2026-11-19 | 추가 | 알림함 맨 위의 「홈 화면에 앱 설치」 줄과 「QuizQuiz 자매품」 링크, 설정 도구 줄의 설치 단추 | `install-prompt.js`, `sister-apps.js`를 넣고 모든 퀴즈 앱의 자매품 목록에 새 앱을 더한다 | [「알림함」](#/column/ai/quizapp-common-gui/rules/inbox.md) |
| `help-version` | v0.2.0 | 2026-11-19 | 추가 | 도움말을 전체 화면으로, 맨 아래에 앱 판·빌드·QuizApp Common GUI 판 표시 | `index.html`에 `window.QUIZAPP_GUI_VERSION`을 두고 도움말에 세 줄을 단다 | [「설정·순위·학습현황」](#/column/ai/quizapp-common-gui/rules/screens.md) 「도움말」 |
| `system-bar-white` | v0.2.0 | 2026-11-19 | 추가 | 상태 바·아래 버튼 줄·시작 화면을 흰색으로 | 매니페스트 두 값과 `theme-color`를 `#ffffff`로 | [「개요」](#/column/ai/quizapp-common-gui/rules/overview.md) 「시스템 바 색」 |
| `quiz-base` | v0.1.0 | 2026-11-19 | 추가 | 첫 판. CharQuiz와 NameQuiz의 실제 동작을 바탕으로 처음 화면, 문제 화면, 학습 결과, 설정·순위·학습현황, 힌트, 알림함을 정리 | 새 퀴즈 앱은 이 판을 기준 판으로 삼는다 | [「개요」](#/column/ai/quizapp-common-gui/rules/overview.md) |
| `firebase-shared` | v0.1.0 | 2026-11-19 | 추가 | 퀴즈 앱 공용 Firebase 프로젝트 `quizquiz-quiz`. 앱마다 웹 앱(`appId`), 순위·힌트는 앱 이름 접두어 컬렉션, `users/{uid}` 공유, 배포는 `QuizQuiz` 저장소에서만 | 새 앱은 웹 앱을 등록하고 접두어 컬렉션의 규칙·인덱스를 `QuizQuiz`에 더한다 | [「Firebase 준비」](#/column/ai/quizapp-common-gui/rules/firebase.md) |
| `legacy-users` | v0.1.0 | 2026-11-19 | 추가 | 이전 프로젝트의 로그인 기록을 `legacy_users/{이메일}`에 모아 첫 로그인 때 이어 받음. 하위 컬렉션은 규칙이 허락하는 것만 옮김 | 프로젝트를 옮기는 앱만 | [「이전 프로젝트에서 옮기기」](#/column/ai/quizapp-common-gui/rules/migration.md) |

## 앱 쪽 기록

각 앱의 `.agents/rules/quizapp-common-gui.md`에 둡니다. 형식은 WebApp Common GUI의 기록(`.agents/rules/common-gui.md`)과 같고, 두 기록은 따로 둡니다.

```markdown
# QuizApp Common GUI 동기화 기록

- 확인한 판: v0.2.0 (2026-11-19)
- 앱의 표시: `index.html`의 `window.QUIZAPP_GUI_VERSION = "v0.2.0"`(도움말 맨 아래에 보임)

| 항목 ID | 판 | 결정 | 날짜 | 메모 |
| :--- | :--- | :--- | :--- | :--- |
| quiz-base | v0.1.0 | 적용 | 2026-11-19 | |
| combo | v0.2.0 | 적용 | 2026-11-19 | |
```

## 판을 올리는 규칙

| 바뀐 것 | 올리는 자리 | 예 |
| :--- | :--- | :--- |
| 규칙의 동작을 바꾸거나 없앰 | 가운데 | v0.1.0 → v0.2.0 |
| 규칙을 더함 | 끝 | v0.1.0 → v0.1.1 |
| 글 다듬기, 자리 옮기기 | 올리지 않음 | — |

- 판은 사용자가 확인하고 정해 준 번호로만 올립니다.
- 판을 올리면 이 문서의 「지금 판」과 바뀐 문서 맨 위의 판 표시를 같이 고칩니다.
- 앱이 새 판을 받아 가면 앱 쪽 기록의 「확인한 판」과 `window.QUIZAPP_GUI_VERSION`을 같이 올립니다. 사용자는 도움말 맨 아래에서 앱이 어느 판을 따르는지 봅니다.
