// testRunner.js - Automated Test Runner

function colLetterToIdx(letter) {
  let col = 0;
  for (let i = 0; i < letter.length; i++) {
    col = col * 26 + (letter.charCodeAt(i) - 65 + 1);
  }
  return col - 1;
}

function parseCell(cellStr) {
  cellStr = cellStr.trim();
  if (cellStr === "resault") {
    return {
      col: -99,
      row: -99,
      name: "resault"
    };
  }
  const match = cellStr.match(/^([A-Z]+)([0-9]+)$/);
  if (!match) return null;
  return {
    col: colLetterToIdx(match[1]),
    row: parseInt(match[2]) - 1,
    name: cellStr
  };
}

function parseCellsList(str) {
  if (!str || str.includes("없음")) return [];
  return str.split(",")
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(parseCell)
    .filter(c => c !== null);
}

function normalizeText(text) {
  if (!text) return "";
  return text
    .replace(/\\n/g, " ")
    .replace(/\n/g, " ")
    .replace(/\$\$/g, "")         // Strip MathJax $$ markers
    .replace(/<br\s*\/?>/gi, " ") // Replace <br> with space
    .replace(/<[^>]+>/g, "")      // Strip all HTML/XML tags
    .replace(/\s+/g, " ")         // Collapse multiple whitespace
    .replace(/×/g, "x")           // Multiplication symbol to x
    .replace(/\s*([=+\-x≤&<>])\s*/g, "$1") // Strip spaces around operators
    .replace(/\s+(\uC740|\uB294|\uC774|\uAC00|\uC744|\uB97C|\uB85C)/g, "$1")
    .trim();
}

function parseTestCase(mdText) {
  const steps = [];
  // Split by **STEP or - **STEP (case insensitive)
  const sections = mdText.split(/(?:-?\s*\*\*STEP\s+)/i);
  
  for (let i = 1; i < sections.length; i++) {
    const sec = sections[i];
    const lines = sec.split("\n");
    // The first line contains the step name, e.g. "0**", "A-1-1**", "B-1**"
    const stepName = lines[0].replace(/\*/g, "").replace(/:/g, "").trim();
    if (!stepName) continue;

    let tooltipText = "";
    let tooltipPos = "";
    let ref1 = [];
    let ref2 = [];
    let ref3 = [];
    let ref4 = [];
    let target = [];
    let inputs = [];
    
    let collectingTooltip = false;

    for (let j = 1; j < lines.length; j++) {
      const line = lines[j].trim();
      if (line.includes("대상:")) {
        collectingTooltip = false;
        const targetStr = line.substring(line.indexOf("대상:") + 3).trim();
        target = parseCellsList(targetStr);
      } else if (line.includes("툴팁 위치:") || line.includes("툴팁 방향:")) {
        collectingTooltip = false;
        const posStr = line.substring(line.indexOf(":") + 1).trim();
        tooltipPos = posStr;
      } else if (line.includes("툴팁:")) {
        collectingTooltip = true;
        tooltipText = line.substring(line.indexOf("툴팁:") + 3).trim();
      } else if (line.includes("참조1:")) {
        collectingTooltip = false;
        ref1 = parseCellsList(line.substring(line.indexOf("참조1:") + 4).trim());
      } else if (line.includes("참조2:")) {
        collectingTooltip = false;
        ref2 = parseCellsList(line.substring(line.indexOf("참조2:") + 4).trim());
      } else if (line.includes("참조3:")) {
        collectingTooltip = false;
        ref3 = parseCellsList(line.substring(line.indexOf("참조3:") + 4).trim());
      } else if (line.includes("참조4:")) {
        collectingTooltip = false;
        ref4 = parseCellsList(line.substring(line.indexOf("참조4:") + 4).trim());
      } else if (line.includes("입력값:")) {
        collectingTooltip = false;
        const inputStr = line.substring(line.indexOf("입력값:") + 4).trim();
        if (!inputStr.includes("없음")) {
          inputStr.split(",").forEach(item => {
            const parts = item.split("=");
            if (parts.length === 2) {
              const cellStr = parts[0].trim();
              const valCleaned = parts[1].split("(")[0].trim().replace(/^['"]|['"]$/g, "");
              if (cellStr === "resault") {
                inputs.push({
                  row: -99,
                  col: -99,
                  name: "resault",
                  val: valCleaned
                });
              } else {
                const cell = parseCell(cellStr);
                if (cell) {
                  inputs.push({
                    row: cell.row,
                    col: cell.col,
                    name: cellStr,
                    val: valCleaned
                  });
                }
              }
            }
          });
        }
      } else if (collectingTooltip) {
        if (line.startsWith("- ") || line.includes(":") || line === "") {
          collectingTooltip = false;
        } else {
          tooltipText += " \n " + line;
        }
      }
    }
    
    steps.push({
      stepNum: stepName,
      desc: "",
      tooltipText: tooltipText.replace(/\\n/g, "\n"),
      tooltipPos,
      ref1,
      ref2,
      ref3,
      ref4,
      target,
      inputs
    });
  }
  return steps;
}

function getCellValue(r, c) {
  if (r === -99 && c === -99) {
    const resElem = document.getElementById("resault");
    return resElem ? resElem.textContent.trim() : "";
  }
  const cell = getCell(r, c);
  if (!cell) return "";
  return cell.value.trim();
}

function handleTestFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    runAutoTest(text);
  };
  reader.readAsText(file);
  event.target.value = "";
}

async function runAutoTest(mdText) {
  window.isTesting = true;

  let overlay = document.getElementById("test-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "test-overlay";
    overlay.className = "test-overlay-modal";
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div class="test-modal-card">
      <div class="test-modal-header">
        <h2>자동 테스트 검증기 (Auto Test Runner)</h2>
        <button class="test-modal-close" onclick="closeTestOverlay()">&times;</button>
      </div>
      <div id="test-progress-msg" class="test-progress-msg">테스트 준비 중...</div>
      <div class="test-progress-bar-container">
        <div id="test-progress-bar" class="test-progress-bar" style="width: 0%;"></div>
      </div>
      <div id="test-results-list" class="test-results-list"></div>
      <div class="test-modal-footer" style="margin-top: 15px; display: flex; justify-content: flex-end;">
        <button id="test-copy-btn" class="test-copy-btn" style="background-color: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: background-color 0.2s;" onclick="copyTestResults()" disabled>클립보드에 결과 복사</button>
      </div>
    </div>
  `;
  overlay.classList.remove("hidden");

  const progressMsg = document.getElementById("test-progress-msg");
  const progressBar = document.getElementById("test-progress-bar");
  const resultsList = document.getElementById("test-results-list");
  const copyBtn = document.getElementById("test-copy-btn");

  try {
    progressMsg.textContent = "테스트 파일 파싱 중...";
    const expectedSteps = parseTestCase(mdText);
    
    if (expectedSteps.length === 0) {
      throw new Error("파일에서 STEP 정보를 파싱하지 못했습니다. 형식을 확인해주세요.");
    }

    let startA = 6192, startB = 1012;
    const firstLine = mdText.split("\n")[0].trim();
    const inputMatch = firstLine.match(/(?:입력값|시나리오)\s*:\s*(?:A\s*=\s*)?([0-9]+)\s*,\s*(?:B\s*=\s*)?([0-9]+)/i);
    if (inputMatch) {
      startA = parseInt(inputMatch[1]);
      startB = parseInt(inputMatch[2]);
    }

    progressMsg.textContent = `그리드를 초기값 A='${startA}', B='${startB}'으로 리셋 중...`;
    
    resetToStart();
    
    const cellA = getCell(0, 1);
    const cellB = getCell(0, 2);
    if (cellA) cellA.value = startA;
    if (cellB) cellB.value = startB;
    
    init(startA, startB);
    
    await new Promise(r => setTimeout(r, 100));

    const results = [];
    const debugLogs = [];
    let passCount = 0;

    for (let idx = 0; idx < expectedSteps.length; idx++) {
      const step = expectedSteps[idx];
      const logLine = `[idx:${idx} step:${step.stepNum}] cur_step=${cur_step}, A=${A}, B=${B}, gcd=${gcd}`;
      console.log(logLine);
      debugLogs.push(logLine);

      progressMsg.textContent = `STEP ${step.stepNum} 검증 중 (${idx + 1}/${expectedSteps.length})`;
      progressBar.style.width = `${((idx) / expectedSteps.length) * 100}%`;
      await new Promise(r => setTimeout(r, 80));

      const stepErrors = [];

      // 1. Verify Tooltip Text (normalized)
      let actualTooltip = "";
      if (window.getGuideSentence) {
        actualTooltip = normalizeText(window.getGuideSentence());
      } else {
        const tooltipElem = document.getElementById("tooltip-content");
        actualTooltip = tooltipElem ? normalizeText(tooltipElem.innerHTML) : "";
      }
      const expectedTooltip = normalizeText(step.tooltipText);
      if (actualTooltip !== expectedTooltip) {
        stepErrors.push(`툴팁 내용 불일치: (기대값: "${expectedTooltip}" | 실젯값: "${actualTooltip}")`);
      }

      // 2. Verify Tooltip Position (Above vs Below)
      const tooltipBox = document.getElementById("guide-tooltip");
      if (tooltipBox) {
        const isPlacedAbove = tooltipBox.classList.contains("placed-above");
        const expectsAbove = step.tooltipPos.includes("위쪽");
        if (isPlacedAbove !== expectsAbove) {
          console.warn(`Tooltip direction mismatch: (expected: ${expectsAbove ? "above" : "below"} | actual: ${isPlacedAbove ? "above" : "below"})`);
        }
      } else {
        stepErrors.push("툴팁 요소를 찾을 수 없음");
      }

      // 3. Verify Target (Highlight active cells)
      step.target.forEach(cell => {
        const cellElem = getCell(cell.row, cell.col);
        if (!cellElem) {
          stepErrors.push(`Target 셀 [${cell.name}]을 찾을 수 없음`);
        } else if (!cellElem.classList.contains("active")) {
          stepErrors.push(`Target 셀 [${cell.name}] 노란색 하이라이트(active) 누락`);
        }
      });
      // Check for unexpected active cells
      const activeCells = document.querySelectorAll(".grid-cell-input.active, #resault.active");
      activeCells.forEach(cell => {
        if (cell.id === "resault") {
          const inExpected = step.target.some(tc => tc.row === -99 && tc.col === -99);
          if (!inExpected) {
            stepErrors.push(`의도하지 않은 active 결과 창 감지`);
          }
        } else {
          const r = parseInt(cell.dataset.row);
          const c = parseInt(cell.dataset.col);
          const inExpected = step.target.some(tc => tc.row === r && tc.col === c);
          if (!inExpected) {
            const colLetter = String.fromCharCode(c + 65);
            stepErrors.push(`의도하지 않은 active 셀 감지: [${colLetter}${r + 1}]`);
          }
        }
      });

      // 4. Verify Reference 1 (Highlight-red)
      step.ref1.forEach(cell => {
        const cellElem = getCell(cell.row, cell.col);
        if (!cellElem) {
          stepErrors.push(`참조1 셀 [${cell.name}]을 찾을 수 없음`);
        } else if (!cellElem.classList.contains("highlight-red")) {
          stepErrors.push(`참조1 셀 [${cell.name}] 연한 붉은색 하이라이트(highlight-red) 누락`);
        }
      });
      // Check red highlights
      const redCells = document.querySelectorAll(".grid-cell-input.highlight-red, #resault.highlight-red");
      redCells.forEach(cell => {
        if (cell.id === "resault") {
          const inExpected = step.ref1.some(tc => tc.row === -99 && tc.col === -99);
          if (!inExpected) stepErrors.push(`의도하지 않은 highlight-red 결과 창 감지`);
        } else {
          const r = parseInt(cell.dataset.row);
          const c = parseInt(cell.dataset.col);
          const inExpected = step.ref1.some(tc => tc.row === r && tc.col === c);
          if (!inExpected) {
            const colLetter = String.fromCharCode(c + 65);
            stepErrors.push(`의도하지 않은 highlight-red 셀 감지: [${colLetter}${r + 1}]`);
          }
        }
      });

      // 5. Verify Reference 2 (Highlight-blue)
      step.ref2.forEach(cell => {
        const cellElem = getCell(cell.row, cell.col);
        if (!cellElem) {
          stepErrors.push(`참조2 셀 [${cell.name}]을 찾을 수 없음`);
        } else if (!cellElem.classList.contains("highlight-blue")) {
          stepErrors.push(`참조2 셀 [${cell.name}] 연한 파란색 하이라이트(highlight-blue) 누락`);
        }
      });
      // Check blue highlights
      const blueCells = document.querySelectorAll(".grid-cell-input.highlight-blue, #resault.highlight-blue");
      blueCells.forEach(cell => {
        if (cell.id === "resault") {
          const inExpected = step.ref2.some(tc => tc.row === -99 && tc.col === -99);
          if (!inExpected) stepErrors.push(`의도하지 않은 highlight-blue 결과 창 감지`);
        } else {
          const r = parseInt(cell.dataset.row);
          const c = parseInt(cell.dataset.col);
          const inExpected = step.ref2.some(tc => tc.row === r && tc.col === c);
          if (!inExpected) {
            const colLetter = String.fromCharCode(c + 65);
            stepErrors.push(`의도하지 않은 highlight-blue 셀 감지: [${colLetter}${r + 1}]`);
          }
        }
      });

      // 5.1. Verify Reference 3 (Highlight-green)
      step.ref3.forEach(cell => {
        const cellElem = getCell(cell.row, cell.col);
        if (!cellElem) {
          stepErrors.push(`참조3 셀 [${cell.name}]을 찾을 수 없음`);
        } else if (!cellElem.classList.contains("highlight-green")) {
          stepErrors.push(`참조3 셀 [${cell.name}] 연한 초록색 하이라이트(highlight-green) 누락`);
        }
      });

      // 5.2. Verify Reference 4 (Highlight-purple)
      step.ref4.forEach(cell => {
        const cellElem = getCell(cell.row, cell.col);
        if (!cellElem) {
          stepErrors.push(`참조4 셀 [${cell.name}]을 찾을 수 없음`);
        } else if (!cellElem.classList.contains("highlight-purple")) {
          stepErrors.push(`참조4 셀 [${cell.name}] 연한 보라색 하이라이트(highlight-purple) 누락`);
        }
      });
      // Check green highlights
      const greenCells = document.querySelectorAll(".grid-cell-input.highlight-green, #resault.highlight-green");
      greenCells.forEach(cell => {
        if (cell.id === "resault") {
          const inExpected = step.ref3.some(tc => tc.row === -99 && tc.col === -99);
          if (!inExpected) stepErrors.push(`의도하지 않은 highlight-green 결과 창 감지`);
        } else {
          const r = parseInt(cell.dataset.row);
          const c = parseInt(cell.dataset.col);
          const inExpected = step.ref3.some(tc => tc.row === r && tc.col === c);
          if (!inExpected) {
            const colLetter = String.fromCharCode(c + 65);
            stepErrors.push(`의도하지 않은 highlight-green 셀 감지: [${colLetter}${r + 1}]`);
          }
        }
      });
      // Check purple highlights
      const purpleCells = document.querySelectorAll(".grid-cell-input.highlight-purple, #resault.highlight-purple");
      purpleCells.forEach(cell => {
        if (cell.id === "resault") {
          const inExpected = step.ref4.some(tc => tc.row === -99 && tc.col === -99);
          if (!inExpected) stepErrors.push(`의도하지 않은 highlight-purple 결과 창 감지`);
        } else {
          const r = parseInt(cell.dataset.row);
          const c = parseInt(cell.dataset.col);
          const inExpected = step.ref4.some(tc => tc.row === r && tc.col === c);
          if (!inExpected) {
            const colLetter = String.fromCharCode(c + 65);
            stepErrors.push(`의도하지 않은 highlight-purple 셀 감지: [${colLetter}${r + 1}]`);
          }
        }
      });

      // 6. Verify Input Values
      step.inputs.forEach(inp => {
        const actualVal = getCellValue(inp.row, inp.col);
        const normActual = normalizeText(actualVal);
        const normExpected = normalizeText(inp.val);
        if (normActual !== normExpected) {
          stepErrors.push(`셀 값 불일치: [${inp.name}] (기대값: "${normExpected}" | 실젯값: "${normActual}")`);
        }
      });

      const isPass = stepErrors.length === 0;
      if (isPass) passCount++;
      results.push({
        step: step.stepNum,
        cycleStep: (typeof getCycleStepString === "function") ? getCycleStepString() : `Step ${step.stepNum}`,
        desc: step.desc,
        isPass,
        errors: stepErrors
      });

      // Advance to next step
      if (idx < expectedSteps.length - 1) {
        nextStep();
      }
    }

    progressBar.style.width = "100%";
    progressMsg.innerHTML = `검증 완료! <span class="${passCount === expectedSteps.length ? 'text-green-bold' : 'text-red-bold'}">성공: ${passCount} / ${expectedSteps.length} Steps</span>`;

    // Render results
    resultsList.innerHTML = results.map(r => `
      <div class="test-result-item ${r.isPass ? 'pass' : 'fail'}">
        <div class="test-result-header">
          <span class="test-badge ${r.isPass ? 'badge-pass' : 'badge-fail'}">${r.isPass ? 'PASS' : 'FAIL'}</span>
          <strong>STEP ${r.step} (${r.cycleStep})</strong>
        </div>
        ${r.errors.length > 0 ? `
          <ul class="test-error-list">
            ${r.errors.map(err => `<li>${err}</li>`).join("")}
          </ul>
        ` : ""}
      </div>
    `).join("") + `
      <div style="margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
        <h4 style="margin: 0 0 10px 0; color: #475569; text-align: left;">실행 상태 디버그 로그 (Debug Trace Logs)</h4>
        <pre id="test-debug-logs" style="background-color: #f1f5f9; padding: 10px; border-radius: 6px; font-family: monospace; font-size: 0.8rem; max-height: 150px; overflow-y: auto; text-align: left; white-space: pre-wrap; margin: 0; color: #334155;">${debugLogs.join("\n")}</pre>
      </div>
    `;

    if (copyBtn) copyBtn.disabled = false;

  } catch (err) {
    progressMsg.innerHTML = `<span style="color: #ef4444; font-weight: bold;">오류 발생: ${err.message}</span>`;
  } finally {
    window.isTesting = false;
  }
}

function copyTestResults() {
  const results = [];
  const items = document.querySelectorAll(".test-result-item");
  items.forEach(item => {
    const header = item.querySelector(".test-result-header").textContent.replace(/\s+/g, " ").trim();
    const errorList = item.querySelector(".test-error-list");
    let errorsText = "";
    if (errorList) {
      const errorLIs = errorList.querySelectorAll("li");
      const errs = [];
      errorLIs.forEach(li => errs.push("- " + li.textContent.trim()));
      errorsText = "\n" + errs.join("\n");
    }
    results.push(header + errorsText);
  });
  
  const debugPre = document.getElementById("test-debug-logs");
  if (debugPre) {
    results.push("\n=== DEBUG TRACE LOGS ===\n" + debugPre.textContent.trim());
  }

  const finalText = results.join("\n\n");
  navigator.clipboard.writeText(finalText).then(() => {
    const copyBtn = document.getElementById("test-copy-btn");
    if (copyBtn) {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = "복사 완료! ✓";
      copyBtn.style.backgroundColor = "#10b981";
      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.style.backgroundColor = "#3b82f6";
      }, 1500);
    }
  }).catch(err => {
    alert("클립보드 복사에 실패했습니다: " + err);
  });
}

function closeTestOverlay() {
  const overlay = document.getElementById("test-overlay");
  if (overlay) overlay.classList.add("hidden");
  resetToStart();
}

function generateTestCase(A, B) {
  const oldA = window.A;
  const oldB = window.B;
  const oldStep = window.cur_step;
  const oldLanguage = window.language;
  const oldMaxLine = window.max_line;

  window.A = A;
  window.B = B;
  window.language = 1; // Korean
  
  const reqRows = getRequiredRows(A, B);
  window.max_line = Math.max(7, reqRows);
  window.rebuildGrid();
  
  window.V = [];
  for (let i = 0; i < window.max_line; i++) {
    window.V.push([[0, 0, 0, 0], [0, 0, 0, 0], [0, 0]]);
  }
  window.V[0][0][0] = A;
  window.V[0][1][0] = B;
  window.inputs[0][1].value = A;
  window.inputs[0][2].value = B;
  window.gcd = getGcd(A, B);

  buildActionsList(A, B);
  window.isGreating = false;

  let md = `### 시나리오: ${A}, ${B}\n\n`;
  md += `- **STEP 0**\n`;
  md += `  - 대상: B1\n`;
  md += `  - 툴팁 방향: 아래쪽\n`;
  md += `  - 툴팁: ${A}, ${B}로 유클리드 호제법을 수행합니다. \\n $$ ax${A}+bx${B}=gcd $$를 찾는 것이 목표입니다.\n`;
  md += `  - 입력값: B1=${A}, C1=${B}\n\n`;

  function colIndexToLetter(col) {
    return ['A', 'B', 'C', 'D', 'E', 'F', 'G'][col];
  }
  function cellName(r, c) {
    if (r === -99 && c === -99) return "resault";
    return `${colIndexToLetter(c)}${r + 1}`;
  }

  for (let s = 0; s < window.actions.length; s++) {
    const action = window.actions[s];
    window.cur_step = s + 1;
    
    // Use actual application function to generate the exact expected guide sentence
    const tooltipText = window.getGuideSentence();
    
    md += `- **STEP ${action.name}**\n`;
    md += `  - 대상: ${cellName(action.targetCell[0], action.targetCell[1])}\n`;
    
    let tooltipPos = "아래쪽";
    const matchA2 = action.name.match(/^A-(\d+)-2$/);
    if (matchA2) {
      const cycleNum = parseInt(matchA2[1]);
      if (cycleNum % 2 === 0) {
        tooltipPos = "위쪽";
      }
    }
    md += `  - 툴팁 방향: ${tooltipPos}\n`;
    md += `  - 툴팁: ${tooltipText}\n`;

    if (action.ref1 && action.ref1.length === 2) {
      md += `  - 참조1: ${cellName(action.ref1[0], action.ref1[1])}\n`;
    }
    if (action.ref2 && action.ref2.length === 2) {
      md += `  - 참조2: ${cellName(action.ref2[0], action.ref2[1])}\n`;
    }
    if (action.ref3 && action.ref3.length === 2) {
      md += `  - 참조3: ${cellName(action.ref3[0], action.ref3[1])}\n`;
    }
    if (action.ref4 && action.ref4.length === 2) {
      md += `  - 참조4: ${cellName(action.ref4[0], action.ref4[1])}\n`;
    }

    let inputValLine = "";
    if (action.phase === 'A' || action.phase === 'B') {
      const cellVal = window.getCell(action.targetCell[0], action.targetCell[1]).value;
      inputValLine = `${cellName(action.targetCell[0], action.targetCell[1])} = ${cellVal}`;
    } else if (action.phase === 'C') {
      const eq = window.phaseCEquations[action.eqIdx];
      const cleanEq = eq.replace(/<[^>]+>/g, "");
      inputValLine = `resault = "${cleanEq}"`;
    } else if (action.phase === 'D') {
      const valA = A;
      const valB = B;
      const coeffA = window.final_A_coeff;
      const coeffB = window.final_B_coeff;
      const termA = valA * coeffA;
      const termB = valB * coeffB;
      const absA = Math.abs(termA);
      const expr = termB >= 0 
        ? `${termB} - ${absA} = ${gcd}`
        : `${termA} - ${Math.abs(termB)} = ${gcd}`;
      inputValLine = `resault = "GCD = ${expr}"`;
    }
    md += `  - 입력값: ${inputValLine}\n\n`;
    
    window.nextStep();
  }

  window.A = oldA;
  window.B = oldB;
  window.cur_step = oldStep;
  window.language = oldLanguage;
  window.max_line = oldMaxLine;
  window.init();

  return md;
}

window.closeTestOverlay = closeTestOverlay;
window.handleTestFileSelect = handleTestFileSelect;
window.runAutoTest = runAutoTest;
window.copyTestResults = copyTestResults;
window.generateTestCase = generateTestCase;

// Embedded testcases data
const EXAMPLES = {
  "tc/testcase_6192_1012.md": "### \uC2DC\uB098\uB9AC\uC624: 6192, 1012\n\n- **STEP 0**\n  - \uB300\uC0C1: B1\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: 6192, 1012\uB85C \uC720\uD074\uB9AC\uB4DC \uD638\uC81C\uBC95\uC744 \uC218\uD589\uD569\uB2C8\uB2E4. \\n\n  $$ a \u00D7 6192 + b \u00D7 1012 = gcd $$\uB97C \uCC3E\uB294 \uAC83\uC774 \uBAA9\uD45C\uC785\uB2C8\uB2E4.\n  - \uC785\uB825\uAC12: B1=6192, C1=1012\n\n- **STEP A-1-1**\n  - \uB300\uC0C1: A2\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>6192</1> \u00F7 <2>1012</2> = <0>6</0> ... ?\n  - \uCC38\uC8701: B1\n  - \uCC38\uC8702: C1\n  - \uC785\uB825\uAC12: A2 = 6\n\n- **STEP A-1-2**\n  - \uB300\uC0C1: B2\n  - \uD234\uD301: <1>1012</1> \u00D7 <2>6</2> = <0>6072</0>\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uCC38\uC8701: C1\n  - \uCC38\uC8702: A2\n  - \uC785\uB825\uAC12: B2 = 6072\n\n- **STEP A-1-3**\n  - \uB300\uC0C1: B3\n  - \uD234\uD301: <1>6192</1> - <2>6072</2> = <0>120</0>\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uCC38\uC8701: B1\n  - \uCC38\uC8702: B2\n  - \uC785\uB825\uAC12: B3 = 120\n\n- **STEP A-2-1**\n  - \uB300\uC0C1: D2\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>1012</1> \u00F7 <2>120</2> = <0>8</0> ... ?\n  - \uCC38\uC8701: C1\n  - \uCC38\uC8702: B3\n  - \uC785\uB825\uAC12: D2 = 8\n\n- **STEP A-2-2**\n  - \uB300\uC0C1: C2\n  - \uD234\uD301: <1>120</1> \u00D7 <2>8</2> = <0>960</0>\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uCC38\uC8701: B3\n  - \uCC38\uC8702: D2\n  - \uC785\uB825\uAC12: C2 = 960\n\n- **STEP A-2-3**\n  - \uB300\uC0C1: C3\n  - \uD234\uD301: <1>1012</1> - <2>960</2> = <0>52</0>\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uCC38\uC8701: C1\n  - \uCC38\uC8702: C2\n  - \uC785\uB825\uAC12: C3 = 52\n\n- **STEP A-3-1**\n  - \uB300\uC0C1: A4\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>120</1> \u00F7 <2>52</2> = <0>2</0> ... ?\n  - \uCC38\uC8701: B3\n  - \uCC38\uC8702: C3\n  - \uC785\uB825\uAC12: A4 = 2\n\n- **STEP A-3-2**\n  - \uB300\uC0C1: B4\n  - \uD234\uD301: <1>52</1> \u00D7 <2>2</2> = <0>104</0>\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uCC38\uC8701: C3\n  - \uCC38\uC8702: A4\n  - \uC785\uB825\uAC12: B4 = 104\n\n- **STEP A-3-3**\n  - \uB300\uC0C1: B5\n  - \uD234\uD301: <1>120</1> - <2>104</2> = <0>16</0>\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uCC38\uC8701: B3\n  - \uCC38\uC8702: B4\n  - \uC785\uB825\uAC12: B5 = 16\n\n- **STEP A-4-1**\n  - \uB300\uC0C1: D4\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>52</1> \u00F7 <2>16</2> = <0>3</0> ... ?\n  - \uCC38\uC8701: C3\n  - \uCC38\uC8702: B5\n  - \uC785\uB825\uAC12: D4 = 3\n\n- **STEP A-4-2**\n  - \uB300\uC0C1: C4\n  - \uD234\uD301: <1>16</1> \u00D7 <2>3</2> = <0>48</0>\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uCC38\uC8701: B5\n  - \uCC38\uC8702: D4\n  - \uC785\uB825\uAC12: C4 = 48\n\n- **STEP A-4-3**\n  - \uB300\uC0C1: C5\n  - \uD234\uD301: <1>52</1> - <2>48</2> = <0>4</0>\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uCC38\uC8701: C3\n  - \uCC38\uC8702: C4\n  - \uC785\uB825\uAC12: C5 = 4\n\n- **STEP A-5-1**\n  - \uB300\uC0C1: A6\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>16</1> \u00F7 <2>4</2> = <0>4</0> ... ?\n  - \uCC38\uC8701: B5\n  - \uCC38\uC8702: C5\n  - \uC785\uB825\uAC12: A6 = 4\n\n- **STEP A-5-2**\n  - \uB300\uC0C1: B6\n  - \uD234\uD301: <1>4</1> \u00D7 <2>4</2> = <0>16</0>\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uCC38\uC8701: C5\n  - \uCC38\uC8702: A6\n  - \uC785\uB825\uAC12: B6 = 16\n\n- **STEP A-5-3**\n  - \uB300\uC0C1: B7\n  - \uD234\uD301: <1>16</1> - <2>16</2> = <0>0</0> <\uC885\uB8CC>\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uCC38\uC8701: B5\n  - \uCC38\uC8702: B6\n  - \uC785\uB825\uAC12: B7 = 0\n\n  **STEP B-1**\n  - \uB300\uC0C1: F1\n  - \uD234\uD301: A = <1>6192</1>\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uCC38\uC8701: B1\n  - \uC785\uB825\uAC12: F1 = 6192, G1 = A\n\n  **STEP B-2**\n  - \uB300\uC0C1: F2\n  - \uD234\uD301: B = <1>1012</1>\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uCC38\uC8701: C1\n  - \uC785\uB825\uAC12: F2 = 1012, G2 = B\n\n  **STEP B-3**\n  - \uB300\uC0C1: F3\n  - \uD234\uD301: <1>120</1> = <2>6192</2> - <3>1012</3> \u00D7 <4>6</4>\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uCC38\uC8701: B3\n  - \uCC38\uC8702: B1\n  - \uCC38\uC8703: C1\n  - \uCC38\uC8704: A2\n  - \uC785\uB825\uAC12: F3 = 120, G3 = 6192 - 1012 \u00D7 6\n\n  **STEP B-4**\n  - \uB300\uC0C1: F4\n  - \uD234\uD301: <1>52</1> = <2>1012</2> - <3>120</3> \u00D7 <4>8</4>\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uCC38\uC8701: C3\n  - \uCC38\uC8702: C1\n  - \uCC38\uC8703: B3\n  - \uCC38\uC8704: D2\n  - \uC785\uB825\uAC12: F4 = 52, G4 = 1012 - 120 \u00D7 8\n\n  **STEP B-5**\n  - \uB300\uC0C1: F5\n  - \uD234\uD301: <1>16</1> = <2>120</2> - <3>52</3> \u00D7 <4>2</4>\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uCC38\uC8701: B5\n  - \uCC38\uC8702: B3\n  - \uCC38\uC8703: C3\n  - \uCC38\uC8704: A4\n  - \uC785\uB825\uAC12: F5 = 16, G5 = 120 - 52 \u00D7 2\n\n  **STEP B-6**\n  - \uB300\uC0C1: F6\n  - \uD234\uD301: <1>4</1>  = <2>52</2> - <3>16</3> \u00D7 <4>3</4>\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uCC38\uC8701: C5\n  - \uCC38\uC8702: C3\n  - \uCC38\uC8703: B5\n  - \uCC38\uC8704: D4\n  - \uC785\uB825\uAC12: F6 = 4, G6 = 52 - 16 \u00D7 3\n\n  **STEP C-1-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301: GCD(6192, 1012) = <1>4</1>\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB7AB\uCABD\n  - \uCC38\uC8701: G6\n  - \uCC38\uC8702: F6\n  - \uC785\uB825\uAC12: resault = \"<1>4</1> = <2>52 - 16 \u00D7 3</2>\"\n\n  **STEP C-1-2**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301: GCD \uB300\uC785\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB7AB\uCABD\n  - \uCC38\uC8701: G6\n  - \uCC38\uC8702: F6\n  - \uC785\uB825\uAC12: resault = \"GCD = <2>52 - 16 \u00D7 3</2>\"\n\n  **STEP C-1-3**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301: \uC2DD \uC815\uB82C\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB7AB\uCABD\n  - \uCC38\uC8701: G6\n  - \uCC38\uC8702: F6\n  - \uC785\uB825\uAC12: resault = \"GCD = 52 + 16 \u00D7 (-3)\"\n\n  **STEP C-2-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301: <1>16</1> \uB300\uC751\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB7AB\uCABD\n  - \uCC38\uC8701: F5\n  - \uCC38\uC8702: G5\n  - \uC785\uB825\uAC12: resault = \"GCD = 52 + (<2>120 - 52 \u00D7 2</2>) \u00D7 (-3)\"\n\n  **STEP C-2-2**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301: \uBD84\uBC30\uBC95\uCE59\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB7AB\uCABD\n  - \uCC38\uC8701: F5\n  - \uCC38\uC8702: G5\n  - \uC785\uB825\uAC12: resault = \"GCD = 52 + 120 \u00D7 (-3) + 52 \u00D7 6\"\n\n  **STEP C-2-3**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301: \uD56D\uC815\uB9AC\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB7AB\uCABD\n  - \uCC38\uC8701: F5\n  - \uCC38\uC8702: G5\n  - \uC785\uB825\uAC12: resault = \"GCD = 120 \u00D7 (-3) + 52 \u00D7 7\"\n\n  **STEP C-3-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301: <1>52</1> \uB300\uC751\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB7AB\uCABD\n  - \uCC38\uC8701: F4\n  - \uCC38\uC8702: G4\n  - \uC785\uB825\uAC12: resault = \"GCD = 120 \u00D7 (-3) + (<2>1012 - 120 \u00D7 8</2>) \u00D7 7\"\n\n  **STEP C-3-2**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301: \uBD84\uBC30\uBC95\uCE59\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB7AB\uCABD\n  - \uCC38\uC8701: F4\n  - \uCC38\uC8702: G4\n  - \uC785\uB825\uAC12: resault = \"GCD = 120 \u00D7 (-3) + 1012 \u00D7 7 + 120 \u00D7 (-56)\"\n\n  **STEP C-3-3**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301: \uD56D\uC815\uB9AC\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB7AB\uCABD\n  - \uCC38\uC8701: F4\n  - \uCC38\uC8702: G4\n  - \uC785\uB825\uAC12: resault = \"GCD = 1012 \u00D7 7 + 120 \u00D7 (-59)\"\n\n  **STEP C-4-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301: <1>120</1> \uB300\uC751\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB7AB\uCABD\n  - \uCC38\uC8701: F3\n  - \uCC38\uC8702: G3\n  - \uC785\uB825\uAC12: resault = \"GCD = 1012 \u00D7 7 + (<2>6192 - 1012 \u00D7 6</2>) \u00D7 (-59)\"\n\n  **STEP C-4-2**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301: \uBD84\uBC30\uBC95\uCE59\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB7AB\uCABD\n  - \uCC38\uC8701: F3\n  - \uCC38\uC8702: G3\n  - \uC785\uB825\uAC12: resault = \"GCD = 1012 \u00D7 7 + 6192 \u00D7 (-59) + 1012 \u00D7 354\"\n\n  **STEP C-4-3**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301: \uD56D\uC815\uB9AC\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB7AB\uCABD\n  - \uCC38\uC8701: F3\n  - \uCC38\uC8702: G3\n  - \uC785\uB825\uAC12: resault = \"GCD = 1012 \u00D7 361 + 6192 \u00D7 (-59)\"\n\n  **STEP C-5-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301: <1>1012</1>\uB300\uC785\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB7AB\uCABD\n  - \uCC38\uC8701: F2\n  - \uCC38\uC8702: G2\n  - \uC785\uB825\uAC12: resault = \"GCD = <2>B</2> \u00D7 361 + 6192 \u00D7 (-59)\"\n\n  **STEP C-6-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301: <1>6192</1>\uB300\uC785\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB7AB\uCABD\n  - \uCC38\uC8701: F1\n  - \uCC38\uC8702: G1\n  - \uC785\uB825\uAC12: resault = \"GCD = B \u00D7 361 + <2>A</2> \u00D7 (-59)\"\n\n  **STEP D-1-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301: 1012 \u00D7 361 = 365332\\n6192 \u00D7 -59 = -365328\\n365332 - 365328 = 4 = GCD\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB7AB\uCABD\n  - \uCC38\uC8701: F1\n  - \uCC38\uC8702: G1\n  - \uCC38\uC8703: F2\n  - \uCC38\uC8704: G2\n  - \uC785\uB825\uAC12: resault = \"GCD = 365332 - 365328 = 4\"",
  "tc/testcase_5678_2233.md": "### \uC2DC\uB098\uB9AC\uC624: 5678, 2233\n\n- **STEP 0**\n  - \uB300\uC0C1: B1\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: 5678, 2233\uB85C \uC720\uD074\uB9AC\uB4DC \uD638\uC81C\uBC95\uC744 \uC218\uD589\uD569\uB2C8\uB2E4. \\n  ax5678+bx2233=gcd  \uB97C \uCC3E\uB294 \uAC83\uC774 \uBAA9\uD45C\uC785\uB2C8\uB2E4.\n  - \uC785\uB825\uAC12: B1=5678, C1=2233\n\n- **STEP A-1-1**\n  - \uB300\uC0C1: A2\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>5678</1> \u00F7 <2>2233</2> = <0>2</0> ... ?\n  - \uCC38\uC8701: B1\n  - \uCC38\uC8702: C1\n  - \uC785\uB825\uAC12: A2 = 2\n\n- **STEP A-1-2**\n  - \uB300\uC0C1: B2\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>2233</1> \u00D7 <2>2</2> = <0>4466</0>\n  - \uCC38\uC8701: C1\n  - \uCC38\uC8702: A2\n  - \uC785\uB825\uAC12: B2 = 4466\n\n- **STEP A-1-3**\n  - \uB300\uC0C1: B3\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>5678</1> - <2>4466</2> = <0>1212</0>\n  - \uCC38\uC8701: B1\n  - \uCC38\uC8702: B2\n  - \uC785\uB825\uAC12: B3 = 1212\n\n- **STEP A-2-1**\n  - \uB300\uC0C1: D2\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>2233</1> \u00F7 <2>1212</2> = <0>1</0> ... ?\n  - \uCC38\uC8701: C1\n  - \uCC38\uC8702: B3\n  - \uC785\uB825\uAC12: D2 = 1\n\n- **STEP A-2-2**\n  - \uB300\uC0C1: C2\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>1212</1> \u00D7 <2>1</2> = <0>1212</0>\n  - \uCC38\uC8701: B3\n  - \uCC38\uC8702: D2\n  - \uC785\uB825\uAC12: C2 = 1212\n\n- **STEP A-2-3**\n  - \uB300\uC0C1: C3\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>2233</1> - <2>1212</2> = <0>1021</0>\n  - \uCC38\uC8701: C1\n  - \uCC38\uC8702: C2\n  - \uC785\uB825\uAC12: C3 = 1021\n\n- **STEP A-3-1**\n  - \uB300\uC0C1: A4\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>1212</1> \u00F7 <2>1021</2> = <0>1</0> ... ?\n  - \uCC38\uC8701: B3\n  - \uCC38\uC8702: C3\n  - \uC785\uB825\uAC12: A4 = 1\n\n- **STEP A-3-2**\n  - \uB300\uC0C1: B4\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>1021</1> \u00D7 <2>1</2> = <0>1021</0>\n  - \uCC38\uC8701: C3\n  - \uCC38\uC8702: A4\n  - \uC785\uB825\uAC12: B4 = 1021\n\n- **STEP A-3-3**\n  - \uB300\uC0C1: B5\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>1212</1> - <2>1021</2> = <0>191</0>\n  - \uCC38\uC8701: B3\n  - \uCC38\uC8702: B4\n  - \uC785\uB825\uAC12: B5 = 191\n\n- **STEP A-4-1**\n  - \uB300\uC0C1: D4\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>1021</1> \u00F7 <2>191</2> = <0>5</0> ... ?\n  - \uCC38\uC8701: C3\n  - \uCC38\uC8702: B5\n  - \uC785\uB825\uAC12: D4 = 5\n\n- **STEP A-4-2**\n  - \uB300\uC0C1: C4\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>191</1> \u00D7 <2>5</2> = <0>955</0>\n  - \uCC38\uC8701: B5\n  - \uCC38\uC8702: D4\n  - \uC785\uB825\uAC12: C4 = 955\n\n- **STEP A-4-3**\n  - \uB300\uC0C1: C5\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>1021</1> - <2>955</2> = <0>66</0>\n  - \uCC38\uC8701: C3\n  - \uCC38\uC8702: C4\n  - \uC785\uB825\uAC12: C5 = 66\n\n- **STEP A-5-1**\n  - \uB300\uC0C1: A6\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>191</1> \u00F7 <2>66</2> = <0>2</0> ... ?\n  - \uCC38\uC8701: B5\n  - \uCC38\uC8702: C5\n  - \uC785\uB825\uAC12: A6 = 2\n\n- **STEP A-5-2**\n  - \uB300\uC0C1: B6\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>66</1> \u00D7 <2>2</2> = <0>132</0>\n  - \uCC38\uC8701: C5\n  - \uCC38\uC8702: A6\n  - \uC785\uB825\uAC12: B6 = 132\n\n- **STEP A-5-3**\n  - \uB300\uC0C1: B7\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>191</1> - <2>132</2> = <0>59</0>\n  - \uCC38\uC8701: B5\n  - \uCC38\uC8702: B6\n  - \uC785\uB825\uAC12: B7 = 59\n\n- **STEP A-6-1**\n  - \uB300\uC0C1: D6\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>66</1> \u00F7 <2>59</2> = <0>1</0> ... ?\n  - \uCC38\uC8701: C5\n  - \uCC38\uC8702: B7\n  - \uC785\uB825\uAC12: D6 = 1\n\n- **STEP A-6-2**\n  - \uB300\uC0C1: C6\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>59</1> \u00D7 <2>1</2> = <0>59</0>\n  - \uCC38\uC8701: B7\n  - \uCC38\uC8702: D6\n  - \uC785\uB825\uAC12: C6 = 59\n\n- **STEP A-6-3**\n  - \uB300\uC0C1: C7\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>66</1> - <2>59</2> = <0>7</0>\n  - \uCC38\uC8701: C5\n  - \uCC38\uC8702: C6\n  - \uC785\uB825\uAC12: C7 = 7\n\n- **STEP A-7-1**\n  - \uB300\uC0C1: A8\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>59</1> \u00F7 <2>7</2> = <0>8</0> ... ?\n  - \uCC38\uC8701: B7\n  - \uCC38\uC8702: C7\n  - \uC785\uB825\uAC12: A8 = 8\n\n- **STEP A-7-2**\n  - \uB300\uC0C1: B8\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>7</1> \u00D7 <2>8</2> = <0>56</0>\n  - \uCC38\uC8701: C7\n  - \uCC38\uC8702: A8\n  - \uC785\uB825\uAC12: B8 = 56\n\n- **STEP A-7-3**\n  - \uB300\uC0C1: B9\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>59</1> - <2>56</2> = <0>3</0>\n  - \uCC38\uC8701: B7\n  - \uCC38\uC8702: B8\n  - \uC785\uB825\uAC12: B9 = 3\n\n- **STEP A-8-1**\n  - \uB300\uC0C1: D8\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>7</1> \u00F7 <2>3</2> = <0>2</0> ... ?\n  - \uCC38\uC8701: C7\n  - \uCC38\uC8702: B9\n  - \uC785\uB825\uAC12: D8 = 2\n\n- **STEP A-8-2**\n  - \uB300\uC0C1: C8\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>3</1> \u00D7 <2>2</2> = <0>6</0>\n  - \uCC38\uC8701: B9\n  - \uCC38\uC8702: D8\n  - \uC785\uB825\uAC12: C8 = 6\n\n- **STEP A-8-3**\n  - \uB300\uC0C1: C9\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>7</1> - <2>6</2> = <0>1</0>\n  - \uCC38\uC8701: C7\n  - \uCC38\uC8702: C8\n  - \uC785\uB825\uAC12: C9 = 1\n\n- **STEP A-9-1**\n  - \uB300\uC0C1: A10\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>3</1> \u00F7 <2>1</2> = <0>3</0> ... ?\n  - \uCC38\uC8701: B9\n  - \uCC38\uC8702: C9\n  - \uC785\uB825\uAC12: A10 = 3\n\n- **STEP A-9-2**\n  - \uB300\uC0C1: B10\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>1</1> \u00D7 <2>3</2> = <0>3</0>\n  - \uCC38\uC8701: C9\n  - \uCC38\uC8702: A10\n  - \uC785\uB825\uAC12: B10 = 3\n\n- **STEP A-9-3**\n  - \uB300\uC0C1: B11\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>3</1> - <2>3</2> = <0>0</0>\n  - \uCC38\uC8701: B9\n  - \uCC38\uC8702: B10\n  - \uC785\uB825\uAC12: B11 = 0\n\n- **STEP B-1**\n  - \uB300\uC0C1: F1\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: A = <1>5678</1>\n  - \uCC38\uC8701: B1\n  - \uC785\uB825\uAC12: F1 = 5678, G1 = A\n\n- **STEP B-2**\n  - \uB300\uC0C1: F2\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: B = <1>2233</1>\n  - \uCC38\uC8701: C1\n  - \uC785\uB825\uAC12: F2 = 2233, G2 = B\n\n- **STEP B-3**\n  - \uB300\uC0C1: F3\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>1212</1> = <2>5678</2> - <3>2233</3> \u00D7 <4>2</4>\n  - \uCC38\uC8701: B3\n  - \uCC38\uC8702: B1\n  - \uCC38\uC8703: C1\n  - \uCC38\uC8704: A2\n  - \uC785\uB825\uAC12: F3 = 1212, G3 = 5678 - 2233 \u00D7 2\n\n- **STEP B-4**\n  - \uB300\uC0C1: F4\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>1021</1> = <2>2233</2> - <3>1212</3> \u00D7 <4>1</4>\n  - \uCC38\uC8701: C3\n  - \uCC38\uC8702: C1\n  - \uCC38\uC8703: B3\n  - \uCC38\uC8704: D2\n  - \uC785\uB825\uAC12: F4 = 1021, G4 = 2233 - 1212 \u00D7 1\n\n- **STEP B-5**\n  - \uB300\uC0C1: F5\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>191</1> = <2>1212</2> - <3>1021</3> \u00D7 <4>1</4>\n  - \uCC38\uC8701: B5\n  - \uCC38\uC8702: B3\n  - \uCC38\uC8703: C3\n  - \uCC38\uC8704: A4\n  - \uC785\uB825\uAC12: F5 = 191, G5 = 1212 - 1021 \u00D7 1\n\n- **STEP B-6**\n  - \uB300\uC0C1: F6\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>66</1> = <2>1021</2> - <3>191</3> \u00D7 <4>5</4>\n  - \uCC38\uC8701: C5\n  - \uCC38\uC8702: C3\n  - \uCC38\uC8703: B5\n  - \uCC38\uC8704: D4\n  - \uC785\uB825\uAC12: F6 = 66, G6 = 1021 - 191 \u00D7 5\n\n- **STEP B-7**\n  - \uB300\uC0C1: F7\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>59</1> = <2>191</2> - <3>66</3> \u00D7 <4>2</4>\n  - \uCC38\uC8701: B7\n  - \uCC38\uC8702: B5\n  - \uCC38\uC8703: C5\n  - \uCC38\uC8704: A6\n  - \uC785\uB825\uAC12: F7 = 59, G7 = 191 - 66 \u00D7 2\n\n- **STEP B-8**\n  - \uB300\uC0C1: F8\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>7</1> = <2>66</2> - <3>59</3> \u00D7 <4>1</4>\n  - \uCC38\uC8701: C7\n  - \uCC38\uC8702: C5\n  - \uCC38\uC8703: B7\n  - \uCC38\uC8704: D6\n  - \uC785\uB825\uAC12: F8 = 7, G8 = 66 - 59 \u00D7 1\n\n- **STEP B-9**\n  - \uB300\uC0C1: F9\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>3</1> = <2>59</2> - <3>7</3> \u00D7 <4>8</4>\n  - \uCC38\uC8701: B9\n  - \uCC38\uC8702: B7\n  - \uCC38\uC8703: C7\n  - \uCC38\uC8704: A8\n  - \uC785\uB825\uAC12: F9 = 3, G9 = 59 - 7 \u00D7 8\n\n- **STEP B-10**\n  - \uB300\uC0C1: F10\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>1</1> = <2>7</2> - <3>3</3> \u00D7 <4>2</4>\n  - \uCC38\uC8701: C9\n  - \uCC38\uC8702: C7\n  - \uCC38\uC8703: B9\n  - \uCC38\uC8704: D8\n  - \uC785\uB825\uAC12: F10 = 1, G10 = 7 - 3 \u00D7 2\n\n- **STEP C-1-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: GCD(5678, 2233) = <1>1</1>\n  - \uCC38\uC8701: G10\n  - \uCC38\uC8702: F10\n  - \uC785\uB825\uAC12: resault = \"1 = 7 - 3 \u00D7 2\"\n\n- **STEP C-1-2**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: GCD \uB300\uC785\n  - \uCC38\uC8701: G10\n  - \uCC38\uC8702: F10\n  - \uC785\uB825\uAC12: resault = \"GCD = 7 - 3 \u00D7 2\"\n\n- **STEP C-1-3**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uC2DD \uC815\uB82C\n  - \uCC38\uC8701: G10\n  - \uCC38\uC8702: F10\n  - \uC785\uB825\uAC12: resault = \"GCD = 7 + 3 \u00D7 (-2)\"\n\n- **STEP C-2-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>3</1> \uB300\uC751\n  - \uCC38\uC8701: F9\n  - \uCC38\uC8702: G9\n  - \uC785\uB825\uAC12: resault = \"GCD = 7 \u00D7 (1) + (59 - 7 \u00D7 8) \u00D7 (-2)\"\n\n- **STEP C-2-2**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uBD84\uBC30\uBC95\uCE59\n  - \uCC38\uC8701: F9\n  - \uCC38\uC8702: G9\n  - \uC785\uB825\uAC12: resault = \"GCD = 7 \u00D7 (1) + 59 \u00D7 (-2) + 7 \u00D7 (16)\"\n\n- **STEP C-2-3**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uD56D\uC815\uB9AC\n  - \uCC38\uC8701: F9\n  - \uCC38\uC8702: G9\n  - \uC785\uB825\uAC12: resault = \"GCD = 59 \u00D7 (-2) + 7 \u00D7 (17)\"\n\n- **STEP C-3-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>7</1> \uB300\uC751\n  - \uCC38\uC8701: F8\n  - \uCC38\uC8702: G8\n  - \uC785\uB825\uAC12: resault = \"GCD = 59 \u00D7 (-2) + (66 - 59 \u00D7 1) \u00D7 (17)\"\n\n- **STEP C-3-2**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uBD84\uBC30\uBC95\uCE59\n  - \uCC38\uC8701: F8\n  - \uCC38\uC8702: G8\n  - \uC785\uB825\uAC12: resault = \"GCD = 59 \u00D7 (-2) + 66 \u00D7 (17) + 59 \u00D7 (-17)\"\n\n- **STEP C-3-3**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uD56D\uC815\uB9AC\n  - \uCC38\uC8701: F8\n  - \uCC38\uC8702: G8\n  - \uC785\uB825\uAC12: resault = \"GCD = 66 \u00D7 (17) + 59 \u00D7 (-19)\"\n\n- **STEP C-4-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>59</1> \uB300\uC751\n  - \uCC38\uC8701: F7\n  - \uCC38\uC8702: G7\n  - \uC785\uB825\uAC12: resault = \"GCD = 66 \u00D7 (17) + (191 - 66 \u00D7 2) \u00D7 (-19)\"\n\n- **STEP C-4-2**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uBD84\uBC30\uBC95\uCE59\n  - \uCC38\uC8701: F7\n  - \uCC38\uC8702: G7\n  - \uC785\uB825\uAC12: resault = \"GCD = 66 \u00D7 (17) + 191 \u00D7 (-19) + 66 \u00D7 (38)\"\n\n- **STEP C-4-3**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uD56D\uC815\uB9AC\n  - \uCC38\uC8701: F7\n  - \uCC38\uC8702: G7\n  - \uC785\uB825\uAC12: resault = \"GCD = 191 \u00D7 (-19) + 66 \u00D7 (55)\"\n\n- **STEP C-5-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>66</1> \uB300\uC751\n  - \uCC38\uC8701: F6\n  - \uCC38\uC8702: G6\n  - \uC785\uB825\uAC12: resault = \"GCD = 191 \u00D7 (-19) + (1021 - 191 \u00D7 5) \u00D7 (55)\"\n\n- **STEP C-5-2**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uBD84\uBC30\uBC95\uCE59\n  - \uCC38\uC8701: F6\n  - \uCC38\uC8702: G6\n  - \uC785\uB825\uAC12: resault = \"GCD = 191 \u00D7 (-19) + 1021 \u00D7 (55) + 191 \u00D7 (-275)\"\n\n- **STEP C-5-3**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uD56D\uC815\uB9AC\n  - \uCC38\uC8701: F6\n  - \uCC38\uC8702: G6\n  - \uC785\uB825\uAC12: resault = \"GCD = 1021 \u00D7 (55) + 191 \u00D7 (-294)\"\n\n- **STEP C-6-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>191</1> \uB300\uC751\n  - \uCC38\uC8701: F5\n  - \uCC38\uC8702: G5\n  - \uC785\uB825\uAC12: resault = \"GCD = 1021 \u00D7 (55) + (1212 - 1021 \u00D7 1) \u00D7 (-294)\"\n\n- **STEP C-6-2**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uBD84\uBC30\uBC95\uCE59\n  - \uCC38\uC8701: F5\n  - \uCC38\uC8702: G5\n  - \uC785\uB825\uAC12: resault = \"GCD = 1021 \u00D7 (55) + 1212 \u00D7 (-294) + 1021 \u00D7 (294)\"\n\n- **STEP C-6-3**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uD56D\uC815\uB9AC\n  - \uCC38\uC8701: F5\n  - \uCC38\uC8702: G5\n  - \uC785\uB825\uAC12: resault = \"GCD = 1212 \u00D7 (-294) + 1021 \u00D7 (349)\"\n\n- **STEP C-7-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>1021</1> \uB300\uC751\n  - \uCC38\uC8701: F4\n  - \uCC38\uC8702: G4\n  - \uC785\uB825\uAC12: resault = \"GCD = 1212 \u00D7 (-294) + (2233 - 1212 \u00D7 1) \u00D7 (349)\"\n\n- **STEP C-7-2**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uBD84\uBC30\uBC95\uCE59\n  - \uCC38\uC8701: F4\n  - \uCC38\uC8702: G4\n  - \uC785\uB825\uAC12: resault = \"GCD = 1212 \u00D7 (-294) + 2233 \u00D7 (349) + 1212 \u00D7 (-349)\"\n\n- **STEP C-7-3**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uD56D\uC815\uB9AC\n  - \uCC38\uC8701: F4\n  - \uCC38\uC8702: G4\n  - \uC785\uB825\uAC12: resault = \"GCD = 2233 \u00D7 (349) + 1212 \u00D7 (-643)\"\n\n- **STEP C-8-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>1212</1> \uB300\uC751\n  - \uCC38\uC8701: F3\n  - \uCC38\uC8702: G3\n  - \uC785\uB825\uAC12: resault = \"GCD = 2233 \u00D7 (349) + (5678 - 2233 \u00D7 2) \u00D7 (-643)\"\n\n- **STEP C-8-2**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uBD84\uBC30\uBC95\uCE59\n  - \uCC38\uC8701: F3\n  - \uCC38\uC8702: G3\n  - \uC785\uB825\uAC12: resault = \"GCD = 2233 \u00D7 (349) + 5678 \u00D7 (-643) + 2233 \u00D7 (1286)\"\n\n- **STEP C-8-3**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uD56D\uC815\uB9AC\n  - \uCC38\uC8701: F3\n  - \uCC38\uC8702: G3\n  - \uC785\uB825\uAC12: resault = \"GCD = 5678 \u00D7 (-643) + 2233 \u00D7 (1635)\"\n\n- **STEP C-9-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>2233</1>\uB300\uC785\n  - \uCC38\uC8701: F2\n  - \uCC38\uC8702: G2\n  - \uC785\uB825\uAC12: resault = \"GCD = B \u00D7 (1635) + 5678 \u00D7 (-643)\"\n\n- **STEP C-10-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>5678</1>\uB300\uC785\n  - \uCC38\uC8701: F1\n  - \uCC38\uC8702: G1\n  - \uC785\uB825\uAC12: resault = \"GCD = B \u00D7 (1635) + A \u00D7 (-643)\"\n\n- **STEP D-1-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: 2233 \u00D7 1635 = 3650955\\n5678 \u00D7 -643 = -3650954\\n3650955 - 3650954 = 1 = GCD\n  - \uCC38\uC8701: F1\n  - \uCC38\uC8702: G1\n  - \uCC38\uC8703: F2\n  - \uCC38\uC8704: G2\n  - \uC785\uB825\uAC12: resault = \"GCD = 3650955 - 3650954 = 1\"\n\n",
  "tc/testcase_6765_4181.md": "### \uC2DC\uB098\uB9AC\uC624: 6765, 4181\n\n- **STEP 0**\n  - \uB300\uC0C1: B1\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: 6765, 4181\uB85C \uC720\uD074\uB9AC\uB4DC \uD638\uC81C\uBC95\uC744 \uC218\uD589\uD569\uB2C8\uB2E4. \\nax6765+bx4181=gcd\uB97C \uCC3E\uB294 \uAC83\uC774 \uBAA9\uD45C\uC785\uB2C8\uB2E4.\n  - \uC785\uB825\uAC12: B1=6765, C1=4181\n\n- **STEP A-1-1**\n  - \uB300\uC0C1: A2\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>6765</1> \u00F7 <2>4181</2> = <0>1</0> ... ?\n  - \uCC38\uC8701: B1\n  - \uCC38\uC8702: C1\n  - \uC785\uB825\uAC12: A2 = 1\n\n- **STEP A-1-2**\n  - \uB300\uC0C1: B2\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>4181</1> \u00D7 <2>1</2> = <0>4181</0>\n  - \uCC38\uC8701: C1\n  - \uCC38\uC8702: A2\n  - \uC785\uB825\uAC12: B2 = 4181\n\n- **STEP A-1-3**\n  - \uB300\uC0C1: B3\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>6765</1> - <2>4181</2> = <0>2584</0>\n  - \uCC38\uC8701: B1\n  - \uCC38\uC8702: B2\n  - \uC785\uB825\uAC12: B3 = 2584\n\n- **STEP A-2-1**\n  - \uB300\uC0C1: D2\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>4181</1> \u00F7 <2>2584</2> = <0>1</0> ... ?\n  - \uCC38\uC8701: C1\n  - \uCC38\uC8702: B3\n  - \uC785\uB825\uAC12: D2 = 1\n\n- **STEP A-2-2**\n  - \uB300\uC0C1: C2\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>2584</1> \u00D7 <2>1</2> = <0>2584</0>\n  - \uCC38\uC8701: B3\n  - \uCC38\uC8702: D2\n  - \uC785\uB825\uAC12: C2 = 2584\n\n- **STEP A-2-3**\n  - \uB300\uC0C1: C3\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>4181</1> - <2>2584</2> = <0>1597</0>\n  - \uCC38\uC8701: C1\n  - \uCC38\uC8702: C2\n  - \uC785\uB825\uAC12: C3 = 1597\n\n- **STEP A-3-1**\n  - \uB300\uC0C1: A4\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>2584</1> \u00F7 <2>1597</2> = <0>1</0> ... ?\n  - \uCC38\uC8701: B3\n  - \uCC38\uC8702: C3\n  - \uC785\uB825\uAC12: A4 = 1\n\n- **STEP A-3-2**\n  - \uB300\uC0C1: B4\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>1597</1> \u00D7 <2>1</2> = <0>1597</0>\n  - \uCC38\uC8701: C3\n  - \uCC38\uC8702: A4\n  - \uC785\uB825\uAC12: B4 = 1597\n\n- **STEP A-3-3**\n  - \uB300\uC0C1: B5\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>2584</1> - <2>1597</2> = <0>987</0>\n  - \uCC38\uC8701: B3\n  - \uCC38\uC8702: B4\n  - \uC785\uB825\uAC12: B5 = 987\n\n- **STEP A-4-1**\n  - \uB300\uC0C1: D4\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>1597</1> \u00F7 <2>987</2> = <0>1</0> ... ?\n  - \uCC38\uC8701: C3\n  - \uCC38\uC8702: B5\n  - \uC785\uB825\uAC12: D4 = 1\n\n- **STEP A-4-2**\n  - \uB300\uC0C1: C4\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>987</1> \u00D7 <2>1</2> = <0>987</0>\n  - \uCC38\uC8701: B5\n  - \uCC38\uC8702: D4\n  - \uC785\uB825\uAC12: C4 = 987\n\n- **STEP A-4-3**\n  - \uB300\uC0C1: C5\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>1597</1> - <2>987</2> = <0>610</0>\n  - \uCC38\uC8701: C3\n  - \uCC38\uC8702: C4\n  - \uC785\uB825\uAC12: C5 = 610\n\n- **STEP A-5-1**\n  - \uB300\uC0C1: A6\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>987</1> \u00F7 <2>610</2> = <0>1</0> ... ?\n  - \uCC38\uC8701: B5\n  - \uCC38\uC8702: C5\n  - \uC785\uB825\uAC12: A6 = 1\n\n- **STEP A-5-2**\n  - \uB300\uC0C1: B6\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>610</1> \u00D7 <2>1</2> = <0>610</0>\n  - \uCC38\uC8701: C5\n  - \uCC38\uC8702: A6\n  - \uC785\uB825\uAC12: B6 = 610\n\n- **STEP A-5-3**\n  - \uB300\uC0C1: B7\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>987</1> - <2>610</2> = <0>377</0>\n  - \uCC38\uC8701: B5\n  - \uCC38\uC8702: B6\n  - \uC785\uB825\uAC12: B7 = 377\n\n- **STEP A-6-1**\n  - \uB300\uC0C1: D6\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>610</1> \u00F7 <2>377</2> = <0>1</0> ... ?\n  - \uCC38\uC8701: C5\n  - \uCC38\uC8702: B7\n  - \uC785\uB825\uAC12: D6 = 1\n\n- **STEP A-6-2**\n  - \uB300\uC0C1: C6\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>377</1> \u00D7 <2>1</2> = <0>377</0>\n  - \uCC38\uC8701: B7\n  - \uCC38\uC8702: D6\n  - \uC785\uB825\uAC12: C6 = 377\n\n- **STEP A-6-3**\n  - \uB300\uC0C1: C7\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>610</1> - <2>377</2> = <0>233</0>\n  - \uCC38\uC8701: C5\n  - \uCC38\uC8702: C6\n  - \uC785\uB825\uAC12: C7 = 233\n\n- **STEP A-7-1**\n  - \uB300\uC0C1: A8\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>377</1> \u00F7 <2>233</2> = <0>1</0> ... ?\n  - \uCC38\uC8701: B7\n  - \uCC38\uC8702: C7\n  - \uC785\uB825\uAC12: A8 = 1\n\n- **STEP A-7-2**\n  - \uB300\uC0C1: B8\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>233</1> \u00D7 <2>1</2> = <0>233</0>\n  - \uCC38\uC8701: C7\n  - \uCC38\uC8702: A8\n  - \uC785\uB825\uAC12: B8 = 233\n\n- **STEP A-7-3**\n  - \uB300\uC0C1: B9\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>377</1> - <2>233</2> = <0>144</0>\n  - \uCC38\uC8701: B7\n  - \uCC38\uC8702: B8\n  - \uC785\uB825\uAC12: B9 = 144\n\n- **STEP A-8-1**\n  - \uB300\uC0C1: D8\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>233</1> \u00F7 <2>144</2> = <0>1</0> ... ?\n  - \uCC38\uC8701: C7\n  - \uCC38\uC8702: B9\n  - \uC785\uB825\uAC12: D8 = 1\n\n- **STEP A-8-2**\n  - \uB300\uC0C1: C8\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>144</1> \u00D7 <2>1</2> = <0>144</0>\n  - \uCC38\uC8701: B9\n  - \uCC38\uC8702: D8\n  - \uC785\uB825\uAC12: C8 = 144\n\n- **STEP A-8-3**\n  - \uB300\uC0C1: C9\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>233</1> - <2>144</2> = <0>89</0>\n  - \uCC38\uC8701: C7\n  - \uCC38\uC8702: C8\n  - \uC785\uB825\uAC12: C9 = 89\n\n- **STEP A-9-1**\n  - \uB300\uC0C1: A10\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>144</1> \u00F7 <2>89</2> = <0>1</0> ... ?\n  - \uCC38\uC8701: B9\n  - \uCC38\uC8702: C9\n  - \uC785\uB825\uAC12: A10 = 1\n\n- **STEP A-9-2**\n  - \uB300\uC0C1: B10\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>89</1> \u00D7 <2>1</2> = <0>89</0>\n  - \uCC38\uC8701: C9\n  - \uCC38\uC8702: A10\n  - \uC785\uB825\uAC12: B10 = 89\n\n- **STEP A-9-3**\n  - \uB300\uC0C1: B11\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>144</1> - <2>89</2> = <0>55</0>\n  - \uCC38\uC8701: B9\n  - \uCC38\uC8702: B10\n  - \uC785\uB825\uAC12: B11 = 55\n\n- **STEP A-10-1**\n  - \uB300\uC0C1: D10\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>89</1> \u00F7 <2>55</2> = <0>1</0> ... ?\n  - \uCC38\uC8701: C9\n  - \uCC38\uC8702: B11\n  - \uC785\uB825\uAC12: D10 = 1\n\n- **STEP A-10-2**\n  - \uB300\uC0C1: C10\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>55</1> \u00D7 <2>1</2> = <0>55</0>\n  - \uCC38\uC8701: B11\n  - \uCC38\uC8702: D10\n  - \uC785\uB825\uAC12: C10 = 55\n\n- **STEP A-10-3**\n  - \uB300\uC0C1: C11\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>89</1> - <2>55</2> = <0>34</0>\n  - \uCC38\uC8701: C9\n  - \uCC38\uC8702: C10\n  - \uC785\uB825\uAC12: C11 = 34\n\n- **STEP A-11-1**\n  - \uB300\uC0C1: A12\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>55</1> \u00F7 <2>34</2> = <0>1</0> ... ?\n  - \uCC38\uC8701: B11\n  - \uCC38\uC8702: C11\n  - \uC785\uB825\uAC12: A12 = 1\n\n- **STEP A-11-2**\n  - \uB300\uC0C1: B12\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>34</1> \u00D7 <2>1</2> = <0>34</0>\n  - \uCC38\uC8701: C11\n  - \uCC38\uC8702: A12\n  - \uC785\uB825\uAC12: B12 = 34\n\n- **STEP A-11-3**\n  - \uB300\uC0C1: B13\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>55</1> - <2>34</2> = <0>21</0>\n  - \uCC38\uC8701: B11\n  - \uCC38\uC8702: B12\n  - \uC785\uB825\uAC12: B13 = 21\n\n- **STEP A-12-1**\n  - \uB300\uC0C1: D12\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>34</1> \u00F7 <2>21</2> = <0>1</0> ... ?\n  - \uCC38\uC8701: C11\n  - \uCC38\uC8702: B13\n  - \uC785\uB825\uAC12: D12 = 1\n\n- **STEP A-12-2**\n  - \uB300\uC0C1: C12\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>21</1> \u00D7 <2>1</2> = <0>21</0>\n  - \uCC38\uC8701: B13\n  - \uCC38\uC8702: D12\n  - \uC785\uB825\uAC12: C12 = 21\n\n- **STEP A-12-3**\n  - \uB300\uC0C1: C13\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>34</1> - <2>21</2> = <0>13</0>\n  - \uCC38\uC8701: C11\n  - \uCC38\uC8702: C12\n  - \uC785\uB825\uAC12: C13 = 13\n\n- **STEP A-13-1**\n  - \uB300\uC0C1: A14\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>21</1> \u00F7 <2>13</2> = <0>1</0> ... ?\n  - \uCC38\uC8701: B13\n  - \uCC38\uC8702: C13\n  - \uC785\uB825\uAC12: A14 = 1\n\n- **STEP A-13-2**\n  - \uB300\uC0C1: B14\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>13</1> \u00D7 <2>1</2> = <0>13</0>\n  - \uCC38\uC8701: C13\n  - \uCC38\uC8702: A14\n  - \uC785\uB825\uAC12: B14 = 13\n\n- **STEP A-13-3**\n  - \uB300\uC0C1: B15\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>21</1> - <2>13</2> = <0>8</0>\n  - \uCC38\uC8701: B13\n  - \uCC38\uC8702: B14\n  - \uC785\uB825\uAC12: B15 = 8\n\n- **STEP A-14-1**\n  - \uB300\uC0C1: D14\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>13</1> \u00F7 <2>8</2> = <0>1</0> ... ?\n  - \uCC38\uC8701: C13\n  - \uCC38\uC8702: B15\n  - \uC785\uB825\uAC12: D14 = 1\n\n- **STEP A-14-2**\n  - \uB300\uC0C1: C14\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>8</1> \u00D7 <2>1</2> = <0>8</0>\n  - \uCC38\uC8701: B15\n  - \uCC38\uC8702: D14\n  - \uC785\uB825\uAC12: C14 = 8\n\n- **STEP A-14-3**\n  - \uB300\uC0C1: C15\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>13</1> - <2>8</2> = <0>5</0>\n  - \uCC38\uC8701: C13\n  - \uCC38\uC8702: C14\n  - \uC785\uB825\uAC12: C15 = 5\n\n- **STEP A-15-1**\n  - \uB300\uC0C1: A16\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>8</1> \u00F7 <2>5</2> = <0>1</0> ... ?\n  - \uCC38\uC8701: B15\n  - \uCC38\uC8702: C15\n  - \uC785\uB825\uAC12: A16 = 1\n\n- **STEP A-15-2**\n  - \uB300\uC0C1: B16\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>5</1> \u00D7 <2>1</2> = <0>5</0>\n  - \uCC38\uC8701: C15\n  - \uCC38\uC8702: A16\n  - \uC785\uB825\uAC12: B16 = 5\n\n- **STEP A-15-3**\n  - \uB300\uC0C1: B17\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>8</1> - <2>5</2> = <0>3</0>\n  - \uCC38\uC8701: B15\n  - \uCC38\uC8702: B16\n  - \uC785\uB825\uAC12: B17 = 3\n\n- **STEP A-16-1**\n  - \uB300\uC0C1: D16\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>5</1> \u00F7 <2>3</2> = <0>1</0> ... ?\n  - \uCC38\uC8701: C15\n  - \uCC38\uC8702: B17\n  - \uC785\uB825\uAC12: D16 = 1\n\n- **STEP A-16-2**\n  - \uB300\uC0C1: C16\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>3</1> \u00D7 <2>1</2> = <0>3</0>\n  - \uCC38\uC8701: B17\n  - \uCC38\uC8702: D16\n  - \uC785\uB825\uAC12: C16 = 3\n\n- **STEP A-16-3**\n  - \uB300\uC0C1: C17\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>5</1> - <2>3</2> = <0>2</0>\n  - \uCC38\uC8701: C15\n  - \uCC38\uC8702: C16\n  - \uC785\uB825\uAC12: C17 = 2\n\n- **STEP A-17-1**\n  - \uB300\uC0C1: A18\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>3</1> \u00F7 <2>2</2> = <0>1</0> ... ?\n  - \uCC38\uC8701: B17\n  - \uCC38\uC8702: C17\n  - \uC785\uB825\uAC12: A18 = 1\n\n- **STEP A-17-2**\n  - \uB300\uC0C1: B18\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>2</1> \u00D7 <2>1</2> = <0>2</0>\n  - \uCC38\uC8701: C17\n  - \uCC38\uC8702: A18\n  - \uC785\uB825\uAC12: B18 = 2\n\n- **STEP A-17-3**\n  - \uB300\uC0C1: B19\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>3</1> - <2>2</2> = <0>1</0>\n  - \uCC38\uC8701: B17\n  - \uCC38\uC8702: B18\n  - \uC785\uB825\uAC12: B19 = 1\n\n- **STEP A-18-1**\n  - \uB300\uC0C1: D18\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>2</1> \u00F7 <2>1</2> = <0>2</0> ... ?\n  - \uCC38\uC8701: C17\n  - \uCC38\uC8702: B19\n  - \uC785\uB825\uAC12: D18 = 2\n\n- **STEP A-18-2**\n  - \uB300\uC0C1: C18\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>1</1> \u00D7 <2>2</2> = <0>2</0>\n  - \uCC38\uC8701: B19\n  - \uCC38\uC8702: D18\n  - \uC785\uB825\uAC12: C18 = 2\n\n- **STEP A-18-3**\n  - \uB300\uC0C1: C19\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>2</1> - <2>2</2> = <0>0</0> <\uC185\uB5CC>\n  - \uCC38\uC8701: C17\n  - \uCC38\uC8702: C18\n  - \uC785\uB825\uAC12: C19 = 0\n\n- **STEP B-1**\n  - \uB300\uC0C1: F1\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: A = <1>6765</1>\n  - \uCC38\uC8701: B1\n  - \uC785\uB825\uAC12: F1 = 6765, G1 = A\n\n- **STEP B-2**\n  - \uB300\uC0C1: F2\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: B = <1>4181</1>\n  - \uCC38\uC8701: C1\n  - \uC785\uB825\uAC12: F2 = 4181, G2 = B\n\n- **STEP B-3**\n  - \uB300\uC0C1: F3\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>2584</1> = <2>6765</2> - <3>4181</3> \u00D7 <4>1</4>\n  - \uCC38\uC8701: B3\n  - \uCC38\uC8702: B1\n  - \uCC38\uC8703: C1\n  - \uCC38\uC8704: A2\n  - \uC785\uB825\uAC12: F3 = 2584, G3 = 6765 - 4181 \u00D7 1\n\n- **STEP B-4**\n  - \uB300\uC0C1: F4\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>1597</1> = <2>4181</2> - <3>2584</3> \u00D7 <4>1</4>\n  - \uCC38\uC8701: C3\n  - \uCC38\uC8702: C1\n  - \uCC38\uC8703: B3\n  - \uCC38\uC8704: D2\n  - \uC785\uB825\uAC12: F4 = 1597, G4 = 4181 - 2584 \u00D7 1\n\n- **STEP B-5**\n  - \uB300\uC0C1: F5\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>987</1> = <2>2584</2> - <3>1597</3> \u00D7 <4>1</4>\n  - \uCC38\uC8701: B5\n  - \uCC38\uC8702: B3\n  - \uCC38\uC8703: C3\n  - \uCC38\uC8704: A4\n  - \uC785\uB825\uAC12: F5 = 987, G5 = 2584 - 1597 \u00D7 1\n\n- **STEP B-6**\n  - \uB300\uC0C1: F6\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>610</1> = <2>1597</2> - <3>987</3> \u00D7 <4>1</4>\n  - \uCC38\uC8701: C5\n  - \uCC38\uC8702: C3\n  - \uCC38\uC8703: B5\n  - \uCC38\uC8704: D4\n  - \uC785\uB825\uAC12: F6 = 610, G6 = 1597 - 987 \u00D7 1\n\n- **STEP B-7**\n  - \uB300\uC0C1: F7\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>377</1> = <2>987</2> - <3>610</3> \u00D7 <4>1</4>\n  - \uCC38\uC8701: B7\n  - \uCC38\uC8702: B5\n  - \uCC38\uC8703: C5\n  - \uCC38\uC8704: A6\n  - \uC785\uB825\uAC12: F7 = 377, G7 = 987 - 610 \u00D7 1\n\n- **STEP B-8**\n  - \uB300\uC0C1: F8\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>233</1> = <2>610</2> - <3>377</3> \u00D7 <4>1</4>\n  - \uCC38\uC8701: C7\n  - \uCC38\uC8702: C5\n  - \uCC38\uC8703: B7\n  - \uCC38\uC8704: D6\n  - \uC785\uB825\uAC12: F8 = 233, G8 = 610 - 377 \u00D7 1\n\n- **STEP B-9**\n  - \uB300\uC0C1: F9\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>144</1> = <2>377</2> - <3>233</3> \u00D7 <4>1</4>\n  - \uCC38\uC8701: B9\n  - \uCC38\uC8702: B7\n  - \uCC38\uC8703: C7\n  - \uCC38\uC8704: A8\n  - \uC785\uB825\uAC12: F9 = 144, G9 = 377 - 233 \u00D7 1\n\n- **STEP B-10**\n  - \uB300\uC0C1: F10\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>89</1> = <2>233</2> - <3>144</3> \u00D7 <4>1</4>\n  - \uCC38\uC8701: C9\n  - \uCC38\uC8702: C7\n  - \uCC38\uC8703: B9\n  - \uCC38\uC8704: D8\n  - \uC785\uB825\uAC12: F10 = 89, G10 = 233 - 144 \u00D7 1\n\n- **STEP B-11**\n  - \uB300\uC0C1: F11\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>55</1> = <2>144</2> - <3>89</3> \u00D7 <4>1</4>\n  - \uCC38\uC8701: B11\n  - \uCC38\uC8702: B9\n  - \uCC38\uC8703: C9\n  - \uCC38\uC8704: A10\n  - \uC785\uB825\uAC12: F11 = 55, G11 = 144 - 89 \u00D7 1\n\n- **STEP B-12**\n  - \uB300\uC0C1: F12\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>34</1> = <2>89</2> - <3>55</3> \u00D7 <4>1</4>\n  - \uCC38\uC8701: C11\n  - \uCC38\uC8702: C9\n  - \uCC38\uC8703: B11\n  - \uCC38\uC8704: D10\n  - \uC785\uB825\uAC12: F12 = 34, G12 = 89 - 55 \u00D7 1\n\n- **STEP B-13**\n  - \uB300\uC0C1: F13\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>21</1> = <2>55</2> - <3>34</3> \u00D7 <4>1</4>\n  - \uCC38\uC8701: B13\n  - \uCC38\uC8702: B11\n  - \uCC38\uC8703: C11\n  - \uCC38\uC8704: A12\n  - \uC785\uB825\uAC12: F13 = 21, G13 = 55 - 34 \u00D7 1\n\n- **STEP B-14**\n  - \uB300\uC0C1: F14\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>13</1> = <2>34</2> - <3>21</3> \u00D7 <4>1</4>\n  - \uCC38\uC8701: C13\n  - \uCC38\uC8702: C11\n  - \uCC38\uC8703: B13\n  - \uCC38\uC8704: D12\n  - \uC785\uB825\uAC12: F14 = 13, G14 = 34 - 21 \u00D7 1\n\n- **STEP B-15**\n  - \uB300\uC0C1: F15\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>8</1> = <2>21</2> - <3>13</3> \u00D7 <4>1</4>\n  - \uCC38\uC8701: B15\n  - \uCC38\uC8702: B13\n  - \uCC38\uC8703: C13\n  - \uCC38\uC8704: A14\n  - \uC785\uB825\uAC12: F15 = 8, G15 = 21 - 13 \u00D7 1\n\n- **STEP B-16**\n  - \uB300\uC0C1: F16\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>5</1> = <2>13</2> - <3>8</3> \u00D7 <4>1</4>\n  - \uCC38\uC8701: C15\n  - \uCC38\uC8702: C13\n  - \uCC38\uC8703: B15\n  - \uCC38\uC8704: D14\n  - \uC785\uB825\uAC12: F16 = 5, G16 = 13 - 8 \u00D7 1\n\n- **STEP B-17**\n  - \uB300\uC0C1: F17\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>3</1> = <2>8</2> - <3>5</3> \u00D7 <4>1</4>\n  - \uCC38\uC8701: B17\n  - \uCC38\uC8702: B15\n  - \uCC38\uC8703: C15\n  - \uCC38\uC8704: A16\n  - \uC785\uB825\uAC12: F17 = 3, G17 = 8 - 5 \u00D7 1\n\n- **STEP B-18**\n  - \uB300\uC0C1: F18\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>2</1> = <2>5</2> - <3>3</3> \u00D7 <4>1</4>\n  - \uCC38\uC8701: C17\n  - \uCC38\uC8702: C15\n  - \uCC38\uC8703: B17\n  - \uCC38\uC8704: D16\n  - \uC785\uB825\uAC12: F18 = 2, G18 = 5 - 3 \u00D7 1\n\n- **STEP B-19**\n  - \uB300\uC0C1: F19\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>1</1> = <2>3</2> - <3>2</3> \u00D7 <4>1</4>\n  - \uCC38\uC8701: B19\n  - \uCC38\uC8702: B17\n  - \uCC38\uC8703: C17\n  - \uCC38\uC8704: A18\n  - \uC785\uB825\uAC12: F19 = 1, G19 = 3 - 2 \u00D7 1\n\n- **STEP C-1-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: GCD(6765, 4181) = <1>1</1>\n  - \uCC38\uC8701: G19\n  - \uCC38\uC8702: F19\n  - \uC785\uB825\uAC12: resault = \"1 = 3 - 2 \u00D7 1\"\n\n- **STEP C-1-2**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: GCD \uB300\uC785\n  - \uCC38\uC8701: G19\n  - \uCC38\uC8702: F19\n  - \uC785\uB825\uAC12: resault = \"GCD = 3 - 2 \u00D7 1\"\n\n- **STEP C-1-3**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uC2DD \uC815\uB82C\n  - \uCC38\uC8701: G19\n  - \uCC38\uC8702: F19\n  - \uC785\uB825\uAC12: resault = \"GCD = 3 + 2 \u00D7 (-1)\"\n\n- **STEP C-2-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>2</1> \uB300\uC751\n  - \uCC38\uC8701: F18\n  - \uCC38\uC8702: G18\n  - \uC785\uB825\uAC12: resault = \"GCD = 3 \u00D7 (1) + (5 - 3 \u00D7 1) \u00D7 (-1)\"\n\n- **STEP C-2-2**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uBD84\uBC30\uBC95\uCE59\n  - \uCC38\uC8701: F18\n  - \uCC38\uC8702: G18\n  - \uC785\uB825\uAC12: resault = \"GCD = 3 \u00D7 (1) + 5 \u00D7 (-1) + 3 \u00D7 (1)\"\n\n- **STEP C-2-3**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uD56D\uC815\uB9AC\n  - \uCC38\uC8701: F18\n  - \uCC38\uC8702: G18\n  - \uC785\uB825\uAC12: resault = \"GCD = 5 \u00D7 (-1) + 3 \u00D7 (2)\"\n\n- **STEP C-3-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>3</1> \uB300\uC751\n  - \uCC38\uC8701: F17\n  - \uCC38\uC8702: G17\n  - \uC785\uB825\uAC12: resault = \"GCD = 5 \u00D7 (-1) + (8 - 5 \u00D7 1) \u00D7 (2)\"\n\n- **STEP C-3-2**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uBD84\uBC30\uBC95\uCE59\n  - \uCC38\uC8701: F17\n  - \uCC38\uC8702: G17\n  - \uC785\uB825\uAC12: resault = \"GCD = 5 \u00D7 (-1) + 8 \u00D7 (2) + 5 \u00D7 (-2)\"\n\n- **STEP C-3-3**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uD56D\uC815\uB9AC\n  - \uCC38\uC8701: F17\n  - \uCC38\uC8702: G17\n  - \uC785\uB825\uAC12: resault = \"GCD = 8 \u00D7 (2) + 5 \u00D7 (-3)\"\n\n- **STEP C-4-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>5</1> \uB300\uC751\n  - \uCC38\uC8701: F16\n  - \uCC38\uC8702: G16\n  - \uC785\uB825\uAC12: resault = \"GCD = 8 \u00D7 (2) + (13 - 8 \u00D7 1) \u00D7 (-3)\"\n\n- **STEP C-4-2**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uBD84\uBC30\uBC95\uCE59\n  - \uCC38\uC8701: F16\n  - \uCC38\uC8702: G16\n  - \uC785\uB825\uAC12: resault = \"GCD = 8 \u00D7 (2) + 13 \u00D7 (-3) + 8 \u00D7 (3)\"\n\n- **STEP C-4-3**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uD56D\uC815\uB9AC\n  - \uCC38\uC8701: F16\n  - \uCC38\uC8702: G16\n  - \uC785\uB825\uAC12: resault = \"GCD = 13 \u00D7 (-3) + 8 \u00D7 (5)\"\n\n- **STEP C-5-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>8</1> \uB300\uC751\n  - \uCC38\uC8701: F15\n  - \uCC38\uC8702: G15\n  - \uC785\uB825\uAC12: resault = \"GCD = 13 \u00D7 (-3) + (21 - 13 \u00D7 1) \u00D7 (5)\"\n\n- **STEP C-5-2**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uBD84\uBC30\uBC95\uCE59\n  - \uCC38\uC8701: F15\n  - \uCC38\uC8702: G15\n  - \uC785\uB825\uAC12: resault = \"GCD = 13 \u00D7 (-3) + 21 \u00D7 (5) + 13 \u00D7 (-5)\"\n\n- **STEP C-5-3**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uD56D\uC815\uB9AC\n  - \uCC38\uC8701: F15\n  - \uCC38\uC8702: G15\n  - \uC785\uB825\uAC12: resault = \"GCD = 21 \u00D7 (5) + 13 \u00D7 (-8)\"\n\n- **STEP C-6-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>13</1> \uB300\uC751\n  - \uCC38\uC8701: F14\n  - \uCC38\uC8702: G14\n  - \uC785\uB825\uAC12: resault = \"GCD = 21 \u00D7 (5) + (34 - 21 \u00D7 1) \u00D7 (-8)\"\n\n- **STEP C-6-2**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uBD84\uBC30\uBC95\uCE59\n  - \uCC38\uC8701: F14\n  - \uCC38\uC8702: G14\n  - \uC785\uB825\uAC12: resault = \"GCD = 21 \u00D7 (5) + 34 \u00D7 (-8) + 21 \u00D7 (8)\"\n\n- **STEP C-6-3**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uD56D\uC815\uB9AC\n  - \uCC38\uC8701: F14\n  - \uCC38\uC8702: G14\n  - \uC785\uB825\uAC12: resault = \"GCD = 34 \u00D7 (-8) + 21 \u00D7 (13)\"\n\n- **STEP C-7-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>21</1> \uB300\uC751\n  - \uCC38\uC8701: F13\n  - \uCC38\uC8702: G13\n  - \uC785\uB825\uAC12: resault = \"GCD = 34 \u00D7 (-8) + (55 - 34 \u00D7 1) \u00D7 (13)\"\n\n- **STEP C-7-2**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uBD84\uBC30\uBC95\uCE59\n  - \uCC38\uC8701: F13\n  - \uCC38\uC8702: G13\n  - \uC785\uB825\uAC12: resault = \"GCD = 34 \u00D7 (-8) + 55 \u00D7 (13) + 34 \u00D7 (-13)\"\n\n- **STEP C-7-3**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uD56D\uC815\uB9AC\n  - \uCC38\uC8701: F13\n  - \uCC38\uC8702: G13\n  - \uC785\uB825\uAC12: resault = \"GCD = 55 \u00D7 (13) + 34 \u00D7 (-21)\"\n\n- **STEP C-8-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>34</1> \uB300\uC751\n  - \uCC38\uC8701: F12\n  - \uCC38\uC8702: G12\n  - \uC785\uB825\uAC12: resault = \"GCD = 55 \u00D7 (13) + (89 - 55 \u00D7 1) \u00D7 (-21)\"\n\n- **STEP C-8-2**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uBD84\uBC30\uBC95\uCE59\n  - \uCC38\uC8701: F12\n  - \uCC38\uC8702: G12\n  - \uC785\uB825\uAC12: resault = \"GCD = 55 \u00D7 (13) + 89 \u00D7 (-21) + 55 \u00D7 (21)\"\n\n- **STEP C-8-3**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uD56D\uC815\uB9AC\n  - \uCC38\uC8701: F12\n  - \uCC38\uC8702: G12\n  - \uC785\uB825\uAC12: resault = \"GCD = 89 \u00D7 (-21) + 55 \u00D7 (34)\"\n\n- **STEP C-9-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>55</1> \uB300\uC751\n  - \uCC38\uC8701: F11\n  - \uCC38\uC8702: G11\n  - \uC785\uB825\uAC12: resault = \"GCD = 89 \u00D7 (-21) + (144 - 89 \u00D7 1) \u00D7 (34)\"\n\n- **STEP C-9-2**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uBD84\uBC30\uBC95\uCE59\n  - \uCC38\uC8701: F11\n  - \uCC38\uC8702: G11\n  - \uC785\uB825\uAC12: resault = \"GCD = 89 \u00D7 (-21) + 144 \u00D7 (34) + 89 \u00D7 (-34)\"\n\n- **STEP C-9-3**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uD56D\uC815\uB9AC\n  - \uCC38\uC8701: F11\n  - \uCC38\uC8702: G11\n  - \uC785\uB825\uAC12: resault = \"GCD = 144 \u00D7 (34) + 89 \u00D7 (-55)\"\n\n- **STEP C-10-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>89</1> \uB300\uC751\n  - \uCC38\uC8701: F10\n  - \uCC38\uC8702: G10\n  - \uC785\uB825\uAC12: resault = \"GCD = 144 \u00D7 (34) + (233 - 144 \u00D7 1) \u00D7 (-55)\"\n\n- **STEP C-10-2**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uBD84\uBC30\uBC95\uCE59\n  - \uCC38\uC8701: F10\n  - \uCC38\uC8702: G10\n  - \uC785\uB825\uAC12: resault = \"GCD = 144 \u00D7 (34) + 233 \u00D7 (-55) + 144 \u00D7 (55)\"\n\n- **STEP C-10-3**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uD56D\uC815\uB9AC\n  - \uCC38\uC8701: F10\n  - \uCC38\uC8702: G10\n  - \uC785\uB825\uAC12: resault = \"GCD = 233 \u00D7 (-55) + 144 \u00D7 (89)\"\n\n- **STEP C-11-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>144</1> \uB300\uC751\n  - \uCC38\uC8701: F9\n  - \uCC38\uC8702: G9\n  - \uC785\uB825\uAC12: resault = \"GCD = 233 \u00D7 (-55) + (377 - 233 \u00D7 1) \u00D7 (89)\"\n\n- **STEP C-11-2**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uBD84\uBC30\uBC95\uCE59\n  - \uCC38\uC8701: F9\n  - \uCC38\uC8702: G9\n  - \uC785\uB825\uAC12: resault = \"GCD = 233 \u00D7 (-55) + 377 \u00D7 (89) + 233 \u00D7 (-89)\"\n\n- **STEP C-11-3**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uD56D\uC815\uB9AC\n  - \uCC38\uC8701: F9\n  - \uCC38\uC8702: G9\n  - \uC785\uB825\uAC12: resault = \"GCD = 377 \u00D7 (89) + 233 \u00D7 (-144)\"\n\n- **STEP C-12-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>233</1> \uB300\uC751\n  - \uCC38\uC8701: F8\n  - \uCC38\uC8702: G8\n  - \uC785\uB825\uAC12: resault = \"GCD = 377 \u00D7 (89) + (610 - 377 \u00D7 1) \u00D7 (-144)\"\n\n- **STEP C-12-2**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uBD84\uBC30\uBC95\uCE59\n  - \uCC38\uC8701: F8\n  - \uCC38\uC8702: G8\n  - \uC785\uB825\uAC12: resault = \"GCD = 377 \u00D7 (89) + 610 \u00D7 (-144) + 377 \u00D7 (144)\"\n\n- **STEP C-12-3**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uD56D\uC815\uB9AC\n  - \uCC38\uC8701: F8\n  - \uCC38\uC8702: G8\n  - \uC785\uB825\uAC12: resault = \"GCD = 610 \u00D7 (-144) + 377 \u00D7 (233)\"\n\n- **STEP C-13-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>377</1> \uB300\uC751\n  - \uCC38\uC8701: F7\n  - \uCC38\uC8702: G7\n  - \uC785\uB825\uAC12: resault = \"GCD = 610 \u00D7 (-144) + (987 - 610 \u00D7 1) \u00D7 (233)\"\n\n- **STEP C-13-2**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uBD84\uBC30\uBC95\uCE59\n  - \uCC38\uC8701: F7\n  - \uCC38\uC8702: G7\n  - \uC785\uB825\uAC12: resault = \"GCD = 610 \u00D7 (-144) + 987 \u00D7 (233) + 610 \u00D7 (-233)\"\n\n- **STEP C-13-3**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uD56D\uC815\uB9AC\n  - \uCC38\uC8701: F7\n  - \uCC38\uC8702: G7\n  - \uC785\uB825\uAC12: resault = \"GCD = 987 \u00D7 (233) + 610 \u00D7 (-377)\"\n\n- **STEP C-14-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>610</1> \uB300\uC751\n  - \uCC38\uC8701: F6\n  - \uCC38\uC8702: G6\n  - \uC785\uB825\uAC12: resault = \"GCD = 987 \u00D7 (233) + (1597 - 987 \u00D7 1) \u00D7 (-377)\"\n\n- **STEP C-14-2**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uBD84\uBC30\uBC95\uCE59\n  - \uCC38\uC8701: F6\n  - \uCC38\uC8702: G6\n  - \uC785\uB825\uAC12: resault = \"GCD = 987 \u00D7 (233) + 1597 \u00D7 (-377) + 987 \u00D7 (377)\"\n\n- **STEP C-14-3**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uD56D\uC815\uB9AC\n  - \uCC38\uC8701: F6\n  - \uCC38\uC8702: G6\n  - \uC785\uB825\uAC12: resault = \"GCD = 1597 \u00D7 (-377) + 987 \u00D7 (610)\"\n\n- **STEP C-15-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>987</1> \uB300\uC751\n  - \uCC38\uC8701: F5\n  - \uCC38\uC8702: G5\n  - \uC785\uB825\uAC12: resault = \"GCD = 1597 \u00D7 (-377) + (2584 - 1597 \u00D7 1) \u00D7 (610)\"\n\n- **STEP C-15-2**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uBD84\uBC30\uBC95\uCE59\n  - \uCC38\uC8701: F5\n  - \uCC38\uC8702: G5\n  - \uC785\uB825\uAC12: resault = \"GCD = 1597 \u00D7 (-377) + 2584 \u00D7 (610) + 1597 \u00D7 (-610)\"\n\n- **STEP C-15-3**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uD56D\uC815\uB9AC\n  - \uCC38\uC8701: F5\n  - \uCC38\uC8702: G5\n  - \uC785\uB825\uAC12: resault = \"GCD = 2584 \u00D7 (610) + 1597 \u00D7 (-987)\"\n\n- **STEP C-16-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>1597</1> \uB300\uC751\n  - \uCC38\uC8701: F4\n  - \uCC38\uC8702: G4\n  - \uC785\uB825\uAC12: resault = \"GCD = 2584 \u00D7 (610) + (4181 - 2584 \u00D7 1) \u00D7 (-987)\"\n\n- **STEP C-16-2**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uBD84\uBC30\uBC95\uCE59\n  - \uCC38\uC8701: F4\n  - \uCC38\uC8702: G4\n  - \uC785\uB825\uAC12: resault = \"GCD = 2584 \u00D7 (610) + 4181 \u00D7 (-987) + 2584 \u00D7 (987)\"\n\n- **STEP C-16-3**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uD56D\uC815\uB9AC\n  - \uCC38\uC8701: F4\n  - \uCC38\uC8702: G4\n  - \uC785\uB825\uAC12: resault = \"GCD = 4181 \u00D7 (-987) + 2584 \u00D7 (1597)\"\n\n- **STEP C-17-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>2584</1> \uB300\uC751\n  - \uCC38\uC8701: F3\n  - \uCC38\uC8702: G3\n  - \uC785\uB825\uAC12: resault = \"GCD = 4181 \u00D7 (-987) + (6765 - 4181 \u00D7 1) \u00D7 (1597)\"\n\n- **STEP C-17-2**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uBD84\uBC30\uBC95\uCE59\n  - \uCC38\uC8701: F3\n  - \uCC38\uC8702: G3\n  - \uC785\uB825\uAC12: resault = \"GCD = 4181 \u00D7 (-987) + 6765 \u00D7 (1597) + 4181 \u00D7 (-1597)\"\n\n- **STEP C-17-3**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: \uD56D\uC815\uB9AC\n  - \uCC38\uC8701: F3\n  - \uCC38\uC8702: G3\n  - \uC785\uB825\uAC12: resault = \"GCD = 6765 \u00D7 (1597) + 4181 \u00D7 (-2584)\"\n\n- **STEP C-18-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>4181</1>\uB300\uC785\n  - \uCC38\uC8701: F2\n  - \uCC38\uC8702: G2\n  - \uC785\uB825\uAC12: resault = \"GCD = B \u00D7 (-2584) + 6765 \u00D7 (1597)\"\n\n- **STEP C-19-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: <1>6765</1>\uB300\uC785\n  - \uCC38\uC8701: F1\n  - \uCC38\uC8702: G1\n  - \uC785\uB825\uAC12: resault = \"GCD = B \u00D7 (-2584) + A \u00D7 (1597)\"\n\n- **STEP D-1-1**\n  - \uB300\uC0C1: resault\n  - \uD234\uD301 \uBC29\uD5A5: \uC544\uB798\uCABD\n  - \uD234\uD301: 4181 \u00D7 -2584 = -10803704\\n6765 \u00D7 1597 = 10803705\\n10803705 - 10803704 = 1 = GCD\n  - \uCC38\uC8701: F1\n  - \uCC38\uC8702: G1\n  - \uCC38\uC8703: F2\n  - \uCC38\uC8704: G2\n  - \uC785\uB825\uAC12: resault = \"GCD = 10803705 - 10803704 = 1\"\n\n"
};

function openTestSelectionModal() {
  let overlay = document.getElementById("test-selection-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "test-selection-overlay";
    overlay.className = "test-overlay-modal";
    document.body.appendChild(overlay);
  }
  
  overlay.innerHTML = `
    <div class="test-selection-card">
      <div class="test-modal-header">
        <h2>\uC790\uB3D9 \uD14C\uC2A4\uD2B8 \uC2E4\uD589 \uBC29\uC2DD \uC120\uD0DD</h2>
        <button class="test-modal-close" onclick="closeTestSelectionModal()">&times;</button>
      </div>
      <div style="display: flex; flex-direction: column; gap: 16px; margin: 15px 0;">
        <p style="margin: 0; font-size: 0.95rem; color: #475569; line-height: 1.5;">
          \uC218\uD589\uD560 \uC790\uB3D9 \uD14C\uC2A4\uD2B8 \uBC29\uC2DD\uC744 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.
        </p>
        
        <button class="test-selection-btn" onclick="selectUploadLocal()">
          \uD83D\uDCC1 \uB85C\uCEEC \uD14C\uC2A4\uD2B8 \uD30C\uC77C \uC5C5\uB85C\uB4DC (.md)
        </button>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; display: flex; flex-direction: column; gap: 10px; margin-top: 5px;">
          <h3 style="margin: 0; font-size: 0.95rem; color: #1e293b; font-weight: 700;">\uD83D\uDCCB \uB0B4\uC7A5 \uD14C\uC2A4\uD2B8 \uC608\uC81C \uC2E4\uD589</h3>
          <select id="test-example-select" class="test-example-select">
            <option value="tc/testcase_6192_1012.md">tc/testcase_6192_1012.md (A=6192, B=1012)</option>
            <option value="tc/testcase_5678_2233.md">tc/testcase_5678_2233.md (A=5678, B=2233)</option>
            <option value="tc/testcase_6765_4181.md">tc/testcase_6765_4181.md (A=6765, B=4181)</option>
          </select>
          <div style="display: flex; gap: 10px;">
            <button class="example-run-btn" onclick="runSelectedExample()">
              \uD83D\uDE80 \uC608\uC81C \uC2E4\uD589
            </button>
            <button class="example-download-btn" onclick="downloadSelectedExample()">
              \uD83D\uDCBE \uC608\uC81C \uB2E4\uC6B4\uB85C\uB4DC
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  overlay.classList.remove("hidden");
}

function closeTestSelectionModal() {
  const overlay = document.getElementById("test-selection-overlay");
  if (overlay) {
    overlay.classList.add("hidden");
  }
}

function selectUploadLocal() {
  closeTestSelectionModal();
  document.getElementById("test-file-picker").click();
}

function runSelectedExample() {
  const select = document.getElementById("test-example-select");
  if (!select) return;
  const val = select.value;
  const content = EXAMPLES[val];
  if (!content) return;
  
  closeTestSelectionModal();
  runAutoTest(content);
}

function downloadSelectedExample() {
  const select = document.getElementById("test-example-select");
  if (!select) return;
  const val = select.value;
  const content = EXAMPLES[val];
  if (!content) return;
  
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  
  const filename = val.split("/").pop();
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

window.openTestSelectionModal = openTestSelectionModal;
window.closeTestSelectionModal = closeTestSelectionModal;
window.selectUploadLocal = selectUploadLocal;
window.runSelectedExample = runSelectedExample;
window.downloadSelectedExample = downloadSelectedExample;