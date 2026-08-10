// main.js - Entry Point, Initialization, and Event Listeners Glue

function handleInitInput(e) {
  const input = e.target;
  const idx = parseInt(input.dataset.index);
  let val = input.value;

  val = val.replace(/[^0-9.]/g, "");
  input.value = val;

  if (idx === numInputCells - 1 && val.length === 1) {
    numInputCells++;
    rebuildGrid(numInputCells);
    const nextInput = document.querySelector(`.init-input-cell[data-index="${idx + 1}"]`);
    if (nextInput) {
      nextInput.focus();
    }
  } else if (val.length === 1) {
    const nextInput = document.querySelector(`.init-input-cell[data-index="${idx + 1}"]`);
    if (nextInput) {
      nextInput.focus();
    }
  }

  const startValueStr = getInitValue();
  if (startValueStr) {
    const parsed = parseFloat(startValueStr);
    if (!isNaN(parsed) && parsed > 0) {
      silentInit(parsed);
    }
  }
}

function handleInitKeydown(e) {
  const input = e.target;
  const idx = parseInt(input.dataset.index);

  if (e.key === "Backspace") {
    if (input.value === "") {
      const prevInput = document.querySelector(`.init-input-cell[data-index="${idx - 1}"]`);
      if (prevInput) {
        prevInput.focus();
        prevInput.value = "";
        
        const startValueStr = getInitValue();
        if (startValueStr) {
          const parsed = parseFloat(startValueStr);
          if (!isNaN(parsed) && parsed > 0) {
            silentInit(parsed);
          }
        }
      }
    }
  } else if (e.key === "ArrowLeft") {
    const prevInput = document.querySelector(`.init-input-cell[data-index="${idx - 1}"]`);
    if (prevInput) {
      prevInput.focus();
      e.preventDefault();
    }
  } else if (e.key === "ArrowRight") {
    const nextInput = document.querySelector(`.init-input-cell[data-index="${idx + 1}"]`);
    if (nextInput) {
      nextInput.focus();
      e.preventDefault();
    }
  } else if (e.key === "Enter") {
    const startValue = getInitValue();
    if (startValue) {
      const parsed = parseFloat(startValue);
      if (!isNaN(parsed) && parsed > 0) {
        init(parsed);
        nextStep();
        input.blur();
      }
    }
  }
}

function resetToStart() {
  const inputCells = document.querySelectorAll(".init-input-cell");
  inputCells.forEach(cell => {
    cell.value = "";
    cell.classList.remove("active", "highlight-red", "highlight-blue", "highlight-green");
  });
  
  inputs.forEach(row => {
    row.forEach(input => {
      input._value = "";
    });
  });
  
  stateHistory = [];
  
  cur_line = 0;
  cur_step = 1;
  guide_step = 0;
  D = 0;
  Q = 0;
  fStep1_1 = false;
  fStep0_1 = false;
  
  const rightCols = Math.max(20, numInputCells);
  const totalCols = 13 + rightCols;
  const totalRows = 1 + 2 * inputs.length;
  
  const clearRows = Math.max(17, totalRows);
  const clearCols = Math.max(28, totalCols);
  
  for (let r = 0; r < clearRows; r++) {
    clearGridRow(r, 0, clearCols);
  }
  
  rebuildGrid(20);
  
  // Hide the settings modal
  const settingsModal = document.getElementById("settings-modal");
  if (settingsModal) {
    settingsModal.classList.add("hidden");
  }
  
  if (inputCells.length > 0) {
    inputCells[0].focus();
  }
  
  stateHistory = [];
  saveState();
  safeCallGuide();
}

function init(value) {
  let valStr = getInitValue();
  if (valStr === "") {
    valStr = value.toString();
  }

  const parsed = parseFloat(valStr);
  N = isNaN(parsed) ? value : parsed;
  argv1 = N;

  if (valStr.length > numInputCells) {
    numInputCells = valStr.length;
    rebuildGrid(numInputCells);
  }

  const inputCells = document.querySelectorAll(".init-input-cell");
  inputCells.forEach((cell, idx) => {
    cell.value = valStr[idx] || "";
  });

  silentInit(N);
}

function safeCallGuide() {
  if (typeof guide === "function") {
    guide();
  } else {
    setTimeout(safeCallGuide, 10);
  }
}

function silentInit(value) {
  guide_step = 0;

  const valStr = getInitValue() || value.toString();
  digitGroups = getDigitGroups(valStr);
  
  const dotIdx = valStr.indexOf(".");
  if (dotIdx === -1) {
    numIntegerGroups = digitGroups.length;
  } else {
    const integerPart = valStr.substring(0, dotIdx);
    numIntegerGroups = getDigitGroups(integerPart).length;
  }

  // Set N to the first group
  N = parseInt(digitGroups[0]);
  argv1 = N;

  const rightCols = Math.max(20, numInputCells);
  clearGridRow(0, 13, 12 + rightCols);
  for (let r = 1; r < inputs.length; r++) {
    if (r === 1) {
      clearGridRow(r, 0, 11);
    } else {
      clearGridRow(r, 0, 12 + rightCols);
    }
  }

  cur_line = 0;
  cur_step = 1;
  D = 0;
  Q = 0;
  fStep1_1 = false;
  
  // inputs[0][0]._value holds the full input string for restoration
  inputs[0][0]._value = valStr;

  stateHistory = [];
  saveState();
  
  safeCallGuide();
}

function getColLetter(colIdx) {
  let temp = colIdx;
  let letter = "";
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

function updateCoordinateDisplay(address) {
  const corner = document.querySelector(".grid-header-cell.corner");
  if (corner) {
    corner.textContent = address === "-" ? "" : address;
  }
}

// Loading orchestrator to handle SPA router dynamic script execution
function checkAndStart() {
  if (
    typeof GridInput === "function" &&
    typeof rebuildGrid === "function" &&
    typeof getDigitGroups === "function" &&
    typeof positionTooltip === "function" &&
    document.getElementById("math-grid")
  ) {
    startMain();
  } else {
    setTimeout(checkAndStart, 10);
  }
}

function startMain() {
  // Initializing inputs list wrapper
  quotientInput = new GridInput(0, 3);
  for (var i = 0; i < max_line; i++) {
    const lines = [];
    lines.push(new GridInput(i, 0));
    lines.push(new GridInput(i, 1));
    lines.push(new GridInput(i, 2));
    lines.push(quotientInput);
    lines.push(new GridInput(i, 4));
    inputs.push(lines);
  }

  // Setup Grid
  rebuildGrid(numInputCells);

  // Language detection
  const browserLang = navigator.language || navigator.userLanguage || "";
  if (browserLang.startsWith("ko")) {
    language = 1;
  } else {
    language = 0;
  }

  // Check URL override
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const lang = urlParams.get('lang');
  if (lang === "ko") {
    language = 1;
  } else if (lang === "en") {
    language = 0;
  }

  const title = document.getElementById("title");
  if (title) {
    title.textContent = titleText[language];
  }

  init(2);

  // Setup event listeners for tooltip
  window.addEventListener("resize", positionTooltip);
  window.addEventListener("scroll", positionTooltip);
  window.activeWindowListeners = window.activeWindowListeners || [];
  window.activeWindowListeners.push({ type: "resize", fn: positionTooltip });
  window.activeWindowListeners.push({ type: "scroll", fn: positionTooltip });

  if (window.ResizeObserver) {
    const resizeObserver = new ResizeObserver(() => {
      positionTooltip();
    });
    resizeObserver.observe(document.body);
    window.activeResizeObservers = window.activeResizeObservers || [];
    window.activeResizeObservers.push(resizeObserver);
  }

  // Setup coordinate grid listeners
  const grid = document.getElementById("math-grid");
  if (grid) {
    grid.addEventListener("mouseover", (event) => {
      const target = event.target;
      if (target.classList.contains("grid-cell") || target.classList.contains("init-input-cell")) {
        const r = parseInt(target.dataset.row);
        const c = parseInt(target.dataset.col);
        if (!isNaN(r) && !isNaN(c)) {
          const colLetter = getColLetter(c);
          const rowNum = r + 1;
          updateCoordinateDisplay(`${colLetter}${rowNum}`);
        }
      }
    });
    grid.addEventListener("mouseout", (event) => {
      updateCoordinateDisplay("-");
    });
  }
}

window.resetToStart = resetToStart;
window.init = init;

// Start polling loader
checkAndStart();
