// modules/ui/quiz.js

window.SiteModules = window.SiteModules || {};

window.SiteModules.Quiz = (function() {
  let eventListenersAttached = false;

  function init() {
    if (eventListenersAttached) return;

    // 이벤트 위임을 활용하여 body 전체에서 quiz 버튼 클릭 처리
    document.body.addEventListener("click", function(event) {
      // 1. button.quiz 클릭 처리
      const quizBtn = event.target.closest("button.quiz");
      if (quizBtn) {
        let show = quizBtn.getAttribute("show") || "false";
        if (show === "false") {
          quizBtn.setAttribute("show", "true");
          quizBtn.style.backgroundColor = "#fff";
        } else {
          quizBtn.setAttribute("show", "false");
          quizBtn.style.backgroundColor = "#444";
        }
      }

      // 2. button.quiz2 클릭 처리
      const quiz2Btn = event.target.closest("button.quiz2");
      if (quiz2Btn) {
        const hasAnswerClass = quiz2Btn.classList.contains("answer");

        if (hasAnswerClass) {
          quiz2Btn.style.color = "#444";
          let groupName;
          quiz2Btn.classList.forEach((className) => {
            if (className.startsWith("group")) {
              groupName = className;
            }
          });

          if (groupName) {
            const group = document.querySelectorAll(`button.${groupName}`);
            group.forEach((member) => {
              member.style.backgroundColor = "#fff";
            });
          }
        }

        let show = quiz2Btn.getAttribute("show") || "false";
        if (show === "false") {
          quiz2Btn.setAttribute("show", "true");
          quiz2Btn.style.backgroundColor = "#fff";
        } else {
          quiz2Btn.setAttribute("show", "false");
          quiz2Btn.style.backgroundColor = "#444";
        }
      }
    });

    eventListenersAttached = true;
  }

  return {
    init: init
  };
})();
