// render.js - Grid Rendering and Highlight Control

function getCell(r, c) {
  if (r === -99 && c === -99) {
    return document.getElementById("resault");
  }
  return document.querySelector(`.grid-cell-input[data-row="${r}"][data-col="${c}"]`);
}

function getColLetter(c) {
  return String.fromCharCode(65 + c); // 0 -> A, 1 -> B, etc.
}

function updateGridCellDisplay(row, col, value, animate = true) {
  const cell = getCell(row, col);
  if (cell) {
    const prevVal = cell.value;
    cell.value = value;
    if (animate && value !== "" && prevVal === "") {
      cell.classList.add("grid-cell-animate");
      setTimeout(() => cell.classList.remove("grid-cell-animate"), 500);
    }
  }
}

function rebuildGrid() {
  const grid = document.getElementById("math-grid");
  if (!grid) return;

  grid.innerHTML = "";
  
  // Header col (3rem) + A (3rem) + B (7rem) + C (7rem) + D (3rem) + E (1rem) + F (7rem) + G (20rem)
  grid.style.gridTemplateColumns = `3rem 3rem 7rem 7rem 3rem 1rem 7rem 20rem`;
  grid.style.gridTemplateRows = `2rem repeat(${max_line}, 2.4rem)`;

  // Render corner cell
  const corner = document.createElement("div");
  corner.className = "grid-header-cell corner";
  corner.style.gridRow = "1";
  corner.style.gridColumn = "1";
  grid.appendChild(corner);

  // Render column headers A to G
  for (let c = 0; c < 7; c++) {
    const colHeader = document.createElement("div");
    colHeader.className = "grid-header-cell col-header";
    colHeader.style.gridRow = "1";
    colHeader.style.gridColumn = (c + 2).toString();
    colHeader.textContent = getColLetter(c);
    grid.appendChild(colHeader);
  }

  // Render row headers and inputs
  for (let r = 0; r < max_line; r++) {
    const rowHeader = document.createElement("div");
    rowHeader.className = "grid-header-cell row-header";
    rowHeader.style.gridRow = (r + 2).toString();
    rowHeader.style.gridColumn = "1";
    rowHeader.textContent = (r + 1).toString();
    grid.appendChild(rowHeader);

    // Create 7 cells (A to G) in the row
    for (let c = 0; c < 7; c++) {
      const cellWrapper = document.createElement("div");
      cellWrapper.className = "grid-cell-wrapper";
      cellWrapper.style.gridRow = (r + 2).toString();
      cellWrapper.style.gridColumn = (c + 2).toString();

      const input = document.createElement("input");
      input.type = "text";
      input.className = "grid-cell-input";
      input.dataset.row = r;
      input.dataset.col = c;
      
      // B1 (0, 1) and C1 (0, 2) in Row 1 (row 0) are editable initially
      if (r === 0 && (c === 1 || c === 2)) {
        input.classList.add("init-input-cell");
        input.readOnly = false;
        
        input.addEventListener("input", handleInitInput);
        input.addEventListener("keydown", handleInitKeydown);
      } else {
        input.readOnly = true;
        input.disabled = true;
      }

      cellWrapper.appendChild(input);
      grid.appendChild(cellWrapper);
    }
  }

  // Bind GridInput classes to the created input cells
  inputs.length = 0;
  for (let r = 0; r < max_line; r++) {
    const rowInputs = [];
    for (let c = 0; c < 7; c++) {
      rowInputs.push(new GridInput(r, c));
    }
    inputs.push(rowInputs);
  }
}

function clearAllHighlights() {
  const cells = document.querySelectorAll(".grid-cell-input");
  cells.forEach(cell => {
    cell.classList.remove("active", "highlight-red", "highlight-blue", "highlight-green", "highlight-purple", "bold-text");
  });
  const resElem = document.getElementById("resault");
  if (resElem) {
    resElem.classList.remove("active", "highlight-red", "highlight-blue", "highlight-green", "highlight-purple");
  }
}

function setCellHighlight(r, c, className) {
  if (r === -99 && c === -99) {
    const resElem = document.getElementById("resault");
    if (resElem) resElem.classList.add(className);
    return;
  }
  const cell = getCell(r, c);
  if (cell) {
    cell.classList.add(className);
  }
}

function highlightActiveStep() {
  clearAllHighlights();

  if (isFin) return;

  const stepObj = (cur_step === 0)
    ? stepsData[0]
    : ((window.actions && window.actions[cur_step - 1]) ? window.actions[cur_step - 1] : stepsData[cur_step]);
  if (!stepObj) return;

  // Highlight target cell (active)
  if (stepObj.targetCell && stepObj.targetCell.length === 2) {
    setCellHighlight(stepObj.targetCell[0], stepObj.targetCell[1], "active");
  }

  // Highlight reference cells
  if (stepObj.ref1 && stepObj.ref1.length === 2) {
    setCellHighlight(stepObj.ref1[0], stepObj.ref1[1], "highlight-red");
  }
  if (stepObj.ref2 && stepObj.ref2.length === 2) {
    setCellHighlight(stepObj.ref2[0], stepObj.ref2[1], "highlight-blue");
  }
  if (stepObj.ref3 && stepObj.ref3.length === 2) {
    setCellHighlight(stepObj.ref3[0], stepObj.ref3[1], "highlight-green");
  }
  if (stepObj.ref4 && stepObj.ref4.length === 2) {
    setCellHighlight(stepObj.ref4[0], stepObj.ref4[1], "highlight-purple");
  }

  // Bold Column F cells during Phase C
  const isPhaseC = stepObj.name && stepObj.name.startsWith("C-");
  for (let r = 0; r < max_line; r++) {
    const cellF = getCell(r, 5);
    if (cellF) {
      if (isPhaseC) {
        cellF.classList.add("bold-text");
      } else {
        cellF.classList.remove("bold-text");
      }
    }
  }
}
