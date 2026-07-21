window.isHidden = false;

function getGuideSentence() {
  const stepObj = (cur_step === 0)
    ? stepsData[0]
    : ((window.actions && window.actions[cur_step - 1]) ? window.actions[cur_step - 1] : stepsData[cur_step]);
  if (!stepObj) return "";

  let valA = A;
  let valB = B;
  let valGcd = gcd;

  if (cur_step === 0) {
    const cellA = document.querySelector('[data-row="0"][data-col="1"]');
    const cellB = document.querySelector('[data-row="0"][data-col="2"]');
    const inputA = cellA ? cellA.value.trim() : "";
    const inputB = cellB ? cellB.value.trim() : "";
    valA = inputA || "?";
    valB = inputB || "?";
    if (inputA && inputB) {
      const pA = parseInt(inputA);
      const pB = parseInt(inputB);
      if (!isNaN(pA) && !isNaN(pB) && pA > 0 && pB > 0 && typeof window.getGcd === "function") {
        valGcd = window.getGcd(pA, pB);
      } else {
        valGcd = "?";
      }
    } else {
      valGcd = "?";
    }
  }

  let valSub = "";
  const matchC = stepObj.name ? stepObj.name.match(/^C-(\d+)-/) : null;
  if (matchC) {
    const substIdx = parseInt(matchC[1]);
    let tempA = A;
    let tempB = B;
    if (tempA < tempB) {
      const t = tempA;
      tempA = tempB;
      tempB = t;
    }
    let rList = [tempA, tempB];
    while (true) {
      let r = tempA % tempB;
      rList.push(r);
      if (r === 0) break;
      tempA = tempB;
      tempB = r;
    }
    const mVal = rList.length - 4;
    const targetRemIdx = mVal + 3 - substIdx;
    if (targetRemIdx >= 0 && targetRemIdx < rList.length) {
      valSub = rList[targetRemIdx];
    }
  }

  let rawSentence = stepObj.sentence || "";

  if (stepObj && stepObj.phase === 'A' && cur_step > 0) {
    const actIdx = cur_step - 1;
    const cycle = Math.floor(actIdx / 3);
    const stepType = actIdx % 3;
    const cycleRow = Math.floor(cycle / 2);
    const isOdd = (cycle % 2 === 0);

    let dividend, divisor, q, prod, rem;
    if (cycle === 0) {
      dividend = A;
      divisor = B;
    } else {
      if (isOdd) {
        dividend = V[cycleRow][0][0];
        divisor = V[cycleRow][1][0];
      } else {
        dividend = V[cycleRow][1][0];
        divisor = V[cycleRow+1][0][0];
      }
    }

    if (stepType === 0) {
      q = Math.floor(dividend / divisor);
      rawSentence = `<1>${dividend}</1> ÷ <2>${divisor}</2> = <0>${q}</0> ... ?`;
    } else if (stepType === 1) {
      q = isOdd ? V[cycleRow][2][0] : V[cycleRow][2][1];
      prod = q * divisor;
      rawSentence = `<1>${divisor}</1> × <2>${q}</2> = <0>${prod}</0>`;
    } else if (stepType === 2) {
      q = isOdd ? V[cycleRow][2][0] : V[cycleRow][2][1];
      prod = isOdd ? V[cycleRow][0][3] : V[cycleRow][1][3];
      rem = dividend - prod;
      rawSentence = `<1>${dividend}</1> - <2>${prod}</2> = <0>${rem}</0>`;
    }
  } else if (stepObj && stepObj.phase === 'B') {
    const r = stepObj.row;
    if (r === 0) {
      rawSentence = "A = <1>$argv1</1>";
    } else if (r === 1) {
      rawSentence = "B = <1>$argv2</1>";
    } else {
      const i = r - 2;
      const cycleRow = Math.floor(i / 2);
      const isOdd = (i % 2 === 0);
      
      let remVal, divVal, divSorVal, qVal;
      if (isOdd) {
        remVal = V[cycleRow+1][0][0];
        divVal = (i === 0) ? A : V[cycleRow][0][0];
        divSorVal = (i === 0) ? B : V[cycleRow][1][0];
        qVal = V[cycleRow][2][0];
      } else {
        remVal = V[cycleRow+1][1][0];
        divVal = V[cycleRow][1][0];
        divSorVal = V[cycleRow+1][0][0];
        qVal = V[cycleRow][2][1];
      }
      rawSentence = `<1>${remVal}</1> = <2>${divVal}</2> - <3>${divSorVal}</3> × <4>${qVal}</4>`;
    }
  } else if (stepObj && stepObj.phase === 'C') {
    if (stepObj.name === 'C-1-1') {
      rawSentence = "GCD($argv1, $argv2) = <1>$argv3</1>";
    } else if (stepObj.name === 'C-1-2') {
      rawSentence = "GCD 대입";
    } else if (stepObj.name === 'C-1-3') {
      rawSentence = "식 정렬";
    } else {
      const matchName = stepObj.name ? stepObj.name.match(/^C-(\d+)-(\d+)$/) : null;
      if (matchName) {
        const k = parseInt(matchName[1]);
        const subType = parseInt(matchName[2]);
        
        let tempA = A;
        let tempB = B;
        if (tempA < tempB) {
          const t = tempA;
          tempA = tempB;
          tempB = t;
        }
        let rList = [tempA, tempB];
        while (true) {
          let r = tempA % tempB;
          rList.push(r);
          if (r === 0) break;
          tempA = tempB;
          tempB = r;
        }
        const mVal = rList.length - 4;

        if (subType === 1) {
          if (k === mVal + 2) {
            rawSentence = "<1>$argv2</1>대입";
          } else if (k === mVal + 3) {
            rawSentence = "<1>$argv1</1>대입";
          } else {
            rawSentence = "<1>$argv4</1> 대응";
          }
        } else if (subType === 2) {
          rawSentence = "분배법칙";
        } else if (subType === 3) {
          rawSentence = "항정리";
        }
      }
    }
  } else if (stepObj && stepObj.phase === 'D') {
    const valA = A;
    const valB = B;
    const coeffA = window.final_A_coeff;
    const coeffB = window.final_B_coeff;
    const termA = valA * coeffA;
    const termB = valB * coeffB;
    const absA = Math.abs(termA);
    const line3 = termB >= 0
      ? `${termB} - ${absA} = ${gcd} = GCD`
      : `${termA} - ${Math.abs(termB)} = ${gcd} = GCD`;
    rawSentence = `${valB} × ${coeffB} = ${termB}\\n${valA} × ${coeffA} = ${termA}\\n${line3}`;
  }
  
  rawSentence = rawSentence
    .replace(/\$argv1/g, valA)
    .replace(/\$argv2/g, valB)
    .replace(/\$argv3/g, valGcd)
    .replace(/\$argv4/g, valSub);

  return rawSentence;
}

function guide() {
  const tooltip = document.getElementById("guide-tooltip");
  const content = document.getElementById("tooltip-content");
  if (!tooltip || !content) return;

  if (window.isHidden) {
    tooltip.classList.add("hidden");
    return;
  }

  const stepObj = (cur_step === 0)
    ? stepsData[0]
    : ((window.actions && window.actions[cur_step - 1]) ? window.actions[cur_step - 1] : stepsData[cur_step]);
  if (!stepObj) {
    tooltip.classList.add("hidden");
    return;
  }

  tooltip.classList.remove("hidden");

  let rawSentence = getGuideSentence();

  let formattedHTML = rawSentence
    .replace(/<0>([^<]+)<\/0>/g, '<span class="text-yellow">$1</span>')
    .replace(/<1>([^<]+)<\/1>/g, '<span class="text-red">$1</span>')
    .replace(/<2>([^<]+)<\/2>/g, '<span class="text-blue">$1</span>')
    .replace(/<3>([^<]+)<\/3>/g, '<span class="text-green">$1</span>')
    .replace(/<4>([^<]+)<\/4>/g, '<span class="text-purple">$1</span>')
    .replace(/\\n/g, '<br>')
    .replace(/\n/g, '<br>');

  content.innerHTML = formattedHTML;

  const stepIndicator = document.getElementById("tooltip-step-indicator");
  if (stepIndicator) {
    stepIndicator.textContent = getCycleStepString();
  }

  // Update button disabled state
  const prevBtn = document.getElementById("tooltip-prev-btn");
  const nextBtn = document.getElementById("tooltip-next-btn");
  const lastBtn = document.getElementById("tooltip-last-btn");
  const closeBtn = document.getElementById("tooltip-close-btn");
  if (prevBtn) prevBtn.disabled = (stateHistory.length <= 1);

  const totalSteps = window.actions ? window.actions.length : (window.stepsData || stepsData).length;
  const isLastStep = (cur_step === totalSteps) || isFin;
  if (isLastStep) {
    if (nextBtn) nextBtn.classList.add("hidden");
    if (lastBtn) lastBtn.classList.add("hidden");
    if (closeBtn) {
      closeBtn.classList.remove("hidden");
    }
  } else {
    if (nextBtn) {
      nextBtn.classList.remove("hidden");
      nextBtn.disabled = isFin;
    }
    if (lastBtn) {
      lastBtn.classList.remove("hidden");
      lastBtn.disabled = isFin;
    }
    if (closeBtn) closeBtn.classList.add("hidden");
  }

  // Trigger MathJax typesetting if available
  if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
    window.MathJax.typesetPromise([content]).catch(err => console.warn(err));
  }

  positionTooltip();
}

function positionTooltip() {
  const stepObj = (cur_step === 0)
    ? (window.stepsData || stepsData)[0]
    : ((window.actions && window.actions[cur_step - 1]) ? window.actions[cur_step - 1] : (window.stepsData || stepsData)[cur_step]);
  if (!stepObj) return;

  const targetCells = [];
  if (stepObj.targetCell && stepObj.targetCell.length === 2) {
    let row = stepObj.targetCell[0];
    let col = stepObj.targetCell[1];

    // In phase A, for A-even-2 steps, lower the tooltip by 1 cell (1 row)
    const match = stepObj.name ? stepObj.name.match(/^A-(\d+)-2$/) : null;
    if (match) {
      const cycleNum = parseInt(match[1]);
      if (cycleNum % 2 === 0) {
        row = row + 1;
      }
    }

    const c = getCell(row, col);
    if (c) targetCells.push(c);
  }

  positionTooltipToCells(targetCells, stepObj);
}

function positionTooltipToCells(cells, stepObj) {
  const tooltip = document.getElementById("guide-tooltip");
  if (!tooltip || window.isHidden) return;

  if (cells.length === 0) {
    // Center of the screen if no cell target
    tooltip.style.left = "50%";
    tooltip.style.top = "50%";
    tooltip.style.transform = "translate(-50%, -50%)";
    return;
  }

  const parent = tooltip.offsetParent || document.body;
  const parentRect = parent.getBoundingClientRect();

  let minLeft = Infinity;
  let maxRight = -Infinity;
  let minTop = Infinity;
  let maxBottom = -Infinity;

  cells.forEach(cell => {
    const rect = cell.getBoundingClientRect();
    if (rect.left < minLeft) minLeft = rect.left;
    if (rect.right > maxRight) maxRight = rect.right;
    if (rect.top < minTop) minTop = rect.top;
    if (rect.bottom > maxBottom) maxBottom = rect.bottom;
  });

  // Calculate coordinates relative to offsetParent
  const parentLeft = minLeft - parentRect.left;
  const parentRight = maxRight - parentRect.left;
  const parentTop = minTop - parentRect.top;
  const parentBottom = maxBottom - parentRect.top;

  const targetCenterX = (parentLeft + parentRight) / 2;
  const targetBottomY = parentBottom;
  const targetTopY = parentTop;

  // Tooltip dimensions
  const tooltipWidth = tooltip.offsetWidth;
  const tooltipHeight = tooltip.offsetHeight;

  // Position logic (by default below target)
  let top = targetBottomY + 8; // Small gap (8px instead of 12px)
  let left;
  if (stepObj && (stepObj.phase === 'C' || stepObj.phase === 'D')) {
    left = parentRect.width / 2 - tooltipWidth / 2;
  } else {
    left = targetCenterX - tooltipWidth / 2;
  }
  let isPlacedAbove = false;

  // Check if placing below exceeds the viewport
  if (maxBottom + tooltipHeight + 12 > window.innerHeight) {
    // Place above instead
    top = targetTopY - tooltipHeight - 8;
    isPlacedAbove = true;
  }

  // Horizontal boundaries check relative to offsetParent
  const maxLeftBound = parentRect.width - tooltipWidth - 10;
  if (left < 10) {
    left = 10;
  } else if (left > maxLeftBound) {
    left = maxLeftBound;
  }

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
  tooltip.style.transform = "none";

  if (isPlacedAbove) {
    tooltip.classList.add("placed-above");
  } else {
    tooltip.classList.remove("placed-above");
  }
}

function toggleGuide() {
  const tooltip = document.getElementById("guide-tooltip");
  if (!tooltip) return;

  if (window.isHidden) {
    tooltip.classList.remove("hidden");
    window.isHidden = false;
    guide();
  } else {
    tooltip.classList.add("hidden");
    window.isHidden = true;
  }
}

function makeTooltipDraggable() {
  const tooltip = document.getElementById("guide-tooltip");
  if (!tooltip) return;

  const header = tooltip.querySelector("#tooltip-content");
  if (!header) return;

  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

  tooltip.onmousedown = dragMouseDown;
  tooltip.ontouchstart = dragMouseDown;

  function dragMouseDown(e) {
    e = e || window.event;

    const target = e.target;
    if (target) {
      if (target.tagName === "BUTTON") {
        return;
      }
      if (header.contains(target)) {
        return;
      }
    }

    if (e.type !== "touchstart") {
      e.preventDefault();
    }
    
    const clientX = e.type === "touchstart" ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === "touchstart" ? e.touches[0].clientY : e.clientY;
    
    pos3 = clientX;
    pos4 = clientY;
    
    document.onmouseup = closeDragElement;
    document.ontouchend = closeDragElement;
    document.onmousemove = elementDrag;
    document.ontouchmove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    
    const clientX = e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === "touchmove" ? e.touches[0].clientY : e.clientY;

    pos1 = pos3 - clientX;
    pos2 = pos4 - clientY;
    pos3 = clientX;
    pos4 = clientY;
    
    tooltip.style.top = (tooltip.offsetTop - pos2) + "px";
    tooltip.style.left = (tooltip.offsetLeft - pos1) + "px";
    tooltip.style.transform = "none";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.ontouchend = null;
    document.onmousemove = null;
    document.ontouchmove = null;
  }
}

// Draggable initialization
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", makeTooltipDraggable);
} else {
  makeTooltipDraggable();
}

window.getGuideSentence = getGuideSentence;
