// modules/core/toc.js

window.SiteModules = window.SiteModules || {};

window.SiteModules.TOC = (function() {
  let headers = [];
  let target;
  let scrollListenerAttached = false;

  function init() {
    headers = document.querySelectorAll("h1, h2");

    if (!scrollListenerAttached) {
      window.addEventListener("scroll", handleScroll);
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
        anchor.innerHTML = "<span style='font-size:0.85em'> &nbsp; " + i + "-" + j + ". " + header.textContent + "</span>";
      }
      
      header.setAttribute("id", header.textContent);
      // SPA 라우팅 경로를 접두어로 추가하여 주소창에 현재 페이지 경로를 유지하고 sub-anchor로 스크롤하도록 함
      anchor.href = "#" + currentPath + "#" + header.textContent;

      anchor.addEventListener("click", function (ev) {
        ev.stopPropagation();
        if (window.innerWidth <= 768) {
          const container = document.getElementById("sidebar-container");
          if (container) container.classList.remove("active");
        }
      });

      listItem.appendChild(anchor);
      object.appendChild(listItem);
    });
  }

  function handleScroll() {
    let scrollPosition = window.scrollY;

    // 목차에 현재 보고있는 내용에 밑줄로 표기하기
    headers.forEach(function (header) {
      let headerPosition = header.getBoundingClientRect().top + scrollPosition;

      if (scrollPosition >= (headerPosition - 20)) {
        target = header;
      }

      // querySelector 대신 안전하게 DOM 순회하며 active-toc 클래스 제거
      const tocTree = document.getElementById("toc-tree");
      if (tocTree) {
        const anchors = tocTree.querySelectorAll("a");
        anchors.forEach(anchor => {
          if (anchor.getAttribute("href") === "#" + header.textContent) {
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
          if (anchor.getAttribute("href") === "#" + target.textContent) {
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
