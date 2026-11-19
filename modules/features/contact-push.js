/**
 * @file modules/features/contact-push.js
 * @module SiteModules.ContactPush
 * @description 문의를 받는 사람의 기기에 푸시로 알리는 화면 쪽 부분.
 *   - sendMessage: 로그인한 사람의 문의를 Firestore contact_messages 에 적는다(받는 사람 to, 종류 kind).
 *     관리자가 아니면 받는 사람은 관리자만 되고, 같은 일괄 쓰기에서 contact_rate/{uid}.lastAt 을 고쳐야
 *     규칙이 받아 준다(같은 사람 1분에 한 번). 문서가 생기면 Cloud Functions notifyContact 가
 *     받는 사람의 기기들(push_tokens 의 uid 가 같은 것)에 푸시를 보낸다(functions/index.js).
 *   - enable/disable: 로그인한 사람이 이 기기에서 알림을 켜고 끈다. 토큰은 push_tokens/{sha256(token)} 에 둔다.
 *     푸시는 사이트의 서비스 워커(/sw.js)가 받아 알림을 띄운다.
 *   - 로그인해 있는 동안 presence/{uid} 에 이름과 마지막으로 본 때를 적는다. 관리자만 읽어
 *     「받는 사람」 목록(지금 로그인해 있는 사람)을 만든다.
 *   Firestore·Messaging SDK 는 필요할 때만 불러온다.
 * @requires SiteModules.Config, SiteModules.Auth
 * @exports sendMessage, listRecipients, isSupported, isOn, enable, disable, startPresence
 */

window.SiteModules = window.SiteModules || {};

window.SiteModules.ContactPush = (function () {
  // 이 기기에서 켠 알림 토큰(끌 때 서버의 토큰 문서를 지우려고 기억한다)
  const TOKEN_KEY = "iseohyun_push_token_v1";
  // 이만큼 안에 사이트를 본 사람을 「지금 로그인해 있음」으로 본다
  const ONLINE_WINDOW_MS = 15 * 60 * 1000;
  // 로그인해 있는 동안 presence 를 고치는 간격
  const PRESENCE_INTERVAL_MS = 5 * 60 * 1000;

  let presenceTimer = null;
  let lastPresenceAt = 0;

  async function loadFirebase(withMessaging) {
    const Auth = window.SiteModules.Auth;
    await Auth.ready();
    const base = `https://www.gstatic.com/firebasejs/${window.SiteModules.Config.firebaseSdkVersion}`;
    if (!window.firebase.firestore) await Auth.loadScript(`${base}/firebase-firestore-compat.js`);
    if (withMessaging && !window.firebase.messaging) await Auth.loadScript(`${base}/firebase-messaging-compat.js`);
    return window.firebase;
  }

  async function sha256Hex(text) {
    const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  }

  function readToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (err) { return ""; }
  }

  function writeToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (err) {
      console.warn("[ContactPush] 알림 토큰을 기억하지 못했습니다:", err);
    }
  }

  function displayName(user) {
    return String(user.displayName || (user.email || "").split("@")[0] || "이름 없음").slice(0, 80);
  }

  async function currentUser(withMessaging) {
    const fb = await loadFirebase(withMessaging);
    const user = fb.auth().currentUser;
    if (!user) throw new Error("먼저 로그인해 주세요");
    return { fb, user };
  }

  /** 관리자 uid 목록(admins 컬렉션) */
  async function adminUids(fb) {
    const snap = await fb.firestore().collection("admins").get();
    return snap.docs.map(doc => doc.id);
  }

  /**
   * 받는 사람 목록. 맨 앞은 기본값.
   * 관리자: 나, 그다음 지금 로그인해 있는 사람들. 그 밖의 사람: 관리자 한 명뿐.
   * @returns {Promise<Array<{uid: string, label: string}>>}
   */
  async function listRecipients() {
    const { fb, user } = await currentUser(false);
    const isAdmin = window.SiteModules.Auth.isAdmin();
    if (!isAdmin) {
      const admins = await adminUids(fb);
      return admins.length ? [{ uid: admins[0], label: "관리자" }] : [];
    }
    const db = fb.firestore();
    const since = new Date(Date.now() - ONLINE_WINDOW_MS);
    const [online, tokens] = await Promise.all([
      db.collection("presence").where("lastSeen", ">=", since).get(),
      db.collection("push_tokens").get()
    ]);
    const withPush = new Set(tokens.docs.map(doc => doc.get("uid")));
    const mark = uid => (withPush.has(uid) ? "" : " · 알림 꺼짐");
    const list = [{ uid: user.uid, label: `나 (관리자)${mark(user.uid)}` }];
    online.docs
      .filter(doc => doc.id !== user.uid)
      .sort((a, b) => String(a.get("name")).localeCompare(String(b.get("name")), "ko"))
      .forEach(doc => list.push({ uid: doc.id, label: `${doc.get("name") || "이름 없음"}${mark(doc.id)}` }));
    return list;
  }

  /**
   * 문의를 적는다. to 가 없으면 관리자에게 보낸다.
   * @param {{to?: string, kind: "direct"|"mail", message: string, page?: string, url?: string}} entry
   */
  async function sendMessage(entry) {
    const { fb, user } = await currentUser(false);
    const isAdmin = window.SiteModules.Auth.isAdmin();
    let to = entry.to;
    if (!to) {
      const admins = await adminUids(fb);
      if (!admins.length) throw new Error("받을 관리자가 없습니다");
      to = admins[0];
    }
    const db = fb.firestore();
    const now = fb.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();
    // 관리자는 횟수 제한이 없다(규칙도 같다)
    if (!isAdmin) batch.set(db.collection("contact_rate").doc(user.uid), { lastAt: now });
    batch.set(db.collection("contact_messages").doc(), {
      uid: user.uid,
      to: to,
      kind: entry.kind === "mail" ? "mail" : "direct",
      message: String(entry.message || "").slice(0, 5000),
      page: String(entry.page || "").slice(0, 300),
      url: String(entry.url || "").slice(0, 1000),
      createdAt: now
    });
    try {
      await batch.commit();
    } catch (err) {
      if (err && err.code === "permission-denied" && !isAdmin) throw new Error("1분에 한 번만 보낼 수 있어요. 잠시 뒤에 다시 보내 주세요");
      throw err;
    }
  }

  /** 이 브라우저가 웹 푸시를 받을 수 있는가(아이폰은 홈 화면에 설치한 앱에서만) */
  function isSupported() {
    return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  }

  function isOn() {
    return isSupported() && Notification.permission === "granted" && !!readToken();
  }

  /** 이 기기에서 문의 알림을 켠다. 단추를 누른 그 처리 안에서 불러야 권한 창이 뜬다. */
  async function enable() {
    if (!isSupported()) {
      throw new Error("이 브라우저는 알림을 받을 수 없습니다. 아이폰은 홈 화면에 설치한 뒤 그 앱에서 켜 주세요");
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("브라우저의 알림 권한을 허용해 주세요");

    const { fb, user } = await currentUser(true);
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const token = await fb.messaging().getToken({
      vapidKey: window.SiteModules.Config.push.vapidKey,
      serviceWorkerRegistration: registration
    });
    if (!token) throw new Error("알림 토큰을 받지 못했습니다");

    await fb.firestore().collection("push_tokens").doc(await sha256Hex(token)).set({
      token: token,
      uid: user.uid,
      device: navigator.userAgent.slice(0, 200),
      updatedAt: fb.firestore.FieldValue.serverTimestamp()
    });
    writeToken(token);
  }

  /** 이 기기의 알림을 끈다. 서버의 토큰 문서를 지우고 토큰도 버린다. */
  async function disable() {
    const fb = await loadFirebase(true);
    const token = readToken();
    if (token) {
      try {
        await fb.firestore().collection("push_tokens").doc(await sha256Hex(token)).delete();
      } catch (err) {
        console.warn("[ContactPush] 서버의 알림 토큰을 지우지 못했습니다:", err);
      }
    }
    try {
      await fb.messaging().deleteToken();
    } catch (err) {
      console.warn("[ContactPush] 알림 토큰을 버리지 못했습니다:", err);
    }
    writeToken("");
  }

  async function touchPresence() {
    if (!window.SiteModules.Auth.isSignedIn() || document.visibilityState !== "visible") return;
    if (Date.now() - lastPresenceAt < PRESENCE_INTERVAL_MS - 1000) return;
    lastPresenceAt = Date.now();
    try {
      const { fb, user } = await currentUser(false);
      await fb.firestore().collection("presence").doc(user.uid).set({
        name: displayName(user),
        lastSeen: fb.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.warn("[ContactPush] 접속 표시를 적지 못했습니다:", err);
    }
  }

  /** 로그인 상태가 바뀔 때마다 부른다. 로그인해 있으면 접속 표시를 적고 주기적으로 고친다. */
  function startPresence() {
    if (!window.SiteModules.Auth.isSignedIn()) {
      lastPresenceAt = 0;
      return;
    }
    touchPresence();
    if (presenceTimer) return;
    presenceTimer = setInterval(touchPresence, PRESENCE_INTERVAL_MS);
    document.addEventListener("visibilitychange", touchPresence);
  }

  return { sendMessage, listRecipients, isSupported, isOn, enable, disable, startPresence };
})();
