/**
 * @file functions/index.js
 * @description iseohyun.com 의 Cloud Functions (Firebase 프로젝트 iseohyun, Firestore 위치 asia-northeast3).
 *   notifyContact: 로그인한 사람이 문의를 남기면(contact_messages 문서 생성) 받는 사람(to)의 기기들에 푸시를 보낸다.
 *   - 기기 토큰은 push_tokens/{sha256(token)} 에 uid 와 함께 있다(사이트 문의 창의 알림 아이콘이 적는다).
 *   - 보내는 내용은 data 만 담는다. 알림은 사이트의 /sw.js 가 push 이벤트에서 직접 띄운다.
 *   - 더 이상 쓸 수 없는 토큰은 지운다. 같은 사람이 1분에 한 번만 문의를 적을 수 있는 것은 Firestore 규칙이 맡는다.
 *   kakaoLogin · naverLogin: 카카오 · 네이버 로그인. 사이트의 /auth/{kakao|naver}-callback.html 이 받은 인가 코드를
 *   그 서비스의 토큰으로 바꾸고 사용자 정보를 읽어 Firebase 커스텀 토큰(uid "kakao:{회원번호}" · "naver:{id}")을 돌려준다.
 *   - Client Secret 은 Firebase 비밀값 KAKAO_CLIENT_SECRET · NAVER_CLIENT_SECRET 에 둔다
 *     (firebase functions:secrets:set 이름). 비밀값이 없으면 그 함수는 배포되지 않는다.
 *   - 커스텀 토큰을 만들려면 함수의 서비스 계정에 「서비스 계정 토큰 생성자」 역할이 있어야 한다.
 */
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { setGlobalOptions } = require("firebase-functions/v2");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();
setGlobalOptions({ region: "asia-northeast3", maxInstances: 2 });

const SITE_URL = "https://iseohyun.com/";
// 알림을 누르면 이 주소로 열려 그 대화가 열린다(사이트 contact.js 가 ?chat= 을 읽는다)
const chatUrl = (thread) => `${SITE_URL}?chat=${encodeURIComponent(thread)}`;
const DEAD_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

/** 줄바꿈과 겹친 빈칸을 한 칸으로 줄이고 길이를 자른다 */
function oneLine(text, max) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

exports.notifyContact = onDocumentCreated("contact_messages/{messageId}", async (event) => {
  const data = event.data && event.data.data();
  if (!data) return;

  if (!data.to) return;
  const tokenSnap = await admin.firestore().collection("push_tokens").where("uid", "==", data.to).get();
  const tokenDocs = tokenSnap.docs.filter((d) => typeof d.get("token") === "string" && d.get("token"));
  if (!tokenDocs.length) {
    logger.info("받는 사람의 알림 토큰이 없어 보내지 않음", { messageId: event.params.messageId });
    return;
  }

  let who = data.fromName || "";
  if (!who) {
    try {
      const user = await admin.auth().getUser(data.uid);
      who = user.displayName || user.email || "";
    } catch (err) {
      logger.warn("보낸 사람을 찾지 못함", { uid: data.uid, err: err.message });
    }
  }
  who = who || "로그인한 방문자";

  // 알림 첫 줄(제목)은 보낸 사람, 둘째 줄(본문)은 메시지 내용 그대로
  const thread = data.thread || data.uid;
  const body = oneLine(data.message, 180);
  const messages = tokenDocs.map((d) => ({
    token: d.get("token"),
    data: {
      title: oneLine(data.kind === "mail" ? `${who} (메일 문의)` : who, 60),
      body,
      url: chatUrl(thread),
      thread,
      tag: `chat-${thread}`,
    },
    webpush: { headers: { Urgency: "high", TTL: "86400" } },
  }));

  const result = await admin.messaging().sendEach(messages);
  const dead = [];
  result.responses.forEach((r, i) => {
    if (!r.success && r.error && DEAD_TOKEN_CODES.has(r.error.code)) dead.push(tokenDocs[i].ref.delete());
    else if (!r.success) logger.warn("푸시 실패", { code: r.error && r.error.code });
  });
  await Promise.all(dead);
  logger.info("문의 알림 보냄", { sent: result.successCount, failed: result.failureCount, removed: dead.length });
});

// ---------------------------------------------------------------------------
// 카카오 · 네이버 로그인: 인가 코드를 받아 Firebase 커스텀 토큰을 돌려준다
//   요청: POST {code, state, redirectUri} → 응답: {token}
//   Client ID 는 로그인 화면 주소에 드러나는 공개 값이다(사이트 site-config.js 의 clientId 와 같아야 한다).
//   Client Secret 은 Firebase 비밀값(KAKAO_CLIENT_SECRET · NAVER_CLIENT_SECRET)에만 둔다.
// ---------------------------------------------------------------------------
const LOGIN_ORIGINS = ["https://iseohyun.com", "https://swimmers.iseohyun.com", "http://localhost:8137", "http://localhost:3000"];
const KAKAO_CLIENT_ID = "e10f5dba1343212a115708b84584dad0"; // REST API 키
const KAKAO_CLIENT_SECRET = defineSecret("KAKAO_CLIENT_SECRET");
const NAVER_CLIENT_ID = "f1zKks6XzuAlapalQCEi";
const NAVER_CLIENT_SECRET = defineSecret("NAVER_CLIENT_SECRET");
// 각 개발자 콘솔에 등록한 Redirect(Callback) URI. 이것 말고는 받지 않는다.
const callbackUris = (name) => new Set(LOGIN_ORIGINS.map((o) => `${o}/auth/${name}-callback.html`));
const KAKAO_REDIRECT_URIS = callbackUris("kakao");
const NAVER_REDIRECT_URIS = callbackUris("naver");

/** 로그인 요청의 모양을 확인한다. 맞으면 {code, state, redirectUri}, 아니면 응답을 보내고 null */
function readLoginRequest(req, res, redirectUris) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST 만 받습니다" });
    return null;
  }
  const { code, state, redirectUri } = req.body || {};
  if (typeof code !== "string" || !code || code.length > 512 || !redirectUris.has(redirectUri) ||
      (state !== undefined && (typeof state !== "string" || state.length > 128))) {
    res.status(400).json({ error: "요청이 올바르지 않습니다" });
    return null;
  }
  return { code, state: state || "", redirectUri };
}

/** Firebase 사용자를 만들거나 이름 · 사진을 고친 뒤 커스텀 토큰을 만든다 */
async function issueToken(uid, nickname, photoUrl, provider, fallbackName) {
  const fields = { displayName: oneLine(nickname || fallbackName, 80) };
  if (String(photoUrl || "").startsWith("https://")) fields.photoURL = photoUrl;
  try {
    await admin.auth().updateUser(uid, fields);
  } catch (err) {
    if (err.code !== "auth/user-not-found") throw err;
    await admin.auth().createUser({ uid, ...fields });
  }
  return admin.auth().createCustomToken(uid, { provider });
}

exports.kakaoLogin = onRequest({ cors: LOGIN_ORIGINS, secrets: [KAKAO_CLIENT_SECRET] }, async (req, res) => {
  const input = readLoginRequest(req, res, KAKAO_REDIRECT_URIS);
  if (!input) return;
  try {
    // 1. 인가 코드 → 카카오 액세스 토큰
    const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: KAKAO_CLIENT_ID,
        client_secret: KAKAO_CLIENT_SECRET.value(),
        redirect_uri: input.redirectUri,
        code: input.code,
      }),
    });
    const kakaoToken = await tokenRes.json();
    if (!tokenRes.ok || !kakaoToken.access_token) {
      logger.warn("카카오 토큰 교환 실패", { status: tokenRes.status, error: kakaoToken.error, code: kakaoToken.error_code });
      res.status(401).json({ error: "카카오 인증에 실패했습니다" });
      return;
    }

    // 2. 사용자 정보(회원번호, 닉네임, 프로필 사진)
    const meRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${kakaoToken.access_token}` },
    });
    const me = await meRes.json();
    if (!meRes.ok || !me.id) {
      logger.warn("카카오 사용자 정보 실패", { status: meRes.status });
      res.status(401).json({ error: "카카오 사용자 정보를 읽지 못했습니다" });
      return;
    }
    const profile = (me.kakao_account && me.kakao_account.profile) || (me.properties ? { nickname: me.properties.nickname } : {});

    // 3. Firebase 커스텀 토큰
    const token = await issueToken(`kakao:${me.id}`, profile.nickname, profile.thumbnail_image_url, "kakao", "카카오 사용자");
    res.json({ token });
  } catch (err) {
    logger.error("카카오 로그인 처리 실패", { err: err.message });
    res.status(500).json({ error: "로그인을 처리하지 못했습니다" });
  }
});

exports.naverLogin = onRequest({ cors: LOGIN_ORIGINS, secrets: [NAVER_CLIENT_SECRET] }, async (req, res) => {
  const input = readLoginRequest(req, res, NAVER_REDIRECT_URIS);
  if (!input) return;
  try {
    // 1. 인가 코드 → 네이버 액세스 토큰(네이버는 state 도 함께 보내야 한다)
    const tokenRes = await fetch("https://nid.naver.com/oauth2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: NAVER_CLIENT_ID,
        client_secret: NAVER_CLIENT_SECRET.value(),
        code: input.code,
        state: input.state,
      }),
    });
    const naverToken = await tokenRes.json();
    if (!tokenRes.ok || !naverToken.access_token) {
      logger.warn("네이버 토큰 교환 실패", { status: tokenRes.status, error: naverToken.error, description: naverToken.error_description });
      res.status(401).json({ error: "네이버 인증에 실패했습니다" });
      return;
    }

    // 2. 사용자 정보(고유 id, 별명, 프로필 사진). 결과 코드 "00" 이 성공
    const meRes = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${naverToken.access_token}` },
    });
    const me = await meRes.json();
    const profile = me && me.response;
    if (!meRes.ok || me.resultcode !== "00" || !profile || !profile.id) {
      logger.warn("네이버 사용자 정보 실패", { status: meRes.status, resultcode: me && me.resultcode });
      res.status(401).json({ error: "네이버 사용자 정보를 읽지 못했습니다" });
      return;
    }

    // 3. Firebase 커스텀 토큰
    const token = await issueToken(`naver:${profile.id}`, profile.nickname || profile.name, profile.profile_image, "naver", "네이버 사용자");
    res.json({ token });
  } catch (err) {
    logger.error("네이버 로그인 처리 실패", { err: err.message });
    res.status(500).json({ error: "로그인을 처리하지 못했습니다" });
  }
});

// ---------------------------------------------------------------------------
// Swimmers 백그라운드 웹 푸시 (토큰 등록 & 호출 알람 발송)
//   - action: "register" -> swimmers_push_tokens/{sha256(token)} 에 { compId, swimmerName, token, updatedAt } 저장
//   - action: "send"     -> targetName 일치 기기들에 FCM data-only 푸시 발송 (sw.js 가 앱 종료 상태에서도 알림 표시)
// ---------------------------------------------------------------------------
exports.swimmersPush = onRequest({ cors: LOGIN_ORIGINS }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST 만 받습니다" });
    return;
  }
  const body = req.body || {};
  const action = String(body.action || "").trim();

  try {
    if (action === "register") {
      const token = String(body.token || "").trim();
      const swimmerName = oneLine(body.swimmerName || "", 40);
      const compId = oneLine(body.compId || "", 40);
      if (!token || token.length > 512 || !swimmerName) {
        res.status(400).json({ error: "token 과 swimmerName 이 필요합니다" });
        return;
      }
      const docId = crypto.createHash("sha256").update(token).digest("hex");
      await admin.firestore().collection("swimmers_push_tokens").doc(docId).set({
        token,
        swimmerName,
        compId,
        updatedAt: Date.now(),
      }, { merge: true });
      res.json({ ok: true });
      return;
    }

    if (action === "send") {
      const targetName = oneLine(body.targetName || "", 40);
      const compId = oneLine(body.compId || "", 40);
      if (!targetName) {
        res.status(400).json({ error: "targetName 이 필요합니다" });
        return;
      }
      const snap = await admin.firestore()
        .collection("swimmers_push_tokens")
        .where("swimmerName", "==", targetName)
        .get();
      const tokenDocs = snap.docs.filter((d) => typeof d.get("token") === "string" && d.get("token"));
      if (!tokenDocs.length) {
        res.json({ ok: true, sent: 0, failed: 0 });
        return;
      }

      const title = oneLine(body.title || `[Swimmers 호출] ${targetName}`, 80);
      const msgBody = String(body.body || "소집 호출이 도착했습니다.").slice(0, 240);
      const url = typeof body.url === "string" && body.url.startsWith("https://swimmers.iseohyun.com")
        ? body.url
        : "https://swimmers.iseohyun.com/";
      const tag = oneLine(body.tag || `swimmers-call-${compId || "default"}`, 60);

      const messages = tokenDocs.map((d) => ({
        token: d.get("token"),
        data: { title, body: msgBody, url, tag },
        webpush: { headers: { Urgency: "high", TTL: "1800" } },
      }));

      const result = await admin.messaging().sendEach(messages);
      const dead = [];
      result.responses.forEach((r, i) => {
        if (!r.success && r.error && DEAD_TOKEN_CODES.has(r.error.code)) {
          dead.push(tokenDocs[i].ref.delete());
        } else if (!r.success) {
          logger.warn("Swimmers 푸시 실패", { code: r.error && r.error.code });
        }
      });
      await Promise.all(dead);
      res.json({ ok: true, sent: result.successCount, failed: result.failureCount, removed: dead.length });
      return;
    }

    res.status(400).json({ error: "지원하지 않는 action 입니다" });
  } catch (err) {
    logger.error("swimmersPush 처리 실패", { err: err.message });
    res.status(500).json({ error: "푸시 처리 중 오류가 발생했습니다" });
  }
});
