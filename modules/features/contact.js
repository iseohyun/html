/**
 * @file modules/features/contact.js
 * @module SiteModules.Contact
 * @description 레일의 문의 아이콘(#nav-kakao-channel)을 누르면 뜨는 문의 창.
 *   카카오톡 1:1 채팅(오른쪽 아이콘은 채널 추가), 메일로 문의, 로그인(오른쪽 아이콘은 알림 켜기), 문의하기를 보여 준다.
 *   로그인을 누르면 오른쪽에 계정 목록 창(Google · 네이버 · 카카오)이 뜬다. 설정에 clientId 가 없는 로그인은 「준비 중」.
 *   관리자로 로그인하면 개발 중인 문서가 사이트맵에 보인다.
 *   메일은 서버 없이 화면에서 바로 Web3Forms 로 보낸다(접근 키와 주소는 SiteModules.Config.feedback).
 *   로그인한 사람의 메일 문의는 Firestore 에도 적어 관리자 기기에 푸시가 가게 한다(SiteModules.ContactPush).
 *   「메일로 문의」와 「문의하기」는 문의 창 오른쪽에 따로 뜨는 대화창(SiteModules.ContactWindow)에 열린다.
 *   오류는 콘솔에만 찍고 화면에는 짧은 안내만 보인다. 최근 오류는 문의를 보낼 때 몰래 붙여(SiteModules.Diag) 관리자만 본다.
 *   로그인한 동안 로그인 항목 오른쪽에 이름(별명 → 메일 주소)과 로그인한 곳의 아이콘이 보인다.
 *   「문의하기」는 대화 화면(SiteModules.ContactChat)을 연다. 글은 받는 사람의 기기에 푸시로 가고,
 *   읽지 않은 글이 있으면 레일의 문의 아이콘에 점, 「문의하기」에 수가 붙는다.
 *   알림을 누르면 ?chat={thread} 로 열리거나(창이 없을 때) 서비스 워커 메시지로 그 대화를 연다.
 * @requires SiteModules.Config, SiteModules.Icons, SiteModules.Auth, SiteModules.Diag, SiteModules.ContactWindow,
 *   SiteModules.ContactPush, SiteModules.ContactChat
 * @exports init
 */

window.SiteModules = window.SiteModules || {};

window.SiteModules.Contact = (function () {
  const KAKAO_CHANNEL_URL = "http://pf.kakao.com/_ETRrX";
  const KAKAO_CHAT_URL = "http://pf.kakao.com/_ETRrX/chat";
  const MIN_MESSAGE_LENGTH = 5;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // 로그인 단추 오른쪽 작은 창의 계정 목록. 쓸 수 없는 로그인(설정에 clientId 가 없음)은 「준비 중」으로 둔다.
  // (다음 계정은 카카오 계정으로 통합되어 카카오로 로그인한다)
  const LOGIN_PROVIDERS = [
    {
      id: "google", name: "Google",
      mark: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.6l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>'
    },
    {
      id: "naver", name: "네이버",
      mark: '<svg viewBox="0 0 24 24" width="18" height="18"><rect width="24" height="24" rx="5" fill="#03C75A"/><path fill="#fff" d="M14.3 12.5 9.5 5.6H6v12.8h3.7v-6.9l4.8 6.9H18V5.6h-3.7z"/></svg>'
    },
    {
      id: "kakao", name: "카카오",
      mark: '<svg viewBox="0 0 24 24" width="18" height="18"><rect width="24" height="24" rx="5" fill="#FEE500"/><path fill="#191919" d="M12 5.5c-4 0-7.2 2.5-7.2 5.6 0 2 1.3 3.7 3.3 4.7l-.8 3c-.1.3.2.5.4.3l3.5-2.3h.8c4 0 7.2-2.5 7.2-5.7S16 5.5 12 5.5z"/></svg>'
    }
  ];

  let popover = null;
  let railButton = null;
  let mailWindow = null;
  let chatWindow = null;

  function $(id) { return document.getElementById(id); }

  // 화면에 보일 오류 안내: 사람에게 보여도 되는 오류(userFacing)만 그 글을, 나머지는 짧은 안내를 쓴다.
  // 자세한 내용은 콘솔과 진단 기록에만 남는다.
  function friendly(err, fallback) {
    return err && err.userFacing && err.message ? err.message : fallback;
  }

  function diagnostics() {
    const Diag = window.SiteModules.Diag;
    return Diag && Diag.hasErrors() ? Diag.snapshot() : "";
  }

  function clearDiagnostics() {
    if (window.SiteModules.Diag) window.SiteModules.Diag.clear();
  }

  function buildPopover() {
    const icon = window.SiteModules.Icons.html;
    const node = document.createElement("div");
    node.id = "contact-popover";
    node.className = "contact-popover";
    node.setAttribute("role", "dialog");
    node.setAttribute("aria-label", "문의하기");
    node.hidden = true;
    node.innerHTML = `
      <div class="contact-head">
        <strong>문의하기</strong>
        <button class="icon-btn is-bare" type="button" id="contact-close-btn" aria-label="닫기" title="닫기">${icon("x")}</button>
      </div>
      <div class="contact-actions">
        <div class="contact-row">
          <a class="contact-action" href="${KAKAO_CHAT_URL}" target="_blank" rel="noopener noreferrer">${icon("chat")}<span>카카오톡 1:1 채팅</span></a>
          <a class="contact-icon-action" href="${KAKAO_CHANNEL_URL}" target="_blank" rel="noopener noreferrer" aria-label="카카오톡 채널 추가" title="카카오톡 채널 추가">${icon("user-plus")}</a>
        </div>
        <button class="contact-action" type="button" id="contact-mail-toggle" aria-expanded="false" aria-controls="contact-mail-window">${icon("mail")}<span>메일로 문의</span></button>
        <div class="contact-row">
          <button class="contact-action" type="button" id="contact-login-btn" aria-expanded="false" aria-controls="contact-login-providers"></button>
          <button class="contact-icon-action" type="button" id="contact-push-btn" hidden aria-pressed="false">${icon("bell")}</button>
        </div>
        <div class="contact-login-providers" id="contact-login-providers" role="group" aria-label="로그인할 계정" hidden>
          ${LOGIN_PROVIDERS.map(p => ({ ...p, ready: window.SiteModules.Auth.isProviderReady(p.id) })).map(p => `
          <button class="contact-provider is-${p.id}" type="button" data-provider="${p.id}"${p.ready ? "" : " disabled"}>
            <span class="contact-provider-mark" aria-hidden="true">${p.mark}</span>
            <span class="contact-provider-name">${p.name}</span>
            ${p.ready ? "" : '<span class="contact-provider-soon">준비 중</span>'}
          </button>`).join("")}
        </div>
        <button class="contact-action" type="button" id="contact-dm-toggle" aria-expanded="false" aria-controls="contact-chat-window">${icon("chat")}<span>문의하기</span><span class="chat-badge" id="contact-unread" hidden></span></button>
        <span class="contact-auth-status" id="contact-auth-status" role="status"></span>
      </div>
    `;
    document.body.appendChild(node);
    return node;
  }

  // 문의 창 옆에 따로 뜨는 대화창 둘: 메일로 문의, 문의하기(대화)
  function buildWindows() {
    const Window = window.SiteModules.ContactWindow;
    mailWindow = Window.create({ key: "mail", id: "contact-mail-window", title: "메일로 문의", anchor: () => popover, onClose: () => setWindow(null) });
    mailWindow.body.innerHTML = `
      <form class="contact-form" id="contact-mail-form" novalidate>
        <label class="contact-label" for="contact-message">내용</label>
        <textarea class="contact-input" id="contact-message" name="message" rows="5" placeholder="질문이나 건의를 적어 주세요."></textarea>
        <label class="contact-label" for="contact-email">답장 받을 주소 <span class="contact-optional">(선택)</span></label>
        <input class="contact-input" id="contact-email" name="email" type="email" autocomplete="email" placeholder="name@example.com">
        <label class="contact-page-row" for="contact-page-check">
          <input type="checkbox" id="contact-page-check" name="includePage" checked>
          <span class="contact-label">현재 페이지 정보 추가</span>
        </label>
        <input class="contact-input contact-page-name" id="contact-page-name" name="pageName" type="text" readonly aria-label="현재 페이지" tabindex="-1">
        <input class="contact-botcheck" name="botcheck" type="checkbox" tabindex="-1" autocomplete="off" aria-hidden="true">
        <div class="contact-form-foot">
          <span class="contact-result" id="contact-result" role="status"></span>
          <button class="contact-submit" type="submit" id="contact-submit-btn">보내기</button>
        </div>
      </form>
    `;
    chatWindow = Window.create({ key: "chat", id: "contact-chat-window", title: "문의하기", anchor: () => popover, onClose: () => setWindow(null) });
    chatWindow.body.innerHTML = '<div class="contact-chat" id="contact-chat"></div>';
  }

  // 지금 보고 있는 페이지의 이름 (예: "사이트 소개"). 홈은 "홈".
  function getCurrentPageName() {
    const state = window.SiteModules.state || {};
    return (state.cur_doc && state.cur_doc.title) || document.title || "";
  }

  // 읽기 전용 칸에 현재 페이지 이름을 채우고, 체크를 끄면 칸을 흐리게 한다
  function refreshPageInfo() {
    const nameInput = $("contact-page-name");
    const check = $("contact-page-check");
    nameInput.value = getCurrentPageName();
    nameInput.classList.toggle("is-off", !check.checked);
  }

  function setOpen(isOpen) {
    if (!popover) return;
    if (isOpen) refreshPageInfo();
    popover.hidden = !isOpen;
    if (!isOpen) {
      setProvidersOpen(false);
      setWindow(null);
    }
    if (railButton) railButton.classList.toggle("active", isOpen);
  }

  // 로그인 항목의 글자와 아래 한 줄 안내를 지금 로그인 상태에 맞춘다
  function refreshLoginAction(message, isError) {
    const Auth = window.SiteModules.Auth;
    const icon = window.SiteModules.Icons.html;
    const button = popover.querySelector("#contact-login-btn");
    const status = popover.querySelector("#contact-auth-status");
    const isSignedIn = Auth.isSignedIn();

    button.innerHTML = `${icon(isSignedIn ? "log-out" : "log-in")}<span class="contact-login-label">${isSignedIn ? "로그아웃" : "로그인"}</span>`;
    const profile = isSignedIn && Auth.currentProfile ? Auth.currentProfile() : null;
    if (profile) {
      // 이름(별명 → 메일 주소)과 로그인한 곳의 아이콘을 오른쪽에
      const who = document.createElement("span");
      who.className = "contact-login-who";
      const name = document.createElement("span");
      name.className = "contact-login-name";
      name.textContent = profile.name;
      who.appendChild(name);
      const provider = LOGIN_PROVIDERS.find(p => p.id === profile.provider);
      if (provider) {
        const mark = document.createElement("span");
        mark.className = "contact-provider-mark";
        mark.innerHTML = provider.mark;
        mark.title = `${provider.name}로 로그인함`;
        mark.setAttribute("aria-label", `${provider.name}로 로그인함`);
        mark.setAttribute("role", "img");
        who.appendChild(mark);
      }
      button.appendChild(who);
      button.title = `${profile.name} 로그아웃`;
    } else {
      button.removeAttribute("title");
    }
    if (isSignedIn) setProvidersOpen(false);
    let text = message || "";
    if (!text && isSignedIn) {
      text = Auth.isAdmin() ? "관리자로 로그인했습니다. 개발 중인 문서가 보입니다." : "로그인했습니다. 관리자 계정은 아닙니다.";
    }
    status.textContent = text;
    status.classList.toggle("is-error", !!isError);
    refreshPushAction();
  }

  // 로그인 오른쪽의 알림 아이콘을 이 기기의 상태에 맞춘다. 알림을 받고 있으면 녹색.
  function refreshPushAction() {
    const button = popover.querySelector("#contact-push-btn");
    const Push = window.SiteModules.ContactPush;
    if (!Push || !window.SiteModules.Auth.isSignedIn()) {
      button.hidden = true;
      return;
    }
    const isOn = Push.isOn();
    const label = isOn ? "이 기기에서 문의 알림을 받는 중 (누르면 끔)" : "이 기기에서 문의 알림 받기";
    button.hidden = false;
    button.classList.toggle("is-on", isOn);
    button.setAttribute("aria-pressed", String(isOn));
    button.setAttribute("aria-label", label);
    button.title = label;
  }

  async function onPushClick() {
    const Push = window.SiteModules.ContactPush;
    const button = popover.querySelector("#contact-push-btn");
    const status = popover.querySelector("#contact-auth-status");
    const turningOn = !Push.isOn();
    button.disabled = true;
    try {
      if (turningOn) await Push.enable();
      else await Push.disable();
      refreshPushAction();
      status.textContent = turningOn ? "이 기기에서 문의 알림을 받습니다." : "이 기기의 문의 알림을 껐습니다.";
      status.classList.remove("is-error");
    } catch (err) {
      console.error("[Contact] 알림 설정 실패:", err);
      status.textContent = friendly(err, `알림을 ${turningOn ? "켜지" : "끄지"} 못했습니다. 브라우저의 알림 권한을 확인해 주세요.`);
      status.classList.add("is-error");
    } finally {
      button.disabled = false;
    }
  }

  // 로그인 단추 오른쪽의 계정 목록 창. 넓은 화면에서는 문의 창 오른쪽에 붙이고, 좁은 화면에서는 로그인 줄 아래에 펼친다.
  function isProvidersOpen() {
    return !!popover && !popover.querySelector("#contact-login-providers").hidden;
  }

  function placeProviders() {
    const panel = popover.querySelector("#contact-login-providers");
    if (panel.hidden || window.matchMedia("(max-width: 960px)").matches) {
      panel.style.top = panel.style.left = "";
      return;
    }
    const row = popover.querySelector("#contact-login-btn").getBoundingClientRect();
    const box = popover.getBoundingClientRect();
    const top = Math.min(row.top, window.innerHeight - panel.offsetHeight - 12);
    panel.style.top = `${Math.max(12, top)}px`;
    panel.style.left = `${box.right + 8}px`;
  }

  function setProvidersOpen(isOpen) {
    if (!popover) return;
    const panel = popover.querySelector("#contact-login-providers");
    panel.hidden = !isOpen;
    popover.querySelector("#contact-login-btn").setAttribute("aria-expanded", String(isOpen));
    if (isOpen) setWindow(null);
    placeProviders();
  }

  async function onLoginClick() {
    const Auth = window.SiteModules.Auth;
    const button = popover.querySelector("#contact-login-btn");
    // 로그인 전에는 계정 목록 창을 여닫는다. 로그인한 뒤에는 바로 로그아웃한다.
    if (!Auth.isSignedIn()) {
      setProvidersOpen(!isProvidersOpen());
      return;
    }
    button.disabled = true;
    try {
      await Auth.logout();
      refreshLoginAction();
    } catch (err) {
      console.error("[Contact] 로그아웃 실패:", err);
      refreshLoginAction(friendly(err, "로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요."), true);
    } finally {
      button.disabled = false;
    }
  }

  async function onProviderClick(e) {
    const choice = e.target.closest(".contact-provider");
    if (!choice || choice.disabled) return;
    const Auth = window.SiteModules.Auth;
    const button = popover.querySelector("#contact-login-btn");
    setProvidersOpen(false);
    button.disabled = true;
    try {
      await Auth.login(choice.dataset.provider);
      refreshLoginAction();
    } catch (err) {
      // 창을 그냥 닫은 것은 오류로 알리지 않는다
      const isCancelled = err && (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request");
      if (!isCancelled) console.error("[Contact] 로그인 실패:", err);
      refreshLoginAction(isCancelled ? "" : friendly(err, "로그인하지 못했습니다. 잠시 후 다시 시도해 주세요."), !isCancelled);
    } finally {
      button.disabled = false;
    }
  }

  /**
   * 대화창을 하나만 연다(「메일로 문의」 또는 「문의하기」). null 이면 둘 다 닫는다.
   * @param {"mail"|"chat"|null} name
   * @param {string} [thread] 문의하기: 알림을 눌러 들어온 대화
   */
  function setWindow(name, thread) {
    if (!mailWindow || !chatWindow) return;
    const Chat = window.SiteModules.ContactChat;
    if (name) setProvidersOpen(false);

    $("contact-mail-toggle").setAttribute("aria-expanded", String(name === "mail"));
    if (name === "mail") {
      mailWindow.open();
      refreshPageInfo();
      $("contact-message").focus();
    } else {
      mailWindow.close();
    }

    $("contact-dm-toggle").setAttribute("aria-expanded", String(name === "chat"));
    if (name === "chat") {
      chatWindow.open();
      Chat.open(thread);
    } else {
      chatWindow.close();
      if (Chat.isOpen()) Chat.close();
    }
  }

  function openWindowName() {
    if (mailWindow && mailWindow.isOpen()) return "mail";
    if (chatWindow && chatWindow.isOpen()) return "chat";
    return null;
  }

  // 읽지 않은 글: 레일 아이콘의 점과 「문의하기」의 수
  let stopUnread = null;
  function watchUnread() {
    if (stopUnread) {
      try { stopUnread(); } catch (err) { /* 무시 */ }
      stopUnread = null;
    }
    const show = count => {
      const badge = popover.querySelector("#contact-unread");
      badge.hidden = !count;
      badge.textContent = count > 99 ? "99+" : String(count);
      if (railButton) railButton.classList.toggle("has-unread", count > 0);
    };
    show(0);
    if (!window.SiteModules.Auth.isSignedIn() || !window.SiteModules.ContactPush) return;
    window.SiteModules.ContactPush.watchUnread(show, err => console.warn("[Contact] 읽지 않은 글 수 실패:", err))
      .then(stop => { stopUnread = stop; })
      .catch(err => console.warn("[Contact] 읽지 않은 글 수 실패:", err));
  }

  // 알림을 눌러 들어온 대화(?chat=thread). 로그인 상태가 되살아나면 연다.
  let pendingChat = "";
  function openPendingChat() {
    if (!pendingChat || !window.SiteModules.Auth.isSignedIn()) return;
    const thread = pendingChat;
    pendingChat = "";
    setOpen(true);
    setWindow("chat", thread);
  }

  function showResult(message, isError) {
    const result = $("contact-result");
    result.textContent = message;
    result.classList.toggle("is-error", !!isError);
  }

  // 체크되어 있으면 보던 페이지와 버전을 본문 끝에 붙여, 어느 화면에서 온 문의인지 알 수 있게 한다
  function composeMessage(message, includePage) {
    if (!includePage) return message;
    return `${message}\n\n---\n페이지: ${getCurrentPageName()}\n주소: ${window.location.href}\n빌드: ${window.SiteVersion || "-"}`;
  }

  async function submitMail(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const config = window.SiteModules.Config.feedback;
    const message = form.elements.message.value.trim();
    const email = form.elements.email.value.trim();
    const submitBtn = $("contact-submit-btn");

    // 사람 눈에 보이지 않는 칸이 채워져 있으면 자동 입력으로 보고 보내지 않는다
    if (form.elements.botcheck.checked) return;

    if (message.length < MIN_MESSAGE_LENGTH) {
      showResult(`내용을 ${MIN_MESSAGE_LENGTH}글자 이상 적어 주세요.`, true);
      return;
    }
    if (email && !EMAIL_PATTERN.test(email)) {
      showResult("답장 받을 주소의 모양을 확인해 주세요.", true);
      return;
    }

    const includePage = form.elements.includePage.checked;
    const pageName = includePage ? getCurrentPageName() : "";
    const payload = {
      access_key: config.web3formsAccessKey,
      subject: `[iseohyun.com] 문의${pageName ? " - " + pageName : ""}`,
      from_name: "iseohyun.com",
      message: composeMessage(message, includePage)
    };
    if (email) payload.email = email;
    // 최근 오류가 있으면 메일에만 붙인다(보내는 사람 화면에는 보이지 않는다)
    const diag = diagnostics();
    if (diag) payload.diagnostics = diag;

    submitBtn.disabled = true;
    showResult("보내는 중입니다...", false);
    try {
      const response = await fetch(config.web3formsEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.message || `전송 실패 (status ${response.status})`);
      }
      form.reset();
      refreshPageInfo();
      showResult("보냈습니다. 고맙습니다.", false);
      recordForPush(message, pageName, diag);
      clearDiagnostics();
    } catch (err) {
      console.error("[Contact] 메일 전송 실패:", err);
      // 내용은 남겨 두고 이유와 다시 시도 안내를 보여 준다
      showResult("보내지 못했습니다. 잠시 후 다시 시도해 주세요.", true);
    } finally {
      submitBtn.disabled = false;
    }
  }

  // 메일을 보낸 뒤, 로그인한 사람의 문의를 Firestore 에 적어 관리자에게 푸시가 가게 한다.
  // 메일은 이미 갔으므로 실패해도(1분 안에 또 보냄 등) 화면에는 알리지 않는다.
  function recordForPush(message, pageName, diag) {
    const Push = window.SiteModules.ContactPush;
    if (!Push || !window.SiteModules.Auth.isSignedIn()) return;
    Push.sendMessage({ kind: "mail", message: message, page: pageName || getCurrentPageName(), url: window.location.href, diag: diag })
      .catch(err => console.warn("[Contact] 문의 알림 기록 실패:", err));
  }

  /**
   * 문의 창을 만들고 레일 아이콘에 연결한다.
   * @param {{closeDrawer?: Function}} options 좁은 화면에서 서랍을 닫는 함수(문의 창이 서랍에 가리지 않도록)
   */
  function init(options = {}) {
    if (popover) return;
    railButton = document.getElementById("nav-kakao-channel");
    if (!railButton) return;
    popover = buildPopover();
    buildWindows();

    railButton.addEventListener("click", (e) => {
      e.stopPropagation();
      const nextOpen = popover.hidden;
      if (nextOpen && typeof options.closeDrawer === "function") options.closeDrawer();
      setOpen(nextOpen);
    });

    popover.querySelector("#contact-close-btn").addEventListener("click", () => setOpen(false));
    popover.querySelector("#contact-mail-toggle").addEventListener("click", () => {
      setWindow(openWindowName() === "mail" ? null : "mail");
    });
    $("contact-mail-form").addEventListener("submit", submitMail);
    $("contact-page-check").addEventListener("change", refreshPageInfo);
    popover.querySelector("#contact-login-btn").addEventListener("click", onLoginClick);
    popover.querySelector("#contact-login-providers").addEventListener("click", onProviderClick);
    window.addEventListener("resize", () => { if (isProvidersOpen()) placeProviders(); });
    popover.addEventListener("scroll", () => { if (isProvidersOpen()) placeProviders(); });
    // 로그인 안내 줄처럼 문의 창 높이가 바뀌면 옆의 대화창도 다시 맞춘다
    if (window.ResizeObserver) {
      new ResizeObserver(() => {
        if (mailWindow.isOpen()) mailWindow.place();
        if (chatWindow.isOpen()) chatWindow.place();
        if (isProvidersOpen()) placeProviders();
      }).observe(popover);
    }
    popover.querySelector("#contact-push-btn").addEventListener("click", onPushClick);
    window.SiteModules.ContactChat.mount($("contact-chat"));
    popover.querySelector("#contact-dm-toggle").addEventListener("click", () => {
      setWindow(openWindowName() === "chat" ? null : "chat");
    });
    window.SiteModules.Auth.onChange(() => {
      refreshLoginAction();
      window.SiteModules.ContactChat.refresh();
      if (window.SiteModules.ContactPush) window.SiteModules.ContactPush.startPresence();
      watchUnread();
      openPendingChat();
    });

    // 알림을 눌러 새 창으로 들어왔으면(?chat=thread) 주소에서 지우고, 로그인이 되살아나면 그 대화를 연다
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has("chat")) {
        pendingChat = params.get("chat") || "";
        params.delete("chat");
        const rest = params.toString();
        window.history.replaceState(null, "", window.location.pathname + (rest ? "?" + rest : "") + window.location.hash);
        openPendingChat();
      }
    } catch (err) {
      console.warn("[Contact] 알림 주소를 읽지 못했습니다:", err);
    }
    // 창이 열려 있을 때 알림을 누르면 서비스 워커가 알려 준다
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (e) => {
        if (!e.data || e.data.type !== "open-chat") return;
        pendingChat = e.data.thread || "";
        openPendingChat();
      });
    }
    refreshLoginAction();
    // 문의 창을 연 채로 다른 문서로 옮겨도 페이지 이름이 따라오게 한다
    window.addEventListener("hashchange", () => {
      if (!popover.hidden) setTimeout(refreshPageInfo, 600);
    });

    document.addEventListener("click", (e) => {
      // 대화 화면은 누른 단추를 바로 다시 그리므로, 이미 문서에서 빠진 요소를 누른 것은 바깥 클릭이 아니다
      if (popover.hidden || !e.target.isConnected || popover.contains(e.target) || railButton.contains(e.target)
        || mailWindow.el.contains(e.target) || chatWindow.el.contains(e.target)) return;
      setOpen(false);
    });
    window.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || popover.hidden) return;
      // 계정 목록 창이나 대화창이 열려 있으면 그것만 먼저 닫는다
      if (isProvidersOpen()) {
        setProvidersOpen(false);
        popover.querySelector("#contact-login-btn").focus();
      } else if (openWindowName()) {
        const which = openWindowName();
        setWindow(null);
        $(which === "mail" ? "contact-mail-toggle" : "contact-dm-toggle").focus();
      } else {
        setOpen(false);
      }
    });
  }

  return {
    init: init
  };
})();
