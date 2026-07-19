// logic.js - Game rules and coordinate translation logic

function Az2n(c) {
  return c.charCodeAt(0) - 65;
}

function n2Az(n) {
  const str = "ABCDEFGHIJK";
  return str[n];
}

// 좌표의 실제 도화지 위치를 반환합니다.
function getAxis(x, y) {
  const axis = { 
    x: Math.floor((x - 1) * unitSize + boardPaddingLeft + unitSize / 2), 
    y: Math.floor(boardHeight - ((y - 1) * unitSize + boardPaddingBottom + unitSize / 2)) 
  };
  return axis;
}

// 해당 좌표에 누가 있는지 확인합니다.
// 0 : 비었음, 1 : 우리편, 2 : 상대편
function checkTeam(i, x, y) {
  const j = whoIsit(x, y);
  if (j >= 32) return 0;
  if ((i <= 15 && j <= 15) || (i > 15 && j > 15)) return 1;
  else return 2;
}

// 해당 좌표에 있는 장기말의 ID를 가져옵니다. (0 ~ 31)
// 없다면 32를 반환합니다.
function whoIsit(x, y) {
  for (let i = 0; i < pieces.length; i++) {
    if (pieces[i].x == x && pieces[i].y == y) {
      return i;
    }
  }
  return 32;
}

// 해당 아이디가 적군인지 판별합니다.
// 아군 1, 적군 2, 공백 0
function isEnemy(i, t) {
  if (t >= 32) return 0;
  if ((i <= 15 && t <= 15) || (i > 15 && t > 15)) return 1;
  else return 2;
}

// 해당 아이디가 포인지 판별합니다.
function isPo(i) {
  return (i == 3 || i == 4 || i == 19 || i == 20);
}

// 어떤 말이 이전에 움직인 기록이 있는지 가장 최근의 자료를 조회합니다.
function whereWasIt(i, turn) {
  while (turn >= 0) {
    if (log[turn].i == i)
      return { x: log[turn].x, y: log[turn].y };
    turn--;
  }
  return initPieces[i];
}

// 선택된 말의 이동가능 경로를 그립니다.
function drawCandidates(i) {
  switch (i) {
    // 나의 장, 사 이동경로
    case 0: case 9: case 10:
      if (pieces[i].x == 4 && pieces[i].y == 1) {
        if (checkTeam(i, 4, 2) != 1) createCandiBox(i, 4, 2);
        if (checkTeam(i, 5, 2) != 1) createCandiBox(i, 5, 2);
        if (checkTeam(i, 5, 1) != 1) createCandiBox(i, 5, 1);
      } else if (pieces[i].x == 5 && pieces[i].y == 1) {
        if (checkTeam(i, 5, 2) != 1) createCandiBox(i, 5, 2);
        if (checkTeam(i, 6, 1) != 1) createCandiBox(i, 6, 1);
        if (checkTeam(i, 4, 1) != 1) createCandiBox(i, 4, 1);
      } else if (pieces[i].x == 6 && pieces[i].y == 1) {
        if (checkTeam(i, 6, 2) != 1) createCandiBox(i, 6, 2);
        if (checkTeam(i, 5, 1) != 1) createCandiBox(i, 5, 1);
        if (checkTeam(i, 5, 2) != 1) createCandiBox(i, 5, 2);
      } else if (pieces[i].x == 4 && pieces[i].y == 2) {
        if (checkTeam(i, 4, 3) != 1) createCandiBox(i, 4, 3);
        if (checkTeam(i, 5, 2) != 1) createCandiBox(i, 5, 2);
        if (checkTeam(i, 4, 1) != 1) createCandiBox(i, 4, 1);
      } else if (pieces[i].x == 5 && pieces[i].y == 2) {
        if (checkTeam(i, 5, 3) != 1) createCandiBox(i, 5, 3);
        if (checkTeam(i, 6, 3) != 1) createCandiBox(i, 6, 3);
        if (checkTeam(i, 6, 2) != 1) createCandiBox(i, 6, 2);
        if (checkTeam(i, 6, 1) != 1) createCandiBox(i, 6, 1);
        if (checkTeam(i, 5, 1) != 1) createCandiBox(i, 5, 1);
        if (checkTeam(i, 4, 1) != 1) createCandiBox(i, 4, 1);
        if (checkTeam(i, 4, 2) != 1) createCandiBox(i, 4, 2);
        if (checkTeam(i, 4, 3) != 1) createCandiBox(i, 4, 3);
      } else if (pieces[i].x == 6 && pieces[i].y == 2) {
        if (checkTeam(i, 6, 3) != 1) createCandiBox(i, 6, 3);
        if (checkTeam(i, 6, 1) != 1) createCandiBox(i, 6, 1);
        if (checkTeam(i, 5, 2) != 1) createCandiBox(i, 5, 2);
      } else if (pieces[i].x == 4 && pieces[i].y == 3) {
        if (checkTeam(i, 5, 3) != 1) createCandiBox(i, 5, 3);
        if (checkTeam(i, 5, 2) != 1) createCandiBox(i, 5, 2);
        if (checkTeam(i, 4, 2) != 1) createCandiBox(i, 4, 2);
      } else if (pieces[i].x == 5 && pieces[i].y == 3) {
        if (checkTeam(i, 6, 3) != 1) createCandiBox(i, 6, 3);
        if (checkTeam(i, 5, 2) != 1) createCandiBox(i, 5, 2);
        if (checkTeam(i, 4, 3) != 1) createCandiBox(i, 4, 3);
      } else if (pieces[i].x == 6 && pieces[i].y == 3) {
        if (checkTeam(i, 6, 2) != 1) createCandiBox(i, 6, 2);
        if (checkTeam(i, 5, 2) != 1) createCandiBox(i, 5, 2);
        if (checkTeam(i, 5, 3) != 1) createCandiBox(i, 5, 3);
      }
      break;
    // 상대의 장, 사 이동경로
    case 16: case 25: case 26:
      if (pieces[i].x == 4 && pieces[i].y == 8) {
        if (checkTeam(i, 4, 9) != 1) createCandiBox(i, 4, 9);
        if (checkTeam(i, 5, 9) != 1) createCandiBox(i, 5, 9);
        if (checkTeam(i, 5, 8) != 1) createCandiBox(i, 5, 8);
      } else if (pieces[i].x == 5 && pieces[i].y == 8) {
        if (checkTeam(i, 5, 9) != 1) createCandiBox(i, 5, 9);
        if (checkTeam(i, 6, 8) != 1) createCandiBox(i, 6, 8);
        if (checkTeam(i, 4, 8) != 1) createCandiBox(i, 4, 8);
      } else if (pieces[i].x == 6 && pieces[i].y == 8) {
        if (checkTeam(i, 6, 9) != 1) createCandiBox(i, 6, 9);
        if (checkTeam(i, 5, 8) != 1) createCandiBox(i, 5, 8);
        if (checkTeam(i, 5, 9) != 1) createCandiBox(i, 5, 9);
      } else if (pieces[i].x == 4 && pieces[i].y == 9) {
        if (checkTeam(i, 4, 10) != 1) createCandiBox(i, 4, 10);
        if (checkTeam(i, 5, 9) != 1) createCandiBox(i, 5, 9);
        if (checkTeam(i, 4, 8) != 1) createCandiBox(i, 4, 8);
      } else if (pieces[i].x == 5 && pieces[i].y == 9) {
        if (checkTeam(i, 5, 10) != 1) createCandiBox(i, 5, 10);
        if (checkTeam(i, 6, 10) != 1) createCandiBox(i, 6, 10);
        if (checkTeam(i, 6, 9) != 1) createCandiBox(i, 6, 9);
        if (checkTeam(i, 6, 8) != 1) createCandiBox(i, 6, 8);
        if (checkTeam(i, 5, 8) != 1) createCandiBox(i, 5, 8);
        if (checkTeam(i, 4, 8) != 1) createCandiBox(i, 4, 8);
        if (checkTeam(i, 4, 9) != 1) createCandiBox(i, 4, 9);
        if (checkTeam(i, 4, 10) != 1) createCandiBox(i, 4, 10);
      } else if (pieces[i].x == 6 && pieces[i].y == 9) {
        if (checkTeam(i, 6, 10) != 1) createCandiBox(i, 6, 10);
        if (checkTeam(i, 6, 8) != 1) createCandiBox(i, 6, 8);
        if (checkTeam(i, 5, 9) != 1) createCandiBox(i, 5, 9);
      } else if (pieces[i].x == 4 && pieces[i].y == 10) {
        if (checkTeam(i, 5, 10) != 1) createCandiBox(i, 5, 10);
        if (checkTeam(i, 5, 9) != 1) createCandiBox(i, 5, 9);
        if (checkTeam(i, 4, 9) != 1) createCandiBox(i, 4, 9);
      } else if (pieces[i].x == 5 && pieces[i].y == 10) {
        if (checkTeam(i, 6, 10) != 1) createCandiBox(i, 6, 10);
        if (checkTeam(i, 5, 9) != 1) createCandiBox(i, 5, 9);
        if (checkTeam(i, 4, 10) != 1) createCandiBox(i, 4, 10);
      } else if (pieces[i].x == 6 && pieces[i].y == 10) {
        if (checkTeam(i, 6, 9) != 1) createCandiBox(i, 6, 9);
        if (checkTeam(i, 5, 9) != 1) createCandiBox(i, 5, 9);
        if (checkTeam(i, 5, 10) != 1) createCandiBox(i, 5, 10);
      }
      break;

    // 차 이동경로
    case 1: case 2: case 17: case 18:
      for (let x = pieces[i].x - 1; x >= 1; x--) {
        if (checkTeam(i, x, pieces[i].y) != 1) createCandiBox(i, x, pieces[i].y);
        if (checkTeam(i, x, pieces[i].y) != 0) break;
      }
      for (let x = pieces[i].x + 1; x <= 9; x++) {
        if (checkTeam(i, x, pieces[i].y) != 1) createCandiBox(i, x, pieces[i].y);
        if (checkTeam(i, x, pieces[i].y) != 0) break;
      }
      for (let y = pieces[i].y - 1; y >= 1; y--) {
        if (checkTeam(i, pieces[i].x, y) != 1) createCandiBox(i, pieces[i].x, y);
        if (checkTeam(i, pieces[i].x, y) != 0) break;
      }
      for (let y = pieces[i].y + 1; y <= 10; y++) {
        if (checkTeam(i, pieces[i].x, y) != 1) createCandiBox(i, pieces[i].x, y);
        if (checkTeam(i, pieces[i].x, y) != 0) break;
      }
      if (pieces[i].x == 4 && pieces[i].y == 8) {
        if (checkTeam(i, 5, 9) != 1) createCandiBox(i, 5, 9);
        if (checkTeam(i, 5, 9) == 0)
          if (checkTeam(i, 6, 10) != 1) createCandiBox(i, 6, 10);
      } else if (pieces[i].x == 6 && pieces[i].y == 8) {
        if (checkTeam(i, 5, 9) != 1) createCandiBox(i, 5, 9);
        if (checkTeam(i, 5, 9) == 0)
          if (checkTeam(i, 4, 10) != 1) createCandiBox(i, 4, 10);
      } else if (pieces[i].x == 4 && pieces[i].y == 10) {
        if (checkTeam(i, 5, 9) != 1) createCandiBox(i, 5, 9);
        if (checkTeam(i, 5, 9) == 0)
          if (checkTeam(i, 6, 8) != 1) createCandiBox(i, 6, 8);
      } else if (pieces[i].x == 6 && pieces[i].y == 10) {
        if (checkTeam(i, 5, 9) != 1) createCandiBox(i, 5, 9);
        if (checkTeam(i, 5, 9) == 0)
          if (checkTeam(i, 4, 8) != 1) createCandiBox(i, 4, 8);
      } else if (pieces[i].x == 5 && pieces[i].y == 9) {
        if (checkTeam(i, 4, 8) != 1) createCandiBox(i, 4, 8);
        if (checkTeam(i, 4, 10) != 1) createCandiBox(i, 4, 10);
        if (checkTeam(i, 6, 8) != 1) createCandiBox(i, 6, 8);
        if (checkTeam(i, 6, 10) != 1) createCandiBox(i, 6, 10);
      } else if (pieces[i].x == 4 && pieces[i].y == 1) {
        if (checkTeam(i, 5, 2) != 1) createCandiBox(i, 5, 2);
        if (checkTeam(i, 5, 2) == 0)
          if (checkTeam(i, 6, 3) != 1) createCandiBox(i, 6, 3);
      } else if (pieces[i].x == 6 && pieces[i].y == 1) {
        if (checkTeam(i, 5, 2) != 1) createCandiBox(i, 5, 2);
        if (checkTeam(i, 5, 2) == 0)
          if (checkTeam(i, 4, 3) != 1) createCandiBox(i, 4, 3);
      } else if (pieces[i].x == 4 && pieces[i].y == 3) {
        if (checkTeam(i, 5, 2) != 1) createCandiBox(i, 5, 2);
        if (checkTeam(i, 5, 2) == 0)
          if (checkTeam(i, 6, 1) != 1) createCandiBox(i, 6, 1);
      } else if (pieces[i].x == 6 && pieces[i].y == 3) {
        if (checkTeam(i, 5, 2) != 1) createCandiBox(i, 5, 2);
        if (checkTeam(i, 5, 2) == 0)
          if (checkTeam(i, 4, 1) != 1) createCandiBox(i, 4, 1);
      } else if (pieces[i].x == 5 && pieces[i].y == 2) {
        if (checkTeam(i, 4, 1) != 1) createCandiBox(i, 4, 1);
        if (checkTeam(i, 4, 3) != 1) createCandiBox(i, 4, 3);
        if (checkTeam(i, 6, 1) != 1) createCandiBox(i, 6, 1);
        if (checkTeam(i, 6, 3) != 1) createCandiBox(i, 6, 3);
      }
      break;

    // 포 이동경로
    case 3: case 4: case 19: case 20:
      var bridge = false;
      for (let x = pieces[i].x - 1; x >= 1; x--) {
        let t = whoIsit(x, pieces[i].y);
        if (isPo(t)) break;
        if (bridge == false) {
          if (t < 32) bridge = true;
        } else {
          if (isEnemy(i, t) != 1) {
            createCandiBox(i, x, pieces[i].y);
            if (isEnemy(i, t) == 2) break;
          } else
            break;
        }
      }
      bridge = false;
      for (let x = pieces[i].x + 1; x <= 9; x++) {
        let t = whoIsit(x, pieces[i].y);
        if (isPo(t)) break;
        if (bridge == false) {
          if (t < 32) bridge = true;
        } else {
          if (isEnemy(i, t) != 1) {
            createCandiBox(i, x, pieces[i].y);
            if (isEnemy(i, t) == 2) break;
          } else
            break;
        }
      }
      bridge = false;
      for (let y = pieces[i].y - 1; y >= 1; y--) {
        let t = whoIsit(pieces[i].x, y);
        if (isPo(t)) break;
        if (bridge == false) {
          if (t < 32) bridge = true;
        } else {
          if (isEnemy(i, t) != 1) {
            createCandiBox(i, pieces[i].x, y);
            if (isEnemy(i, t) == 2) break;
          } else
            break;
        }
      }
      bridge = false;
      for (let y = pieces[i].y + 1; y <= 10; y++) {
        let t = whoIsit(pieces[i].x, y);
        if (isPo(t)) break;
        if (bridge == false) {
          if (t < 32) bridge = true;
        } else {
          if (isEnemy(i, t) != 1) {
            createCandiBox(i, pieces[i].x, y);
            if (isEnemy(i, t) == 2) break;
          } else
            break;
        }
      }
      if (pieces[i].x == 4 && pieces[i].y == 1) {
        let t = whoIsit(5, 2);
        if (!isPo(t) && t < 32 && (checkTeam(i, 6, 3) != 1) && !isPo(whoIsit(6, 3))) createCandiBox(i, 6, 3);
      } else if (pieces[i].x == 6 && pieces[i].y == 1) {
        let t = whoIsit(5, 2);
        if (!isPo(t) && t < 32 && (checkTeam(i, 4, 3) != 1) && !isPo(whoIsit(4, 3))) createCandiBox(i, 4, 3);
      } else if (pieces[i].x == 4 && pieces[i].y == 3) {
        let t = whoIsit(5, 2);
        if (!isPo(t) && t < 32 && (checkTeam(i, 6, 1) != 1) && !isPo(whoIsit(6, 1))) createCandiBox(i, 6, 1);
      } else if (pieces[i].x == 6 && pieces[i].y == 3) {
        let t = whoIsit(5, 2);
        if (!isPo(t) && t < 32 && (checkTeam(i, 4, 1) != 1) && !isPo(whoIsit(4, 1))) createCandiBox(i, 4, 1);
      } else if (pieces[i].x == 4 && pieces[i].y == 8) {
        let t = whoIsit(5, 9);
        if (!isPo(t) && t < 32 && (checkTeam(i, 6, 10) != 1) && !isPo(whoIsit(6, 10))) createCandiBox(i, 6, 10);
      } else if (pieces[i].x == 6 && pieces[i].y == 8) {
        let t = whoIsit(5, 9);
        if (!isPo(t) && t < 32 && (checkTeam(i, 4, 10) != 1) && !isPo(whoIsit(4, 10))) createCandiBox(i, 4, 10);
      } else if (pieces[i].x == 4 && pieces[i].y == 10) {
        let t = whoIsit(5, 9);
        if (!isPo(t) && t < 32 && (checkTeam(i, 6, 8) != 1) && !isPo(whoIsit(6, 8))) createCandiBox(i, 6, 8);
      } else if (pieces[i].x == 6 && pieces[i].y == 10) {
        let t = whoIsit(5, 9);
        if (!isPo(t) && t < 32 && (checkTeam(i, 4, 8) != 1) && !isPo(whoIsit(4, 8))) createCandiBox(i, 4, 8);
      }
      break;

    // 마 이동경로
    case 5: case 6: case 21: case 22:
      if (whoIsit(pieces[i].x - 1, pieces[i].y) >= 32) {
        if (isEnemy(i, whoIsit(pieces[i].x - 2, pieces[i].y - 1)) != 1) createCandiBox(i, pieces[i].x - 2, pieces[i].y - 1);
        if (isEnemy(i, whoIsit(pieces[i].x - 2, pieces[i].y + 1)) != 1) createCandiBox(i, pieces[i].x - 2, pieces[i].y + 1);
      }
      if (whoIsit(pieces[i].x + 1, pieces[i].y) >= 32) {
        if (isEnemy(i, whoIsit(pieces[i].x + 2, pieces[i].y - 1)) != 1) createCandiBox(i, pieces[i].x + 2, pieces[i].y - 1);
        if (isEnemy(i, whoIsit(pieces[i].x + 2, pieces[i].y + 1)) != 1) createCandiBox(i, pieces[i].x + 2, pieces[i].y + 1);
      }
      if (whoIsit(pieces[i].x, pieces[i].y - 1) >= 32) {
        if (isEnemy(i, whoIsit(pieces[i].x - 1, pieces[i].y - 2)) != 1) createCandiBox(i, pieces[i].x - 1, pieces[i].y - 2);
        if (isEnemy(i, whoIsit(pieces[i].x + 1, pieces[i].y - 2)) != 1) createCandiBox(i, pieces[i].x + 1, pieces[i].y - 2);
      }
      if (whoIsit(pieces[i].x, pieces[i].y + 1) >= 32) {
        if (isEnemy(i, whoIsit(pieces[i].x - 1, pieces[i].y + 2)) != 1) createCandiBox(i, pieces[i].x - 1, pieces[i].y + 2);
        if (isEnemy(i, whoIsit(pieces[i].x + 1, pieces[i].y + 2)) != 1) createCandiBox(i, pieces[i].x + 1, pieces[i].y + 2);
      }
      break;

    // 상 이동경로
    case 7: case 8: case 23: case 24:
      if (whoIsit(pieces[i].x - 1, pieces[i].y) >= 32) {
        if ((whoIsit(pieces[i].x - 2, pieces[i].y - 1) >= 32) && (isEnemy(i, whoIsit(pieces[i].x - 3, pieces[i].y - 2)) != 1)) createCandiBox(i, pieces[i].x - 3, pieces[i].y - 2);
        if ((whoIsit(pieces[i].x - 2, pieces[i].y + 1) >= 32) && (isEnemy(i, whoIsit(pieces[i].x - 3, pieces[i].y + 2)) != 1)) createCandiBox(i, pieces[i].x - 3, pieces[i].y + 2);
      }
      if (whoIsit(pieces[i].x + 1, pieces[i].y) >= 32) {
        if ((whoIsit(pieces[i].x + 2, pieces[i].y - 1) >= 32) && (isEnemy(i, whoIsit(pieces[i].x + 3, pieces[i].y - 2)) != 1)) createCandiBox(i, pieces[i].x + 3, pieces[i].y - 2);
        if ((whoIsit(pieces[i].x + 2, pieces[i].y + 1) >= 32) && (isEnemy(i, whoIsit(pieces[i].x + 3, pieces[i].y + 2)) != 1)) createCandiBox(i, pieces[i].x + 3, pieces[i].y + 2);
      }
      if (whoIsit(pieces[i].x, pieces[i].y - 1) >= 32) {
        if ((whoIsit(pieces[i].x - 1, pieces[i].y - 2) >= 32) && (isEnemy(i, whoIsit(pieces[i].x - 2, pieces[i].y - 3)) != 1)) createCandiBox(i, pieces[i].x - 2, pieces[i].y - 3);
        if ((whoIsit(pieces[i].x + 1, pieces[i].y - 2) >= 32) && (isEnemy(i, whoIsit(pieces[i].x + 2, pieces[i].y - 3)) != 1)) createCandiBox(i, pieces[i].x + 2, pieces[i].y - 3);
      }
      if (whoIsit(pieces[i].x, pieces[i].y + 1) >= 32) {
        if ((whoIsit(pieces[i].x - 1, pieces[i].y + 2) >= 32) && (isEnemy(i, whoIsit(pieces[i].x - 2, pieces[i].y + 3)) != 1)) createCandiBox(i, pieces[i].x - 2, pieces[i].y + 3);
        if ((whoIsit(pieces[i].x + 1, pieces[i].y + 2) >= 32) && (isEnemy(i, whoIsit(pieces[i].x + 2, pieces[i].y + 3)) != 1)) createCandiBox(i, pieces[i].x + 2, pieces[i].y + 3);
      }
      break;

    case 11: case 12: case 13: case 14: case 15:
    case 27: case 28: case 29: case 30: case 31:
      if (isEnemy(i, whoIsit(pieces[i].x - 1, pieces[i].y)) != 1) createCandiBox(i, pieces[i].x - 1, pieces[i].y);
      if (isEnemy(i, whoIsit(pieces[i].x + 1, pieces[i].y)) != 1) createCandiBox(i, pieces[i].x + 1, pieces[i].y);
      if (i > 16) {
        if (isEnemy(i, whoIsit(pieces[i].x, pieces[i].y - 1)) != 1) createCandiBox(i, pieces[i].x, pieces[i].y - 1);
        if (pieces[i].x == 4 && pieces[i].y == 3) {
          if (isEnemy(i, whoIsit(5, 2)) != 1) createCandiBox(i, 5, 2);
        } else if (pieces[i].x == 6 && pieces[i].y == 3) {
          if (isEnemy(i, whoIsit(5, 2)) != 1) createCandiBox(i, 5, 2);
        } else if (pieces[i].x == 5 && pieces[i].y == 2) {
          if (isEnemy(i, whoIsit(4, 1)) != 1) createCandiBox(i, 4, 1);
          if (isEnemy(i, whoIsit(6, 1)) != 1) createCandiBox(i, 6, 1);
        }
      }
      if (i < 16) {
        if (isEnemy(i, whoIsit(pieces[i].x, pieces[i].y + 1)) != 1) createCandiBox(i, pieces[i].x, pieces[i].y + 1);
        if (pieces[i].x == 4 && pieces[i].y == 8) {
          if (isEnemy(i, whoIsit(5, 9)) != 1) createCandiBox(i, 5, 9);
        } else if (pieces[i].x == 6 && pieces[i].y == 8) {
          if (isEnemy(i, whoIsit(5, 9)) != 1) createCandiBox(i, 5, 9);
        } else if (pieces[i].x == 5 && pieces[i].y == 9) {
          if (isEnemy(i, whoIsit(4, 10)) != 1) createCandiBox(i, 4, 10);
          if (isEnemy(i, whoIsit(6, 10)) != 1) createCandiBox(i, 6, 10);
        }
      }
      break;
    default:
  }
}
