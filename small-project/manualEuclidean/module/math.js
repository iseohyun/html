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

  switch (cur_step) {
    case 0: // STEP A-1-1: A2 = 6 (L0)
      V[0][2][0] = Math.floor(A / B); // L0 = 6
      inputs[1][0].value = V[0][2][0]; // A2 = 6
      cur_line = 0;
      break;

    case 1: // STEP A-1-2: B2 = 6072 (A0_)
      V[0][0][3] = V[0][2][0] * B; // A0_ = 6 * 1012 = 6072
      inputs[1][1].value = V[0][0][3]; // B2 = 6072
      cur_line = 0;
      break;

    case 2: // STEP A-1-3: B3 = 120 (A1)
      V[1][0][0] = A - V[0][0][3]; // A1 = 6192 - 6072 = 120
      inputs[2][1].value = V[1][0][0]; // B3 = 120
      cur_line = 0;
      break;

    case 3: // STEP A-2-1: D2 = 8 (R0)
      V[0][2][1] = Math.floor(B / V[1][0][0]); // R0 = floor(1012 / 120) = 8
      inputs[1][3].value = V[0][2][1]; // D2 = 8
      cur_line = 0;
      break;

    case 4: // STEP A-2-2: C2 = 960 (B0_)
      V[0][1][3] = V[0][2][1] * V[1][0][0]; // B0_ = 8 * 120 = 960
      inputs[1][2].value = V[0][1][3]; // C2 = 960
      cur_line = 0;
      break;

    case 5: // STEP A-2-3: C3 = 52 (B1)
      V[1][1][0] = B - V[0][1][3]; // B1 = 1012 - 960 = 52
      inputs[2][2].value = V[1][1][0]; // C3 = 52
      cur_line = 0;
      break;

    case 6: // STEP A-3-1: A4 = 2 (L1)
      V[1][2][0] = Math.floor(V[1][0][0] / V[1][1][0]); // L1 = floor(120 / 52) = 2
      inputs[3][0].value = V[1][2][0]; // A4 = 2
      cur_line = 1;
      break;

    case 7: // STEP A-3-2: B4 = 104 (A1_)
      V[1][0][3] = V[1][2][0] * V[1][1][0]; // A1_ = 2 * 52 = 104
      inputs[3][1].value = V[1][0][3]; // B4 = 104
      cur_line = 1;
      break;

    case 8: // STEP A-3-3: B5 = 16 (A2)
      V[2][0][0] = V[1][0][0] - V[1][0][3]; // A2 = 120 - 104 = 16
      inputs[4][1].value = V[2][0][0]; // B5 = 16
      cur_line = 1;
      break;

    case 9: // STEP A-4-1: D4 = 3 (R1)
      V[1][2][1] = Math.floor(V[1][1][0] / V[2][0][0]); // R1 = floor(52 / 16) = 3
      inputs[3][3].value = V[1][2][1]; // D4 = 3
      cur_line = 1;
      break;

    case 10: // STEP A-4-2: C4 = 48 (B1_)
      V[1][1][3] = V[1][2][1] * V[2][0][0]; // B1_ = 3 * 16 = 48
      inputs[3][2].value = V[1][1][3]; // C4 = 48
      cur_line = 1;
      break;

    case 11: // STEP A-4-3: C5 = 4 (B2)
      V[2][1][0] = V[1][1][0] - V[1][1][3]; // B2 = 52 - 48 = 4
      inputs[4][2].value = V[2][1][0]; // C5 = 4
      cur_line = 1;
      break;

    case 12: // STEP A-5-1: A6 = 4 (L2)
      V[2][2][0] = Math.floor(V[2][0][0] / V[2][1][0]); // L2 = floor(16 / 4) = 4
      inputs[5][0].value = V[2][2][0]; // A6 = 4
      cur_line = 2;
      break;

    case 13: // STEP A-5-2: B6 = 16 (A2_)
      V[2][0][3] = V[2][2][0] * V[2][1][0]; // A2_ = 4 * 4 = 16
      inputs[5][1].value = V[2][0][3]; // B6 = 16
      cur_line = 2;
      break;

    case 14: // STEP A-5-3: B7 = 0 (A3)
      V[3][0][0] = V[2][0][0] - V[2][0][3]; // A3 = 16 - 16 = 0
      inputs[6][1].value = V[3][0][0]; // B7 = 0
      cur_line = 2;
      break;

    case 15: // STEP B-1: F1 = 6192, G1 = A
      inputs[0][5].value = A; // F1
      inputs[0][6].value = "A"; // G1
      cur_line = 3;
      break;

    case 16: // STEP B-2: F2 = 1012, G2 = B
      inputs[1][5].value = B; // F2
      inputs[1][6].value = "B"; // G2
      cur_line = 3;
      break;

    case 17: // STEP B-3: F3 = 120, G3 = 6192 - 1012 × 6
      inputs[2][5].value = 120; // F3
      inputs[2][6].value = `${A} - ${B} × 6`; // G3
      cur_line = 3;
      break;

    case 18: // STEP B-4: F4 = 52, G4 = 1012 - 120 × 8
      inputs[3][5].value = 52; // F4
      inputs[3][6].value = `${B} - 120 × 8`; // G4
      cur_line = 3;
      break;

    case 19: // STEP B-5: F5 = 16, G5 = 120 - 52 × 2
      inputs[4][5].value = 16; // F5
      inputs[4][6].value = `120 - 52 × 2`; // G5
      cur_line = 3;
      break;

    case 20: // STEP B-6: F6 = 4, G6 = 52 - 16 × 3
      inputs[5][5].value = 4; // F6
      inputs[5][6].value = `52 - 16 × 3`; // G6
      cur_line = 3;
      break;

    case 21: // STEP C-1-1
      document.getElementById("resault").innerHTML = `<span class="text-red">4</span> = <span class="text-blue"><u>52</u> - <u>16</u> × 3</span>`;
      cur_line = 3;
      break;

    case 22: // STEP C-1-2
      document.getElementById("resault").innerHTML = `GCD = <span class="text-blue"><u>52</u> - <u>16</u> × 3</span>`;
      cur_line = 3;
      break;

    case 23: // STEP C-1-3
      document.getElementById("resault").innerHTML = `GCD = <u>52</u> + <u>16</u> × (-3)`;
      cur_line = 3;
      break;

    case 24: // STEP C-2-1
      document.getElementById("resault").innerHTML = `GCD = <u>52</u> + (<span class="text-blue"><u>120</u> - <u>52</u> × 2</span>) × (-3)`;
      cur_line = 3;
      break;

    case 25: // STEP C-2-2
      document.getElementById("resault").innerHTML = `GCD = <u>52</u> + <u>120</u> × (-3) + <u>52</u> × 6`;
      cur_line = 3;
      break;

    case 26: // STEP C-2-3
      document.getElementById("resault").innerHTML = `GCD = <u>120</u> × (-3) + <u>52</u> × 7`;
      cur_line = 3;
      break;

    case 27: // STEP C-3-1
      document.getElementById("resault").innerHTML = `GCD = <u>120</u> × (-3) + (<span class="text-blue"><u>1012</u> - <u>120</u> × 8</span>) × 7`;
      cur_line = 3;
      break;

    case 28: // STEP C-3-2
      document.getElementById("resault").innerHTML = `GCD = <u>120</u> × (-3) + <u>1012</u> × 7 + <u>120</u> × (-56)`;
      cur_line = 3;
      break;

    case 29: // STEP C-3-3
      document.getElementById("resault").innerHTML = `GCD = <u>1012</u> × 7 + <u>120</u> × (-59)`;
      cur_line = 3;
      break;

    case 30: // STEP C-4-1
      document.getElementById("resault").innerHTML = `GCD = <u>1012</u> × 7 + (<span class="text-blue"><u>6192</u> - <u>1012</u> × 6</span>) × (-59)`;
      cur_line = 3;
      break;

    case 31: // STEP C-4-2
      document.getElementById("resault").innerHTML = `GCD = <u>1012</u> × 7 + <u>6192</u> × (-59) + <u>1012</u> × 354`;
      cur_line = 3;
      break;

    case 32: // STEP C-4-3
      document.getElementById("resault").innerHTML = `GCD = <u>1012</u> × 361 + <u>6192</u> × (-59)`;
      cur_line = 3;
      break;

    case 33: // STEP C-5-1
      document.getElementById("resault").innerHTML = `GCD = <span class="text-blue">B</span> × 361 + <u>6192</u> × (-59)`;
      cur_line = 3;
      break;

    case 34: // STEP C-6-1
      document.getElementById("resault").innerHTML = `GCD = B × 361 + <span class="text-blue">A</span> × (-59)`;
      isFin = true;
      cur_line = 3;
      break;
  }

  cur_step++;
  if (typeof highlightActiveStep === "function") highlightActiveStep();
  if (typeof guide === "function") guide();
}
