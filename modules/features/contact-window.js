/**
 * @file modules/features/contact-window.js
 * @module SiteModules.ContactWindow
 * @description 문의 창 옆에 따로 뜨는 대화창(메일로 문의 · 문의하기 대화).
 *   - 넓은 화면: 문의 창 오른쪽에 붙고 아래 끝을 문의 창과 맞춘다.
 *     오른쪽 위 모서리를 끌어 크기를 바꾸고, 머리의 단추로 「크게 보기 / 원래대로」를 바꾼다.
 *     마지막 크기는 이 브라우저에 기억한다(창마다 따로).
 *   - 좁은 화면(960px 이하): 화면 가장자리에 맞춰 크게 뜬다. 모서리 끌기와 크게 보기는 없다.
 * @requires SiteModules.Icons
 * @exports create
 */

window.SiteModules = window.SiteModules || {};

window.SiteModules.ContactWindow = (function () {
  const SIZE_KEY = "iseohyun_contact_window_v1";
  const DEFAULT_SIZE = { w: 380, h: 520 };
  const MIN_SIZE = { w: 300, h: 320 };
  const GAP = 8;
  const MARGIN = 12;

  function isNarrow() {
    return window.matchMedia("(max-width: 960px)").matches;
  }

  function loadSizes() {
    try {
      return JSON.parse(localStorage.getItem(SIZE_KEY) || "{}") || {};
    } catch (err) {
      return {};
    }
  }

  function saveSize(key, size) {
    try {
      const sizes = loadSizes();
      sizes[key] = size;
      localStorage.setItem(SIZE_KEY, JSON.stringify(sizes));
    } catch (err) {
      /* 기억하지 못해도 창은 그대로 쓴다 */
    }
  }

  /**
   * 대화창 하나를 만든다.
   * @param {{key: string, id: string, title: string, anchor: () => HTMLElement, onClose?: Function}} options
   *   key: 크기를 기억할 이름, anchor: 옆에 붙을 문의 창, onClose: 닫기 단추나 Esc 로 닫혔을 때
   * @returns {{el: HTMLElement, body: HTMLElement, open: Function, close: Function, isOpen: Function, place: Function}}
   */
  function create(options) {
    const icon = window.SiteModules.Icons.html;
    const el = document.createElement("section");
    el.id = options.id;
    el.className = "contact-window";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", options.title);
    el.hidden = true;
    el.innerHTML = `
      <div class="contact-window-grip" aria-hidden="true" title="끌어서 크기 바꾸기"></div>
      <div class="contact-window-head">
        <strong class="contact-window-title"></strong>
        <button class="icon-btn is-bare contact-window-max" type="button" aria-pressed="false"></button>
        <button class="icon-btn is-bare contact-window-close" type="button" aria-label="닫기" title="닫기">${icon("x")}</button>
      </div>
      <div class="contact-window-body"></div>
    `;
    el.querySelector(".contact-window-title").textContent = options.title;
    document.body.appendChild(el);

    const body = el.querySelector(".contact-window-body");
    const maxButton = el.querySelector(".contact-window-max");
    let size = Object.assign({}, DEFAULT_SIZE, loadSizes()[options.key] || {});
    let maximized = false;

    function refreshMaxButton() {
      const label = maximized ? "원래 크기로" : "크게 보기";
      maxButton.innerHTML = icon(maximized ? "minimize" : "maximize");
      maxButton.setAttribute("aria-pressed", String(maximized));
      maxButton.setAttribute("aria-label", label);
      maxButton.title = label;
    }

    /** 문의 창 오른쪽, 아래 끝을 맞춰 놓는다 */
    function place() {
      if (el.hidden) return;
      if (isNarrow()) {
        el.style.left = el.style.bottom = el.style.width = el.style.height = "";
        return;
      }
      const anchor = options.anchor();
      const box = anchor && !anchor.hidden ? anchor.getBoundingClientRect() : { right: 0, bottom: window.innerHeight - MARGIN };
      const left = box.right + GAP;
      const bottom = Math.max(MARGIN, window.innerHeight - box.bottom);
      const maxW = Math.max(MIN_SIZE.w, window.innerWidth - left - MARGIN);
      const maxH = Math.max(MIN_SIZE.h, window.innerHeight - bottom - MARGIN);
      el.style.left = `${left}px`;
      el.style.bottom = `${bottom}px`;
      el.style.width = `${maximized ? maxW : Math.min(size.w, maxW)}px`;
      el.style.height = `${maximized ? maxH : Math.min(size.h, maxH)}px`;
    }

    function open() {
      el.hidden = false;
      place();
    }

    function close() {
      el.hidden = true;
    }

    maxButton.addEventListener("click", () => {
      maximized = !maximized;
      refreshMaxButton();
      place();
    });
    el.querySelector(".contact-window-close").addEventListener("click", () => {
      close();
      if (typeof options.onClose === "function") options.onClose();
    });

    // 오른쪽 위 모서리를 끌면 오른쪽 · 위로 커진다(왼쪽과 아래는 문의 창에 붙어 있다)
    const grip = el.querySelector(".contact-window-grip");
    grip.addEventListener("pointerdown", (e) => {
      if (isNarrow()) return;
      e.preventDefault();
      const start = { x: e.clientX, y: e.clientY, w: el.offsetWidth, h: el.offsetHeight };
      maximized = false;
      refreshMaxButton();
      el.classList.add("is-resizing");
      grip.setPointerCapture(e.pointerId);
      const onMove = (ev) => {
        size = {
          w: Math.max(MIN_SIZE.w, Math.round(start.w + (ev.clientX - start.x))),
          h: Math.max(MIN_SIZE.h, Math.round(start.h - (ev.clientY - start.y)))
        };
        place();
      };
      const onUp = () => {
        grip.removeEventListener("pointermove", onMove);
        grip.removeEventListener("pointerup", onUp);
        grip.removeEventListener("pointercancel", onUp);
        el.classList.remove("is-resizing");
        // 화면에 맞춰 줄어든 크기가 아니라 실제로 보이는 크기를 기억한다
        size = { w: el.offsetWidth, h: el.offsetHeight };
        saveSize(options.key, size);
      };
      grip.addEventListener("pointermove", onMove);
      grip.addEventListener("pointerup", onUp);
      grip.addEventListener("pointercancel", onUp);
    });

    window.addEventListener("resize", place);
    refreshMaxButton();

    return { el, body, open, close, place, isOpen: () => !el.hidden };
  }

  return { create: create };
})();
