// guide.js - Interactive Popover Guide and Practice Challenge Management

let isHidden = false;

function getPostposition(digit, type) {
  const d = parseInt(digit);
  if (isNaN(d)) return "";
  if (type === "eul_leul") {
    return [0, 1, 3, 6, 7, 8].includes(d) ? "을" : "를";
  }
  return "";
}

function getCycleStepString() {
  if (guide_step === 0 || guide_step === 1) {
    return (language === 1) ? "시작" : "Start";
  }

  if (cur_line === 0) {
    const subStep = guide_step - 1;
    return `1-${subStep}`;
  } else {
    let subStep;
    if (guide_step === 8) subStep = 1;
    else if (guide_step === 9) subStep = 2;
    else if (guide_step === 10) subStep = 3;
    else if (guide_step === 4) subStep = 4;
    else if (guide_step === 5) subStep = 5;
    else if (guide_step === 6) subStep = 6;
    else if (guide_step === 7) subStep = 7;
    
    const cycleNum = cur_line + 1;
    return `${cycleNum}-${subStep}`;
  }
}

function guide() {
  const eul_leul = getPostposition(Q, "eul_leul");
  const argv4_last = argv4.toString().slice(-1);
  const argv4_eul_leul = getPostposition(argv4_last, "eul_leul");

  const colors = {};
  const cRed = "text-red";
  const cBlue = "text-blue";
  const cYellow = "text-yellow";

  if (guide_step === 0) {
    colors["$init_val"] = cYellow;
  } else if (guide_step === 2) {
    colors["$argv1"] = cRed;
    colors["$Q"] = cYellow;
  } else if (guide_step === 3) {
    colors["$Q"] = cRed; // Changed to cRed per user spec
  } else if (guide_step === 4) {
    if (cur_line === 0) {
      colors["$D"] = cBlue;
      colors["$Q"] = cRed;
      colors["$argv1_raw"] = cYellow;
    } else {
      colors["$D"] = cRed;
      colors["$Q"] = cBlue;
      colors["$argv1_raw"] = cYellow;
    }
  } else if (guide_step === 5) {
    colors["$argv2"] = cRed;
    colors["$argv1"] = cBlue;
    colors["$argv3"] = cYellow;
  } else if (guide_step === 6) {
    colors["$argv4"] = cRed; // Changed to cRed per user spec
  } else if (guide_step === 7) {
    colors["$argv1"] = cRed;
    colors["$argv2"] = cBlue;
    colors["$D"] = cYellow;
  } else if (guide_step === 8) {
    colors["$argv1"] = cYellow;
    colors["$N"] = cRed;
    colors["$D"] = cRed;
    colors["$Q"] = cYellow;
  } else if (guide_step === 9) {
    colors["$Q"] = cRed; // Changed to cRed per user spec
  } else if (guide_step === 10) {
    colors["$Q"] = cRed; // Changed to cRed per user spec
  }

  const values = {
    "$init_val": getInitValue() || "2",
    "$argv1_raw": D * Q,
    "$argv1": argv1,
    "$argv2": argv2,
    "$argv3": argv3,
    "$argv4": argv4,
    "$N": N,
    "$D": D,
    "$Q": Q
  };

  const keysOrder = [
    "$init_val",
    "$argv1_raw",
    "$argv1",
    "$argv2",
    "$argv3",
    "$argv4",
    "$N",
    "$D",
    "$Q"
  ];

  let sentence = sentences[guide_step][language];
  sentence = sentence.replaceAll("$argv4_eul_leul", argv4_eul_leul);
  sentence = sentence.replaceAll("$eul_leul", eul_leul);
  sentence = sentence.replace("$guide_step", guide_step);

  keysOrder.forEach(key => {
    const val = values[key];
    const colorClass = colors[key];
    if (colorClass) {
      const styledVal = `<span class="${colorClass}">${val}</span>`;
      sentence = sentence.replaceAll(`<em>${key}</em>`, styledVal);
      sentence = sentence.replaceAll(key, styledVal);
    } else {
      sentence = sentence.replaceAll(`<em>${key}</em>`, val);
      sentence = sentence.replaceAll(key, val);
    }
  });

  const tooltip = document.getElementById("guide-tooltip");
  if (tooltip) {
    document.getElementById("tooltip-content").innerHTML = sentence;
    
    // Update step indicator with cycle representation
    const cycleStr = getCycleStepString();
    const indicator = document.getElementById("tooltip-step-indicator");
    if (indicator) {
      indicator.textContent = (language === 1) ? `단계 ${cycleStr}` : `Step ${cycleStr}`;
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
        questionSpan.innerHTML = `직접 입력해보세요: <span class="math-var text-yellow">${D}</span><span class="math-box">?</span> &times; <span class="math-box">?</span> &le; <span class="text-red">${N}</span>인 <span class="math-box">?</span>는?`;
        document.querySelector(".check-btn").textContent = "확인";
        document.querySelector(".skip-btn").textContent = "Skip";
      } else { // English
        questionSpan.innerHTML = `Try it: What is <span class="math-box">?</span> for <span class="math-var text-yellow">${D}</span><span class="math-box">?</span> &times; <span class="math-box">?</span> &le; <span class="text-red">${N}</span>?`;
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

  let cellsToMeasure = Array.from(activeCells);
  if (guide_step === 0 || guide_step === 1) {
    const firstCell = document.querySelector('.init-input-cell[data-index="0"]');
    if (firstCell) {
      cellsToMeasure = [firstCell];
    }
  }

  tooltip.classList.remove("hidden");

  let minLeft = Infinity;
  let maxRight = -Infinity;
  let maxBottom = -Infinity;
  let minTop = Infinity;

  cellsToMeasure.forEach(cell => {
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
  cellsToMeasure.forEach(cell => {
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

function makeTooltipDraggable() {
  const tooltip = document.getElementById("guide-tooltip");
  if (!tooltip) return;

  let isDragging = false;
  let startX, startY;
  let initialLeft, initialTop;

  function handleStart(clientX, clientY, target, preventDefaultFunc) {
    if (target.tagName === "INPUT" || target.tagName === "BUTTON") {
      return;
    }
    if (target.closest && (target.closest("#tooltip-challenge") || target.closest("#tooltip-nav"))) {
      return;
    }
    isDragging = true;
    tooltip.style.transition = "none";
    startX = clientX;
    startY = clientY;
    const rect = tooltip.getBoundingClientRect();
    initialLeft = rect.left + window.scrollX;
    initialTop = rect.top + window.scrollY;
    if (preventDefaultFunc) preventDefaultFunc();
  }

  function handleMove(clientX, clientY) {
    if (!isDragging) return;
    const dx = clientX - startX;
    const dy = clientY - startY;
    tooltip.style.left = `${initialLeft + dx}px`;
    tooltip.style.top = `${initialTop + dy}px`;
  }

  function handleEnd() {
    if (isDragging) {
      isDragging = false;
      tooltip.style.transition = "";
    }
  }

  tooltip.addEventListener("mousedown", (e) => {
    handleStart(e.clientX, e.clientY, e.target, () => e.preventDefault());
  });

  document.addEventListener("mousemove", (e) => {
    handleMove(e.clientX, e.clientY);
  });

  document.addEventListener("mouseup", handleEnd);

  tooltip.addEventListener("touchstart", (e) => {
    if (e.touches && e.touches.length > 0) {
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY, e.target);
    }
  });

  document.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    if (e.touches && e.touches.length > 0) {
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    }
  });

  document.addEventListener("touchend", handleEnd);
}

// Initialize dragging feature
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", makeTooltipDraggable);
} else {
  makeTooltipDraggable();
}

