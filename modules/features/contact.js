/**
 * @file modules/features/contact.js
 * @module SiteModules.Contact
 * @description 레일의 문의 아이콘(#nav-kakao-channel)을 누르면 뜨는 문의 창.
 *   세 가지 길을 보여 준다: 카카오톡 채널 추가, 카카오톡 1:1 채팅, 메일로 문의.
 *   메일은 서버 없이 화면에서 바로 Web3Forms 로 보낸다(접근 키와 주소는 SiteModules.Config.feedback).
 * @requires SiteModules.Config, SiteModules.Icons
 * @exports init
 */

window.SiteModules = window.SiteModules || {};

window.SiteModules.Contact = (function () {
  const KAKAO_CHANNEL_URL = "http://pf.kakao.com/_ETRrX";
  const KAKAO_CHAT_URL = "http://pf.kakao.com/_ETRrX/chat";
  const MIN_MESSAGE_LENGTH = 5;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  let popover = null;
  let railButton = null;

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
        <a class="contact-action" href="${KAKAO_CHANNEL_URL}" target="_blank" rel="noopener noreferrer">${icon("user-plus")}<span>카카오톡 채널 추가</span></a>
        <a class="contact-action" href="${KAKAO_CHAT_URL}" target="_blank" rel="noopener noreferrer">${icon("chat")}<span>카카오톡 1:1 채팅</span></a>
        <button class="contact-action" type="button" id="contact-mail-toggle" aria-expanded="false" aria-controls="contact-mail-form">${icon("mail")}<span>메일로 문의</span></button>
      </div>
      <form class="contact-form" id="contact-mail-form" novalidate hidden>
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
    document.body.appendChild(node);
    return node;
  }

  // 지금 보고 있는 페이지의 이름 (예: "사이트 소개"). 홈은 "홈".
  function getCurrentPageName() {
    const state = window.SiteModules.state || {};
    return (state.cur_doc && state.cur_doc.title) || document.title || "";
  }

  // 읽기 전용 칸에 현재 페이지 이름을 채우고, 체크를 끄면 칸을 흐리게 한다
  function refreshPageInfo() {
    const nameInput = popover.querySelector("#contact-page-name");
    const check = popover.querySelector("#contact-page-check");
    nameInput.value = getCurrentPageName();
    nameInput.classList.toggle("is-off", !check.checked);
  }

  function setOpen(isOpen) {
    if (!popover) return;
    if (isOpen) refreshPageInfo();
    popover.hidden = !isOpen;
    if (railButton) railButton.classList.toggle("active", isOpen);
  }

  function setMailFormOpen(isOpen) {
    const form = popover.querySelector("#contact-mail-form");
    const toggle = popover.querySelector("#contact-mail-toggle");
    form.hidden = !isOpen;
    toggle.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) popover.querySelector("#contact-message").focus();
  }

  function showResult(message, isError) {
    const result = popover.querySelector("#contact-result");
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
    const submitBtn = popover.querySelector("#contact-submit-btn");

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
    } catch (err) {
      console.error("[Contact] 메일 전송 실패:", err);
      // 내용은 남겨 두고 이유와 다시 시도 안내를 보여 준다
      showResult(`보내지 못했습니다: ${err.message}. 잠시 후 다시 시도해 주세요.`, true);
    } finally {
      submitBtn.disabled = false;
    }
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

    railButton.addEventListener("click", (e) => {
      e.stopPropagation();
      const nextOpen = popover.hidden;
      if (nextOpen && typeof options.closeDrawer === "function") options.closeDrawer();
      setOpen(nextOpen);
    });

    popover.querySelector("#contact-close-btn").addEventListener("click", () => setOpen(false));
    popover.querySelector("#contact-mail-toggle").addEventListener("click", () => {
      setMailFormOpen(popover.querySelector("#contact-mail-form").hidden);
    });
    popover.querySelector("#contact-mail-form").addEventListener("submit", submitMail);
    popover.querySelector("#contact-page-check").addEventListener("change", refreshPageInfo);
    // 문의 창을 연 채로 다른 문서로 옮겨도 페이지 이름이 따라오게 한다
    window.addEventListener("hashchange", () => {
      if (!popover.hidden) setTimeout(refreshPageInfo, 600);
    });

    document.addEventListener("click", (e) => {
      if (popover.hidden || popover.contains(e.target) || railButton.contains(e.target)) return;
      setOpen(false);
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !popover.hidden) setOpen(false);
    });
  }

  return {
    init: init
  };
})();
