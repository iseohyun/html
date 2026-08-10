// ai.js - AI 엔진, 장군 판정, 합법수 필터링

// AI 대국 모드 제어 함수
function changeAiMode(val) {
  aiMode = parseInt(val, 10);
  localStorage.setItem("aiMode", aiMode);
  saveCurrentConfigToSlot();
  checkAndRunAI(true);
}

function changeCursorLockMode(val) {
  cursorLockMode = (val === "true" || val === true);
  localStorage.setItem("cursorLockMode", cursorLockMode);
  saveCurrentConfigToSlot();
  initSettingsUI();
}

var aiThinking = false;

function checkAndRunAI(immediate = false) {
  if (aiMode === 0) return;
  if (aiThinking) return;
  if (gameEnded) return;
  
  const turn = document.getElementById("turn");
  if (!turn) return;
  const curTurn = parseInt(turn.value, 10);
  
  // 기보 리뷰 모드 등 과거를 돌려보는 중이면 AI 작동 차단 (단, 즉시 강제 실행 모드일 경우 그 시점부터 뒤를 자르고 실행)
  if (curTurn < log.length) {
    if (immediate) {
      log.length = curTurn;
      updateRecordUI();
    } else {
      return;
    }
  }
  
  const isChoTurn = (curTurn % 2 === 0);
  const aiIsCho = (aiMode === 1 && !iAmCho);
  const aiIsHan = (aiMode === 1 && iAmCho);
  
  if ((isChoTurn && aiIsCho) || (!isChoTurn && aiIsHan)) {
    aiThinking = true;
    
    const delay = immediate ? 0 : 500;
    
    // 약간의 딜레이를 주어 AI가 생각하는 척하는 자연스러운 연출 적용
    setTimeout(() => {
      try {
        const aiTeam = isChoTurn ? "cho" : "han";
        const bestMove = getBestAIMove(aiTeam);
        
        if (bestMove) {
          console.log(`[AI Move] Executing move: Piece ${bestMove.i} (${pieces[bestMove.i].e.id}) -> x=${bestMove.x}, y=${bestMove.y}`);
          move(bestMove.i, bestMove.x, bestMove.y);
        } else {
          console.warn("[AI Move] No legal moves found for AI.");
        }
      } catch (err) {
        console.error("[AI Error] Error during AI move calculation:", err);
      } finally {
        aiThinking = false;
        checkAndRunAI();
      }
    }, delay);
  }
}

function isKingInCheck(team) {
  const kingIdx = ((team === "cho") === iAmCho) ? 0 : 16;
  const kingX = pieces[kingIdx].x;
  const kingY = pieces[kingIdx].y;
  
  if (kingX === 0 && kingY === 0) return false;
  
  const opponentTeam = (team === "cho") ? "han" : "cho";
  const opponentMoves = getLegalMoves(opponentTeam);
  
  for (let m of opponentMoves) {
    if (m.x === kingX && m.y === kingY) {
      return true;
    }
  }
  return false;
}

function getFilteredLegalMoves(team) {
  const allMoves = getLegalMoves(team);
  const validMoves = [];
  
  const savedState = pieces.map(p => ({ x: p.x, y: p.y }));
  
  for (let move of allMoves) {
    const originalPos = savedState[move.i];
    const targetPieceIdx = pieces.findIndex((p, idx) => idx !== move.i && p.x === move.x && p.y === move.y);
    
    pieces[move.i].x = move.x;
    pieces[move.i].y = move.y;
    let capturedPiece = null;
    if (targetPieceIdx !== -1) {
      capturedPiece = { idx: targetPieceIdx, x: pieces[targetPieceIdx].x, y: pieces[targetPieceIdx].y };
      pieces[targetPieceIdx].x = 0;
      pieces[targetPieceIdx].y = 0;
    }
    
    const inCheck = isKingInCheck(team);
    
    pieces[move.i].x = originalPos.x;
    pieces[move.i].y = originalPos.y;
    if (capturedPiece) {
      pieces[capturedPiece.idx].x = capturedPiece.x;
      pieces[capturedPiece.idx].y = capturedPiece.y;
    }
    
    if (!inCheck) {
      validMoves.push(move);
    }
  }
  
  return validMoves;
}

function checkGameStatus() {
  const turn = document.getElementById("turn");
  if (!turn) return;
  const curTurn = parseInt(turn.value, 10);
  
  const isChoTurn = (curTurn % 2 === 0);
  const currentTeam = isChoTurn ? "cho" : "han";
  
  const inCheck = isKingInCheck(currentTeam);
  const validMoves = getFilteredLegalMoves(currentTeam);
  
  if (validMoves.length === 0) {
    if (inCheck) {
      gameEnded = true;
      const winner = isChoTurn ? "한나라 (Red)" : "초나라 (Blue)";
      setTimeout(() => {
        alert(`외통수! ${winner}가 승리하였습니다!`);
      }, 100);
    }
  }
}

function getLegalMoves(team) {
  let moves = [];
  
  const isCho = (team === "cho");
  const startIdx = (isCho === iAmCho) ? 0 : 16;
  const endIdx = (isCho === iAmCho) ? 15 : 31;
  
  for (let idx = startIdx; idx <= endIdx; idx++) {
    if (pieces[idx].x !== 0) {
      const pieceMoves = getCandidateMoves(idx);
      for (const m of pieceMoves) {
        moves.push({ i: idx, x: m.x, y: m.y });
      }
    }
  }
  
  return moves;
}

function getBestAIMove(aiTeam) {
  const isChoAI = (aiTeam === "cho");
  const aiMoves = getFilteredLegalMoves(aiTeam);
  
  if (aiMoves.length === 0) return null;
  
  // 현재 보드 좌표 백업
  const savedState = pieces.map(p => ({ x: p.x, y: p.y }));
  
  let bestScore = isChoAI ? -Infinity : Infinity;
  let bestMoves = [];
  
  for (let aiMove of aiMoves) {
    // 1. AI 수 시뮬레이션
    const originalPos = savedState[aiMove.i];
    const targetPieceIdx = pieces.findIndex((p, idx) => idx !== aiMove.i && p.x === aiMove.x && p.y === aiMove.y);
    
    pieces[aiMove.i].x = aiMove.x;
    pieces[aiMove.i].y = aiMove.y;
    let capturedPiece = null;
    if (targetPieceIdx !== -1) {
      capturedPiece = { idx: targetPieceIdx, x: pieces[targetPieceIdx].x, y: pieces[targetPieceIdx].y };
      pieces[targetPieceIdx].x = 0;
      pieces[targetPieceIdx].y = 0;
    }
    
    // 2. 상대방의 최선 대응 수 예측 (Depth 2 Minimax)
    const opponentTeam = isChoAI ? "han" : "cho";
    const opponentReplies = getFilteredLegalMoves(opponentTeam);
    
    let worstReplyScore = isChoAI ? Infinity : -Infinity;
    
    if (opponentReplies.length === 0) {
      worstReplyScore = isChoAI ? 999999 : -999999;
    } else {
      for (let reply of opponentReplies) {
        // 상대방 수 시뮬레이션
        const replyOrigPos = { x: pieces[reply.i].x, y: pieces[reply.i].y };
        const replyTargetIdx = pieces.findIndex((p, idx) => idx !== reply.i && p.x === reply.x && p.y === reply.y);
        
        pieces[reply.i].x = reply.x;
        pieces[reply.i].y = reply.y;
        let replyCaptured = null;
        if (replyTargetIdx !== -1) {
          replyCaptured = { idx: replyTargetIdx, x: pieces[replyTargetIdx].x, y: pieces[replyTargetIdx].y };
          pieces[replyTargetIdx].x = 0;
          pieces[replyTargetIdx].y = 0;
        }
        
        // 보드 점수 평가
        const score = evaluateBoard();
        
        // 상대방 수 롤백
        pieces[reply.i].x = replyOrigPos.x;
        pieces[reply.i].y = replyOrigPos.y;
        if (replyCaptured) {
          pieces[replyCaptured.idx].x = replyCaptured.x;
          pieces[replyCaptured.idx].y = replyCaptured.y;
        }
        
        // 상대방(한/초)은 자신에게 가장 유리한 수(점수 최소화/최대화)를 선택함
        if (isChoAI) {
          if (score < worstReplyScore) {
            worstReplyScore = score;
          }
        } else {
          if (score > worstReplyScore) {
            worstReplyScore = score;
          }
        }
      }
    }
    
    // AI 수 롤백
    pieces[aiMove.i].x = originalPos.x;
    pieces[aiMove.i].y = originalPos.y;
    if (capturedPiece) {
      pieces[capturedPiece.idx].x = capturedPiece.x;
      pieces[capturedPiece.idx].y = capturedPiece.y;
    }
    
    // 약간의 랜덤성(Jitter)을 주어 대국 양상의 다양성 확보 (동점일 때 다른 선택을 하도록 유도)
    const scoreWithJitter = worstReplyScore + (Math.random() - 0.5) * 0.1;
    
    if (isChoAI) {
      if (scoreWithJitter > bestScore) {
        bestScore = scoreWithJitter;
        bestMoves = [aiMove];
      } else if (Math.abs(scoreWithJitter - bestScore) < 0.01) {
        bestMoves.push(aiMove);
      }
    } else {
      if (scoreWithJitter < bestScore) {
        bestScore = scoreWithJitter;
        bestMoves = [aiMove];
      } else if (Math.abs(scoreWithJitter - bestScore) < 0.01) {
        bestMoves.push(aiMove);
      }
    }
  }
  
  if (bestMoves.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * bestMoves.length);
  return bestMoves[randomIndex];
}

function evaluateBoard() {
  let score = 0;
  
  // 각 기물의 절댓값 가치 정의 (초 = 양수, 한 = 음수)
  const values = [
    100000, // 궁 (Cho 0)
    130,   // 차
    130,   // 차
    70,    // 포
    70,    // 포
    50,    // 마
    50,    // 마
    30,    // 상
    30,    // 상
    30,    // 사
    30,    // 사
    20,    // 졸
    20,    // 졸
    20,    // 졸
    20,    // 졸
    20,    // 졸
    
    -100000, // 궁 (Han 16)
    -130,   // 차
    -130,   // 차
    -70,    // 포
    -70,    // 포
    -50,    // 마
    -50,    // 마
    -30,    // 상
    -30,    // 상
    -30,    // 사
    -30,    // 사
    -20,    // 병
    -20,    // 병
    -20,    // 병
    -20,    // 병
    -20     // 병
  ];
  
  for (let idx = 0; idx < 32; idx++) {
    if (pieces[idx].x !== 0) {
      const isChoPiece = (idx < 16) === iAmCho;
      const val = Math.abs(values[idx]);
      score += isChoPiece ? val : -val;
      
      // 포지션 가치: X축은 중앙에 가까울수록 가치 증가 (최대 2점)
      const xDist = Math.abs(pieces[idx].x - 5);
      const xBonus = (4 - xDist) * 0.5 * (isChoPiece ? 1 : -1);
      
      // Y축은 상대편 진영 방향으로 진격할수록 가치 증가 (최대 3점, 졸/병/마/상 전진성 유도)
      const dist = (idx < 16) ? (10 - pieces[idx].y) : (pieces[idx].y - 1);
      const yBonus = dist * 0.3 * (isChoPiece ? 1 : -1);
      
      score += xBonus + yBonus;
    }
  }
  
  // 덤 (한나라 후수 1.5점 가중치 보정)
  score -= 1.5;
  
  return score;
}

function toggleOpponentAI() {
  if (aiMode !== 0) {
    aiMode = 0;
    showToast("상대 AI 모드 꺼짐");
  } else {
    aiMode = 1;
    showToast("상대 AI 모드 켜짐 (AI가 위쪽에서 플레이)");
  }
  localStorage.setItem("aiMode", aiMode);
  saveCurrentConfigToSlot();
  
  const aiModeSelect = document.getElementById("ai-mode-select");
  if (aiModeSelect) aiModeSelect.value = aiMode;
  
  checkAndRunAI(true);
}

function requestAIHint() {
  const turnEl = document.getElementById("turn");
  if (!turnEl) return;
  const curTurn = parseInt(turnEl.value, 10);
  const isChoTurn = (curTurn % 2 === 0);
  const isMyTurn = (isChoTurn === iAmCho);
  
  if (!isMyTurn) {
    showToast("내 턴이 아닙니다. (훈수는 내 턴에만 가능)");
    return;
  }
  
  const myTeam = iAmCho ? "cho" : "han";
  const bestMove = getBestAIMove(myTeam);
  if (bestMove) {
    showToast("AI 훈수 착수!");
    move(bestMove.i, bestMove.x, bestMove.y);
  } else {
    showToast("추천할 수 있는 합법적인 수가 없습니다.");
  }
}

