// logic.js - Game rules and coordinate translation logic

function Az2n(c) {
  return c.charCodeAt(0) - 65;
}

function n2Az(n) {
  const str = "ABCDEFGHIJK";
  return str[n];
}

// 좌표의 실제 도화지 위치를 반환합니다.
// 새 좌표계: x=1~9 (왼쪽→오른쪽), y: 1(상단)~9, 0(하단)
function getAxis(x, y) {
  const rowIndex = (y + 9) % 10; // y=1→0(상단), y=2→1, ..., y=9→8, y=0→9(하단)
  const axis = { 
    x: Math.floor((x - 1) * unitSize + boardPaddingLeft + unitSize / 2), 
    y: Math.floor(rowIndex * unitSize + boardPaddingTop + unitSize / 2) 
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

// y좌표의 다음 줄 (화면 아래 방향, 숫자 증가 방향)
// 1→2→3→...→9→0 순서. 0 다음은 범위 밖(-1 반환)
function yNext(y) {
  if (y == 0) return -1; // 하단 끝, 더 내려갈 수 없음
  if (y == 9) return 0;
  return y + 1;
}

// y좌표의 이전 줄 (화면 위 방향, 숫자 감소 방향)
// 0→9→8→...→2→1 순서. 1 다음은 범위 밖(-1 반환)
function yPrev(y) {
  if (y == 1) return -1; // 상단 끝, 더 올라갈 수 없음
  if (y == 0) return 9;
  return y - 1;
}

// y좌표가 유효한 범위인지 확인 (0~9, 단 1~9와 0)
function isValidY(y) {
  return y >= 0 && y <= 9;
}

// 선택된 말의 이동가능 경로를 그립니다.
// 새 좌표계: 나의 궁성 = y: 9,0,8 (x: 4,5,6), 상대 궁성 = y: 2,1,3 (x: 4,5,6)
// 기존→새 변환: 1→0, 2→9, 3→8, 4→7, 5→6, 6→5, 7→4, 8→3, 9→2, 10→1
function drawCandidates(i) {
  switch (i) {
    // 나의 장, 사 이동경로 (내 궁성: x=4~6, y=0,9,8)
    case 0: case 9: case 10:
      if (pieces[i].x == 4 && pieces[i].y == 0) {
        if (checkTeam(i, 4, 9) != 1) createCandiBox(i, 4, 9);
        if (checkTeam(i, 5, 9) != 1) createCandiBox(i, 5, 9);
        if (checkTeam(i, 5, 0) != 1) createCandiBox(i, 5, 0);
      } else if (pieces[i].x == 5 && pieces[i].y == 0) {
        if (checkTeam(i, 5, 9) != 1) createCandiBox(i, 5, 9);
        if (checkTeam(i, 6, 0) != 1) createCandiBox(i, 6, 0);
        if (checkTeam(i, 4, 0) != 1) createCandiBox(i, 4, 0);
      } else if (pieces[i].x == 6 && pieces[i].y == 0) {
        if (checkTeam(i, 6, 9) != 1) createCandiBox(i, 6, 9);
        if (checkTeam(i, 5, 0) != 1) createCandiBox(i, 5, 0);
        if (checkTeam(i, 5, 9) != 1) createCandiBox(i, 5, 9);
      } else if (pieces[i].x == 4 && pieces[i].y == 9) {
        if (checkTeam(i, 4, 8) != 1) createCandiBox(i, 4, 8);
        if (checkTeam(i, 5, 9) != 1) createCandiBox(i, 5, 9);
        if (checkTeam(i, 4, 0) != 1) createCandiBox(i, 4, 0);
      } else if (pieces[i].x == 5 && pieces[i].y == 9) {
        if (checkTeam(i, 5, 8) != 1) createCandiBox(i, 5, 8);
        if (checkTeam(i, 6, 8) != 1) createCandiBox(i, 6, 8);
        if (checkTeam(i, 6, 9) != 1) createCandiBox(i, 6, 9);
        if (checkTeam(i, 6, 0) != 1) createCandiBox(i, 6, 0);
        if (checkTeam(i, 5, 0) != 1) createCandiBox(i, 5, 0);
        if (checkTeam(i, 4, 0) != 1) createCandiBox(i, 4, 0);
        if (checkTeam(i, 4, 9) != 1) createCandiBox(i, 4, 9);
        if (checkTeam(i, 4, 8) != 1) createCandiBox(i, 4, 8);
      } else if (pieces[i].x == 6 && pieces[i].y == 9) {
        if (checkTeam(i, 6, 8) != 1) createCandiBox(i, 6, 8);
        if (checkTeam(i, 6, 0) != 1) createCandiBox(i, 6, 0);
        if (checkTeam(i, 5, 9) != 1) createCandiBox(i, 5, 9);
      } else if (pieces[i].x == 4 && pieces[i].y == 8) {
        if (checkTeam(i, 5, 8) != 1) createCandiBox(i, 5, 8);
        if (checkTeam(i, 5, 9) != 1) createCandiBox(i, 5, 9);
        if (checkTeam(i, 4, 9) != 1) createCandiBox(i, 4, 9);
      } else if (pieces[i].x == 5 && pieces[i].y == 8) {
        if (checkTeam(i, 6, 8) != 1) createCandiBox(i, 6, 8);
        if (checkTeam(i, 5, 9) != 1) createCandiBox(i, 5, 9);
        if (checkTeam(i, 4, 8) != 1) createCandiBox(i, 4, 8);
      } else if (pieces[i].x == 6 && pieces[i].y == 8) {
        if (checkTeam(i, 6, 9) != 1) createCandiBox(i, 6, 9);
        if (checkTeam(i, 5, 9) != 1) createCandiBox(i, 5, 9);
        if (checkTeam(i, 5, 8) != 1) createCandiBox(i, 5, 8);
      }
      break;
    // 상대의 장, 사 이동경로 (상대 궁성: x=4~6, y=1,2,3)
    case 16: case 25: case 26:
      if (pieces[i].x == 4 && pieces[i].y == 3) {
        if (checkTeam(i, 4, 2) != 1) createCandiBox(i, 4, 2);
        if (checkTeam(i, 5, 2) != 1) createCandiBox(i, 5, 2);
        if (checkTeam(i, 5, 3) != 1) createCandiBox(i, 5, 3);
      } else if (pieces[i].x == 5 && pieces[i].y == 3) {
        if (checkTeam(i, 5, 2) != 1) createCandiBox(i, 5, 2);
        if (checkTeam(i, 6, 3) != 1) createCandiBox(i, 6, 3);
        if (checkTeam(i, 4, 3) != 1) createCandiBox(i, 4, 3);
      } else if (pieces[i].x == 6 && pieces[i].y == 3) {
        if (checkTeam(i, 6, 2) != 1) createCandiBox(i, 6, 2);
        if (checkTeam(i, 5, 3) != 1) createCandiBox(i, 5, 3);
        if (checkTeam(i, 5, 2) != 1) createCandiBox(i, 5, 2);
      } else if (pieces[i].x == 4 && pieces[i].y == 2) {
        if (checkTeam(i, 4, 1) != 1) createCandiBox(i, 4, 1);
        if (checkTeam(i, 5, 2) != 1) createCandiBox(i, 5, 2);
        if (checkTeam(i, 4, 3) != 1) createCandiBox(i, 4, 3);
      } else if (pieces[i].x == 5 && pieces[i].y == 2) {
        if (checkTeam(i, 5, 1) != 1) createCandiBox(i, 5, 1);
        if (checkTeam(i, 6, 1) != 1) createCandiBox(i, 6, 1);
        if (checkTeam(i, 6, 2) != 1) createCandiBox(i, 6, 2);
        if (checkTeam(i, 6, 3) != 1) createCandiBox(i, 6, 3);
        if (checkTeam(i, 5, 3) != 1) createCandiBox(i, 5, 3);
        if (checkTeam(i, 4, 3) != 1) createCandiBox(i, 4, 3);
        if (checkTeam(i, 4, 2) != 1) createCandiBox(i, 4, 2);
        if (checkTeam(i, 4, 1) != 1) createCandiBox(i, 4, 1);
      } else if (pieces[i].x == 6 && pieces[i].y == 2) {
        if (checkTeam(i, 6, 1) != 1) createCandiBox(i, 6, 1);
        if (checkTeam(i, 6, 3) != 1) createCandiBox(i, 6, 3);
        if (checkTeam(i, 5, 2) != 1) createCandiBox(i, 5, 2);
      } else if (pieces[i].x == 4 && pieces[i].y == 1) {
        if (checkTeam(i, 5, 1) != 1) createCandiBox(i, 5, 1);
        if (checkTeam(i, 5, 2) != 1) createCandiBox(i, 5, 2);
        if (checkTeam(i, 4, 2) != 1) createCandiBox(i, 4, 2);
      } else if (pieces[i].x == 5 && pieces[i].y == 1) {
        if (checkTeam(i, 6, 1) != 1) createCandiBox(i, 6, 1);
        if (checkTeam(i, 5, 2) != 1) createCandiBox(i, 5, 2);
        if (checkTeam(i, 4, 1) != 1) createCandiBox(i, 4, 1);
      } else if (pieces[i].x == 6 && pieces[i].y == 1) {
        if (checkTeam(i, 6, 2) != 1) createCandiBox(i, 6, 2);
        if (checkTeam(i, 5, 2) != 1) createCandiBox(i, 5, 2);
        if (checkTeam(i, 5, 1) != 1) createCandiBox(i, 5, 1);
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
      // 위 방향 (y 감소: ...3→2→1, 1에서 끝)
      for (let ty = yPrev(pieces[i].y); ty != -1; ty = yPrev(ty)) {
        if (checkTeam(i, pieces[i].x, ty) != 1) createCandiBox(i, pieces[i].x, ty);
        if (checkTeam(i, pieces[i].x, ty) != 0) break;
      }
      // 아래 방향 (y 증가: ...8→9→0, 0에서 끝)
      for (let ty = yNext(pieces[i].y); ty != -1; ty = yNext(ty)) {
        if (checkTeam(i, pieces[i].x, ty) != 1) createCandiBox(i, pieces[i].x, ty);
        if (checkTeam(i, pieces[i].x, ty) != 0) break;
      }
      // 상대 궁성 대각선 (y=1,2,3 x=4,5,6)
      if (pieces[i].x == 4 && pieces[i].y == 3) {
        if (checkTeam(i, 5, 2) != 1) createCandiBox(i, 5, 2);
        if (checkTeam(i, 5, 2) == 0)
          if (checkTeam(i, 6, 1) != 1) createCandiBox(i, 6, 1);
      } else if (pieces[i].x == 6 && pieces[i].y == 3) {
        if (checkTeam(i, 5, 2) != 1) createCandiBox(i, 5, 2);
        if (checkTeam(i, 5, 2) == 0)
          if (checkTeam(i, 4, 1) != 1) createCandiBox(i, 4, 1);
      } else if (pieces[i].x == 4 && pieces[i].y == 1) {
        if (checkTeam(i, 5, 2) != 1) createCandiBox(i, 5, 2);
        if (checkTeam(i, 5, 2) == 0)
          if (checkTeam(i, 6, 3) != 1) createCandiBox(i, 6, 3);
      } else if (pieces[i].x == 6 && pieces[i].y == 1) {
        if (checkTeam(i, 5, 2) != 1) createCandiBox(i, 5, 2);
        if (checkTeam(i, 5, 2) == 0)
          if (checkTeam(i, 4, 3) != 1) createCandiBox(i, 4, 3);
      } else if (pieces[i].x == 5 && pieces[i].y == 2) {
        if (checkTeam(i, 4, 3) != 1) createCandiBox(i, 4, 3);
        if (checkTeam(i, 4, 1) != 1) createCandiBox(i, 4, 1);
        if (checkTeam(i, 6, 3) != 1) createCandiBox(i, 6, 3);
        if (checkTeam(i, 6, 1) != 1) createCandiBox(i, 6, 1);
      // 내 궁성 대각선 (y=0,9,8 x=4,5,6)
      } else if (pieces[i].x == 4 && pieces[i].y == 0) {
        if (checkTeam(i, 5, 9) != 1) createCandiBox(i, 5, 9);
        if (checkTeam(i, 5, 9) == 0)
          if (checkTeam(i, 6, 8) != 1) createCandiBox(i, 6, 8);
      } else if (pieces[i].x == 6 && pieces[i].y == 0) {
        if (checkTeam(i, 5, 9) != 1) createCandiBox(i, 5, 9);
        if (checkTeam(i, 5, 9) == 0)
          if (checkTeam(i, 4, 8) != 1) createCandiBox(i, 4, 8);
      } else if (pieces[i].x == 4 && pieces[i].y == 8) {
        if (checkTeam(i, 5, 9) != 1) createCandiBox(i, 5, 9);
        if (checkTeam(i, 5, 9) == 0)
          if (checkTeam(i, 6, 0) != 1) createCandiBox(i, 6, 0);
      } else if (pieces[i].x == 6 && pieces[i].y == 8) {
        if (checkTeam(i, 5, 9) != 1) createCandiBox(i, 5, 9);
        if (checkTeam(i, 5, 9) == 0)
          if (checkTeam(i, 4, 0) != 1) createCandiBox(i, 4, 0);
      } else if (pieces[i].x == 5 && pieces[i].y == 9) {
        if (checkTeam(i, 4, 0) != 1) createCandiBox(i, 4, 0);
        if (checkTeam(i, 4, 8) != 1) createCandiBox(i, 4, 8);
        if (checkTeam(i, 6, 0) != 1) createCandiBox(i, 6, 0);
        if (checkTeam(i, 6, 8) != 1) createCandiBox(i, 6, 8);
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
      // 위 방향 (y 감소)
      for (let ty = yPrev(pieces[i].y); ty != -1; ty = yPrev(ty)) {
        let t = whoIsit(pieces[i].x, ty);
        if (isPo(t)) break;
        if (bridge == false) {
          if (t < 32) bridge = true;
        } else {
          if (isEnemy(i, t) != 1) {
            createCandiBox(i, pieces[i].x, ty);
            if (isEnemy(i, t) == 2) break;
          } else
            break;
        }
      }
      bridge = false;
      // 아래 방향 (y 증가)
      for (let ty = yNext(pieces[i].y); ty != -1; ty = yNext(ty)) {
        let t = whoIsit(pieces[i].x, ty);
        if (isPo(t)) break;
        if (bridge == false) {
          if (t < 32) bridge = true;
        } else {
          if (isEnemy(i, t) != 1) {
            createCandiBox(i, pieces[i].x, ty);
            if (isEnemy(i, t) == 2) break;
          } else
            break;
        }
      }
      // 내 궁성 포 대각선 (y=0,9,8)
      if (pieces[i].x == 4 && pieces[i].y == 0) {
        let t = whoIsit(5, 9);
        if (!isPo(t) && t < 32 && (checkTeam(i, 6, 8) != 1) && !isPo(whoIsit(6, 8))) createCandiBox(i, 6, 8);
      } else if (pieces[i].x == 6 && pieces[i].y == 0) {
        let t = whoIsit(5, 9);
        if (!isPo(t) && t < 32 && (checkTeam(i, 4, 8) != 1) && !isPo(whoIsit(4, 8))) createCandiBox(i, 4, 8);
      } else if (pieces[i].x == 4 && pieces[i].y == 8) {
        let t = whoIsit(5, 9);
        if (!isPo(t) && t < 32 && (checkTeam(i, 6, 0) != 1) && !isPo(whoIsit(6, 0))) createCandiBox(i, 6, 0);
      } else if (pieces[i].x == 6 && pieces[i].y == 8) {
        let t = whoIsit(5, 9);
        if (!isPo(t) && t < 32 && (checkTeam(i, 4, 0) != 1) && !isPo(whoIsit(4, 0))) createCandiBox(i, 4, 0);
      // 상대 궁성 포 대각선 (y=1,2,3)
      } else if (pieces[i].x == 4 && pieces[i].y == 1) {
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
      }
      break;

    // 마 이동경로
    case 5: case 6: case 21: case 22:
      if (whoIsit(pieces[i].x - 1, pieces[i].y) >= 32) {
        if (isEnemy(i, whoIsit(pieces[i].x - 2, yPrev(pieces[i].y) == -1 ? -1 : yPrev(pieces[i].y))) != 1 && yPrev(pieces[i].y) != -1) createCandiBox(i, pieces[i].x - 2, yPrev(pieces[i].y));
        if (isEnemy(i, whoIsit(pieces[i].x - 2, yNext(pieces[i].y) == -1 ? -1 : yNext(pieces[i].y))) != 1 && yNext(pieces[i].y) != -1) createCandiBox(i, pieces[i].x - 2, yNext(pieces[i].y));
      }
      if (whoIsit(pieces[i].x + 1, pieces[i].y) >= 32) {
        if (isEnemy(i, whoIsit(pieces[i].x + 2, yPrev(pieces[i].y) == -1 ? -1 : yPrev(pieces[i].y))) != 1 && yPrev(pieces[i].y) != -1) createCandiBox(i, pieces[i].x + 2, yPrev(pieces[i].y));
        if (isEnemy(i, whoIsit(pieces[i].x + 2, yNext(pieces[i].y) == -1 ? -1 : yNext(pieces[i].y))) != 1 && yNext(pieces[i].y) != -1) createCandiBox(i, pieces[i].x + 2, yNext(pieces[i].y));
      }
      {
        let py = yPrev(pieces[i].y);
        if (py != -1 && whoIsit(pieces[i].x, py) >= 32) {
          let ppy = yPrev(py);
          if (ppy != -1) {
            if (isEnemy(i, whoIsit(pieces[i].x - 1, ppy)) != 1) createCandiBox(i, pieces[i].x - 1, ppy);
            if (isEnemy(i, whoIsit(pieces[i].x + 1, ppy)) != 1) createCandiBox(i, pieces[i].x + 1, ppy);
          }
        }
      }
      {
        let ny = yNext(pieces[i].y);
        if (ny != -1 && whoIsit(pieces[i].x, ny) >= 32) {
          let nny = yNext(ny);
          if (nny != -1) {
            if (isEnemy(i, whoIsit(pieces[i].x - 1, nny)) != 1) createCandiBox(i, pieces[i].x - 1, nny);
            if (isEnemy(i, whoIsit(pieces[i].x + 1, nny)) != 1) createCandiBox(i, pieces[i].x + 1, nny);
          }
        }
      }
      break;

    // 상 이동경로
    case 7: case 8: case 23: case 24:
      if (whoIsit(pieces[i].x - 1, pieces[i].y) >= 32) {
        let py = yPrev(pieces[i].y);
        if (py != -1 && whoIsit(pieces[i].x - 2, py) >= 32) {
          let ppy = yPrev(py);
          if (ppy != -1 && isEnemy(i, whoIsit(pieces[i].x - 3, ppy)) != 1) createCandiBox(i, pieces[i].x - 3, ppy);
        }
        let ny = yNext(pieces[i].y);
        if (ny != -1 && whoIsit(pieces[i].x - 2, ny) >= 32) {
          let nny = yNext(ny);
          if (nny != -1 && isEnemy(i, whoIsit(pieces[i].x - 3, nny)) != 1) createCandiBox(i, pieces[i].x - 3, nny);
        }
      }
      if (whoIsit(pieces[i].x + 1, pieces[i].y) >= 32) {
        let py = yPrev(pieces[i].y);
        if (py != -1 && whoIsit(pieces[i].x + 2, py) >= 32) {
          let ppy = yPrev(py);
          if (ppy != -1 && isEnemy(i, whoIsit(pieces[i].x + 3, ppy)) != 1) createCandiBox(i, pieces[i].x + 3, ppy);
        }
        let ny = yNext(pieces[i].y);
        if (ny != -1 && whoIsit(pieces[i].x + 2, ny) >= 32) {
          let nny = yNext(ny);
          if (nny != -1 && isEnemy(i, whoIsit(pieces[i].x + 3, nny)) != 1) createCandiBox(i, pieces[i].x + 3, nny);
        }
      }
      {
        let py = yPrev(pieces[i].y);
        if (py != -1 && whoIsit(pieces[i].x, py) >= 32) {
          let ppy = yPrev(py);
          if (ppy != -1) {
            if (whoIsit(pieces[i].x - 1, ppy) >= 32) {
              let pppy = yPrev(ppy);
              if (pppy != -1 && isEnemy(i, whoIsit(pieces[i].x - 2, pppy)) != 1) createCandiBox(i, pieces[i].x - 2, pppy);
            }
            if (whoIsit(pieces[i].x + 1, ppy) >= 32) {
              let pppy = yPrev(ppy);
              if (pppy != -1 && isEnemy(i, whoIsit(pieces[i].x + 2, pppy)) != 1) createCandiBox(i, pieces[i].x + 2, pppy);
            }
          }
        }
      }
      {
        let ny = yNext(pieces[i].y);
        if (ny != -1 && whoIsit(pieces[i].x, ny) >= 32) {
          let nny = yNext(ny);
          if (nny != -1) {
            if (whoIsit(pieces[i].x - 1, nny) >= 32) {
              let nnny = yNext(nny);
              if (nnny != -1 && isEnemy(i, whoIsit(pieces[i].x - 2, nnny)) != 1) createCandiBox(i, pieces[i].x - 2, nnny);
            }
            if (whoIsit(pieces[i].x + 1, nny) >= 32) {
              let nnny = yNext(nny);
              if (nnny != -1 && isEnemy(i, whoIsit(pieces[i].x + 2, nnny)) != 1) createCandiBox(i, pieces[i].x + 2, nnny);
            }
          }
        }
      }
      break;

    // 졸/병 이동경로
    case 11: case 12: case 13: case 14: case 15:
    case 27: case 28: case 29: case 30: case 31:
      if (isEnemy(i, whoIsit(pieces[i].x - 1, pieces[i].y)) != 1) createCandiBox(i, pieces[i].x - 1, pieces[i].y);
      if (isEnemy(i, whoIsit(pieces[i].x + 1, pieces[i].y)) != 1) createCandiBox(i, pieces[i].x + 1, pieces[i].y);
      if (i > 16) {
        // 상대 졸: 아래로 전진 (y 증가)
        let ny = yNext(pieces[i].y);
        if (ny != -1 && isEnemy(i, whoIsit(pieces[i].x, ny)) != 1) createCandiBox(i, pieces[i].x, ny);
        // 내 궁성(y=0,9,8) 대각선
        if (pieces[i].x == 4 && pieces[i].y == 8) {
          if (isEnemy(i, whoIsit(5, 9)) != 1) createCandiBox(i, 5, 9);
        } else if (pieces[i].x == 6 && pieces[i].y == 8) {
          if (isEnemy(i, whoIsit(5, 9)) != 1) createCandiBox(i, 5, 9);
        } else if (pieces[i].x == 5 && pieces[i].y == 9) {
          if (isEnemy(i, whoIsit(4, 0)) != 1) createCandiBox(i, 4, 0);
          if (isEnemy(i, whoIsit(6, 0)) != 1) createCandiBox(i, 6, 0);
        }
      }
      if (i < 16) {
        // 나의 졸: 위로 전진 (y 감소)
        let py = yPrev(pieces[i].y);
        if (py != -1 && isEnemy(i, whoIsit(pieces[i].x, py)) != 1) createCandiBox(i, pieces[i].x, py);
        // 상대 궁성(y=1,2,3) 대각선
        if (pieces[i].x == 4 && pieces[i].y == 3) {
          if (isEnemy(i, whoIsit(5, 2)) != 1) createCandiBox(i, 5, 2);
        } else if (pieces[i].x == 6 && pieces[i].y == 3) {
          if (isEnemy(i, whoIsit(5, 2)) != 1) createCandiBox(i, 5, 2);
        } else if (pieces[i].x == 5 && pieces[i].y == 2) {
          if (isEnemy(i, whoIsit(4, 1)) != 1) createCandiBox(i, 4, 1);
          if (isEnemy(i, whoIsit(6, 1)) != 1) createCandiBox(i, 6, 1);
        }
      }
      break;
    default:
  }
}
