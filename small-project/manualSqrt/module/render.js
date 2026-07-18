// render.js - Grid Rendering, DOM Manipulation, and Visual Highlights

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
    const linesArr = [];
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
  grid.style.gridTemplateColumns = `3rem repeat(12, 1.4rem) 1.4rem repeat(${rightCols}, 1.4rem)`;
  
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
