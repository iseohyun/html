/**
 * @file modules/core/hierarchy.js
 * @module SiteModules.Hierarchy
 * @description hierarchy.json(사이트맵 트리) 순회 공용 유틸. 항목 구조는
 *   { 주제, 디렉토리?, 파일명?, 목록? } 이며, "파일명"이 있거나 "목록"이 없는 항목이 문서(페이지)다.
 *   파일명이 생략된 문서는 index.html로 간주한다.
 *   "파일명"과 "목록"을 함께 가진 항목은 개론이 있는 묶음이다. 개론의 파일명은 index.html 로 통일한다.
 *   "디렉토리"는 보통 부모의 폴더에 이어 붙지만, "/"로 시작하면 사이트 루트 기준이다
 *   (분류는 바꾸되 폴더와 주소는 그대로 둘 때 쓴다). "형식"은 문서의 종류 표시(예: "시뮬레이터")다.
 *   "상태": "개발중" 인 항목(문서 또는 묶음 전체)은 관리자에게만 보인다. setShowDev(true) 전에는
 *   순회 · 찾기 · 글 수에서 모두 빠진다. 가리는 것일 뿐, 파일은 공개되어 있다.
 *   개론 문서가 없는 묶음은 "자동 개론"(하위 목록을 보여 주는 화면)을 가질 수 있다. 그 주소는 파일이 아니라
 *   제목 경로로 적는다: "/sitemap/공학/표현 기법".
 * @exports isPageItem, getFileName, resolveDirs, getItemUrl, countPages, forEachPage, findPage, findPathByTitle,
 *   AUTO_OVERVIEW_PREFIX, getAutoOverviewUrl, findFolderByUrl,
 *   isDevItem, setShowDev, isShowingDev, visibleItems, countDevPages, isDevPath
 */

window.SiteModules = window.SiteModules || {};

window.SiteModules.Hierarchy = (function () {
  const DEFAULT_FILE_NAME = "index.html";
  const AUTO_OVERVIEW_PREFIX = "/sitemap/";
  const DEV_STATE = "개발중";
  // 개발중 항목을 보일지 (관리자로 로그인했을 때만 true)
  let showDev = false;

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function isDevItem(item) {
    return item.상태 === DEV_STATE;
  }

  /** 개발중 항목을 보일지 정한다 (관리자로 로그인했을 때 true) */
  function setShowDev(nextShowDev) {
    showDev = !!nextShowDev;
  }

  function isShowingDev() {
    return showDev;
  }

  /** 지금 보여도 되는 항목만 고른다 */
  function visibleItems(list) {
    if (!Array.isArray(list)) return [];
    return showDev ? list : list.filter(item => !isDevItem(item));
  }

  // 문서(페이지)를 가리키는 항목인지 여부 (하위 목록만 가진 분류 항목은 false)
  function isPageItem(item) {
    return hasOwn(item, '파일명') || !hasOwn(item, '목록');
  }

  function getFileName(item) {
    return hasOwn(item, '파일명') ? item.파일명 : DEFAULT_FILE_NAME;
  }

  /**
   * 부모까지의 폴더 경로에 항목의 "디렉토리"를 더한다. "/"로 시작하는 디렉토리는 루트 기준이라 부모를 버린다.
   * @returns {string} 앞 슬래시 없는 폴더 경로 (예: "engineering/language/C/")
   */
  function resolveDirs(parentDirs, dir) {
    const own = dir || "";
    return own.startsWith("/") ? own.slice(1) : (parentDirs || "") + own;
  }

  /** 문서 항목의 주소 (예: "/engineering/language/C/start.html") */
  function getItemUrl(parentDirs, item) {
    return `/${resolveDirs(parentDirs, item.디렉토리)}${getFileName(item)}`;
  }

  /** 항목 아래(자기 자신 제외)에 있는 문서의 수 */
  function countPages(item) {
    let count = 0;
    (item.목록 || []).forEach(child => {
      if (isDevItem(child)) return; // 개발중인 글은 countDevPages 가 센다
      if (isPageItem(child)) count++;
      count += countPages(child);
    });
    return count;
  }

  /** 항목 아래(자기 자신 제외)에 있는 개발중 문서의 수. 개발중 묶음 안의 문서는 모두 개발중으로 센다. */
  function countDevPages(item, isInsideDev = false) {
    let count = 0;
    (item.목록 || []).forEach(child => {
      const isDev = isInsideDev || isDevItem(child);
      if (isDev && isPageItem(child)) count++;
      count += countDevPages(child, isDev);
    });
    return count;
  }

  /** 주소가 개발중 문서(또는 개발중 묶음 안의 문서)인지. 보이기 설정과 상관없이 트리 전체에서 찾는다. */
  function isDevPath(list, urlPath, parentDirs = "", isInsideDev = false) {
    if (!Array.isArray(list)) return false;
    const target = urlPath.startsWith('/') ? urlPath : '/' + urlPath;
    for (const item of list) {
      const isDev = isInsideDev || isDevItem(item);
      const dirs = resolveDirs(parentDirs, item.디렉토리);
      if (isDev && isPageItem(item) && `/${dirs}${getFileName(item)}` === target) return true;
      if (item.목록 && isDevPath(item.목록, target, dirs, isDev)) return true;
    }
    return false;
  }

  /** 자동 개론의 주소 (제목 경로로 적는다) */
  function getAutoOverviewUrl(titles) {
    return AUTO_OVERVIEW_PREFIX + titles.join("/");
  }

  /**
   * 자동 개론의 주소로 묶음을 찾는다.
   * @returns {{item: Object, titles: string[], dirs: string}|null} dirs 는 그 묶음 안의 문서가 쓰는 폴더 경로
   */
  function findFolderByUrl(list, url) {
    if (!url.startsWith(AUTO_OVERVIEW_PREFIX)) return null;
    const titles = url.slice(AUTO_OVERVIEW_PREFIX.length).split("/").filter(Boolean);
    let siblings = list;
    let dirs = "";
    let item = null;
    for (const title of titles) {
      item = Array.isArray(siblings) ? visibleItems(siblings).find(candidate => candidate.주제 === title && hasOwn(candidate, '목록')) : null;
      if (!item) return null;
      dirs = resolveDirs(dirs, item.디렉토리);
      siblings = item.목록;
    }
    return item ? { item: item, titles: titles, dirs: dirs } : null;
  }

  /**
   * 트리의 모든 문서를 깊이 우선(부모 → 자식) 순서로 방문한다.
   * @param {Array} list hierarchy.json 루트 배열 또는 하위 목록
   * @param {(page: {item: Object, title: string, url: string, fileName: string, parentDirs: string,
   *   ancestors: string[], siblings: Array, index: number, parentOverviewUrl: string}) => (boolean|void)} visit
   *   parentOverviewUrl 은 바로 위 묶음에 개론이 있을 때 그 주소, 없으면 빈 문자열이다.
   *   true를 반환하면 순회를 즉시 중단한다.
   * @returns {boolean} 중단되었으면 true
   */
  function forEachPage(list, visit, parentDirs = "", ancestors = [], parentOverviewUrl = "") {
    if (!Array.isArray(list)) return false;
    // 개발중 항목은 관리자가 아니면 없는 것으로 다룬다 (형제 문서 · 이전글/다음글에서도 빠진다)
    list = visibleItems(list);

    for (let index = 0; index < list.length; index++) {
      const item = list[index];
      const title = item.주제 || "";
      const dirs = resolveDirs(parentDirs, item.디렉토리);

      if (isPageItem(item)) {
        const fileName = getFileName(item);
        const stop = visit({
          item: item,
          title: title,
          url: `/${dirs}${fileName}`,
          fileName: fileName,
          parentDirs: parentDirs,
          ancestors: ancestors,
          siblings: list,
          index: index,
          parentOverviewUrl: parentOverviewUrl
        });
        if (stop === true) return true;
      }

      if (item.목록 && item.목록.length > 0) {
        const overviewUrl = isPageItem(item) ? `/${dirs}${getFileName(item)}` : "";
        if (forEachPage(item.목록, visit, dirs, ancestors.concat(title), overviewUrl)) return true;
      }
    }
    return false;
  }

  /**
   * URL 경로로 문서를 찾는다.
   * @param {Array} list
   * @param {string} urlPath 예: "/engineering/language/C/start.html" (앞 슬래시는 생략 가능)
   * @returns {Object|null} forEachPage의 page 객체
   */
  function findPage(list, urlPath) {
    const target = urlPath.startsWith('/') ? urlPath : '/' + urlPath;
    let found = null;
    forEachPage(list, page => {
      if (page.url === target) {
        found = page;
        return true;
      }
    });
    return found;
  }

  /**
   * "분류>하위분류>문서" 형태의 제목 경로를 파일 경로로 변환한다.
   * @returns {string|null} 문서면 파일 경로, 분류에서 끝나면 디렉토리 경로, 못 찾으면 null
   */
  function findPathByTitle(hierarchy, title, currentPath = "") {
    const titles = title.split('>');
    let path = currentPath;

    for (const currentTitle of titles) {
      let found = false;

      for (const item of hierarchy) {
        if (item.주제 === currentTitle.trim()) {
          path = resolveDirs(path, item.디렉토리);

          if (item.목록) {
            hierarchy = item.목록;
            found = true;
            break;
          } else {
            return path + getFileName(item);
          }
        }
      }

      if (!found) {
        return null;
      }
    }
    return path;
  }

  return {
    isPageItem: isPageItem,
    getFileName: getFileName,
    resolveDirs: resolveDirs,
    getItemUrl: getItemUrl,
    countPages: countPages,
    forEachPage: forEachPage,
    findPage: findPage,
    findPathByTitle: findPathByTitle,
    AUTO_OVERVIEW_PREFIX: AUTO_OVERVIEW_PREFIX,
    getAutoOverviewUrl: getAutoOverviewUrl,
    findFolderByUrl: findFolderByUrl,
    isDevItem: isDevItem,
    setShowDev: setShowDev,
    isShowingDev: isShowingDev,
    visibleItems: visibleItems,
    countDevPages: countDevPages,
    isDevPath: isDevPath
  };
})();
