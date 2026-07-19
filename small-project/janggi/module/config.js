// config.js - Global variables and game state configurations

/**
 * @typedef {Object} Piece - 장기 기물 객체 스키마
 * @property {number} x - 기물의 X 좌표 (1~9, 0이면 잡혀서 판 밖으로 나간 상태)
 * @property {number} y - 기물의 Y 좌표 (0~9, 세로 1~9행과 최하단 10번째 행을 0으로 표현)
 * @property {SVGElement} e - 기물에 해당하는 SVG 이미지 엘리먼트 객체
 */

/**
 * @typedef {Object} LogEntry - 착수 로그 기록 단일 항목 스키마
 * @property {number} i - 움직인 기물의 ID (0~31)
 * @property {number} x - 이동 대상 X 좌표 (1~9)
 * @property {number} y - 이동 대상 Y 좌표 (0~9)
 * @property {number} t - 포획된 기물의 ID (포획 대상이 없으면 32)
 * @property {string} [comment] - 착수별 해설 코멘트
 */

window.addEventListener('error', function(e) {
  console.error("[Janggi Runtime Error]", e.message, "at", e.filename, ":", e.lineno, ":", e.colno);
});

// highlightjs-line-numbers가 copy 이벤트 시 SVG 엘리먼트의 className(SVGAnimatedString)에서 indexOf가 없어서 터지는 에러를 방지합니다.
if (typeof SVGAnimatedString !== 'undefined') {
  if (!SVGAnimatedString.prototype.indexOf) {
    SVGAnimatedString.prototype.indexOf = function(str, fromIndex) {
      return this.baseVal ? this.baseVal.indexOf(str, fromIndex) : -1;
    };
  }
  if (!SVGAnimatedString.prototype.includes) {
    SVGAnimatedString.prototype.includes = function(str, position) {
      return this.baseVal ? this.baseVal.includes(str, position) : false;
    };
  }
}

const svg = document.getElementById("janggi-svg");
const board = document.getElementById("board");
const selectBox = document.getElementById("select-box");
const boardMargin = 0;  // 장기판의 외부 하얀색 여백(margin)
var showCoordinates = true; // 좌표선 표시 여부
var animDuration = 0.5; // 애니메이션 이동 시간 (초 단위)
var animHeight = 0.2;   // 애니메이션 기물 들기 높이 배율 (기본 0.2, 범위 0~2.0)

// 장기알 크기 배율 (왕, 큰기물, 작은기물)
var sizeKing = 1.15;
var sizeMiddle = 0.90;
var sizeSmall = 0.70;

// 장기알 글씨 크기 배율 (왕, 큰기물, 작은기물)
var fontScaleKing = 1.25;
var fontScaleMiddle = 1.45;
var fontScaleSmall = 1.45;

// 좌표 라벨 글씨 크기 배율
var coordsTextScale = 0.18;

// 디자인 커스텀 상태값
var boardColorType = "wood";
var choColorType = "blue";
var hanColorType = "red";
var pieceShapeType = "octagon";
var candiShapeType = "empty_circle";
var candiColorType = "#3b82f6";
var aiMode = 0; // AI 모드: 0=사용안함, 1=AI가 초(Blue), 2=AI가 한(Red)
var cursorLockMode = false; // 키보드 커서락 모드 여부
var gameEnded = false; // 외통수 등으로 대국이 종료되었는지 여부

// 설정창 비주얼 상태값
var settingsBgColor = "#0f172a";
var settingsOpacity = 0.55;
var settingsTextColorType = "auto";
var settingsTextColorCustom = "#f8fafc";
var settingsAccentColor = "#3b82f6";

var boardPaddingLeft = 45;
var boardPaddingRight = 20;
var boardPaddingTop = 45;
var boardPaddingBottom = 20;
var boardWidth;
var boardHeight;
var unitSize; // 한 칸의 크기 (그릴 수 있는 최대 크기)
var piecesSize = 0.8; // 장기말이 한칸당 차지하는 비율 (80%)
var hitBox; // 말이 선택되었을 때
const pieces = new Array(32); // 장기말은 고유의 ID를 가지고 있습니다.
const initPieces = new Array(32); // 장기말은 고유의 ID를 가지고 있습니다.
var newGameState = [0, 0];
var iAmCho = false;
const candiBoxList = new Array(); // 생성된 이동가능 경로들을 관리합니다.
const log = new Array(); // 착수 로그를 기록합니다.
var curSelect = 32;
var kbCursorX = 5;
var kbCursorY = 4;
var kbCursorActive = false;
var shortcutKeys = {
  newGame: {
    primary: { key: "n", ctrl: false, alt: false, shift: false },
    secondary: { key: "F2", ctrl: false, alt: false, shift: false }
  },
  autoplayToggle: {
    primary: { key: "p", ctrl: false, alt: false, shift: false },
    secondary: { key: "p", ctrl: false, alt: true, shift: false }
  },
  openShortcutSettings: {
    primary: { key: "?", ctrl: false, alt: false, shift: false },
    secondary: null
  },
  openCommentEdit: {
    primary: { key: "`", ctrl: false, alt: false, shift: false },
    secondary: null
  },
  up: {
    primary: { key: "ArrowUp", ctrl: false, alt: false, shift: false },
    secondary: { key: "w", ctrl: false, alt: false, shift: false }
  },
  down: {
    primary: { key: "ArrowDown", ctrl: false, alt: false, shift: false },
    secondary: { key: "s", ctrl: false, alt: false, shift: false }
  },
  left: {
    primary: { key: "ArrowLeft", ctrl: false, alt: false, shift: false },
    secondary: { key: "a", ctrl: false, alt: false, shift: false }
  },
  right: {
    primary: { key: "ArrowRight", ctrl: false, alt: false, shift: false },
    secondary: { key: "d", ctrl: false, alt: false, shift: false }
  },
  select: {
    primary: { key: "Enter", ctrl: false, alt: false, shift: false },
    secondary: { key: " ", ctrl: false, alt: false, shift: false }
  },
  cursorLockToggle: {
    primary: { key: "CapsLock", ctrl: false, alt: false, shift: false },
    secondary: null
  },
  cancel: {
    primary: { key: "Escape", ctrl: false, alt: false, shift: false },
    secondary: null
  },
  copyNotation: {
    primary: { key: "s", ctrl: false, alt: true, shift: false },
    secondary: { key: "s", ctrl: true, alt: false, shift: false }
  },
  loadNotation: {
    primary: { key: "v", ctrl: false, alt: true, shift: false },
    secondary: { key: "v", ctrl: true, alt: false, shift: false }
  },
  forwardStep: {
    primary: { key: "ArrowRight", ctrl: false, alt: true, shift: false },
    secondary: null
  },
  backwardStep: {
    primary: { key: "ArrowLeft", ctrl: false, alt: true, shift: false },
    secondary: null
  },
  goToStart: {
    primary: { key: "ArrowLeft", ctrl: true, alt: false, shift: false },
    secondary: { key: "Home", ctrl: false, alt: false, shift: false }
  },
  goToEnd: {
    primary: { key: "ArrowRight", ctrl: true, alt: false, shift: false },
    secondary: { key: "End", ctrl: false, alt: false, shift: false }
  }
};
var currentLoadedRecordId = null; // 현재 불러와서 보여주고 있는 기보의 로컬스토리지 ID
var scoreAutoRotate = true; // 점수판 자동 순환 여부
var scoreRotateInterval = 5; // 점수판 순환 주기 (초)
var scoreShowSlide1 = true; // 점수판 슬라이드 1 (점수차) 표출 여부
var scoreShowSlide2 = true; // 점수판 슬라이드 2 (타이머) 표출 여부
var scoreShowSlide3 = true; // 점수판 슬라이드 3 (대회정보) 표출 여부
var autoplaySpeed = 2; // 자동재생 속도 (초)
var autoplayUseAnim = true; // 자동재생 시 애니메이션 사용 여부
var shortcutModalBgColor = "#5f80ce"; // 단축키 모달 배경색
var shortcutModalOpacity = 0.4; // 단축키 모달 투명도
var commentBoxBgColor = "#5f80ce"; // 코멘트 상자 배경색
var commentBoxOpacity = 0.4; // 코멘트 상자 투명도

/**
 * @typedef {Object} GameMetadata - 대국 상세 메타데이터 스키마
 * @property {string} choPlayer - 초나라 대국자명
 * @property {string} hanPlayer - 한나라 대국자명
 * @property {string} tournament - 대회명
 * @property {string} round - 대국 정보 (예: 몇국, 일시)
 * @property {string} nickname - 기보 별명
 * @property {string} summary - 총평
 */
var gameMetadata = {
  choPlayer: "",
  hanPlayer: "",
  tournament: "",
  round: "",
  nickname: "",
  summary: ""
};
const knownStart = [
  [
    "59109028882070308040601737577797",
    "59109028882080307040601737577797",
    "59109028883070208040601737577797",
    "59109028883080207040601737577797"
  ],
  [
    "52119123832171318141611434547494",
    "52119123832181317141611434547494",
    "52119123833171218141611434547494",
    "52119123833181217141611434547494"
  ]
];

// 각 기물의 역할을 분석해 크기 배율을 반환합니다. (왕: 대형, 차포마상: 중형, 사졸병: 소형)
function getPieceSizeRatio(i) {
  if (i === 0 || i === 16) {
    return sizeKing;
  }
  if ((i >= 1 && i <= 8) || (i >= 17 && i <= 24)) {
    return sizeMiddle;
  }
  return sizeSmall;
}
