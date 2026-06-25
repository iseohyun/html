// modules/ui/code-loader.js

window.SiteModules = window.SiteModules || {};

window.SiteModules.CodeLoader = (function() {
  
  function init(container) {
    const parentNode = container || document;
    
    // Automatically wrap pre elements that do not contain code elements (excluding shells)
    const pres = Array.from(parentNode.getElementsByTagName("pre"));
    pres.forEach(pre => {
      if (!pre.querySelector("code") && !pre.closest(".shell")) {
        const codeElement = document.createElement("code");
        if (pre.className) {
          codeElement.className = pre.className;
        }
        while (pre.firstChild) {
          codeElement.appendChild(pre.firstChild);
        }
        pre.appendChild(codeElement);
      }
    });

    const codes = Array.from(parentNode.getElementsByTagName("code"));
    const filesToLoad = codes.filter(code => code.getAttribute('href') !== null);
    
    let fileCount = filesToLoad.length;
    let loadedCount = 0;

    if (fileCount === 0) {
      runHighlight(parentNode);
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
            runHighlight(parentNode);
          }
        });
    });
  }

  function runHighlight(parentNode) {
    if (typeof hljs !== 'undefined') {
      const codes = parentNode.querySelectorAll('pre code');
      codes.forEach(code => {
        if (code.closest('.shell')) return;

        // Apply syntax highlighting
        if (typeof hljs.highlightElement === 'function') {
          hljs.highlightElement(code);
        } else if (typeof hljs.highlightBlock === 'function') {
          hljs.highlightBlock(code);
        }

        // Apply line numbers (including single line)
        if (typeof hljs.lineNumbersBlock === 'function') {
          if (!code.querySelector('.hljs-ln')) {
            try {
              hljs.lineNumbersBlock(code, { singleLine: true });
            } catch (e) {
              // Ignore
            }
          }
        }
      });
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
