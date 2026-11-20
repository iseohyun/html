/**
 * @file modules/features/contact-push.js
 * @module SiteModules.ContactPush
 * @description 문의를 받는 사람의 기기에 푸시로 알리는 화면 쪽 부분.
 *   - sendMessage: 로그인한 사람의 문의를 Firestore contact_messages 에 적는다(받는 사람 to, 종류 kind).
 *     대화는 thread(관리자가 아닌 쪽의 uid)로 묶는다. 관리자가 아니면 받는 사람은 관리자만 되고,
 *     같은 일괄 쓰기에서 contact_rate/{uid}.lastAt 을 고쳐야 규칙이 받아 준다(같은 사람 10초에 한 번).
 *     문서가 생기면 Cloud Functions notifyContact 가
 *     받는 사람의 기기들(push_tokens 의 uid 가 같은 것)에 푸시를 보낸다(functions/index.js).
 *   - enable/disable: 로그인한 사람이 이 기기에서 알림을 켜고 끈다. 토큰은 push_tokens/{sha256(token)} 에 둔다.
 *     푸시는 사이트의 서비스 워커(/sw.js)가 받아 알림을 띄운다.
 *   - 로그인해 있는 동안 presence/{uid} 에 이름과 마지막으로 본 때를 적는다. 관리자만 읽어
 *     「받는 사람」 목록(지금 로그인해 있는 사람)을 만든다.
 *   Firestore·Messaging SDK 는 필요할 때만 불러온다.
 * @requires SiteModules.Config, SiteModules.Auth
 *   - watchThread / watchThreads / watchUnread / markRead / deleteMessage / deleteThread: 대화 보기와 관리.
 * @exports sendMessage, listRecipients, watchThread, watchThreads, watchUnread, markRead, deleteMessage,
 *   deleteThread, isSupported, isOn, enable, disable, startPresence
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
   * 관리자가 보낼 때는 threadName(상대 이름)을 함께 주면 대화 목록에 그 이름이 보인다.
   * @param {{to?: string, threadName?: string, kind: "direct"|"mail", message: string, page?: string, url?: string}} entry
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
    const myName = displayName(user);
    const db = fb.firestore();
    const now = fb.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();
    // 관리자는 횟수 제한이 없다(규칙도 같다)
    if (!isAdmin) batch.set(db.collection("contact_rate").doc(user.uid), { lastAt: now });
    batch.set(db.collection("contact_messages").doc(), {
      uid: user.uid,
      fromName: myName,
      to: to,
      // 대화 묶음: 관리자가 아닌 쪽의 uid
      thread: isAdmin ? to : user.uid,
      threadName: String((isAdmin ? entry.threadName : myName) || "").slice(0, 80),
      kind: entry.kind === "mail" ? "mail" : "direct",
      message: String(entry.message || "").slice(0, 5000),
      page: String(entry.page || "").slice(0, 300),
      url: String(entry.url || "").slice(0, 1000),
      read: false,
      createdAt: now
    });
    try {
      await batch.commit();
    } catch (err) {
      if (err && err.code === "permission-denied" && !isAdmin) throw new Error("너무 빨리 보냈어요. 10초 뒤에 다시 보내 주세요");
      throw err;
    }
  }

  function toItem(doc) {
    const data = doc.data({ serverTimestamps: "estimate" });
    return Object.assign({ id: doc.id }, data, { createdAt: data.createdAt ? data.createdAt.toDate() : new Date() });
  }

  function messages(fb) {
    return fb.firestore().collection("contact_messages");
  }

  /**
   * 한 대화의 글을 오래된 순으로 지켜본다. 돌려받은 함수를 부르면 그만 본다.
   * @param {string} thread 관리자가 아닌 쪽의 uid
   * @param {(items: object[]) => void} onChange
   * @param {(err: Error) => void} onError
   */
  async function watchThread(thread, onChange, onError) {
    const { fb } = await currentUser(false);
    return messages(fb).where("thread", "==", thread).orderBy("createdAt").limitToLast(200)
      .onSnapshot(snap => onChange(snap.docs.map(toItem)), onError);
  }

  /**
   * (관리자) 최근 글로 대화 목록을 만들어 지켜본다. 새 글이 위.
   * @param {(threads: Array<{thread: string, name: string, last: object, unread: number}>) => void} onChange
   */
  async function watchThreads(onChange, onError) {
    const { fb, user } = await currentUser(false);
    return messages(fb).orderBy("createdAt", "desc").limit(300).onSnapshot(snap => {
      const map = new Map();
      snap.docs.map(toItem).forEach(item => {
        const thread = item.thread || item.uid;
        if (!map.has(thread)) map.set(thread, { thread: thread, name: "", last: item, unread: 0 });
        const entry = map.get(thread);
        if (!entry.name && item.threadName) entry.name = item.threadName;
        if (!entry.name && item.uid === thread && item.fromName) entry.name = item.fromName;
        if (item.to === user.uid && item.read === false) entry.unread += 1;
      });
      map.forEach(entry => {
        if (entry.thread === user.uid) entry.name = "나";
        if (!entry.name) entry.name = "이름 없음";
      });
      onChange(Array.from(map.values()));
    }, onError);
  }

  /**
   * 나에게 온 읽지 않은 글의 수를 지켜본다.
   * @param {(count: number) => void} onChange
   */
  async function watchUnread(onChange, onError) {
    const { fb, user } = await currentUser(false);
    let query = messages(fb).where("to", "==", user.uid).where("read", "==", false);
    // 관리자가 아니면 규칙상 자기 대화(thread)로 좁혀야 읽을 수 있다
    if (!window.SiteModules.Auth.isAdmin()) query = query.where("thread", "==", user.uid);
    return query.onSnapshot(snap => onChange(snap.size), onError);
  }

  /** 나에게 온 글들을 읽음으로 바꾼다 */
  async function markRead(ids) {
    if (!ids.length) return;
    const { fb } = await currentUser(false);
    const batch = fb.firestore().batch();
    ids.slice(0, 400).forEach(id => batch.update(messages(fb).doc(id), { read: true }));
    await batch.commit();
  }

  /** (관리자) 글 하나를 지운다 */
  async function deleteMessage(id) {
    const { fb } = await currentUser(false);
    await messages(fb).doc(id).delete();
  }

  /** (관리자) 대화 하나의 글을 모두 지운다 */
  async function deleteThread(thread) {
    const { fb } = await currentUser(false);
    const snap = await messages(fb).where("thread", "==", thread).get();
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = fb.firestore().batch();
      snap.docs.slice(i, i + 400).forEach(doc => batch.delete(doc.ref));
      await batch.commit();
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

  return {
    sendMessage, listRecipients, watchThread, watchThreads, watchUnread, markRead, deleteMessage, deleteThread,
    isSupported, isOn, enable, disable, startPresence
  };
})();
