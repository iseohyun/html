/**
 * KakaoTalk HTML5 Canvas 2D Engine Module
 * Version: 0.0.10
 */

(function () {
  'use strict';

  const MARGIN = 160;
  const imageObjCache = {};

  // 60fps 프레임 애니메이션 및 부드러운 스크롤 상태 제어 변수
  let currentScrollY = 0;
  let targetScrollY = 0;
  let maxScrollY = 0; // 캔버스 내부 스크롤 최대 한계치 (v0.1.0)
  let isScrollEasingActive = false;
  let animationFrameId = null;
  let loopRefreshCallback = null; // 렌더루프 제어 콜백 백업용
  let loopDrawCallback = null;    // 렌더루프 그리기 콜백 백업용

  const animState = {
    progress: 1.0, // 0.0 ~ 1.0
    duration: 500, // ms
    startTime: 0,
    active: false,
    effect: 'opacity'
  };

  /**
   * Base64 이미지 리소스를 메모리에 로딩하여 고속 캔버스 틱에 즉시 제공하는 캐시 헬퍼
   */
  function getCachedImage(base64Str, callback) {
    if (!base64Str) return null;
    if (imageObjCache[base64Str]) {
      return imageObjCache[base64Str];
    }
    const img = new Image();
    img.onload = () => {
      imageObjCache[base64Str] = img;
      if (callback) callback();
    };
    img.src = base64Str;
    return null;
  }

  /**
   * 둥근 사각형 드로잉 헬퍼
   */
  function drawRoundRect(c, x, y, width, height, radius) {
    c.beginPath();
    c.moveTo(x + radius, y);
    c.lineTo(x + width - radius, y);
    c.quadraticCurveTo(x + width, y, x + width, y + radius);
    c.lineTo(x + width, y + height - radius);
    c.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    c.lineTo(x + radius, y + height);
    c.quadraticCurveTo(x, y + height, x, y + height - radius);
    c.lineTo(x, y + radius);
    c.quadraticCurveTo(x, y, x + radius, y);
    c.closePath();
  }

  /**
   * 줄바꿈 대화 본문 텍스트 드로잉
   */
  function drawWrappedText(c, lines, x, y, p, fontSize, lineSpacing) {
    const totalChars = lines.join('').length;
    const showCharsCount = Math.floor(totalChars * p);
    
    let charsPrinted = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      const remaining = showCharsCount - charsPrinted;
      
      if (remaining <= 0) break;

      if (remaining >= lineText.length) {
        c.fillText(lineText, x, y + (i * lineSpacing));
        charsPrinted += lineText.length;
      } else {
        c.fillText(lineText.substring(0, remaining), x, y + (i * lineSpacing));
        break;
      }
    }
  }

  /**
   * 전체 캡처 시간에서 hh:mm 텍스트만 파싱 추출하는 헬퍼
   */
  function extractTimeStr(captureTime) {
    if (!captureTime) return '15:18';
    
    // "오후 3:18" -> "3:18" 또는 "15:18" 형태의 순수 시간만 추출
    const match = captureTime.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      return `${match[1]}:${match[2]}`;
    }
    return '15:18';
  }

  /**
   * HTML5 Canvas 2D 그래픽 렌더링 엔진 코어
   */
  function drawCanvasChat(canvas, ctx, config, dialogs, avatarSettingsMap) {
    if (!canvas || !ctx) return;

    // UI에서 설정한 도면 기준의 가상 디자인 해상도 (750x1334 오리지널 복원)
    const designW = parseInt(config['width']) || 750;
    const designH = parseInt(config['height']) || 1334;

    // 실제 설정된 캔버스 물리 해상도 (외부 ResizeObserver 세팅 대응)
    const realW = canvas.width || designW;
    const realH = canvas.height || designH;

    // 기존 드로잉 연산 코드는 가로/세로를 designW, designH 기준으로 그리므로 고정 상수로 매핑
    const width = designW;
    const height = designH;

    ctx.save();
    ctx.scale(realW / designW, realH / designH);

    // 1. 글꼴 상세 속성 적용 (v0.0.10)
    const selectedFont = config['font'] || 'sans-serif';
    const fontSize = parseInt(config['font-size']) || 38;
    const isBold = (config['font-bold'] === 'true' || config['font-bold'] === true) ? 'bold ' : '';
    const lineSpacing = fontSize + 22; // 글꼴 크기에 비례한 줄 간격 산출

    // 2. 개별 색상 커스텀 피커 연동 (v0.0.10)
    const meBubbleColor = config['me-bubble-color'] || '#ffeb34';
    const youBubbleColor = config['you-bubble-color'] || '#ffffff';
    const timeColor = config['time-color'] || '#cccccc';

    // 3. 캔버스 배경 칠하기
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = config['background-color'] || '#acc0d1';
    ctx.fillRect(0, 0, width, height);

    // v0.0.10 피드백: 대화참여자가 2명이고 대화방 이름이 상대방 이름이면 1:1 개인 대화방으로 지정
    const speakers = new Set();
    dialogs.forEach(d => {
      if (d.person && !d.person.startsWith('=')) {
        speakers.add(d.person);
      }
    });
    const isDirectChat = (speakers.size === 2 && Array.from(speakers).includes(config['your-name']));

    // 4. 대화방 말풍선 위치/크기 정적 계산 및 캐싱
    let lastPosY = 310;
    let lastSpeaker = '';
    const tempPositions = [];

    const progressVal = parseInt(config['progress']) || 0;
    const cleanDialogs = dialogs.filter(d => d.person && d.person.trim() !== '');
    const visibleDialogs = cleanDialogs.slice(0, progressVal);

    visibleDialogs.forEach((dialog) => {
      if (!dialog.person || dialog.person.trim() === '') return;

      // 날짜 구분선 위치 계산
      if (dialog.person.startsWith('=')) {
        lastSpeaker = ''; // 날짜 구분선 출현 시 연속 화자 정보 리셋 (간격 불일치 예방)
        lastPosY += 50;
        const dateVal = dialog.person.slice(1);
        let displayDate = dateVal;
        try {
          const dateObj = new Date(dateVal);
          if (!isNaN(dateObj.getTime())) {
            const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
            displayDate = dateObj.toLocaleDateString('ko-KR', options);
          }
        } catch (e) {
          // 예외 폴백
        }

        ctx.font = `bold 40px ${selectedFont}`;
        const dateWidth = ctx.measureText(displayDate).width + 100;
        tempPositions.push({
          isDate: true,
          posY: lastPosY,
          width: dateWidth,
          text: displayDate
        });

        lastPosY += Math.round(MARGIN / 3);
        return;
      }

      // 말풍선 줄바꿈 계산 (글꼴 크기에 비례)
      const words = dialog.message.split(' ');
      let line = '';
      const lines = [];
      let lineCount = 0;
      const posY = lastPosY + 58;

      words.forEach((word) => {
        if (word === '\\') {
          lineCount++;
          lines.push(line);
          line = '';
        } else if (line.length + word.length > Math.max(12, Math.floor(720 / fontSize))) {
          if (word.startsWith('\\')) {
            word = word.slice(1);
          }
          lineCount++;
          lines.push(line);
          line = word;
        } else {
          if (word.startsWith('\\')) {
            word = word.slice(1);
          }
          line += (line ? ' ' : '') + word;
        }
      });
      lines.push(line);

      ctx.font = `${isBold}${fontSize}px ${selectedFont}`;
      let maxWidth = 0;
      lines.forEach((l) => {
        const w = ctx.measureText(l).width;
        if (w > maxWidth) maxWidth = w;
      });

      const bubbleWidth = maxWidth + 45;
      const bubbleHeight = 40 + lineSpacing * lineCount;

      let actualPosY = posY;
      let isContinuous = false;

      // 연속 메시지일 경우 Y축 격리 배치
      if (dialog.person === lastSpeaker) {
        actualPosY = posY - (fontSize + 10);
        isContinuous = true;
        lastPosY += lineCount * lineSpacing + MARGIN - 50;
      } else {
        lastSpeaker = dialog.person;
        lastPosY += lineCount * lineSpacing + MARGIN;
      }

      tempPositions.push({
        isDate: false,
        posY: actualPosY,
        width: bubbleWidth,
        height: bubbleHeight,
        lines: lines,
        lineCount: lineCount,
        isContinuous: isContinuous,
        person: dialog.person,
        time: dialog.time || extractTimeStr(dialog.rawTime || config['capture-time'])
      });
    });

    // 5. 부드러운 스크롤 Easing 목표 스크롤 Y 좌표 갱신
    const autoScrollChecked = config['auto-scroll'] === 'true' || config['auto-scroll'] === true;
    const viewportBottomLimit = height - 60;
    maxScrollY = Math.max(0, lastPosY - viewportBottomLimit);

    if (autoScrollChecked) {
      if (lastPosY > viewportBottomLimit) {
        targetScrollY = lastPosY - viewportBottomLimit;
      } else {
        targetScrollY = 0;
      }
      isScrollEasingActive = true;
    } else {
      // 자동 스크롤이 꺼진 수동 모드일 때는 targetScrollY를 가드 범위 내에 유지
      targetScrollY = Math.min(maxScrollY, Math.max(0, targetScrollY));
      isScrollEasingActive = true;
    }

    // 6. 스크롤 뷰포트 클리핑 및 드로잉 (240px 헤더 아래만 렌더링)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 240, width, height - 240);
    ctx.clip();

    ctx.translate(0, -currentScrollY);

    visibleDialogs.forEach((dialog, index) => {
      const pos = tempPositions[index];
      if (!pos) return;

      const isLastItem = (index === visibleDialogs.length - 1);

      // 애니메이션 진행 경과값 매핑
      let itemOpacity = 1.0;
      let itemTranslateX = 0;
      let itemTranslateY = 0;
      let itemBlur = 0;
      let typingProgress = 1.0;

      if (isLastItem && animState.active) {
        const p = animState.progress;
        if (animState.effect === 'opacity') {
          itemOpacity = p;
        } else if (animState.effect === 'blur') {
          itemOpacity = p;
          itemBlur = (1.0 - p) * 12;
        } else if (animState.effect === 'slide') {
          itemOpacity = p;
          if (pos.isDate) {
            itemTranslateY = (1.0 - p) * 40;
          } else if (dialog.person === config['me']) {
            itemTranslateX = (1.0 - p) * 80;
          } else {
            itemTranslateX = -(1.0 - p) * 80;
          }
        } else if (animState.effect === 'typing') {
          typingProgress = p;
        }
      }

      ctx.save();
      ctx.globalAlpha = itemOpacity;
      ctx.translate(itemTranslateX, itemTranslateY);

      if (itemBlur > 0) {
        ctx.filter = `blur(${itemBlur}px)`;
      }

      // 날짜 구분선 렌더링
      if (pos.isDate) {
        const bx = (width / 2) - pos.width / 2;
        ctx.fillStyle = 'rgb(177,195,213)';
        drawRoundRect(ctx, bx, pos.posY, pos.width, 60, 30);
        ctx.fill();

        ctx.fillStyle = '#444444';
        ctx.font = `bold 36px ${selectedFont}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pos.text, width / 2, pos.posY + 30);
        ctx.restore();
        return;
      }

      // 말풍선 렌더링
      const customSettings = avatarSettingsMap[dialog.person] || { color: '#DE8', text: dialog.person.charAt(0), textColor: '#ffffff' };
      const isMe = (dialog.person === config['me']);

      if (isMe) {
        // 내 말풍선 그리기 (커스텀 노란색)
        const bx = width - pos.width - 80;
        ctx.fillStyle = meBubbleColor;
        drawRoundRect(ctx, bx, pos.posY, pos.width, pos.height + 40, 32);
        ctx.fill();

        // 카톡 말풍선 오른쪽 꼬리 드로잉
        ctx.beginPath();
        ctx.moveTo(bx + pos.width - 15, pos.posY);
        ctx.quadraticCurveTo(bx + pos.width + 12, pos.posY - 1, bx + pos.width + 18, pos.posY + 10);
        ctx.quadraticCurveTo(bx + pos.width + 8, pos.posY + 25, bx + pos.width - 15, pos.posY + 30);
        ctx.fill();

        // 대화 시간 표시 (v0.0.10: 내 말풍선 왼쪽 하단 정렬)
        ctx.fillStyle = timeColor;
        ctx.font = `bold ${Math.floor(fontSize * 0.7)}px ${selectedFont}`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(pos.time, bx - 15, pos.posY + pos.height + 40);

        // 텍스트 출력
        ctx.fillStyle = '#000000';
        ctx.font = `${isBold}${fontSize}px ${selectedFont}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        drawWrappedText(ctx, pos.lines, bx + 22, pos.posY + 20, typingProgress, fontSize, lineSpacing);
      } else {
        // 상대방 말풍선 그리기 (커스텀 흰색)
        const bx = 180;

        ctx.fillStyle = youBubbleColor;
        drawRoundRect(ctx, bx, pos.posY, pos.width, pos.height + 40, 32);
        ctx.fill();

        // 카톡 말풍선 왼쪽 꼬리 드로잉
        ctx.beginPath();
        ctx.moveTo(bx + 15, pos.posY);
        ctx.quadraticCurveTo(bx - 12, pos.posY - 1, bx - 18, pos.posY + 10);
        ctx.quadraticCurveTo(bx - 8, pos.posY + 25, bx + 15, pos.posY + 30);
        ctx.fill();

        // 초상화 및 이름 라벨 드로잉 (연속 메시지일 경우 생략)
        if (!pos.isContinuous) {
          const cx = 73;
          const cy = pos.posY - 10 + 58;
          const r = 58;

          if (customSettings.image) {
            const cachedImg = getCachedImage(customSettings.image, () => {
              drawCanvasChat(canvas, ctx, config, dialogs, avatarSettingsMap);
            });

            if (cachedImg) {
              ctx.save();
              ctx.beginPath();
              ctx.arc(cx, cy, r, 0, Math.PI * 2);
              ctx.clip();
              ctx.drawImage(cachedImg, cx - r, cy - r, r * 2, r * 2);
              ctx.restore();
            } else {
              ctx.fillStyle = customSettings.color;
              ctx.beginPath();
              ctx.arc(cx, cy, r, 0, Math.PI * 2);
              ctx.fill();
            }
          } else {
            ctx.fillStyle = customSettings.color;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();

            // 이름 이니셜
            ctx.fillStyle = customSettings.textColor;
            ctx.font = `bold 55px ${selectedFont}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(customSettings.text, cx, cy);
          }

          // 상대방 이름 라벨 출력 (v0.0.10 피드백: 1:1 개인톡방일 때는 이름 라벨 출력을 생략)
          if (!isDirectChat) {
            ctx.fillStyle = '#2c3e50';
            ctx.font = `bold ${Math.floor(fontSize * 0.85)}px ${selectedFont}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.fillText(dialog.person, bx, pos.posY - 12);
          }
        }

        // 대화 시간 표시 (v0.0.10: 상대 말풍선 오른쪽 하단 정렬)
        ctx.fillStyle = timeColor;
        ctx.font = `bold ${Math.floor(fontSize * 0.7)}px ${selectedFont}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(pos.time, bx + pos.width + 15, pos.posY + pos.height + 40);

        // 텍스트 출력
        ctx.fillStyle = '#000000';
        ctx.font = `${isBold}${fontSize}px ${selectedFont}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        drawWrappedText(ctx, pos.lines, bx + 22, pos.posY + 20, typingProgress, fontSize, lineSpacing);
      }

      ctx.restore();
    });

    ctx.restore(); // 스크롤 클리핑 해제

    // 7. 상단 헤더 영역 고정 그리기 (240px 높이)
    ctx.fillStyle = config['background-color'] || '#acc0d1';
    ctx.fillRect(0, 0, width, 240);

    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, 236, width, 4);

    // 캡처 시간
    ctx.fillStyle = '#000000';
    ctx.font = `bold 36px ${selectedFont}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(config['capture-time'], 60, 52);

    // 방 이름
    ctx.font = `bold 54px ${selectedFont}`;
    ctx.fillText(config['your-name'], 60, 160);

    // 돋보기 아이콘
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(width - 210, 160, 18, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width - 197, 173);
    ctx.lineTo(width - 178, 192);
    ctx.stroke();

    // 햄버거 메뉴 아이콘
    ctx.beginPath();
    ctx.moveTo(width - 115, 142); ctx.lineTo(width - 55, 142);
    ctx.moveTo(width - 115, 168); ctx.lineTo(width - 55, 168);
    ctx.moveTo(width - 115, 194); ctx.lineTo(width - 55, 194);
    ctx.stroke();

    // 와이파이 안테나
    const wifiVal = parseInt(config['wifi']) || 4;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4.5;
    const wcx = width - 175;
    const wcy = 58;

    ctx.fillStyle = wifiVal >= 0 ? '#000' : 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.arc(wcx, wcy, 3, 0, Math.PI * 2);
    ctx.fill();

    for (let r = 1; r <= 3; r++) {
      ctx.strokeStyle = wifiVal >= r ? '#000' : 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.arc(wcx, wcy, r * 10, -Math.PI * 0.75, -Math.PI * 0.25);
      ctx.stroke();
    }

    // 셀 상태
    const cellVal = parseInt(config['cell']) || 4;
    const activeBars = cellVal + 1;
    const barX = width - 268;
    const barY = 56;
    for (let i = 1; i <= 5; i++) {
      ctx.fillStyle = i <= activeBars ? '#000' : 'rgba(0,0,0,0.15)';
      const barH = i * 7;
      ctx.fillRect(barX + (i * 9), barY - barH, 5, barH);
    }

    // 배터리 아이콘
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.fillStyle = '#000000';
    
    drawRoundRect(ctx, width - 135, 27, 72, 33, 6);
    ctx.stroke();

    const batteryPercent = parseInt(config['battery']) || 83;
    const fillWidth = Math.max(2, Math.floor(62 * (batteryPercent / 100)));
    drawRoundRect(ctx, width - 130, 31, fillWidth, 25, 3);
    ctx.fill();

    ctx.fillRect(width - 63, 36, 6, 15);
    ctx.restore(); // scale 복원
  }

  /**
   * requestAnimationFrame 루프 깨우기 헬퍼
   */
  function wakeUpRenderLoop() {
    if (!animationFrameId && loopDrawCallback) {
      animationFrameId = requestAnimationFrame((t) => renderLoop(t, loopRefreshCallback, loopDrawCallback));
    }
  }

  /**
   * requestAnimationFrame 루프 핸들러
   */
  function renderLoop(timestamp, getRefreshStateCallback, drawCallback) {
    // 카카오톡 캔버스가 DOM에서 소멸했다면 즉시 루프 중단 및 해제! (v1.0.5)
    const activeCanvas = document.getElementById('chat-canvas');
    if (!activeCanvas) {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      return;
    }

    let needsRedraw = false;

    // 1. 등장 애니메이션 보간
    if (animState.active) {
      let elapsed = timestamp - animState.startTime;
      let p = elapsed / animState.duration;
      if (p >= 1.0) {
        p = 1.0;
        animState.active = false;
      }
      animState.progress = p;
      needsRedraw = true;
    }

    // 2. Easing Lerp 스크롤
    if (isScrollEasingActive) {
      const diff = targetScrollY - currentScrollY;
      if (Math.abs(diff) < 0.5) {
        currentScrollY = targetScrollY;
        isScrollEasingActive = false;
      } else {
        currentScrollY += diff * 0.15;
        needsRedraw = true;
      }
    }

    if (needsRedraw && drawCallback) {
      drawCallback();
    }

    // 오직 애니메이션이 활성화되어 있거나 스크롤 보간이 구동 중일 때만 렌더 루프 예약 진행
    if (animState.active || isScrollEasingActive) {
      animationFrameId = requestAnimationFrame((t) => renderLoop(t, getRefreshStateCallback, drawCallback));
    } else {
      animationFrameId = null; // 루프가 완전히 잠들고 대기 스레드 중단
    }
  }

  // 글로벌 Engine 네임스페이스 등록
  window.ChatEngine = {
    drawCanvasChat,
    drawRoundRect,
    drawWrappedText,
    getCachedImage,
    startRenderLoop: (getRefreshStateCallback, drawCallback) => {
      loopRefreshCallback = getRefreshStateCallback;
      loopDrawCallback = drawCallback;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame((t) => renderLoop(t, getRefreshStateCallback, drawCallback));
    },
    triggerAnimation: (effect, durationMs) => {
      animState.active = true;
      animState.progress = 0.0;
      animState.startTime = performance.now();
      animState.duration = durationMs;
      animState.effect = effect;
      wakeUpRenderLoop();
    },
    stopAnimation: () => {
      animState.active = false;
      animState.progress = 1.0;
    },
    getAnimProgress: () => animState.progress,
    isAnimActive: () => animState.active,
    // v0.1.0 피드백 대응 API 노출
    getTargetScrollY: () => targetScrollY,
    setTargetScrollY: (val) => {
      targetScrollY = val;
      isScrollEasingActive = true;
      wakeUpRenderLoop();
    },
    getMaxScrollY: () => maxScrollY
  };
})();
