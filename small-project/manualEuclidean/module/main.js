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
  console.log("handleInitInput fired! Event:", e.type, "value:", e.target.value);
  const input = e.target;
  let val = input.value;

  // Sanitize to digits only
  val = val.replace(/[^0-9]/g, "");
  input.value = val;

  const col = parseInt(input.dataset.col);
  if (inputs[0] && inputs[0][col]) {
    inputs[0][col]._value = val;
  }

  // If editing happens during execution, reset to Step 0 immediately
  if (cur_step !== 0 || isFin) {
    const initVals = getInitValue();
    const parsedA = parseInt(initVals.valA);
    const parsedB = parseInt(initVals.valB);
    const startA = !isNaN(parsedA) ? parsedA : A;
    const startB = !isNaN(parsedB) ? parsedB : B;

    console.log("handleInitInput triggering reset to Step 0! cur_step:", cur_step);
    init(startA, startB);

    const newCell = getCell(0, col);
    if (newCell) {
      newCell.focus();
      const len = newCell.value.length;
      newCell.setSelectionRange(len, len);
    }
    return;
  }

  const initVals = getInitValue();
  const inputA = initVals.valA;
  const inputB = initVals.valB;

  if (inputA && inputB) {
    const parsedA = parseInt(inputA);
    const parsedB = parseInt(inputB);
    if (!isNaN(parsedA) && !isNaN(parsedB) && parsedA > 0 && parsedB > 0) {
      silentInit(parsedA, parsedB);
      document.getElementById("gcd").innerHTML = `gcd(${A}, ${B}) = ${gcd}`;
    } else {
      document.getElementById("gcd").innerHTML = `gcd(${inputA || "?"}, ${inputB || "?"}) = ?`;
    }
  } else {
    document.getElementById("gcd").innerHTML = `gcd(${inputA || "?"}, ${inputB || "?"}) = ?`;
  }

  if (cur_step === 0 && typeof guide === "function") {
    guide();
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
        if (inputs[0] && inputs[0][1]) {
          inputs[0][1]._value = "";
        }
        
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

function getRequiredRows(startA, startB) {
  let tempA = startA;
  let tempB = startB;
  if (tempA < tempB) {
    const t = tempA;
    tempA = tempB;
    tempB = t;
  }
  if (tempB === 0) return 7;
  let cycles = 0;
  while (true) {
    let r = tempA % tempB;
    cycles++;
    if (r === 0) break;
    tempA = tempB;
    tempB = r;
  }
  return cycles + 2;
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
  if (typeof window.buildActionsList === "function") {
    window.buildActionsList(A, B);
  }
}

function init(startA, startB) {
  console.log("init() called! Stack Trace:\n", new Error().stack);
  isGreating = true;
  isFin = false;
  window.isHidden = false;
  window.inPhaseA = true;
  if (typeof stateHistory !== "undefined") {
    stateHistory.length = 0;
  }

  if (startA < startB) {
    const temp = startA;
    startA = startB;
    startB = temp;
  }
  A = startA;
  B = startB;

  // Calculate required rows and rebuild grid dynamically
  const reqRows = getRequiredRows(A, B);
  max_line = Math.max(7, reqRows);
  rebuildGrid();
  
  cur_line = 0;
  cur_step = 0;
  
  // Extend V array values to match max_line
  V.length = 0;
  for (let i = 0; i < max_line; i++) {
    V.push([[0, 0, 0, 0], [0, 0, 0, 0], [0, 0]]);
  }

  // Setup initial V matrices
  V[0][0][0] = A;
  V[0][1][0] = B;

  // Clear inputs values
  for (let r = 0; r < max_line; r++) {
    for (let c = 0; c < 7; c++) {
      if (inputs[r] && inputs[r][c]) {
        inputs[r][c].value = "";
      }
    }
  }

  const cellA = getCell(0, 1);
  const cellB = getCell(0, 2);
  if (cellA) cellA.value = A;
  if (cellB) cellB.value = B;

  inputs[0][0].value = "";
  inputs[0][1].value = A;
  inputs[0][2].value = B;
  inputs[0][3].value = "";

  gcd = getGcd(A, B);
  document.getElementById("gcd").innerHTML = `gcd(${A}, ${B}) = ${gcd}`;
  if (typeof window.buildActionsList === "function") {
    window.buildActionsList(A, B);
  }
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

function triggerRandomStart() {
  let randA = 0;
  let randB = 0;
  let steps = 0;
  let attempts = 0;

  // Try to find a pair of numbers that requires between 4 and 8 steps to solve.
  // This keeps the grid size visually appealing and educational.
  do {
    randA = Math.floor(Math.random() * 9000) + 1000; // 1000 ~ 9999
    randB = Math.floor(Math.random() * 900) + 100;   // 100 ~ 999
    if (randA < randB) {
      const temp = randA;
      randA = randB;
      randB = temp;
    }
    steps = getRequiredRows(randA, randB);
    attempts++;
  } while ((steps < 4 || steps > 8) && attempts < 100);

  // Fallback if no perfect match found
  if (steps < 3) {
    randA = 6192;
    randB = 1012;
  }

  // Update inputs B1 and C1
  const cellA = getCell(0, 1);
  const cellB = getCell(0, 2);
  if (cellA) cellA.value = randA;
  if (cellB) cellB.value = randB;

  if (inputs[0]) {
    if (inputs[0][1]) inputs[0][1]._value = randA.toString();
    if (inputs[0][2]) inputs[0][2]._value = randB.toString();
  }

  // Initialize with the new values
  init(randA, randB);
}

window.triggerRandomStart = triggerRandomStart;

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