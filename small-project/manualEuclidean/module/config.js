// config.js - Configuration, Global State, and History Management

let max_line = 7;
const inputs = [];
var cur_step = 0;
var cur_line = 0;
var language = 1; // 0: English, 1: Korean
var isFin = false;
var isGreating = false;
window.inPhaseA = true;

var A = 6192;
var B = 1012;
var gcd = 4;
var lcm = 0;

// 구조 = [[A#, A#A, A#B, A#_], [B#, B#A, B#B, B#_], [L#, R#]]
const V = new Array(7).fill().map(() => [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0]]);

const titleText = [
  "Euclidean algorithm",
  "유클리드 호제법"
];

// Steps data structure for side-by-side progression
const stepsData = [
  { // 0
    name: "0",
    sentence: "$argv1, $argv2로 유클리드 호제법을 수행합니다. \\n $$ a × $argv1 + b × $argv2 = gcd $$를 찾는 것이 목표입니다.",
    targetCell: [0, 1], // B1
    ref1: [],
    ref2: [],
    ref3: [],
    ref4: []
  },
  { // 1: A-1-1
    name: "A-1-1",
    sentence: "<1>6192</1> ÷ <2>1012</2> = <0>6</0> ... ?",
    targetCell: [1, 0], // A2
    ref1: [0, 1], // B1
    ref2: [0, 2], // C1
    ref3: [],
    ref4: []
  },
  { // 2: A-1-2
    name: "A-1-2",
    sentence: "<1>1012</1> × <2>6</2> = <0>6072</0>",
    targetCell: [1, 1], // B2
    ref1: [0, 2], // C1
    ref2: [1, 0], // A2
    ref3: [],
    ref4: []
  },
  { // 3: A-1-3
    name: "A-1-3",
    sentence: "<1>6192</1> - <2>6072</2> = <0>120</0>",
    targetCell: [2, 1], // B3
    ref1: [0, 1], // B1
    ref2: [1, 1], // B2
    ref3: [],
    ref4: []
  },
  { // 4: A-2-1
    name: "A-2-1",
    sentence: "<1>1012</1> ÷ <2>120</2> = <0>8</0> ... ?",
    targetCell: [1, 3], // D2
    ref1: [0, 2], // C1
    ref2: [2, 1], // B3
    ref3: [],
    ref4: []
  },
  { // 5: A-2-2
    name: "A-2-2",
    sentence: "<1>120</1> × <2>8</2> = <0>960</0>",
    targetCell: [1, 2], // C2
    ref1: [2, 1], // B3
    ref2: [1, 3], // D2
    ref3: [],
    ref4: []
  },
  { // 6: A-2-3
    name: "A-2-3",
    sentence: "<1>1012</1> - <2>960</2> = <0>52</0>",
    targetCell: [2, 2], // C3
    ref1: [0, 2], // C1
    ref2: [1, 2], // C2
    ref3: [],
    ref4: []
  },
  { // 7: A-3-1
    name: "A-3-1",
    sentence: "<1>120</1> ÷ <2>52</2> = <0>2</0> ... ?",
    targetCell: [3, 0], // A4
    ref1: [2, 1], // B3
    ref2: [2, 2], // C3
    ref3: [],
    ref4: []
  },
  { // 8: A-3-2
    name: "A-3-2",
    sentence: "<1>52</1> × <2>2</2> = <0>104</0>",
    targetCell: [3, 1], // B4
    ref1: [2, 2], // C3
    ref2: [3, 0], // A4
    ref3: [],
    ref4: []
  },
  { // 9: A-3-3
    name: "A-3-3",
    sentence: "<1>120</1> - <2>104</2> = <0>16</0>",
    targetCell: [4, 1], // B5
    ref1: [2, 1], // B3
    ref2: [3, 1], // B4
    ref3: [],
    ref4: []
  },
  { // 10: A-4-1
    name: "A-4-1",
    sentence: "<1>52</1> ÷ <2>16</2> = <0>3</0> ... ?",
    targetCell: [3, 3], // D4
    ref1: [2, 2], // C3
    ref2: [4, 1], // B5
    ref3: [],
    ref4: []
  },
  { // 11: A-4-2
    name: "A-4-2",
    sentence: "<1>16</1> × <2>3</2> = <0>48</0>",
    targetCell: [3, 2], // C4
    ref1: [4, 1], // B5
    ref2: [3, 3], // D4
    ref3: [],
    ref4: []
  },
  { // 12: A-4-3
    name: "A-4-3",
    sentence: "<1>52</1> - <2>48</2> = <0>4</0>",
    targetCell: [4, 2], // C5
    ref1: [2, 2], // C3
    ref2: [3, 2], // C4
    ref3: [],
    ref4: []
  },
  { // 13: A-5-1
    name: "A-5-1",
    sentence: "<1>16</1> ÷ <2>4</2> = <0>4</0> ... ?",
    targetCell: [5, 0], // A6
    ref1: [4, 1], // B5
    ref2: [4, 2], // C5
    ref3: [],
    ref4: []
  },
  { // 14: A-5-2
    name: "A-5-2",
    sentence: "<1>4</1> × <2>4</2> = <0>16</0>",
    targetCell: [5, 1], // B6
    ref1: [4, 2], // C5
    ref2: [5, 0], // A6
    ref3: [],
    ref4: []
  },
  { // 15: A-5-3
    name: "A-5-3",
    sentence: "<1>16</1> - <2>16</2> = <0>0</0> <종료>",
    targetCell: [6, 1], // B7
    ref1: [4, 1], // B5
    ref2: [5, 1], // B6
    ref3: [],
    ref4: []
  },
  { // 16: B-1
    name: "B-1",
    sentence: "A = <1>6192</1>",
    targetCell: [0, 5], // F1
    ref1: [0, 1], // B1
    ref2: [],
    ref3: [],
    ref4: []
  },
  { // 17: B-2
    name: "B-2",
    sentence: "B = <1>1012</1>",
    targetCell: [1, 5], // F2
    ref1: [0, 2], // C1
    ref2: [],
    ref3: [],
    ref4: []
  },
  { // 18: B-3
    name: "B-3",
    sentence: "<1>120</1> = <2>6192</2> - <3>1012</3> × <4>6</4>",
    targetCell: [2, 5], // F3
    ref1: [2, 1], // B3
    ref2: [0, 1], // B1
    ref3: [0, 2], // C1
    ref4: [1, 0]  // A2
  },
  { // 19: B-4
    name: "B-4",
    sentence: "<1>52</1> = <2>1012</2> - <3>120</3> × <4>8</4>",
    targetCell: [3, 5], // F4
    ref1: [2, 2], // C3
    ref2: [0, 2], // C1
    ref3: [2, 1], // B3
    ref4: [1, 3]  // D2
  },
  { // 20: B-5
    name: "B-5",
    sentence: "<1>16</1> = <2>120</2> - <3>52</3> × <4>2</4>",
    targetCell: [4, 5], // F5
    ref1: [4, 1], // B5
    ref2: [2, 1], // B3
    ref3: [2, 2], // C3
    ref4: [3, 0]  // A4
  },
  { // 21: B-6
    name: "B-6",
    sentence: "<1>4</1>  = <2>52</2> - <3>16</3> × <4>3</4>",
    targetCell: [5, 5], // F6
    ref1: [4, 2], // C5
    ref2: [2, 2], // C3
    ref3: [4, 1], // B5
    ref4: [3, 3]  // D4
  },
  { // 22: C-1-1
    name: "C-1-1",
    sentence: "GCD($argv1, $argv2) = <1>$argv3</1>",
    targetCell: [-99, -99],
    ref1: [5, 6], // G6
    ref2: [5, 5], // F6
    ref3: [],
    ref4: []
  },
  { // 23: C-1-2
    name: "C-1-2",
    sentence: "GCD 대입",
    targetCell: [-99, -99],
    ref1: [5, 6],
    ref2: [5, 5],
    ref3: [],
    ref4: []
  },
  { // 24: C-1-3
    name: "C-1-3",
    sentence: "식 정렬",
    targetCell: [-99, -99],
    ref1: [5, 6],
    ref2: [5, 5],
    ref3: [],
    ref4: []
  },
  { // 25: C-2-1
    name: "C-2-1",
    sentence: "<1>$argv4</1> 대입",
    targetCell: [-99, -99],
    ref1: [4, 5], // F5
    ref2: [4, 6], // G5
    ref3: [],
    ref4: []
  },
  { // 26: C-2-2
    name: "C-2-2",
    sentence: "분배법칙",
    targetCell: [-99, -99],
    ref1: [4, 5],
    ref2: [4, 6],
    ref3: [],
    ref4: []
  },
  { // 27: C-2-3
    name: "C-2-3",
    sentence: "항정리",
    targetCell: [-99, -99],
    ref1: [4, 5],
    ref2: [4, 6],
    ref3: [],
    ref4: []
  },
  { // 28: C-3-1
    name: "C-3-1",
    sentence: "<1>$argv4</1> 대입",
    targetCell: [-99, -99],
    ref1: [3, 5], // F4
    ref2: [3, 6], // G4
    ref3: [],
    ref4: []
  },
  { // 29: C-3-2
    name: "C-3-2",
    sentence: "분배법칙",
    targetCell: [-99, -99],
    ref1: [3, 5],
    ref2: [3, 6],
    ref3: [],
    ref4: []
  },
  { // 30: C-3-3
    name: "C-3-3",
    sentence: "항정리",
    targetCell: [-99, -99],
    ref1: [3, 5],
    ref2: [3, 6],
    ref3: [],
    ref4: []
  },
  { // 31: C-4-1
    name: "C-4-1",
    sentence: "<1>$argv4</1> 대입",
    targetCell: [-99, -99],
    ref1: [2, 5], // F3
    ref2: [2, 6], // G3
    ref3: [],
    ref4: []
  },
  { // 32: C-4-2
    name: "C-4-2",
    sentence: "분배법칙",
    targetCell: [-99, -99],
    ref1: [2, 5],
    ref2: [2, 6],
    ref3: [],
    ref4: []
  },
  { // 33: C-4-3
    name: "C-4-3",
    sentence: "항정리",
    targetCell: [-99, -99],
    ref1: [2, 5],
    ref2: [2, 6],
    ref3: [],
    ref4: []
  },
  { // 34: C-5-1
    name: "C-5-1",
    sentence: "<1>$argv2</1> 대입",
    targetCell: [-99, -99],
    ref1: [1, 5], // F2
    ref2: [1, 6], // G2
    ref3: [],
    ref4: []
  },
  { // 35: C-6-1
    name: "C-6-1",
    sentence: "<1>$argv1</1> 대입",
    targetCell: [-99, -99],
    ref1: [0, 5], // F1
    ref2: [0, 6], // G1
    ref3: [],
    ref4: []
  }
];

// Grid Configuration
var stateHistory = [];

class GridInput {
  constructor(row, col) {
    this.row = row;
    this.col = col;
    this._value = "";
  }

  get value() {
    return this._value === undefined || this._value === null ? "" : this._value.toString();
  }

  set value(val) {
    this._value = val === undefined || val === null ? "" : val.toString();
    if (typeof updateGridCellDisplay === "function") {
      updateGridCellDisplay(this.row, this.col, this._value, true);
    }
  }
}

function saveState() {
  const state = {
    cur_line,
    cur_step,
    isFin,
    isGreating,
    A,
    B,
    gcd,
    lcm,
    inPhaseA: window.inPhaseA,
    V: JSON.parse(JSON.stringify(V)),
    inputsValues: inputs.map(row => row.map(input => input._value))
  };
  stateHistory.push(state);
}

function prevStep() {
  if (stateHistory.length <= 1) return;

  stateHistory.pop();
  const targetState = stateHistory[stateHistory.length - 1];

  cur_line = targetState.cur_line;
  cur_step = targetState.cur_step;
  isFin = targetState.isFin;
  isGreating = targetState.isGreating;
  A = targetState.A;
  B = targetState.B;
  gcd = targetState.gcd;
  lcm = targetState.lcm;
  window.inPhaseA = targetState.inPhaseA;
  
  for (let i = 0; i < V.length; i++) {
    V[i] = JSON.parse(JSON.stringify(targetState.V[i]));
  }

  targetState.inputsValues.forEach((rowVals, r) => {
    rowVals.forEach((val, c) => {
      inputs[r][c]._value = val;
      if (typeof updateGridCellDisplay === "function") {
        updateGridCellDisplay(r, c, val, false);
      }
    });
  });

  if (typeof highlightActiveStep === "function") {
    highlightActiveStep();
  }
  if (typeof guide === "function") {
    guide();
  }
}

function getCycleStepString() {
  if (isGreating || cur_step === 0) {
    return "STEP 0";
  }
  const action = window.actions && window.actions[cur_step - 1];
  return action ? `STEP ${action.name}` : `STEP ${cur_step}`;
}

function getPostposition(digit, type) {
  return "";
}
