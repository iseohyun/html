let max_line = 8;
var inputs = new Array();
var lines;
var cur_step = 1;
var cur_line = 0;
var fStep1_1 = false;
var pointpos = 0;
var language = 1; // 0: English, 1: Korean
var guide_step = 0;
var argv1 = 2;
var argv2 = 0;
var argv3 = 0;
var argv4 = "";
var N = 2, D, Q;
var digitGroups = [];
var numIntegerGroups = 1;

const titleText = [
  "Finding Square Roots",
  "제곱근 구하기"
];

const sentences = [
  [
    "1. Please enter the number for which you want to find the square root. If you wish to proceed with <em>$argv1</em>, simply click the [>] button.",
    "1. 제곱근을 구하고 싶은 숫자를 입력하세요. 만약, <em>$argv1</em>의 제곱근을 구하고 싶다면 [>] 버튼을 누르면 됩니다.",
  ],
  [
    "$guide_step. Click the [>] button.",
    "$guide_step. [>] 버튼을 누릅니다.",
  ],
  [ // 제수 구하기
    "$guide_step. The largest number <span class=\"math-var\">x</span> that is less than or equal to <em>$argv1</em> among the squares of <span class=\"math-var\">x</span> is <em>$D <sup>2</sup></em>.",
    "$guide_step. <span class=\"math-var\">x</span>의 제곱 중, <em>$argv1</em>을 넘지 않는 가장 큰 <span class=\"math-var\">x</span>는 <em>$D<sup>2</sup></em> 입니다."
  ],
  [
    "$guide_step. specify <span class=\"math-var\">x</span> = <em>$Q</em>.",
    "$guide_step. <span class=\"math-var\">x</span> = <em>$Q</em>를 작성합니다."
  ],
  [ // 몫 구하기
    "$guide_step. Add <em>$Q</em> to the end of the number.",
    "$guide_step. 가장 뒷 자리에 <em>$Q</em>을 붙여 줍니다."
  ],
  [
    "$guide_step. Calculate <em>$D</em> × <em>$Q</em>.",
    "$guide_step. <em>$D</em> × <em>$Q</em>를 구합니다."
  ],
  [
    "$guide_step. Subtract <em>$argv1</em> from <em>$argv2</em> to get <em>$argv3</em>, then append '<em>$argv4</em>' at the end.",
    "$guide_step. <em>$argv2</em> - <em>$argv1</em> = <em>$argv3</em>, 뒤에 '<em>$argv4</em>'을 붙입니다."
  ],
  [
    "$guide_step. <em>$argv1</em> + <em>$argv2</em> = <em>$D</em>",
    "$guide_step. <em>$argv1</em> + <em>$argv2</em> = <em>$D</em>"
  ],
  [
    "$guide_step. Find <span class=\"math-box\">?</span> where <span class=\"math-var\">$argv1</span><span class=\"math-box\">?</span> &times; <span class=\"math-box\">?</span> &le; <em>$N</em>.<br>Since $D &times; $Q &le; $N, <span class=\"math-box\">?</span> is equal to <em>$Q</em>.",
    "$guide_step. <span class=\"math-var\">$argv1</span><span class=\"math-box\">?</span> &times; <span class=\"math-box\">?</span> &le; <em>$N</em>인 <span class=\"math-box\">?</span>를 찾습니다.<br>$D &times; $Q &le; $N이므로 <span class=\"math-box\">?</span>=<em>$Q</em> 입니다."
  ]
];

// Grid Configuration
const gridRows = 1 + 2 * max_line; // 17
let numInputCells = 8;
var stateHistory = [];

class GridInput {
  constructor(row, type) {
    this.row = row;
    this.type = type; // 0: num, 1: divisor, 2: divisor_, 3: quotient, 4: num_
    this._value = "";
  }

  get value() {
    return this._value === undefined || this._value === null ? "" : this._value.toString();
  }

  set value(val) {
    this._value = val === undefined || val === null ? "" : val.toString();
    updateGridCellDisplay(this.row, this.type, this._value, true);
  }
}

function getDigitGroups(valStr) {
  valStr = valStr.replace(/[^0-9.]/g, "");
  if (valStr === "") return ["0"];
  
  const dotIdx = valStr.indexOf(".");
  let integerPart = "";
  let decimalPart = "";
  if (dotIdx === -1) {
    integerPart = valStr;
  } else {
    integerPart = valStr.substring(0, dotIdx);
    decimalPart = valStr.substring(dotIdx + 1);
  }
  
  const groups = [];
  
  let tempInt = integerPart;
  const intGroups = [];
  while (tempInt.length > 2) {
    intGroups.unshift(tempInt.substring(tempInt.length - 2));
    tempInt = tempInt.substring(0, tempInt.length - 2);
  }
  if (tempInt.length > 0) {
    intGroups.unshift(tempInt);
  }
  if (intGroups.length === 0) {
    intGroups.push("0");
  }
  
  groups.push(...intGroups);
  
  let tempDec = decimalPart;
  const decGroups = [];
  while (tempDec.length > 0) {
    let pair = tempDec.substring(0, 2);
    if (pair.length === 1) {
      pair += "0";
    }
    decGroups.push(pair);
    tempDec = tempDec.substring(2);
  }
  
  groups.push(...decGroups);
  
  return groups;
}

function getGroupEndCol(groupIndex) {
  const inputCells = document.querySelectorAll(".init-input-cell");
  let dotIdx = -1;
  const digitCols = [];
  
  inputCells.forEach((cell) => {
    const col = parseInt(cell.dataset.col);
    if (cell.value === ".") {
      dotIdx = col;
    } else if (cell.value !== "") {
      digitCols.push(col);
    }
  });

  digitCols.sort((a, b) => a - b);

  let intCols = [];
  let decCols = [];
  
  if (dotIdx === -1) {
    intCols = digitCols;
  } else {
    intCols = digitCols.filter(c => c < dotIdx);
    decCols = digitCols.filter(c => c > dotIdx);
  }

  const intGroups = [];
  let tempInt = [...intCols];
  while (tempInt.length > 2) {
    intGroups.unshift(tempInt.splice(tempInt.length - 2));
  }
  if (tempInt.length > 0) {
    intGroups.unshift(tempInt);
  }
  if (intGroups.length === 0) {
    intGroups.push([13]);
  }

  const decGroups = [];
  let tempDec = [...decCols];
  while (tempDec.length > 0) {
    decGroups.push(tempDec.splice(0, 2));
  }

  const allGroups = [...intGroups, ...decGroups];

  if (groupIndex < allGroups.length) {
    const grp = allGroups[groupIndex];
    return grp[grp.length - 1];
  } else {
    let lastEndCol = 13;
    if (allGroups.length > 0) {
      const lastGrp = allGroups[allGroups.length - 1];
      lastEndCol = lastGrp[lastGrp.length - 1];
    }
    if (dotIdx > lastEndCol) {
      lastEndCol = dotIdx;
    }
    return lastEndCol + 2 * (groupIndex - allGroups.length + 1);
  }
}

function getCell(r, c) {
  return document.querySelector(`.grid-cell[data-row="${r}"][data-col="${c}"]`);
}

function clearGridRow(r, startCol, endCol) {
  for (let c = startCol; c <= endCol; c++) {
    const cell = getCell(r, c);
    if (cell) {
      cell.textContent = "";
      cell.className = "grid-cell";
      if (r === 1) {
        if (c === 12) {
          cell.classList.add("division-bracket");
        } else if (c >= 13 && c < 13 + numInputCells) {
          cell.classList.add("division-bar");
        }
      }
    }
  }
}

function drawValWithDot(row, type, value, endCol, dotCol, animate) {
  const valStr = value.toString();
  const len = valStr.length;
  const rightCols = Math.max(20, numInputCells + 10);
  const startRange = 13;
  const endRange = 12 + rightCols;
  const r = 2 * row + (type === 0 ? 1 : 2);
  
  clearGridRow(r, startRange, endRange);
  
  let valIdx = len - 1;
  let c = endCol;
  
  while (valIdx >= 0 && c >= startRange) {
    const cell = getCell(r, c);
    if (c === dotCol) {
      if (cell) cell.textContent = ""; // Leave blank, skip column
      c--;
      continue;
    }
    
    if (cell) {
      const prevText = cell.textContent;
      cell.textContent = (valStr[valIdx] === " ") ? "" : valStr[valIdx];
      if (type === 4) {
        cell.classList.add("subtraction-line");
      }
      if (animate && cell.textContent !== "" && prevText === "") {
        cell.classList.add("grid-cell-animate");
      }
    }
    valIdx--;
    c--;
  }
}

function updateGridCellDisplay(row, type, value, animate = true) {
  const valStr = value.toString();
  const rightCols = Math.max(20, numInputCells + 10);
  
  if (type === 3) {
    // Quotient: Row 0, dynamically aligned to group ending columns
    clearGridRow(0, 13, 12 + rightCols);
    
    // Find the dot column if any
    const inputCells = document.querySelectorAll(".init-input-cell");
    let dotCol = -1;
    inputCells.forEach(cell => {
      if (cell.value === ".") {
        dotCol = parseInt(cell.dataset.col);
      }
    });

    const digits = [];
    let hasDot = false;
    for (let char of valStr) {
      if (char === ".") {
        hasDot = true;
      } else if (char !== " " && char !== "") {
        digits.push(char);
      }
    }

    digits.forEach((digit, idx) => {
      const endCol = getGroupEndCol(idx);
      const cell = getCell(0, endCol);
      if (cell) {
        const prevText = cell.textContent;
        cell.textContent = digit;
        if (animate && prevText === "") {
          cell.classList.add("grid-cell-animate");
        }
      }
    });

    if (hasDot && dotCol !== -1) {
      const cell = getCell(0, dotCol);
      if (cell) {
        const prevText = cell.textContent;
        cell.textContent = ".";
        if (animate && prevText === "") {
          cell.classList.add("grid-cell-animate");
        }
      }
    }
  } else if (type === 0) {
    // num: Row 2*row + 1. If row is 0, update input cells.
    if (row === 0) {
      const inputsList = document.querySelectorAll(".init-input-cell");
      inputsList.forEach((input, idx) => {
        input.value = valStr[idx] || "";
      });
    } else {
      const endCol = getGroupEndCol(row);
      
      const inputCells = document.querySelectorAll(".init-input-cell");
      let dotCol = -1;
      inputCells.forEach(cell => {
        if (cell.value === ".") {
          dotCol = parseInt(cell.dataset.col);
        }
      });
      
      drawValWithDot(row, type, valStr, endCol, dotCol, animate);
    }
  } else if (type === 4) {
    // num_: Row 2*row + 2, Columns 13 onwards (right-aligned to group ending column, with subtraction bottom line)
    const endCol = getGroupEndCol(row);
    
    const inputCells = document.querySelectorAll(".init-input-cell");
    let dotCol = -1;
    inputCells.forEach(cell => {
      if (cell.value === ".") {
        dotCol = parseInt(cell.dataset.col);
      }
    });
    
    drawValWithDot(row, type, valStr, endCol, dotCol, animate);
  } else if (type === 1) {
    // divisor: Row 2*row + 1, Columns 0-11 (right-aligned)
    clearGridRow(2 * row + 1, 0, 11);
    const len = valStr.length;
    const startCol = Math.max(0, 12 - len);
    for (let k = 0; k < len; k++) {
      const cell = getCell(2 * row + 1, startCol + k);
      if (cell) {
        const prevText = cell.textContent;
        cell.textContent = (valStr[k] === " ") ? "" : valStr[k];
        if (animate && cell.textContent !== "" && prevText === "") {
          cell.classList.add("grid-cell-animate");
        }
      }
    }
  } else if (type === 2) {
    // divisor_: Row 2*row + 2, Columns 0-11 (right-aligned)
    clearGridRow(2 * row + 2, 0, 11);
    const len = valStr.length;
    const startCol = Math.max(0, 12 - len);
    for (let k = 0; k < len; k++) {
      const cell = getCell(2 * row + 2, startCol + k);
      if (cell) {
        const prevText = cell.textContent;
        cell.textContent = (valStr[k] === " ") ? "" : valStr[k];
        if (animate && cell.textContent !== "" && prevText === "") {
          cell.classList.add("grid-cell-animate");
        }
      }
    }
  }

  highlightActiveStep();
}

function ensureRowCapacity(neededLines) {
  const currentLines = inputs.length;
  if (neededLines <= currentLines) return;

  const grid = document.getElementById("math-grid");
  if (!grid) return;

  const rightCols = Math.max(20, numInputCells + 10);
  const totalCols = 13 + rightCols;

  for (let i = currentLines; i < neededLines; i++) {
    const linesArr = new Array();
    linesArr.push(new GridInput(i, 0));
    linesArr.push(new GridInput(i, 1));
    linesArr.push(new GridInput(i, 2));
    linesArr.push(quotientInput);
    linesArr.push(new GridInput(i, 4));
    inputs.push(linesArr);

    for (let r = 2 * i + 1; r <= 2 * i + 2; r++) {
      for (let c = 0; c < totalCols; c++) {
        const cell = document.createElement("div");
        cell.classList.add("grid-cell");
        cell.dataset.row = r;
        cell.dataset.col = c;
        grid.appendChild(cell);
      }
    }
  }

  grid.style.gridTemplateRows = `repeat(${1 + 2 * neededLines}, 2rem)`;
}

function rebuildGrid(numCells) {
  const currentValues = [];
  document.querySelectorAll(".init-input-cell").forEach(cell => {
    currentValues.push(cell.value);
  });

  const rightCols = Math.max(20, numCells + 10);
  const grid = document.getElementById("math-grid");
  if (!grid) return;
  
  grid.innerHTML = "";
  grid.style.gridTemplateColumns = `repeat(12, 1.4rem) 1.4rem repeat(${rightCols}, 1.4rem)`;
  
  const currentLines = inputs.length;
  for (let r = 0; r < 1 + 2 * currentLines; r++) {
    for (let c = 0; c < 13 + rightCols; c++) {
      if (r === 1 && c >= 13 && c < 13 + numCells) {
        const idx = c - 13;
        const input = document.createElement("input");
        input.type = "text";
        input.maxLength = 1;
        input.classList.add("init-input-cell");
        input.dataset.row = r;
        input.dataset.col = c;
        input.dataset.index = idx;
        input.value = currentValues[idx] || "";
        input.addEventListener("input", handleInitInput);
        input.addEventListener("keydown", handleInitKeydown);
        grid.appendChild(input);
      } else {
        const cell = document.createElement("div");
        cell.classList.add("grid-cell");
        cell.dataset.row = r;
        cell.dataset.col = c;
        if (r === 1) {
          if (c === 12) {
            cell.classList.add("division-bracket");
          } else if (c >= 13 && c < 13 + numCells) {
            cell.classList.add("division-bar");
          }
        }
        grid.appendChild(cell);
      }
    }
  }
}

function getInitValue() {
  let valStr = "";
  document.querySelectorAll(".init-input-cell").forEach(input => {
    valStr += input.value;
  });
  return valStr.trim();
}

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

function padOddDecimalPlaces() {
  const startValueStr = getInitValue();
  if (startValueStr.includes(".")) {
    const parts = startValueStr.split(".");
    const decimalPart = parts[1] || "";
    if (decimalPart.length % 2 !== 0) {
      const inputsList = document.querySelectorAll(".init-input-cell");
      let filledCount = 0;
      inputsList.forEach(input => {
        if (input.value !== "") filledCount++;
      });
      
      const targetInput = document.querySelector(`.init-input-cell[data-index="${filledCount}"]`);
      if (targetInput) {
        targetInput.value = "0";
      } else {
        numInputCells++;
        rebuildGrid(numInputCells);
        const newTargetInput = document.querySelector(`.init-input-cell[data-index="${filledCount}"]`);
        if (newTargetInput) newTargetInput.value = "0";
      }
    }
  }
}

function nextGuide() {
  guide_step++;
  console.log(`${guide_step} : N = ${N}, D = ${D}, Q = ${Q}, line = ${cur_line}, step = ${cur_step}`);
  if (guide_step >= 6) {
    const prevRow = inputs[cur_line - 1] || inputs[0];
    const curRow = inputs[cur_line] || inputs[0];
    
    switch (guide_step % 6) {
      case 0:
        argv1 = prevRow[4] ? prevRow[4].value : "";
        argv2 = prevRow[0] ? prevRow[0].value : "";
        argv3 = (curRow[0] && curRow[0].value) ? Math.floor(parseInt(curRow[0].value) / 100) : 0;
        const nextGrpIdx = cur_line;
        argv4 = (nextGrpIdx < digitGroups.length) ? digitGroups[nextGrpIdx] : "00";
        break;
      case 1:
        argv1 = prevRow[1] ? prevRow[1].value : "";
        argv2 = prevRow[2] ? prevRow[2].value : "";
        break;
      case 2:
        argv1 = (prevRow[1] && prevRow[2]) ? (parseInt(prevRow[1].value) + parseInt(prevRow[2].value)) : 0;
        argv2 = prevRow[2] ? prevRow[2].value : "";
        break;
      case 3:
        break;
    }
    if (guide_step > 8) {
      guide_step -= 6;
    }
  }
  else if (guide_step == 3) {
    // Nothing special
  }
  else if (guide_step == 2) {
    argv1 = (Math.round(N * 100) / 100).toString();
  }

  guide();
  saveState();
}

function guide() {
  const sentence = sentences[guide_step][language]
    .replaceAll("$argv1", argv1)
    .replaceAll("$argv2", argv2)
    .replaceAll("$argv3", argv3)
    .replaceAll("$argv4", argv4)
    .replaceAll("$N", N)
    .replaceAll("$D", D)
    .replaceAll("$Q", Q)
    .replace("$guide_step", guide_step);

  const tooltip = document.getElementById("guide-tooltip");
  if (tooltip) {
    document.getElementById("tooltip-content").innerHTML = sentence;
    
    // Update step indicator
    const stepNum = stateHistory.length;
    const indicator = document.getElementById("tooltip-step-indicator");
    if (indicator) {
      indicator.textContent = (language === 1) ? `단계 ${stepNum}` : `Step ${stepNum}`;
    }

    // Disable Prev button on the very first step
    const prevBtn = document.getElementById("tooltip-prev-btn");
    if (prevBtn) {
      prevBtn.disabled = (stateHistory.length <= 1);
    }

    // Challenge handling
    const challengePanel = document.getElementById("tooltip-challenge");
    const nextBtn = document.getElementById("tooltip-next-btn");
    
    if (isChallengeStep()) {
      challengePanel.classList.remove("hidden");
      if (nextBtn) nextBtn.disabled = true;
      
      // Clear input and feedback
      const challengeInput = document.getElementById("challenge-input");
      challengeInput.value = "";
      
      const feedback = document.getElementById("challenge-feedback");
      feedback.classList.add("hidden");
      feedback.textContent = "";

      // Setup question text
      const questionSpan = document.getElementById("challenge-question");
      if (language === 1) { // Korean
        questionSpan.innerHTML = `직접 입력해보세요: <span class="math-var">${D}</span><span class="math-box">?</span> &times; <span class="math-box">?</span> &le; <em>${N}</em>인 <span class="math-box">?</span>는?`;
        document.querySelector(".check-btn").textContent = "확인";
        document.querySelector(".skip-btn").textContent = "Skip";
      } else { // English
        questionSpan.innerHTML = `Try it: What is <span class="math-box">?</span> for <span class="math-var">${D}</span><span class="math-box">?</span> &times; <span class="math-box">?</span> &le; <em>${N}</em>?`;
        document.querySelector(".check-btn").textContent = "Check";
        document.querySelector(".skip-btn").textContent = "Skip";
      }

      // Enter key submission for challenge
      challengeInput.onkeydown = (e) => {
        if (e.key === "Enter") {
          checkPracticeAnswer();
        }
      };
    } else {
      challengePanel.classList.add("hidden");
      if (nextBtn) nextBtn.disabled = false;
    }
  }
  
  highlightActiveStep();
}

function isChallengeStep() {
  // Practice mode for the first 2 division steps:
  // line 1 (first division step) and line 2 (second division step)
  // when cur_step is 1 and fStep1_1 is false (meaning finding D & Q)
  return (cur_line === 1 || cur_line === 2) && cur_step === 1 && !fStep1_1;
}

function getCorrectQ() {
  for (let i = 9; i >= 0; i--) {
    if ((D * 10 + i) * i <= N) {
      return i;
    }
  }
  return 0;
}

function checkPracticeAnswer() {
  const inputVal = document.getElementById("challenge-input").value.trim();
  const feedback = document.getElementById("challenge-feedback");
  if (!feedback) return;
  feedback.classList.remove("hidden");
  
  const correctVal = getCorrectQ();
  if (parseInt(inputVal) === correctVal) {
    feedback.className = "feedback-msg correct";
    feedback.textContent = (language === 1) ? "정답입니다! 🎉" : "Correct! 🎉";
    
    // Auto proceed after 1.2s
    setTimeout(() => {
      nextStep();
    }, 1200);
  } else {
    feedback.className = "feedback-msg incorrect";
    feedback.textContent = (language === 1) ? "오답입니다. 다시 한번 계산해 보세요!" : "Incorrect. Try again!";
  }
}

function skipPractice() {
  nextStep();
}

function highlightActiveStep() {
  // Clear previous active highlights
  document.querySelectorAll(".grid-cell").forEach(cell => {
    cell.classList.remove("active");
  });
  document.querySelectorAll(".init-input-cell").forEach(cell => {
    cell.classList.remove("active");
  });

  let targetRow, startCol, endCol;

  if (cur_step === 3) {
    // Quotient
    targetRow = 0;
    startCol = 13;
    const len = Math.max(1, stateHistory.length);
    endCol = getGroupEndCol(len - 1);
  } else if (cur_step === 0) {
    // num
    targetRow = 2 * cur_line + 1;
    if (cur_line === 0) {
      document.querySelectorAll(".init-input-cell").forEach(cell => {
        cell.classList.add("active");
      });
      positionTooltip();
      return;
    } else {
      const activeInput = inputs[cur_line] ? inputs[cur_line][cur_step] : null;
      const val = activeInput ? activeInput.value : "";
      endCol = getGroupEndCol(cur_line);
      startCol = Math.min(endCol - 2, endCol - val.length + 1);
    }
  } else if (cur_step === 1) {
    // divisor
    targetRow = 2 * cur_line + 1;
    const activeInput = inputs[cur_line] ? inputs[cur_line][cur_step] : null;
    const val = activeInput ? activeInput.value : "";
    const len = Math.max(3, val.length);
    startCol = Math.max(0, 12 - len);
    endCol = 11;
  } else if (cur_step === 2) {
    // divisor_
    targetRow = 2 * cur_line + 2;
    const activeInput = inputs[cur_line] ? inputs[cur_line][cur_step] : null;
    const val = activeInput ? activeInput.value : "";
    const len = Math.max(3, val.length);
    startCol = Math.max(0, 12 - len);
    endCol = 11;
  } else if (cur_step === 4) {
    // num_
    targetRow = 2 * cur_line + 2;
    const activeInput = inputs[cur_line] ? inputs[cur_line][cur_step] : null;
    const val = activeInput ? activeInput.value : "";
    endCol = getGroupEndCol(cur_line);
    startCol = Math.min(endCol - 2, endCol - val.length + 1);
  }

  // Highlight these cells
  for (let c = startCol; c <= endCol; c++) {
    const cell = getCell(targetRow, c);
    if (cell) {
      cell.classList.add("active");
    }
  }

  positionTooltip();
}

function positionTooltip() {
  const tooltip = document.getElementById("guide-tooltip");
  if (!tooltip) return;
  if (isHidden || getInitValue() === "") {
    tooltip.classList.add("hidden");
    return;
  }

  const activeCells = document.querySelectorAll(".grid-cell.active, .init-input-cell.active");
  if (activeCells.length === 0) {
    tooltip.classList.add("hidden");
    return;
  }

  tooltip.classList.remove("hidden");

  let minLeft = Infinity;
  let maxRight = -Infinity;
  let maxBottom = -Infinity;

  activeCells.forEach(cell => {
    const rect = cell.getBoundingClientRect();
    if (rect.left < minLeft) minLeft = rect.left;
    if (rect.right > maxRight) maxRight = rect.right;
    if (rect.bottom > maxBottom) maxBottom = rect.bottom;
  });

  const width = maxRight - minLeft;
  
  const top = maxBottom + window.scrollY + 10;
  const left = minLeft + window.scrollX + (width - tooltip.offsetWidth) / 2;

  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${Math.max(10, Math.min(left, window.innerWidth - tooltip.offsetWidth - 10))}px`;
}

function saveState() {
  const state = {
    cur_line,
    cur_step,
    fStep1_1,
    pointpos,
    numIntegerGroups,
    digitGroups: [...digitGroups],
    guide_step,
    N,
    D,
    Q,
    argv1,
    argv2,
    argv3,
    argv4,
    numInputCells,
    inputsValues: inputs.map(row => row.map(input => input._value))
  };
  stateHistory.push(state);
}

function prevStep() {
  if (stateHistory.length <= 1) return;

  stateHistory.pop();
  const targetState = stateHistory[stateHistory.length - 1];

  cur_line = targetState.cur_line;
  cur_step = targetState.cur_step;
  fStep1_1 = targetState.fStep1_1;
  pointpos = targetState.pointpos;
  numIntegerGroups = targetState.numIntegerGroups || 1;
  digitGroups = targetState.digitGroups || [];
  guide_step = targetState.guide_step;
  N = targetState.N;
  D = targetState.D;
  Q = targetState.Q;
  argv1 = targetState.argv1;
  argv2 = targetState.argv2;
  argv3 = targetState.argv3;
  argv4 = targetState.argv4 || "";
  
  numInputCells = targetState.numInputCells;
  
  const maxLineNeeded = Math.max(8, cur_line + 1);
  ensureRowCapacity(maxLineNeeded);

  targetState.inputsValues.forEach((rowVals, r) => {
    rowVals.forEach((val, type) => {
      inputs[r][type]._value = val;
      updateGridCellDisplay(r, type, val, false); // no animations on undo
    });
  });

  const rightCols = Math.max(20, numInputCells + 10);
  for (let r = targetState.inputsValues.length; r < inputs.length; r++) {
    clearGridRow(r, 0, 12 + rightCols);
  }

  guide();
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

  const rightCols = Math.max(20, numInputCells + 10);
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

  // Compute pointpos for backward compatibility
  pointpos = 1;
  let tempN = parseFloat(valStr);
  if (!isNaN(tempN)) {
    while (tempN > 10) {
      pointpos++;
      tempN = tempN / 10;
    }
    if (pointpos % 2 == 0) {
      inputs[0][3]._value = " ";
    }
  }

  stateHistory = [];
  saveState();
  
  guide();
}

function nextStep() {
  if (cur_line === 0 && cur_step === 1 && guide_step === 0) {
    padOddDecimalPlaces();
    const startValue = getInitValue();
    const parsed = parseFloat(startValue);
    if (!isNaN(parsed) && parsed > 0) {
      init(parsed);
    } else {
      init(2);
    }
  }

  switch (cur_step) {
    case 0:
      const remainder = N - D * Q;
      const nextGroup = (cur_line < digitGroups.length) ? digitGroups[cur_line] : "00";
      N = remainder * 100 + parseInt(nextGroup);
      inputs[cur_line][cur_step].value = N.toString();
      break;
    case 1:
      if (fStep1_1) {
        fStep1_1 = false;
        D = D + D % 10;
        inputs[cur_line][cur_step].value = D.toString();
        cur_step--;
      } else {
        fStep1_1 = true;
        for (var i = 9; i >= 0; i--) {
          if ((D * 10 + i) * i <= N) {
            D = D * 10 + i;
            Q = i;
            inputs[cur_line][cur_step].value = D.toString();
            break;
          }
        }
      }
      break;
    case 2:
      inputs[cur_line][cur_step].value = Q.toString();
      break;
    case 3:
      if (cur_line == 0) {
        inputs[cur_line][cur_step].value = "";
      }
      inputs[cur_line][cur_step].value += Q;
      if (cur_line === numIntegerGroups - 1) {
        inputs[cur_line][cur_step].value += ".";
      }
      break;
    case 4:
      inputs[cur_line][cur_step].value = (D * Q).toString();
      break;
  }

  if (cur_step >= 4) {
    cur_step = 0;
    cur_line++;
    ensureRowCapacity(cur_line + 1);
  } else {
    cur_step++;
  }

  if (guide_step == 0) {
    guide_step++;
  }
  nextGuide();
}

function spacings(num) {
  var text = "";
  while (num-- > 0) {
    text += " ";
  }
  return text;
}

let isHidden = false;

function toggleGuide() {
  const tooltip = document.getElementById("guide-tooltip");
  if (isHidden) {
    isHidden = false;
    positionTooltip();
  } else {
    isHidden = true;
    if (tooltip) tooltip.classList.add("hidden");
  }
}

// Initializing inputs list wrapper
const quotientInput = new GridInput(0, 3);
for (var i = 0; i < max_line; i++) {
  lines = new Array();
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

function resetToStart() {
  const inputCells = document.querySelectorAll(".init-input-cell");
  inputCells.forEach(cell => {
    cell.value = "";
  });
  
  if (inputs[0] && inputs[0][0]) {
    inputs[0][0]._value = "";
  }
  
  cur_line = 0;
  cur_step = 1;
  guide_step = 0;
  D = 0;
  Q = 0;
  fStep1_1 = false;
  pointpos = 1;
  
  const rightCols = Math.max(20, numInputCells + 10);
  clearGridRow(0, 13, 12 + rightCols);
  for (let r = 1; r < inputs.length; r++) {
    if (r === 1) {
      clearGridRow(r, 0, 11);
    } else {
      clearGridRow(r, 0, 12 + rightCols);
    }
  }

  // Hide the guide tooltip and clear content
  const tooltip = document.getElementById("guide-tooltip");
  if (tooltip) {
    tooltip.classList.add("hidden");
  }
  const tooltipContent = document.getElementById("tooltip-content");
  if (tooltipContent) {
    tooltipContent.innerHTML = "";
  }

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
  guide();
}

init(2);

window.addEventListener("resize", positionTooltip);
window.addEventListener("scroll", positionTooltip);
