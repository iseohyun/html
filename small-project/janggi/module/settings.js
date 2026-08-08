// settings.js - 설정 UI, 슬롯 관리, 색상/크기 변경 핸들러
function adjustPieceSize(type, delta) {
  if (type === "king") {
    sizeKing = Math.round(Math.max(0.5, Math.min(2.0, sizeKing + delta)) * 100) / 100;
    localStorage.setItem("sizeKing", sizeKing);
    const span = document.getElementById("val-size-king");
    if (span) span.textContent = sizeKing.toFixed(2);
  } else if (type === "middle") {
    sizeMiddle = Math.round(Math.max(0.5, Math.min(2.0, sizeMiddle + delta)) * 100) / 100;
    localStorage.setItem("sizeMiddle", sizeMiddle);
    const span = document.getElementById("val-size-middle");
    if (span) span.textContent = sizeMiddle.toFixed(2);
  } else if (type === "small") {
    sizeSmall = Math.round(Math.max(0.5, Math.min(2.0, sizeSmall + delta)) * 100) / 100;
    localStorage.setItem("sizeSmall", sizeSmall);
    const span = document.getElementById("val-size-small");
    if (span) span.textContent = sizeSmall.toFixed(2);
  }
  
  svg.classList.add("no-transition");
  initPositions();
  svg.offsetHeight;
  svg.classList.remove("no-transition");
  saveCurrentConfigToSlot();
}

function adjustPieceFontSize(type, delta) {
  if (type === "king") {
    fontScaleKing = Math.round(Math.max(0.5, Math.min(2.0, fontScaleKing + delta)) * 100) / 100;
    localStorage.setItem("fontScaleKing", fontScaleKing);
    const span = document.getElementById("val-font-king");
    if (span) span.textContent = fontScaleKing.toFixed(2);
  } else if (type === "middle") {
    fontScaleMiddle = Math.round(Math.max(0.5, Math.min(2.0, fontScaleMiddle + delta)) * 100) / 100;
    localStorage.setItem("fontScaleMiddle", fontScaleMiddle);
    const span = document.getElementById("val-font-middle");
    if (span) span.textContent = fontScaleMiddle.toFixed(2);
  } else if (type === "small") {
    fontScaleSmall = Math.round(Math.max(0.5, Math.min(2.0, fontScaleSmall + delta)) * 100) / 100;
    localStorage.setItem("fontScaleSmall", fontScaleSmall);
    const span = document.getElementById("val-font-small");
    if (span) span.textContent = fontScaleSmall.toFixed(2);
  }
  
  updatePieceGraphics();
  saveCurrentConfigToSlot();
}

function adjustCoordsFontSize(delta) {
  coordsTextScale = Math.round(Math.max(0.1, Math.min(0.5, coordsTextScale + delta)) * 100) / 100;
  localStorage.setItem("coordsTextScale", coordsTextScale);
  const span = document.getElementById("val-coords-size");
  if (span) span.textContent = coordsTextScale.toFixed(2);
  
  drawBoard();
  saveCurrentConfigToSlot();
}

function darkenColor(hex, percent) {
  hex = hex.replace(/^\s*#|\s*$/g, '');
  if (hex.length === 3) {
    hex = hex.replace(/(.)/g, '$1$1');
  }
  let r = parseInt(hex.substr(0, 2), 16),
      g = parseInt(hex.substr(2, 2), 16),
      b = parseInt(hex.substr(4, 2), 16);
  
  let factor = 1 - (percent / 100);
  r = Math.max(0, Math.min(255, Math.round(r * factor)));
  g = Math.max(0, Math.min(255, Math.round(g * factor)));
  b = Math.max(0, Math.min(255, Math.round(b * factor)));
  
  const rHex = r.toString(16).padStart(2, '0');
  const gHex = g.toString(16).padStart(2, '0');
  const bHex = b.toString(16).padStart(2, '0');
  
  return `#${rHex}${gHex}${bHex}`;
}

function changeBoardColor(value) {
  const select = document.getElementById("board-color-select");
  const picker = document.getElementById("board-color-picker");
  const boardEl = document.getElementById("board");
  if (!boardEl) return;
  
  if (value === "custom" || value.startsWith("#")) {
    if (select) select.value = "custom";
    if (picker) {
      picker.style.display = "inline-block";
      if (value.startsWith("#")) picker.value = value;
    }
    
    let chosenColor = picker ? picker.value : "#dfb67c";
    boardColorType = chosenColor;
    localStorage.setItem("boardColorType", boardColorType);
    boardEl.setAttribute("fill", chosenColor);
    boardEl.setAttribute("filter", "");
  } else {
    if (picker) picker.style.display = "none";
    if (select) select.value = value;
    boardColorType = value;
    localStorage.setItem("boardColorType", boardColorType);
    
    if (value === "wood") {
      boardEl.setAttribute("fill", "url(#board-grad)");
      boardEl.setAttribute("filter", "url(#wood-grain)");
    } else if (value === "green") {
      boardEl.setAttribute("fill", "#2e5c3e");
      boardEl.setAttribute("filter", "");
    } else if (value === "dark") {
      boardEl.setAttribute("fill", "#2d3130");
      boardEl.setAttribute("filter", "");
    } else if (value === "navy") {
      boardEl.setAttribute("fill", "#1e293b");
      boardEl.setAttribute("filter", "");
    }
  }
}

function changeChoColor(value) {
  const select = document.getElementById("cho-color-select");
  const picker = document.getElementById("cho-color-picker");
  const piecesEl = document.querySelectorAll(".cho-piece");
  
  let chosenColor = value;
  if (value === "custom" || value.startsWith("#")) {
    if (select) select.value = "custom";
    if (picker) {
      picker.style.display = "inline-block";
      if (value.startsWith("#")) {
        picker.value = value;
        chosenColor = value;
      } else {
        chosenColor = picker.value || "#1e3a8a";
      }
    } else {
      chosenColor = value.startsWith("#") ? value : "#1e3a8a";
    }
    choColorType = chosenColor;
    localStorage.setItem("choColorType", choColorType);
    
    const p0 = darkenColor(chosenColor, 25);
    const p1 = darkenColor(chosenColor, 15);
    const p2 = chosenColor;
    
    piecesEl.forEach(p => {
      const polygons = p.querySelectorAll("polygon");
      if (polygons.length >= 3) {
        polygons[0].setAttribute("fill", p0);
        polygons[1].setAttribute("fill", p1);
        polygons[2].setAttribute("fill", p2);
      }
      const circles = p.querySelectorAll("circle");
      if (circles.length >= 3) {
        circles[0].setAttribute("fill", p0);
        circles[1].setAttribute("fill", p1);
        circles[2].setAttribute("fill", p2);
      }
    });
  } else {
    if (picker) picker.style.display = "none";
    if (select) select.value = value;
    choColorType = value;
    localStorage.setItem("choColorType", choColorType);
    
    piecesEl.forEach(p => {
      const polygons = p.querySelectorAll("polygon");
      if (polygons.length >= 3) {
        if (value === "blue") {
          polygons[0].setAttribute("fill", "#1e3a8a");
          polygons[1].setAttribute("fill", "#1e293b");
          polygons[2].setAttribute("fill", "url(#cho-face-grad)");
        } else if (value === "green") {
          polygons[0].setAttribute("fill", "#15803d");
          polygons[1].setAttribute("fill", "#14532d");
          polygons[2].setAttribute("fill", "#e8f5e9");
        } else if (value === "gold") {
          polygons[0].setAttribute("fill", "#b45309");
          polygons[1].setAttribute("fill", "#78350f");
          polygons[2].setAttribute("fill", "#fef3c7");
        }
      }
      const circles = p.querySelectorAll("circle");
      if (circles.length >= 3) {
        if (value === "blue") {
          circles[0].setAttribute("fill", "#1e3a8a");
          circles[1].setAttribute("fill", "#1e293b");
          circles[2].setAttribute("fill", "url(#cho-face-grad)");
        } else if (value === "green") {
          circles[0].setAttribute("fill", "#15803d");
          circles[1].setAttribute("fill", "#14532d");
          circles[2].setAttribute("fill", "#e8f5e9");
        } else if (value === "gold") {
          circles[0].setAttribute("fill", "#b45309");
          circles[1].setAttribute("fill", "#78350f");
          circles[2].setAttribute("fill", "#fef3c7");
        }
      }
    });
  }
}

function changeHanColor(value) {
  const select = document.getElementById("han-color-select");
  const picker = document.getElementById("han-color-picker");
  const piecesEl = document.querySelectorAll(".han-piece");
  
  let chosenColor = value;
  if (value === "custom" || value.startsWith("#")) {
    if (select) select.value = "custom";
    if (picker) {
      picker.style.display = "inline-block";
      if (value.startsWith("#")) {
        picker.value = value;
        chosenColor = value;
      } else {
        chosenColor = picker.value || "#991b1b";
      }
    } else {
      chosenColor = value.startsWith("#") ? value : "#991b1b";
    }
    hanColorType = chosenColor;
    localStorage.setItem("hanColorType", hanColorType);
    
    const p0 = darkenColor(chosenColor, 25);
    const p1 = darkenColor(chosenColor, 15);
    const p2 = chosenColor;
    
    piecesEl.forEach(p => {
      const polygons = p.querySelectorAll("polygon");
      if (polygons.length >= 3) {
        polygons[0].setAttribute("fill", p0);
        polygons[1].setAttribute("fill", p1);
        polygons[2].setAttribute("fill", p2);
      }
      const circles = p.querySelectorAll("circle");
      if (circles.length >= 3) {
        circles[0].setAttribute("fill", p0);
        circles[1].setAttribute("fill", p1);
        circles[2].setAttribute("fill", p2);
      }
    });
  } else {
    if (picker) picker.style.display = "none";
    if (select) select.value = value;
    hanColorType = value;
    localStorage.setItem("hanColorType", hanColorType);
    
    piecesEl.forEach(p => {
      const polygons = p.querySelectorAll("polygon");
      if (polygons.length >= 3) {
        if (value === "red") {
          polygons[0].setAttribute("fill", "#991b1b");
          polygons[1].setAttribute("fill", "#3f1c0d");
          polygons[2].setAttribute("fill", "url(#han-face-grad)");
        } else if (value === "purple") {
          polygons[0].setAttribute("fill", "#7e22ce");
          polygons[1].setAttribute("fill", "#4c1d95");
          polygons[2].setAttribute("fill", "#faf5ff");
        } else if (value === "slate") {
          polygons[0].setAttribute("fill", "#374151");
          polygons[1].setAttribute("fill", "#1f2937");
          polygons[2].setAttribute("fill", "#f3f4f6");
        }
      }
      const circles = p.querySelectorAll("circle");
      if (circles.length >= 3) {
        if (value === "red") {
          circles[0].setAttribute("fill", "#991b1b");
          circles[1].setAttribute("fill", "#3f1c0d");
          circles[2].setAttribute("fill", "url(#han-face-grad)");
        } else if (value === "purple") {
          circles[0].setAttribute("fill", "#7e22ce");
          circles[1].setAttribute("fill", "#4c1d95");
          circles[2].setAttribute("fill", "#faf5ff");
        } else if (value === "slate") {
          circles[0].setAttribute("fill", "#374151");
          circles[1].setAttribute("fill", "#1f2937");
          circles[2].setAttribute("fill", "#f3f4f6");
        }
      }
    });
  }
}

function changePieceShape(value) {
  if (!value || typeof value !== "string") value = "octagon";
  pieceShapeType = value;
  localStorage.setItem("pieceShapeType", pieceShapeType);
  const octs = document.querySelectorAll(".piece-svg polygon");
  const circs = document.querySelectorAll(".piece-svg circle");
  if (value === "octagon") {
    octs.forEach(el => el.style.display = "");
    circs.forEach(el => el.style.display = "none");
  } else if (value === "circle") {
    octs.forEach(el => el.style.display = "none");
    circs.forEach(el => el.style.display = "");
  }
  saveCurrentConfigToSlot();
}

function changeCandiShape(value) {
  if (!value || typeof value !== "string") value = "empty_circle";
  candiShapeType = value;
  localStorage.setItem("candiShapeType", candiShapeType);
  saveCurrentConfigToSlot();
}

function changeCandiColor(value) {
  const select = document.getElementById("candi-color-select");
  const picker = document.getElementById("candi-color-picker");
  
  if (value === "custom" || value.startsWith("#")) {
    if (select) select.value = "custom";
    if (picker) {
      picker.style.display = "inline-block";
      if (value.startsWith("#")) {
        picker.value = value;
        candiColorType = value;
      } else {
        candiColorType = picker.value || "#3b82f6";
      }
    } else {
      candiColorType = value.startsWith("#") ? value : "#3b82f6";
    }
  } else {
    if (picker) picker.style.display = "none";
    if (select) select.value = value;
    candiColorType = value;
  }
  localStorage.setItem("candiColorType", candiColorType);
  saveCurrentConfigToSlot();
}

function changeAnimDuration(val) {
  animDuration = Math.round(parseFloat(val) * 10) / 10;
  localStorage.setItem("animDuration", animDuration);
  const valSpan = document.getElementById("anim-duration-val");
  if (valSpan) {
    valSpan.textContent = animDuration.toFixed(1);
  }
  if (svg) {
    svg.style.setProperty("--anim-duration", `${animDuration}s`);
  }
  saveCurrentConfigToSlot();
}

function changeAnimHeight(val) {
  animHeight = Math.round(parseFloat(val) * 10) / 10;
  localStorage.setItem("animHeight", animHeight);
  const valSpan = document.getElementById("anim-height-val");
  if (valSpan) {
    valSpan.textContent = animHeight.toFixed(1);
  }
  saveCurrentConfigToSlot();
}

function changeSettingsBgColor(value) {
  const select = document.getElementById("settings-bg-select");
  const picker = document.getElementById("settings-bg-picker");
  
  if (value === "custom" || value.startsWith("#")) {
    if (select) select.value = "custom";
    if (picker) {
      picker.style.display = "inline-block";
      if (value.startsWith("#")) {
        picker.value = value;
        settingsBgColor = value;
      } else {
        settingsBgColor = picker.value || "#0f172a";
      }
    } else {
      settingsBgColor = value.startsWith("#") ? value : "#0f172a";
    }
  } else {
    if (picker) picker.style.display = "none";
    if (select) select.value = value;
    settingsBgColor = value;
  }
  localStorage.setItem("settingsBgColor", settingsBgColor);
  updateSettingsBoxStyle();
  updateSettingsTextColor();
  saveCurrentConfigToSlot();
}

function changeSettingsOpacity(val) {
  settingsOpacity = Math.round(parseFloat(val) * 100) / 100;
  localStorage.setItem("settingsOpacity", settingsOpacity);
  const valSpan = document.getElementById("settings-opacity-val");
  if (valSpan) {
    valSpan.textContent = settingsOpacity.toFixed(2);
  }
  updateSettingsBoxStyle();
  saveCurrentConfigToSlot();
}

function changeSettingsTextColorType(value) {
  if (!value || typeof value !== "string") value = "auto";
  settingsTextColorType = value;
  localStorage.setItem("settingsTextColorType", settingsTextColorType);
  const picker = document.getElementById("settings-text-color-picker");
  if (value === "custom") {
    if (picker) picker.style.display = "inline-block";
  } else {
    if (picker) picker.style.display = "none";
  }
  updateSettingsTextColor();
  saveCurrentConfigToSlot();
}

function changeSettingsTextColorCustom(value) {
  if (!value || typeof value !== "string") value = "#f8fafc";
  settingsTextColorCustom = value;
  localStorage.setItem("settingsTextColorCustom", settingsTextColorCustom);
  updateSettingsTextColor();
  saveCurrentConfigToSlot();
}

function changeSettingsAccentColor(value) {
  const select = document.getElementById("settings-accent-color-select");
  const picker = document.getElementById("settings-accent-color-picker");
  
  if (value === "custom" || value.startsWith("#")) {
    if (select) select.value = "custom";
    if (picker) {
      picker.style.display = "inline-block";
      if (value.startsWith("#")) {
        picker.value = value;
        settingsAccentColor = value;
      } else {
        settingsAccentColor = picker.value || "#3b82f6";
      }
    } else {
      settingsAccentColor = value.startsWith("#") ? value : "#3b82f6";
    }
  } else {
    if (picker) picker.style.display = "none";
    if (select) select.value = value;
    settingsAccentColor = value;
  }
  localStorage.setItem("settingsAccentColor", settingsAccentColor);
  updateSettingsAccentColor();
  saveCurrentConfigToSlot();
}

function updateSettingsBoxStyle() {
  const box = document.getElementById("setting-box");
  if (!box) return;
  
  let hex = settingsBgColor.replace(/^\s*#|\s*$/g, '');
  if (hex.length === 3) {
    hex = hex.replace(/(.)/g, '$1$1');
  }
  let r = parseInt(hex.substr(0, 2), 16) || 15;
  let g = parseInt(hex.substr(2, 2), 16) || 23;
  let b = parseInt(hex.substr(4, 2), 16) || 42;
  
  box.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${settingsOpacity})`;
}

function updateSettingsTextColor() {
  const box = document.getElementById("setting-box");
  if (!box) return;
  
  let color = "#f8fafc";
  
  if (settingsTextColorType === "auto") {
    let hex = settingsBgColor.replace(/^\s*#|\s*$/g, '');
    if (hex.length === 3) hex = hex.replace(/(.)/g, '$1$1');
    let r = parseInt(hex.substr(0, 2), 16) || 15;
    let g = parseInt(hex.substr(2, 2), 16) || 23;
    let b = parseInt(hex.substr(4, 2), 16) || 42;
    
    let luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    color = luminance > 0.5 ? "#0f172a" : "#f8fafc";
  } else if (settingsTextColorType === "complementary") {
    let hex = settingsBgColor.replace(/^\s*#|\s*$/g, '');
    if (hex.length === 3) hex = hex.replace(/(.)/g, '$1$1');
    let r = 255 - (parseInt(hex.substr(0, 2), 16) || 15);
    let g = 255 - (parseInt(hex.substr(2, 2), 16) || 23);
    let b = 255 - (parseInt(hex.substr(4, 2), 16) || 42);
    color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  } else if (settingsTextColorType === "custom") {
    color = settingsTextColorCustom || "#f8fafc";
  }
  
  box.style.color = color;
  
  const titles = box.querySelectorAll(".category-title, .settings-title, td, span, table");
  titles.forEach(el => {
    if (el.tagName !== "BUTTON" && el.tagName !== "SELECT" && el.tagName !== "INPUT" && !el.classList.contains("slot-btn") && el.id !== "close-btn") {
      el.style.color = color;
    }
  });
}

function updateSettingsAccentColor() {
  const box = document.getElementById("setting-box");
  if (!box) return;
  
  const sliders = box.querySelectorAll("input[type='range']");
  sliders.forEach(slider => {
    slider.style.accentColor = settingsAccentColor;
  });
  
  const activeButtons = box.querySelectorAll(".slot-btn.active, .start-settings-btn");
  activeButtons.forEach(btn => {
    btn.style.backgroundColor = settingsAccentColor;
    if (btn.classList.contains("slot-btn")) {
      btn.style.borderColor = settingsAccentColor;
    }
  });
  
  const valSpans = box.querySelectorAll("#anim-duration-val, #anim-height-val, #settings-opacity-val");
  valSpans.forEach(span => {
    span.style.color = settingsAccentColor;
  });
}

// ----------------------------------------------------
// Save/Load Slots Logic
// ----------------------------------------------------
let activeSlot = 1;

function selectSlot(num) {
  activeSlot = num;
  localStorage.setItem("janggi_active_slot", activeSlot);
  updateSlotButtonsUI();
  loadConfigFromSlot();
  applyLoadedConfig();
}

function applyLoadedConfig() {
  // 1. UI 및 외관 테마 적용
  changeBoardColor(boardColorType);
  changeChoColor(choColorType);
  changeHanColor(hanColorType);
  changePieceShape(pieceShapeType);
  changeCandiShape(candiShapeType);
  changeCandiColor(candiColorType);
  
  changeSettingsBgColor(settingsBgColor);
  changeSettingsOpacity(settingsOpacity);
  changeSettingsTextColorType(settingsTextColorType);
  changeSettingsAccentColor(settingsAccentColor);
  
  if (svg) {
    svg.style.setProperty("--anim-duration", `${animDuration}s`);
  }
  
  applyShortcutModalTheme();
  applyCommentBoxTheme();
  
  const durationInput = document.getElementById("comment-duration-input");
  if (durationInput) durationInput.value = commentDisplayDuration;
  
  // 2. 보드 격자 및 기물 배치 다시 그리기
  svg.classList.add("no-transition");
  initBoard();
  initPositions();
  svg.offsetHeight; // Force reflow
  svg.classList.remove("no-transition");
  
  // 3. 설정 창 UI 값들 최신화
  initSettingsUI();
  initScoreboardRotation();
  updateCommentBubble();
  
  // 4. AI 대국 모드 점검 및 실행
  checkAndRunAI();
}

function updateSlotButtonsUI() {
  const s1 = document.getElementById("slot-1-btn");
  const s2 = document.getElementById("slot-2-btn");
  if (!s1 || !s2) return;
  if (activeSlot === 1) {
    s1.classList.add("active");
    s2.classList.remove("active");
  } else {
    s2.classList.add("active");
    s1.classList.remove("active");
  }
  updateSettingsAccentColor();
}

function saveCurrentConfigToSlot() {
  const config = {
    showCoordinates,
    sizeKing,
    sizeMiddle,
    sizeSmall,
    fontScaleKing,
    fontScaleMiddle,
    fontScaleSmall,
    coordsTextScale,
    boardColorType,
    choColorType,
    hanColorType,
    pieceShapeType,
    candiShapeType,
    candiColorType,
    animDuration,
    animHeight,
    settingsBgColor,
    settingsOpacity,
    settingsTextColorType,
    settingsTextColorCustom,
    settingsAccentColor,
    aiMode,
    cursorLockMode,
    shortcutKeys,
    scoreAutoRotate,
    scoreRotateInterval,
    scoreShowSlide1,
    scoreShowSlide2,
    scoreShowSlide3,
    autoplaySpeed,
    autoplayUseAnim,
    shortcutModalBgColor,
    shortcutModalOpacity,
    commentBoxBgColor,
    commentBoxOpacity,
    commentDisplayDuration
  };
  localStorage.setItem("janggi_settings_slot_" + activeSlot, JSON.stringify(config));
}

function loadConfigFromSlot() {
  const saved = localStorage.getItem("janggi_settings_slot_" + activeSlot);
  if (!saved) {
    saveCurrentConfigToSlot();
    return;
  }
  try {
    const config = JSON.parse(saved);
    if (config.showCoordinates !== undefined && config.showCoordinates !== null) showCoordinates = config.showCoordinates;
    if (config.sizeKing !== undefined && config.sizeKing !== null) sizeKing = config.sizeKing;
    if (config.sizeMiddle !== undefined && config.sizeMiddle !== null) sizeMiddle = config.sizeMiddle;
    if (config.sizeSmall !== undefined && config.sizeSmall !== null) sizeSmall = config.sizeSmall;
    if (config.fontScaleKing !== undefined && config.fontScaleKing !== null) fontScaleKing = config.fontScaleKing;
    if (config.fontScaleMiddle !== undefined && config.fontScaleMiddle !== null) fontScaleMiddle = config.fontScaleMiddle;
    if (config.fontScaleSmall !== undefined && config.fontScaleSmall !== null) fontScaleSmall = config.fontScaleSmall;
    if (config.coordsTextScale !== undefined && config.coordsTextScale !== null) coordsTextScale = config.coordsTextScale;
    if (config.boardColorType) boardColorType = config.boardColorType;
    if (config.choColorType) choColorType = config.choColorType;
    if (config.hanColorType) hanColorType = config.hanColorType;
    if (config.pieceShapeType) pieceShapeType = config.pieceShapeType;
    if (config.candiShapeType) candiShapeType = config.candiShapeType;
    if (config.candiColorType) candiColorType = config.candiColorType;
    if (config.animDuration !== undefined && config.animDuration !== null) animDuration = config.animDuration;
    if (config.animHeight !== undefined && config.animHeight !== null) animHeight = config.animHeight;
    if (config.settingsBgColor) settingsBgColor = config.settingsBgColor;
    if (config.settingsOpacity !== undefined && config.settingsOpacity !== null) settingsOpacity = config.settingsOpacity;
    if (config.settingsTextColorType) settingsTextColorType = config.settingsTextColorType;
    if (config.settingsTextColorCustom) settingsTextColorCustom = config.settingsTextColorCustom;
    if (config.settingsAccentColor) settingsAccentColor = config.settingsAccentColor;
    if (config.aiMode !== undefined && config.aiMode !== null) {
      aiMode = parseInt(config.aiMode, 10);
      if (aiMode === 2) aiMode = 1;
    }
    if (config.cursorLockMode !== undefined && config.cursorLockMode !== null) cursorLockMode = (config.cursorLockMode === "true" || config.cursorLockMode === true);
    if (config.shortcutKeys) {
      shortcutKeys = migrateShortcutKeys(config.shortcutKeys);
    }
    if (config.scoreAutoRotate !== undefined && config.scoreAutoRotate !== null) scoreAutoRotate = (config.scoreAutoRotate === "true" || config.scoreAutoRotate === true);
    if (config.scoreRotateInterval !== undefined && config.scoreRotateInterval !== null) scoreRotateInterval = parseInt(config.scoreRotateInterval, 10);
    if (config.scoreShowSlide1 !== undefined && config.scoreShowSlide1 !== null) scoreShowSlide1 = (config.scoreShowSlide1 === "true" || config.scoreShowSlide1 === true);
    if (config.scoreShowSlide2 !== undefined && config.scoreShowSlide2 !== null) scoreShowSlide2 = (config.scoreShowSlide2 === "true" || config.scoreShowSlide2 === true);
    if (config.scoreShowSlide3 !== undefined && config.scoreShowSlide3 !== null) scoreShowSlide3 = (config.scoreShowSlide3 === "true" || config.scoreShowSlide3 === true);
    if (config.autoplaySpeed !== undefined && config.autoplaySpeed !== null) autoplaySpeed = parseFloat(config.autoplaySpeed);
    if (config.autoplayUseAnim !== undefined && config.autoplayUseAnim !== null) autoplayUseAnim = (config.autoplayUseAnim === "true" || config.autoplayUseAnim === true);
    if (config.shortcutModalBgColor) shortcutModalBgColor = config.shortcutModalBgColor;
    if (config.shortcutModalOpacity !== undefined && config.shortcutModalOpacity !== null) shortcutModalOpacity = parseFloat(config.shortcutModalOpacity);
    if (config.commentBoxBgColor) commentBoxBgColor = config.commentBoxBgColor;
    if (config.commentBoxOpacity !== undefined && config.commentBoxOpacity !== null) commentBoxOpacity = parseFloat(config.commentBoxOpacity);
    if (config.commentDisplayDuration !== undefined && config.commentDisplayDuration !== null) commentDisplayDuration = parseInt(config.commentDisplayDuration, 10);
    
    applyShortcutModalTheme();
    applyCommentBoxTheme();
    
    // Update comment duration input field
    const durationInput = document.getElementById("comment-duration-input");
    if (durationInput) durationInput.value = commentDisplayDuration;
    
    localStorage.setItem("showCoordinates", showCoordinates);
    localStorage.setItem("sizeKing", sizeKing);
    localStorage.setItem("sizeMiddle", sizeMiddle);
    localStorage.setItem("sizeSmall", sizeSmall);
    localStorage.setItem("fontScaleKing", fontScaleKing);
    localStorage.setItem("fontScaleMiddle", fontScaleMiddle);
    localStorage.setItem("fontScaleSmall", fontScaleSmall);
    localStorage.setItem("coordsTextScale", coordsTextScale);
    localStorage.setItem("pieceShapeType", pieceShapeType);
    localStorage.setItem("candiShapeType", candiShapeType);
    localStorage.setItem("animDuration", animDuration);
    localStorage.setItem("animHeight", animHeight);
    localStorage.setItem("settingsBgColor", settingsBgColor);
    localStorage.setItem("settingsOpacity", settingsOpacity);
    localStorage.setItem("settingsTextColorType", settingsTextColorType);
    localStorage.setItem("settingsTextColorCustom", settingsTextColorCustom);
    localStorage.setItem("settingsAccentColor", settingsAccentColor);
    localStorage.setItem("aiMode", aiMode);
    localStorage.setItem("cursorLockMode", cursorLockMode);
    localStorage.setItem("shortcutKeys", JSON.stringify(shortcutKeys));
    localStorage.setItem("scoreAutoRotate", scoreAutoRotate);
    localStorage.setItem("scoreRotateInterval", scoreRotateInterval);
    localStorage.setItem("scoreShowSlide1", scoreShowSlide1);
    localStorage.setItem("scoreShowSlide2", scoreShowSlide2);
    localStorage.setItem("scoreShowSlide3", scoreShowSlide3);
    localStorage.setItem("autoplaySpeed", autoplaySpeed);
    localStorage.setItem("autoplayUseAnim", autoplayUseAnim);
    localStorage.setItem("shortcutModalBgColor", shortcutModalBgColor);
    localStorage.setItem("shortcutModalOpacity", shortcutModalOpacity);
    localStorage.setItem("commentBoxBgColor", commentBoxBgColor);
    localStorage.setItem("commentBoxOpacity", commentBoxOpacity);
    localStorage.setItem("commentDisplayDuration", commentDisplayDuration);
    
    changeBoardColor(boardColorType);
    changeChoColor(choColorType);
    changeHanColor(hanColorType);
    changePieceShape(pieceShapeType);
    changeCandiShape(candiShapeType);
    changeCandiColor(candiColorType);
    changeAnimDuration(animDuration);
    changeAnimHeight(animHeight);
    changeSettingsBgColor(settingsBgColor);
    changeSettingsOpacity(settingsOpacity);
    changeSettingsTextColorType(settingsTextColorType);
    if (settingsTextColorType === "custom") changeSettingsTextColorCustom(settingsTextColorCustom);
    changeSettingsAccentColor(settingsAccentColor);
    
    initBoard();
    initPositions();
    initSettingsUI();
    applyScoreboardConfig();
  } catch (e) {
    console.error("Failed to load settings from slot", e);
  }
}

function copyConfigToClipboard(btn) {
  const config = {
    showCoordinates,
    sizeKing,
    sizeMiddle,
    sizeSmall,
    fontScaleKing,
    fontScaleMiddle,
    fontScaleSmall,
    coordsTextScale,
    boardColorType,
    choColorType,
    hanColorType,
    pieceShapeType,
    candiShapeType,
    candiColorType,
    animDuration,
    animHeight,
    settingsBgColor,
    settingsOpacity,
    settingsTextColorType,
    settingsTextColorCustom,
    settingsAccentColor,
    aiMode
  };
  const text = JSON.stringify(config);
  navigator.clipboard.writeText(text).then(() => {
    const originalText = btn.textContent;
    btn.textContent = "✅";
    setTimeout(() => {
      btn.textContent = "📋";
    }, 1500);
  }).catch(err => {
    console.error("Clipboard copy failed", err);
  });
}

// ----------------------------------------------------
// Category Reset Functions
// ----------------------------------------------------
function resetCategory1() {
  changeCharim(1, 0, null); // Top default: 마상마상
  changeCharim(0, 0, null); // Bottom default: 마상마상
  changeNation(true); // default nation: Cho (iAmCho = true)
  saveCurrentConfigToSlot();
}

function resetCategory2() {
  console.log("[Janggi Reset Debug] resetCategory2() called");
  showCoordinates = true;
  sizeKing = 1.15;
  sizeMiddle = 0.90;
  sizeSmall = 0.70;
  fontScaleKing = 1.25;
  fontScaleMiddle = 1.45;
  fontScaleSmall = 1.45;
  coordsTextScale = 0.18;
  boardColorType = "wood";
  choColorType = "blue";
  hanColorType = "red";
  pieceShapeType = "octagon";
  candiShapeType = "empty_circle";
  candiColorType = "#3b82f6";
  
  localStorage.setItem("showCoordinates", showCoordinates);
  localStorage.setItem("sizeKing", sizeKing);
  localStorage.setItem("sizeMiddle", sizeMiddle);
  localStorage.setItem("sizeSmall", sizeSmall);
  localStorage.setItem("fontScaleKing", fontScaleKing);
  localStorage.setItem("fontScaleMiddle", fontScaleMiddle);
  localStorage.setItem("fontScaleSmall", fontScaleSmall);
  localStorage.setItem("coordsTextScale", coordsTextScale);
  localStorage.setItem("pieceShapeType", pieceShapeType);
  localStorage.setItem("candiShapeType", candiShapeType);
  
  changeBoardColor(boardColorType);
  changeChoColor(choColorType);
  changeHanColor(hanColorType);
  changePieceShape(pieceShapeType);
  changeCandiShape(candiShapeType);
  changeCandiColor(candiColorType);
  
  initBoard();
  initPositions();
  initSettingsUI();
  saveCurrentConfigToSlot();
}

function resetCategory3() {
  changeAnimDuration(0.5);
  changeAnimHeight(0.2);
  saveCurrentConfigToSlot();
}

function resetCategory4() {
  settingsBgColor = "#0f172a";
  settingsOpacity = 0.55;
  settingsTextColorType = "auto";
  settingsTextColorCustom = "#f8fafc";
  settingsAccentColor = "#3b82f6";
  aiMode = 0;
  
  localStorage.setItem("settingsBgColor", settingsBgColor);
  localStorage.setItem("settingsOpacity", settingsOpacity);
  localStorage.setItem("settingsTextColorType", settingsTextColorType);
  localStorage.setItem("settingsTextColorCustom", settingsTextColorCustom);
  localStorage.setItem("settingsAccentColor", settingsAccentColor);
  localStorage.setItem("aiMode", aiMode);
  
  changeSettingsBgColor(settingsBgColor);
  changeSettingsOpacity(settingsOpacity);
  changeSettingsTextColorType(settingsTextColorType);
  changeSettingsAccentColor(settingsAccentColor);
  
  initSettingsUI();
  saveCurrentConfigToSlot();
}

function initSettingsUI() {
  const coordsBtn = document.getElementById("toggle-coords-btn-settings");
  if (coordsBtn) {
    coordsBtn.textContent = showCoordinates ? "좌표 표시 중" : "좌표 숨김 중";
  }
  
  const durSlider = document.getElementById("anim-duration-slider");
  if (durSlider) durSlider.value = animDuration;
  const durVal = document.getElementById("anim-duration-val");
  if (durVal) durVal.textContent = animDuration.toFixed(1);
  
  const heightSlider = document.getElementById("anim-height-slider");
  if (heightSlider) heightSlider.value = animHeight;
  const heightVal = document.getElementById("anim-height-val");
  if (heightVal) heightVal.textContent = animHeight.toFixed(1);
  
  const valSizeKing = document.getElementById("val-size-king");
  if (valSizeKing) valSizeKing.textContent = sizeKing.toFixed(2);
  const valSizeMiddle = document.getElementById("val-size-middle");
  if (valSizeMiddle) valSizeMiddle.textContent = sizeMiddle.toFixed(2);
  const valSizeSmall = document.getElementById("val-size-small");
  if (valSizeSmall) valSizeSmall.textContent = sizeSmall.toFixed(2);
  
  const valFontKing = document.getElementById("val-font-king");
  if (valFontKing) valFontKing.textContent = fontScaleKing.toFixed(2);
  const valFontMiddle = document.getElementById("val-font-middle");
  if (valFontMiddle) valFontMiddle.textContent = fontScaleMiddle.toFixed(2);
  const valFontSmall = document.getElementById("val-font-small");
  if (valFontSmall) valFontSmall.textContent = fontScaleSmall.toFixed(2);
  
  const valCoordsSize = document.getElementById("val-coords-size");
  if (valCoordsSize) valCoordsSize.textContent = coordsTextScale.toFixed(2);
  
  const boardColorSelect = document.getElementById("board-color-select");
  const boardColorPicker = document.getElementById("board-color-picker");
  if (boardColorSelect) {
    if (boardColorType.startsWith("#")) {
      boardColorSelect.value = "custom";
      if (boardColorPicker) {
        boardColorPicker.style.display = "inline-block";
        boardColorPicker.value = boardColorType;
      }
    } else {
      boardColorSelect.value = boardColorType;
      if (boardColorPicker) boardColorPicker.style.display = "none";
    }
  }
  
  const choColorSelect = document.getElementById("cho-color-select");
  const choColorPicker = document.getElementById("cho-color-picker");
  if (choColorSelect) {
    if (choColorType.startsWith("#")) {
      choColorSelect.value = "custom";
      if (choColorPicker) {
        choColorPicker.style.display = "inline-block";
        choColorPicker.value = choColorType;
      }
    } else {
      choColorSelect.value = choColorType;
      if (choColorPicker) choColorPicker.style.display = "none";
    }
  }
  
  const hanColorSelect = document.getElementById("han-color-select");
  const hanColorPicker = document.getElementById("han-color-picker");
  if (hanColorSelect) {
    if (hanColorType.startsWith("#")) {
      hanColorSelect.value = "custom";
      if (hanColorPicker) {
        hanColorPicker.style.display = "inline-block";
        hanColorPicker.value = hanColorType;
      }
    } else {
      hanColorSelect.value = hanColorType;
      if (hanColorPicker) hanColorPicker.style.display = "none";
    }
  }
  
  const pieceShapeSelect = document.getElementById("piece-shape-select");
  if (pieceShapeSelect) pieceShapeSelect.value = pieceShapeType;
  
  const candiShapeSelect = document.getElementById("candi-shape-select");
  if (candiShapeSelect) candiShapeSelect.value = candiShapeType;
  
  const candiColorSelect = document.getElementById("candi-color-select");
  const candiColorPicker = document.getElementById("candi-color-picker");
  if (candiColorSelect) {
    if (candiColorType.startsWith("#") && !["#3b82f6", "#10b981", "#f97316", "#a855f7", "#eab308"].includes(candiColorType)) {
      candiColorSelect.value = "custom";
      if (candiColorPicker) {
        candiColorPicker.style.display = "inline-block";
        candiColorPicker.value = candiColorType;
      }
    } else {
      candiColorSelect.value = candiColorType;
      if (candiColorPicker) candiColorPicker.style.display = "none";
    }
  }
  
  const settingsBgSelect = document.getElementById("settings-bg-select");
  const settingsBgPicker = document.getElementById("settings-bg-picker");
  if (settingsBgSelect) {
    if (settingsBgColor.startsWith("#") && !["#0f172a", "#1e293b", "#1e1b4b", "#022c22"].includes(settingsBgColor)) {
      settingsBgSelect.value = "custom";
      if (settingsBgPicker) {
        settingsBgPicker.style.display = "inline-block";
        settingsBgPicker.value = settingsBgColor;
      }
    } else {
      settingsBgSelect.value = settingsBgColor;
      if (settingsBgPicker) settingsBgPicker.style.display = "none";
    }
  }
  
  const settingsOpacitySlider = document.getElementById("settings-opacity-slider");
  if (settingsOpacitySlider) settingsOpacitySlider.value = settingsOpacity;
  const settingsOpacityVal = document.getElementById("settings-opacity-val");
  if (settingsOpacityVal) settingsOpacityVal.textContent = settingsOpacity.toFixed(2);

  const settingsTextColorSelect = document.getElementById("settings-text-color-select");
  const settingsTextColorPicker = document.getElementById("settings-text-color-picker");
  if (settingsTextColorSelect) {
    settingsTextColorSelect.value = settingsTextColorType;
    if (settingsTextColorType === "custom") {
      if (settingsTextColorPicker) {
        settingsTextColorPicker.style.display = "inline-block";
        settingsTextColorPicker.value = settingsTextColorCustom;
      }
    } else {
      if (settingsTextColorPicker) settingsTextColorPicker.style.display = "none";
    }
  }

  const settingsAccentSelect = document.getElementById("settings-accent-color-select");
  const settingsAccentPicker = document.getElementById("settings-accent-color-picker");
  if (settingsAccentSelect) {
    if (settingsAccentColor.startsWith("#") && !["#3b82f6", "#10b981", "#f97316", "#a855f7", "#eab308"].includes(settingsAccentColor)) {
      settingsAccentSelect.value = "custom";
      if (settingsAccentPicker) {
        settingsAccentPicker.style.display = "inline-block";
        settingsAccentPicker.value = settingsAccentColor;
      }
    } else {
      settingsAccentSelect.value = settingsAccentColor;
      if (settingsAccentPicker) settingsAccentPicker.style.display = "none";
    }
  }
  
  const aiModeSelect = document.getElementById("ai-mode-select");
  if (aiModeSelect) aiModeSelect.value = aiMode;

  const cursorLockSelect = document.getElementById("cursor-lock-select");
  if (cursorLockSelect) cursorLockSelect.value = cursorLockMode ? "true" : "false";

  // Scoreboard Settings Sync
  const autoRotateEl = document.getElementById("score-auto-rotate");
  if (autoRotateEl) autoRotateEl.value = scoreAutoRotate ? "true" : "false";
  
  const rotateIntervalEl = document.getElementById("score-rotate-interval");
  if (rotateIntervalEl) rotateIntervalEl.value = scoreRotateInterval.toString();
  
  const showSlide1El = document.getElementById("score-show-slide1");
  if (showSlide1El) showSlide1El.checked = scoreShowSlide1;
  
  const showSlide2El = document.getElementById("score-show-slide2");
  if (showSlide2El) showSlide2El.checked = scoreShowSlide2;
  
  const showSlide3El = document.getElementById("score-show-slide3");
  if (showSlide3El) showSlide3El.checked = scoreShowSlide3;

  // Autoplay Settings Sync
  const autoplaySpeedSlider = document.getElementById("autoplay-speed-slider");
  if (autoplaySpeedSlider) autoplaySpeedSlider.value = autoplaySpeed;
  const autoplaySpeedVal = document.getElementById("autoplay-speed-val");
  if (autoplaySpeedVal) autoplaySpeedVal.textContent = autoplaySpeed.toFixed(1);
  const autoplayUseAnimCheck = document.getElementById("autoplay-use-anim");
  if (autoplayUseAnimCheck) autoplayUseAnimCheck.checked = autoplayUseAnim;
}

