// modules/core/document.js

window.SiteModules = window.SiteModules || {};

window.SiteModules.Document = (function() {
  
  function init() {
    initTitle();
    initLastModified();
    initReferences();
  }

  function initTitle() {
    const state = window.SiteModules.state;
    const article = document.querySelector('body > article');

    if (article) {
      let existingTitleContainer = document.getElementById('title-container');
      if (existingTitleContainer) {
        existingTitleContainer.remove();
      }
      let existingTitle = document.getElementById('title');
      if (existingTitle) {
        existingTitle.remove();
      }

      // 홈인 경우 타이틀 생략 (site-intro 배너가 타이틀 역할을 수행함)
      if (state.currentPath.includes("index.html") || state.currentPath === "/") {
        return;
      }

      const container = document.createElement('div');
      container.id = 'title-container';

      const titleText = document.createElement('span');
      titleText.className = 'doc-title-text';
      const docTitle = (state.cur_doc && state.cur_doc.title) || document.title || '';
      titleText.innerText = docTitle;

      const pathText = document.createElement('span');
      pathText.className = 'doc-path-text';
      pathText.innerText = state.category ? state.category.replace(/^ >> /, "").split(" >> ").join(" > ") : "";

      container.appendChild(titleText);
      container.appendChild(pathText);

      // article의 첫 번째 자식으로 삽입
      article.insertBefore(container, article.firstChild);
    } else {
      console.error('body > article 요소를 찾을 수 없습니다.');
    }
  }

  function initLastModified() {
    const article = document.querySelector("article");
    if (!article) return;

    let lastModifiedEl = document.getElementById("last-modified");
    if (lastModifiedEl) {
      lastModifiedEl.remove();
    }

    lastModifiedEl = document.createElement("p");
    lastModifiedEl.setAttribute("id", "last-modified");
    
    const state = window.SiteModules.state;
    const path = state.currentPath || "";
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const isRootFile = !cleanPath || !cleanPath.includes('/') || path === "/";

    if (isRootFile) {
      lastModifiedEl.innerHTML = "<a href=\"#/info.html#저작권\">@iseohyun.com CC-BY-SA</a>";
    } else {
      let dateText = "";
      if (state.lastModifiedDate) {
        const d = state.lastModifiedDate;
        const pad = (num) => String(num).padStart(2, '0');
        dateText = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      } else {
        dateText = document.lastModified;
      }
      lastModifiedEl.innerHTML = "최근 수정: " + dateText + "<br><a href=\"#/info.html#저작권\">@iseohyun.com CC-BY-SA</a>";
    }
    
    article.appendChild(lastModifiedEl);
  }

  function initReferences() {
    const article = document.querySelector("article");
    if (!article) return;

    const existingRefHeader = document.getElementById("references");
    if (existingRefHeader) {
      let sibling = existingRefHeader;
      const toRemove = [];
      while (sibling) {
        // last-modified는 살려두기 위해 체크
        if (sibling.id === "last-modified") {
          sibling = sibling.nextElementSibling;
          continue;
        }
        toRemove.push(sibling);
        sibling = sibling.nextElementSibling;
      }
      toRemove.forEach(el => el.remove());
    }

    const existingImgHeader = document.getElementById("references-image");
    if (existingImgHeader) {
      let sibling = existingImgHeader;
      const toRemove = [];
      while (sibling) {
        if (sibling.id === "last-modified") {
          sibling = sibling.nextElementSibling;
          continue;
        }
        toRemove.push(sibling);
        sibling = sibling.nextElementSibling;
      }
      toRemove.forEach(el => el.remove());
    }

    const details = document.querySelectorAll("a.detail");
    const detailsInfos = document.querySelectorAll("a.detail+*");
    
    if (details.length < 1) {
      addReferenceImage("no-reference");
      return;
    }

    const refheader = document.createElement("h1");
    refheader.innerText = "References";
    refheader.id = "references";
    
    // last-modified 이전에 레퍼런스가 위치하도록 삽입
    const lastMod = document.getElementById("last-modified");
    if (lastMod) {
      article.insertBefore(refheader, lastMod);
    } else {
      article.appendChild(refheader);
    }

    for (let i = 0; i < details.length; i++) {
      details[i].id = `detail-${i}`;
      details[i].innerHTML = `[${i + 1}]`;

      const description = detailsInfos[i].querySelector('.description');
      if (description) {
        description.style.left = (- details[i].offsetLeft + article.offsetLeft + 50) + "px";
        description.style.width = ((article.offsetWidth > 860) ? 760 : article.offsetWidth * 0.9) + "px";
      }

      const refSpan = document.createElement('p');
      refSpan.style.textAlign = 'left';
      refSpan.style.textIndent = '-2em';
      refSpan.style.paddingLeft = '2em';
      const reference = detailsInfos[i].querySelector('.reference');

      refSpan.innerHTML = `[ <a href="#detail-${i}">${i + 1}</a> ] ${reference.innerHTML}`;
      if (lastMod) {
        article.insertBefore(refSpan, lastMod);
      } else {
        article.appendChild(refSpan);
      }
    }

    addReferenceImage("");
  }

  function addReferenceImage(args) {
    const article = document.querySelector("article");
    if (!article) return;

    const imgBoxs = document.querySelectorAll(".img-box");
    if (imgBoxs.length < 1) {
      return;
    }

    let refheader;
    if (args === "no-reference") {
      refheader = document.createElement("h1");
    } else {
      refheader = document.createElement("h2");
    }
    refheader.innerText = "그림 출처";
    refheader.id = "references-image";

    const lastMod = document.getElementById("last-modified");
    if (lastMod) {
      article.insertBefore(refheader, lastMod);
    } else {
      article.appendChild(refheader);
    }

    for (let i = 0; i < imgBoxs.length; i++) {
      const caption = imgBoxs[i].querySelector('.caption');
      imgBoxs[i].id = `ImageBox-${i}`;
      if (caption) {
        const imgInfoLine = document.createElement('p');
        imgInfoLine.style.textAlign = 'left';
        imgInfoLine.style.textIndent = '-2em';
        imgInfoLine.style.paddingLeft = '2em';

        const description = imgBoxs[i].querySelector('.description');
        imgInfoLine.innerHTML = `[<a href="#ImageBox-${i}"> ${i + 1} </a>] ${caption.innerHTML}: ${description.innerHTML}<br>`;
        if (lastMod) {
          article.insertBefore(imgInfoLine, lastMod);
        } else {
          article.appendChild(imgInfoLine);
        }
      }
    }
  }

  return {
    init: init,
    initTitle: initTitle
  };
})();
