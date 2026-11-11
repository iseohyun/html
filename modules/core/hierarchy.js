/**
 * @file modules/core/hierarchy.js
 * @module SiteModules.Hierarchy
 * @description hierarchy.json(사이트맵 트리) 순회 공용 유틸. 항목 구조는
 *   { 주제, 디렉토리?, 파일명?, 목록? } 이며, "파일명"이 있거나 "목록"이 없는 항목이 문서(페이지)다.
 *   파일명이 생략된 문서는 index.html로 간주한다.
 * @exports isPageItem, getFileName, forEachPage, findPage, findPathByTitle
 */

window.SiteModules = window.SiteModules || {};

window.SiteModules.Hierarchy = (function () {
  const DEFAULT_FILE_NAME = "index.html";

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  // 문서(페이지)를 가리키는 항목인지 여부 (하위 목록만 가진 분류 항목은 false)
  function isPageItem(item) {
    return hasOwn(item, '파일명') || !hasOwn(item, '목록');
  }

  function getFileName(item) {
    return hasOwn(item, '파일명') ? item.파일명 : DEFAULT_FILE_NAME;
  }

  /**
   * 트리의 모든 문서를 깊이 우선(부모 → 자식) 순서로 방문한다.
   * @param {Array} list hierarchy.json 루트 배열 또는 하위 목록
   * @param {(page: {item: Object, title: string, url: string, fileName: string, parentDirs: string,
   *   ancestors: string[], siblings: Array, index: number}) => (boolean|void)} visit
   *   true를 반환하면 순회를 즉시 중단한다.
   * @returns {boolean} 중단되었으면 true
   */
  function forEachPage(list, visit, parentDirs = "", ancestors = []) {
    if (!Array.isArray(list)) return false;

    for (let index = 0; index < list.length; index++) {
      const item = list[index];
      const title = item.주제 || "";
      const dir = item.디렉토리 || "";

      if (isPageItem(item)) {
        const fileName = getFileName(item);
        const stop = visit({
          item: item,
          title: title,
          url: `/${parentDirs}${dir}${fileName}`,
          fileName: fileName,
          parentDirs: parentDirs,
          ancestors: ancestors,
          siblings: list,
          index: index
        });
        if (stop === true) return true;
      }

      if (item.목록 && item.목록.length > 0) {
        if (forEachPage(item.목록, visit, parentDirs + dir, ancestors.concat(title))) return true;
      }
    }
    return false;
  }

  /**
   * URL 경로로 문서를 찾는다.
   * @param {Array} list
   * @param {string} urlPath 예: "/coding/C/start.html" (앞 슬래시는 생략 가능)
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
          path += item.디렉토리 || "";

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
    forEachPage: forEachPage,
    findPage: findPage,
    findPathByTitle: findPathByTitle
  };
})();
