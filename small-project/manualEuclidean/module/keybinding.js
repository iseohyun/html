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
      page_title: "유클리드 호제법",
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
      page_title: "Euclidean algorithm",
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
    const stored = localStorage.getItem("manualEuclidean_keybindings");
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
    localStorage.setItem("manualEuclidean_keybindings", JSON.stringify(currentBindings));
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
    return false;
  }

  // Initialize elements & bindings
  function initKeybindings() {
    loadBindings();
    
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

    // Reset all to defaults button
    if (resetAllBtn) {
      resetAllBtn.onclick = () => {
        currentBindings = { ...DEFAULT_BINDINGS };
        saveBindings();
        bindButtons.forEach(btn => {
          const bindingName = btn.dataset.binding;
          btn.textContent = formatKeyName(currentBindings[bindingName], lang);
        });
        if (listeningButton) {
          listeningButton.classList.remove("listening");
          listeningButton = null;
        }
      };
    }

    // Modal settings toggle
    const toggleBtn = document.getElementById("settings-toggle-btn");
    const modal = document.getElementById("settings-modal");
    const closeBtn = document.getElementById("modal-close-btn");

    if (toggleBtn && modal) {
      toggleBtn.onclick = () => {
        modal.classList.remove("hidden");
      };
    }

    if (closeBtn && modal) {
      closeBtn.onclick = () => {
        modal.classList.add("hidden");
        if (listeningButton) {
          listeningButton.classList.remove("listening");
          const oldBinding = listeningButton.dataset.binding;
          listeningButton.textContent = formatKeyName(currentBindings[oldBinding], lang);
          listeningButton = null;
        }
      };
    }

    // Document-level key handler
    document.addEventListener("keydown", (e) => {
      const lang = (window.language !== undefined) ? window.language : 1;

      // 1. If currently listening for new bind
      if (listeningButton) {
        e.preventDefault();
        e.stopPropagation();
        
        const pressed = getPressedKeyString(e);
        if (!pressed) return; // ignore modifier-only key events

        const action = listeningButton.dataset.binding;
        
        if (pressed === "Escape" || pressed === "Esc") {
          currentBindings[action] = "";
        } else {
          currentBindings[action] = pressed;
        }
        
        saveBindings();
        listeningButton.textContent = formatKeyName(currentBindings[action], lang);
        listeningButton.classList.remove("listening");
        listeningButton = null;
        return;
      }

      // 2. Ignore hotkeys when in a challenge
      if (isChallengeActive()) {
        return;
      }

      // 3. Ignore hotkeys when user is writing in settings modals or input fields
      if (document.activeElement && 
          (document.activeElement.tagName === "INPUT" || 
           document.activeElement.tagName === "TEXTAREA" ||
           document.activeElement.isContentEditable)) {
        // Allow escape key to blur input
        if (e.key === "Escape" && document.activeElement.classList.contains("init-input-cell")) {
          document.activeElement.blur();
        }
        return;
      }

      // 4. Map pressed key combination
      const pressedStr = getPressedKeyString(e);
      if (!pressedStr) return;

      // 5. Check match with bindings
      if (pressedStr === currentBindings.next_primary || pressedStr === currentBindings.next_secondary) {
        e.preventDefault();
        if (typeof nextStep === "function") nextStep();
      } 
      else if (pressedStr === currentBindings.prev_primary || pressedStr === currentBindings.prev_secondary) {
        e.preventDefault();
        if (typeof prevStep === "function") prevStep();
      } 
      else if (pressedStr === currentBindings.skip_primary || pressedStr === currentBindings.skip_secondary) {
        e.preventDefault();
        if (typeof nextStep === "function") nextStep();
      } 
      else if (pressedStr === currentBindings.reset_primary || pressedStr === currentBindings.reset_secondary) {
        e.preventDefault();
        if (typeof resetToStart === "function") resetToStart();
      }
    });
  }

  // Hook into lifecycle
  window.initKeybindings = initKeybindings;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initKeybindings);
  } else {
    initKeybindings();
  }
})();
