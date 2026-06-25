// modules/ui/clipboard.js

window.SiteModules = window.SiteModules || {};

window.SiteModules.Clipboard = (function() {
  let eventListenersAttached = false;

  function init() {
    // COPY 버튼 삽입 실행
    addCopyButtons(document);

    if (eventListenersAttached) return;

    // 1. q 태그 클릭 시 자동 복사 (이벤트 위임)
    document.body.addEventListener("click", function(event) {
      const qTag = event.target.closest("q");
      if (qTag) {
        const textToCopy = qTag.textContent || qTag.innerText;
        navigator.clipboard.writeText(textToCopy).then(function () {
          showTemporaryMessage("클립보드에 복사되었습니다.");
        }).catch(function (err) {
          console.error('클립보드 복사 실패: ', err);
        });
      }
    });

    // 2. copy-button 클릭 시 코드 복사 (이벤트 위임)
    document.body.addEventListener("click", function(event) {
      const copyBtn = event.target.closest(".copy-button");
      if (copyBtn) {
        const parent = copyBtn.parentElement;
        
        // COPY 버튼의 글자를 제외하고 텍스트만 복사하기 위해 임시 복사 노드 사용
        const clone = parent.cloneNode(true);
        const btnInClone = clone.querySelector(".copy-button");
        if (btnInClone) {
          btnInClone.remove();
        }

        let textToCopy = "";
        const lnCodes = clone.querySelectorAll(".hljs-ln-code");
        if (lnCodes.length > 0) {
          const lines = Array.from(lnCodes).map(el => el.textContent || el.innerText);
          textToCopy = lines.join("\n");
        } else {
          const codeEl = clone.querySelector("code");
          if (codeEl) {
            textToCopy = codeEl.textContent || codeEl.innerText;
          } else {
            textToCopy = clone.textContent || clone.innerText;
          }
        }

        navigator.clipboard.writeText(textToCopy).then(function () {
          showTemporaryMessage("클립보드에 복사되었습니다.");
          const board = document.getElementById("board");
          if (board) {
            board.style.visibility = "hidden";
          }
        }).catch(function (err) {
          console.error('클립보드 복사 실패: ', err);
        });
      }
    });

    eventListenersAttached = true;
  }

  function addCopyButtons(container) {
    const parentNode = container || document;
    const preTags = parentNode.querySelectorAll("pre, blockquote");

    preTags.forEach(function (element) {
      // 이미 COPY 버튼이 삽입되어 있다면 중복 방지
      if (element.querySelector(".copy-button")) {
        return;
      }

      // pre 내부의 blockquote 또는 blockquote 내부의 pre는 버튼을 달지 않음
      if (element.tagName.toLowerCase() === 'pre' && element.querySelector('blockquote')) {
        return;
      }
      if (element.tagName.toLowerCase() === 'blockquote' && element.querySelector('pre')) {
        // 단, 부모 blockquote에 이미 pre가 있어 pre에 버튼이 달리거나 할 경우 방지
        return;
      }

      let copyBtn = document.createElement("div");
      copyBtn.setAttribute("class", "copy-button");
      copyBtn.innerHTML = "Copy to Clipboard";

      element.appendChild(copyBtn);
    });
  }

  function showTemporaryMessage(message, duration = 1000) {
    let msgEl = document.getElementById("clipboard-toast");
    if (msgEl) msgEl.remove();

    msgEl = document.createElement("div");
    msgEl.id = "clipboard-toast";
    msgEl.textContent = message;
    msgEl.style.cssText = `
      position: fixed;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(33, 37, 41, 0.9);
      color: #fff;
      padding: 10px 24px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      font-family: inherit;
    `;

    document.body.appendChild(msgEl);

    // Force reflow
    msgEl.offsetHeight;
    msgEl.style.opacity = "1";

    setTimeout(() => {
      msgEl.style.opacity = "0";
      setTimeout(() => {
        msgEl.remove();
      }, 300);
    }, duration);
  }

  return {
    init: init,
    addCopyButtons: addCopyButtons,
    showTemporaryMessage: showTemporaryMessage
  };
})();
