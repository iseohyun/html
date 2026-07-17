(function() {
  // Default configurations
  const DEFAULT_BINDINGS = {
    next_primary: "Enter",
    next_secondary: "ArrowRight",
    prev_primary: "Shift+Enter",
    prev_secondary: "ArrowLeft",
    skip_primary: "Space",
    skip_secondary: "",
    reset_primary: "Escape",
    reset_secondary: ""
  };

  let currentBindings = { ...DEFAULT_BINDINGS };
  let listeningButton = null;

  // Localized UI Text
  const UI_TEXT = {
    1: { // Korean
      page_title: "제곱근 구하기",
      settings_title: "단축키 설정 (Key Bindings)",
      th_function: "기능",
      th_primary: "단축키",
      th_secondary: "보조단축키",
      label_next: "다음 단계 (Next)",
      label_prev: "이전 단계 (Prev)",
      label_skip: "스킵 (Skip/Next)",
      label_reset: "초기화 (Reset)",
      reset_all: "기본값으로 초기화",
      listening: "키 입력 대기 중...",
      none: "없음"
    },
    0: { // English
      page_title: "Finding Square Roots",
      settings_title: "Key Bindings Settings",
      th_function: "Function",
      th_primary: "Primary Shortcut",
      th_secondary: "Secondary Shortcut",
      label_next: "Next Step",
      label_prev: "Prev Step",
      label_skip: "Skip (or Next)",
      label_reset: "Reset (Esc)",
      reset_all: "Reset to Defaults",
      listening: "Press any key...",
      none: "None"
    }
  };

  // Load from local storage
  function loadBindings() {
    const stored = localStorage.getItem("manualSqrt_keybindings");
    if (stored) {
      try {
        currentBindings = JSON.parse(stored);
      } catch (e) {
        currentBindings = { ...DEFAULT_BINDINGS };
      }
    }
  }

  // Save to local storage
  function saveBindings() {
    localStorage.setItem("manualSqrt_keybindings", JSON.stringify(currentBindings));
  }

  // Format key labels for UI display
  function formatKeyName(key, lang) {
    if (!key) return UI_TEXT[lang].none;
    return key
      .replace("ArrowRight", "→")
      .replace("ArrowLeft", "←")
      .replace("ArrowUp", "↑")
      .replace("ArrowDown", "↓")
      .replace("Space", "Space")
      .replace("Escape", "Esc");
  }

  // Form key string combination
  function getPressedKeyString(e) {
    if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) {
      return null;
    }
    
    let parts = [];
    if (e.shiftKey) parts.push("Shift");
    if (e.ctrlKey) parts.push("Ctrl");
    if (e.altKey) parts.push("Alt");

    let keyName = e.key;
    if (keyName === " ") {
      keyName = "Space";
    }
    
    parts.push(keyName);
    return parts.join("+");
  }

  // Is a challenge currently active?
  function isChallengeActive() {
    const challengePanel = document.getElementById("tooltip-challenge");
    return challengePanel && !challengePanel.classList.contains("hidden");
  }

  // Initialize elements & bindings
  function initKeybindings() {
    loadBindings();
    
    // Safety check for main.js variables
    const lang = (window.language !== undefined) ? window.language : 1;

    // Apply localization texts
    const titleHeader = document.getElementById("page-title");
    if (titleHeader) titleHeader.textContent = UI_TEXT[lang].page_title;

    const settingsTitle = document.getElementById("settings-title");
    if (settingsTitle) settingsTitle.textContent = UI_TEXT[lang].settings_title;

    // Table Headers
    const thFunc = document.getElementById("th-function");
    if (thFunc) thFunc.textContent = UI_TEXT[lang].th_function;
    const thPrimary = document.getElementById("th-primary");
    if (thPrimary) thPrimary.textContent = UI_TEXT[lang].th_primary;
    const thSecondary = document.getElementById("th-secondary");
    if (thSecondary) thSecondary.textContent = UI_TEXT[lang].th_secondary;

    // Row labels
    const labels = ["next", "prev", "skip", "reset"];
    labels.forEach(id => {
      const el = document.getElementById(`label-${id}`);
      if (el) el.textContent = UI_TEXT[lang][`label_${id}`];
    });

    const resetAllBtn = document.getElementById("settings-reset-all-btn");
    if (resetAllBtn) resetAllBtn.textContent = UI_TEXT[lang].reset_all;

    // Load initial key values into buttons
    const bindButtons = document.querySelectorAll(".key-bind-btn");
    bindButtons.forEach(btn => {
      const bindingName = btn.dataset.binding;
      btn.textContent = formatKeyName(currentBindings[bindingName], lang);
      
      btn.addEventListener("click", () => {
        // Toggle listening mode
        if (listeningButton) {
          listeningButton.classList.remove("listening");
          const oldBinding = listeningButton.dataset.binding;
          listeningButton.textContent = formatKeyName(currentBindings[oldBinding], lang);
        }
        
        listeningButton = btn;
        btn.classList.add("listening");
        btn.textContent = UI_TEXT[lang].listening;
      });
    });

    // Reset all bindings
    if (resetAllBtn) {
      resetAllBtn.addEventListener("click", () => {
        currentBindings = { ...DEFAULT_BINDINGS };
        saveBindings();
        bindButtons.forEach(btn => {
          const bindingName = btn.dataset.binding;
          btn.textContent = formatKeyName(currentBindings[bindingName], lang);
        });
      });
    }

    // Toggle settings modal
    const toggleBtn = document.getElementById("settings-toggle-btn");
    const settingsModal = document.getElementById("settings-modal");
    const closeBtn = document.getElementById("modal-close-btn");

    if (toggleBtn && settingsModal) {
      toggleBtn.addEventListener("click", () => {
        settingsModal.classList.remove("hidden");
        const tooltip = document.getElementById("guide-tooltip");
        if (tooltip) {
          tooltip.classList.add("hidden");
        }
      });
    }

    if (closeBtn && settingsModal) {
      closeBtn.addEventListener("click", () => {
        settingsModal.classList.add("hidden");
        if (window.highlightActiveStep) {
          window.highlightActiveStep();
        }
      });
    }

    // Close when clicking outside content (on the overlay)
    if (settingsModal) {
      settingsModal.addEventListener("click", (e) => {
        if (e.target === settingsModal) {
          settingsModal.classList.add("hidden");
          if (window.highlightActiveStep) {
            window.highlightActiveStep();
          }
        }
      });
    }

    // Global Key Listener
    window.addEventListener("keydown", (e) => {
      const langActive = (window.language !== undefined) ? window.language : 1;

      // 1. Listening mode key capture
      if (listeningButton) {
        e.preventDefault();
        e.stopPropagation();

        const pressed = getPressedKeyString(e);
        if (pressed) {
          const bindingName = listeningButton.dataset.binding;
          currentBindings[bindingName] = pressed;
          saveBindings();
          
          listeningButton.textContent = formatKeyName(pressed, langActive);
          listeningButton.classList.remove("listening");
          listeningButton = null;
        }
        return;
      }

      // 2. Global Shortcuts Dispatcher
      const pressed = getPressedKeyString(e);
      if (!pressed) return;

      // Ignore actions if typing in initial inputs
      if (document.activeElement && document.activeElement.classList.contains("init-input-cell")) {
        // If Escape is pressed, still reset even if focused
        if (pressed === currentBindings.reset_primary || (currentBindings.reset_secondary && pressed === currentBindings.reset_secondary)) {
          e.preventDefault();
          if (window.resetToStart) window.resetToStart();
        }
        return;
      }

      // Esc (Reset) Action
      if (pressed === currentBindings.reset_primary || (currentBindings.reset_secondary && pressed === currentBindings.reset_secondary)) {
        e.preventDefault();
        if (window.resetToStart) window.resetToStart();
        return;
      }

      const challengeActive = isChallengeActive();

      // Space (Skip / Next) Action
      if (pressed === currentBindings.skip_primary || (currentBindings.skip_secondary && pressed === currentBindings.skip_secondary)) {
        e.preventDefault();
        if (document.activeElement && document.activeElement.tagName === "BUTTON") {
          return;
        }
        if (challengeActive) {
          if (window.skipPractice) window.skipPractice();
        } else {
          const nextBtn = document.getElementById("tooltip-next-btn");
          if (nextBtn && !nextBtn.disabled) {
            if (window.nextStep) window.nextStep();
          }
        }
        return;
      }

      // Prev Action
      if (pressed === currentBindings.prev_primary || pressed === currentBindings.prev_secondary) {
        e.preventDefault();
        if (document.activeElement && document.activeElement.tagName === "BUTTON") {
          return;
        }
        const prevBtn = document.getElementById("tooltip-prev-btn");
        if (prevBtn && !prevBtn.disabled) {
          if (window.prevStep) window.prevStep();
        }
        return;
      }

      // Next Action
      if (pressed === currentBindings.next_primary || pressed === currentBindings.next_secondary) {
        // If typing in challenge input, let the local Enter handler submit it
        if (document.activeElement && document.activeElement.id === "challenge-input") {
          return;
        }
        // If active element is a button, let the browser click event handle it to prevent double execution
        if (document.activeElement && document.activeElement.tagName === "BUTTON") {
          return;
        }

        e.preventDefault();
        if (challengeActive) {
          // Focus the input to help the user type their answer
          const challengeInput = document.getElementById("challenge-input");
          if (challengeInput) challengeInput.focus();
        } else {
          const nextBtn = document.getElementById("tooltip-next-btn");
          if (nextBtn && !nextBtn.disabled) {
            if (window.nextStep) window.nextStep();
          }
        }
        return;
      }
    }, true);
  }

  // Initialize on DOM load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initKeybindings);
  } else {
    initKeybindings();
  }
})();
