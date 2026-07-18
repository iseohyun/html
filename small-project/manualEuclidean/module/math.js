// math.js - Mathematical Parsing and Euclidean Algorithm Logic

function getGcd(x, y) {
  let remainder = 0;
  while (y !== 0) {
    remainder = x % y;
    x = y;
    y = remainder;
  }
  return x;
}

function nextStep() {
  if (isFin) return;

  // Save state before modifying
  saveState();

  isGreating = false;

  const action = window.actions && window.actions[cur_step];
  if (!action) return;

  if (action.phase === 'A') {
    const cycle = action.cycle;
    const stepType = action.type;
    const cycleRow = Math.floor(cycle / 2);
    const isOdd = (cycle % 2 === 0);

    // Determine current dividend and divisor
    let dividend, divisor;
    if (cycle === 0) {
      dividend = A;
      divisor = B;
    } else {
      if (isOdd) {
        dividend = V[cycleRow][0][0]; // previous remainder in B column
        divisor = V[cycleRow][1][0];  // previous remainder in C column
      } else {
        dividend = V[cycleRow][1][0];  // remainder in C column
        divisor = V[cycleRow+1][0][0]; // remainder in B column
      }
    }

    if (stepType === 0) {
      // Quotient
      const q = Math.floor(dividend / divisor);
      if (isOdd) {
        if (!V[cycleRow]) V[cycleRow] = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0]];
        V[cycleRow][2][0] = q;
        inputs[2 * cycleRow + 1][0].value = q;
      } else {
        if (!V[cycleRow]) V[cycleRow] = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0]];
        V[cycleRow][2][1] = q;
        inputs[2 * cycleRow + 1][3].value = q;
      }
      cur_line = cycleRow;
    } else if (stepType === 1) {
      // Product
      const q = isOdd ? V[cycleRow][2][0] : V[cycleRow][2][1];
      const prod = q * divisor;
      if (isOdd) {
        V[cycleRow][0][3] = prod;
        inputs[2 * cycleRow + 1][1].value = prod;
      } else {
        V[cycleRow][1][3] = prod;
        inputs[2 * cycleRow + 1][2].value = prod;
      }
      cur_line = cycleRow;
    } else if (stepType === 2) {
      // Remainder
      const q = isOdd ? V[cycleRow][2][0] : V[cycleRow][2][1];
      const prod = isOdd ? V[cycleRow][0][3] : V[cycleRow][1][3];
      const rem = dividend - prod;
      if (!V[cycleRow+1]) V[cycleRow+1] = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0]];
      if (isOdd) {
        V[cycleRow+1][0][0] = rem;
        inputs[2 * cycleRow + 2][1].value = rem;
      } else {
        V[cycleRow+1][1][0] = rem;
        inputs[2 * cycleRow + 2][2].value = rem;
      }
      cur_line = cycleRow;
    }
  } else if (action.phase === 'B') {
    const r = action.row;
    if (r === 0) {
      inputs[0][5].value = A; // F1
      inputs[0][6].value = "A"; // G1
    } else if (r === 1) {
      inputs[1][5].value = B; // F2
      inputs[1][6].value = "B"; // G2
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

      inputs[r][5].value = remVal;
      inputs[r][6].value = `${divVal} - ${divSorVal} × ${qVal}`;
    }
    cur_line = r;
  } else if (action.phase === 'C') {
    const eqIdx = action.eqIdx;
    if (eqIdx < phaseCEquations.length) {
      document.getElementById("resault").innerHTML = phaseCEquations[eqIdx];
      if (eqIdx === phaseCEquations.length - 1) {
        isFin = true;
      }
    }
    cur_line = -99;
  }

  cur_step++;
  if (typeof highlightActiveStep === "function") highlightActiveStep();
  if (typeof guide === "function") guide();
}

let phaseCEquations = [];
let actions = [];

function generatePhaseC(startA, startB) {
  phaseCEquations = [];

  let tempA = startA;
  let tempB = startB;
  if (tempA < tempB) {
    const t = tempA;
    tempA = tempB;
    tempB = t;
  }

  let rList = [tempA, tempB];
  let qList = [];
  while (true) {
    let r = tempA % tempB;
    qList.push(Math.floor(tempA / tempB));
    rList.push(r);
    if (r === 0) break;
    tempA = tempB;
    tempB = r;
  }

  const m = rList.length - 4; // m is the number of remainders minus 1
  const gcdVal = rList[rList.length - 2];

  if (m < 0) {
    // GCD is B itself! (e.g. 12 and 4 -> gcd is 4)
    phaseCEquations.push(`<span class="text-red">${gcdVal}</span> = <span class="text-blue">B × 1</span>`);
    phaseCEquations.push(`GCD = <span class="text-blue">B × 1</span>`);
    phaseCEquations.push(`GCD = B × 1 + <span class="text-blue">A</span> × 0`);
    return;
  }

  // We have m >= 0 non-zero remainders.
  let term1 = { val: rList[m], coeff: 1 };
  let term2 = { val: rList[m+1], coeff: -qList[m] };

  function formatCoeff(c) {
    return c < 0 ? `(${c})` : `${c}`;
  }

  function formatTerm(val, coeff, isUnderline = true) {
    const valStr = isUnderline ? `<u>${val}</u>` : val;
    if (coeff === 1) return valStr;
    if (coeff === -1) return `-${valStr}`;
    return `${valStr} × ${formatCoeff(coeff)}`;
  }

  // Step 1-1
  phaseCEquations.push(`<span class="text-red">${gcdVal}</span> = <span class="text-blue"><u>${term1.val}</u> - <u>${term2.val}</u> × ${qList[m]}</span>`);
  // Step 1-2
  phaseCEquations.push(`GCD = <span class="text-blue"><u>${term1.val}</u> - <u>${term2.val}</u> × ${qList[m]}</span>`);
  // Step 1-3
  phaseCEquations.push(`GCD = ${formatTerm(term1.val, term1.coeff)} + ${formatTerm(term2.val, term2.coeff)}`);

  // Substitutions
  for (let j = m - 1; j >= 0; j--) {
    const subVal1 = rList[j];
    const subVal2 = rList[j+1];
    const subQ = qList[j];
    const term2Coeff = term2.coeff;

    // Step j-1 (Substitution)
    phaseCEquations.push(`GCD = ${formatTerm(term1.val, term1.coeff)} + (<span class="text-blue"><u>${subVal1}</u> - <u>${subVal2}</u> × ${subQ}</span>) × ${formatCoeff(term2Coeff)}`);

    // Step j-2 (Expansion)
    const expandedCoeff2 = -subQ * term2Coeff;
    phaseCEquations.push(`GCD = ${formatTerm(term1.val, term1.coeff)} + <u>${subVal1}</u> × ${formatCoeff(term2Coeff)} + <u>${subVal2}</u> × ${formatCoeff(expandedCoeff2)}`);

    // Step j-3 (Combination)
    const combinedCoeff = term1.coeff + expandedCoeff2;
    term1 = { val: subVal1, coeff: term2Coeff };
    term2 = { val: subVal2, coeff: combinedCoeff };

    phaseCEquations.push(`GCD = ${formatTerm(term1.val, term1.coeff)} + ${formatTerm(term2.val, term2.coeff)}`);
  }

  // Final substitutions for B and A
  phaseCEquations.push(`GCD = <span class="text-blue">B</span> × ${formatCoeff(term2.coeff)} + ${formatTerm(term1.val, term1.coeff)}`);
  phaseCEquations.push(`GCD = B × ${formatCoeff(term2.coeff)} + <span class="text-blue">A</span> × ${formatCoeff(term1.coeff)}`);
}

function buildActionsList(startA, startB) {
  actions = [];

  let tempA = startA;
  let tempB = startB;
  if (tempA < tempB) {
    const t = tempA;
    tempA = tempB;
    tempB = t;
  }

  // 1. Run Euclidean division to collect cycles
  let rList = [tempA, tempB];
  let qList = [];
  let cycleCount = 0;
  while (true) {
    let r = tempA % tempB;
    qList.push(Math.floor(tempA / tempB));
    rList.push(r);
    cycleCount++;
    if (r === 0) break;
    tempA = tempB;
    tempB = r;
  }

  const numCycles = cycleCount;

  // 2. Add Phase A actions
  for (let i = 0; i < numCycles; i++) {
    const cycleRow = Math.floor(i / 2);
    const isOdd = (i % 2 === 0);
    const qRow = 2 * cycleRow + 1;
    const rRow = 2 * cycleRow + 2;

    // Quotient
    actions.push({
      phase: 'A',
      name: `A-${i+1}-1`,
      cycle: i,
      type: 0,
      targetCell: [qRow, isOdd ? 0 : 3],
      ref1: isOdd ? [2 * cycleRow, 1] : [2 * cycleRow, 2],
      ref2: isOdd ? [2 * cycleRow, 2] : [2 * cycleRow + 2, 1],
      ref3: [],
      ref4: []
    });

    // Product
    actions.push({
      phase: 'A',
      name: `A-${i+1}-2`,
      cycle: i,
      type: 1,
      targetCell: [qRow, isOdd ? 1 : 2],
      ref1: isOdd ? [2 * cycleRow, 2] : [2 * cycleRow + 2, 1],
      ref2: [qRow, isOdd ? 0 : 3],
      ref3: [],
      ref4: []
    });

    // Remainder
    actions.push({
      phase: 'A',
      name: `A-${i+1}-3`,
      cycle: i,
      type: 2,
      targetCell: [rRow, isOdd ? 1 : 2],
      ref1: isOdd ? [2 * cycleRow, 1] : [2 * cycleRow, 2],
      ref2: [qRow, isOdd ? 1 : 2],
      ref3: [],
      ref4: []
    });
  }

  // 3. Add Phase B actions
  actions.push({
    phase: 'B',
    name: `B-1`,
    row: 0,
    targetCell: [0, 5],
    ref1: [0, 1],
    ref2: [],
    ref3: [],
    ref4: []
  });
  actions.push({
    phase: 'B',
    name: `B-2`,
    row: 1,
    targetCell: [1, 5],
    ref1: [0, 2],
    ref2: [],
    ref3: [],
    ref4: []
  });
  for (let r = 2; r <= numCycles; r++) {
    const i = r - 2;
    const cycleRow = Math.floor(i / 2);
    const isOdd = (i % 2 === 0);

    let ref1, ref2, ref3, ref4;
    if (isOdd) {
      ref1 = [2 * cycleRow + 2, 1];
      ref2 = (i === 0) ? [0, 1] : [2 * cycleRow, 1];
      ref3 = (i === 0) ? [0, 2] : [2 * cycleRow, 2];
      ref4 = [2 * cycleRow + 1, 0];
    } else {
      ref1 = [2 * cycleRow + 2, 2];
      ref2 = (i === 1) ? [0, 2] : [2 * cycleRow, 2];
      ref3 = [2 * cycleRow + 2, 1];
      ref4 = [2 * cycleRow + 1, 3];
    }

    actions.push({
      phase: 'B',
      name: `B-${r+1}`,
      row: r,
      targetCell: [r, 5],
      ref1: ref1,
      ref2: ref2,
      ref3: ref3,
      ref4: ref4
    });
  }

  // 4. Generate Phase C equations dynamically
  generatePhaseC(startA, startB);

  // 5. Add Phase C actions
  const m = rList.length - 4; // number of substitutions

  if (m < 0) {
    // GCD is B itself (e.g. 12 and 4)
    actions.push({
      phase: 'C',
      name: 'C-1-1',
      eqIdx: 0,
      targetCell: [-99, -99],
      ref1: [1, 6],
      ref2: [1, 5],
      ref3: [],
      ref4: []
    });
    actions.push({
      phase: 'C',
      name: 'C-1-2',
      eqIdx: 1,
      targetCell: [-99, -99],
      ref1: [1, 6],
      ref2: [1, 5],
      ref3: [],
      ref4: []
    });
    actions.push({
      phase: 'C',
      name: 'C-1-3',
      eqIdx: 2,
      targetCell: [-99, -99],
      ref1: [0, 6],
      ref2: [0, 5],
      ref3: [],
      ref4: []
    });
  } else {
    // C-1-1 to C-1-3
    actions.push({
      phase: 'C',
      name: 'C-1-1',
      eqIdx: 0,
      targetCell: [-99, -99],
      ref1: [numCycles, 6],
      ref2: [numCycles, 5],
      ref3: [],
      ref4: []
    });
    actions.push({
      phase: 'C',
      name: 'C-1-2',
      eqIdx: 1,
      targetCell: [-99, -99],
      ref1: [numCycles, 6],
      ref2: [numCycles, 5],
      ref3: [],
      ref4: []
    });
    actions.push({
      phase: 'C',
      name: 'C-1-3',
      eqIdx: 2,
      targetCell: [-99, -99],
      ref1: [numCycles, 6],
      ref2: [numCycles, 5],
      ref3: [],
      ref4: []
    });

    // C-j-1 to C-j-3 for j = 1 to m
    for (let j = 1; j <= m; j++) {
      const startEqIdx = 3 + 3 * (j - 1);
      const subRow = numCycles - j;
      
      actions.push({
        phase: 'C',
        name: `C-${j+1}-1`,
        eqIdx: startEqIdx,
        targetCell: [-99, -99],
        ref1: [subRow, 5],
        ref2: [subRow, 6],
        ref3: [],
        ref4: []
      });
      if (startEqIdx + 1 < phaseCEquations.length) {
        actions.push({
          phase: 'C',
          name: `C-${j+1}-2`,
          eqIdx: startEqIdx + 1,
          targetCell: [-99, -99],
          ref1: [subRow, 5],
          ref2: [subRow, 6],
          ref3: [],
          ref4: []
        });
      }
      if (startEqIdx + 2 < phaseCEquations.length) {
        actions.push({
          phase: 'C',
          name: `C-${j+1}-3`,
          eqIdx: startEqIdx + 2,
          targetCell: [-99, -99],
          ref1: [subRow, 5],
          ref2: [subRow, 6],
          ref3: [],
          ref4: []
        });
      }
    }

    // Final 2 steps (C-5-1, C-6-1 equivalent)
    const finalStartIdx = 3 + 3 * m;
    if (finalStartIdx < phaseCEquations.length) {
      actions.push({
        phase: 'C',
        name: `C-${m+2}-1`,
        eqIdx: finalStartIdx,
        targetCell: [-99, -99],
        ref1: [1, 5],
        ref2: [1, 6],
        ref3: [],
        ref4: []
      });
    }
    if (finalStartIdx + 1 < phaseCEquations.length) {
      actions.push({
        phase: 'C',
        name: `C-${m+3}-1`,
        eqIdx: finalStartIdx + 1,
        targetCell: [-99, -99],
        ref1: [0, 5],
        ref2: [0, 6],
        ref3: [],
        ref4: []
      });
    }
  }

  // Update window.actions
  window.actions = actions;
}

window.generatePhaseC = generatePhaseC;
window.buildActionsList = buildActionsList;
