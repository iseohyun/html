---
title: "QuizApp Common GUI · 이전 프로젝트에서 옮기기"
status: "설계문서"
category: "QuizApp Common GUI"
---
> 판: v0.2.0 · 홈페이지에는 이 문서의 견본이 없습니다.
> 다루는 것: 쓰던 Firebase 프로젝트에서 퀴즈 앱 공용 프로젝트(`quizquiz-quiz`)로 앱을 옮길 때, 로그인 사용자의 기록을 이메일로 이어 주는 방식

# 이전 프로젝트에서 옮기기

Firebase 프로젝트를 옮기면 **같은 Google 계정으로 로그인해도 사용자 ID(UID)가 새로 생깁니다.** UID는 프로젝트마다 따로 매겨지기 때문입니다. 그래서 옛 프로젝트의 `users/{옛 UID}`를 그대로 복사하면 아무도 그 기록의 주인이 되지 못합니다.

퀴즈 앱은 로그인 사용자의 기록을 **이메일을 열쇠로** 한 문서에 모아 두고, 그 사람이 공용 프로젝트에서 처음 로그인할 때 앱이 자기 기록으로 옮겨 받게 합니다. 처음부터 공용 프로젝트에서 시작하는 새 앱은 이 문서가 필요 없습니다.

## 옮기는 것과 방식

| 데이터 | 방식 | 까닭 |
| :--- | :--- | :--- |
| 로그인 사용자의 `users/{옛 UID}`와 하위 컬렉션 | `legacy_users/{이메일}` 한 문서로 모음 → 첫 로그인 때 앱이 옮김 | 새 UID를 옮기는 순간에야 알 수 있음 |
| 비로그인(게스트) 기록 `users/GUEST_…` | 같은 경로로 그대로 복사 | 게스트 ID는 기기의 저장소에 있어 프로젝트와 상관없이 같음 |
| 순위 | 앱 이름 접두어 컬렉션으로 복사(`speedrun_rankings` → `charquiz_speedrun_rankings` 등) | 공용 프로젝트에서는 순위를 앱마다 나눔 |
| 힌트, 따봉 | 같은 경로로 그대로 복사(`char_hints`, `name_hints`는 원래 앱마다 따로) | 문서 안의 이름·글을 그대로 보여 주면 됨 |
| `admins` | 옮기지 않음 | 새 UID로 콘솔에서 다시 만듦([「Firebase 준비」](#/sh-standard/quizapp-common-gui/rules/firebase.md) 「콘솔 준비」 9단계) |

- 순위·힌트 문서에 남은 `uid`는 옛 UID입니다. 「내 힌트 지우기」처럼 본인 여부를 `uid`로 가리는 동작은 옮긴 문서에서는 관리자만 할 수 있습니다. 필요하면 복사할 때 이메일로 새 UID를 찾아 바꿉니다(공용 프로젝트에서 로그인한 사람만 가능).

## legacy_users 문서의 모양

문서 ID는 **소문자로 바꾼 이메일**입니다. 이메일이 없는 계정(이메일 동의를 받지 않은 카카오 계정 등)은 이어 받을 수 없으므로 모으지 않거나 따로 안내합니다.

```text
legacy_users/{email} = {
  email,                       // 소문자 이메일 (문서 ID와 같음)
  oldUid,                      // 옛 프로젝트의 UID (확인용)
  user: { ... },               // users/{옛 UID} 문서의 필드
  progress: {                  // users/{옛 UID}/progress/{도메인}/chars/{문제ID}
    {도메인}: { {문제ID}: { 진도 필드 } }
  },
  subs: {                      // 그 밖의 하위 컬렉션(study_stats, daily_summary 등)
    {하위 컬렉션}: { {문서ID}: { 필드 } }
  }
}
```

- 한 문서는 1MiB를 넘을 수 없습니다. 문제 수가 아주 많은 앱이면 `progress`를 도메인마다 나눈 문서로 바꿉니다.

## 규칙

`firestore.rules`에 다음을 둡니다. 로그인한 본인의 이메일과 문서 ID가 같을 때만 읽고 지울 수 있고, 아무도 앱에서 쓰지 못합니다(모으는 일은 관리자 권한의 복사 스크립트가 함).

```text
match /legacy_users/{email} {
  allow get, delete: if request.auth != null
    && request.auth.token.email is string
    && request.auth.token.email.lower() == email;
}
```

## 앱이 이어 받는 때

앱의 `components/legacy-migration.js`의 `claimLegacyData()`가 맡습니다. `db-handler.js`의 `initUser(uid)`가 **로그인 사용자일 때 진도를 읽기 전에** 한 번 부릅니다.

1. `auth.currentUser.email`을 소문자로 바꿔 `legacy_users/{email}`을 읽습니다. 없으면 바로 끝납니다(대부분의 로그인).
2. `user` 필드를 `users/{새 UID}`에 합치고(`merge`), `progress`를 `users/{새 UID}/progress/{도메인}/chars/{문제ID}`에, `subs`를 `users/{새 UID}/{하위 컬렉션}/{문서ID}`에 씁니다.
3. 쓰기는 450건씩 나눠 일괄 쓰기(`writeBatch`)로 보냅니다(한 번에 500건 한도).
4. 다 쓰면 `legacy_users/{email}`을 지웁니다. 다음 로그인부터는 1단계에서 끝납니다.
5. 읽기나 쓰기가 실패하면 조용히 넘어가고 문서를 남겨 둡니다. 다음 로그인 때 다시 시도합니다.

- **옮기는 하위 컬렉션은 지금 앱이 쓰고 규칙이 허락하는 것만** 고릅니다(`ALLOWED_SUBS = ['study_stats', 'daily_summary']`). 옛 앱이 쓰던 하위 컬렉션(예: CharQuiz의 `sessions`)이 하나라도 섞이면 그 쓰기가 규칙에 막히고, 일괄 쓰기는 **전체가 실패**해 아무것도 옮겨지지 않습니다. 실패해도 조용히 넘어가므로 사용자는 기록이 사라진 것으로 봅니다. 규칙에 하위 컬렉션을 더하면 이 목록도 같이 고칩니다.
- 사용자에게 따로 묻거나 알리지 않습니다. 사용자 눈에는 「새 판에서도 내 기록이 그대로 있음」으로 보이면 됩니다.
- `users/{uid}`를 퀴즈 앱끼리 공유하므로, 한 사람의 `legacy_users` 문서는 **먼저 로그인한 앱이 한 번에** 이어 받습니다. 옛 프로젝트에서 두 앱이 사용자 문서를 함께 썼다면 두 앱의 진도가 함께 옮겨지고, 나중에 연 앱은 할 일이 없습니다.
- 공용 프로젝트에서 이미 기록을 쌓은 뒤 이어 받으면 진도 문서가 옛 기록으로 덮입니다. 옮긴 직후에 앱 판을 바로 올려 공용 프로젝트로 처음 로그인하는 때와 이어 받는 때가 같게 합니다.

## 옮기는 순서

1. 공용 프로젝트를 [「Firebase 준비」](#/sh-standard/quizapp-common-gui/rules/firebase.md)대로 준비하고, 옮길 앱의 웹 앱을 등록하고, `QuizQuiz` 저장소에서 규칙·인덱스·함수를 배포합니다. 규칙에 `legacy_users`가 들어 있어야 합니다.
2. 앱에 `legacy-migration.js`와 `initUser`의 호출을 넣어 둡니다(아직 옛 프로젝트를 가리키는 상태로 배포해도 문서가 없으니 아무 일도 없습니다).
3. 관리자 권한(서비스 계정 또는 `gcloud auth application-default login`)으로 복사 스크립트를 돌립니다. 옛 프로젝트의 Authentication 사용자 목록에서 UID → 이메일을 얻고, 로그인 사용자는 `legacy_users/{email}`로, 게스트·힌트는 같은 경로로, 순위는 앱 이름 접두어 컬렉션으로 공용 프로젝트에 씁니다.
4. 앱의 설정 파일 세 곳(`firebase-config.js`, `firebase-messaging-sw.js`, `app-config.js`)을 공용 프로젝트와 그 앱의 웹 앱 값으로 바꾸고, 순위 컬렉션 이름을 접두어 이름으로 바꾸고, 앱 판을 올립니다. 앱 저장소의 Firebase 배포 파일(`firebase.json`, `.firebaserc`, `firestore.rules` 등)은 지웁니다.
5. 본인 계정으로 로그인해 기록이 보이는지, `legacy_users`에서 자기 문서가 사라졌는지 확인합니다.
6. 한동안 옛 프로젝트를 남겨 둡니다. 남은 `legacy_users` 문서 수가 줄지 않으면 이어 받지 못한 사용자이므로, 옛 프로젝트를 정리하기 전에 기록을 따로 보관합니다.

> 참조: 2026-11에 CharQuiz와 NameQuiz가 함께 쓰던 `kana-loop`에서 공용 프로젝트 `quizquiz-quiz`로 옮길 때 정한 방식입니다. 두 앱의 `components/legacy-migration.js`가 같은 코드입니다.
