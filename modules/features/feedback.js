/**
 * @file modules/features/feedback.js
 * @module SiteModules.Feedback
 * @description 문서 하단의 "질문 및 건의" 폼과 질답 이력 표시, help 페이지의 건의사항 입력 폼 바인딩.
 *   저장/조회는 SiteModules.Auth(submitSuggestion, getUserSuggestion)에 위임한다.
 * @requires SiteModules.Auth, SiteModules.FirebaseConfig
 * @exports getPageKey, renderPageFeedbackArea, bindHelpSuggestionEvents
 */

window.SiteModules = window.SiteModules || {};

window.SiteModules.Feedback = (function () {
  async function bindHelpSuggestionEvents(container) {
    const textarea = container.querySelector('#user-suggestion-textarea');
    const submitBtn = container.querySelector('#submit-suggestion-btn');
    const replyTextarea = container.querySelector('#dev-reply-textarea');

    try {
      const auth = window.SiteModules.FirebaseConfig.getAuth();
      const db = window.SiteModules.FirebaseConfig.getDb();
      if (auth && auth.currentUser && db) {
        window.SiteModules.Auth.isAdmin().then(isAdmin => {
          if (isAdmin) {
            let adminDiv = container.querySelector('#help-admin-link-area');
            if (!adminDiv) {
              adminDiv = document.createElement('div');
              adminDiv.id = 'help-admin-link-area';
              adminDiv.style.cssText = "margin-bottom: 20px; padding: 12px; background-color: #2b3a4a; border-radius: 6px; border: 1px solid #3b4a5a; text-align: center;";
              adminDiv.innerHTML = `<a href="/admin.html" style="color: #64b5f6; font-weight: bold; text-decoration: none; font-size: 14px;">⚙️ 관리자 대시보드로 이동</a>`;
              container.insertBefore(adminDiv, container.firstChild);
            }
          }
        }).catch(err => console.error("Admin check inside help failed:", err));
      }
    } catch (e) {
      console.error(e);
    }

    if (!textarea || !submitBtn) return;

    try {
      const data = await window.SiteModules.Auth.getUserSuggestion();
      if (data) {
        if (replyTextarea) {
          replyTextarea.value = data.reply || "";
        }
        if (data.suggestion && data.suggestion.trim() !== "") {
          textarea.value = data.suggestion;
          submitBtn.innerText = "수정";
        } else {
          submitBtn.innerText = "보내기";
        }
      } else {
        submitBtn.innerText = "보내기";
      }

      // 기존 이벤트 리스너 제거를 위한 클론 처리
      const newSubmitBtn = submitBtn.cloneNode(true);
      submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);

      newSubmitBtn.addEventListener('click', async () => {
        const text = textarea.value.trim();
        if (!text) {
          alert("건의사항을 입력해 주세요.");
          return;
        }

        const currentLabel = newSubmitBtn.innerText;
        if (currentLabel === "수정") {
          newSubmitBtn.innerText = "수정사항으로 건의하시겠습니까?";
          return;
        }

        const isFirstSubmit = currentLabel === "보내기";
        newSubmitBtn.disabled = true;
        try {
          await window.SiteModules.Auth.submitSuggestion(text);
          newSubmitBtn.innerText = "수정";
          alert(isFirstSubmit ? "건의사항이 등록되었습니다." : "건의사항이 수정되었습니다.");
        } catch (err) {
          console.error("[Suggestion] 전송 실패:", err);
          alert("전송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        } finally {
          newSubmitBtn.disabled = false;
        }
      });
    } catch (err) {
      console.error("건의사항 바인딩 실패:", err);
    }
  }

  function getPageKey(path) {
    if (!path) return "@home";

    // 1. 쿼리 파라미터 분리 제거
    let cleanPath = path.split('?')[0];

    // 2. 앞뒤 슬래시 정리 및 확장자 제거
    if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
    if (cleanPath.endsWith('/')) cleanPath = cleanPath.substring(0, cleanPath.length - 1);
    cleanPath = cleanPath.replace(/\.html?$/i, '');

    // 3. 파일명이 'index' 인 경우 소프로젝트 범주로 취합하기 위해 떼어냄
    const parts = cleanPath.split('/');
    if (parts.length > 0 && parts[parts.length - 1].toLowerCase() === 'index') {
      parts.pop();
    }

    if (parts.length === 0 || (parts.length === 1 && parts[0] === '')) {
      return '@home';
    }

    return '@' + parts.join('>');
  }

  function renderPageFeedbackArea(urlPath) {
    if (urlPath === "/index.html" || urlPath === "/" || !urlPath) return;

    // admin 페이지인 경우 질답 폼을 생성하지 않음
    if (urlPath.endsWith("/admin.html") || urlPath.endsWith("/admin.htm")) {
      const oldArea = document.getElementById("page-feedback-area");
      if (oldArea) oldArea.remove();
      return;
    }

    if (urlPath === "/help.html") {
      // 관리자가 아닐때, 하단에 개별 페이지마다 동작하는 개별페이지 질의 폼이 생성되지 않도록 함
      window.SiteModules.FirebaseConfig.loadSDKs().then(() => {
        const auth = window.SiteModules.FirebaseConfig.getAuth();
        const db = window.SiteModules.FirebaseConfig.getDb();
        if (auth && auth.currentUser && db) {
          window.SiteModules.Auth.isAdmin().then(isAdmin => {
            if (isAdmin) {
              renderFeedbackAreaActual(urlPath);
            }
          }).catch(err => {
            console.error("Admin check in feedback area failed:", err);
          });
        }
      });
      return;
    }

    renderFeedbackAreaActual(urlPath);
  }

  function renderFeedbackAreaActual(urlPath) {
    const article = document.querySelector("article");
    if (!article) return;

    const oldArea = document.getElementById("page-feedback-area");
    if (oldArea) oldArea.remove();

    const feedbackArea = document.createElement("div");
    feedbackArea.id = "page-feedback-area";
    feedbackArea.style.cssText = "margin-top: 50px; border-top: 1px solid #ddd; padding-top: 20px;";

    const pageKey = getPageKey(urlPath);

    feedbackArea.innerHTML = `
      <h3 style="font-size: 16px; margin-bottom: 15px; font-weight: bold;">💬 이 문서에 대한 질문 및 건의</h3>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 12px; font-weight: bold; background-color: #e8f0fe; color: #1a73e8; padding: 4px 8px; border-radius: 4px; border: 1px solid #d2e3fc; user-select: none;">${pageKey}</span>
          <span style="font-size: 11px; color: #747775;">(이 카테고리 태그가 질문과 함께 전송됩니다)</span>
        </div>
        <div>
          <textarea id="page-suggestion-textarea" placeholder="이 문서에 대한 건의사항이나 질문을 작성해 주세요." style="width: 100%; height: 80px; padding: 10px; border-radius: 6px; border: 1px solid #ccc; font-family: inherit; font-size: 13px; resize: vertical; box-sizing: border-box;"></textarea>
        </div>
        <div style="display: flex; justify-content: flex-end;">
          <button id="page-suggestion-submit-btn" style="padding: 8px 16px; background-color: #228be6; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px; transition: background-color 0.2s ease;">보내기</button>
        </div>
        <div style="margin-top: 15px;">
          <h4 style="font-size: 13px; font-weight: bold; margin-bottom: 5px; color: #495057;">이 문서의 질답 이력</h4>
          <div id="page-feedback-history" style="width: 100%; max-height: 200px; overflow-y: auto; padding: 10px; border-radius: 6px; border: 1px solid #ccc; background-color: #f1f3f5; font-size: 13px; box-sizing: border-box; white-space: pre-wrap; line-height: 1.5em; color: #495057;">이력 정보를 불러오는 중입니다...</div>
        </div>
      </div>
    `;

    const lastMod = document.getElementById("last-modified");
    if (lastMod) {
      article.insertBefore(feedbackArea, lastMod);
    } else {
      article.appendChild(feedbackArea);
    }

    const textarea = document.getElementById("page-suggestion-textarea");
    textarea.value = "";

    bindPageFeedbackEvents(feedbackArea, pageKey);
  }

  async function bindPageFeedbackEvents(container, pageKey) {
    const textarea = container.querySelector('#page-suggestion-textarea');
    const submitBtn = container.querySelector('#page-suggestion-submit-btn');
    const historyDiv = container.querySelector('#page-feedback-history');
    if (!textarea || !submitBtn) return;

    try {
      const data = await window.SiteModules.Auth.getUserSuggestion();
      updatePageFeedbackHistoryDisplay(data, pageKey, historyDiv);

      submitBtn.addEventListener('click', async () => {
        const userText = textarea.value.trim();
        if (!userText) {
          alert("질문 내용을 입력해 주세요.");
          return;
        }

        const text = pageKey + " " + userText;
        submitBtn.disabled = true;
        try {
          await window.SiteModules.Auth.submitSuggestion(text, { append: true });
          textarea.value = "";
          alert("질문이 등록되었습니다.");

          const newData = await window.SiteModules.Auth.getUserSuggestion();
          updatePageFeedbackHistoryDisplay(newData, pageKey, historyDiv);
        } catch (err) {
          console.error("[Feedback] 전송 실패:", err);
          alert("전송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        } finally {
          submitBtn.disabled = false;
        }
      });
    } catch (err) {
      console.error("페이지 피드백 연동 실패:", err);
      if (historyDiv) {
        historyDiv.innerHTML = `<span style="color:red; font-style:italic;">이력 데이터를 가져오지 못했습니다.</span>`;
      }
    }
  }

  function updatePageFeedbackHistoryDisplay(data, pageKey, historyDiv) {
    if (!historyDiv) return;

    if (!data || !data.reply) {
      historyDiv.innerHTML = `<span style="color:#868e96; font-style:italic;">과거 답변 기록이 없습니다.</span>`;
      return;
    }

    const blocks = data.reply.split("\n\n");
    const filteredBlocks = blocks.filter(block => block.includes(pageKey));

    if (filteredBlocks.length > 0) {
      historyDiv.textContent = filteredBlocks.join("\n\n");
    } else {
      historyDiv.innerHTML = `<span style="color:#868e96; font-style:italic;">이 문서에 대해 등록된 답변이 없습니다.</span>`;
    }
  }

  return {
    getPageKey: getPageKey,
    renderPageFeedbackArea: renderPageFeedbackArea,
    bindHelpSuggestionEvents: bindHelpSuggestionEvents
  };
})();
