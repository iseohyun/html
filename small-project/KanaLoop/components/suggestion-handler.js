import { getUserSuggestion, submitSuggestion } from './db-handler.js';

/**
 * 도움말 모달(help.html) 내의 건의사항 데이터 조회 및 3단계 버튼 이벤트 핸들링 바인딩
 */
export async function bindSuggestionEvents(overlay) {
  // 모달 콘텐츠가 DOM에 완전히 주입될 때까지 대기
  await new Promise((resolve) => {
    if (document.getElementById('submit-suggestion-btn')) return resolve();
    const observer = new MutationObserver((mutations, obs) => {
      if (document.getElementById('submit-suggestion-btn')) {
        obs.disconnect();
        resolve();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });

  try {
    const data = await getUserSuggestion();
    const suggestionTextarea = document.getElementById('user-suggestion-textarea');
    const submitBtn = document.getElementById('submit-suggestion-btn');
    const replyTextarea = document.getElementById('dev-reply-textarea');

    if (data) {
      if (replyTextarea) {
        replyTextarea.value = data.reply || "";
      }

      if (data.suggestion && data.suggestion.trim() !== "") {
        // 관리자가 아직 답변하지 않은 건의사항이 남아있음
        if (suggestionTextarea) suggestionTextarea.value = data.suggestion;
        if (submitBtn) submitBtn.innerText = "수정";
      } else {
        // 답변이 완료되었거나 최초 상태
        if (submitBtn) submitBtn.innerText = "보내기";
      }
    } else {
      if (submitBtn) submitBtn.innerText = "보내기";
    }

    if (submitBtn && suggestionTextarea) {
      submitBtn.addEventListener('click', async () => {
        const text = suggestionTextarea.value.trim();
        if (!text) {
          alert("건의사항을 입력해 주세요.");
          return;
        }

        if (submitBtn.innerText === "보내기") {
          submitBtn.disabled = true;
          await submitSuggestion(text);
          submitBtn.innerText = "수정";
          submitBtn.disabled = false;
          alert("건의사항이 등록되었습니다.");
        } else if (submitBtn.innerText === "수정") {
          submitBtn.innerText = "수정사항으로 건의하시겠습니까?";
        } else if (submitBtn.innerText === "수정사항으로 건의하시겠습니까?") {
          submitBtn.disabled = true;
          await submitSuggestion(text);
          submitBtn.innerText = "수정";
          submitBtn.disabled = false;
          alert("건의사항이 수정되었습니다.");
        }
      });
    }
  } catch (err) {
    console.error("[Help] 건의사항 데이터 연동 실패:", err);
  }
}
