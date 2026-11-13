/**
 * @file modules/core/toc.js
 * @module SiteModules.TOC
 * @description 문서의 h1/h2를 수집해 사이드바 목차를 만들고, 스크롤 위치에 따라 현재 항목을 강조한다.
 */

window.SiteModules = window.SiteModules || {};

window.SiteModules.TOC = (function() {
  let headers = [];
  let target;
  let scrollListenerAttached = false;
  const CURRENT_HEADING_OFFSET_PX = 20;

  function init() {
    headers = document.querySelectorAll("h1, h2");

    if (!scrollListenerAttached) {
      // 스크롤은 페이지가 아니라 본문 영역(#app-main)에서 일어난다
      getScroller().addEventListener("scroll", handleScroll, { passive: true });
      scrollListenerAttached = true;
    }

    if (!window.hashChangeBound) {
      window.addEventListener("hashchange", (event) => {
        event.preventDefault();
        const hash = window.location.hash;
        if (hash) {
          scrollToHash();
        }
      });
      window.hashChangeBound = true;
    }
  }

  function addContentsList(object) {
    let i = 0;
    let j = 0;
    const state = window.SiteModules.state;
    const currentPath = (state && state.currentPath) ? state.currentPath : "/index.html";

    headers.forEach(function (header) {
      let listItem = document.createElement("li");
      let anchor = document.createElement("a");
      
      if (header.tagName === "H1") {
        i++;
        j = 0;
        anchor.textContent = i + ". " + header.textContent;
      } else {
        j++;
        const subItem = document.createElement("span");
        subItem.style.fontSize = "0.85em";
        subItem.textContent = "   " + i + "-" + j + ". " + header.textContent;
        anchor.appendChild(subItem);
      }
      
      header.setAttribute("id", header.textContent);
      // SPA 라우팅 경로를 접두어로 추가하여 주소창에 현재 페이지 경로를 유지하고 sub-anchor로 스크롤하도록 함
      anchor.href = "#" + currentPath + "#" + header.textContent;

      anchor.addEventListener("click", function (ev) {
        ev.stopPropagation();
        if (window.innerWidth <= window.SiteModules.Config.layout.tocAutoCloseBreakpoint) {
          const container = document.getElementById("sidebar-container");
          if (container) container.classList.remove("active");
        }
      });

      listItem.appendChild(anchor);
      object.appendChild(listItem);
    });
  }

  function getScroller() {
    return window.SiteModules.Navigation.getScroller();
  }

  // 목차 링크가 이 제목을 가리키는지: 링크 주소는 "#<문서 경로>#<제목>" 꼴이다
  function isAnchorFor(anchor, header) {
    const href = anchor.getAttribute("href") || "";
    return href.endsWith("#" + header.textContent);
  }

  function handleScroll() {
    // 본문 영역의 위쪽 끝에서 20px 안으로 올라온 마지막 제목이 지금 보고 있는 항목이다
    const scrollerTop = getScroller().getBoundingClientRect().top;

    // 목차에 현재 보고있는 내용에 밑줄로 표기하기
    headers.forEach(function (header) {
      if (header.getBoundingClientRect().top - scrollerTop <= CURRENT_HEADING_OFFSET_PX) {
        target = header;
      }

      // querySelector 대신 안전하게 DOM 순회하며 active-toc 클래스 제거
      const tocTree = document.getElementById("toc-tree");
      if (tocTree) {
        const anchors = tocTree.querySelectorAll("a");
        anchors.forEach(anchor => {
          if (isAnchorFor(anchor, header)) {
            anchor.classList.remove("active-toc");
          }
        });
      }
    });

    if (target && target.textContent) {
      const tocTree = document.getElementById("toc-tree");
      if (tocTree) {
        const anchors = tocTree.querySelectorAll("a");
        anchors.forEach(anchor => {
          if (isAnchorFor(anchor, target)) {
            anchor.classList.add("active-toc");
          }
        });
      }
    }
  }

  function scrollToHash() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#')) {
      const id = decodeURIComponent(hash.substring(1));
      const targetElement = document.getElementById(id);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth" });
      }
    }
  }

  return {
    init: init,
    addContentsList: addContentsList,
    scrollToHash: scrollToHash
  };
})();
