/**
 * @file modules/features/update-check.js
 * @module SiteModules.UpdateCheck
 * @description 새 판 알림 띠. 홈 화면에 설치한 앱은 완전히 닫기 전까지 이미 연 화면을 계속 쓰므로,
 *   화면이 다시 보일 때(그리고 30분마다) 서버의 /modules/script.js 에서 SiteVersion 을 읽어 지금 판과 견준다.
 *   다르면 화면 아래에 「새 판이 나왔어요 · 새로 고침」 띠를 띄운다.
 *   새로 고침은 먼저 첫 화면(index.html)을 캐시 없이 다시 받아 둔 뒤 다시 불러온다(GitHub Pages 는 10분 캐시).
 * @exports init
 */

window.SiteModules = window.SiteModules || {};

window.SiteModules.UpdateCheck = (function () {
  const CHECK_INTERVAL_MS = 30 * 60 * 1000;
  // 화면이 다시 보일 때 너무 자주 확인하지 않게 한다
  const MIN_GAP_MS = 60 * 1000;
  const VERSION_PATTERN = /window\.SiteVersion\s*=\s*"([^"]+)"/;

  let lastCheckAt = 0;
  let band = null;

  async function fetchServerVersion() {
    const response = await fetch(`/modules/script.js?check=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return "";
    const match = VERSION_PATTERN.exec(await response.text());
    return match ? match[1] : "";
  }

  async function reloadFresh() {
    try {
      await fetch(window.location.pathname, { cache: "reload" });
    } catch (err) {
      console.warn("[UpdateCheck] 첫 화면을 새로 받지 못했습니다:", err);
    }
    window.location.reload();
  }

  function showBand(version) {
    if (band) return;
    band = document.createElement("div");
    band.className = "update-band";
    band.setAttribute("role", "status");
    band.innerHTML = `<span>새 판이 나왔어요</span><button type="button" class="update-band-btn">새로 고침</button>`;
    band.title = `지금 ${window.SiteVersion} → 새 판 ${version}`;
    band.querySelector("button").addEventListener("click", reloadFresh);
    document.body.appendChild(band);
  }

  async function check() {
    if (document.visibilityState !== "visible" || band) return;
    if (Date.now() - lastCheckAt < MIN_GAP_MS) return;
    lastCheckAt = Date.now();
    try {
      const serverVersion = await fetchServerVersion();
      if (serverVersion && window.SiteVersion && serverVersion !== window.SiteVersion) showBand(serverVersion);
    } catch (err) {
      // 오프라인 등은 다음에 다시 확인한다
    }
  }

  function init() {
    document.addEventListener("visibilitychange", check);
    setInterval(check, CHECK_INTERVAL_MS);
    setTimeout(check, 10 * 1000);
  }

  return { init };
})();
