// main.js - Entry Point, Initialization, and Event Listeners

function getInitValue() {
  const cellA = getCell(0, 1);
  const cellB = getCell(0, 2);
  return {
    valA: cellA ? cellA.value.trim() : "",
    valB: cellB ? cellB.value.trim() : ""
  };
}

function handleInitInput(e) {
  const input = e.target;
  const col = parseInt(input.dataset.col);
  let val = input.value;

  // Sanitize to digits only
  val = val.replace(/[^0-9]/g, "");
  input.value = val;

  const initVals = getInitValue();
  if (initVals.valA && initVals.valB) {
    const parsedA = parseInt(initVals.valA);
    const parsedB = parseInt(initVals.valB);
    if (!isNaN(parsedA) && !isNaN(parsedB) && parsedA > 0 && parsedB > 0) {
      silentInit(parsedA, parsedB);
    }
  }
}

function handleInitKeydown(e) {
  const input = e.target;
  const col = parseInt(input.dataset.col);

  if (e.key === "Backspace") {
    if (input.value === "" && col === 2) {
      const prevInput = getCell(0, 1);
      if (prevInput) {
        prevInput.focus();
        prevInput.value = "";
        
        const initVals = getInitValue();
        if (initVals.valA && initVals.valB) {
          const parsedA = parseInt(initVals.valA);
          const parsedB = parseInt(initVals.valB);
          if (!isNaN(parsedA) && !isNaN(parsedB) && parsedA > 0 && parsedB > 0) {
            silentInit(parsedA, parsedB);
          }
        }
      }
    }
  } else if (e.key === "ArrowLeft" && col === 2) {
    const prevInput = getCell(0, 1);
    if (prevInput) {
      prevInput.focus();
      e.preventDefault();
    }
  } else if (e.key === "ArrowRight" && col === 1) {
    const nextInput = getCell(0, 2);
    if (nextInput) {
      nextInput.focus();
      e.preventDefault();
    }
  } else if (e.key === "Enter") {
    const initVals = getInitValue();
    if (initVals.valA && initVals.valB) {
      const parsedA = parseInt(initVals.valA);
      const parsedB = parseInt(initVals.valB);
      if (!isNaN(parsedA) && !isNaN(parsedB) && parsedA > 0 && parsedB > 0) {
        init(parsedA, parsedB);
        nextStep();
        input.blur();
      }
    }
  }
}

function resetToStart() {
  stateHistory = [];
  cur_line = 0;
  cur_step = 0;
  isFin = false;
  isGreating = false;
  A = 6192;
  B = 1012;
  gcd = 4;
  lcm = 0;

  // Clear V array
  for (let i = 0; i < V.length; i++) {
    V[i] = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0]];
  }

  rebuildGrid();

  const freshCellA = getCell(0, 1);
  const freshCellB = getCell(0, 2);
  if (freshCellA) freshCellA.value = A;
  if (freshCellB) freshCellB.value = B;

  init(A, B);
}

function silentInit(startA, startB) {
  if (startA < startB) {
    const temp = startA;
    startA = startB;
    startB = temp;
  }
  A = startA;
  B = startB;
  gcd = getGcd(A, B);
}

function init(startA, startB) {
  isGreating = false;
  isFin = false;

  if (startA < startB) {
    const temp = startA;
    startA = startB;
    startB = temp;
  }
  A = startA;
  B = startB;
  
  cur_line = 0;
  cur_step = 0;
  
  // Clear and initialize inputs
  for (let r = 0; r < max_line; r++) {
    for (let c = 0; c < 7; c++) {
      inputs[r][c].value = "";
    }
  }

  // Clear V array values
  for (let i = 0; i < V.length; i++) {
    V[i] = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0]];
  }

  // Setup initial V matrices
  V[0][0][0] = A;
  V[0][1][0] = B;

  inputs[0][0].value = "";
  inputs[0][1].value = A;
  inputs[0][2].value = B;
  inputs[0][3].value = "";

  gcd = getGcd(A, B);
  document.getElementById("gcd").innerHTML = `gcd(${A}, ${B}) = ${gcd}`;
  document.getElementById("resault").innerHTML = "";

  saveState();
  highlightActiveStep();
  guide();
}

function changeLanguage() {
  const langBtn = document.getElementById("language");
  const title = document.getElementById("title");
  
  if (language === 0) {
    if (langBtn) langBtn.textContent = "언어";
    language = 1;
    if (title) title.innerHTML = titleText[1];
  } else {
    if (langBtn) langBtn.textContent = "Language";
    language = 0;
    if (title) title.innerHTML = titleText[0];
  }

  // Reload localization key bindings texts
  if (typeof initKeybindings === "function") {
    initKeybindings();
  }

  guide();
}

// Window resizing adjustments
let resizeObserver;
function initApp() {
  rebuildGrid();

  const freshCellA = getCell(0, 1);
  const freshCellB = getCell(0, 2);
  if (freshCellA) freshCellA.value = A;
  if (freshCellB) freshCellB.value = B;

  init(A, B);

  const gridContainer = document.getElementById("main");
  if (gridContainer && window.ResizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      positionTooltip();
    });
    resizeObserver.observe(gridContainer);
  }

  // Bind settings reset all
  const settingsResetBtn = document.getElementById("settings-reset-all-btn");
  if (settingsResetBtn) {
    settingsResetBtn.onclick = () => {
      localStorage.removeItem("manualEuclidean_keybindings");
      if (typeof initKeybindings === "function") {
        initKeybindings();
      }
    };
  }
}

// Start application
function checkAndInit() {
  if (typeof rebuildGrid === "function" && 
      typeof getCell === "function" && 
      typeof positionTooltip === "function" && 
      typeof initKeybindings === "function") {
    initApp();
  } else {
    setTimeout(checkAndInit, 10);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", checkAndInit);
} else {
  checkAndInit();
}