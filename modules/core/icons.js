/**
 * @file modules/core/icons.js
 * @module SiteModules.Icons
 * @description 뼈대(레일·헤더·패널)에서 쓰는 선형 아이콘 묶음. 24px 격자, 선 굵기 1.75px, 끝과 모서리는 둥글게.
 *   한 기능에 아이콘 하나, 한 아이콘에 뜻 하나를 지킨다. 그림은 Lucide 아이콘 이름을 따른다.
 *   새 기능의 아이콘은 먼저 ICON_PATHS 에 더한 다음 쓴다.
 * @exports ensureSprite, html
 */

window.SiteModules = window.SiteModules || {};

window.SiteModules.Icons = (function () {
  const SPRITE_ID = "app-icon-sprite";

  // 이름: 기능 (Lucide 이름)
  const ICON_PATHS = {
    // 헤더
    "menu": '<path d="M4 6h16M4 12h16M4 18h16"/>',                                   // 메뉴 (menu)
    "filter": '<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>',                        // 필터 (filter)
    "share": '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>', // 페이지 공유 (share-2)
    "gear": '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>', // 설정 (settings)
    "x": '<path d="M18 6 6 18M6 6l12 12"/>',                                         // 닫기 (x)

    // 레일
    "sitemap": '<path d="M21 12h-8M21 6H8M21 18h-8M3 6v4c0 1.1.9 2 2 2h3M3 10v6c0 1.1.9 2 2 2h3"/>', // 사이트맵 (list-tree)
    "list": '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',          // 목차 (list)
    "search": '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',           // 검색 (search)
    "info": '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',          // 문서 정보 (info)
    "school": '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0zM22 10v6M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>', // 튜토리얼 (graduation-cap)

    // 그 밖
    "user-plus": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>', // 친구 추가 (user-plus)
    "mail": '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>', // 메일 (mail)
    "chat": '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',                             // 채팅 (message-circle)
  };

  /** 아이콘 모음(SVG sprite)을 문서에 한 번만 넣는다. */
  function ensureSprite() {
    if (document.getElementById(SPRITE_ID)) return;
    const symbols = Object.keys(ICON_PATHS)
      .map(name => `<symbol id="i-${name}" viewBox="0 0 24 24">${ICON_PATHS[name]}</symbol>`)
      .join("");
    const holder = document.createElement("div");
    holder.innerHTML = `<svg id="${SPRITE_ID}" width="0" height="0" style="position:absolute" aria-hidden="true">${symbols}</svg>`;
    document.body.insertBefore(holder.firstChild, document.body.firstChild);
  }

  /**
   * 아이콘 SVG 마크업을 돌려준다.
   * @param {string} name ICON_PATHS 의 이름
   * @param {string} [extraClass] 크기 등 추가 클래스 (예: "ico-sm")
   */
  function html(name, extraClass = "") {
    if (!ICON_PATHS[name]) console.warn(`[Icons] 등록되지 않은 아이콘: ${name}`);
    return `<svg class="ico${extraClass ? " " + extraClass : ""}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  }

  return {
    ensureSprite: ensureSprite,
    html: html
  };
})();
