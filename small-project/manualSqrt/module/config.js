// config.js - Configuration, Global State, and History Management

let max_line = 8;
const inputs = [];
var cur_step = 1;
var cur_line = 0;
var fStep1_1 = false;
var fStep0_1 = false;
var language = 1; // 0: English, 1: Korean
var guide_step = 0;
var argv1 = 2;
var argv2 = 0;
var argv3 = 0;
var argv4 = "";
var N = 2, D, Q;
var digitGroups = [];
var numIntegerGroups = 1;

const titleText = [
  "Finding Square Roots",
  "제곱근 구하기"
];

const sentences = [
  [ // 0
    "Find the square root of <em>$init_val</em>.",
    "<em>$init_val</em>의 제곱근을 구합니다.",
  ],
  [ // 1
    "Click the [>] button.",
    "[>] 버튼을 누릅니다.",
  ],
  [ // 2 (Quotient decision L=0)
    "Find <span class=\"math-var\">x</span> where <span class=\"math-var\">x</span><sup>2</sup> &le; <em>$argv1</em>. <span class=\"math-var\">x</span> = <em>$Q</em>.",
    "<span class=\"math-var\">x</span><sup>2</sup> &le; <em>$argv1</em>을 만족하는 <span class=\"math-var\">x</span> = <em>$Q</em> 입니다."
  ],
  [ // 3 (x=Q를 작성합니다)
    "Write <em>$Q</em>.",
    "<em>$Q</em>$eul_leul 작성합니다."
  ],
  [ // 4 (D × Q를 구합니다)
    "<em>$D</em> &times; <em>$Q</em> = <em>$argv1_raw</em>",
    "<em>$D</em> &times; <em>$Q</em> = <em>$argv1_raw</em>"
  ],
  [ // 5 (뺄셈 단계)
    "<em>$argv2</em> - <em>$argv1</em> = <em>$argv3</em>",
    "<em>$argv2</em> - <em>$argv1</em> = <em>$argv3</em>"
  ],
  [ // 6 (수 내리기 단계)
    "Append '<em>$argv4</em>'.",
    "'<em>$argv4</em>'$argv4_eul_leul 붙입니다."
  ],
  [ // 7 (제수 더하기 단계)
    "<em>$argv1</em> + <em>$argv2</em> = <em>$D</em>",
    "<em>$argv1</em> + <em>$argv2</em> = <em>$D</em>"
  ],
  [ // 8 (다음 몫 구하기 단계)
    "Find <span class=\"math-box\">?</span> where <span class=\"math-var\">$argv1</span><span class=\"math-box\">?</span> &times; <span class=\"math-box\">?</span> &le; <em>$N</em>.<br>Since $D &times; $Q &le; $N, <span class=\"math-box\">?</span> is equal to <em>$Q</em>.",
    "<span class=\"math-var\">$argv1</span><span class=\"math-box\">?</span> &times; <span class=\"math-box\">?</span> &le; <em>$N</em>인 <span class=\"math-box\">?</span>를 찾습니다.<br>$D &times; $Q &le; $N이므로 <span class=\"math-box\">?</span>=<em>$Q</em> 입니다."
  ],
  [ // 9 (Q를 제수 아래에 작성합니다)
    "Write <em>$Q</em>.",
    "<em>$Q</em>$eul_leul 작성합니다."
  ],
  [ // 10 (가장 뒷자리에 Q를 붙여줍니다)
    "Append <em>$Q</em> to the end of the number.",
    "뒷 자리에 <em>$Q</em>$eul_leul 붙여 줍니다."
  ]
];

// Grid Configuration
const gridRows = 1 + 2 * max_line; // 17
let numInputCells = 20;
var stateHistory = [];
let quotientInput;

class GridInput {
  constructor(row, type) {
    this.row = row;
    this.type = type; // 0: num, 1: divisor, 2: divisor_, 3: quotient, 4: num_
    this._value = "";
  }

  get value() {
    return this._value === undefined || this._value === null ? "" : this._value.toString();
  }

  set value(val) {
    this._value = val === undefined || val === null ? "" : val.toString();
    updateGridCellDisplay(this.row, this.type, this._value, true);
  }
}

function saveState() {
  const state = {
    cur_line,
    cur_step,
    fStep1_1,
    fStep0_1,
    numIntegerGroups,
    digitGroups: [...digitGroups],
    guide_step,
    N,
    D,
    Q,
    argv1,
    argv2,
    argv3,
    argv4,
    numInputCells,
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
  fStep1_1 = targetState.fStep1_1;
  fStep0_1 = targetState.fStep0_1 || false;
  numIntegerGroups = targetState.numIntegerGroups || 1;
  digitGroups = targetState.digitGroups || [];
  guide_step = targetState.guide_step;
  N = targetState.N;
  D = targetState.D;
  Q = targetState.Q;
  argv1 = targetState.argv1;
  argv2 = targetState.argv2;
  argv3 = targetState.argv3;
  argv4 = targetState.argv4 || "";
  
  numInputCells = targetState.numInputCells;
  
  const maxLineNeeded = Math.max(8, cur_line + 1);
  ensureRowCapacity(maxLineNeeded);

  targetState.inputsValues.forEach((rowVals, r) => {
    rowVals.forEach((val, type) => {
      inputs[r][type]._value = val;
      updateGridCellDisplay(r, type, val, false); // no animations on undo
    });
  });

  const rightCols = Math.max(20, numInputCells);
  for (let r = targetState.inputsValues.length; r < inputs.length; r++) {
    clearGridRow(r, 0, 12 + rightCols);
  }

  guide();
}

function getInitValue() {
  let valStr = "";
  document.querySelectorAll(".init-input-cell").forEach(input => {
    valStr += input.value;
  });
  return valStr.trim();
}

function spacings(num) {
  var text = "";
  while (num-- > 0) {
    text += " ";
  }
  return text;
}
