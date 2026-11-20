/**
 * @file modules/features/contact-chat.js
 * @module SiteModules.ContactChat
 * @description 문의 창 안의 대화 화면. 「문의하기」를 누르면 열린다.
 *   - 관리자가 아닌 사람: 관리자와의 대화 하나를 바로 연다.
 *   - 관리자: 대화 목록(새 글이 위, 읽지 않은 수)과 「새 대화」(나, 지금 로그인해 있는 사람)를 먼저 보여 주고,
 *     대화를 고르면 그 대화를 연다. 글 하나 지우기(×)와 대화 전체 지우기를 할 수 있다.
 *   - 대화를 열어 둔 동안 나에게 온 글은 읽음으로 바꾼다. 글은 실시간으로 바뀐다.
 *   데이터는 SiteModules.ContactPush 가 맡는다(Firestore contact_messages, thread = 관리자가 아닌 쪽 uid).
 *   - 오류는 콘솔에만 찍고 화면에는 짧은 안내만 보인다. 보낼 때 최근 오류(SiteModules.Diag)를 글에 몰래 붙이고,
 *     관리자는 그 글의 「진단」을 펼쳐 본다.
 * @requires SiteModules.Auth, SiteModules.ContactPush, SiteModules.Icons, SiteModules.Diag
 * @exports mount, open, close, refresh, isOpen
 */

window.SiteModules = window.SiteModules || {};

window.SiteModules.ContactChat = (function () {
  const MIN_MESSAGE_LENGTH = 2;

  let root = null;
  let opened = false;
  let current = null; // { thread, name } 열어 둔 대화. 관리자 목록 화면이면 null
  let unsubscribe = null;
  let myUid = "";

  function Push() { return window.SiteModules.ContactPush; }
  function Diag() { return window.SiteModules.Diag; }

  /** 오류를 콘솔과 진단 기록에 남긴다(화면에는 보이지 않는다) */
  function report(context, err) {
    if (Diag()) Diag().record(`ContactChat ${context}`, err);
    else console.error(`[ContactChat] ${context}:`, err);
  }
  function Auth() { return window.SiteModules.Auth; }
  function icon(name) { return window.SiteModules.Icons.html(name); }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function stopWatching() {
    if (unsubscribe) {
      try { unsubscribe(); } catch (err) { /* 무시 */ }
    }
    unsubscribe = null;
  }

  function formatTime(date) {
    const now = new Date();
    const hm = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    if (date.toDateString() === now.toDateString()) return hm;
    return `${date.getMonth() + 1}/${date.getDate()} ${hm}`;
  }

  function showNote(text, isError) {
    root.innerHTML = "";
    const note = el("p", "chat-note" + (isError ? " is-error" : ""), text);
    root.appendChild(note);
  }

  // ---------- 관리자: 대화 목록 ----------
  async function renderThreadList() {
    stopWatching();
    current = null;
    root.innerHTML = "";

    const newRow = el("div", "chat-new-row");
    const select = el("select", "contact-input chat-new-select");
    select.setAttribute("aria-label", "새 대화 상대");
    const openBtn = el("button", "contact-submit", "열기");
    openBtn.type = "button";
    newRow.append(select, openBtn);
    const list = el("ul", "chat-thread-list");
    root.append(newRow, list);

    Push().listRecipients()
      .then(items => items.forEach(item => select.add(new Option(item.label, item.uid))))
      .catch(err => console.warn("[ContactChat] 받는 사람 목록 실패:", err));
    openBtn.addEventListener("click", () => {
      const option = select.selectedOptions[0];
      if (!option) return;
      const name = option.value === myUid ? "나" : option.textContent.replace(/ · 알림 꺼짐$/, "");
      openThread(option.value, name);
    });

    try {
      unsubscribe = await Push().watchThreads(threads => {
        list.innerHTML = "";
        if (!threads.length) list.appendChild(el("li", "chat-note", "아직 대화가 없어요."));
        threads.forEach(entry => {
          const item = el("li");
          const button = el("button", "chat-thread");
          button.type = "button";
          const top = el("span", "chat-thread-top");
          top.append(el("strong", "", entry.name), el("span", "chat-time", formatTime(entry.last.createdAt)));
          const bottom = el("span", "chat-thread-bottom");
          bottom.append(el("span", "chat-thread-last", entry.last.message || ""));
          if (entry.unread) bottom.append(el("span", "chat-badge", String(entry.unread)));
          button.append(top, bottom);
          button.addEventListener("click", () => openThread(entry.thread, entry.name));
          item.appendChild(button);
          list.appendChild(item);
        });
      }, err => {
        report("대화 목록 불러오기", err);
        showNote("대화 목록을 불러오지 못했어요. 잠시 후 다시 열어 주세요.", true);
      });
    } catch (err) {
      report("대화 목록 불러오기", err);
      showNote("대화 목록을 불러오지 못했어요. 잠시 후 다시 열어 주세요.", true);
    }
  }

  // ---------- 대화 하나 ----------
  async function openThread(thread, name) {
    stopWatching();
    current = { thread, name };
    const isAdmin = Auth().isAdmin();
    root.innerHTML = "";

    const head = el("div", "chat-head");
    if (isAdmin) {
      const back = el("button", "icon-btn is-bare chat-back");
      back.type = "button";
      back.innerHTML = icon("chevron-left");
      back.setAttribute("aria-label", "대화 목록");
      back.title = "대화 목록";
      back.addEventListener("click", renderThreadList);
      head.appendChild(back);
    }
    const title = el("strong", "chat-title", name);
    head.appendChild(title);
    if (isAdmin) {
      const wipe = el("button", "chat-wipe", "대화 지우기");
      wipe.type = "button";
      wipe.addEventListener("click", async () => {
        if (!window.confirm(`「${name}」과의 대화를 모두 지울까요? 되돌릴 수 없습니다.`)) return;
        try {
          await Push().deleteThread(thread);
          renderThreadList();
        } catch (err) {
          report("대화 지우기", err);
          window.alert("지우지 못했습니다. 콘솔을 확인해 주세요.");
        }
      });
      head.appendChild(wipe);
    }

    const list = el("div", "chat-messages");
    list.setAttribute("role", "log");
    list.setAttribute("aria-live", "polite");

    const form = el("form", "chat-compose");
    const input = el("textarea", "contact-input chat-input");
    input.rows = 2;
    input.placeholder = "메시지 (Ctrl+Enter 보내기)";
    input.setAttribute("aria-label", "메시지");
    const send = el("button", "contact-submit", "보내기");
    send.type = "submit";
    const result = el("span", "contact-result");
    result.setAttribute("role", "status");
    form.append(input, send);
    root.append(head, list, form, result);

    input.addEventListener("keydown", e => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        form.requestSubmit();
      }
    });
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const message = input.value.trim();
      if (message.length < MIN_MESSAGE_LENGTH) return;
      send.disabled = true;
      result.textContent = "";
      result.classList.remove("is-error");
      // 최근 오류가 있으면 글에 몰래 붙인다(관리자만 본다)
      const diag = Diag() && Diag().hasErrors() ? Diag().snapshot() : "";
      try {
        await Push().sendMessage({
          diag: diag,
          kind: "direct",
          to: isAdmin ? thread : undefined,
          threadName: isAdmin ? name : undefined,
          message: message,
          page: (window.SiteModules.state && window.SiteModules.state.cur_doc && window.SiteModules.state.cur_doc.title) || document.title,
          url: window.location.href
        });
        input.value = "";
        if (diag) Diag().clear();
      } catch (err) {
        report("보내기", err);
        result.textContent = err && err.userFacing ? err.message : "보내지 못했어요. 잠시 후 다시 보내 주세요.";
        result.classList.add("is-error");
      } finally {
        send.disabled = false;
        input.focus();
      }
    });

    try {
      unsubscribe = await Push().watchThread(thread, items => {
        renderMessages(list, items, isAdmin);
        // 알림을 눌러 이름을 모른 채 열었으면 글에서 이름을 찾는다
        if (name === "대화") {
          const found = items.find(item => item.threadName || (item.uid === thread && item.fromName));
          if (found) {
            current.name = found.threadName || found.fromName;
            title.textContent = current.name;
          }
        }
        const unreadIds = items.filter(item => item.to === myUid && item.read === false).map(item => item.id);
        if (unreadIds.length && document.visibilityState === "visible" && opened) {
          Push().markRead(unreadIds).catch(err => console.warn("[ContactChat] 읽음 표시 실패:", err));
        }
      }, err => {
        report("대화 불러오기", err);
        result.textContent = "대화를 불러오지 못했어요. 잠시 후 다시 열어 주세요.";
        result.classList.add("is-error");
      });
    } catch (err) {
      report("대화 불러오기", err);
      result.textContent = "대화를 불러오지 못했어요. 잠시 후 다시 열어 주세요.";
      result.classList.add("is-error");
    }
  }

  function renderMessages(list, items, isAdmin) {
    const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
    list.innerHTML = "";
    if (!items.length) list.appendChild(el("p", "chat-note", "첫 메시지를 보내 보세요. 받는 사람의 기기에 알림으로 갑니다."));
    items.forEach(item => {
      const mine = item.uid === myUid;
      const row = el("div", "chat-row" + (mine ? " is-mine" : ""));
      const bubble = el("div", "chat-bubble");
      bubble.appendChild(el("div", "chat-text", item.message || ""));
      const meta = el("div", "chat-meta");
      const parts = [formatTime(item.createdAt)];
      if (item.kind === "mail") parts.push("메일 문의");
      if (item.page) parts.push(item.page);
      if (mine && item.read) parts.push("읽음");
      meta.textContent = parts.join(" · ");
      bubble.appendChild(meta);
      // 관리자만: 보낸 사람 화면의 최근 오류와 환경
      if (isAdmin && item.diag) {
        const details = el("details", "chat-diag");
        details.appendChild(el("summary", "", "진단"));
        details.appendChild(el("pre", "", item.diag));
        bubble.appendChild(details);
      }
      row.appendChild(bubble);
      if (isAdmin) {
        const del = el("button", "chat-del");
        del.type = "button";
        del.innerHTML = icon("x");
        del.setAttribute("aria-label", "이 메시지 지우기");
        del.title = "이 메시지 지우기";
        del.addEventListener("click", async () => {
          if (!window.confirm("이 메시지를 지울까요?")) return;
          try {
            await Push().deleteMessage(item.id);
          } catch (err) {
            report("메시지 지우기", err);
            window.alert("지우지 못했습니다. 콘솔을 확인해 주세요.");
          }
        });
        row.appendChild(del);
      }
      list.appendChild(row);
    });
    if (nearBottom || !list.dataset.scrolled) {
      list.scrollTop = list.scrollHeight;
      list.dataset.scrolled = "1";
    }
  }

  // ---------- 바깥에 내보내는 것 ----------
  function mount(container) {
    root = container;
  }

  /**
   * 대화 화면을 연다. thread 를 주면(알림을 눌렀을 때) 그 대화를 바로 연다.
   * @param {string} [thread]
   */
  function open(thread) {
    if (!root) return;
    opened = true;
    root.hidden = false;
    refresh(thread);
  }

  function close() {
    opened = false;
    stopWatching();
    current = null;
    if (root) {
      root.hidden = true;
      root.innerHTML = "";
    }
  }

  /** 로그인 상태가 바뀌었을 때 다시 그린다 */
  function refresh(thread) {
    if (!root || !opened) return;
    stopWatching();
    if (!Auth().isSignedIn()) {
      myUid = "";
      showNote("로그인하면 관리자와 대화할 수 있어요. 답장이 오면 알림으로 알려 드려요.");
      return;
    }
    const user = window.firebase && window.firebase.auth && window.firebase.auth().currentUser;
    myUid = user ? user.uid : "";
    if (Auth().isAdmin()) {
      const target = thread || (current && current.thread);
      if (target) openThread(target, target === myUid ? "나" : (current && current.thread === target ? current.name : "대화"));
      else renderThreadList();
    } else {
      openThread(myUid, "관리자");
    }
  }

  return { mount, open, close, refresh, isOpen: () => opened };
})();
