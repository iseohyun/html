// testRunner.js

function colLetterToIdx(letter) {
  let col = 0;
  for (let i = 0; i < letter.length; i++) {
    col = col * 26 + (letter.charCodeAt(i) - 65 + 1);
  }
  return col - 1;
}

function parseCell(cellStr) {
  cellStr = cellStr.trim();
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
    .replace(/\s+/g, " ")      // Collapse multiple whitespace
    .replace(/²/g, "2")        // Superscript 2 to 2
    .replace(/×/g, "x")        // Multiplication symbol to x
    .replace(/\s*([=+\-x≤&<>])\s*/g, "$1") // Strip spaces around operators
    .trim();
}

function parseTestCase(mdText) {
  const steps = [];
  const sections = mdText.split(/- \*\*STEP\s+/i);
  for (let i = 1; i < sections.length; i++) {
    const sec = sections[i];
    const lines = sec.split("\n");
    const headerMatch = lines[0].match(/^(\d+)\*\*(?:\s*\((.*?)\))?\s*:/);
    if (!headerMatch) continue;
    const stepNum = parseInt(headerMatch[1]);
    const desc = headerMatch[2] ? headerMatch[2].trim() : "";
    
    let tooltipText = "";
    let tooltipPos = "";
    let ref1 = [];
    let ref2 = [];
    let target = [];
    let inputs = [];
    
    lines.forEach(line => {
      line = line.trim();
      if (line.startsWith("- 툴팁:")) {
        tooltipText = line.replace("- 툴팁:", "").trim();
      } else if (line.startsWith("- 툴팁 위치:")) {
        tooltipPos = line.replace("- 툴팁 위치:", "").trim();
      } else if (line.startsWith("- 참조1:")) {
        ref1 = parseCellsList(line.replace("- 참조1:", "").trim());
      } else if (line.startsWith("- 참조2:")) {
        ref2 = parseCellsList(line.replace("- 참조2:", "").trim());
      } else if (line.startsWith("- Target(Highlight):")) {
        target = parseCellsList(line.replace("- Target(Highlight):", "").trim());
      } else if (line.startsWith("- Input:")) {
        const inputStr = line.replace("- Input:", "").trim();
        if (!inputStr.includes("없음")) {
          inputStr.split(",").forEach(item => {
            const parts = item.split("=");
            if (parts.length === 2) {
              const cell = parseCell(parts[0].trim());
              if (cell) {
                const valCleaned = parts[1].split("(")[0].trim();
                inputs.push({
                  row: cell.row,
                  col: cell.col,
                  name: parts[0].trim(),
                  val: valCleaned
                });
              }
            }
          });
        }
      }
    });
    
    steps.push({
      stepNum,
      desc,
      tooltipText,
      tooltipPos,
      ref1,
      ref2,
      target,
      inputs
    });
  }
  return steps;
}

function getCellValue(r, c) {
  const cell = getCell(r, c);
  if (!cell) return "";
  if (cell.tagName === "INPUT") return cell.value.trim();
  return cell.textContent.trim();
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
  
  // Clear the input value so user can select the same file again later if needed
  event.target.value = "";
}

async function runAutoTest(mdText) {
  // Create or show modal overlay
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

    // Parse initial input value from the first line (e.g. ### 입력값: 333)
    let startVal = "333";
    const firstLine = mdText.split("\n")[0].trim();
    const inputMatch = firstLine.match(/###\s*입력값:\s*([0-9.]+)/);
    if (inputMatch) {
      startVal = inputMatch[1].trim();
    }

    progressMsg.textContent = `그리드를 초기값 '${startVal}'으로 리셋 중...`;
    
    // Reset states first
    resetToStart();
    
    // Ensure grid has correct number of input cells
    numInputCells = startVal.length;
    rebuildGrid(numInputCells);
    
    // Set init input values
    const initInputs = document.querySelectorAll(".init-input-cell");
    for (let i = 0; i < startVal.length; i++) {
      if (initInputs[i]) initInputs[i].value = startVal[i];
    }
    
    // Initialize state with correct parsed test value
    const parsedVal = parseFloat(startVal);
    if (!isNaN(parsedVal)) {
      init(parsedVal);
    } else {
      init(2);
    }
    
    await new Promise(r => setTimeout(r, 100));

    const results = [];
    const debugLogs = [];
    let passCount = 0;

    for (let idx = 0; idx < expectedSteps.length; idx++) {
      const step = expectedSteps[idx];
      const logLine = `[idx:${idx} step:${step.stepNum}] guide_step=${guide_step}, cur_line=${cur_line}, cur_step=${cur_step}, N=${N}, D=${D}, Q=${Q}, fStep0_1=${fStep0_1}, fStep1_1=${fStep1_1}`;
      console.log(logLine);
      debugLogs.push(logLine);

      progressMsg.textContent = `STEP ${step.stepNum} 검증 중 (${idx + 1}/${expectedSteps.length})`;
      progressBar.style.width = `${((idx) / expectedSteps.length) * 100}%`;
      await new Promise(r => setTimeout(r, 80));

      // Skip validation for STEP 0 since it is the initial typing screen state
      if (step.stepNum === 0) {
        results.push({
          step: step.stepNum,
          cycleStep: (typeof getCycleStepString === "function") ? getCycleStepString() : "시작",
          desc: step.desc,
          isPass: true,
          errors: []
        });
        passCount++;
        // Advance to next step
        if (idx < expectedSteps.length - 1) {
          nextStep();
        }
        continue;
      }

      const stepErrors = [];

      // 1. Verify Tooltip Text (normalized)
      const tooltipElem = document.getElementById("tooltip-content");
      const actualTooltip = tooltipElem ? normalizeText(tooltipElem.textContent) : "";
      const expectedTooltip = normalizeText(step.tooltipText);
      if (actualTooltip !== expectedTooltip) {
        stepErrors.push(`툴팁 내용 불일치: (기대값: "${step.tooltipText}" | 실젯값: "${tooltipElem ? tooltipElem.textContent : ''}")`);
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
      const activeCells = document.querySelectorAll(".grid-cell.active, .init-input-cell.active");
      activeCells.forEach(cell => {
        const r = parseInt(cell.dataset.row);
        const c = parseInt(cell.dataset.col);
        const inExpected = step.target.some(tc => tc.row === r && tc.col === c);
        if (!inExpected) {
          const colLetter = String.fromCharCode(c + 65); // Simplified conversion
          stepErrors.push(`의도하지 않은 active 셀 감지: [${colLetter}${r + 1}]`);
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

      // 5. Verify Reference 2 (Highlight-blue)
      step.ref2.forEach(cell => {
        const cellElem = getCell(cell.row, cell.col);
        if (!cellElem) {
          stepErrors.push(`참조2 셀 [${cell.name}]을 찾을 수 없음`);
        } else if (!cellElem.classList.contains("highlight-blue")) {
          stepErrors.push(`참조2 셀 [${cell.name}] 연한 파란색 하이라이트(highlight-blue) 누락`);
        }
      });

      // 6. Verify Input Values
      step.inputs.forEach(inp => {
        const actualVal = getCellValue(inp.row, inp.col);
        if (actualVal !== inp.val) {
          stepErrors.push(`셀 값 불일치: [${inp.name}] (기대값: "${inp.val}" | 실젯값: "${actualVal}")`);
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
        if (isChallengeStep()) {
          skipPractice();
        } else {
          nextStep();
        }
      }
    }

    progressBar.style.width = "100%";
    progressMsg.innerHTML = `검증 완료! <span class="${passCount === expectedSteps.length ? 'text-green-bold' : 'text-red-bold'}">성공: ${passCount} / ${expectedSteps.length} Steps</span>`;

    // Render results
    resultsList.innerHTML = results.map(r => `
      <div class="test-result-item ${r.isPass ? 'pass' : 'fail'}">
        <div class="test-result-header">
          <span class="test-badge ${r.isPass ? 'badge-pass' : 'badge-fail'}">${r.isPass ? 'PASS' : 'FAIL'}</span>
          <strong>STEP ${r.step} (단계 ${r.cycleStep})</strong>: ${r.desc}
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

    // Enable copy button
    if (copyBtn) copyBtn.disabled = false;

  } catch (err) {
    progressMsg.innerHTML = `<span style="color: #ef4444; font-weight: bold;">오류 발생: ${err.message}</span>`;
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

window.closeTestOverlay = closeTestOverlay;
window.handleTestFileSelect = handleTestFileSelect;
window.runAutoTest = runAutoTest;
window.copyTestResults = copyTestResults;
