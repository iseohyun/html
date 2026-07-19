// config.js - Global variables and game state configurations
const svg = document.getElementById("janggi-svg");
const board = document.getElementById("board");
const selectBox = document.getElementById("select-box");
const boardMargin = 0;  // 장기판의 외부 하얀색 여백(margin)
var showCoordinates = true; // 좌표선 표시 여부
var animDuration = 0.5; // 애니메이션 이동 시간 (초 단위)
var animHeight = 0.2;   // 애니메이션 기물 들기 높이 배율 (기본 0.2, 범위 0~2.0)
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
const knownStart = [
  [
    "52119123832171318141611434547494",
    "52119123832181317141611434547494",
    "52119123833171218141611434547494",
    "52119123833181217141611434547494"
  ],
  [
    "59109028882070308040601737577797",
    "59109028882080307040601737577797",
    "59109028883070208040601737577797",
    "59109028883080207040601737577797"
  ]
];

// 각 기물의 역할을 분석해 크기 배율을 반환합니다. (왕: 대형, 차포마상: 중형, 사졸병: 소형)
function getPieceSizeRatio(i) {
  // 0, 16 : 궁(왕) -> 큰 기물 (110%)
  if (i === 0 || i === 16) {
    return 1.10;
  }
  // 1~8, 17~24 : 차, 포, 마, 상 -> 중간 기물 (95%)
  if ((i >= 1 && i <= 8) || (i >= 17 && i <= 24)) {
    return 0.95;
  }
  // 9~15, 25~31 : 사, 졸, 병 -> 작은 기물 (75%)
  return 0.75;
}
