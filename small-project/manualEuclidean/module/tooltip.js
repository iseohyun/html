// tooltip.js - Tooltip Control and Localization

let isHidden = false;

function guide() {
  const tooltip = document.getElementById("guide-tooltip");
  const content = document.getElementById("tooltip-content");
  if (!tooltip || !content) return;

  const stepObj = stepsData[cur_step];
  if (!stepObj) {
    tooltip.classList.add("hidden");
    return;
  }

  tooltip.classList.remove("hidden");

  // Format sentence tags to styled spans
  let rawSentence = stepObj.sentence || "";
  
  // Replace arguments $argv1, $argv2, etc. if present
  rawSentence = rawSentence
    .replace(/\$argv1/g, A)
    .replace(/\$argv2/g, B)
    .replace(/\$argv3/g, gcd);

  // Replace XML highlights with actual spans
  let formattedHTML = rawSentence
    .replace(/<0>([^<]+)<\/0>/g, '<span class="text-yellow">$1</span>')
    .replace(/<1>([^<]+)<\/1>/g, '<span class="text-red">$1</span>')
    .replace(/<2>([^<]+)<\/2>/g, '<span class="text-blue">$1</span>')
    .replace(/<3>([^<]+)<\/3>/g, '<span class="text-green">$1</span>')
    .replace(/<4>([^<]+)<\/4>/g, '<span class="text-purple">$1</span>')
    .replace(/\\n/g, '<br>')
    .replace(/\n/g, '<br>');

  content.innerHTML = formattedHTML;

  // Update step navigation indicators
  const stepIndicator = document.getElementById("tooltip-step-indicator");
  if (stepIndicator) {
    stepIndicator.textContent = getCycleStepString();
  }

  // Update button disabled state
  const prevBtn = document.getElementById("tooltip-prev-btn");
  const nextBtn = document.getElementById("tooltip-next-btn");
  const closeBtn = document.getElementById("tooltip-close-btn");
  if (prevBtn) prevBtn.disabled = (stateHistory.length <= 1);

  const isLastStep = (cur_step === stepsData.length - 1);
  if (isLastStep) {
    if (nextBtn) nextBtn.classList.add("hidden");
    if (closeBtn) {
      closeBtn.classList.remove("hidden");
    }
  } else {
    if (nextBtn) {
      nextBtn.classList.remove("hidden");
      nextBtn.disabled = isFin;
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
  const stepObj = stepsData[cur_step];
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

  positionTooltipToCells(targetCells);
}

function positionTooltipToCells(cells) {
  const tooltip = document.getElementById("guide-tooltip");
  if (!tooltip || isHidden) return;

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
  let left = targetCenterX - tooltipWidth / 2;
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

  if (isHidden) {
    tooltip.classList.remove("hidden");
    isHidden = false;
    guide();
  } else {
    tooltip.classList.add("hidden");
    isHidden = true;
  }
}

function makeTooltipDraggable() {
  const tooltip = document.getElementById("guide-tooltip");
  if (!tooltip) return;

  const header = tooltip.querySelector("#tooltip-content");
  if (!header) return;

  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

  header.onmousedown = dragMouseDown;
  header.ontouchstart = dragMouseDown;

  function dragMouseDown(e) {
    e = e || window.event;
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
