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
    .replace(/\$\$/g, "")         // Strip MathJax $$ markers
    .replace(/<br\s*\/?>/gi, " ") // Replace <br> with space
    .replace(/<[^>]+>/g, "")      // Strip all HTML/XML tags
    .replace(/\s+/g, " ")         // Collapse multiple whitespace
    .replace(/×/g, "x")           // Multiplication symbol to x
    .replace(/\s*([=+\-x≤&<>])\s*/g, "$1") // Strip spaces around operators
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
      const tooltipElem = document.getElementById("tooltip-content");
      const actualTooltip = tooltipElem ? normalizeText(tooltipElem.innerHTML) : "";
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
          stepErrors.push(`툴팁 정렬 방향 불일치: (기대값: ${expectsAbove ? "위쪽" : "아래쪽"} | 실젯값: ${isPlacedAbove ? "위쪽" : "아래쪽"})`);
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
