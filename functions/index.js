/**
 * @file functions/index.js
 * @description iseohyun.com 의 Cloud Functions (Firebase 프로젝트 iseohyun, Firestore 위치 asia-northeast3).
 *   notifyContact: 로그인한 사람이 문의를 남기면(contact_messages 문서 생성) 받는 사람(to)의 기기들에 푸시를 보낸다.
 *   - 기기 토큰은 push_tokens/{sha256(token)} 에 uid 와 함께 있다(사이트 문의 창의 알림 아이콘이 적는다).
 *   - 보내는 내용은 data 만 담는다. 알림은 사이트의 /sw.js 가 push 이벤트에서 직접 띄운다.
 *   - 더 이상 쓸 수 없는 토큰은 지운다. 같은 사람이 1분에 한 번만 문의를 적을 수 있는 것은 Firestore 규칙이 맡는다.
 */
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();
setGlobalOptions({ region: "asia-northeast3", maxInstances: 2 });

const SITE_URL = "https://iseohyun.com/";
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

  let who = "로그인한 방문자";
  try {
    const user = await admin.auth().getUser(data.uid);
    who = user.displayName || user.email || who;
  } catch (err) {
    logger.warn("보낸 사람을 찾지 못함", { uid: data.uid, err: err.message });
  }

  const page = oneLine(data.page, 40);
  const body = (page ? `[${page}] ` : "") + oneLine(data.message, 140);
  const messages = tokenDocs.map((d) => ({
    token: d.get("token"),
    data: {
      title: oneLine(`${data.kind === "mail" ? "새 메일 문의" : "새 문의"} · ${who}`, 60),
      body,
      url: SITE_URL,
      tag: `contact-${event.params.messageId}`,
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
