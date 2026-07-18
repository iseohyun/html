// math.js - Mathematical Parsing, Alignment, and Algorithm Logic

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
    let pair = tempDec.substring(0, pairLength(tempDec));
    decGroups.push(pair);
    tempDec = tempDec.substring(pair.length);
  }
  
  groups.push(...decGroups);
  
  return groups;
}

function pairLength(str) {
  let pair = str.substring(0, 2);
  if (pair.length === 1) {
    pair += "0";
  }
  return pair.length;
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

  let res;
  if (groupIndex < allGroups.length) {
    const grp = allGroups[groupIndex];
    res = grp[grp.length - 1];
  } else {
    let lastEndCol = 13;
    if (allGroups.length > 0) {
      const lastGrp = allGroups[allGroups.length - 1];
      lastEndCol = lastGrp[lastGrp.length - 1];
    }
    if (dotIdx > lastEndCol) {
      lastEndCol = dotIdx;
    }
    res = lastEndCol + 2 * (groupIndex - allGroups.length + 1);
  }

  return res;
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
        autoFillInputRowForBringDown(true);
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

function autoFillInputRowForBringDown(force = false) {
  if (!force && guide_step !== 6) return;

  const inputCells = document.querySelectorAll(".init-input-cell");
  if (inputCells.length === 0) return;

  let dotCol = -1;
  let lastDigitCol = -1;

  inputCells.forEach((cell) => {
    const col = parseInt(cell.dataset.col);
    if (cell.value === ".") {
      dotCol = col;
    } else if (cell.value !== "") {
      if (col > lastDigitCol) {
        lastDigitCol = col;
      }
    }
  });

  let startCol, endCol;
  let newDotCol = dotCol;

  if (dotCol === -1) {
    if (lastDigitCol === -1) return;
    newDotCol = lastDigitCol + 1;
  }
  
  startCol = newDotCol + 2 * cur_line - 1;
  endCol = newDotCol + 2 * cur_line;

  const maxNeededCol = endCol;
  const maxIdx = maxNeededCol - 13;
  if (maxIdx >= numInputCells) {
    numInputCells = maxIdx + 1;
    rebuildGrid(numInputCells);
  }

  if (dotCol === -1) {
    const dotCell = document.querySelector(`.init-input-cell[data-col="${newDotCol}"]`);
    if (dotCell) {
      dotCell.value = ".";
    }
  }

  for (let c = startCol; c <= endCol; c++) {
    const sourceCell = document.querySelector(`.init-input-cell[data-col="${c}"]`);
    if (sourceCell && sourceCell.value === "") {
      sourceCell.value = "0";
    }
  }

  const startValueStr = getInitValue();
  if (startValueStr) {
    digitGroups = getDigitGroups(startValueStr);
    if (typeof inputs !== "undefined" && inputs[0] && inputs[0][0]) {
      inputs[0][0]._value = startValueStr;
    }
  }
}

window.autoFillInputRowForBringDown = autoFillInputRowForBringDown;
