// modules/ui/code-loader.js

window.SiteModules = window.SiteModules || {};

window.SiteModules.CodeLoader = (function() {
  
  function init(container) {
    const parentNode = container || document;
    const codes = Array.from(parentNode.getElementsByTagName("code"));
    const filesToLoad = codes.filter(code => code.getAttribute('href') !== null);
    
    let fileCount = filesToLoad.length;
    let loadedCount = 0;

    if (fileCount === 0) {
      runHighlight();
      return;
    }

    filesToLoad.forEach((code) => {
      const filename = code.getAttribute('href');
      fetch(filename)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to load ${filename}`);
          }
          return response.text();
        })
        .then(text => {
          code.textContent = text;
        })
        .catch(err => {
          console.error(err);
          code.textContent = `Error loading file: ${filename}`;
        })
        .finally(() => {
          loadedCount++;
          if (loadedCount === fileCount) {
            runHighlight();
          }
        });
    });
  }

  function runHighlight() {
    if (typeof hljs !== 'undefined' && hljs.highlightAll) {
      hljs.highlightAll();
      if (hljs.initLineNumbersOnLoad) {
        // initLineNumbersOnLoad는 최초 1회만 동작하거나, 재생성이 필요할 수 있습니다.
        try {
          hljs.initLineNumbersOnLoad();
        } catch (e) {
          // 이미 초기화된 경우 예외 발생 방지
        }
      }
    }
  }

  function toggleContent(header) {
    const container = header.parentNode;
    const content = container.querySelector(".content");
    if (content) {
      if (content.style.display === "none" || content.style.display === "") {
        content.style.display = "block"; // 내용을 펼침
      } else {
        content.style.display = "none"; // 내용을 접음
      }
    }
  }

  // 하위 호환성을 위해 window.toggleContent 등록
  window.toggleContent = toggleContent;

  return {
    init: init,
    runHighlight: runHighlight,
    toggleContent: toggleContent
  };
})();
