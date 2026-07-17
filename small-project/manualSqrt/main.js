let max_line = 8;
var inputs = new Array();
var lines;
var cur_step = 1;
var cur_line = 0;
var fStep1_1 = false;
var fStep0_1 = false;
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
  [ // 0
    "Find the square root of <em>$init_val</em>.",
    "<em>$init_val</em>의 제곱근을 구합니다.",
  ],
  [ // 1
    "Click the [>] button.",
    "[>] 버튼을 누릅니다.",
  ],
  [ // 2 (Quotient decision L=0)
    "Find <span class=\"math-var\">x</span> where <span class=\"math-var\">x</span><sup>2</sup> &le; <em>$argv1</em>. <span class=\"math-var\">x</span> = <em>$Q</em>.",
    "<span class=\"math-var\">x</span><sup>2</sup> &le; <em>$argv1</em>을 만족하는 <span class=\"math-var\">x</span> = <em>$Q</em> 입니다."
  ],
  [ // 3 (x=Q를 작성합니다)
    "Write <em>$Q</em>.",
    "<em>$Q</em>$eul_leul 작성합니다."
  ],
  [ // 4 (D × Q를 구합니다)
    "<em>$D</em> &times; <em>$Q</em> = <em>$argv1_raw</em>",
    "<em>$D</em> &times; <em>$Q</em> = <em>$argv1_raw</em>"
  ],
  [ // 5 (뺄셈 단계)
    "<em>$argv2</em> - <em>$argv1</em> = <em>$argv3</em>",
    "<em>$argv2</em> - <em>$argv1</em> = <em>$argv3</em>"
  ],
  [ // 6 (수 내리기 단계)
    "Append '<em>$argv4</em>'.",
    "'<em>$argv4</em>'$argv4_eul_leul 붙입니다."
  ],
  [ // 7 (제수 더하기 단계)
    "<em>$argv1</em> + <em>$argv2</em> = <em>$D</em>",
    "<em>$argv1</em> + <em>$argv2</em> = <em>$D</em>"
  ],
  [ // 8 (다음 몫 구하기 단계)
    "Find <span class=\"math-box\">?</span> where <span class=\"math-var\">$argv1</span><span class=\"math-box\">?</span> &times; <span class=\"math-box\">?</span> &le; <em>$N</em>.<br>Since $D &times; $Q &le; $N, <span class=\"math-box\">?</span> is equal to <em>$Q</em>.",
    "<span class=\"math-var\">$argv1</span><span class=\"math-box\">?</span> &times; <span class=\"math-box\">?</span> &le; <em>$N</em>인 <span class=\"math-box\">?</span>를 찾습니다.<br>$D &times; $Q &le; $N이므로 <span class=\"math-box\">?</span>=<em>$Q</em> 입니다."
  ],
  [ // 9 (Q를 제수 아래에 작성합니다)
    "Write <em>$Q</em>.",
    "<em>$Q</em>$eul_leul 작성합니다."
  ],
  [ // 10 (가장 뒷자리에 Q를 붙여줍니다)
    "Append <em>$Q</em> to the end of the number.",
    "뒷 자리에 <em>$Q</em>$eul_leul 붙여 줍니다."
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
  if (groupIndex < 0) return 13;
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

function getDotCol() {
  const inputCells = document.querySelectorAll(".init-input-cell");
  for (let cell of inputCells) {
    if (cell.value === ".") {
      return parseInt(cell.dataset.col);
    }
  }
  return -1;
}

function adjustStartForDot(startCol, endCol) {
  const dotCol = getDotCol();
  if (dotCol !== -1 && startCol <= dotCol && dotCol <= endCol) {
    return startCol - 1;
  }
  return startCol;
}

function getUpperNumberLen(line) {
  if (line === 0) {
    const firstGroup = getDigitGroups(getInitValue())[0] || "";
    return firstGroup.length;
  }
  let prevBringDown = "";
  let prevProduct = "";
  if (line === 1) {
    prevBringDown = getDigitGroups(getInitValue())[0] || "";
    prevProduct = inputs[0][4] ? inputs[0][4].value : "";
  } else {
    prevBringDown = inputs[line - 1] ? inputs[line - 1][0].value : "";
    prevProduct = inputs[line - 1] ? inputs[line - 1][4].value : "";
  }
  const valBD = parseInt(prevBringDown) || 0;
  const valProd = parseInt(prevProduct) || 0;
  const remainder = valBD - valProd;
  const remainderLen = remainder.toString().length;
  
  const groupLen = 2;
  return remainderLen + groupLen;
}

function getLineShift(line) {
  let shift = 0;
  for (let k = line + 1; k <= cur_line; k++) {
    if (!inputs[k]) continue;
    let initLen = 1;
    if (k === 1) {
      const qVal = inputs[0][2] ? inputs[0][2].value : "";
      const divVal = inputs[0][1] ? inputs[0][1].value : "";
      const prevD = parseInt(divVal) || 0;
      const prevQ = parseInt(qVal) || 0;
      initLen = (prevD + prevQ).toString().length;
    } else {
      const prevDiv = inputs[k - 1] ? inputs[k - 1][1].value : "";
      const prevMult = inputs[k - 1] ? inputs[k - 1][2].value : "";
      const prevD = parseInt(prevDiv) || 0;
      const prevQ = parseInt(prevMult) || 0;
      initLen = (prevD + prevQ).toString().length;
    }
    const currentDivVal = inputs[k][1] ? inputs[k][1].value : "";
    const currentLen = currentDivVal.length || initLen;
    const appended = Math.max(0, currentLen - initLen);
    shift += appended;
  }
  return shift;
}

function drawDivisorRow(r, type, valStr, animate) {
  const rowIdx = 2 * r + (type === 1 ? 1 : 2);
  clearGridRow(rowIdx, 0, 11);
  if (!valStr) return;
  
  const len = valStr.length;
  const shift = getLineShift(r);
  const startCol = Math.max(0, 12 - len - shift);
  
  for (let k = 0; k < len; k++) {
    const cell = getCell(rowIdx, startCol + k);
    if (cell) {
      const prevText = cell.textContent;
      cell.textContent = (valStr[k] === " ") ? "" : valStr[k];
      if (animate && cell.textContent !== "" && prevText === "") {
        cell.classList.add("grid-cell-animate");
      }
    }
  }
}

function getCell(r, c) {
  return document.querySelector(`.grid-cell[data-row="${r}"][data-col="${c}"], .init-input-cell[data-row="${r}"][data-col="${c}"]`);
}

function clearGridRow(r, startCol, endCol) {
  for (let c = startCol; c <= endCol; c++) {
    const cell = getCell(r, c);
    if (cell) {
      if (cell.tagName === "INPUT") {
        cell.value = "";
        cell.className = "init-input-cell division-bar";
        cell.classList.remove("active", "highlight-red", "highlight-blue", "highlight-green");
      } else {
        cell.textContent = "";
        cell.className = "grid-cell";
        if (r === 1) {
          if (c === 12) {
            cell.classList.add("division-bracket");
          } else if (c >= 13) {
            cell.classList.add("division-bar");
          }
        } else if (r >= 2 && r <= 16 && c === 12) {
          cell.classList.add("division-bracket-vertical");
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
      const usePrevAlign = fStep0_1 && (row === cur_line);
      const endCol = usePrevAlign ? getGroupEndCol(row - 1) : getGroupEndCol(row);
      
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
  } else if (type === 1 || type === 2) {
    for (let r = 0; r <= cur_line; r++) {
      if (inputs[r]) {
        const divVal = inputs[r][1] ? inputs[r][1].value : "";
        const div_Val = inputs[r][2] ? inputs[r][2].value : "";
        drawDivisorRow(r, 1, divVal, animate);
        drawDivisorRow(r, 2, div_Val, animate);
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

    // Append row headers for the new lines
    for (let r = 2 * i + 1; r <= 2 * i + 2; r++) {
      const rowHeader = document.createElement("div");
      rowHeader.className = "grid-header-cell row-header";
      rowHeader.style.gridRow = (r + 2).toString();
      rowHeader.style.gridColumn = "1";
      rowHeader.textContent = (r + 1).toString();
      grid.appendChild(rowHeader);
    }

    for (let r = 2 * i + 1; r <= 2 * i + 2; r++) {
      for (let c = 0; c < totalCols; c++) {
        const cell = document.createElement("div");
        cell.classList.add("grid-cell");
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.style.gridRow = (r + 2).toString();
        cell.style.gridColumn = (c + 2).toString();
        if (r >= 2 && r <= 16 && c === 12) {
          cell.classList.add("division-bracket-vertical");
        }
        grid.appendChild(cell);
      }
    }
  }

  grid.style.gridTemplateRows = `2rem repeat(${1 + 2 * neededLines}, 2rem)`;
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
  grid.style.gridTemplateColumns = `2rem repeat(12, 1.4rem) 1.4rem repeat(${rightCols}, 1.4rem)`;
  
  const totalCols = 13 + rightCols;
  const currentLines = inputs.length;
  const totalRows = 1 + 2 * currentLines;

  grid.style.gridTemplateRows = `2rem repeat(${totalRows}, 2rem)`;

  // Render corner cell
  const corner = document.createElement("div");
  corner.className = "grid-header-cell corner";
  corner.style.gridRow = "1";
  corner.style.gridColumn = "1";
  grid.appendChild(corner);

  // Render column headers
  for (let c = 0; c < totalCols; c++) {
    const colHeader = document.createElement("div");
    colHeader.className = "grid-header-cell col-header";
    colHeader.style.gridRow = "1";
    colHeader.style.gridColumn = (c + 2).toString();
    colHeader.textContent = getColLetter(c);
    grid.appendChild(colHeader);
  }

  // Render row headers
  for (let r = 0; r < totalRows; r++) {
    const rowHeader = document.createElement("div");
    rowHeader.className = "grid-header-cell row-header";
    rowHeader.style.gridRow = (r + 2).toString();
    rowHeader.style.gridColumn = "1";
    rowHeader.textContent = (r + 1).toString();
    grid.appendChild(rowHeader);
  }

  for (let r = 0; r < totalRows; r++) {
    for (let c = 0; c < totalCols; c++) {
      if (r === 1 && c >= 13 && c < 13 + numCells) {
        const idx = c - 13;
        const input = document.createElement("input");
        input.type = "text";
        input.maxLength = 1;
        input.classList.add("init-input-cell");
        input.classList.add("division-bar");
        input.dataset.row = r;
        input.dataset.col = c;
        input.dataset.index = idx;
        input.value = currentValues[idx] || "";
        input.style.gridRow = (r + 2).toString();
        input.style.gridColumn = (c + 2).toString();
        input.addEventListener("input", handleInitInput);
        input.addEventListener("keydown", handleInitKeydown);
        grid.appendChild(input);
      } else {
        const cell = document.createElement("div");
        cell.classList.add("grid-cell");
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.style.gridRow = (r + 2).toString();
        cell.style.gridColumn = (c + 2).toString();
        if (r === 1) {
          if (c === 12) {
            cell.classList.add("division-bracket");
          } else if (c >= 13) {
            cell.classList.add("division-bar");
          }
        } else if (r >= 2 && r <= 16 && c === 12) {
          cell.classList.add("division-bracket-vertical");
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

function formatSubtractionNumber(valStr, line) {
  const orig = getInitValue();
  const dotIdx = orig.indexOf(".");
  if (dotIdx === -1) {
    return valStr;
  }
  
  const intPart = orig.substring(0, dotIdx);
  const numIntDigits = getDigitGroups(intPart).join("").length;
  
  if (valStr.length <= numIntDigits) {
    return valStr;
  }
  return valStr.substring(0, numIntDigits) + "." + valStr.substring(numIntDigits);
}

function nextGuide() {
  guide_step++;
  console.log(`${guide_step} : N = ${N}, D = ${D}, Q = ${Q}, line = ${cur_line}, step = ${cur_step}`);
  
  if (guide_step >= 11) {
    // Loop guide_step back: 11 -> 4, 12 -> 5, etc.
    guide_step = 4 + ((guide_step - 4) % 7);
  }

  // Calculate arguments based on the resolved guide_step
  if (guide_step === 5) {
    // Subtraction step (STEP 4)
    argv1 = D * Q;
    argv2 = N;
    argv3 = N - D * Q;
  }
  else if (guide_step === 6) {
    // Bring down step
    const nextGrpIdx = cur_line;
    argv4 = (nextGrpIdx < digitGroups.length) ? digitGroups[nextGrpIdx] : "00";
  }
  else if (guide_step === 7) {
    // Divisor addition step
    const prevRow = inputs[cur_line - 1] || inputs[0];
    argv1 = prevRow[1] ? prevRow[1].value : "";
    argv2 = prevRow[2] ? prevRow[2].value : "";
  }
  else if (guide_step === 8) {
    // Guess next digit comparison
    const prevRow = inputs[cur_line - 1] || inputs[0];
    argv1 = (prevRow[1] && prevRow[2]) ? (parseInt(prevRow[1].value) + parseInt(prevRow[2].value)) : 0;
  }
  else if (guide_step === 2) {
    // For L=0 quotient decision
    argv1 = parseInt(digitGroups[0]).toString();
  }

  guide();
  saveState();
}

function getPostposition(digit, type) {
  const d = parseInt(digit);
  if (isNaN(d)) return "";
  if (type === "eul_leul") {
    return [0, 1, 3, 6, 7, 8].includes(d) ? "을" : "를";
  }
  return "";
}

function guide() {
  const eul_leul = getPostposition(Q, "eul_leul");
  const argv4_last = argv4.toString().slice(-1);
  const argv4_eul_leul = getPostposition(argv4_last, "eul_leul");

  const sentence = sentences[guide_step][language]
    .replaceAll("$init_val", getInitValue() || "2")
    .replaceAll("$argv1_raw", D * Q)
    .replaceAll("$argv1", argv1)
    .replaceAll("$argv2", argv2)
    .replaceAll("$argv3", argv3)
    .replaceAll("$argv4_eul_leul", argv4_eul_leul)
    .replaceAll("$argv4", argv4)
    .replaceAll("$N", N)
    .replaceAll("$D", D)
    .replaceAll("$Q", Q)
    .replaceAll("$eul_leul", eul_leul)
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
    cell.classList.remove("active", "highlight-red", "highlight-blue", "highlight-green");
  });
  document.querySelectorAll(".init-input-cell").forEach(cell => {
    cell.classList.remove("active", "highlight-red", "highlight-blue", "highlight-green");
  });

  // If initial input is empty, do nothing
  if (getInitValue() === "") {
    return;
  }

  // Handle highlights based on guide_step
  if (guide_step === 0 || guide_step === 1) {
    document.querySelectorAll(".init-input-cell").forEach(cell => {
      cell.classList.add("active");
    });
    positionTooltip();
    return;
  }

  if (guide_step === 2) {
    // STEP 1: 최초 몫 결정
    // Target: L2 (Row 1, Col 11)
    const cell = getCell(1, 11);
    if (cell) cell.classList.add("active");
    positionTooltip();
    return;
  }

  if (guide_step === 3) {
    // STEP 2: 최초 몫 쓰기 (L3에 쓰기)
    // Target: L3 (Row 2, Col 11)
    const cell = getCell(2, 11);
    if (cell) cell.classList.add("active");
    
    // Reference 1: L2 (Row 1, Col 11)
    const ref = getCell(1, 11);
    if (ref) ref.classList.add("highlight-red");
    
    positionTooltip();
    return;
  }

  if (guide_step === 10) {
    // STEP 9: 몫에 두 번째 몫 쓰기
    // Target: Quotient cell (Row 0, Col endCol)
    const endCol = getGroupEndCol(cur_line);
    const cell = getCell(0, endCol);
    if (cell) cell.classList.add("active");
    
    // Reference 1: Multiplier below divisor (Row 2*cur_line + 2, Col 11)
    const ref = getCell(2 * cur_line + 2, 11);
    if (ref) ref.classList.add("highlight-red");
    
    positionTooltip();
    return;
  }

  if (guide_step === 4) {
    if (cur_line === 0) {
      // STEP 3: 최초 곱연산 결과 쓰기
      // Target: N1 (Row 0, Col 13)
      const cell = getCell(0, 13);
      if (cell) cell.classList.add("active");
      
      // Reference 1: L2 (Row 1, Col 11)
      const r1 = getCell(1, 11);
      if (r1) r1.classList.add("highlight-red");
      
      // Reference 2: L3 (Row 2, Col 11)
      const r2 = getCell(2, 11);
      if (r2) r2.classList.add("highlight-blue");
    } else {
      // General product steps (e.g. STEP 10)
      const targetLine = cur_line - 1;
      const endCol = getGroupEndCol(targetLine);
      const prod = D * Q;
      const len = prod.toString().length;
      const startCol = adjustStartForDot(endCol - len + 1, endCol);
      
      // Target: Product cell(s)
      for (let c = startCol; c <= endCol; c++) {
        const cell = getCell(2 * targetLine + 2, c);
        if (cell) cell.classList.add("active");
      }
      
      // Source 1: Divisor on Row 2*targetLine + 1 (left)
      const prevDiv = inputs[targetLine] ? inputs[targetLine][1] : null;
      const divLen = prevDiv ? prevDiv.value.length : 1;
      const shift = getLineShift(targetLine);
      for (let c = 12 - divLen - shift; c <= 11 - shift; c++) {
        const cell = getCell(2 * targetLine + 1, c);
        if (cell) cell.classList.add("highlight-red");
      }
      
      // Source 2: Multiplier below divisor (Row 2*targetLine + 2, Col 11 - shift)
      const qCell = getCell(2 * targetLine + 2, 11 - shift);
      if (qCell) qCell.classList.add("highlight-blue");
    }
    positionTooltip();
    return;
  }

  if (guide_step === 5) {
    // Subtraction step
    let len = 1;
    if (cur_line === 1) {
      const groups = getDigitGroups(getInitValue());
      len = groups[0] ? groups[0].length : 1;
    } else {
      const prevVal = inputs[cur_line - 1] ? inputs[cur_line - 1][0].value : "";
      len = Math.max(1, prevVal.length);
    }
    const endCol = getGroupEndCol(cur_line - 1);
    const startCol = adjustStartForDot(endCol - len + 1, endCol);
    
    for (let c = startCol; c <= endCol; c++) {
      const cell = getCell(2 * cur_line + 1, c);
      if (cell) cell.classList.add("active");
      
      const s2 = getCell(2 * cur_line, c);
      if (s2) s2.classList.add("highlight-blue");
    }
    
    // Source 1 (Red reference): spans the exact length of the upper remainder + bring-down!
    const upperLen = getUpperNumberLen(cur_line - 1);
    const startColSource1 = adjustStartForDot(endCol - upperLen + 1, endCol);
    for (let c = startColSource1; c <= endCol; c++) {
      const s1 = getCell(2 * cur_line - 1, c);
      if (s1) s1.classList.add("highlight-red");
    }
    positionTooltip();
    return;
  }

  if (guide_step === 6) {
    // Bring down step
    const endCol = getGroupEndCol(cur_line);
    const groupLen = (cur_line === 0) ? getDigitGroups(getInitValue())[0].length : 2;
    const startCol = adjustStartForDot(endCol - groupLen + 1, endCol);
    for (let c = startCol; c <= endCol; c++) {
      const cell = getCell(2 * cur_line + 1, c);
      if (cell) cell.classList.add("active");
      
      const sourceCell = getCell(1, c);
      if (sourceCell) sourceCell.classList.add("highlight-red");
    }
    positionTooltip();
    return;
  }

  if (guide_step === 7) {
    // Divisor addition step (L+1 setup)
    const prevDivVal = inputs[cur_line - 1] ? inputs[cur_line - 1][1].value : "";
    const prevMultVal = inputs[cur_line - 1] ? inputs[cur_line - 1][2].value : "";
    
    const sumVal = (parseInt(prevDivVal) + parseInt(prevMultVal)).toString();
    const sumLen = sumVal.length;
    
    for (let c = 11 - sumLen + 1; c <= 11; c++) {
      const cell = getCell(2 * cur_line + 1, c);
      if (cell) cell.classList.add("active");
    }
    
    const prevShift = getLineShift(cur_line - 1);
    const divLen = prevDivVal.length;
    for (let c = 12 - divLen - prevShift; c <= 11 - prevShift; c++) {
      const cell = getCell(2 * cur_line - 1, c);
      if (cell) cell.classList.add("highlight-red");
    }
    
    const s2 = getCell(2 * cur_line, 11 - prevShift);
    if (s2) s2.classList.add("highlight-blue");
    
    positionTooltip();
    return;
  }

  if (guide_step === 8) {
    // STEP 7: 두 번째 몫 비교 및 결정
    // Target: L4 (Row 2*cur_line + 1, Col 11)
    const cell = getCell(2 * cur_line + 1, 11);
    if (cell) cell.classList.add("active");
    positionTooltip();
    return;
  }

  if (guide_step === 9) {
    // STEP 8: 제수 아래 보조제수 x 쓰기
    // Target: L5 (Row 2*cur_line + 2, Col 11)
    const cell = getCell(2 * cur_line + 2, 11);
    if (cell) cell.classList.add("active");
    
    // Reference 1: L4 (Row 2*cur_line + 1, Col 11)
    const ref = getCell(2 * cur_line + 1, 11);
    if (ref) ref.classList.add("highlight-red");
    
    positionTooltip();
    return;
  }
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
  let minTop = Infinity;

  activeCells.forEach(cell => {
    const rect = cell.getBoundingClientRect();
    if (rect.left < minLeft) minLeft = rect.left;
    if (rect.right > maxRight) maxRight = rect.right;
    if (rect.bottom > maxBottom) maxBottom = rect.bottom;
    if (rect.top < minTop) minTop = rect.top;
  });

  const width = maxRight - minLeft;
  
  let isQuotientRow = false;
  if (guide_step === 4 && cur_line === 0) {
    isQuotientRow = true;
  } else {
    activeCells.forEach(cell => {
      if (cell.dataset.row === "0") {
        isQuotientRow = true;
      }
    });
  }

  let top;
  if (isQuotientRow) {
    let baselineTop = minTop;
    const grid = document.getElementById("math-grid");
    if (grid) {
      baselineTop = grid.getBoundingClientRect().top;
    }
    top = baselineTop + window.scrollY - tooltip.offsetHeight - 12;
    tooltip.classList.add("placed-above");
  } else {
    top = maxBottom + window.scrollY + 10;
    tooltip.classList.remove("placed-above");
  }

  let rightmostCell = null;
  let maxCol = -1;
  activeCells.forEach(cell => {
    const c = parseInt(cell.dataset.col);
    if (c > maxCol) {
      maxCol = c;
      rightmostCell = cell;
    }
  });

  let left;
  if (rightmostCell) {
    const rRect = rightmostCell.getBoundingClientRect();
    left = rRect.left + window.scrollX + (rRect.width - tooltip.offsetWidth) / 2;
  } else {
    left = minLeft + window.scrollX + (width - tooltip.offsetWidth) / 2;
  }

  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${Math.max(10, Math.min(left, window.innerWidth - tooltip.offsetWidth - 10))}px`;
}

function saveState() {
  const state = {
    cur_line,
    cur_step,
    fStep1_1,
    fStep0_1,
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
  fStep0_1 = targetState.fStep0_1 || false;
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
      if (fStep0_1 && guide_step === 5) {
        fStep0_1 = false;
        const remainder = N - D * Q;
        const nextGroup = (cur_line < digitGroups.length) ? digitGroups[cur_line] : "00";
        N = remainder * 100 + parseInt(nextGroup);
        inputs[cur_line][cur_step].value = N.toString();
        cur_step--;
      } else if (cur_line > 0 && fStep1_1 && guide_step === 6) {
        fStep1_1 = false;
        D = D + D % 10;
        inputs[cur_line][1].value = D.toString();
      } else {
        cur_step--;
      }
      break;
    case 1:
      for (var i = 9; i >= 0; i--) {
        if ((D * 10 + i) * i <= N) {
          D = D * 10 + i;
          Q = i;
          inputs[cur_line][cur_step].value = D.toString();
          break;
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
    
    // Write subtraction remainder immediately so it is present when Subtraction Step displays!
    fStep0_1 = true;
    fStep1_1 = true;
    const remainder = N - D * Q;
    inputs[cur_line][cur_step].value = remainder.toString();
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
  pointpos = 1;
  
  const rightCols = Math.max(20, numInputCells + 10);
  const totalCols = 13 + rightCols;
  const totalRows = 1 + 2 * inputs.length;
  
  const clearRows = Math.max(17, totalRows);
  const clearCols = Math.max(28, totalCols);
  
  for (let r = 0; r < clearRows; r++) {
    clearGridRow(r, 0, clearCols - 1);
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

if (window.ResizeObserver) {
  const resizeObserver = new ResizeObserver(() => {
    positionTooltip();
  });
  resizeObserver.observe(document.body);
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
  const badge = document.getElementById("coordinate-badge");
  if (badge) {
    badge.textContent = (language === 1) ? `좌표: ${address}` : `Coord: ${address}`;
  }
}

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
