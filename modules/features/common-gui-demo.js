/**
 * @file modules/features/common-gui-demo.js
 * @module SiteModules.CommonGuiDemo
 * @description 「WebApp Common GUI」 묶음(column/ai/webapp-common-gui/*.html)의 견본 동작.
 *   한 장짜리 견본(webapp-common-gui.html)의 스크립트를 사이트 뼈대 안에서 돌도록 옮긴 것이다.
 *   - 문서마다 다시 실행된다. 어느 문서인지는 본문의 .cg-doc[data-cg-page] 로 안다
 *     (base 화면 / calendar 달력 / list 리스트 / map 지도 / filter 필터 / abbr 단어 단축 / arch 구조 / extras 편의 기능).
 *   - 필터와 화면별 설정은 사이트 헤더의 패널(Header.setPanels)에 등록한다. 견본 자체의 헤더 · 탭 · 서랍 · 공유 · 단축키는
 *     사이트 뼈대가 이미 하는 일이라 옮기지 않았다.
 *   - 레일에 「미리보기 설정」을 더한다(Navigation.addRailItem). 모서리 값은 사이트의 --r-sm/md/lg 토큰에,
 *     영역 표시는 사이트의 실제 레일 · 패널 · 헤더 · 본문 위에 적용하고, 화면을 떠날 때 모두 되돌린다.
 *   - 필터 값과 미리보기 값은 이 묶음의 문서를 오가는 동안 메모리(SiteModules.CommonGuiDemo)에 둔다.
 *     화면별 설정과 단어 단축 규칙은 localStorage 에 기억한다 (키 끝의 판 번호는 저장 모양이 바뀌면 올린다).
 * @requires SiteModules.Navigation, SiteModules.Header, SiteModules.Icons
 * @exports (없음) SiteModules.CommonGuiDemo 는 문서 사이에서 이어 쓰는 상태 보관소다: { filter, preview }
 */

window.SiteModules = window.SiteModules || {};

(function () {
  "use strict";

  const root = document.querySelector(".cg-doc");
  // 스크립트가 늦게 도착해 이미 다른 문서로 넘어갔거나, 같은 문서에서 두 번 실행된 경우에는 아무 것도 하지 않는다
  if (!root || root.dataset.cgReady) return;
  root.dataset.cgReady = "1";

  const Site = window.SiteModules;
  const Navigation = Site.Navigation;
  const Header = Site.Header;
  const Icons = Site.Icons;
  if (!Navigation || !Header || !Icons) {
    console.error("[CommonGuiDemo] 사이트 뼈대 모듈(Navigation · Header · Icons)을 찾지 못해 견본을 시작하지 못했습니다.");
    return;
  }

  const pageName = root.dataset.cgPage || "";
  const $ = (id) => document.getElementById(id);
  const all = (selector, parent) => Array.from((parent || document).querySelectorAll(selector));
  const esc = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const pad = (n) => (n < 10 ? "0" + n : String(n));

  // 문서 사이에서 이어 쓰는 상태 (새로 고치면 사라진다)
  const DEFAULT_RADIUS = 8;
  const session = Site.CommonGuiDemo = Site.CommonGuiDemo || { filter: null, preview: { radius: DEFAULT_RADIUS, regions: false } };

  /* ---------- 떠날 때 정리 ---------- */
  const cleanups = [];
  function onCleanup(fn) { cleanups.push(fn); }
  // 본문 밖(window · document · matchMedia)에 거는 리스너는 떠날 때 반드시 떼어 낸다
  function listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    onCleanup(() => target.removeEventListener(type, handler, options));
  }
  Navigation.onLeave(() => {
    cleanups.forEach(fn => {
      try {
        fn();
      } catch (err) {
        console.error("[CommonGuiDemo] 정리 함수 실행 실패:", err);
      }
    });
  });

  /* ---------- 아이콘 ---------- */
  // 사이트에 이미 있는 그림은 그대로 쓰고(견본 이름 → 사이트 이름), 없는 그림만 cg- 를 붙여 더한다
  const SITE_ICONS = { menu: "menu", list: "list", filter: "filter", share: "share", gear: "gear", info: "info", search: "search", x: "x", chevl: "chevron-left", chevr: "chevron-right" };
  const OWN_ICONS = {
    sliders: '<path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h8M16 18h4"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="14" cy="18" r="2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    sort: '<path d="M7 4v16M3 8l4-4 4 4M17 20V4M21 16l-4 4-4-4"/>',
    up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    down: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    map: '<path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3zM9 3v15M15 6v15"/>',
    table: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M12 3v18"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    tack: '<path d="M12 17v5M8 3h8M9 3v6l-3 5v3h12v-3l-3-5V3"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A9.5 9.5 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-2.6 3.4M6.1 6.1A17 17 0 0 0 2 12s4 7 10 7a9.6 9.6 0 0 0 4-.9"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v4"/>',
    vol: '<path d="M11 5 6 9H2v6h4l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M18.4 5.6a9 9 0 0 1 0 12.8"/>',
    mute: '<path d="M11 5 6 9H2v6h4l5 4V5zM22 9l-6 6M16 9l6 6"/>',
    frame: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>',
    layers: '<path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    chev: '<path d="M6 9l6 6 6-6"/>'
  };
  Object.keys(OWN_ICONS).forEach(name => Icons.register("cg-" + name, OWN_ICONS[name]));
  function icon(name, extraClass) { return Icons.html(SITE_ICONS[name] || "cg-" + name, extraClass || ""); }

  /* ---------- 화면별 설정 ---------- */
  // 견본의 언어 · 테마 · 글자 크기는 사이트의 전체 설정이 맡으므로 여기에는 견본 화면에만 해당하는 값만 둔다
  const SETTINGS_KEY = "iseohyun_common_gui_demo_v1";
  const BOOLS = ["abbr", "cont", "skipEmpty", "rev", "chipR", "chipC", "legend"];
  const ALLOWED = { cal: ["auto", "chip", "dot"], map: ["area", "pin"], view: ["table", "card"], span: ["chip", "bar"] };
  const DEFAULTS = { cal: "auto", map: "area", legend: true, cont: false, skipEmpty: false, rev: false, chipR: true, chipC: true, view: "table", cols: { r: true, c: true, s: true, st: true }, span: "chip", abbr: true };
  // 읽을 때 항목마다 허용된 값인지 확인하고, 어긋난 항목만 기본값으로 둔다
  function loadSettings() {
    const loaded = structuredClone(DEFAULTS);
    try {
      const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
      if (raw && typeof raw === "object") {
        Object.keys(ALLOWED).forEach(key => { if (ALLOWED[key].includes(raw[key])) loaded[key] = raw[key]; });
        BOOLS.forEach(key => { if (typeof raw[key] === "boolean") loaded[key] = raw[key]; });
        if (raw.cols && typeof raw.cols === "object") {
          Object.keys(loaded.cols).forEach(key => { if (typeof raw.cols[key] === "boolean") loaded.cols[key] = raw.cols[key]; });
        }
      }
    } catch (err) {
      console.warn("[CommonGuiDemo] 설정을 읽지 못해 기본값을 씁니다:", err);
    }
    return loaded;
  }
  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (err) {
      console.warn("[CommonGuiDemo] 설정을 저장하지 못했습니다:", err);
    }
  }
  let settings = loadSettings();

  /* ---------- 예시 데이터 ---------- */
  const TODAY = "2026-11-13";
  const YEAR = 2026;
  const EVENTS = [
    { t: "2026년 제7회 서울특별시 가을 국화 전시회 (무료 입장)", r: "서울", c: "전시", s: "2026-10-20", e: "2026-11-08" },
    { t: "제580돌 한글날 기념 낭독회", r: "서울", c: "공연", s: "2026-10-09", e: "2026-10-09" },
    { t: "제12회 부산광역시 해변 불빛 축제", r: "부산", c: "축제", s: "2026-11-06", e: "2026-11-15" },
    { t: "대구광역시 시민 합창단 정기공연", r: "대구", c: "공연", s: "2026-11-13", e: "2026-11-14" },
    { t: "광주광역시 겨울 준비 장터", r: "광주", c: "축제", s: "2026-11-21", e: "2026-11-22" },
    { t: "제3회 제주특별자치도 사진 공모 수상작 전시회", r: "제주", c: "전시", s: "2026-11-10", e: "2026-11-30" },
    { t: "초보 목공 교실 (선착순 모집)", r: "대구", c: "교육", s: "2026-11-17", e: "2026-11-17" },
    { t: "감귤 수확 체험", r: "제주", c: "교육", s: "2026-11-28", e: "2026-11-29" },
    { t: "도서관 글쓰기 강좌", r: "광주", c: "교육", s: "2026-12-02", e: "2026-12-02" },
    { t: "대구광역시 겨울 판화 전시회", r: "대구", c: "전시", s: "2026-12-05", e: "2026-12-20" },
    { t: "2026년 부산광역시 연말 재즈의 밤", r: "부산", c: "공연", s: "2026-12-12", e: "2026-12-12" },
    { t: "서울특별시 성탄 빛 거리", r: "서울", c: "축제", s: "2026-12-18", e: "2026-12-27" }
  ];
  const HOLIDAYS = {
    "2026-01-01": "신정", "2026-02-16": "설날 연휴", "2026-02-17": "설날", "2026-02-18": "설날 연휴",
    "2026-03-01": "삼일절", "2026-03-02": "대체공휴일", "2026-05-05": "어린이날", "2026-05-24": "부처님오신날", "2026-05-25": "대체공휴일",
    "2026-06-03": "지방선거", "2026-06-06": "현충일", "2026-07-17": "제헌절", "2026-08-15": "광복절", "2026-08-17": "대체공휴일",
    "2026-09-24": "추석 연휴", "2026-09-25": "추석", "2026-09-26": "추석 연휴", "2026-10-03": "개천절", "2026-10-05": "대체공휴일",
    "2026-10-09": "한글날", "2026-12-25": "성탄절"
  };
  const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
  const CATS = ["축제", "공연", "전시", "교육"];
  const REGIONS = ["서울", "부산", "대구", "광주", "제주"];
  const STATUSES = ["진행중", "예정", "종료"];
  const STATUS_CLASS = { "진행중": "status-on", "예정": "status-soon", "종료": "status-end" };
  const STATUS_ORDER = { "진행중": 0, "예정": 1, "종료": 2 };
  const COL_LABELS = { r: "지역", c: "분류", t: "이름", s: "기간", st: "상태" };
  EVENTS.forEach(ev => { ev.st = ev.e < TODAY ? "종료" : (ev.s > TODAY ? "예정" : "진행중"); });

  function ymd(date) { return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()); }
  function parseDate(text) { return new Date(Number(text.slice(0, 4)), Number(text.slice(5, 7)) - 1, Number(text.slice(8))); }
  function period(ev) { return ev.s === ev.e ? ev.s : ev.s + " ~ " + ev.e.slice(5); }

  /* ---------- 단어 단축 ---------- */
  const REGEX_RULES = [
    { id: "year", label: "연도의 「년」 제거", ex: "2026년 → 2026", src: "((?:19|20)\\d{2})\\s*년", to: "$1", on: true },
    { id: "edition", label: "제N회를 N'로", ex: "제12회 → 12'", src: "제\\s*(\\d+)\\s*[회차]\\s*", to: "$1' ", on: true },
    { id: "paren", label: "괄호 안 부가 문구 삭제", ex: "(무료 입장) → 삭제", src: "\\s*\\([^)]*\\)\\s*", to: " ", on: true }
  ];
  let WORD_RULES = [
    { id: "w1", from: "제주특별자치도", to: "제주", on: true }, { id: "w2", from: "서울특별시", to: "서울", on: true },
    { id: "w3", from: "부산광역시", to: "부산", on: true }, { id: "w4", from: "대구광역시", to: "대구", on: true },
    { id: "w5", from: "광주광역시", to: "광주", on: true }, { id: "w6", from: "전시회", to: "전", on: true }
  ];
  // 사용자가 고친 규칙 기억: 정규식은 켜짐 여부만, 단어는 목록 전체를 저장한다
  const ABBR_KEY = "iseohyun_common_gui_abbr_v1";
  let wordSeq = 100;
  let abbrMsg = "";
  try {
    const savedAbbr = JSON.parse(localStorage.getItem(ABBR_KEY) || "null");
    if (savedAbbr && typeof savedAbbr === "object") {
      if (savedAbbr.regex) REGEX_RULES.forEach(rule => { if (typeof savedAbbr.regex[rule.id] === "boolean") rule.on = savedAbbr.regex[rule.id]; });
      if (Array.isArray(savedAbbr.words)) {
        const okWords = savedAbbr.words.filter(word => word && typeof word.from === "string" && word.from && typeof word.to === "string");
        if (okWords.length) WORD_RULES = okWords.map((word, i) => ({ id: "w" + (i + 1), from: word.from, to: word.to, on: word.on !== false, user: !!word.user }));
      }
    }
  } catch (err) {
    console.warn("[CommonGuiDemo] 단축 규칙을 읽지 못해 기본값을 씁니다:", err);
  }
  function saveAbbr() {
    const regexState = {};
    REGEX_RULES.forEach(rule => { regexState[rule.id] = rule.on; });
    try {
      localStorage.setItem(ABBR_KEY, JSON.stringify({ regex: regexState, words: WORD_RULES.map(word => ({ from: word.from, to: word.to, on: word.on, user: !!word.user })) }));
    } catch (err) {
      console.warn("[CommonGuiDemo] 단축 규칙을 저장하지 못했습니다:", err);
    }
  }
  function shorten(text) {
    let out = text;
    REGEX_RULES.forEach(rule => {
      if (!rule.on) return;
      try {
        out = out.replace(new RegExp(rule.src, "g"), rule.to);
      } catch (err) {
        // 잘못된 정규식은 그 규칙만 건너뛴다
        console.warn("[CommonGuiDemo] 잘못된 정규식 규칙:", rule.id, err);
      }
    });
    // 긴 단어부터 적용해서 「부산광역시장배」가 「부산광역시」 규칙에 먼저 잘리지 않게 한다
    WORD_RULES.filter(word => word.on && word.from).sort((a, b) => b.from.length - a.from.length)
      .forEach(word => { out = out.split(word.from).join(word.to); });
    return out.replace(/\s{2,}/g, " ").trim();
  }
  function shown(text) { return settings.abbr ? shorten(text) : text; }

  function renderAbbr() {
    $("abbrToggle").setAttribute("aria-pressed", String(settings.abbr));
    $("abbrToggle").textContent = settings.abbr ? "단어 단축 켜짐 · 달력과 리스트에 적용 중" : "단어 단축 꺼짐 · 눌러서 켜기";
    WORD_RULES.forEach(word => { word.count = EVENTS.filter(ev => ev.t.includes(word.from)).length; });
    $("abbrMsg").textContent = abbrMsg;
    $("abbrMsg").hidden = !abbrMsg;
    $("abbrOut").textContent = shorten($("abbrInput").value);
    $("regexRules").innerHTML = REGEX_RULES.map(rule =>
      '<tr><td><input class="rule-check" type="checkbox" id="rule-' + rule.id + '" data-rule="' + rule.id + '"' + (rule.on ? " checked" : "") + ' aria-label="' + esc(rule.label) + '"></td><td>' + esc(rule.label) + '</td><td class="nowrap">' + esc(rule.ex) + '</td><td class="num">' + esc(rule.src) + '</td><td class="num">' + esc(rule.to) + "</td></tr>"
    ).join("");
    $("wordRules").innerHTML = WORD_RULES.map(word =>
      '<tr><td><input class="rule-check" type="checkbox" id="rule-' + word.id + '" data-rule="' + word.id + '"' + (word.on ? " checked" : "") + ' aria-label="' + esc(word.from) + '"></td><td>' + esc(word.from) + (word.user ? ' <span class="tag tag-line">추가함</span>' : "") + "</td>"
      + '<td><input class="text-input word-to" type="text" id="to-' + word.id + '" data-word-to="' + word.id + '" value="' + esc(word.to) + '" aria-label="' + esc(word.from) + '의 줄인 단어"></td>'
      + '<td class="num">' + word.count + '</td><td><button class="icon-btn is-bare" type="button" data-word-del="' + word.id + '" aria-label="' + esc(word.from) + ' 삭제">' + icon("x", "ico-sm") + "</button></td></tr>"
    ).join("");
    $("abbrResults").innerHTML = EVENTS.map(ev => {
      const short = shorten(ev.t);
      return "<tr><td>" + esc(ev.t) + "</td><td><b>" + esc(short) + '</b></td><td class="num">' + ev.t.length + " → " + short.length + "</td></tr>";
    }).join("");
  }
  function initAbbr() {
    root.addEventListener("change", (e) => {
      const data = e.target.dataset || {};
      if (data.rule) REGEX_RULES.concat(WORD_RULES).forEach(rule => { if (rule.id === data.rule) rule.on = e.target.checked; });
      else if (data.wordTo) WORD_RULES.forEach(word => { if (word.id === data.wordTo) word.to = e.target.value.trim(); });
      else return;
      abbrMsg = "";
      saveAbbr();
      refresh();
    });
    root.addEventListener("click", (e) => {
      const del = e.target.closest("[data-word-del]");
      if (del) {
        WORD_RULES = WORD_RULES.filter(word => word.id !== del.dataset.wordDel);
        abbrMsg = "";
        saveAbbr();
        refresh();
        return;
      }
      if (!e.target.closest("#abbrAdd")) return;
      const from = $("abbrFrom").value.trim();
      const to = $("abbrTo").value.trim();
      if (from.length < 2) abbrMsg = "원래 단어를 두 글자 이상 적어 주세요.";
      else if (to.length >= from.length) abbrMsg = "줄인 단어는 원래 단어보다 짧아야 합니다.";
      else if (WORD_RULES.some(word => word.from === from)) abbrMsg = "「" + from + "」는 이미 사전에 있습니다. 표에서 줄인 단어를 고쳐 주세요.";
      else {
        WORD_RULES.push({ id: "w" + (++wordSeq), from: from, to: to, on: true, user: true });
        $("abbrFrom").value = "";
        $("abbrTo").value = "";
        abbrMsg = "";
        saveAbbr();
      }
      refresh();
    });
    $("abbrInput").addEventListener("input", () => { $("abbrOut").textContent = shorten($("abbrInput").value); });
    $("abbrToggle").addEventListener("click", () => { settings.abbr = !settings.abbr; refresh(); });
  }

  /* ---------- 필터 ---------- */
  function newFilter() { return { cat: "전체", regions: [], status: "전체", q: "", date: "all", from: "", to: "" }; }
  let filter = session.filter || newFilter();
  function setFilter(next) { filter = next; session.filter = next; }
  setFilter(filter);

  // 날짜 주제: 빠른 버튼은 기준일에서 범위를 계산하고, 직접 고르기는 입력한 두 날짜를 쓴다. 범위와 하루라도 겹치는 항목을 남긴다
  function dateRange() {
    const today = parseDate(TODAY);
    if (filter.date === "week") {
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return [ymd(start), ymd(end)];
    }
    if (filter.date === "month") return [ymd(new Date(today.getFullYear(), today.getMonth(), 1)), ymd(new Date(today.getFullYear(), today.getMonth() + 1, 0))];
    if (filter.date === "next") return [ymd(new Date(today.getFullYear(), today.getMonth() + 1, 1)), ymd(new Date(today.getFullYear(), today.getMonth() + 2, 0))];
    if (filter.date === "custom" && (filter.from || filter.to)) return [filter.from || "0000-01-01", filter.to || "9999-12-31"];
    return null;
  }
  function filtered() {
    const query = filter.q.trim();
    const range = dateRange();
    return EVENTS.filter(ev =>
      (!range || (ev.s <= range[1] && ev.e >= range[0]))
      && (filter.cat === "전체" || ev.c === filter.cat)
      && (filter.regions.length === 0 || filter.regions.includes(ev.r))
      && (filter.status === "전체" || ev.st === filter.status)
      // 단어 단축이 켜져 있어도 줄이기 전 이름으로 찾는다
      && (!query || ev.t.includes(query))
    );
  }
  function isFiltered() {
    return filter.cat !== "전체" || filter.regions.length > 0 || filter.status !== "전체" || filter.q.trim() !== "" || dateRange() !== null;
  }
  function pill(group, value, isOn, label) {
    return '<button class="pill-btn" type="button" data-group="' + group + '" data-value="' + value + '" aria-pressed="' + isOn + '">' + (label || value) + "</button>";
  }

  // 헤더의 필터 패널: 뼈대는 한 번만 만들고(Header.setPanels 에 한 번만 넘긴다), 값이 바뀌면 안쪽 줄만 다시 그린다
  let filterPanel = null;
  function buildFilterPanel() {
    const panel = document.createElement("div");
    panel.className = "cg cg-panel cal-settings-list";
    panel.id = "cg-filter-panel";
    panel.innerHTML =
      '<div class="cg-row"><span class="cal-settings-label">분류</span><div class="controls-line" data-line="cat"></div></div>'
      + '<div class="cg-row"><span class="cal-settings-label">지역</span><div class="controls-line" data-line="region"></div></div>'
      + '<div class="cg-row"><span class="cal-settings-label">상태</span><div class="controls-line" data-line="status"></div></div>'
      + '<div class="cg-row"><span class="cal-settings-label">날짜</span><div class="controls-line"><span class="controls-line" data-line="date"></span>'
      + '<span class="date-pair"><input class="date-input" type="date" data-date="from" aria-label="시작일"><span>~</span><input class="date-input" type="date" data-date="to" aria-label="종료일"></span></div></div>'
      + '<div class="cg-row"><label class="cal-settings-label" for="cg-filter-search">검색</label><div class="controls-line">'
      + '<span class="search-wrap">' + icon("search", "ico-sm") + '<input class="search-input" type="text" id="cg-filter-search" placeholder="이름으로 찾기" autocomplete="off">'
      + '<button class="search-clear" type="button" data-act="clear" aria-label="검색어 지우기" hidden>' + icon("x", "ico-sm") + "</button></span>"
      + '<button class="text-btn reset-btn" type="button" data-act="reset">' + icon("reset", "ico-sm") + "<span>초기화</span></button></div></div>";

    const searchInput = panel.querySelector("#cg-filter-search");
    const dateFrom = panel.querySelector('[data-date="from"]');
    const dateTo = panel.querySelector('[data-date="to"]');
    searchInput.value = filter.q;

    panel.addEventListener("click", (e) => {
      const action = e.target.closest("[data-act]");
      if (action) {
        if (action.dataset.act === "reset") setFilter(newFilter());
        else filter.q = "";
        searchInput.value = filter.q;
        onFilterChanged();
        if (action.dataset.act === "clear") searchInput.focus();
        return;
      }
      const button = e.target.closest(".pill-btn");
      if (!button) return;
      const group = button.dataset.group;
      const value = button.dataset.value;
      if (group === "cat") filter.cat = value;
      else if (group === "status") filter.status = value;
      else if (group === "date") { filter.date = value; filter.from = ""; filter.to = ""; }
      else {
        const index = filter.regions.indexOf(value);
        if (index >= 0) filter.regions.splice(index, 1); else filter.regions.push(value);
      }
      onFilterChanged();
    });
    searchInput.addEventListener("input", () => { filter.q = searchInput.value; onFilterChanged(); });
    [dateFrom, dateTo].forEach(input => {
      input.addEventListener("change", () => {
        filter.date = "custom";
        filter.from = dateFrom.value;
        filter.to = dateTo.value;
        if (!filter.from && !filter.to) filter.date = "all";
        onFilterChanged();
      });
    });
    return panel;
  }
  function renderFilterPanel() {
    if (!filterPanel) return;
    const line = (name) => filterPanel.querySelector('[data-line="' + name + '"]');
    line("cat").innerHTML = ["전체"].concat(CATS).map(cat => pill("cat", cat, filter.cat === cat)).join("");
    line("region").innerHTML = REGIONS.map(region => {
      const count = EVENTS.filter(ev => ev.r === region).length;
      return pill("region", region, filter.regions.includes(region), '<span class="check-box">' + icon("check") + "</span>" + region + '<span class="count-badge">' + count + "</span>");
    }).join("");
    line("status").innerHTML = ["전체"].concat(STATUSES).map(status => pill("status", status, filter.status === status)).join("");
    line("date").innerHTML = pill("date", "all", filter.date === "all", "전체") + pill("date", "week", filter.date === "week", "이번 주")
      + pill("date", "month", filter.date === "month", "이번 달") + pill("date", "next", filter.date === "next", "다음 달");
    const range = dateRange();
    const dateFrom = filterPanel.querySelector('[data-date="from"]');
    const dateTo = filterPanel.querySelector('[data-date="to"]');
    // 빠른 버튼을 누르면 계산된 범위를 입력 칸에 채운다. 직접 고른 값은 건드리지 않는다
    if (filter.date !== "custom") {
      dateFrom.value = range ? range[0] : "";
      dateTo.value = range ? range[1] : "";
    } else {
      dateFrom.value = filter.from;
      dateTo.value = filter.to;
    }
    filterPanel.querySelector('[data-act="clear"]').hidden = filter.q === "";
    Header.setFilterActive(isFiltered());
  }
  // 필터 탭의 「지금 걸려 있는 필터」 줄
  function renderFilterState() {
    const range = dateRange();
    const parts = [];
    if (range) parts.push("날짜 " + (filter.from || filter.date !== "custom" ? range[0] : "처음") + " ~ " + (filter.to || filter.date !== "custom" ? range[1] : "끝"));
    if (filter.cat !== "전체") parts.push("분류 " + filter.cat);
    filter.regions.forEach(region => { parts.push("지역 " + region); });
    if (filter.status !== "전체") parts.push("상태 " + filter.status);
    if (filter.q.trim()) parts.push('검색 "' + esc(filter.q.trim()) + '"');
    $("filterState").innerHTML = (parts.length ? parts.map(part => '<span class="tag tag-line">' + part + "</span>").join("") : '<span class="tag">걸린 필터 없음</span>')
      + "<span>→ " + filtered().length + "건 / 전체 " + EVENTS.length + "건</span>";
  }
  function onFilterChanged() {
    listLimit = LIST_PAGE; // 필터를 바꾸면 더 보기는 처음 수로 돌아간다
    refresh();
  }

  /* ---------- 헤더의 화면별 설정 패널 ---------- */
  function row(label, inner) { return '<div class="cg-row"><span class="cal-settings-label">' + label + '</span><div class="controls-line">' + inner + "</div></div>"; }
  function opt(key, value, label) { return '<button class="pill-btn" type="button" data-set="' + key + '" data-value="' + value + '" aria-pressed="' + (String(settings[key]) === String(value)) + '">' + label + "</button>"; }
  function onoff(key) { return opt(key, "true", "켜기") + opt(key, "false", "끄기"); }
  function check(key, label) { return '<button class="pill-btn" type="button" data-toggle="' + key + '" aria-pressed="' + settings[key] + '"><span class="check-box">' + icon("check") + "</span>" + label + "</button>"; }
  function orderRow() { return row("정렬", opt("rev", "false", "오래된순") + opt("rev", "true", "최신순")); }
  // 견본에서는 전체 설정에 있던 항목. 사이트의 전체 설정에는 넣을 수 없어 이름을 줄여 보여 주는 화면(달력 · 리스트)에 둔다
  function abbrRow() { return row("단어 단축", onoff("abbr")); }

  let settingsPanel = null;
  function buildSettingsPanel() {
    const panel = document.createElement("div");
    panel.className = "cg cg-panel cal-settings-list";
    panel.id = "cg-settings-panel";
    panel.addEventListener("click", (e) => {
      const button = e.target.closest("button");
      if (!button) return;
      const data = button.dataset;
      if (data.col) {
        settings.cols[data.col] = !settings.cols[data.col];
        // 숨긴 열로 정렬 중이었다면 기본 정렬로 돌아간다
        if (sortKey === data.col) { sortKey = "s"; sortDir = settings.rev ? -1 : 1; }
      } else if (data.toggle) settings[data.toggle] = !settings[data.toggle];
      else if (data.set) settings[data.set] = BOOLS.includes(data.set) ? data.value === "true" : data.value;
      else return;
      if (data.set === "rev") { sortKey = "s"; sortDir = settings.rev ? -1 : 1; }
      refresh();
    });
    return panel;
  }
  function renderSettingsPanel() {
    if (!settingsPanel) return;
    let html = "";
    if (pageName === "calendar") {
      html = row("달력 칸", opt("cal", "auto", "자동") + opt("cal", "chip", "칩") + opt("cal", "dot", "점"))
        + row("칩 내용", check("chipR", COL_LABELS.r) + check("chipC", COL_LABELS.c))
        + row("기간 항목", opt("span", "chip", "날마다 반복") + opt("span", "bar", "가로 막대"))
        + row("이어보기", onoff("cont"))
        + row("빈 주 생략", onoff("skipEmpty"))
        + orderRow()
        + abbrRow();
    } else if (pageName === "map") {
      html = row("지도 방식", opt("map", "area", "행정구역 보기") + opt("map", "pin", "지도 API 보기"))
        + row("범례", onoff("legend"));
    } else if (pageName === "list") {
      const cols = LIST_COLS.map(key => {
        const isOn = key === "t" ? true : settings.cols[key];
        return '<button class="pill-btn" type="button" data-col="' + key + '" aria-pressed="' + isOn + '"' + (key === "t" ? " disabled" : "") + '><span class="check-box">' + icon("check") + "</span>" + COL_LABELS[key] + "</button>";
      }).join("");
      html = row("리스트 보기", opt("view", "table", "표") + opt("view", "card", "카드"))
        + (settings.view === "table" ? row("표시 열", cols) : "")
        + orderRow()
        + abbrRow();
    }
    settingsPanel.innerHTML = html;
  }

  /* ---------- 달력 ---------- */
  function chipHtml(ev) {
    return '<div class="event-chip" title="' + esc(ev.t) + '">'
      + (settings.chipR || settings.chipC ? '<span class="chip-meta">' + (settings.chipR ? '<span class="tag">' + ev.r + "</span>" : "") + (settings.chipC ? '<span class="tag tag-line">' + ev.c + "</span>" : "") + "</span>" : "")
      + '<span class="chip-title">' + esc(shown(ev.t)) + "</span></div>";
  }
  // 점 달력: 설정이 「점」이거나, 「자동」이고 화면이 좁을 때
  const calNarrow = window.matchMedia("(max-width: 700px)");
  let openDay = null;
  let openRec = null;
  let freshDetail = false;
  const openFolds = {};
  function isDotMode() { return settings.cal === "dot" || (settings.cal === "auto" && calNarrow.matches); }
  function dotsHtml(events) {
    const classes = { "진행중": "", "예정": " dot-soon", "종료": " dot-end" };
    return '<div class="dots">' + events.slice(0, 4).map(ev => '<span class="dot' + classes[ev.st] + '"></span>').join("")
      + (events.length > 4 ? '<span class="dot-more">+' + (events.length - 4) + "</span>" : "") + "</div>";
  }
  // 그 주의 마지막 칸 뒤에 끼워 넣는 상세. 한 번에 한 날짜만 열고, 그 안에서도 한 번에 한 항목만 펼친다
  function detailHtml(list) {
    const events = list.filter(ev => ev.s <= openDay && ev.e >= openDay);
    if (!events.length) return "";
    const month = Number(openDay.slice(5, 7));
    const day = Number(openDay.slice(8));
    const head = month + "월 " + day + "일 (" + WEEKDAYS[parseDate(openDay).getDay()] + ")";
    return '<div class="day-detail' + (freshDetail ? "" : " is-open") + '"><div class="day-detail-inner">'
      + '<div class="detail-head"><span>' + head + " · " + events.length + "건" + (HOLIDAYS[openDay] ? " · " + HOLIDAYS[openDay] : "") + "</span>"
      + '<button class="icon-btn is-bare" type="button" data-day-close="1" aria-label="닫기">' + icon("x") + "</button></div>"
      + events.map(ev => {
        const id = EVENTS.indexOf(ev);
        const isOn = id === openRec;
        return '<div class="rec' + (isOn ? " is-open" : "") + '" data-rec-id="' + id + '">'
          + '<button class="rec-head" type="button" data-rec="' + id + '" aria-expanded="' + isOn + '"><span class="tag">' + ev.r + '</span><span class="rec-title">' + esc(shown(ev.t)) + "</span>" + icon("chev") + "</button>"
          + '<div class="rec-body"><div><dl class="rec-dl"><dt>' + COL_LABELS.t + "</dt><dd>" + esc(ev.t) + "</dd><dt>" + COL_LABELS.s + "</dt><dd>" + period(ev) + "</dd><dt>" + COL_LABELS.r + "</dt><dd>" + ev.r + "</dd><dt>" + COL_LABELS.c + "</dt><dd>" + ev.c
          + "</dd><dt>" + COL_LABELS.st + '</dt><dd><span class="status ' + STATUS_CLASS[ev.st] + '">' + ev.st + "</span></dd></dl></div></div></div>";
      }).join("") + "</div></div>";
  }
  function toggleDay(date) {
    if (openDay === date) {
      openDay = null;
      openRec = null;
    } else {
      openDay = date;
      freshDetail = true;
      const first = filtered().filter(ev => ev.s <= date && ev.e >= date)[0];
      openRec = first ? EVENTS.indexOf(first) : null;
    }
    renderCalendar();
    const cell = $("yearStack").querySelector('[data-day="' + date + '"]');
    if (cell) cell.focus({ preventScroll: true });
  }
  /* 달력은 주 단위로 그린다. 달로 끊어 보기와 이어보기가 같은 주 그리기를 쓰고,
     빈 주 생략과 최신순(거꾸로 보기)은 주의 목록을 묶거나 뒤집는 것으로 처리한다. */
  // from ~ to 를 일요일부터 시작하는 주로 나눈다. 범위 밖의 칸은 null
  function buildWeeks(from, to) {
    const weeks = [];
    const cursor = parseDate(from);
    const end = parseDate(to);
    cursor.setDate(cursor.getDate() - cursor.getDay());
    while (cursor <= end) {
      const days = [];
      for (let i = 0; i < 7; i++) {
        const date = ymd(cursor);
        days.push(date >= from && date <= to ? date : null);
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(days);
    }
    return weeks;
  }
  function weekRange(days) {
    const valid = days.filter(Boolean);
    return [valid[0], valid[valid.length - 1]];
  }
  function weekHtml(days, list, o) {
    const range = weekRange(days);
    const lanes = [];
    let html = "";
    if (o.barMode) {
      // 이 주에 걸친 기간 항목을 겹치지 않게 줄에 배정
      list.filter(ev => ev.s !== ev.e && ev.s <= range[1] && ev.e >= range[0])
        .sort((a, b) => (a.s < b.s ? -1 : a.s > b.s ? 1 : 0))
        .forEach(ev => {
          for (let k = 0; k < lanes.length; k++) {
            if (lanes[k][lanes[k].length - 1].e < ev.s) { lanes[k].push(ev); return; }
          }
          lanes.push([ev]);
        });
    }
    days.forEach((date, col) => {
      if (!date) {
        html += '<div class="day-cell is-empty' + (col === 6 ? " is-last" : "") + '"></div>';
        return;
      }
      const day = Number(date.slice(8));
      const month = Number(date.slice(5, 7));
      const holiday = HOLIDAYS[date];
      let events = list.filter(ev => ev.s <= date && ev.e >= date);
      let bars = "";
      if (o.barMode) {
        bars = lanes.map(lane => {
          const ev = lane.filter(item => item.s <= date && item.e >= date)[0];
          if (!ev) return '<div class="bar-gap"></div>';
          const isStart = ev.s === date;
          const isEnd = ev.e === date;
          const isLead = isStart || date === range[0];
          const endInWeek = ev.e < range[1] ? ev.e : range[1];
          const span = Math.round((parseDate(endInWeek) - parseDate(date)) / 86400000) + 1;
          return '<div class="bar' + (isStart ? " bar-start" : "") + (isEnd ? " bar-end" : "") + '" title="' + esc(ev.t) + '">'
            + (isLead ? '<span class="bar-title" style="width:calc(' + span * 100 + '% - 12px)">' + esc(shown(ev.t)) + "</span>" : "") + "</div>";
        }).join("");
        events = events.filter(ev => ev.s === ev.e);
      }
      const isOpen = o.dotMode && openDay === date && events.length > 0;
      html += '<div class="day-cell' + (date === TODAY ? " is-today" : "") + (col === 6 ? " is-last" : "") + (o.dotMode ? " is-dot" : "") + (isOpen ? " is-open" : "") + '"'
        + (o.badge && day === 1 ? ' data-month="' + month + '"' : "")
        + (o.dotMode && events.length ? ' data-day="' + date + '" role="button" tabindex="0" aria-expanded="' + isOpen + '" aria-label="' + month + "월 " + day + "일, " + events.length + '건"' : "") + ">"
        + '<div class="day-top">' + (o.badge && day === 1 ? '<span class="month-badge">' + month + "월</span>" : "")
        + '<span class="day-num' + (col === 0 || holiday ? " is-sun" : col === 6 ? " is-sat" : "") + '">' + day + "</span>"
        + (holiday ? '<span class="holiday-badge">' + holiday + "</span>" : "") + (date === TODAY ? '<span class="today-badge">오늘</span>' : "") + "</div>"
        + (bars ? '<div class="day-bars">' + bars + "</div>" : "")
        + (o.dotMode ? dotsHtml(events) : '<div class="day-events">' + events.map(chipHtml).join("") + "</div>") + "</div>";
    });
    if (o.dotMode && openDay && days.includes(openDay)) html += detailHtml(list);
    return html;
  }
  // 빈 주 생략: 항목이 없는 주가 이어지면 한 줄짜리 버튼으로 묶는다. 누르면 그 묶음만 펼친다
  function blocksHtml(weeks, list, o) {
    const isEmpty = (week) => {
      const range = weekRange(week);
      return !list.some(ev => ev.s <= range[1] && ev.e >= range[0]);
    };
    let html = "";
    let i = 0;
    while (i < weeks.length) {
      if (!settings.skipEmpty || !isEmpty(weeks[i])) {
        html += weekHtml(weeks[i], list, o);
        i++;
        continue;
      }
      let j = i;
      while (j < weeks.length && isEmpty(weeks[j])) j++;
      const run = weeks.slice(i, j);
      const dates = [].concat(...run).filter(Boolean).sort();
      const key = dates[0];
      const isOpen = !!openFolds[key];
      const holidayCount = dates.filter(date => HOLIDAYS[date]).length;
      const monthStarts = dates.filter(date => date.slice(8) === "01").map(date => Number(date.slice(5, 7)));
      html += '<button class="fold-row" type="button" data-fold="' + key + '" aria-expanded="' + isOpen + '"' + (o.badge && monthStarts.length ? ' data-months="' + monthStarts.join(" ") + '"' : "") + ">"
        + '<span><span class="tag">' + dates[0].slice(5) + " ~ " + dates[dates.length - 1].slice(5) + "</span> "
        + "항목 없는 " + run.length + "주" + (holidayCount ? " · 공휴일 " + holidayCount + "일" : "") + "</span>"
        + "<span>" + (isOpen ? "접기" : "펼치기") + "</span></button>";
      if (isOpen) run.forEach(week => { html += weekHtml(week, list, o); });
      i = j;
    }
    return html;
  }
  function renderCalendar() {
    const dotMode = isDotMode();
    const list = filtered();
    const o = { dotMode: dotMode, barMode: settings.span === "bar" && !dotMode, badge: settings.cont };
    const nowMonth = Number(TODAY.slice(5, 7));
    const months = [];
    for (let m = 1; m <= 12; m++) months.push(m);
    if (settings.rev) months.reverse(); // 최신순: 늦은 달과 늦은 주가 위로
    $("monthNav").innerHTML = '<div class="month-jump">' + months.map(m =>
      '<button class="pill-btn" type="button" data-jump="' + m + '" aria-pressed="' + (m === nowMonth) + '">' + m + "월</button>"
    ).join("") + '</div><button class="text-btn" type="button" data-jump="' + nowMonth + '" aria-pressed="true">오늘</button>';
    const weekdayRow = '<div class="weekday-row">' + WEEKDAYS.map((name, i) => '<div class="weekday-cell' + (i === 0 ? " is-sun" : i === 6 ? " is-sat" : "") + '">' + name + "</div>").join("") + "</div>";
    const ordered = (weeks) => (settings.rev ? weeks.toReversed() : weeks);
    if (settings.cont) {
      // 이어보기: 달로 끊지 않고 한 해의 주를 한 장에 잇는다. 매달 1일 칸에 달 표시
      const inYear = list.filter(ev => ev.s.slice(0, 4) <= String(YEAR) && ev.e.slice(0, 4) >= String(YEAR));
      $("yearStack").innerHTML = '<div class="month-card"><div class="month-head"><div class="month-title-group"><span class="month-title">' + YEAR + "년</span>"
        + '<span class="tag">이어보기</span></div><span class="month-count">' + inYear.length + "건</span></div>"
        + weekdayRow + '<div class="days-grid">' + blocksHtml(ordered(buildWeeks(YEAR + "-01-01", YEAR + "-12-31")), list, o) + "</div></div>";
    } else {
      $("yearStack").innerHTML = months.map(month => {
        const ym = YEAR + "-" + pad(month);
        const lastDay = new Date(YEAR, month, 0).getDate();
        const inMonth = list.filter(ev => ev.s.slice(0, 7) <= ym && ev.e.slice(0, 7) >= ym);
        const holidays = Object.keys(HOLIDAYS).filter(date => date.slice(0, 7) === ym);
        return '<div class="month-card" data-month="' + month + '"><div class="month-head"><div class="month-title-group"><span class="month-title">' + YEAR + "년 " + month + "월</span>"
          + holidays.map(date => '<span class="holiday-pill">' + Number(date.slice(8)) + "일 " + HOLIDAYS[date] + "</span>").join("")
          + '</div><span class="month-count">' + inMonth.length + "건</span></div>"
          + weekdayRow + '<div class="days-grid">' + blocksHtml(ordered(buildWeeks(ym + "-01", ym + "-" + pad(lastDay))), list, o) + "</div></div>";
      }).join("");
    }
    // 새로 연 상세는 접힌 채로 그린 뒤 한 박자 뒤에 펼쳐서 전환이 보이게 한다
    const detail = $("yearStack").querySelector(".day-detail:not(.is-open)");
    if (detail) {
      void detail.offsetHeight;
      detail.classList.add("is-open");
    }
    freshDetail = false;
  }
  function jumpToMonth(month) {
    const frame = $("calFrame");
    const card = frame.querySelector('[data-month="' + month + '"], [data-months~="' + month + '"]');
    if (card) frame.scrollTop = card.offsetTop - $("monthNav").offsetHeight - 10;
  }
  function initCalendar() {
    listen(calNarrow, "change", renderCalendar);
    $("yearStack").addEventListener("click", (e) => {
      const fold = e.target.closest("[data-fold]");
      if (fold) {
        openFolds[fold.dataset.fold] = !openFolds[fold.dataset.fold];
        renderCalendar();
        return;
      }
      const rec = e.target.closest("[data-rec]");
      if (rec) {
        const id = Number(rec.dataset.rec);
        openRec = openRec === id ? null : id;
        all(".rec", $("yearStack")).forEach(el => {
          const isOn = Number(el.dataset.recId) === openRec;
          el.classList.toggle("is-open", isOn);
          el.querySelector(".rec-head").setAttribute("aria-expanded", String(isOn));
        });
        return;
      }
      if (e.target.closest("[data-day-close]")) {
        openDay = null;
        openRec = null;
        renderCalendar();
        return;
      }
      const day = e.target.closest("[data-day]");
      if (day) toggleDay(day.dataset.day);
    });
    $("yearStack").addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches("[data-day]")) {
        e.preventDefault();
        toggleDay(e.target.dataset.day);
      }
    });
    $("monthNav").addEventListener("click", (e) => {
      const button = e.target.closest("[data-jump]");
      if (button) jumpToMonth(Number(button.dataset.jump));
    });
  }

  /* ---------- 리스트 ---------- */
  const LIST_PAGE = 6; // 견본은 예시가 12건뿐이라 6건씩 그린다 (규칙은 표 50건, 카드 24건)
  const LIST_COLS = ["r", "c", "t", "s", "st"];
  let listLimit = LIST_PAGE;
  let sortKey = "s";
  let sortDir = settings.rev ? -1 : 1;
  function cell(key, ev) {
    if (key === "r") return '<td><span class="tag">' + ev.r + "</span></td>";
    if (key === "c") return '<td><span class="tag tag-line">' + ev.c + "</span></td>";
    if (key === "t") return '<td class="title-cell" title="' + esc(ev.t) + '">' + esc(shown(ev.t)) + "</td>";
    if (key === "s") return '<td class="date-cell">' + period(ev) + "</td>";
    return '<td><span class="status ' + STATUS_CLASS[ev.st] + '">' + ev.st + "</span></td>";
  }
  function renderList() {
    const list = filtered().toSorted((a, b) => {
      const x = sortKey === "st" ? STATUS_ORDER[a.st] : a[sortKey];
      const y = sortKey === "st" ? STATUS_ORDER[b.st] : b[sortKey];
      return (x < y ? -1 : x > y ? 1 : 0) * sortDir;
    });
    $("listSummary").innerHTML = "총 " + list.length + "건" + (isFiltered() ? "<small>필터 적용 중 · 전체 " + EVENTS.length + "건</small>" : "");
    if (list.length === 0) {
      $("listBody").innerHTML = '<div class="empty"><b>조건에 맞는 항목이 없습니다</b><br>헤더의 필터에서 조건을 줄이거나 초기화해 보세요.</div>';
      return;
    }
    const page = list.slice(0, listLimit);
    const rest = list.length - page.length;
    const cols = LIST_COLS.filter(key => key === "t" || settings.cols[key]);
    let html;
    if (settings.view === "table") {
      html = '<div class="scroll"><table class="data-table"><thead><tr>' + cols.map(key => {
        const isOn = sortKey === key;
        return "<th" + (isOn ? ' aria-sort="' + (sortDir > 0 ? "ascending" : "descending") + '"' : "") + '><button class="th-btn" type="button" data-sort="' + key + '">' + COL_LABELS[key] + icon(isOn ? (sortDir > 0 ? "up" : "down") : "sort", "ico-sm") + "</button></th>";
      }).join("") + "</tr></thead><tbody>" + page.map(ev => "<tr>" + cols.map(key => cell(key, ev)).join("") + "</tr>").join("") + "</tbody></table></div>";
    } else {
      html = '<div class="card-grid">' + page.map(ev =>
        '<div class="card"><div class="card-body"><div class="card-meta"><span class="tag">' + ev.r + '</span><span class="tag tag-line">' + ev.c + '</span><span class="status ' + STATUS_CLASS[ev.st] + '" style="margin-left:auto">' + ev.st + "</span></div>"
        + '<div class="card-title" title="' + esc(ev.t) + '">' + esc(shown(ev.t)) + '</div><div class="card-info">' + period(ev) + '</div></div><div class="card-foot"><span>예시 데이터</span><span>자세히</span></div></div>'
      ).join("") + "</div>";
    }
    if (rest > 0) html += '<div class="more-row"><button class="text-btn" type="button" data-more="1">더 보기 (' + rest + "건 남음)</button></div>";
    $("listBody").innerHTML = html;
  }
  function initList() {
    $("listBody").addEventListener("click", (e) => {
      if (e.target.closest("[data-more]")) {
        listLimit += LIST_PAGE;
        renderList();
        return;
      }
      const button = e.target.closest("[data-sort]");
      if (!button) return;
      if (sortKey === button.dataset.sort) sortDir = -sortDir;
      else { sortKey = button.dataset.sort; sortDir = 1; }
      renderList();
    });
  }

  /* ---------- 지도 ---------- */
  // 시도 경계: KoreaEvent 의 자료를 줄인 것 (점을 약 8분의 1로 솎고 작은 섬을 뺌). 480×530 그림 영역 기준
  const GEO = [
    {"id":"seoul","n":"서울","x":187.1,"y":125.7,"d":"M189.1,113.2L192.0,113.6L194.0,117.6L195.7,121.2L195.5,125.3L200.2,126.3L197.7,132.0L194.4,133.8L191.3,136.1L187.9,132.8L182.7,134.3L179.8,133.5L178.7,131.0L175.5,131.1L175.4,127.2L172.3,124.9L174.1,121.2L180.7,122.5L181.1,117.5L185.9,119.0L188.7,113.1Z"},
    {"id":"busan","n":"부산","x":329.2,"y":323.7,"d":"M321.7,337.2L320.6,334.1L318.6,334.0L316.6,334.7L312.2,333.2L313.1,330.4L312.7,328.2L315.7,328.7L315.6,324.3L319.1,323.1L326.5,318.0L332.0,315.6L332.6,310.2L339.5,309.4L343.8,310.5L345.3,313.5L342.5,314.7L341.3,318.4L341.6,321.0L339.7,323.4L338.3,326.2L333.7,327.7L332.2,330.0L333.0,333.0L331.7,333.6L329.3,331.4L328.1,330.8L327.6,332.5L325.7,335.1L324.7,334.1L324.0,337.6L323.0,338.0Z"},
    {"id":"daegu","n":"대구","x":294.8,"y":271.3,"d":"M303.7,255.6L306.6,260.6L307.9,265.6L305.5,269.0L303.5,274.1L302.8,280.1L298.3,280.7L295.2,279.3L290.8,286.4L287.1,287.6L282.2,290.1L280.1,281.9L282.8,278.1L288.3,273.3L282.4,268.2L287.2,261.7L290.4,266.4L292.1,259.0L296.5,258.6L303.7,255.6Z"},
    {"id":"incheon","n":"인천","x":165.6,"y":130.5,"d":"M164.0,118.5L170.1,122.3L172.4,125.1L170.8,131.5L170.7,136.7L164.7,142.8L161.2,143.3L158.9,143.9L161.7,143.0L160.9,139.7L162.6,136.0L161.0,134.5L159.8,133.9L160.3,133.0L161.2,132.9L159.9,132.7L161.0,131.5L162.3,129.8L160.7,125.5L161.2,121.1ZM149.2,102.7L154.2,108.0L154.5,112.5L155.6,116.2L155.5,118.6L154.4,121.9L154.1,123.2L152.0,121.2L146.9,122.2L145.0,120.0L147.3,117.3L143.8,112.9L143.5,108.0L147.5,102.9Z"},
    {"id":"gwangju","n":"광주","x":176.4,"y":328.2,"d":"M171.4,319.7L175.6,322.3L179.3,320.4L184.2,323.1L186.6,325.4L188.4,330.8L183.0,335.1L177.7,334.8L171.8,336.8L171.3,333.7L166.9,332.3L163.8,331.2L165.2,326.8L168.3,323.4Z"},
    {"id":"daejeon","n":"대전","x":214.6,"y":228.2,"d":"M214.9,215.5L219.4,217.6L221.1,220.2L225.0,222.3L221.9,228.2L221.8,233.0L221.2,237.1L217.0,239.5L214.3,234.7L212.6,238.3L209.6,238.8L206.7,235.5L205.4,229.2L206.9,225.2L209.3,221.3L212.5,216.8Z"},
    {"id":"ulsan","n":"울산","x":340.8,"y":294.6,"d":"M335.4,280.9L340.5,281.9L344.8,287.0L348.7,284.0L353.8,286.0L354.9,288.6L356.3,291.8L355.3,297.0L354.2,299.1L353.6,300.4L352.5,299.7L350.3,297.2L350.5,299.1L350.4,302.0L348.5,301.8L349.1,304.0L350.1,304.9L349.3,306.7L348.8,310.0L347.3,312.0L345.3,313.5L342.2,308.9L339.5,306.9L332.9,302.2L328.4,296.8L324.3,295.4L325.1,292.4L325.8,288.2L330.1,287.0L331.5,281.7L335.0,280.4Z"},
    {"id":"sejong","n":"세종","x":205.3,"y":209.5,"d":"M199.4,195.1L204.8,198.0L208.1,200.9L207.9,204.1L208.6,207.6L213.5,209.3L214.8,212.9L212.2,216.1L210.1,221.1L205.6,221.7L201.2,219.7L200.7,216.4L199.5,211.8L201.3,207.6L199.0,206.0L198.4,203.1L198.4,198.1L198.4,195.4Z"},
    {"id":"gyeonggi","n":"경기","x":199.7,"y":127.3,"d":"M170.0,169.2L164.8,160.3L165.9,158.8L163.9,156.9L163.4,150.6L162.5,148.0L165.4,148.6L168.2,150.8L171.5,151.7L172.4,151.6L174.2,149.0L175.9,148.7L169.3,147.0L159.0,148.0L161.9,150.1L162.4,148.6L163.1,155.1L161.5,153.0L160.6,154.4L158.6,153.7L157.1,154.3L158.1,152.3L155.6,147.9L160.7,145.9L169.2,139.7L172.4,139.3L173.0,138.3L171.4,138.6L172.5,134.3L170.2,128.8L174.4,126.4L175.3,130.2L177.5,131.7L179.6,133.1L181.4,135.7L187.4,132.9L190.2,134.7L193.6,134.8L196.7,132.3L197.6,128.3L197.8,124.3L195.6,122.2L194.9,117.8L193.5,114.0L189.8,113.9L186.2,116.9L182.4,117.8L181.3,119.8L178.3,123.6L173.0,122.9L167.4,121.5L162.8,119.4L158.4,121.8L156.1,115.8L155.5,109.1L158.5,107.9L164.4,101.1L165.4,98.5L165.0,97.3L165.2,93.0L167.7,90.3L172.1,89.7L174.7,87.9L175.8,86.2L177.9,82.7L178.2,78.7L184.7,76.5L185.5,72.5L186.2,69.1L189.0,67.1L192.8,64.4L195.3,67.7L199.2,71.2L203.0,75.4L207.0,72.4L206.5,77.4L212.7,78.8L218.1,79.6L221.7,87.6L227.6,91.1L229.2,97.2L225.2,100.8L223.3,105.4L222.7,111.9L225.2,115.9L226.3,118.9L231.9,118.9L236.1,122.8L242.7,123.4L242.1,127.7L242.4,132.5L240.8,140.0L240.2,146.5L237.9,154.8L234.6,161.0L231.0,162.2L228.4,166.1L222.6,167.7L219.1,169.2L217.0,172.2L214.0,175.8L210.0,177.8L206.7,180.3L202.1,177.6L196.5,175.2L192.7,177.6L181.4,180.7L178.0,176.5L175.9,173.8L174.2,173.2L173.6,170.1Z"},
    {"id":"gangwon","n":"강원","x":276.5,"y":111,"d":"M305.7,85.9L308.5,90.3L312.8,96.0L316.3,101.9L321.2,107.5L327.6,118.0L329.5,121.1L332.4,127.1L333.8,130.4L337.4,133.8L341.7,141.7L344.3,146.2L347.0,148.7L347.9,153.3L349.1,158.3L345.1,161.7L340.5,167.0L336.2,167.3L331.1,163.9L328.0,166.6L320.8,164.4L316.2,167.9L310.8,165.7L308.5,167.0L305.3,168.7L300.9,166.9L295.4,165.5L290.1,161.7L285.1,162.9L281.0,159.2L277.4,160.1L275.9,158.0L277.7,153.5L272.3,153.0L268.0,152.7L263.5,155.0L258.2,153.5L252.8,151.4L251.5,157.0L247.3,158.5L241.7,160.3L239.7,149.3L239.7,142.6L242.7,136.1L239.6,129.8L245.7,125.7L239.2,122.3L233.3,120.2L229.1,117.4L225.1,118.5L225.3,114.3L222.3,111.2L224.2,103.3L226.5,99.1L229.8,93.9L222.5,87.8L218.2,83.5L215.2,78.3L207.2,78.2L208.0,73.1L204.0,74.6L200.6,72.0L197.8,67.4L194.6,64.7L198.3,62.2L208.0,61.0L216.9,60.2L220.1,61.1L227.2,59.4L232.7,60.5L236.6,60.0L242.2,60.6L248.9,61.4L256.2,64.6L259.2,61.9L266.9,58.9L271.9,54.2L276.7,46.4L277.4,38.8L283.6,40.1L284.7,44.5L286.8,48.0L287.3,51.4L292.3,59.8L294.0,64.1L296.5,69.2L295.9,71.5L297.8,72.9L301.8,80.3Z"},
    {"id":"chungbuk","n":"충북","x":244.5,"y":194.4,"d":"M208.9,195.7L211.7,193.2L216.4,192.6L212.1,187.4L208.7,182.1L210.9,177.2L214.1,175.4L217.5,171.9L218.9,168.8L223.1,167.4L229.0,166.6L231.3,160.4L235.2,160.5L238.6,154.2L246.0,158.8L250.3,158.1L250.7,153.3L256.6,151.1L258.9,156.4L266.6,154.1L270.8,151.9L275.5,154.6L277.3,156.5L276.1,160.6L279.1,159.0L283.7,160.6L286.5,163.3L292.9,164.8L297.6,165.9L298.7,168.5L294.8,169.8L291.3,174.3L286.5,179.7L286.8,185.2L281.0,189.1L275.4,184.5L270.7,185.1L265.8,186.5L262.5,189.5L259.8,188.8L261.0,196.7L255.2,196.2L248.8,198.2L250.4,200.4L251.4,204.6L248.5,203.7L245.8,203.5L242.3,206.0L244.9,208.7L249.4,212.3L247.5,216.0L248.0,221.2L247.8,225.5L245.2,230.7L249.5,231.4L253.3,235.5L257.4,234.3L259.5,238.6L255.6,240.0L255.4,243.5L253.2,249.3L249.4,253.6L243.7,254.4L239.2,254.8L234.9,252.0L231.7,251.2L228.8,243.4L227.3,237.2L223.1,236.5L221.8,233.0L221.9,228.2L225.0,222.3L221.1,220.2L219.4,217.6L214.7,215.3L213.9,211.1L210.8,209.4L208.2,205.5L206.5,202.8L208.7,197.3Z"},
    {"id":"chungnam","n":"충남","x":177.8,"y":212,"d":"M166.7,172.3L172.5,175.2L175.8,181.8L183.5,179.4L193.5,176.8L197.5,174.8L202.0,178.2L208.7,182.1L212.1,187.4L216.3,192.8L212.2,192.6L209.4,195.6L204.4,198.1L198.9,194.9L197.3,198.6L198.2,201.7L198.3,204.8L200.6,207.3L200.7,210.7L199.7,215.3L201.2,218.7L205.4,222.3L206.1,226.4L205.0,231.8L207.6,237.5L210.5,239.9L212.5,238.4L213.1,233.9L215.5,238.9L219.6,238.1L224.4,235.7L228.5,238.5L228.1,244.6L230.1,251.5L230.3,254.8L228.7,255.9L224.2,253.4L224.4,257.2L219.4,258.2L214.8,256.0L212.6,251.3L211.6,247.0L208.0,246.5L204.6,249.9L200.1,248.9L196.0,251.5L191.8,247.0L188.4,244.6L180.6,244.8L170.4,254.7L164.9,254.2L161.5,250.3L162.4,248.5L158.2,245.0L153.7,246.0L153.9,243.3L156.2,235.8L155.8,233.5L154.4,229.2L153.5,224.8L153.8,220.7L152.5,218.4L152.6,212.4L151.3,211.3L147.3,205.9L144.8,204.0L141.9,204.8L138.5,206.7L139.8,202.9L137.7,196.5L136.5,196.2L135.0,197.6L131.2,199.7L130.1,196.8L133.9,195.4L131.9,193.6L129.0,195.3L127.8,195.1L126.8,191.6L128.1,190.4L129.7,188.4L129.4,185.4L131.1,187.2L131.2,186.5L132.2,183.2L133.7,180.9L138.6,180.9L138.7,174.9L140.4,176.1L141.8,181.6L139.4,184.8L138.9,188.1L141.2,187.6L141.4,184.5L144.2,186.4L146.4,182.5L147.5,181.4L147.5,179.2L145.8,178.6L143.9,176.6L142.3,175.1L144.9,174.6L141.6,172.4L147.8,171.3L150.3,172.5L153.3,166.9L157.7,169.9ZM144.8,206.5L143.7,208.5L144.8,211.1L146.2,213.4L146.8,214.7L147.1,216.8L148.7,219.9L148.0,223.1L146.4,221.5L144.0,221.8L144.1,219.6L141.4,217.3L141.9,213.8L140.5,207.4L143.0,205.3Z"},
    {"id":"jeonbuk","n":"전북","x":197.5,"y":280.9,"d":"M187.3,244.5L190.7,245.4L193.8,250.8L198.1,249.7L202.6,248.7L206.4,247.8L210.8,245.9L212.4,250.4L213.4,254.9L218.8,258.2L223.5,258.1L224.0,254.0L228.0,254.7L229.4,254.7L230.0,253.6L233.1,253.7L235.7,253.9L239.9,255.8L246.9,254.8L249.0,258.8L247.1,265.0L244.2,268.0L238.1,270.8L234.1,276.4L230.7,285.3L229.5,290.8L230.4,296.3L232.3,300.2L233.2,305.3L229.5,311.3L226.4,314.4L219.8,310.5L214.5,315.0L209.8,315.4L202.2,314.6L196.5,315.3L192.4,312.7L191.6,309.0L190.8,307.4L187.8,302.1L185.6,305.9L182.1,306.7L181.1,304.1L176.1,300.8L171.5,301.9L169.6,307.3L167.0,311.8L163.3,314.4L159.2,316.0L154.3,313.7L151.8,308.7L150.2,305.3L150.8,300.8L155.2,296.2L157.2,296.0L160.2,295.5L163.6,293.1L164.2,291.8L155.3,292.4L152.8,291.9L150.9,289.1L150.5,287.5L155.1,284.1L152.2,272.5L158.1,283.4L161.7,274.9L166.5,271.6L162.3,266.0L159.4,261.3L158.0,265.0L153.3,270.8L150.3,273.2L149.6,271.8L153.2,269.8L154.9,261.3L161.1,258.7L169.0,258.2L175.4,252.7L181.5,245.3Z"},
    {"id":"jeonnam","n":"전남","x":184.7,"y":346.4,"d":"M180.1,387.3L178.4,389.2L174.2,387.3L173.8,385.3L173.4,379.6L172.8,376.2L171.6,378.3L171.1,384.0L170.4,386.0L165.6,390.3L163.4,390.5L161.3,391.9L161.6,395.5L160.0,399.5L154.9,400.9L154.9,397.0L152.8,395.5L152.1,395.6L151.7,393.6L152.5,391.4L152.3,389.2L151.9,387.9L151.1,384.9L149.4,381.7L149.0,379.4L145.6,380.9L143.4,377.7L140.0,377.1L138.4,375.2L138.3,374.2L138.6,372.6L137.2,370.2L137.3,366.5L140.4,362.2L141.7,363.7L144.5,366.2L145.2,362.3L148.3,359.0L144.4,359.9L144.4,357.3L146.2,352.4L146.9,348.9L145.1,343.8L143.8,344.0L144.5,347.8L141.2,347.4L140.3,345.7L140.6,342.4L142.5,341.6L143.3,338.1L142.8,335.5L140.8,335.4L139.3,337.0L137.2,337.8L135.9,339.1L134.8,338.2L131.7,336.5L130.5,334.4L134.1,332.4L137.0,332.6L137.9,328.7L142.1,328.8L141.9,333.5L143.1,334.7L145.2,334.5L147.1,336.1L147.3,338.9L149.0,334.1L145.8,329.4L143.4,325.8L142.3,325.3L140.7,323.8L140.6,320.0L141.7,317.7L144.2,316.7L146.0,311.3L149.8,311.9L146.7,307.2L148.4,305.4L152.2,308.9L154.8,313.9L159.5,314.6L163.5,313.9L167.4,310.5L170.4,306.3L172.7,301.6L176.9,301.0L180.6,304.7L182.0,307.4L185.7,305.2L188.6,302.7L190.5,307.7L192.0,309.6L191.9,313.0L197.6,315.3L202.4,313.5L210.3,314.8L215.6,313.7L220.9,311.1L227.1,315.3L230.0,321.5L232.7,327.9L240.0,336.9L239.2,345.0L239.1,344.6L233.0,348.8L229.7,348.7L229.6,350.3L229.4,353.8L231.2,355.9L238.3,353.1L240.1,356.7L239.1,362.1L237.8,363.4L233.7,362.9L232.3,363.0L230.2,366.0L230.6,368.4L231.0,371.3L231.0,372.4L227.0,372.2L225.3,368.3L226.8,366.4L225.2,365.7L227.2,363.5L227.7,361.0L226.2,359.9L224.8,357.8L223.6,354.5L221.5,352.9L217.7,354.4L213.9,355.2L216.3,357.3L214.5,359.7L213.1,363.2L215.1,366.5L217.7,368.6L220.1,370.6L219.0,371.3L222.4,375.8L220.2,377.4L217.3,376.6L215.4,376.9L216.2,378.7L216.8,379.5L216.6,381.2L215.9,381.8L213.4,383.3L212.2,384.3L210.9,384.6L210.4,386.7L209.6,388.6L208.4,386.6L206.4,384.3L204.3,381.8L202.3,381.5L199.0,381.4L195.4,378.6L197.9,375.7L200.6,371.5L203.8,367.3L206.1,365.7L206.8,367.9L209.4,368.3L210.0,362.4L206.7,363.5L201.9,363.6L196.1,366.6L190.8,372.2L185.4,373.3L187.1,376.6L186.9,378.4L185.2,383.8L185.4,385.5L184.0,387.3ZM136.4,376.5L139.1,377.5L141.6,379.7L143.9,381.5L145.5,385.3L144.3,386.6L142.1,390.9L141.5,390.8L139.9,390.9L139.5,392.3L140.2,393.3L139.0,394.6L139.1,392.8L137.5,394.0L134.9,394.6L131.5,396.4L129.8,395.3L128.5,395.1L128.3,393.3L126.0,391.9L127.2,387.9L131.0,384.9L133.2,384.0L134.5,382.0L136.3,378.3L136.4,376.5ZM241.4,365.7L241.1,366.1L240.4,366.5L241.0,367.0L241.9,369.1L242.8,370.1L242.2,371.6L241.8,374.3L242.6,376.2L238.9,375.8L237.2,372.0L237.6,370.4L239.4,366.1L239.4,364.1ZM139.3,354.1L135.6,354.2L137.3,353.2L138.8,351.0L139.6,348.0L141.4,348.8L142.8,350.3L141.7,351.6L141.4,353.1L144.6,354.6L144.2,355.6L141.6,356.4L142.7,354.7L140.6,353.8Z"},
    {"id":"gyeongbuk","n":"경북","x":306.8,"y":227.8,"d":"M353.2,181.5L357.2,192.0L355.8,200.0L352.7,204.3L354.7,210.2L355.1,214.3L353.9,222.3L351.1,227.4L350.2,234.1L350.0,240.2L351.8,245.5L354.0,248.4L350.8,251.5L350.9,254.5L352.4,254.4L352.8,255.5L353.5,255.9L355.9,256.6L361.9,250.5L364.1,252.8L364.0,254.8L362.3,258.0L361.9,260.8L360.6,264.9L361.1,268.0L359.6,273.2L358.1,277.3L357.1,281.3L355.6,285.2L352.1,285.4L347.4,284.8L343.0,286.4L339.9,281.4L334.4,280.1L329.8,282.8L329.7,287.3L323.6,289.9L316.4,287.7L309.8,293.5L303.5,291.5L297.5,292.4L292.9,287.9L292.6,282.0L296.7,279.1L300.1,281.6L303.7,277.5L305.3,270.7L307.9,267.2L307.0,261.6L304.1,256.0L296.7,258.3L292.3,258.5L290.6,266.2L288.7,262.4L283.4,265.3L289.1,272.3L282.3,277.2L280.6,281.5L281.5,289.8L277.0,286.0L272.6,286.0L267.1,286.1L269.8,281.6L267.1,276.3L264.5,271.9L258.1,270.8L251.0,269.1L248.8,266.4L250.0,261.2L247.6,256.1L251.3,252.7L253.8,246.9L255.0,241.8L257.7,239.4L258.1,236.6L254.8,234.6L252.5,234.3L246.5,233.5L246.9,228.5L246.7,223.7L247.3,219.6L248.5,215.2L247.4,210.3L242.3,207.3L245.8,204.5L248.0,202.2L250.9,205.9L251.4,201.5L247.5,199.2L252.9,195.8L259.4,197.0L259.2,190.8L261.8,189.3L265.2,186.9L270.9,187.6L272.5,183.8L279.0,187.8L285.8,186.4L285.3,181.7L290.8,174.9L295.0,171.3L298.6,168.2L302.8,167.9L308.3,169.2L309.0,165.0L313.0,166.7L318.4,166.8L323.7,165.2L329.1,166.1L333.2,165.2L339.9,168.6L342.7,163.7L347.5,160.4L350.5,162.3L350.7,163.9L352.8,168.5L353.1,178.2Z"},
    {"id":"gyeongnam","n":"경남","x":273.6,"y":310.2,"d":"M287.6,333.8L285.4,336.7L281.8,337.2L281.2,339.5L286.1,337.5L288.1,335.6L287.5,337.4L290.4,340.2L288.7,341.5L284.4,341.7L286.3,343.9L285.4,348.6L285.1,351.2L286.1,350.4L287.1,349.8L288.0,352.3L286.9,352.5L286.2,354.9L283.4,355.3L281.9,354.9L282.4,353.1L284.8,352.8L281.8,350.6L280.5,351.5L279.2,351.7L277.2,349.1L280.1,347.8L279.0,346.8L278.0,344.5L277.2,346.3L275.9,349.0L274.9,349.4L274.0,347.5L272.9,346.8L270.2,346.4L269.9,350.3L268.1,349.3L267.5,350.1L265.2,350.8L263.6,348.4L262.6,347.6L258.8,346.3L259.5,340.0L259.0,337.4L258.4,334.8L257.8,338.5L256.3,337.6L255.8,338.2L256.6,341.7L255.6,342.1L254.2,342.0L252.5,343.1L251.6,341.5L250.6,341.9L250.0,343.7L247.5,345.8L244.7,344.9L243.4,345.7L242.1,347.3L241.0,342.3L238.0,335.2L230.2,325.8L229.6,321.0L227.7,315.3L230.4,309.5L233.8,303.7L231.7,299.1L228.1,294.6L230.2,289.4L231.5,282.8L234.5,275.7L238.6,270.0L245.2,268.2L248.0,264.5L250.8,266.8L254.3,269.4L261.8,270.7L265.5,275.1L269.3,279.0L267.3,286.2L272.7,286.0L278.2,286.7L284.3,289.3L288.8,287.3L292.1,284.5L294.4,290.4L300.2,291.3L305.0,292.6L310.7,292.5L316.0,288.0L323.3,289.9L324.1,293.5L325.0,296.7L331.7,299.4L338.4,304.9L337.8,310.9L333.0,312.8L329.3,316.5L323.8,321.8L317.5,323.4L316.4,327.8L314.0,327.5L311.3,329.3L313.2,332.8L311.6,334.4L310.0,333.1L308.7,332.6L308.4,336.3L307.1,334.2L305.7,333.2L303.7,332.9L304.0,330.8L303.4,328.9L300.1,328.9L299.1,330.2L297.9,327.7L298.3,323.4L296.1,327.7L296.3,330.4L297.1,331.3L297.3,335.1L299.5,335.6L295.1,335.5L296.0,333.7L292.8,332.3L291.7,332.5L287.5,332.4ZM302.2,359.4L300.7,363.2L302.3,364.3L299.1,364.1L299.8,366.1L296.1,364.8L295.7,361.5L294.7,361.1L293.1,360.1L296.1,358.5L296.4,354.3L291.9,355.5L291.4,357.6L289.1,354.9L289.2,350.8L290.3,348.9L295.0,350.0L296.5,349.4L297.7,349.3L298.3,348.7L296.3,345.4L297.5,344.9L300.6,343.1L302.0,341.5L302.6,340.6L302.9,338.5L304.4,338.7L304.4,341.7L304.5,344.4L305.0,346.8L305.2,349.8L304.0,351.6L305.3,350.3L306.3,353.0L305.7,354.8L305.8,355.9L305.9,358.8L303.2,358.4ZM249.5,353.2L252.9,357.9L257.4,355.7L260.4,357.0L260.2,358.7L258.9,363.5L259.8,365.7L257.9,366.2L256.6,365.8L255.0,366.0L252.5,364.1L249.9,360.9L248.6,364.9L245.0,362.6L246.3,360.3L244.8,358.1L242.9,353.8L244.1,351.3L245.4,349.7L246.0,348.0L249.4,346.4L250.6,347.0L250.7,349.8ZM280.4,355.0L281.7,355.8L283.0,356.3L286.2,355.9L285.9,358.1L284.8,358.9L283.9,361.5L282.9,359.4L281.6,358.8L282.1,357.8L279.7,356.1L278.9,355.4L280.0,355.3Z"},
    {"id":"jeju","n":"제주","x":157.1,"y":477.9,"d":"M180.9,466.9L180.9,469.7L182.9,471.2L183.9,471.8L182.4,474.4L181.2,477.3L177.8,481.8L175.5,484.6L171.5,485.7L164.2,487.3L160.2,490.6L158.2,490.5L154.8,490.0L150.8,490.3L143.8,490.6L140.3,491.3L138.0,493.6L136.7,492.9L131.6,488.5L130.7,483.6L130.9,481.4L135.2,477.5L136.7,475.5L137.3,474.6L140.6,470.7L146.6,469.5L152.4,466.7L156.2,465.6L157.9,466.1L162.6,464.3L165.3,464.3L169.7,463.5L172.2,463.0L176.0,463.8L181.2,466.4Z"}
  ];
  // 색 단계: 그때그때 가장 많은 지역을 최대로 놓고 네 등분한다. 0건은 따로 가장 옅은 단계
  const SHADES = [0.05, 0.16, 0.28, 0.4, 0.54];
  const CLUSTER_MIN = 3;
  let mapFull = false;
  let openCluster = null;
  // 지역 색은 지역 필터를 뺀 나머지 조건으로 센 건수를 쓴다. 지역을 고른다고 다른 지역이 0으로 보이면 안 되기 때문이다
  function filteredNoRegion() {
    const kept = filter.regions;
    filter.regions = [];
    const result = filtered();
    filter.regions = kept;
    return result;
  }
  function shadeLevel(count, max) { return count <= 0 ? 0 : Math.min(4, Math.ceil(count / Math.max(max, 1) * 4)); }
  function remoteBtn(action, iconName, label, isOn) {
    return '<button class="remote-btn" type="button" data-map="' + action + '" aria-pressed="' + isOn + '" aria-label="' + label + '" title="' + label + '">' + icon(iconName) + "</button>";
  }
  function renderMap() {
    const base = filteredNoRegion();
    const list = filtered();
    const isPin = settings.map === "pin";
    const counts = {};
    base.forEach(ev => { counts[ev.r] = (counts[ev.r] || 0) + 1; });
    const max = Math.max(0, ...Object.keys(counts).map(key => counts[key]));
    $("mapRemote").innerHTML = remoteBtn("full", "frame", "전체 화면", mapFull) + '<div class="remote-div"></div>'
      + remoteBtn("area", "layers", "행정구역 보기", !isPin) + remoteBtn("pin", "pin", "지도 API 보기", isPin) + '<div class="remote-div"></div>'
      + remoteBtn("legend", "info", "범례", settings.legend) + remoteBtn("reset", "reset", "처음으로", false);
    const areas = GEO.map(geo => {
      const count = counts[geo.n] || 0;
      const isSelected = filter.regions.includes(geo.n);
      return '<path class="area' + (isSelected ? " is-sel" : "") + '" data-area="' + geo.n + '" data-count="' + count + '" d="' + geo.d + '" fill-opacity="' + (isPin ? (isSelected ? 0.22 : 0.06) : SHADES[shadeLevel(count, max)]) + '"></path>';
    }).join("");
    const labels = GEO.map(geo => {
      const count = counts[geo.n] || 0;
      return '<text class="area-label" x="' + geo.x + '" y="' + geo.y + '">' + geo.n + "</text>" + (!isPin && count ? '<text class="area-count" x="' + geo.x + '" y="' + (geo.y + 11) + '">' + count + "</text>" : "");
    }).join("");
    let pins = "";
    if (isPin) {
      // 묶기(흉내): 같은 지역의 표시가 CLUSTER_MIN 개 이상이면 수를 적은 원 하나로 묶고, 누르면 그 묶음만 풀어 보여 준다
      const groups = Object.groupBy(list, ev => ev.r);
      pins = Object.keys(groups).map(region => {
        const geo = GEO.filter(item => item.n === region)[0];
        const events = groups[region];
        if (!geo) return "";
        if (events.length >= CLUSTER_MIN && openCluster !== region) {
          return '<g class="cluster" data-cluster="' + region + '"><circle cx="' + geo.x + '" cy="' + (geo.y - 16) + '" r="10"></circle><text x="' + geo.x + '" y="' + (geo.y - 16) + '">' + events.length + "</text></g>";
        }
        return events.map((ev, i) => {
          // 같은 지역의 표시가 겹치지 않게 나선으로 벌린다 (실제 좌표가 아니다)
          const k = i + 1;
          const angle = k * 2.4;
          const radius = 6 + k * 3.2;
          return '<circle class="pin pin-' + STATUS_CLASS[ev.st].slice(7) + '" data-pin="' + EVENTS.indexOf(ev) + '" cx="' + (geo.x + Math.cos(angle) * radius).toFixed(1) + '" cy="' + (geo.y - 14 + Math.sin(angle) * radius).toFixed(1) + '" r="5"></circle>';
        }).join("");
      }).join("");
    }
    $("mapSvg").innerHTML = areas + labels + pins;
    $("mapLegend").hidden = !settings.legend;
    $("mapLegend").innerHTML = isPin
      ? '<b>위치 표시</b><span><i class="lg-dot"></i>진행중</span><span><i class="lg-dot lg-soon"></i>예정</span><span><i class="lg-dot lg-end"></i>종료</span>'
        + '<span><i class="lg-dot lg-cluster"></i>' + CLUSTER_MIN + "개 이상 묶음</span>"
      : "<b>지역별 건수</b>" + '<span><i class="lg-sw" style="opacity:' + SHADES[0] + '"></i>0</span>'
        + [1, 2, 3, 4].map(level => {
          const values = [];
          for (let n = 1; n <= max; n++) if (shadeLevel(n, max) === level) values.push(n);
          return values.length ? '<span><i class="lg-sw" style="opacity:' + SHADES[level] + '"></i>' + (values.length > 1 ? values[0] + " ~ " + values[values.length - 1] : values[0]) + "</span>" : "";
        }).join("");
    $("mapCard").classList.toggle("is-full", mapFull);
    $("mapState").innerHTML = (filter.regions.length ? filter.regions.map(region => '<span class="tag tag-line">' + region + "</span>").join("") : '<span class="tag">고른 지역 없음</span>')
      + "<span>→ " + list.length + "건</span>";
  }
  function initMap() {
    $("mapCard").addEventListener("click", (e) => {
      const button = e.target.closest("[data-map]");
      if (button) {
        const action = button.dataset.map;
        if (action === "full") { mapFull = !mapFull; renderMap(); return; }
        if (action === "legend") settings.legend = !settings.legend;
        else if (action === "reset") { filter.regions = []; listLimit = LIST_PAGE; }
        else settings.map = action;
        refresh();
        return;
      }
      const cluster = e.target.closest("[data-cluster]");
      if (cluster) {
        openCluster = openCluster === cluster.dataset.cluster ? null : cluster.dataset.cluster;
        renderMap();
        return;
      }
      const area = e.target.closest("[data-area]");
      if (area) {
        // 지도에서 고른 지역은 헤더 필터의 지역과 같은 값이다
        const region = area.dataset.area;
        const index = filter.regions.indexOf(region);
        if (index >= 0) filter.regions.splice(index, 1); else filter.regions.push(region);
        onFilterChanged();
      }
    });
    $("mapSvg").addEventListener("mouseover", (e) => {
      const tip = $("mapTip");
      const area = e.target.closest("[data-area]");
      const pin = e.target.closest("[data-pin]");
      if (pin) {
        const ev = EVENTS[Number(pin.dataset.pin)];
        tip.innerHTML = "<b>" + esc(shown(ev.t)) + "</b><br>" + ev.r + " · " + ev.c + " · " + period(ev);
        tip.hidden = false;
      } else if (area) {
        tip.innerHTML = "<b>" + area.dataset.area + "</b> · " + area.dataset.count + "건";
        tip.hidden = false;
      }
    });
    $("mapSvg").addEventListener("mouseleave", () => { $("mapTip").hidden = true; });
    listen(document, "keydown", (e) => {
      if (e.key === "Escape" && mapFull) { mapFull = false; renderMap(); }
    });
  }

  /* ---------- 구조 탭의 견본: 같은 계산을 화면에서와 워커에서 ---------- */
  const DEMO_LIMIT = 8000000; // 보통의 PC에서 1~2초쯤 걸리는 양
  function countPrimes(from, to) {
    var c = 0;
    for (var n = Math.max(2, from); n < to; n++) {
      var p = true;
      for (var d = 2; d * d <= n; d++) { if (n % d === 0) { p = false; break; } }
      if (p) c++;
    }
    return c;
  }
  function initArch() {
    let demoBusy = false;
    let aliveN = 0;
    let activeWorker = null;
    let activeUrl = null;
    // 화면이 살아 있는 동안 계속 올라가는 숫자. 화면에서 계산하면 그동안 멈춘다
    const aliveTimer = setInterval(() => { aliveN++; $("aliveOut").textContent = aliveN; }, 100);
    function releaseWorker() {
      if (activeWorker) activeWorker.terminate();
      if (activeUrl) URL.revokeObjectURL(activeUrl);
      activeWorker = null;
      activeUrl = null;
    }
    onCleanup(() => { clearInterval(aliveTimer); releaseWorker(); });

    const setProgress = (percent, stage) => { $("progBar").style.width = percent + "%"; $("progStage").textContent = stage; };
    const setDemoBusy = (isBusy) => { demoBusy = isBusy; $("runMain").disabled = isBusy; $("runWorker").disabled = isBusy; };

    $("runMain").addEventListener("click", () => {
      if (demoBusy) return;
      setDemoBusy(true);
      setProgress(0, "화면에서 계산하는 중. 끝날 때까지 화면이 멈춥니다");
      $("demoOut").textContent = "—";
      // 안내 문구가 먼저 그려지도록 한 박자 뒤에 시작한다
      setTimeout(() => {
        if (!root.isConnected) return; // 그 사이 다른 문서로 떠났으면 계산하지 않는다
        const before = aliveN;
        const startedAt = performance.now();
        const count = countPrimes(0, DEMO_LIMIT);
        const ms = Math.round(performance.now() - startedAt);
        setProgress(100, "끝");
        $("demoOut").textContent = DEMO_LIMIT.toLocaleString() + "까지 소수 " + count.toLocaleString() + "개 · " + ms + "ms · 그동안 숫자는 " + (aliveN - before) + "번 올라감 (화면이 멈춤)";
        setDemoBusy(false);
      }, 60);
    });
    $("runWorker").addEventListener("click", () => {
      if (demoBusy) return;
      setDemoBusy(true);
      setProgress(0, "워커를 시작하는 중");
      $("demoOut").textContent = "—";
      const before = aliveN;
      const startedAt = performance.now();
      const finish = (text) => { $("demoOut").textContent = text; setDemoBusy(false); releaseWorker(); };
      try {
        // 워커 안의 코드. 구간으로 나눠 계산하고 구간마다 진행 상황을 보낸다
        const source = countPrimes.toString() + ";onmessage=function(e){var m=e.data;try{var total=0,parts=20,size=Math.ceil(m.limit/parts);"
          + "for(var i=0;i<parts;i++){total+=countPrimes(i*size,Math.min(m.limit,(i+1)*size));"
          + 'postMessage({id:m.id,type:"progress",percent:Math.round((i+1)/parts*100),stage:"구간 "+(i+1)+" / "+parts});}'
          + 'postMessage({id:m.id,type:"done",count:total});}catch(err){postMessage({id:m.id,type:"error",message:String(err)});}};';
        activeUrl = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
        activeWorker = new Worker(activeUrl);
        activeWorker.onmessage = (e) => {
          const message = e.data;
          if (message.type === "progress") setProgress(message.percent, message.stage);
          else if (message.type === "done") {
            setProgress(100, "끝");
            finish(DEMO_LIMIT.toLocaleString() + "까지 소수 " + message.count.toLocaleString() + "개 · " + Math.round(performance.now() - startedAt) + "ms · 그동안 숫자는 " + (aliveN - before) + "번 올라감 (화면이 살아 있음)");
          } else if (message.type === "error") {
            setProgress(0, "오류");
            finish("워커에서 오류가 났습니다: " + message.message);
          }
        };
        activeWorker.onerror = (event) => {
          console.warn("[CommonGuiDemo] 워커 실행 오류:", event && event.message);
          setProgress(0, "오류");
          finish("이 환경에서는 워커를 실행할 수 없습니다.");
        };
        activeWorker.postMessage({ id: 1, type: "run", limit: DEMO_LIMIT });
      } catch (err) {
        console.warn("[CommonGuiDemo] 워커를 만들지 못했습니다:", err);
        setProgress(0, "오류");
        finish("이 환경에서는 워커를 만들 수 없습니다.");
      }
    });
  }

  /* ---------- 화면 탭: 공통 아이콘 표와 전환 속도 비교 ---------- */
  // [묶음 이름, [[견본 아이콘 이름, 기능, Lucide 이름], ...]]
  const ICON_SETS = [
    ["화면 틀", [["menu", "메뉴", "menu"], ["list", "목차", "list"], ["filter", "필터", "filter"], ["share", "공유", "share-2"], ["gear", "설정", "settings"], ["info", "정보", "info"], ["login", "로그인", "log-in"], ["user", "계정", "user"]]],
    ["보기 방식", [["cal", "달력", "calendar"], ["table", "표", "table"], ["grid", "카드", "layout-grid"], ["map", "지도", "map"], ["layers", "행정구역", "layers"], ["pin", "위치", "map-pin"], ["frame", "전체 화면", "maximize"]]],
    ["이동과 동작", [["back", "뒤로 가기", "arrow-left"], ["arrow", "앞으로 가기", "arrow-right"], ["chevl", "왼쪽으로 밀기", "chevron-left"], ["chevr", "오른쪽으로 밀기", "chevron-right"], ["search", "검색", "search"], ["x", "닫기 · 지우기", "x"], ["reset", "되돌리기", "rotate-ccw"], ["copy", "클립보드에 복사", "copy"], ["tack", "고정하기", "pin"], ["chev", "펼치기", "chevron-down"], ["check", "선택됨", "check"]]],
    ["정렬", [["sort", "정렬 가능", "arrow-up-down"], ["up", "오름차순", "arrow-up"], ["down", "내림차순", "arrow-down"]]],
    ["보이기와 소리", [["eye", "보이기", "eye"], ["eyeoff", "숨기기", "eye-off"], ["mic", "마이크", "mic"], ["vol", "스피커", "volume-2"], ["mute", "음소거", "volume-x"]]]
  ];
  function initBase() {
    $("iconGrid").innerHTML = ICON_SETS.map(set =>
      '<div class="icon-group">' + set[0] + "</div>" + set[1].map(item =>
        '<div class="icon-tile">' + icon(item[0]) + "<b>" + item[1] + "</b><span>" + item[2] + "</span></div>"
      ).join("")
    ).join("");
    $("playBtn").addEventListener("click", () => { $("tracks").classList.toggle("is-on"); });
  }

  /* ---------- 레일의 「미리보기 설정」 ---------- */
  // 모서리: 사이트의 모서리 토큰 세 단계를 한꺼번에 바꾼다 (기본 8px → 4 / 8 / 12px). 기본값이면 손대지 않은 상태로 둔다
  const RADIUS_TOKENS = [["--r-sm", 0.5], ["--r-md", 1], ["--r-lg", 1.5]];
  function applyRadius(radius) {
    const style = document.documentElement.style;
    RADIUS_TOKENS.forEach(([token, ratio]) => {
      if (radius === DEFAULT_RADIUS) style.removeProperty(token);
      else style.setProperty(token, (radius * ratio) + "px");
    });
  }
  // 영역 표시: 사이트 뼈대의 네 영역 위에 점선 틀과 이름표를 겹쳐 그린다. 뼈대 요소 자체는 건드리지 않는다
  const SHELL_REGIONS = [["레일", "#sidebar-nav"], ["패널", "#sidebar-panel"], ["헤더", "#app-header"], ["본문", "#app-main"]];
  const REGION_MIN_SIZE_PX = 4; // 이보다 작으면(접힌 패널 등) 틀을 그리지 않는다
  let regionOverlay = null;
  let regionFrame = 0;
  function layoutRegions() {
    all(".cg-region-box", regionOverlay).forEach(box => {
      const target = document.querySelector(box.dataset.cgTarget);
      const rect = target ? target.getBoundingClientRect() : null;
      const isVisible = !!rect && rect.width > REGION_MIN_SIZE_PX && rect.height > REGION_MIN_SIZE_PX;
      const key = isVisible ? [rect.left, rect.top, rect.width, rect.height].map(Math.round).join(",") : "";
      if (box.dataset.cgRect === key) return;
      box.dataset.cgRect = key;
      box.hidden = !isVisible;
      if (isVisible) {
        box.style.left = Math.round(rect.left) + "px";
        box.style.top = Math.round(rect.top) + "px";
        box.style.width = Math.round(rect.width) + "px";
        box.style.height = Math.round(rect.height) + "px";
      }
    });
    // 패널을 여닫거나 서랍이 움직이는 동안에도 따라가도록 켜져 있는 동안 매 프레임 자리를 다시 잰다
    regionFrame = requestAnimationFrame(layoutRegions);
  }
  function setRegions(isOn) {
    if (isOn && !regionOverlay) {
      regionOverlay = document.createElement("div");
      regionOverlay.className = "cg-region-overlay";
      regionOverlay.setAttribute("aria-hidden", "true");
      regionOverlay.innerHTML = SHELL_REGIONS.map(([name, selector]) =>
        '<div class="cg-region-box" data-cg-region="' + name + '" data-cg-target="' + selector + '" hidden><span class="cg-region-tag">' + name + "</span></div>"
      ).join("");
      document.body.appendChild(regionOverlay);
      layoutRegions();
    } else if (!isOn && regionOverlay) {
      cancelAnimationFrame(regionFrame);
      regionOverlay.remove();
      regionOverlay = null;
    }
  }
  function initPreviewRail() {
    let rangeInput = null;
    let rangeOutput = null;
    let regionButton = null;
    const sync = () => {
      applyRadius(session.preview.radius);
      setRegions(session.preview.regions);
      if (!rangeInput) return;
      rangeInput.value = String(session.preview.radius);
      rangeOutput.textContent = session.preview.radius + "px";
      regionButton.setAttribute("aria-pressed", String(session.preview.regions));
    };
    Navigation.addRailItem({
      id: "cg-preview",
      icon: "cg-sliders",
      label: "미리보기 설정",
      renderPanel(container) {
        const pane = document.createElement("div");
        pane.className = "cg cg-rail";
        pane.innerHTML =
          "<p>이 문서를 살펴보기 위한 도구입니다. 값은 저장되지 않습니다.</p>"
          + '<div class="field"><div class="field-top"><label for="cg-radius-range">모서리</label><span class="mono" id="cg-radius-out"></span></div>'
          + '<input type="range" id="cg-radius-range" min="0" max="16" step="2"></div>'
          + '<button class="text-btn" type="button" id="cg-region-btn" aria-pressed="false">영역 표시</button>'
          + '<button class="text-btn" type="button" id="cg-preview-reset">기본값으로</button>';
        container.appendChild(pane);
        rangeInput = pane.querySelector("#cg-radius-range");
        rangeOutput = pane.querySelector("#cg-radius-out");
        regionButton = pane.querySelector("#cg-region-btn");
        rangeInput.addEventListener("input", () => { session.preview.radius = Number(rangeInput.value); sync(); });
        regionButton.addEventListener("click", () => { session.preview.regions = !session.preview.regions; sync(); });
        pane.querySelector("#cg-preview-reset").addEventListener("click", () => {
          session.preview.radius = DEFAULT_RADIUS;
          session.preview.regions = false;
          sync();
        });
      }
    });
    // 이 묶음의 문서를 오가는 동안에는 고른 값을 이어서 적용하고, 화면을 떠날 때는 뼈대를 원래대로 되돌린다
    sync();
    onCleanup(() => {
      applyRadius(DEFAULT_RADIUS);
      setRegions(false);
    });
  }

  /* ---------- 다시 그리기와 시작 ---------- */
  const HAS_FILTER = ["calendar", "list", "map", "filter"].includes(pageName);
  const HAS_SETTINGS = ["calendar", "list", "map"].includes(pageName);
  function refresh() {
    saveSettings();
    renderFilterPanel();
    renderSettingsPanel();
    if (pageName === "calendar") renderCalendar();
    else if (pageName === "list") renderList();
    else if (pageName === "map") renderMap();
    else if (pageName === "filter") renderFilterState();
    else if (pageName === "abbr") renderAbbr();
  }

  initPreviewRail();
  if (HAS_FILTER) filterPanel = buildFilterPanel();
  if (HAS_SETTINGS) settingsPanel = buildSettingsPanel();
  // 패널은 한 번만 등록한다. 등록하지 않은 화면에서는 사이트가 「이 화면에만 해당하는 설정은 없습니다」를 보여 준다
  if (filterPanel || settingsPanel) Header.setPanels({ filter: filterPanel || undefined, settings: settingsPanel || undefined });
  // 헤더는 닫은 패널의 내용을 다음 패널이 열릴 때까지 그대로 두므로, 떠날 때 내 패널은 직접 거둔다
  onCleanup(() => {
    if (filterPanel) filterPanel.remove();
    if (settingsPanel) settingsPanel.remove();
  });

  if (pageName === "base") initBase();
  else if (pageName === "calendar") initCalendar();
  else if (pageName === "list") initList();
  else if (pageName === "map") initMap();
  else if (pageName === "abbr") initAbbr();
  else if (pageName === "arch") initArch();
  else if (pageName === "filter") {
    $("filterOpenBtn").addEventListener("click", () => {
      const button = $("header-filter-btn");
      if (button && button.getAttribute("aria-expanded") !== "true") Header.togglePanel("filter");
    });
  }

  refresh();
  // 달력을 열면 이번 달 카드가 보이게 한다
  if (pageName === "calendar") jumpToMonth(Number(TODAY.slice(5, 7)));
})();
