/**
 * @file modules/features/slides.js
 * @module SiteModules.Slides
 * @description 보고서 형식 문서(<div class="slides-doc">)의 동작. 문서를 열 때마다 라우터가 이 파일을 다시 실행한다.
 *   규칙의 원문은 WebApp Common GUI 의 design/12-보고서.md(슬라이드·읽어 주기)와 13-그림-보기.md.
 *
 *   슬라이드(.slide-frame)가 있는 문서에서 하는 일
 *   - 전체 화면 보기: 슬라이드마다 단추. 브라우저의 전체 화면을 쓰고, 막혀 있으면 창 안을 가득 채운다.
 *     넘기기 → ↓ PageDown 스페이스 / ← ↑ PageUp, 닫기 Esc. 그동안 사이트의 다른 단축키는 받지 않는다.
 *   - 읽어 주기(speechSynthesis): 스크립트를 문장으로 나눠 읽고, 읽는 곳을 문단·문장·단어로 표시한다.
 *     스크립트의 data-cue="이름:방식" 이 가리키는 슬라이드 요소(data-key="이름")를 밑줄·테두리·체크로 짚는다.
 *   - 자막(전체 화면에서만), 화면 맨 아래의 진행 막대(눌러서 옮기기), 헤더의 이어 재생 단추.
 *   - 읽기 설정: 헤더의 화면 설정 패널(Header.setPanels)에 등록한다. 전체 화면에서는 같은 줄을 슬라이드 위 창으로 옮겨 쓴다.
 *   - 그림 크게 보기: a[data-view] 를 누르면 그 슬라이드 안에서 연다.
 *   항목 카드(.note.claude)가 있는 문서에서 하는 일
 *   - 헤더의 필터 패널에 「글쓴이」(전체 / 내 경험과 생각 / Claude의 의견)를 등록한다.
 *
 *   화면을 떠날 때(Navigation.onLeave) 음성·타이머·덮개·진행 막대·리스너를 모두 거둔다.
 *   읽던 자리는 문서 경로별로 기억해(SiteModules.SlidesMemory) 다른 장에 다녀와도 이어 읽는다. 새로 고치면 사라진다.
 * @requires SiteModules.Header, SiteModules.Navigation, SiteModules.Icons
 * @exports init, destroy, isActive
 */

window.SiteModules = window.SiteModules || {};

// 읽던 자리: 문서 경로 → { resume: [슬라이드마다 다음에 읽을 문장 번호], autoAt: 이어 재생이 머문 슬라이드, ctx: 막대가 보여 주는 것 }
window.SiteModules.SlidesMemory = window.SiteModules.SlidesMemory || {};

window.SiteModules.Slides = (function () {
  // 이 파일은 문서를 열 때마다 다시 실행된다. 앞 문서의 것이 남아 있으면 먼저 거둔다.
  const previous = window.SiteModules.Slides;
  if (previous && typeof previous.destroy === "function") {
    try {
      previous.destroy();
    } catch (err) {
      console.error("[Slides] 앞 문서의 정리에 실패했습니다:", err);
    }
  }

  const ROOT_SELECTOR = "article .slides-doc";
  const SETTINGS_KEY = "iseohyun_slides_settings_v1";
  const PACE_KEY = "iseohyun_slides_pace_v1";
  const PLAY_ACTION_ID = "slides-play";
  const HIGHLIGHT_NAME = "sl-tts-word";

  const RATE_MIN = 50;                                     // 읽는 속도(%)
  const RATE_MAX = 300;
  const RATE_STEP = 5;
  const RATE_SNAPS = [75, 100, 125, 150, 175, 200, 250];   // 자석이 붙는 지점
  const RATE_SNAP_RANGE = 5;                               // 지점의 ±5% 안에서 붙는다
  const UNITS = ["paragraph", "sentence", "word"];
  const CUE_HOW = ["underline", "box", "check"];
  const CUE_PRESETS = [["#d32f2f", "빨강"], ["#e65100", "주황"], ["#2e7d32", "초록"], ["#1565c0", "파랑"]];
  const DEFAULTS = {
    voice: "", rate: 1.5, unit: "word", cue: "#d32f2f",
    caption: true, capV: "bottom", capH: "center", capBg: "#000000", capAlpha: 30, capBlur: 4, capSize: 100
  };
  const CAP_SIZE_MIN = 50;                                 // 자막 글자 크기(%). 100%가 화면 폭의 2.1%
  const CAP_SIZE_MAX = 200;
  const CAP_SIZE_STEP = 10;
  // 자막은 문장 하나가 단위지만, 긴 문장은 쉼표에서 끊어 조각씩 보여 준다 (captionParts)
  const CAP_SPLIT_MIN_SENTENCE = 36;                       // 이보다 긴 문장만 끊는다 (글자 수)
  const CAP_SPLIT_MIN_PART = 14;                           // 끊은 조각 하나의 최소 길이. 모자라면 옆 조각에 붙인다
  const CAP_LIST_ITEM_MAX = 8;                             // 쉼표 사이가 이보다 짧으면 나열(예시)로 보고 끊지 않는다
  const CAP_COMMA = /[,，、]\s+/g;
  const FIRST_PACE_CHARS_PER_SEC = 8;                      // 재 본 적이 없는 목소리: 100% 속도에서 1초에 8글자
  const PACE_MIN_SAMPLE_MS = 200;
  const AUTO_SETTLE_POLL_MS = 150;                         // 이어 재생: 스크롤이 멈췄는지 보는 간격
  const AUTO_SETTLE_MIN_MS = 600;
  const AUTO_SETTLE_MAX_MS = 2500;
  const CAPTION_LINE_FADE_MS = 140;                        // 자막 단어 상자가 줄을 바꿀 때 사라졌다 나타나는 시간
  const NARROW_SLIDE_PX = 560;                             // 이 폭 아래에서는 16:9를 풀고, 그림은 창 전체에서 연다
  const SENTENCE_END = /[.!?]["”’)\]]*\s*$/;
  const SENTENCE_PIECES = /[^.!?]+[.!?]+["”’)\]]*\s*|[^.!?]+$|[.!?]+\s*/g;

  // 이 문서에서만 쓰는 아이콘 (24px 격자의 선 그림)
  const EXTRA_ICONS = {
    "stop": '<rect x="5" y="5" width="14" height="14" rx="2"/>',
    "volume": '<path d="M11 5 6 9H2v6h4l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M18.4 5.6a9 9 0 0 1 0 12.8"/>',
    "captions": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 15h4M15 15h2M7 11h2M13 11h4"/>',
    "fullscreen": '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>'
  };

  // ----- 문서 하나의 상태. init() 에서 채우고 destroy() 에서 비운다 -----
  let root = null;            // .slides-doc
  let frames = [];            // 슬라이드 자리(.slide-frame)들
  let frameSents = [];        // 슬라이드마다 그 스크립트의 문장(.sent)들
  let offsets = [];           // 슬라이드마다 앞선 문장 수
  let totalSents = 0;
  let synth = null;
  let state = Object.assign({}, DEFAULTS);
  let pace = {};              // "목소리@속도" → 길이 하나에 드는 시간(ms)
  let memory = null;          // 이 문서의 읽던 자리 (SlidesMemory 의 한 칸)
  let disposers = [];         // destroy() 에서 부를 리스너 해제 함수
  let wordMark = null;        // CSS Custom Highlight
  let reading = null;         // { index, frame, list(문장들), at, onDone }
  let autoplay = null;        // { at, timer, started, pendingAt }
  let fullOn = false;
  let fullFrame = null;
  let settingsEl = null;      // 읽기 설정 줄의 제자리 (헤더의 화면 설정 패널 안)
  let slidePop = null;        // 전체 화면 안의 설정 창
  let playbar = null;
  let captionEl = null, capText = null, capHl = null, capLast = null, capTimer = null;
  let capSent = null, capParts = null, capPart = 0;   // 자막에 띄운 문장, 그 조각들([시작, 끝]), 지금 조각
  let viewer = null, viewList = [], viewAt = 0, viewFrom = null;
  let rateDrag = false;
  let author = "all";

  function all(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  function icon(name) {
    return window.SiteModules.Icons.html(name);
  }

  function listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    disposers.push(function () { target.removeEventListener(type, handler, options); });
  }

  function isActive() {
    return !!root;
  }

  // ---------------------------------------------------------------------------
  // 설정 기억: 항목마다 허용된 값인지 확인하고, 어긋나면 기본값을 쓴다
  // ---------------------------------------------------------------------------
  function loadSettings() {
    state = Object.assign({}, DEFAULTS);
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") || {};
      const isColor = function (v) { return /^#[0-9a-f]{6}$/i.test(v); };
      if (typeof saved.voice === "string") state.voice = saved.voice;
      if (typeof saved.rate === "number" && saved.rate >= RATE_MIN / 100 && saved.rate <= RATE_MAX / 100) state.rate = saved.rate;
      if (UNITS.indexOf(saved.unit) !== -1) state.unit = saved.unit;
      if (isColor(saved.cue)) state.cue = saved.cue.toLowerCase();
      if (typeof saved.caption === "boolean") state.caption = saved.caption;
      if (saved.capV === "top" || saved.capV === "bottom") state.capV = saved.capV;
      if (["left", "center", "right"].indexOf(saved.capH) !== -1) state.capH = saved.capH;
      if (isColor(saved.capBg)) state.capBg = saved.capBg.toLowerCase();
      if (typeof saved.capAlpha === "number" && saved.capAlpha >= 0 && saved.capAlpha <= 100) state.capAlpha = saved.capAlpha;
      if (typeof saved.capBlur === "number" && saved.capBlur >= 0 && saved.capBlur <= 20) state.capBlur = saved.capBlur;
      if (typeof saved.capSize === "number" && saved.capSize >= CAP_SIZE_MIN && saved.capSize <= CAP_SIZE_MAX) state.capSize = saved.capSize;
    } catch (err) {
      console.warn("[Slides] 읽기 설정을 읽지 못해 기본값으로 엽니다:", err);
    }
    pace = {};
    try {
      pace = JSON.parse(localStorage.getItem(PACE_KEY) || "{}") || {};
    } catch (err) {
      console.warn("[Slides] 읽는 빠르기 기록을 읽지 못해 어림값으로 시작합니다:", err);
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn("[Slides] 읽기 설정을 저장하지 못했습니다:", err);
    }
  }

  // ---------------------------------------------------------------------------
  // 스크립트 문단을 문장으로 나눠 <span class="sent">로 감싼다. 마침표·물음표·느낌표에서 끊는다.
  // ---------------------------------------------------------------------------
  function splitSentences(p) {
    if (p.querySelector(":scope > .sent")) return;   // 이미 나눈 문단 (같은 본문에 두 번 붙을 때)
    const nodes = Array.prototype.slice.call(p.childNodes);
    let cur = null;
    function open() {
      if (!cur) {
        cur = document.createElement("span");
        cur.className = "sent";
        p.appendChild(cur);
      }
      return cur;
    }
    nodes.forEach(function (n) { p.removeChild(n); });
    nodes.forEach(function (n) {
      if (n.nodeType === Node.TEXT_NODE) {
        (n.nodeValue.match(SENTENCE_PIECES) || []).forEach(function (piece) {
          if (!cur && !piece.trim()) {
            p.appendChild(document.createTextNode(piece));
            return;
          }
          const lead = !cur && piece.match(/^\s+/);   // 문장 앞의 빈칸은 문장 밖에 둔다
          if (lead) {
            p.appendChild(document.createTextNode(lead[0]));
            piece = piece.slice(lead[0].length);
          }
          open().appendChild(document.createTextNode(piece));
          if (SENTENCE_END.test(piece)) cur = null;
        });
      } else {
        open().appendChild(n);
        if (SENTENCE_END.test(n.textContent)) cur = null;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 목소리
  // ---------------------------------------------------------------------------
  function docLangPattern() {
    const holder = root.closest("[lang]");
    const lang = (holder && holder.getAttribute("lang")) || document.documentElement.lang || "ko";
    return new RegExp("^" + lang.split("-")[0].replace(/[^a-z]/gi, ""), "i");
  }

  // 자동일 때 목소리를 고르는 순서. font-family처럼 앞에서부터 찾아 처음 있는 것을 쓴다.
  const VOICE_ORDER = [
    // 시스템 설정 엔진: 추후 개발. 사용자의 목소리 지문을 학습해 사용자가 읽는 것처럼 들리게 하는 엔진. 지금은 항상 없음.
    { name: "시스템 설정 엔진", find: function () { return null; } },
    { name: "Google", find: function (vs) { return vs.filter(function (v) { return /google/i.test(v.name); })[0]; } },
    { name: "Microsoft", find: function (vs) { return vs.filter(function (v) { return /microsoft/i.test(v.name); })[0]; } },
    { name: "시스템 기본", find: function (vs) { return vs.filter(function (v) { return v.default; })[0] || vs[0]; } }
  ];

  function autoVoice() {
    const voices = synth.getVoices();
    const langRe = docLangPattern();
    const matched = voices.filter(function (v) { return langRe.test(v.lang); });
    const pool = matched.length ? matched : voices;   // 문서의 언어에 맞는 목소리 안에서 먼저 고른다
    for (let i = 0; i < VOICE_ORDER.length; i++) {
      const v = VOICE_ORDER[i].find(pool);
      if (v) return v;
    }
    return null;
  }

  function pickVoice() {
    return synth.getVoices().filter(function (v) { return v.voiceURI === state.voice; })[0] || autoVoice();
  }

  function fillVoices() {
    if (!synth || !settingsEl) return;
    const select = settingsEl.querySelector("#sl-voice") || (slidePop && slidePop.querySelector("#sl-voice"));
    if (!select) return;
    const langRe = docLangPattern();
    const voices = synth.getVoices().slice().sort(function (a, b) {
      return (langRe.test(b.lang) - langRe.test(a.lang)) || a.name.localeCompare(b.name);
    });
    while (select.options.length > 1) select.remove(1);
    voices.forEach(function (v) {
      const o = document.createElement("option");
      o.value = v.voiceURI;
      o.textContent = v.name + " · " + v.lang;
      select.appendChild(o);
    });
    // 기억해 둔 목소리가 기기에 없으면 자동으로 읽는다
    select.value = voices.some(function (v) { return v.voiceURI === state.voice; }) ? state.voice : "";
    const auto = autoVoice();
    select.options[0].textContent = "자동 · " + (auto ? auto.name : "시스템 기본");
  }

  // ---------------------------------------------------------------------------
  // 읽기 설정 줄. 헤더의 화면 설정 패널에 등록하고, 전체 화면에서는 같은 줄을 슬라이드 위 창으로 옮겨 쓴다.
  // ---------------------------------------------------------------------------
  function pill(attr, value, label) {
    return '<button class="pill-btn" type="button" ' + attr + '="' + value + '" aria-pressed="false">' + label + "</button>";
  }

  function buildSettingsPanel() {
    const box = document.createElement("div");
    box.className = "sl-settings";
    box.id = "sl-settings";
    const cuePills = CUE_PRESETS.map(function (c) {
      return '<button class="pill-btn sl-swatch-btn" type="button" data-cue-color="' + c[0] + '" aria-pressed="false"><i style="background:' + c[0] + '"></i>' + c[1] + "</button>";
    }).join("");
    box.innerHTML =
      '<div class="sl-row" data-sl-setting><label class="sl-label" for="sl-voice">목소리</label><div class="sl-line">' +
        '<select class="sl-select" id="sl-voice"><option value="">자동</option></select></div></div>' +
      '<div class="sl-row" data-sl-setting><label class="sl-label" for="sl-rate">읽는 속도</label><div class="sl-line">' +
        '<span class="sl-range-wrap"><span class="sl-range-dots" id="sl-rate-dots" aria-hidden="true"></span>' +
        '<input class="sl-range" type="range" id="sl-rate" min="' + RATE_MIN + '" max="' + RATE_MAX + '" step="' + RATE_STEP + '" value="150"></span>' +
        '<output class="sl-range-value" id="sl-rate-value" for="sl-rate">150%</output></div></div>' +
      '<div class="sl-row" data-sl-setting><span class="sl-label">읽는 곳</span><div class="sl-line" id="sl-unit">' +
        pill("data-unit", "paragraph", "문단") + pill("data-unit", "sentence", "문장") + pill("data-unit", "word", "단어") + "</div></div>" +
      '<div class="sl-row" data-sl-setting><span class="sl-label">짚는 색</span><div class="sl-line" id="sl-cue">' + cuePills +
        '<label class="sl-color-pick" title="직접 고르기"><input type="color" id="sl-cue-color" value="#d32f2f" aria-label="짚는 색 직접 고르기"><span>직접</span></label></div></div>' +
      '<div class="sl-row" data-sl-setting><span class="sl-label">자막</span><div class="sl-line">' +
        '<span class="sl-line" id="sl-cap">' + pill("data-cap", "on", "보기") + pill("data-cap", "off", "끄기") + "</span>" +
        '<span class="sl-sep" aria-hidden="true"></span>' +
        '<span class="sl-line" id="sl-cap-v">' + pill("data-cap-v", "top", "위") + pill("data-cap-v", "bottom", "아래") + "</span>" +
        '<span class="sl-sep" aria-hidden="true"></span>' +
        '<span class="sl-line" id="sl-cap-h">' + pill("data-cap-h", "left", "왼쪽") + pill("data-cap-h", "center", "가운데") + pill("data-cap-h", "right", "오른쪽") + "</span></div></div>" +
      '<div class="sl-row" data-sl-setting><span class="sl-label">자막 모양</span><div class="sl-line">' +
        '<label class="sl-color-pick is-on" title="자막 배경색"><input type="color" id="sl-cap-bg" value="#000000" aria-label="자막 배경색"><span>배경색</span></label>' +
        '<span class="sl-sep" aria-hidden="true"></span>' +
        '<label class="sl-range-label" for="sl-cap-alpha">불투명도</label>' +
        '<span class="sl-range-wrap is-short"><input class="sl-range" type="range" id="sl-cap-alpha" min="0" max="100" step="5" value="30"></span>' +
        '<output class="sl-range-value" id="sl-cap-alpha-value" for="sl-cap-alpha">30%</output>' +
        '<span class="sl-sep" aria-hidden="true"></span>' +
        '<label class="sl-range-label" for="sl-cap-blur">흐림</label>' +
        '<span class="sl-range-wrap is-short"><input class="sl-range" type="range" id="sl-cap-blur" min="0" max="20" step="1" value="4"></span>' +
        '<output class="sl-range-value" id="sl-cap-blur-value" for="sl-cap-blur">4px</output>' +
        '<span class="sl-sep" aria-hidden="true"></span>' +
        '<label class="sl-range-label" for="sl-cap-size">글자 크기</label>' +
        '<span class="sl-range-wrap is-short"><input class="sl-range" type="range" id="sl-cap-size" min="' + CAP_SIZE_MIN + '" max="' + CAP_SIZE_MAX + '" step="' + CAP_SIZE_STEP + '" value="100"></span>' +
        '<output class="sl-range-value" id="sl-cap-size-value" for="sl-cap-size">100%</output></div></div>';

    const q = function (selector) { return box.querySelector(selector); };

    // 자석 지점의 점
    RATE_SNAPS.forEach(function (v) {
      const dot = document.createElement("i");
      dot.dataset.at = v;
      dot.style.left = ((v - RATE_MIN) / (RATE_MAX - RATE_MIN) * 100) + "%";
      q("#sl-rate-dots").appendChild(dot);
    });

    q("#sl-voice").addEventListener("change", function (e) {
      state.voice = e.target.value;
      saveSettings();
    });
    // 읽는 속도: 마우스나 손가락으로 끌 때만 자석 지점에 붙인다. 키보드는 5%씩 그대로 움직인다(붙으면 빠져나올 수 없다).
    const rate = q("#sl-rate");
    rate.addEventListener("pointerdown", function () { rateDrag = true; });
    rate.addEventListener("keydown", function () { rateDrag = false; });
    rate.addEventListener("input", function () {
      let v = Number(rate.value);
      if (rateDrag) RATE_SNAPS.forEach(function (snap) { if (Math.abs(v - snap) <= RATE_SNAP_RANGE) v = snap; });
      state.rate = v / 100;
      paintSettings();
      saveSettings();
    });
    q("#sl-unit").addEventListener("click", function (e) {
      const b = e.target.closest("[data-unit]");
      if (!b) return;
      state.unit = b.dataset.unit;
      paintSettings();
      saveSettings();
      paintTts();
    });
    q("#sl-cue").addEventListener("click", function (e) {
      const b = e.target.closest("[data-cue-color]");
      if (b) setOption("cue", b.dataset.cueColor);
    });
    q("#sl-cue-color").addEventListener("input", function (e) { setOption("cue", e.target.value.toLowerCase()); });
    q("#sl-cap").addEventListener("click", function (e) {
      const b = e.target.closest("[data-cap]");
      if (b) setOption("caption", b.dataset.cap === "on");
    });
    q("#sl-cap-v").addEventListener("click", function (e) {
      const b = e.target.closest("[data-cap-v]");
      if (b) setOption("capV", b.dataset.capV);
    });
    q("#sl-cap-h").addEventListener("click", function (e) {
      const b = e.target.closest("[data-cap-h]");
      if (b) setOption("capH", b.dataset.capH);
    });
    q("#sl-cap-bg").addEventListener("input", function (e) { setOption("capBg", e.target.value.toLowerCase()); });
    q("#sl-cap-alpha").addEventListener("input", function (e) { setOption("capAlpha", Number(e.target.value)); });
    q("#sl-cap-blur").addEventListener("input", function (e) { setOption("capBlur", Number(e.target.value)); });
    q("#sl-cap-size").addEventListener("input", function (e) { setOption("capSize", Number(e.target.value)); });
    return box;
  }

  // 짚는 색과 자막 값 하나를 바꾸고 화면에 바로 반영한다
  function setOption(key, value) {
    state[key] = value;
    paintSettings();
    saveSettings();
    paintFull();
    paintCaption();
  }

  // 설정 줄은 헤더 패널과 전체 화면의 창 사이를 오가므로 두 곳에서 모두 찾는다
  function settingNodes(selector) {
    let nodes = settingsEl ? all(selector, settingsEl) : [];
    if (slidePop) nodes = nodes.concat(all(selector, slidePop));
    return nodes;
  }

  function paintSettings() {
    // 짚는 색과 자막 모양은 진행 막대(body)와 헤더 패널에서도 쓰이므로 :root 에 적는다 (destroy 에서 지운다)
    const rootStyle = document.documentElement.style;
    const cr = parseInt(state.capBg.slice(1, 3), 16), cg = parseInt(state.capBg.slice(3, 5), 16), cb = parseInt(state.capBg.slice(5, 7), 16);
    rootStyle.setProperty("--sl-cue", state.cue);
    rootStyle.setProperty("--sl-cap-bg", "rgba(" + cr + ", " + cg + ", " + cb + ", " + (state.capAlpha / 100) + ")");
    // 자막 글자색은 배경의 밝기에 맞춰 고른다
    rootStyle.setProperty("--sl-cap-fg", (0.299 * cr + 0.587 * cg + 0.114 * cb) > 150 ? "#111" : "#fff");
    rootStyle.setProperty("--sl-cap-blur", state.capBlur ? "blur(" + state.capBlur + "px)" : "none");
    rootStyle.setProperty("--sl-cap-scale", String(state.capSize / 100));
    if (!settingsEl) return;

    const pct = Math.round(state.rate * 100);
    const press = function (selector, isOn) {
      settingNodes(selector).forEach(function (b) { b.setAttribute("aria-pressed", String(!!isOn(b))); });
    };
    const setValue = function (selector, value) { settingNodes(selector).forEach(function (n) { n.value = value; }); };
    const setText = function (selector, text) { settingNodes(selector).forEach(function (n) { n.textContent = text; }); };

    setValue("#sl-rate", pct);
    setText("#sl-rate-value", pct + "%");
    settingNodes("#sl-rate-dots i").forEach(function (d) { d.classList.toggle("is-on", Number(d.dataset.at) === pct); });
    press("#sl-unit .pill-btn", function (b) { return b.dataset.unit === state.unit; });
    let isPreset = false;
    press("#sl-cue [data-cue-color]", function (b) {
      const on = b.dataset.cueColor === state.cue;
      if (on) isPreset = true;
      return on;
    });
    setValue("#sl-cue-color", state.cue);
    settingNodes("#sl-cue-color").forEach(function (n) { n.parentNode.classList.toggle("is-on", !isPreset); });
    press("#sl-cap .pill-btn", function (b) { return (b.dataset.cap === "on") === state.caption; });
    press("#sl-cap-v .pill-btn", function (b) { return b.dataset.capV === state.capV; });
    press("#sl-cap-h .pill-btn", function (b) { return b.dataset.capH === state.capH; });
    setValue("#sl-cap-bg", state.capBg);
    setValue("#sl-cap-alpha", state.capAlpha);
    setText("#sl-cap-alpha-value", state.capAlpha + "%");
    setValue("#sl-cap-blur", state.capBlur);
    setText("#sl-cap-blur-value", state.capBlur + "px");
    setValue("#sl-cap-size", state.capSize);
    setText("#sl-cap-size-value", state.capSize + "%");
  }

  // 전체 화면 안의 설정 창. 헤더의 읽기 설정 줄(data-sl-setting)을 옮겨 와 쓰고, 닫을 때 제자리로 돌려놓는다.
  function closeSlideSettings() {
    if (!slidePop) return;
    all("[data-sl-setting]", slidePop).forEach(function (row) { settingsEl.appendChild(row); });
    slidePop.remove();
    slidePop = null;
    all(".sl-gear", root).forEach(function (g) { g.setAttribute("aria-expanded", "false"); });
  }

  function toggleSlideSettings() {
    if (slidePop) {
      closeSlideSettings();
      return;
    }
    if (!fullOn || !settingsEl) return;
    slidePop = document.createElement("div");
    slidePop.className = "sl-settings sl-settings-pop";
    slidePop.setAttribute("role", "dialog");
    slidePop.setAttribute("aria-label", "읽기 설정");
    all("[data-sl-setting]", settingsEl).forEach(function (row) { slidePop.appendChild(row); });
    fullFrame.appendChild(slidePop);   // 단추 줄 바로 아래에 붙도록 슬라이드 자리에 넣는다
    all(".sl-gear", root).forEach(function (g) { g.setAttribute("aria-expanded", "true"); });
  }

  // ---------------------------------------------------------------------------
  // 자막: 전체 화면에서 읽는 동안, 지금 읽는 문장을 정해 둔 자리에 보여 준다
  // ---------------------------------------------------------------------------
  function removeCaption() {
    clearTimeout(capTimer);
    if (captionEl) captionEl.remove();
    captionEl = null;
    capLast = null;
    capSent = null;
    capParts = null;
    capPart = 0;
  }

  /**
   * 자막에 띄울 조각으로 문장을 나눈다. 단위는 문장 하나지만, 문장이 길면 쉼표에서 끊는다.
   *   - 짧은 문장(CAP_SPLIT_MIN_SENTENCE 이하)은 끊지 않는다.
   *   - 나열(예시)의 쉼표에서는 끊지 않는다: 쉼표 앞 토막이 짧거나, 다음 쉼표까지의 토막이 짧으면 나열로 본다.
   *   - 끊은 조각이 너무 짧으면(CAP_SPLIT_MIN_PART 미만) 옆 조각에 붙인다.
   * @param {string} text 문장
   * @returns {number[][]} 조각마다 [시작, 끝] 글자 위치. 끊지 않으면 조각 하나
   */
  function captionParts(text) {
    const whole = [[0, text.length]];
    if (text.trim().length <= CAP_SPLIT_MIN_SENTENCE) return whole;
    const commas = [];   // 쉼표마다 [쉼표 자리, 다음 조각이 시작하는 자리]
    let m;
    CAP_COMMA.lastIndex = 0;
    while ((m = CAP_COMMA.exec(text))) commas.push([m.index, m.index + m[0].length]);
    if (!commas.length) return whole;

    const parts = [];
    let from = 0;
    commas.forEach(function (comma, i) {
      const before = text.slice(i ? commas[i - 1][1] : 0, comma[0]).trim().length;
      const after = i + 1 < commas.length ? text.slice(comma[1], commas[i + 1][0]).trim().length : Infinity;
      if (before <= CAP_LIST_ITEM_MAX || after <= CAP_LIST_ITEM_MAX) return;       // 나열의 쉼표
      if (text.slice(from, comma[1]).trim().length < CAP_SPLIT_MIN_PART) return;   // 조각이 너무 짧다
      parts.push([from, comma[1]]);
      from = comma[1];
    });
    parts.push([from, text.length]);
    const last = parts[parts.length - 1];
    if (parts.length > 1 && text.slice(last[0], last[1]).trim().length < CAP_SPLIT_MIN_PART) {
      parts.pop();
      parts[parts.length - 1][1] = text.length;
    }
    return parts;
  }

  // 자막에 지금 조각을 띄운다. 조각이 바뀌면 단어 상자를 감추고, 다음 단어 신호에서 새 자리에 나타난다.
  function showCapPart() {
    const part = capParts[capPart];
    const text = capSent.textContent.slice(part[0], part[1]).replace(/\s+$/, "");
    if (capText.textContent !== text || state.unit !== "word") {
      clearTimeout(capTimer);
      capText.textContent = text;
      capHl.classList.remove("is-slide");
      capHl.style.opacity = 0;
      capLast = null;
    }
  }

  // 읽는 자리(문장 안의 글자 위치)가 다음 조각으로 넘어가면 자막을 그 조각으로 바꾼다
  function followCaption(start) {
    if (!captionEl || !capParts) return;
    let i = capParts.length - 1;
    while (i > 0 && start < capParts[i][0]) i--;
    if (i === capPart) return;
    capPart = i;
    showCapPart();
  }

  function paintCaption() {
    if (!(fullOn && reading && state.caption)) {
      removeCaption();
      return;
    }
    if (!captionEl) {
      captionEl = document.createElement("div");
      captionEl.className = "sl-caption";
      capHl = document.createElement("span");
      capHl.className = "sl-caption-hl";
      capText = document.createElement("span");
      capText.className = "sl-caption-text";
      captionEl.appendChild(capHl);
      captionEl.appendChild(capText);
    }
    if (captionEl.parentNode !== root) root.appendChild(captionEl);
    captionEl.dataset.v = state.capV;
    captionEl.dataset.h = state.capH;
    const sent = reading.list[reading.at];
    if (capSent !== sent) {
      capSent = sent;
      capParts = captionParts(sent.textContent);
      capPart = 0;
    }
    showCapPart();
  }

  function placeCapHl(box) {
    capHl.style.left = box.x + "px";
    capHl.style.top = box.y + "px";
    capHl.style.width = box.w + "px";
    capHl.style.height = box.h + "px";
  }

  // 자막의 단어 상자를 옮긴다. 같은 줄이면 미끄러지고, 줄이 바뀌면 사라졌다가 새 자리에서 나타난다.
  function moveCapHl(start, len) {
    const node = captionEl && capText.firstChild;
    if (!node || !len) return;
    const range = document.createRange();
    range.setStart(node, Math.min(start, node.length));
    range.setEnd(node, Math.min(start + len, node.length));
    const rect = range.getClientRects()[0];
    if (!rect) return;
    const base = captionEl.getBoundingClientRect();
    const box = { x: rect.left - base.left - 3, y: rect.top - base.top, w: rect.width + 6, h: rect.height };
    clearTimeout(capTimer);
    if (!capLast) {
      capHl.classList.remove("is-slide");
      placeCapHl(box);
      capHl.style.opacity = 1;
    } else if (Math.abs(box.y - capLast.y) > 2) {
      capHl.classList.remove("is-slide");
      capHl.style.opacity = 0;
      capTimer = setTimeout(function () {
        if (!captionEl) return;
        placeCapHl(box);
        capHl.style.opacity = 1;
      }, CAPTION_LINE_FADE_MS);
    } else {
      capHl.classList.add("is-slide");
      placeCapHl(box);
      capHl.style.opacity = 1;
    }
    capLast = box;
  }

  // ---------------------------------------------------------------------------
  // 읽는 곳 표시와 슬라이드 짚기
  // ---------------------------------------------------------------------------
  // 지금 읽는 문장에 걸린 data-cue를 모은다: 문단에 붙은 것과 문장 안에 든 것. 이름은 그 슬라이드 안에서만 찾는다.
  function applyCues(sent) {
    const slide = reading.frame.querySelector(".slide");
    const holders = all("[data-cue]", sent);
    const p = sent.closest("p");
    if (p && p.hasAttribute("data-cue")) holders.push(p);
    holders.forEach(function (holder) {
      holder.getAttribute("data-cue").split(/\s+/).forEach(function (token) {
        if (!token) return;
        const pair = token.split(":");
        const how = CUE_HOW.indexOf(pair[1]) !== -1 ? pair[1] : "underline";
        all('[data-key~="' + CSS.escape(pair[0]) + '"]', slide).forEach(function (target) { target.classList.add("cue-" + how); });
      });
    });
  }

  function clearCues(includeChecks) {
    all(".cue-underline, .cue-box", root).forEach(function (t) { t.classList.remove("cue-underline", "cue-box"); });
    if (includeChecks) all(".cue-check", root).forEach(function (t) { t.classList.remove("cue-check"); });
  }

  function paintTts() {
    if (!root) return;
    all(".sl-tts", root).forEach(function (b) {
      const on = !!reading && reading.frame === b.parentNode;
      const label = on ? "읽기 멈춤" : "스크립트 읽어 주기";
      b.setAttribute("aria-pressed", String(on));
      b.setAttribute("aria-label", label);
      b.title = label;
      b.innerHTML = icon(on ? "play" : "volume");
    });
    all(".is-reading", root).forEach(function (el) { el.classList.remove("is-reading"); });
    if (wordMark) wordMark.clear();
    // 밑줄과 테두리는 그 문장을 읽는 동안만, 체크는 읽기가 끝날 때까지 남긴다
    clearCues(!reading);
    if (!reading) {
      paintCaption();
      paintProg();
      return;
    }
    const sent = reading.list[reading.at];
    const mark = state.unit === "paragraph" ? sent.closest("p") : sent;
    mark.classList.add("is-reading");
    // 읽는 곳이 화면 밖이면 보이는 자리까지만 스크롤한다. 이어 재생 중에는 슬라이드를 화면에 둔다.
    if (!fullOn && !autoplay) mark.scrollIntoView({ block: "nearest", behavior: "smooth" });
    applyCues(sent);
    paintCaption();
  }

  // 문장 안의 글자 위치(start~end)를 화면의 범위로 바꾼다
  function rangeIn(el, start, end) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let pos = 0, began = false, node;
    while ((node = walker.nextNode())) {
      const len = node.nodeValue.length;
      if (!began && start < pos + len) {
        range.setStart(node, start - pos);
        began = true;
      }
      if (began && end <= pos + len) {
        range.setEnd(node, end - pos);
        return range;
      }
      pos += len;
    }
    return null;
  }

  function markWord(sent, start, len) {
    followCaption(start);   // 자막의 조각은 「읽는 곳」 설정과 상관없이 읽는 자리를 따라간다
    if (state.unit !== "word") return;
    if (wordMark) {
      wordMark.clear();
      const range = len ? rangeIn(sent, start, start + len) : null;
      if (range) wordMark.add(range);
    }
    moveCapHl(start - (capParts ? capParts[capPart][0] : 0), len);   // 자막에는 조각만 있으므로 조각 안의 자리로 바꾼다
  }

  // ---------------------------------------------------------------------------
  // 읽는 빠르기: 문장을 다 읽을 때마다 걸린 시간을 재서 목소리와 속도별로 기억해 둔다.
  // 단어 위치를 알려 주지 않는 목소리의 단어 넘기기와, 진행 막대가 문장 안에서 움직이는 빠르기에 쓴다.
  // ---------------------------------------------------------------------------
  // 낱말 하나의 길이: 글자 수 + 띄어쓰기 1, 쉼표로 끝나면 쉬는 만큼 2를 더한다
  function wordUnits(word) {
    return word.length + 1 + (/[,，、:;]$/.test(word) ? 2 : 0);
  }

  function textUnits(text) {
    let n = 0;
    text.replace(/\S+/g, function (m) { n += wordUnits(m); return m; });
    return n || 1;
  }

  function paceKey(voice) {
    return (voice ? voice.voiceURI : "default") + "@" + state.rate;
  }

  function msPerUnit(voice) {
    const v = pace[paceKey(voice)];
    return (typeof v === "number" && v > 5 && v < 2000) ? v : 1000 / (FIRST_PACE_CHARS_PER_SEC * state.rate);
  }

  function learnPace(voice, units, ms) {
    if (ms < PACE_MIN_SAMPLE_MS) return;
    const key = paceKey(voice), now = ms / units;
    // 새로 잰 값을 6, 앞의 값을 4의 비율로 섞는다
    pace[key] = (typeof pace[key] === "number") ? pace[key] * 0.4 + now * 0.6 : now;
    try {
      localStorage.setItem(PACE_KEY, JSON.stringify(pace));
    } catch (err) {
      console.warn("[Slides] 읽는 빠르기 기록을 저장하지 못했습니다:", err);
    }
  }

  // ---------------------------------------------------------------------------
  // 진행 막대: 화면 맨 아래의 1px 선. 다 읽은 문장 수를 기준으로 하고, 읽는 문장 안에서는 어림한 시간만큼 부드럽게 나아간다.
  // 한 번 재생한 뒤에는 멈춰도 지우지 않고, 다시 재생하면 기억해 둔 자리부터 읽는다.
  // memory.ctx 는 막대가 보여 주는 것: "auto"(이어 재생 = 문서 전체) 또는 슬라이드 번호.
  // ---------------------------------------------------------------------------
  function progInfo() {
    if (autoplay) {
      memory.ctx = "auto";
      return { done: offsets[autoplay.at] + (reading ? reading.at : (autoplay.pendingAt || 0)), total: totalSents };
    }
    if (reading) {
      memory.ctx = reading.index;
      return { done: reading.at, total: reading.list.length };
    }
    if (memory.ctx === null || memory.ctx === undefined) return null;
    if (memory.ctx === "auto") {
      const i = Math.min(memory.autoAt || 0, frames.length - 1);
      return { done: offsets[i] + (memory.resume[i] || 0), total: totalSents };
    }
    if (!frameSents[memory.ctx]) return null;
    return { done: memory.resume[memory.ctx] || 0, total: frameSents[memory.ctx].length };
  }

  // ms가 있으면 지금 문장의 끝까지 그 시간 동안 나아가고, 없으면 다 읽은 자리에 맞춘다
  function paintProg(ms) {
    if (!playbar || !root) return;
    const p = progInfo();
    if (!p || !p.total) {
      playbar.hidden = true;
      return;
    }
    const host = fullOn ? root : document.body;   // 전체 화면에서는 그 안에 있어야 보인다
    if (playbar.parentNode !== host) host.appendChild(playbar);
    playbar.hidden = false;
    const bar = playbar.firstChild;
    bar.style.transition = "none";
    bar.style.width = (p.done / p.total * 100) + "%";
    if (!ms) return;
    void bar.offsetWidth;   // 위에서 맞춘 자리를 먼저 그리게 한 다음 움직인다
    bar.style.transition = "width " + Math.round(ms) + "ms linear";
    bar.style.width = ((p.done + 1) / p.total * 100) + "%";
  }

  // 읽던 슬라이드 안에서 k번째 문장으로 옮겨 거기서부터 읽는다
  function jumpTo(k) {
    const r = reading;
    if (!r) return;
    clearCues(true);
    clearTimeout(r.guess);
    reading = { index: r.index, frame: r.frame, list: r.list, at: k, onDone: r.onDone, guess: null };   // 새 객체로 바꿔 앞 문장의 신호를 버린다
    synth.cancel();
    speakNext();
  }

  // 문서 전체에서 k번째 문장이 든 슬라이드 번호
  function frameIndexOf(k) {
    let i = frames.length - 1;
    while (i > 0 && offsets[i] > k) i--;
    return i;
  }

  function onPlaybarClick(e) {
    const p = progInfo();
    if (!p) return;
    const k = Math.min(p.total - 1, Math.max(0, Math.floor(e.clientX / window.innerWidth * p.total)));
    if (autoplay) {
      const a = autoplay, i = frameIndexOf(k);
      clearTimeout(a.timer);
      if (reading && i === a.at) jumpTo(k - offsets[i]);
      else {
        stopTts(true);
        playAt(i, k - offsets[i]);
      }
    } else if (reading) jumpTo(k);
    else if (memory.ctx === "auto") beginAuto(k);       // 멈춰 있을 때: 기억해 둔 것을 그 자리부터 다시 읽는다
    else startTts(memory.ctx, null, false, k);
  }

  // ---------------------------------------------------------------------------
  // 읽어 주기
  // ---------------------------------------------------------------------------
  function stopTts(keepAuto) {
    if (!keepAuto && autoplay) {
      clearTimeout(autoplay.timer);
      autoplay = null;
      paintPlay();
    }
    if (!reading) return;
    clearTimeout(reading.guess);
    reading = null;
    synth.cancel();
    paintTts();
  }

  function speakNext() {
    const r = reading;
    if (!r) return;
    if (r.at >= r.list.length) {
      memory.resume[r.index] = r.list.length;
      reading = null;
      paintTts();
      if (r.onDone) r.onDone();
      return;
    }
    memory.resume[r.index] = r.at;
    paintTts();
    paintProg();
    const sent = r.list[r.at];
    const utter = new SpeechSynthesisUtterance(sent.textContent);
    const voice = pickVoice();
    utter.lang = voice ? voice.lang : "ko-KR";
    if (voice) utter.voice = voice;
    utter.rate = state.rate;
    const units = textUnits(utter.text), per = msPerUnit(voice);
    // 멈추거나 다른 슬라이드를 읽기 시작한 뒤에 오는 신호는 버린다
    let real = false, startedAt = 0;
    utter.onstart = function () {
      if (reading !== r) return;
      startedAt = Date.now();
      paintProg(units * per);
      // 단어 위치를 알려 주지 않는 목소리(온라인 목소리 등)는 재어 둔 빠르기로 어림해 단어를 넘긴다.
      // 진짜 신호가 한 번이라도 오면 어림을 그만둔다.
      const words = [];
      let k = 0;
      utter.text.replace(/\S+/g, function (m, i) { words.push([i, m]); return m; });
      (function tick() {
        if (reading !== r || real || k >= words.length) return;
        markWord(sent, words[k][0], words[k][1].length);
        r.guess = setTimeout(tick, wordUnits(words[k][1]) * per);
        k++;
      })();
    };
    utter.onboundary = function (e) {
      if (reading !== r) return;
      if (e.name && e.name !== "word") return;
      real = true;
      clearTimeout(r.guess);
      const len = e.charLength || (utter.text.slice(e.charIndex).match(/^\S+/) || [""])[0].length;
      markWord(sent, e.charIndex, len);
    };
    utter.onend = function () {
      if (reading !== r) return;
      clearTimeout(r.guess);
      if (startedAt) learnPace(voice, units, Date.now() - startedAt);
      r.at++;
      speakNext();
    };
    utter.onerror = function (e) {
      if (reading !== r) return;
      clearTimeout(r.guess);
      console.warn("[Slides] 읽어 주기를 멈췄습니다:", e.error);
      stopTts();
    };
    synth.speak(utter);
  }

  /**
   * index번째 슬라이드의 스크립트를 읽는다.
   * @param {number} index 슬라이드 번호
   * @param {Function|null} onDone 끝까지 읽었을 때 부를 함수 (이어 재생이 다음 슬라이드로 넘어갈 때 쓴다)
   * @param {boolean} keepAuto 이어 재생을 멈추지 않는다
   * @param {number|null} startAt 읽기 시작할 문장. 없으면 기억해 둔 자리부터, 끝까지 읽었던 슬라이드는 처음부터
   */
  function startTts(index, onDone, keepAuto, startAt) {
    stopTts(keepAuto);
    const list = frameSents[index] || [];
    if (!list.length) {
      if (onDone) onDone();
      return;
    }
    synth.cancel();
    let at = (startAt === null || startAt === undefined) ? (memory.resume[index] || 0) : startAt;
    if (at >= list.length) at = 0;
    reading = { index: index, frame: frames[index], list: list, at: at, onDone: onDone || null, guess: null };
    speakNext();
  }

  // ---------------------------------------------------------------------------
  // 이어 재생: 헤더의 재생 단추. 문서의 첫 슬라이드(또는 기억해 둔 자리)부터 끝 슬라이드까지 차례로 읽는다
  // ---------------------------------------------------------------------------
  function paintPlay() {
    const on = !!autoplay;
    window.SiteModules.Header.updateAction(PLAY_ACTION_ID, {
      icon: on ? "stop" : "play",
      label: on ? "재생 멈춤" : "슬라이드 이어 재생",
      pressed: on
    });
    paintProg();
  }

  // i번째 슬라이드를 startAt번째 문장부터 읽는다. startAt이 없으면 그 슬라이드에서 기억해 둔 자리부터.
  function playAt(i, startAt) {
    const a = autoplay;
    if (!a) return;
    if (i >= frames.length) {
      autoplay = null;
      paintPlay();
      return;
    }
    const hasStart = !(startAt === null || startAt === undefined);
    a.at = i;
    a.pendingAt = hasStart ? startAt : (memory.resume[i] || 0);
    memory.autoAt = i;
    const frame = frames[i];
    if (fullOn) {
      // 전체 화면에서는 스크롤 대신 다음 슬라이드로 넘긴다
      closeViewer();
      closeSlideSettings();
      fullFrame = frame;
      paintFull();
    } else {
      frame.closest("section").scrollIntoView({ block: "start", behavior: "smooth" });
    }
    paintProg();
    const begin = function () {
      startTts(i, function () { if (autoplay === a) playAt(i + 1, 0); }, true, hasStart ? startAt : null);
    };
    // 스크롤이 멈춘 다음(길어도 2.5초) 읽기 시작한다. 처음 시작할 때와 전체 화면에서는 바로 읽는다.
    if (!a.started || fullOn) {
      a.started = true;
      begin();
      return;
    }
    let lastTop = null, waited = 0;
    (function settle() {
      a.timer = setTimeout(function () {
        if (autoplay !== a) return;
        const top = frame.getBoundingClientRect().top;
        waited += AUTO_SETTLE_POLL_MS;
        if (waited >= AUTO_SETTLE_MIN_MS && (top === lastTop || waited >= AUTO_SETTLE_MAX_MS)) {
          begin();
          return;
        }
        lastTop = top;
        settle();
      }, AUTO_SETTLE_POLL_MS);
    })();
  }

  // 이어 재생을 시작한다. k가 있으면 문서 전체에서 k번째 문장부터, 없으면 기억해 둔 자리부터.
  function beginAuto(k) {
    if (!totalSents) return;
    stopTts();
    let i, at = null;
    if (k === null || k === undefined) {
      i = Math.min(memory.autoAt || 0, frames.length - 1);
      if ((memory.resume[i] || 0) >= frameSents[i].length) {
        // 그 슬라이드를 끝까지 읽었으면 다음 슬라이드로. 마지막 슬라이드였으면 처음으로 돌아간다.
        if (i < frames.length - 1) {
          i++;
          at = 0;
        } else {
          i = 0;
          at = 0;
          frames.forEach(function (f, n) { memory.resume[n] = 0; });
        }
      }
    } else {
      i = frameIndexOf(k);
      at = k - offsets[i];
    }
    autoplay = { at: i, timer: null, started: false, pendingAt: 0 };
    paintPlay();
    playAt(i, at);
  }

  function togglePlay() {
    if (autoplay) stopTts();
    else beginAuto(null);
  }

  // ---------------------------------------------------------------------------
  // 슬라이드 전체 화면: 문서 상자를 통째로 띄우고 고른 슬라이드 하나만 남긴다
  // ---------------------------------------------------------------------------
  function buildFrameButtons() {
    frames.forEach(function (frame, index) {
      const make = function (className, name) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "icon-btn is-bare sl-btn " + className;
        b.innerHTML = icon(name);
        frame.appendChild(b);
        return b;
      };
      if (synth) {
        make("sl-tts", "volume").addEventListener("click", function () {
          if (reading && reading.frame === frame) stopTts();
          else startTts(index);
        });
        const gear = make("sl-gear", "gear");
        gear.setAttribute("aria-label", "읽기 설정");
        gear.setAttribute("aria-expanded", "false");
        gear.title = "읽기 설정";
        gear.addEventListener("click", toggleSlideSettings);
        make("sl-cc", "captions").addEventListener("click", function () { setOption("caption", !state.caption); });
      }
      make("sl-full", "fullscreen").addEventListener("click", function () {
        if (fullOn) exitFull();
        else enterFull(frame);
      });
      const count = document.createElement("span");
      count.className = "sl-count";
      frame.appendChild(count);
    });
  }

  function paintFull() {
    if (!root) return;
    frames.forEach(function (frame) {
      const full = frame.querySelector(".sl-full");
      full.setAttribute("aria-label", fullOn ? "전체 화면 닫기" : "전체 화면");
      full.title = fullOn ? "전체 화면 닫기 (Esc)" : "전체 화면";
      full.innerHTML = icon(fullOn ? "x" : "fullscreen");
      const cc = frame.querySelector(".sl-cc");
      if (cc) {
        const label = state.caption ? "자막 끄기" : "자막 보기";
        cc.setAttribute("aria-pressed", String(state.caption));
        cc.setAttribute("aria-label", label);
        cc.title = label;
      }
    });
    all("section.has-active", root).forEach(function (s) { s.classList.remove("has-active"); });
    if (!fullFrame) return;
    fullFrame.closest("section").classList.add("has-active");
    fullFrame.querySelector(".sl-count").textContent = (frames.indexOf(fullFrame) + 1) + " / " + frames.length;
  }

  function enterFull(frame) {
    window.SiteModules.Header.closePanel();
    fullOn = true;
    fullFrame = frame;
    root.classList.add("is-full");
    paintFull();
    paintCaption();
    paintProg();
    // 브라우저의 전체 화면을 쓸 수 없으면(미리보기 프레임 등) 창 안을 가득 채우는 것으로 대신한다
    const overlay = function (reason) {
      console.warn("[Slides] 전체 화면을 열지 못해 창 안에서 크게 보여 줍니다:", reason || "requestFullscreen 을 쓸 수 없습니다");
      if (fullOn && root) root.classList.add("is-overlay");
    };
    if (typeof root.requestFullscreen !== "function") {
      overlay();
      return;
    }
    try {
      root.requestFullscreen().then(function () {
        // 전체 화면이 열리기 전에 이미 닫았으면(열자마자 Esc) 브라우저의 전체 화면만 남지 않게 도로 닫는다
        if (!fullOn && document.fullscreenElement === root) document.exitFullscreen().catch(function () {});
      }, overlay);
    } catch (err) {
      overlay(err);
    }
  }

  function closeFull(skipScroll) {
    if (!fullOn) return;
    const frame = fullFrame;
    closeViewer();
    closeSlideSettings();
    root.classList.remove("is-full", "is-overlay");
    fullOn = false;
    fullFrame = null;
    paintFull();
    paintCaption();
    paintProg();
    // 본문에서 마지막에 보던 슬라이드 자리로 돌아간다
    if (!skipScroll && frame) frame.scrollIntoView({ block: "start", behavior: "instant" });
  }

  function exitFull() {
    if (document.fullscreenElement === root) {
      // 닫는 일은 fullscreenchange에서 한다
      document.exitFullscreen().catch(function (err) {
        console.warn("[Slides] 전체 화면을 닫지 못해 화면만 되돌립니다:", err);
        closeFull();
      });
    } else {
      closeFull();
    }
  }

  function stepFull(direction) {
    const next = frames[frames.indexOf(fullFrame) + direction];
    if (!next) return;   // 첫 장과 끝 장에서는 더 가지 않는다
    closeViewer();
    stopTts();
    closeSlideSettings();
    fullFrame = next;
    paintFull();
  }

  function onFullscreenChange() {
    if (!document.fullscreenElement && fullOn && !root.classList.contains("is-overlay")) closeFull();
  }

  // ---------------------------------------------------------------------------
  // 그림 크게 보기: data-view가 붙은 그림을 누르면, 그 그림이 놓인 슬라이드 안에서 크게 보여 준다.
  // 넘기는 범위는 같은 슬라이드의 그림이다. 슬라이드 밖의 그림은 같은 문서의 슬라이드 밖 그림끼리 창 전체에서 본다.
  // ---------------------------------------------------------------------------
  function paintViewer() {
    const link = viewList[viewAt];
    const img = viewer.querySelector("img");
    const thumb = link.querySelector("img");
    img.src = link.getAttribute("href");
    img.alt = (thumb && thumb.alt) || "";
    viewer.querySelector(".sl-viewer-cap").textContent = link.dataset.caption || img.alt;
    viewer.querySelector(".sl-viewer-count").textContent = viewList.length > 1 ? (viewAt + 1) + " / " + viewList.length : "";
    viewer.querySelector(".is-prev").disabled = viewAt === 0;
    viewer.querySelector(".is-next").disabled = viewAt === viewList.length - 1;
  }

  function stepViewer(direction) {
    const next = viewAt + direction;
    if (next < 0 || next >= viewList.length) return;   // 끝에서 처음으로 돌아가지 않는다
    viewAt = next;
    paintViewer();
  }

  function closeViewer() {
    if (!viewer) return;
    all(".slide-frame.is-viewing", root).forEach(function (f) { f.classList.remove("is-viewing"); });
    viewer.remove();
    viewer = null;
    if (viewFrom && viewFrom.isConnected) viewFrom.focus({ preventScroll: true });   // 눌렀던 썸네일로 초점을 돌려준다
  }

  function openViewer(link) {
    closeViewer();
    const slide = link.closest(".slide");
    // 16:9를 푼 좁은 슬라이드는 세로로 길어지므로 창 전체를 덮는다
    const inSlide = !!slide && (fullOn || slide.getBoundingClientRect().width > NARROW_SLIDE_PX);
    viewList = slide ? all("[data-view]", slide)
      : all("[data-view]", root).filter(function (x) { return !x.closest(".slide"); });
    viewAt = viewList.indexOf(link);
    viewFrom = link;
    viewer = document.createElement("div");
    viewer.className = "sl-viewer" + (inSlide ? "" : " is-window");
    viewer.setAttribute("role", "dialog");
    viewer.setAttribute("aria-label", "그림 크게 보기");
    viewer.innerHTML =
      '<div class="sl-viewer-stage"><img alt=""></div>' +
      '<div class="sl-viewer-foot"><span class="sl-viewer-cap"></span><span class="sl-viewer-count"></span></div>' +
      '<button class="sl-viewer-nav is-prev" type="button" aria-label="이전 그림" title="이전 그림"><span class="sl-viewer-chip">' + icon("chevron-left") + "</span></button>" +
      '<button class="sl-viewer-nav is-next" type="button" aria-label="다음 그림" title="다음 그림"><span class="sl-viewer-chip">' + icon("chevron-right") + "</span></button>" +
      '<button class="icon-btn sl-viewer-close" type="button" aria-label="닫기" title="닫기 (Esc)">' + icon("x") + "</button>";
    viewer.querySelector(".is-prev").addEventListener("click", function () { stepViewer(-1); });
    viewer.querySelector(".is-next").addEventListener("click", function () { stepViewer(1); });
    viewer.querySelector(".sl-viewer-close").addEventListener("click", closeViewer);
    // 빠르게 두 번 누르는 것이 사이트의 「본문 두 번 눌러 패널 열기」로 넘어가지 않게 한다
    viewer.addEventListener("dblclick", function (e) { e.stopPropagation(); });
    (inSlide ? slide : (fullOn ? root : document.body)).appendChild(viewer);
    if (inSlide) slide.closest(".slide-frame").classList.add("is-viewing");
    paintViewer();
    viewer.querySelector(".sl-viewer-close").focus({ preventScroll: true });
  }

  function onRootClick(e) {
    const link = e.target.closest("a[data-view]");
    if (!link || e.ctrlKey || e.metaKey || e.shiftKey) return;   // 새 탭으로 열려는 클릭은 그대로 둔다
    e.preventDefault();
    openViewer(link);
  }

  // ---------------------------------------------------------------------------
  // 단축키. 창(window)의 capture 단계에서 먼저 받아, 그림 보기와 전체 화면 동안에는 사이트의 단축키로 넘기지 않는다.
  // ---------------------------------------------------------------------------
  function onKeyDown(e) {
    if (!root) return;
    if (viewer) {
      // 그림을 크게 보는 동안에는 그림 넘기기와 닫기만 받는다
      e.stopImmediatePropagation();
      if (e.key === "Escape") closeViewer();
      else if (e.key === "ArrowRight") { e.preventDefault(); stepViewer(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); stepViewer(-1); }
      return;
    }
    if (fullOn) {
      // 전체 화면에서는 슬라이드 넘기기와 닫기만 받는다. 설정 창 안에서 누른 키는 그 컨트롤이 쓴다.
      e.stopImmediatePropagation();
      if (e.key === "Escape" && slidePop) { closeSlideSettings(); return; }
      if (e.key !== "Escape" && e.target.closest && e.target.closest(".sl-settings-pop")) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === "Escape") exitFull();
      else if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); stepFull(1); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); stepFull(-1); }
      return;
    }
    // 본문에서는 Esc 로 읽기만 멈춘다 (헤더 패널과 서랍을 닫는 것은 사이트가 한다)
    if (e.key === "Escape" && synth) stopTts();
  }

  // ---------------------------------------------------------------------------
  // 글쓴이 필터 (항목 카드가 있는 문서): 전체 / 내 경험과 생각 / Claude의 의견
  // ---------------------------------------------------------------------------
  function buildFilterPanel() {
    const box = document.createElement("div");
    box.className = "sl-settings";
    box.id = "sl-filter";
    box.innerHTML =
      '<div class="sl-row"><span class="sl-label">글쓴이</span><div class="sl-line" id="sl-author">' +
        pill("data-author", "all", "전체") + pill("data-author", "me", "내 경험과 생각") + pill("data-author", "claude", "Claude의 의견") +
      "</div></div>";
    box.addEventListener("click", function (e) {
      const b = e.target.closest("[data-author]");
      if (!b) return;
      author = b.dataset.author;
      applyAuthorFilter(box);
    });
    applyAuthorFilter(box);
    return box;
  }

  function applyAuthorFilter(box) {
    all("[data-author]", box).forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.author === author)); });
    all(".note", root).forEach(function (note) {
      const isMine = !note.classList.contains("claude");
      note.hidden = !(author === "all" || (author === "me") === isMine);
    });
    window.SiteModules.Header.setFilterActive(author !== "all");
  }

  // ---------------------------------------------------------------------------
  // 시작과 정리
  // ---------------------------------------------------------------------------
  function init() {
    destroy();
    const found = document.querySelector(ROOT_SELECTOR);
    if (!found) return;   // 다른 문서로 이미 넘어갔거나, 이 형식을 쓰지 않는 문서
    const Header = window.SiteModules.Header;
    const Navigation = window.SiteModules.Navigation;
    if (!Header || !Navigation || !window.SiteModules.Icons) {
      // 문서 파일을 직접 연 경우: 곧 사이트 뼈대(/#경로)로 옮겨 가므로 여기서는 아무 것도 하지 않는다
      console.info("[Slides] 사이트 뼈대가 없어 슬라이드 기능을 붙이지 않습니다.");
      return;
    }

    root = found;
    author = "all";
    frames = all(".slide-frame", root);
    const hasSlides = frames.length > 0;
    synth = hasSlides ? (window.speechSynthesis || null) : null;
    if (hasSlides && !synth) {
      console.info("[Slides] 이 브라우저는 읽어 주기를 지원하지 않아 스피커 단추와 읽기 설정, 이어 재생 단추를 넣지 않습니다.");
    }
    loadSettings();

    const pathKey = (window.SiteModules.state && window.SiteModules.state.currentPath) || window.location.hash;
    const store = window.SiteModules.SlidesMemory;
    memory = store[pathKey] || (store[pathKey] = { resume: [], autoAt: 0, ctx: null });

    if (hasSlides) {
      Object.keys(EXTRA_ICONS).forEach(function (name) { window.SiteModules.Icons.register(name, EXTRA_ICONS[name]); });
      all(".script > p:not(.meta)", root).forEach(splitSentences);
      frameSents = frames.map(function (frame) {
        const section = frame.closest("section");
        return section ? all(".script > p:not(.meta) .sent", section) : [];
      });
      offsets = [];
      totalSents = 0;
      frameSents.forEach(function (list) {
        offsets.push(totalSents);
        totalSents += list.length;
      });
      if (synth && window.CSS && CSS.highlights && window.Highlight) {
        wordMark = new Highlight();
        CSS.highlights.set(HIGHLIGHT_NAME, wordMark);
      }
      buildFrameButtons();

      if (synth) {
        playbar = document.createElement("div");
        playbar.className = "sl-playbar";
        playbar.hidden = true;
        playbar.title = "누른 자리부터 읽기";
        playbar.innerHTML = "<i></i>";
        playbar.addEventListener("click", onPlaybarClick);
        settingsEl = buildSettingsPanel();
        fillVoices();
        if (typeof synth.addEventListener === "function") listen(synth, "voiceschanged", fillVoices);
        listen(window, "pointerup", function () { rateDrag = false; });
      }
      listen(root, "click", onRootClick);
      // 슬라이드와 전체 화면 안에서 두 번 누르는 것이 사이트의 「본문 두 번 눌러 패널 열기」로 넘어가지 않게 한다
      listen(root, "dblclick", function (e) {
        if (fullOn || e.target.closest(".slide-frame")) e.stopPropagation();
      });
      listen(window, "keydown", onKeyDown, true);
      listen(document, "fullscreenchange", onFullscreenChange);
    }

    const filterEl = root.querySelector(".note.claude") ? buildFilterPanel() : null;
    if (settingsEl || filterEl) {
      const panels = {};
      if (settingsEl) panels.settings = settingsEl;
      if (filterEl) panels.filter = filterEl;
      Header.setPanels(panels);
    }
    if (synth) {
      Header.setActions([{ id: PLAY_ACTION_ID, icon: "play", label: "슬라이드 이어 재생", pressed: false, onClick: togglePlay }]);
    }

    if (synth) paintSettings();
    if (hasSlides) {
      paintFull();
      paintTts();
    }

    Navigation.onLeave(destroy);
    // 창을 닫거나 다른 사이트로 갈 때: 소리가 남지 않게 읽기를 멈춘다
    listen(window, "pagehide", function () {
      if (synth) {
        stopTts();
        synth.cancel();
      }
    });
  }

  /** 이 문서에 붙인 것을 모두 거둔다: 음성, 타이머, 전체 화면과 덮개, 진행 막대, 리스너, :root 에 적은 값. 여러 번 불러도 된다. */
  function destroy() {
    if (!root) return;
    try {
      if (synth) {
        stopTts();
        synth.cancel();
      }
      if (document.fullscreenElement === root) {
        document.exitFullscreen().catch(function (err) { console.warn("[Slides] 전체 화면을 닫지 못했습니다:", err); });
      }
      closeFull(true);
      closeViewer();
      closeSlideSettings();
      removeCaption();
    } catch (err) {
      console.error("[Slides] 화면 정리 중 오류:", err);
    }
    if (playbar) playbar.remove();
    // 본문에 붙인 단추와 필터 상태를 되돌린다 (본문이 그대로 남은 채 다시 붙는 경우에 겹치지 않게)
    all(".sl-btn, .sl-count", root).forEach(function (el) { el.remove(); });
    all(".note[hidden]", root).forEach(function (note) { note.hidden = false; });
    disposers.forEach(function (dispose) { dispose(); });
    disposers = [];
    if (wordMark && window.CSS && CSS.highlights) CSS.highlights.delete(HIGHLIGHT_NAME);
    ["--sl-cue", "--sl-cap-bg", "--sl-cap-fg", "--sl-cap-blur"].forEach(function (name) {
      document.documentElement.style.removeProperty(name);
    });
    root = null;
    frames = [];
    frameSents = [];
    offsets = [];
    totalSents = 0;
    synth = null;
    memory = null;
    wordMark = null;
    reading = null;
    autoplay = null;
    fullOn = false;
    fullFrame = null;
    settingsEl = null;
    slidePop = null;
    playbar = null;
    viewer = null;
    viewList = [];
    viewFrom = null;
  }

  return {
    init: init,
    destroy: destroy,
    isActive: isActive,
    captionParts: captionParts   // 자막을 끊는 규칙. 시험에서 문장을 직접 넣어 확인한다
  };
})();

window.SiteModules.Slides.init();
