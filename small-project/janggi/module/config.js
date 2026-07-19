// config.js - Global variables and game state configurations
const svg = document.getElementById("janggi-svg");
const board = document.getElementById("board");
const selectBox = document.getElementById("select-box");
const boardMargin = 0;  // 장기판의 외부 하얀색 여백(margin)
const boardPadding = 20;  // 장기판 내부의 나무색 여백(padding)
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
