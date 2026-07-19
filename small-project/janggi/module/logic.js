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
  // 기물 고유 ID 범위에 따라 해당 행마 규칙 함수 분기 호출
  if (i === 0 || i === 9 || i === 10 || i === 16 || i === 25 || i === 26) {
    getKingOrGuardMoves(i);
  } else if (i === 1 || i === 2 || i === 17 || i === 18) {
    getChariotMoves(i);
  } else if (i === 3 || i === 4 || i === 19 || i === 20) {
    getCannonMoves(i);
  } else if (i === 5 || i === 6 || i === 21 || i === 22) {
    getHorseMoves(i);
  } else if (i === 7 || i === 8 || i === 23 || i === 24) {
    getElephantMoves(i);
  } else if ((i >= 11 && i <= 15) || (i >= 27 && i <= 31)) {
    getSoldierMoves(i);
  }
}

/**
 * 궁(장) 및 사의 행마 계산 (궁성 내부 이동)
 * @param {number} i - 기물 ID
 */
function getKingOrGuardMoves(i) {
  // 초나라 궁/사 (내 궁성: x=4~6, y=0,9,8)
  if (i === 0 || i === 9 || i === 10) {
    const px = pieces[i].x;
    const py = pieces[i].y;
    if (px === 4 && py === 0) {
      if (checkTeam(i, 4, 9) !== 1) createCandiBox(i, 4, 9);
      if (checkTeam(i, 5, 9) !== 1) createCandiBox(i, 5, 9);
      if (checkTeam(i, 5, 0) !== 1) createCandiBox(i, 5, 0);
    } else if (px === 5 && py === 0) {
      if (checkTeam(i, 5, 9) !== 1) createCandiBox(i, 5, 9);
      if (checkTeam(i, 6, 0) !== 1) createCandiBox(i, 6, 0);
      if (checkTeam(i, 4, 0) !== 1) createCandiBox(i, 4, 0);
    } else if (px === 6 && py === 0) {
      if (checkTeam(i, 6, 9) !== 1) createCandiBox(i, 6, 9);
      if (checkTeam(i, 5, 0) !== 1) createCandiBox(i, 5, 0);
      if (checkTeam(i, 5, 9) !== 1) createCandiBox(i, 5, 9);
    } else if (px === 4 && py === 9) {
      if (checkTeam(i, 4, 8) !== 1) createCandiBox(i, 4, 8);
      if (checkTeam(i, 5, 9) !== 1) createCandiBox(i, 5, 9);
      if (checkTeam(i, 4, 0) !== 1) createCandiBox(i, 4, 0);
    } else if (px === 5 && py === 9) {
      if (checkTeam(i, 5, 8) !== 1) createCandiBox(i, 5, 8);
      if (checkTeam(i, 6, 8) !== 1) createCandiBox(i, 6, 8);
      if (checkTeam(i, 6, 9) !== 1) createCandiBox(i, 6, 9);
      if (checkTeam(i, 6, 0) !== 1) createCandiBox(i, 6, 0);
      if (checkTeam(i, 5, 0) !== 1) createCandiBox(i, 5, 0);
      if (checkTeam(i, 4, 0) !== 1) createCandiBox(i, 4, 0);
      if (checkTeam(i, 4, 9) !== 1) createCandiBox(i, 4, 9);
      if (checkTeam(i, 4, 8) !== 1) createCandiBox(i, 4, 8);
    } else if (px === 6 && py === 9) {
      if (checkTeam(i, 6, 8) !== 1) createCandiBox(i, 6, 8);
      if (checkTeam(i, 6, 0) !== 1) createCandiBox(i, 6, 0);
      if (checkTeam(i, 5, 9) !== 1) createCandiBox(i, 5, 9);
    } else if (px === 4 && py === 8) {
      if (checkTeam(i, 5, 8) !== 1) createCandiBox(i, 5, 8);
      if (checkTeam(i, 5, 9) !== 1) createCandiBox(i, 5, 9);
      if (checkTeam(i, 4, 9) !== 1) createCandiBox(i, 4, 9);
    } else if (px === 5 && py === 8) {
      if (checkTeam(i, 6, 8) !== 1) createCandiBox(i, 6, 8);
      if (checkTeam(i, 5, 9) !== 1) createCandiBox(i, 5, 9);
      if (checkTeam(i, 4, 8) !== 1) createCandiBox(i, 4, 8);
    } else if (px === 6 && py === 8) {
      if (checkTeam(i, 6, 9) !== 1) createCandiBox(i, 6, 9);
      if (checkTeam(i, 5, 9) !== 1) createCandiBox(i, 5, 9);
      if (checkTeam(i, 5, 8) !== 1) createCandiBox(i, 5, 8);
    }
  }
  // 한나라 궁/사 (상대 궁성: x=4~6, y=1,2,3)
  else {
    const px = pieces[i].x;
    const py = pieces[i].y;
    if (px === 4 && py === 3) {
      if (checkTeam(i, 4, 2) !== 1) createCandiBox(i, 4, 2);
      if (checkTeam(i, 5, 2) !== 1) createCandiBox(i, 5, 2);
      if (checkTeam(i, 5, 3) !== 1) createCandiBox(i, 5, 3);
    } else if (px === 5 && py === 3) {
      if (checkTeam(i, 5, 2) !== 1) createCandiBox(i, 5, 2);
      if (checkTeam(i, 6, 3) !== 1) createCandiBox(i, 6, 3);
      if (checkTeam(i, 4, 3) !== 1) createCandiBox(i, 4, 3);
    } else if (px === 6 && py === 3) {
      if (checkTeam(i, 6, 2) !== 1) createCandiBox(i, 6, 2);
      if (checkTeam(i, 5, 3) !== 1) createCandiBox(i, 5, 3);
      if (checkTeam(i, 5, 2) !== 1) createCandiBox(i, 5, 2);
    } else if (px === 4 && py === 2) {
      if (checkTeam(i, 4, 1) !== 1) createCandiBox(i, 4, 1);
      if (checkTeam(i, 5, 2) !== 1) createCandiBox(i, 5, 2);
      if (checkTeam(i, 4, 3) !== 1) createCandiBox(i, 4, 3);
    } else if (px === 5 && py === 2) {
      if (checkTeam(i, 5, 1) !== 1) createCandiBox(i, 5, 1);
      if (checkTeam(i, 6, 1) !== 1) createCandiBox(i, 6, 1);
      if (checkTeam(i, 6, 2) !== 1) createCandiBox(i, 6, 2);
      if (checkTeam(i, 6, 3) !== 1) createCandiBox(i, 6, 3);
      if (checkTeam(i, 5, 3) !== 1) createCandiBox(i, 5, 3);
      if (checkTeam(i, 4, 3) !== 1) createCandiBox(i, 4, 3);
      if (checkTeam(i, 4, 2) !== 1) createCandiBox(i, 4, 2);
      if (checkTeam(i, 4, 1) !== 1) createCandiBox(i, 4, 1);
    } else if (px === 6 && py === 2) {
      if (checkTeam(i, 6, 1) !== 1) createCandiBox(i, 6, 1);
      if (checkTeam(i, 6, 3) !== 1) createCandiBox(i, 6, 3);
      if (checkTeam(i, 5, 2) !== 1) createCandiBox(i, 5, 2);
    } else if (px === 4 && py === 1) {
      if (checkTeam(i, 5, 1) !== 1) createCandiBox(i, 5, 1);
      if (checkTeam(i, 5, 2) !== 1) createCandiBox(i, 5, 2);
      if (checkTeam(i, 4, 2) !== 1) createCandiBox(i, 4, 2);
    } else if (px === 5 && py === 1) {
      if (checkTeam(i, 6, 1) !== 1) createCandiBox(i, 6, 1);
      if (checkTeam(i, 5, 2) !== 1) createCandiBox(i, 5, 2);
      if (checkTeam(i, 4, 1) !== 1) createCandiBox(i, 4, 1);
    } else if (px === 6 && py === 1) {
      if (checkTeam(i, 6, 2) !== 1) createCandiBox(i, 6, 2);
      if (checkTeam(i, 5, 2) !== 1) createCandiBox(i, 5, 2);
      if (checkTeam(i, 5, 1) !== 1) createCandiBox(i, 5, 1);
    }
  }
}

/**
 * 차(車)의 행마 계산 (직진 및 궁성 대각선)
 * @param {number} i - 기물 ID
 */
function getChariotMoves(i) {
  const px = pieces[i].x;
  const py = pieces[i].y;
  
  // 가로 방향 탐색
  for (let x = px - 1; x >= 1; x--) {
    if (checkTeam(i, x, py) !== 1) createCandiBox(i, x, py);
    if (checkTeam(i, x, py) !== 0) break;
  }
  for (let x = px + 1; x <= 9; x++) {
    if (checkTeam(i, x, py) !== 1) createCandiBox(i, x, py);
    if (checkTeam(i, x, py) !== 0) break;
  }
  
  // 세로 방향 탐색
  for (let ty = yPrev(py); ty !== -1; ty = yPrev(ty)) {
    if (checkTeam(i, px, ty) !== 1) createCandiBox(i, px, ty);
    if (checkTeam(i, px, ty) !== 0) break;
  }
  for (let ty = yNext(py); ty !== -1; ty = yNext(ty)) {
    if (checkTeam(i, px, ty) !== 1) createCandiBox(i, px, ty);
    if (checkTeam(i, px, ty) !== 0) break;
  }
  
  // 상대 궁성 대각선 행마 (y=1,2,3 x=4,5,6)
  if (px === 4 && py === 3) {
    if (checkTeam(i, 5, 2) !== 1) createCandiBox(i, 5, 2);
    if (checkTeam(i, 5, 2) === 0) {
      if (checkTeam(i, 6, 1) !== 1) createCandiBox(i, 6, 1);
    }
  } else if (px === 6 && py === 3) {
    if (checkTeam(i, 5, 2) !== 1) createCandiBox(i, 5, 2);
    if (checkTeam(i, 5, 2) === 0) {
      if (checkTeam(i, 4, 1) !== 1) createCandiBox(i, 4, 1);
    }
  } else if (px === 4 && py === 1) {
    if (checkTeam(i, 5, 2) !== 1) createCandiBox(i, 5, 2);
    if (checkTeam(i, 5, 2) === 0) {
      if (checkTeam(i, 6, 3) !== 1) createCandiBox(i, 6, 3);
    }
  } else if (px === 6 && py === 1) {
    if (checkTeam(i, 5, 2) !== 1) createCandiBox(i, 5, 2);
    if (checkTeam(i, 5, 2) === 0) {
      if (checkTeam(i, 4, 3) !== 1) createCandiBox(i, 4, 3);
    }
  } else if (px === 5 && py === 2) {
    if (checkTeam(i, 4, 3) !== 1) createCandiBox(i, 4, 3);
    if (checkTeam(i, 4, 1) !== 1) createCandiBox(i, 4, 1);
    if (checkTeam(i, 6, 3) !== 1) createCandiBox(i, 6, 3);
    if (checkTeam(i, 6, 1) !== 1) createCandiBox(i, 6, 1);
  }
  // 내 궁성 대각선 행마 (y=0,9,8 x=4,5,6)
  else if (px === 4 && py === 0) {
    if (checkTeam(i, 5, 9) !== 1) createCandiBox(i, 5, 9);
    if (checkTeam(i, 5, 9) === 0) {
      if (checkTeam(i, 6, 8) !== 1) createCandiBox(i, 6, 8);
    }
  } else if (px === 6 && py === 0) {
    if (checkTeam(i, 5, 9) !== 1) createCandiBox(i, 5, 9);
    if (checkTeam(i, 5, 9) === 0) {
      if (checkTeam(i, 4, 8) !== 1) createCandiBox(i, 4, 8);
    }
  } else if (px === 4 && py === 8) {
    if (checkTeam(i, 5, 9) !== 1) createCandiBox(i, 5, 9);
    if (checkTeam(i, 5, 9) === 0) {
      if (checkTeam(i, 6, 0) !== 1) createCandiBox(i, 6, 0);
    }
  } else if (px === 6 && py === 8) {
    if (checkTeam(i, 5, 9) !== 1) createCandiBox(i, 5, 9);
    if (checkTeam(i, 5, 9) === 0) {
      if (checkTeam(i, 4, 0) !== 1) createCandiBox(i, 4, 0);
    }
  } else if (px === 5 && py === 9) {
    if (checkTeam(i, 4, 0) !== 1) createCandiBox(i, 4, 0);
    if (checkTeam(i, 4, 8) !== 1) createCandiBox(i, 4, 8);
    if (checkTeam(i, 6, 0) !== 1) createCandiBox(i, 6, 0);
    if (checkTeam(i, 6, 8) !== 1) createCandiBox(i, 6, 8);
  }
}

/**
 * 포(包)의 행마 계산 (도약 행마, 포끼리 차단)
 * @param {number} i - 기물 ID
 */
function getCannonMoves(i) {
  const px = pieces[i].x;
  const py = pieces[i].y;
  let bridge = false;
  
  // 가로 왼쪽 탐색
  for (let x = px - 1; x >= 1; x--) {
    let t = whoIsit(x, py);
    if (isPo(t)) break; // 포는 포를 다리로 삼을 수 없고 포를 잡을 수 없음
    if (bridge === false) {
      if (t < 32) bridge = true;
    } else {
      if (isEnemy(i, t) !== 1) {
        createCandiBox(i, x, py);
        if (isEnemy(i, t) === 2) break; // 적 기물을 잡으면 탐색 종료
      } else {
        break;
      }
    }
  }
  
  // 가로 오른쪽 탐색
  bridge = false;
  for (let x = px + 1; x <= 9; x++) {
    let t = whoIsit(x, py);
    if (isPo(t)) break;
    if (bridge === false) {
      if (t < 32) bridge = true;
    } else {
      if (isEnemy(i, t) !== 1) {
        createCandiBox(i, x, py);
        if (isEnemy(i, t) === 2) break;
      } else {
        break;
      }
    }
  }
  
  // 세로 위쪽 탐색
  bridge = false;
  for (let ty = yPrev(py); ty !== -1; ty = yPrev(ty)) {
    let t = whoIsit(px, ty);
    if (isPo(t)) break;
    if (bridge === false) {
      if (t < 32) bridge = true;
    } else {
      if (isEnemy(i, t) !== 1) {
        createCandiBox(i, px, ty);
        if (isEnemy(i, t) === 2) break;
      } else {
        break;
      }
    }
  }
  
  // 세로 아래쪽 탐색
  bridge = false;
  for (let ty = yNext(py); ty !== -1; ty = yNext(ty)) {
    let t = whoIsit(px, ty);
    if (isPo(t)) break;
    if (bridge === false) {
      if (t < 32) bridge = true;
    } else {
      if (isEnemy(i, t) !== 1) {
        createCandiBox(i, px, ty);
        if (isEnemy(i, t) === 2) break;
      } else {
        break;
      }
    }
  }
  
  // 내 궁성 대각선 포 도약 (y=0,9,8)
  if (px === 4 && py === 0) {
    let t = whoIsit(5, 9);
    if (!isPo(t) && t < 32 && (checkTeam(i, 6, 8) !== 1) && !isPo(whoIsit(6, 8))) createCandiBox(i, 6, 8);
  } else if (px === 6 && py === 0) {
    let t = whoIsit(5, 9);
    if (!isPo(t) && t < 32 && (checkTeam(i, 4, 8) !== 1) && !isPo(whoIsit(4, 8))) createCandiBox(i, 4, 8);
  } else if (px === 4 && py === 8) {
    let t = whoIsit(5, 9);
    if (!isPo(t) && t < 32 && (checkTeam(i, 6, 0) !== 1) && !isPo(whoIsit(6, 0))) createCandiBox(i, 6, 0);
  } else if (px === 6 && py === 8) {
    let t = whoIsit(5, 9);
    if (!isPo(t) && t < 32 && (checkTeam(i, 4, 0) !== 1) && !isPo(whoIsit(4, 0))) createCandiBox(i, 4, 0);
  }
  // 상대 궁성 대각선 포 도약 (y=1,2,3)
  else if (px === 4 && py === 1) {
    let t = whoIsit(5, 2);
    if (!isPo(t) && t < 32 && (checkTeam(i, 6, 3) !== 1) && !isPo(whoIsit(6, 3))) createCandiBox(i, 6, 3);
  } else if (px === 6 && py === 1) {
    let t = whoIsit(5, 2);
    if (!isPo(t) && t < 32 && (checkTeam(i, 4, 3) !== 1) && !isPo(whoIsit(4, 3))) createCandiBox(i, 4, 3);
  } else if (px === 4 && py === 3) {
    let t = whoIsit(5, 2);
    if (!isPo(t) && t < 32 && (checkTeam(i, 6, 1) !== 1) && !isPo(whoIsit(6, 1))) createCandiBox(i, 6, 1);
  } else if (px === 6 && py === 3) {
    let t = whoIsit(5, 2);
    if (!isPo(t) && t < 32 && (checkTeam(i, 4, 1) !== 1) && !isPo(whoIsit(4, 1))) createCandiBox(i, 4, 1);
  }
}

/**
 * 마(馬)의 행마 계산 (멱 검사 포함)
 * @param {number} i - 기물 ID
 */
function getHorseMoves(i) {
  const px = pieces[i].x;
  const py = pieces[i].y;
  
  // 좌측 멱 검사 후 L자 이동
  if (whoIsit(px - 1, py) >= 32) {
    let prevY = yPrev(py);
    let nextY = yNext(py);
    if (prevY !== -1 && isEnemy(i, whoIsit(px - 2, prevY)) !== 1) createCandiBox(i, px - 2, prevY);
    if (nextY !== -1 && isEnemy(i, whoIsit(px - 2, nextY)) !== 1) createCandiBox(i, px - 2, nextY);
  }
  // 우측 멱 검사 후 L자 이동
  if (whoIsit(px + 1, py) >= 32) {
    let prevY = yPrev(py);
    let nextY = yNext(py);
    if (prevY !== -1 && isEnemy(i, whoIsit(px + 2, prevY)) !== 1) createCandiBox(i, px + 2, prevY);
    if (nextY !== -1 && isEnemy(i, whoIsit(px + 2, nextY)) !== 1) createCandiBox(i, px + 2, nextY);
  }
  // 위쪽 멱 검사 후 L자 이동
  {
    let py1 = yPrev(py);
    if (py1 !== -1 && whoIsit(px, py1) >= 32) {
      let py2 = yPrev(py1);
      if (py2 !== -1) {
        if (isEnemy(i, whoIsit(px - 1, py2)) !== 1) createCandiBox(i, px - 1, py2);
        if (isEnemy(i, whoIsit(px + 1, py2)) !== 1) createCandiBox(i, px + 1, py2);
      }
    }
  }
  // 아래쪽 멱 검사 후 L자 이동
  {
    let ny1 = yNext(py);
    if (ny1 !== -1 && whoIsit(px, ny1) >= 32) {
      let ny2 = yNext(ny1);
      if (ny2 !== -1) {
        if (isEnemy(i, whoIsit(px - 1, ny2)) !== 1) createCandiBox(i, px - 1, ny2);
        if (isEnemy(i, whoIsit(px + 1, ny2)) !== 1) createCandiBox(i, px + 1, ny2);
      }
    }
  }
}

/**
 * 상(象)의 행마 계산 (이중 멱 검사 포함)
 * @param {number} i - 기물 ID
 */
function getElephantMoves(i) {
  const px = pieces[i].x;
  const py = pieces[i].y;
  
  // 좌측 멱 검사 후 대각선 행마
  if (whoIsit(px - 1, py) >= 32) {
    let py1 = yPrev(py);
    if (py1 !== -1 && whoIsit(px - 2, py1) >= 32) {
      let py2 = yPrev(py1);
      if (py2 !== -1 && isEnemy(i, whoIsit(px - 3, py2)) !== 1) createCandiBox(i, px - 3, py2);
    }
    let ny1 = yNext(py);
    if (ny1 !== -1 && whoIsit(px - 2, ny1) >= 32) {
      let ny2 = yNext(ny1);
      if (ny2 !== -1 && isEnemy(i, whoIsit(px - 3, ny2)) !== 1) createCandiBox(i, px - 3, ny2);
    }
  }
  // 우측 멱 검사 후 대각선 행마
  if (whoIsit(px + 1, py) >= 32) {
    let py1 = yPrev(py);
    if (py1 !== -1 && whoIsit(px + 2, py1) >= 32) {
      let py2 = yPrev(py1);
      if (py2 !== -1 && isEnemy(i, whoIsit(px + 3, py2)) !== 1) createCandiBox(i, px + 3, py2);
    }
    let ny1 = yNext(py);
    if (ny1 !== -1 && whoIsit(px + 2, ny1) >= 32) {
      let ny2 = yNext(ny1);
      if (ny2 !== -1 && isEnemy(i, whoIsit(px + 3, ny2)) !== 1) createCandiBox(i, px + 3, ny2);
    }
  }
  // 위쪽 멱 검사 후 대각선 행마
  {
    let py1 = yPrev(py);
    if (py1 !== -1 && whoIsit(px, py1) >= 32) {
      let py2 = yPrev(py1);
      if (py2 !== -1) {
        if (whoIsit(px - 1, py2) >= 32) {
          let py3 = yPrev(py2);
          if (py3 !== -1 && isEnemy(i, whoIsit(px - 2, py3)) !== 1) createCandiBox(i, px - 2, py3);
        }
        if (whoIsit(px + 1, py2) >= 32) {
          let py3 = yPrev(py2);
          if (py3 !== -1 && isEnemy(i, whoIsit(px + 2, py3)) !== 1) createCandiBox(i, px + 2, py3);
        }
      }
    }
  }
  // 아래쪽 멱 검사 후 대각선 행마
  {
    let ny1 = yNext(py);
    if (ny1 !== -1 && whoIsit(px, ny1) >= 32) {
      let ny2 = yNext(ny1);
      if (ny2 !== -1) {
        if (whoIsit(px - 1, ny2) >= 32) {
          let ny3 = yNext(ny2);
          if (ny3 !== -1 && isEnemy(i, whoIsit(px - 2, ny3)) !== 1) createCandiBox(i, px - 2, ny3);
        }
        if (whoIsit(px + 1, ny2) >= 32) {
          let ny3 = yNext(ny2);
          if (ny3 !== -1 && isEnemy(i, whoIsit(px + 2, ny3)) !== 1) createCandiBox(i, px + 2, ny3);
        }
      }
    }
  }
}

/**
 * 졸/병(卒/兵)의 행마 계산 (전진, 좌우 및 궁성 사선 전진)
 * @param {number} i - 기물 ID
 */
function getSoldierMoves(i) {
  const px = pieces[i].x;
  const py = pieces[i].y;
  
  // 좌우 탐색
  if (isEnemy(i, whoIsit(px - 1, py)) !== 1) createCandiBox(i, px - 1, py);
  if (isEnemy(i, whoIsit(px + 1, py)) !== 1) createCandiBox(i, px + 1, py);
  
  // 한나라 병 (ID 17~31, y 증가 방향으로 전진)
  if (i > 16) {
    let ny = yNext(py);
    if (ny !== -1 && isEnemy(i, whoIsit(px, ny)) !== 1) createCandiBox(i, px, ny);
    // 내 궁성(y=0,9,8 x=4,5,6) 대각선 길목 추가
    if (px === 4 && py === 8) {
      if (isEnemy(i, whoIsit(5, 9)) !== 1) createCandiBox(i, 5, 9);
    } else if (px === 6 && py === 8) {
      if (isEnemy(i, whoIsit(5, 9)) !== 1) createCandiBox(i, 5, 9);
    } else if (px === 5 && py === 9) {
      if (isEnemy(i, whoIsit(4, 0)) !== 1) createCandiBox(i, 4, 0);
      if (isEnemy(i, whoIsit(6, 0)) !== 1) createCandiBox(i, 6, 0);
    }
  }
  // 초나라 졸 (ID 0~15, y 감소 방향으로 전진)
  else {
    let prevY = yPrev(py);
    if (prevY !== -1 && isEnemy(i, whoIsit(px, prevY)) !== 1) createCandiBox(i, px, prevY);
    // 상대 궁성(y=1,2,3 x=4,5,6) 대각선 길목 추가
    if (px === 4 && py === 3) {
      if (isEnemy(i, whoIsit(5, 2)) !== 1) createCandiBox(i, 5, 2);
    } else if (px === 6 && py === 3) {
      if (isEnemy(i, whoIsit(5, 2)) !== 1) createCandiBox(i, 5, 2);
    } else if (px === 5 && py === 2) {
      if (isEnemy(i, whoIsit(4, 1)) !== 1) createCandiBox(i, 4, 1);
      if (isEnemy(i, whoIsit(6, 1)) !== 1) createCandiBox(i, 6, 1);
    }
  }
}
