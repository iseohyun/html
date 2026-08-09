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
   * 사용자 고유 동적 수식 생성 함수 (Option A)
   * M startX startY c 0 -53 ... h wOffset a 44 44 0 0 1 44 44 v hOffset a 44 44 0 0 1 -44 44 h -(wOffset+1) a 44 44 0 0 1 -44 -44
   */
  function buildUserBubblePath(startX, startY, wOffset, hOffset, arcRadius) {
    const a = (arcRadius !== undefined && !isNaN(arcRadius)) ? Math.max(0, Math.round(arcRadius)) : 32;
    const diff = 44 - a;
    const w = Math.max(10, Math.round(wOffset + 2 * diff));
    const h = Math.max(10, Math.round(hOffset + 2 * diff));
    const returnOffset = 2 + diff;
    return `M ${startX} ${startY} c 0 -53, 0 -53, 0 -52 c -2 -11, -2 -12, -7 -20 c 23 2, 21 17, 21 10 c -5 7, 5 -14, 32 -14 h ${w} a ${a} ${a} 0 0 1 ${a} ${a} v ${h} a ${a} ${a} 0 0 1 -${a} ${a} h -${w + returnOffset} a ${a} ${a} 0 0 1 -${a} -${a}`;
  }

  /**
   * 상대방 메시지 요소 em 기반 좌표 정밀 연산 함수
   * 1. 말풍선(bx): 기본 위치(150px) + "상대방" 글씨 폰트 크기(nameFontSize = Math.floor(fontSize * 0.85))의 0.8em(+26px) 이동 (176px)
   * 2. 채팅 글자(textX): 기본 위치(205px) 100% 원위치 고정 (이동 안함)
   * 3. 초상화(cx = 73px) & 닉네임(nameX = 149px): 기본 위치 100% 원위치 고정 (이동 안함)
   */
  function calculateOpponentLayout(activeFontSize, fontSize) {
    const bx = 160; // 상대방 연속 채팅 말풍선 기준 X = 160px
    const cx = 73;  // 초상화 중심 X = 73px
    const nameFontSize = Math.floor(fontSize * 0.85);
    const nameX = Math.round(180 - nameFontSize) + 1; // 149px
    const textX = bx + Math.round(activeFontSize * 0.5); // 160 + 0.5em = 184px

    return {
      bx,
      cx,
      textX,
      nameX,
      nameFontSize
    };
  }

  function drawSpeechBubbleWithTail(c, x, y, w, h, radius, isMe, hasTail, posY, arcRadius) {
    if (!hasTail) {
      drawRoundRect(c, x, y, w, h, radius);
      c.fill();
      return;
    }

    c.save();
    const basePosY = (posY !== undefined) ? posY : (y - 65);
    const startY = Math.round(basePosY + 132);
    const aVal = (arcRadius !== undefined) ? arcRadius : 32;
    const wOffset = Math.max(10, Math.round(w - 120 + aVal));
    const hOffset = Math.max(10, Math.round(h - 90));

    if (!isMe) {
      const pathD = buildUserBubblePath(159, startY, wOffset, hOffset, aVal);
      const pathObj = new Path2D(pathD);
      c.fill(pathObj);
    } else {
      const bubbleCenterX = x + w / 2;
      const startX_me = Math.round(x + 9);
      const pathD_me = buildUserBubblePath(startX_me, startY, wOffset, hOffset, aVal);

      c.save();
      c.translate(2 * bubbleCenterX, 0);
      c.scale(-1, 1);
      const pathObj = new Path2D(pathD_me);
      c.fill(pathObj);
      c.restore();
    }
    c.restore();
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

  let lastRenderedCanvas = null;
  let lastRenderedConfig = null;
  let lastRenderedDialogs = null;
  let lastRenderedAvatarMap = null;

  /**
   * HTML5 Canvas 2D 그래픽 렌더링 엔진 코어
   */
  function drawCanvasChat(canvas, ctx, config, dialogs, avatarSettingsMap) {
    if (!canvas || !ctx) return;

    lastRenderedCanvas = canvas;
    lastRenderedConfig = config;
    lastRenderedDialogs = dialogs;
    lastRenderedAvatarMap = avatarSettingsMap;

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

    // 2. 개별 색상 커스텀 연동 (v1.3.0)
    const meBubbleColor = config['me-bubble-color'] || '#fee500';
    const meTextColor = config['me-text-color'] || '#000000';
    const youBubbleColor = config['you-bubble-color'] || '#ffffff';
    const youTextColor = config['you-text-color'] || '#000000';
    const youNameColor = config['you-name-color'] || '#2c3e50';
    const timeColor = config['time-color'] || '#555555';
    const dateTextColor = config['date-text-color'] || '#444444';

    // 3. 캔버스 배경 칠하기
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = config['background-color'] || '#000000';
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
    let lastPosY = 220;
    let lastSpeaker = '';
    const tempPositions = [];

    const startIdx = parseInt(config['start-index']) || 1;
    const progressVal = parseInt(config['progress']) || 0;
    const cleanDialogs = dialogs.filter(d => d.person && d.person.trim() !== '');
    const visibleDialogs = cleanDialogs.slice(startIdx - 1, progressVal);

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
        const halfEmDate = 24;
        const datePosY = lastPosY + halfEmDate;
        tempPositions.push({
          isDate: true,
          posY: datePosY,
          width: dateWidth,
          text: displayDate
        });

        lastPosY = datePosY + 60;
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

      const baseFontSize = Math.round(fontSize * (8.47 / 5.43));
      const prevFontSize = Math.round(baseFontSize * 0.9) - 1;
      const activeFontSize = Math.round(prevFontSize * (38 / 44)); // 48px

      ctx.font = `${isBold}${activeFontSize}px ${selectedFont}`;
      let maxWidth = 0;
      lines.forEach((l) => {
        const w = ctx.measureText(l).width;
        if (w > maxWidth) maxWidth = w;
      });

      // 말풍선 크기: 채팅 최대넓이 + 1em (양쪽 0.5em 여백)
      const oneEm = Math.round(activeFontSize * 1.0);
      const halfEm = Math.round(activeFontSize * 0.5);

      const bubbleWidth = Math.round(maxWidth + oneEm);
      const bubbleHeight = Math.round(40 + lineSpacing * lineCount);

      // Y축 배치 연산 (사용자 정의 간격 순서 및 기준점 엄격 반영)
      // 1. 간격 시작: 윗채팅.bottom (lastPosY)
      // 2. 새채팅여부 확인: gap = isContinuous ? 0.5em (24px) : 1.0em (48px)
      // 3. 간격 끝: targetTop = lastPosY + gap (내 채팅.top 또는 초상화.top 중 높은 것)
      let isContinuous = (dialog.person === lastSpeaker);
      if (!isContinuous) {
        lastSpeaker = dialog.person;
      }

      const gap = isContinuous ? halfEm : oneEm;
      const targetTop = lastPosY + gap;

      const isMe = (dialog.person === (config['me'] || config['me-name'] || '나'));
      let actualPosY = targetTop;
      let nextLastPosY = targetTop + bubbleHeight + 52; // mePosY(12) + bubbleHeight + 40

      if (!isMe && !isContinuous) {
        // 상대방 새 채팅: targetTop = 초상화.top (48px 간격)
        // 말풍선 top = targetTop + 44
        // 말풍선 bottom = targetTop + 44 + bubbleHeight + 40
        nextLastPosY = targetTop + 44 + bubbleHeight + 40;
      }

      lastPosY = nextLastPosY;

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

    // 시각 생략 연산 (아래 채팅이 존재하고, 동일 화자이고, 동일 시각인 경우 현재 채팅의 시각 생략)
    tempPositions.forEach((pos, idx) => {
      if (pos.isDate) return;
      const nextItem = tempPositions[idx + 1];
      if (nextItem && !nextItem.isDate && nextItem.person === pos.person && nextItem.time === pos.time) {
        pos.showTime = false;
      } else {
        pos.showTime = true;
      }
    });

    // 5. 스크롤 목표 스크롤 Y 좌표 갱신 (현재 진행률 대화 메시지 하단 밀착)
    const viewportBottomLimit = height - 280;
    maxScrollY = Math.max(0, lastPosY - viewportBottomLimit);

    // 새 대화 파일 로드 또는 스크롤 동기화
    targetScrollY = maxScrollY;
    if (maxScrollY === 0) {
      currentScrollY = 0;
      targetScrollY = 0;
    } else if (Math.abs(currentScrollY - targetScrollY) > 500) {
      currentScrollY = targetScrollY;
    }
    isScrollEasingActive = true;

    // 6. 스크롤 뷰포트 클리핑 및 드로잉 (240px 헤더 아래만 렌더링)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 240, width, height - 240);
    ctx.clip();

    ctx.translate(0, -currentScrollY);

    if (window._shouldLogInit === undefined) {
      window._shouldLogInit = true;
    }

    let chatIdx = 0;

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
        ctx.fillStyle = dateTextColor;
        ctx.font = `bold 36px ${selectedFont}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pos.text, width / 2, pos.posY + 30);
        ctx.restore();
        return;
      }

      // 말풍선 렌더링
      const customSettings = avatarSettingsMap[dialog.person] || { color: '#DE8', text: dialog.person.charAt(0), textColor: '#ffffff' };
      const meName = config['me'] || config['me-name'] || '나';
      const isMe = (dialog.person === meName);

      // 공통 폰트 크기 및 em 단위 계산 (48px)
      const baseFontSize = Math.round(fontSize * (8.47 / 5.43));
      const prevFontSize = Math.round(baseFontSize * 0.9) - 1; // 55px
      const activeFontSize = Math.round(prevFontSize * (38 / 44)); // 48px

      const halfEm = Math.round(activeFontSize * 0.5); // 0.5em (24px)
      const oneEm = Math.round(activeFontSize * 1.0);  // 1.0em (48px)

      const userArcRadius = (config && config['bubble-round'] !== undefined) ? parseInt(config['bubble-round'], 10) : 32;
      const isBold = (config['font-bold'] === 'true' || config['font-bold'] === true) ? 'bold ' : '';

      if (isMe) {
        const meRightMargin = Math.round(oneEm * 1.0);
        const meWidth = Math.max(20, pos.width);

        const bx = width - meWidth - meRightMargin;
        const mePosY = pos.posY + 12;
        const meHeight = pos.height + 40;

        ctx.fillStyle = meBubbleColor;
        drawSpeechBubbleWithTail(ctx, bx, mePosY, meWidth, meHeight, 32, true, !pos.isContinuous, undefined, userArcRadius);

        // 규칙 2 (나 시각): 시각.right + 0.5em = 말풍선.left, 말풍선.bottom + 0.25em = 시각.bottom (1em = 시각 폰트 크기)
        const timeFontSize = Math.floor(fontSize * 0.7);
        const timeHalfEm = Math.round(timeFontSize * 0.5);
        const timeQuarterEm = Math.round(timeFontSize * 0.25);

        const timeX_me = bx - timeHalfEm;
        const timeY_me = mePosY + meHeight + timeQuarterEm;

        if (pos.showTime !== false) {
          ctx.fillStyle = timeColor;
          ctx.font = `bold ${timeFontSize}px ${selectedFont}`;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'bottom';
          ctx.fillText(pos.time, timeX_me, timeY_me);
        }

        // 세로 중앙 일치 연산
        const bubbleCenterY = mePosY + meHeight / 2;
        const textH = pos.lines.length * lineSpacing - (lineSpacing - activeFontSize);
        const textY = Math.round(bubbleCenterY - textH / 2);

        // 내 채팅: 오른쪽 정렬 (오른쪽 안쪽 여백 0.5em)
        ctx.fillStyle = meTextColor;
        ctx.font = `${isBold}${activeFontSize}px ${selectedFont}`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';

        const textX_me = bx + meWidth - halfEm;
        drawWrappedText(ctx, pos.lines, textX_me, textY, typingProgress, activeFontSize, lineSpacing);

        // 콘솔 로그 (말풍선, 채팅, 시각 바운딩 박스)
        if (window._shouldLogInit) {
          chatIdx++;
          const textW = Math.round(pos.lines.reduce((max, l) => Math.max(max, ctx.measureText(l).width), 0));
          const textH_val = textH;
          const cX1 = bx + meWidth - halfEm - textW;
          const cY1 = textY;
          const cX2 = bx + meWidth - halfEm;
          const cY2 = textY + textH_val;

          const timeFS = Math.floor(fontSize * 0.7);
          ctx.font = `bold ${timeFS}px ${selectedFont}`;
          const tW = Math.round(ctx.measureText(pos.time).width);
          const tH_val = timeFS;
          const tX1 = timeX_me - tW;
          const tY1 = timeY_me - tH_val;
          const tX2 = timeX_me;
          const tY2 = timeY_me;

          const bX1 = bx;
          const bY1 = mePosY;
          const bX2 = bx + meWidth;
          const bY2 = mePosY + meHeight;

          const msgStr = pos.lines[0] || '';
          const preview = msgStr.length > 5 ? `${msgStr.slice(0, 5)}...` : msgStr;
          const msgPrefix = `"${preview}"의 `;

          console.log(`${msgPrefix}말풍선(${bX1}, ${bY1}, ${bX2}, ${bY2}, ${meWidth}, ${meHeight}), 채팅(${cX1}, ${cY1}, ${cX2}, ${cY2}, ${textW}, ${textH_val}), 시각(${tX1}, ${tY1}, ${tX2}, ${tY2}, ${tW}, ${tH_val})`);
        }
      } else {
        // 상대방 메시지 요소 em 기반 좌표 정밀 연산
        const oppLayout = calculateOpponentLayout(activeFontSize, fontSize);
        const avatarDiameter = 116;
        const bx = oppLayout.bx; // 176px (말풍선 0.8em 우측 이동)
        const shiftUpByHeight = Math.round(119 * (7 / 99)); // ~8px

        const adjustedPosY = pos.isContinuous 
          ? (pos.posY + 12) 
          : (pos.posY - Math.round(avatarDiameter * (2 / 5)) + 119 - shiftUpByHeight);

        // 초상화 (모서리 둥근 사각형) - 오른쪽으로 "상대방" 글씨 1em(32px) 이동
        if (!pos.isContinuous) {
          const cx = oppLayout.cx; // 105px
          const cy = pos.posY - 10 + 58;
          const size = Math.round(116 * 0.9);
          const avatarRadius = 46;
          const ax = cx - size / 2;
          const ay = cy - size / 2;

          ctx.save();
          drawRoundRect(ctx, ax, ay, size, size, avatarRadius);
          ctx.clip();

          if (customSettings.image) {
            const cachedImg = getCachedImage(customSettings.image, () => {
              drawCanvasChat(canvas, ctx, config, dialogs, avatarSettingsMap);
            });
            if (cachedImg) {
              ctx.drawImage(cachedImg, ax, ay, size, size);
            } else {
              ctx.fillStyle = customSettings.color;
              ctx.fill();
            }
          } else {
            ctx.fillStyle = customSettings.color;
            ctx.fill();

            ctx.fillStyle = customSettings.textColor;
            ctx.font = `bold 46px ${selectedFont}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(customSettings.text, cx, cy);
          }
          ctx.restore();

          // 상대방 이름 라벨 - 오른쪽으로 "상대방" 글씨 1em(32px) 이동
          if (!isDirectChat) {
            const nameFontSize = oppLayout.nameFontSize;
            ctx.fillStyle = youNameColor;
            ctx.font = `${nameFontSize}px ${selectedFont}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(dialog.person, oppLayout.nameX, pos.posY + 13 - shiftUpByHeight);
          }
        }

        // 규칙 2 (상대 시각): 시각.left = 말풍선.right + 0.5em, 말풍선.bottom + 0.25em = 시각.bottom (1em = 시각 폰트 크기)
        const youHeight = pos.height + 40;
        ctx.fillStyle = youBubbleColor;
        drawSpeechBubbleWithTail(ctx, bx, adjustedPosY, pos.width, youHeight, 32, false, !pos.isContinuous, undefined, userArcRadius);

        const timeFontSize = Math.floor(fontSize * 0.7);
        const timeHalfEm = Math.round(timeFontSize * 0.5);
        const timeQuarterEm = Math.round(timeFontSize * 0.25);

        const timeX_you = bx + pos.width + timeHalfEm;
        const timeY_you = adjustedPosY + youHeight + timeQuarterEm;

        if (pos.showTime !== false) {
          ctx.fillStyle = timeColor;
          ctx.font = `bold ${timeFontSize}px ${selectedFont}`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          ctx.fillText(pos.time, timeX_you, timeY_you);
        }

        // 상대방 채팅 텍스트 em 기반 정밀 위치 선점 (textX = 181px)
        const textX = oppLayout.textX;

        const bubbleCenterY = adjustedPosY + youHeight / 2;
        const textH = pos.lines.length * lineSpacing - (lineSpacing - activeFontSize);
        const textY = Math.round(bubbleCenterY - textH / 2);

        ctx.fillStyle = youTextColor;
        ctx.font = `${isBold}${activeFontSize}px ${selectedFont}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        drawWrappedText(ctx, pos.lines, textX, textY, typingProgress, activeFontSize, lineSpacing);

        // 콘솔 로그 (말풍선, 채팅, 시각 바운딩 박스)
        if (window._shouldLogInit) {
          chatIdx++;
          const textW = Math.round(pos.lines.reduce((max, l) => Math.max(max, ctx.measureText(l).width), 0));
          const textH_val = textH;
          const cX1 = textX;
          const cY1 = textY;
          const cX2 = textX + textW;
          const cY2 = textY + textH_val;

          const timeFS = Math.floor(fontSize * 0.7);
          ctx.font = `bold ${timeFS}px ${selectedFont}`;
          const tW = Math.round(ctx.measureText(pos.time).width);
          const tH_val = timeFS;
          const tX1 = timeX_you;
          const tY1 = timeY_you - tH_val;
          const tX2 = timeX_you + tW;
          const tY2 = timeY_you;

          // 본체 알맹이 사각형 정밀 바운딩 박스 (말꼬리 팁 픽셀 제외 본체 크기)
          let bX1, bY1, bX2, bY2, bW_real, bH_real;
          const youHeight = pos.height + 40;
          const diff = 44 - userArcRadius;
          const extraW = 54 + 2 * diff;
          const extraH = 20 + 2 * diff;

          if (!pos.isContinuous) {
            bX1 = bx + 4;
            bY1 = adjustedPosY - 8;
            bX2 = bX1 + pos.width + extraW;
            bY2 = bY1 + youHeight + extraH;
          } else {
            bX1 = bx;
            bY1 = adjustedPosY;
            bX2 = bx + pos.width;
            bY2 = adjustedPosY + youHeight;
          }
          bW_real = bX2 - bX1;
          bH_real = bY2 - bY1;

          const msgStr = pos.lines[0] || '';
          const preview = msgStr.length > 5 ? `${msgStr.slice(0, 5)}...` : msgStr;
          const msgPrefix = `"${preview}"의 `;

          console.log(`${msgPrefix}말풍선(${bX1}, ${bY1}, ${bX2}, ${bY2}, ${bW_real}, ${bH_real}), 채팅(${cX1}, ${cY1}, ${cX2}, ${cY2}, ${textW}, ${textH_val}), 시각(${tX1}, ${tY1}, ${tX2}, ${tY2}, ${tW}, ${tH_val})`);
        }
      }

      ctx.restore();
    });

    if (window._shouldLogInit) {
      window._shouldLogInit = false;
    }

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

    // 와이파이 안테나 (0~4단계: 0=0%, 1=25%, 2=50%, 3=75%, 4=100%)
    const rawWifi = parseInt(config['wifi']);
    const wifiVal = (!isNaN(rawWifi) && rawWifi >= 0) ? rawWifi : 4;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4.5;
    const wcx = width - 175;
    const wcy = 58;

    ctx.fillStyle = wifiVal > 0 ? '#000' : 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.arc(wcx, wcy, 3, 0, Math.PI * 2);
    ctx.fill();

    for (let r = 1; r <= 3; r++) {
      ctx.strokeStyle = wifiVal >= (r + 1) ? '#000' : 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.arc(wcx, wcy, r * 10, -Math.PI * 0.75, -Math.PI * 0.25);
      ctx.stroke();
    }

    // 셀 상태 (0~4단계: 0=0%, 1=25%, 2=50%, 3=75%, 4=100%)
    const rawCell = parseInt(config['cell']);
    const cellVal = (!isNaN(rawCell) && rawCell >= 0) ? rawCell : 4;
    const activeBars = cellVal;
    const barX = width - 268;
    const barY = 56;
    for (let i = 1; i <= 4; i++) {
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

    // Ctrl 키 누른 채 마우스 호버 시 가로/세로 보조선 및 최하단 좌표 툴팁 출력
    if (window._isCtrlGuideActive) {
      ctx.save();
      const mX = window._guideMouseX || 0;
      const mY = window._guideMouseY || 0;

      // 빨간색 점선 가로/세로 보조선
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);

      // 세로 보조선
      ctx.beginPath();
      ctx.moveTo(mX, 0);
      ctx.lineTo(mX, height);
      ctx.stroke();

      // 가로 보조선
      ctx.beginPath();
      ctx.moveTo(0, mY);
      ctx.lineTo(width, mY);
      ctx.stroke();

      ctx.setLineDash([]);

      // 캔버스 최하단 좌표 툴팁 (복사 알림 시 초록색 하이라이트)
      const isCopied = !!window._copyNotificationText;
      const tooltipText = isCopied ? window._copyNotificationText : `X: ${mX} px  |  Y: ${mY} px`;
      const tooltipW = isCopied ? 560 : 460;
      const tooltipH = 64;
      const tooltipX = Math.round((width - tooltipW) / 2);
      const tooltipY = height - 90;
      const radius = 16;

      ctx.fillStyle = isCopied ? 'rgba(16, 185, 129, 0.95)' : 'rgba(15, 23, 42, 0.92)';
      drawRoundRect(ctx, tooltipX, tooltipY, tooltipW, tooltipH, radius);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 28px ${selectedFont}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tooltipText, width / 2, tooltipY + tooltipH / 2);

      ctx.restore();
    }

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

  function escapeXml(str) {
    if (str === undefined || str === null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * pure vector & real text SVG exporter (v1.5.0)
   * 캔버스 100% 실물 렌더링 상치 및 텍스트(<text>) / 베젤 벡터 패스(<path>) 완전 매핑
   */
  function exportTrueSVG(canvas, config, dialogs, avatarSettingsMap) {
    canvas = canvas || lastRenderedCanvas;
    config = (config && Object.keys(config).length > 0) ? config : (lastRenderedConfig || {});
    dialogs = (dialogs && dialogs.length > 0) ? dialogs : (lastRenderedDialogs || []);
    avatarSettingsMap = avatarSettingsMap || lastRenderedAvatarMap || {};

    if (!canvas) return '';

    const designW = parseInt(config['width']) || 750;
    const designH = parseInt(config['height']) || 1334;
    const realW = canvas.width || designW;
    const realH = canvas.height || designH;

    const width = designW;
    const height = designH;
    const scaleXRatio = realW / designW;
    const scaleYRatio = realH / designH;

    const selectedFont = config['font'] || 'sans-serif';
    const fontSize = parseInt(config['font-size']) || 38;
    const isBoldStr = (config['font-bold'] === 'true' || config['font-bold'] === true) ? 'font-weight="bold"' : '';
    const lineSpacing = fontSize + 22;

    const bgColor = config['bg-color'] || config['background-color'] || '#abc1d1';
    const meBubbleColor = config['me-bubble-color'] || '#fee500';
    const meTextColor = config['me-text-color'] || '#000000';
    const youBubbleColor = config['you-bubble-color'] || '#ffffff';
    const youTextColor = config['you-text-color'] || '#000000';
    const youNameColor = config['you-name-color'] || '#2c3e50';
    const timeColor = config['time-color'] || '#555555';
    const dateTextColor = config['date-text-color'] || '#444444';

    const speakers = new Set();
    dialogs.forEach(d => {
      if (d.person && !d.person.startsWith('=')) {
        speakers.add(d.person);
      }
    });
    const isDirectChat = (speakers.size === 2 && Array.from(speakers).includes(config['your-name']));

    const ctx = canvas.getContext('2d');

    let lastPosY = 220;
    let lastSpeaker = '';
    const tempPositions = [];

    const startIdx = parseInt(config['start-index']) || 1;
    const rawProgress = (config['progress'] !== undefined && config['progress'] !== null) ? parseInt(config['progress']) : 0;
    const progressVal = rawProgress > 0 ? rawProgress : (dialogs ? dialogs.length : 0);
    const cleanDialogs = dialogs.filter(d => d.person && d.person.trim() !== '');
    const visibleDialogs = cleanDialogs.slice(startIdx - 1, progressVal);

    visibleDialogs.forEach((dialog) => {
      if (!dialog.person || dialog.person.trim() === '') return;

      if (dialog.person.startsWith('=')) {
        lastSpeaker = '';
        lastPosY += 50;
        const dateVal = dialog.person.slice(1);
        let displayDate = dateVal;
        try {
          const dateObj = new Date(dateVal);
          if (!isNaN(dateObj.getTime())) {
            const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
            displayDate = dateObj.toLocaleDateString('ko-KR', options);
          }
        } catch (e) {}

        if (ctx) ctx.font = `bold 40px ${selectedFont}`;
        const dateWidth = ctx ? ctx.measureText(displayDate).width + 100 : 360;
        const halfEmDate = 24;
        const datePosY = lastPosY + halfEmDate;
        tempPositions.push({
          isDate: true,
          posY: datePosY,
          width: dateWidth,
          text: displayDate
        });
        lastPosY = datePosY + 60;
        return;
      }

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
          if (word.startsWith('\\')) word = word.slice(1);
          lineCount++;
          lines.push(line);
          line = word;
        } else {
          if (word.startsWith('\\')) word = word.slice(1);
          line += (line ? ' ' : '') + word;
        }
      });
      lines.push(line);

      const baseFontSize = Math.round(fontSize * (8.47 / 5.43));
      const prevFontSize = Math.round(baseFontSize * 0.9) - 1;
      const activeFontSize = Math.round(prevFontSize * (38 / 44)); // 48px

      if (ctx) ctx.font = `${isBoldStr ? 'bold ' : ''}${activeFontSize}px ${selectedFont}`;
      let maxWidth = 0;
      lines.forEach((l) => {
        const w = ctx ? ctx.measureText(l).width : l.length * activeFontSize * 0.6;
        if (w > maxWidth) maxWidth = w;
      });

      const oneEm = Math.round(activeFontSize * 1.0);
      const halfEm = Math.round(activeFontSize * 0.5);

      const bubbleWidth = Math.round(maxWidth + oneEm);
      const bubbleHeight = Math.round(40 + lineSpacing * lineCount);

      let isContinuous = (dialog.person === lastSpeaker);
      if (!isContinuous) {
        lastSpeaker = dialog.person;
      }

      const gap = isContinuous ? halfEm : oneEm;
      const targetTop = lastPosY + gap;

      const isMe = (dialog.person === (config['me'] || config['me-name'] || '나'));
      let actualPosY = targetTop;
      let nextLastPosY = targetTop + bubbleHeight + 52;

      if (!isMe && !isContinuous) {
        nextLastPosY = targetTop + 44 + bubbleHeight + 40;
      }

      lastPosY = nextLastPosY;

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

    // 시각 생략 연산 (아래 채팅이 존재하고, 동일 화자이고, 동일 시각인 경우 현재 채팅의 시각 생략)
    tempPositions.forEach((pos, idx) => {
      if (pos.isDate) return;
      const nextItem = tempPositions[idx + 1];
      if (nextItem && !nextItem.isDate && nextItem.person === pos.person && nextItem.time === pos.time) {
        pos.showTime = false;
      } else {
        pos.showTime = true;
      }
    });

    const svgElements = [];

    // 1. 전체 배경 렉트
    svgElements.push(`<rect width="100%" height="100%" fill="${escapeXml(bgColor)}" />`);

    // 2. 텍스트 및 벡터 레이어 (뷰포트 클리핑 및 렌더링)
    svgElements.push(`<g clip-path="url(#viewport-clip)">`);
    svgElements.push(`<g transform="translate(0, ${-currentScrollY})">`);

    visibleDialogs.forEach((dialog, index) => {
      const pos = tempPositions[index];
      if (!pos) return;

      if (pos.isDate) {
        const badgeW = pos.width;
        const badgeX = (width - badgeW) / 2;
        svgElements.push(`<rect x="${badgeX}" y="${pos.posY}" width="${badgeW}" height="60" rx="30" ry="30" fill="rgb(177,195,213)" />`);
        svgElements.push(`<text x="${width / 2}" y="${pos.posY + 30}" font-size="36" font-weight="bold" fill="${escapeXml(dateTextColor)}" text-anchor="middle" dominant-baseline="central">${escapeXml(pos.text)}</text>`);
        return;
      }

      const person = dialog.person;
      const meName = config['me'] || config['me-name'] || '나';
      const isMe = person === meName;

      const baseFontSize = Math.round(fontSize * (8.47 / 5.43));
      const prevFontSize = Math.round(baseFontSize * 0.9) - 1;
      const activeFontSize = Math.round(prevFontSize * (38 / 44)); // 48px

      const halfEm = Math.round(activeFontSize * 0.5); // 0.5em (24px)
      const oneEm = Math.round(activeFontSize * 1.0);  // 1.0em (48px)

      if (isMe) {

        const meRightMargin = Math.round(oneEm * 1.0);
        const meWidth = Math.max(20, Math.round(pos.width));

        const rx = Math.round(width - meWidth - meRightMargin);
        const mePosY = Math.round(pos.posY + 12);
        const meHeight = Math.round(pos.height + 40);

        const userArcRadius = (config && config['bubble-round'] !== undefined) ? parseInt(config['bubble-round'], 10) : 32;
        const diff = 44 - userArcRadius;
        const returnOffset = 2 + diff;

        const wOffset = Math.max(10, Math.round(meWidth - 120 + userArcRadius));
        const hOffset = Math.max(10, Math.round(meHeight - 90));
        const startY = Math.round(mePosY + 132);

        const bubbleCenterX = Math.round(rx + meWidth / 2);
        const startX_me = Math.round(rx + 9);
        const pathD = buildUserBubblePath(startX_me, startY, wOffset, hOffset, userArcRadius);

        if (!pos.isContinuous) {
          svgElements.push(`<g transform="translate(${2 * bubbleCenterX}, 0) scale(-1, 1)">
            <path d="${pathD}" fill="${escapeXml(meBubbleColor)}" />
          </g>`);
        } else {
          svgElements.push(`<rect x="${rx}" y="${mePosY}" width="${meWidth}" height="${meHeight}" rx="${userArcRadius}" ry="${userArcRadius}" fill="${escapeXml(meBubbleColor)}" />`);
        }

        if (pos.showTime !== false) {
          const timeFontSize = Math.floor(fontSize * 0.7);
          const timeHalfEm = Math.round(timeFontSize * 0.5);
          const timeQuarterEm = Math.round(timeFontSize * 0.25);

          const timeX_me = Math.round(rx - timeHalfEm);
          const timeY_me = Math.round(mePosY + meHeight + timeQuarterEm);
          svgElements.push(`<text x="${timeX_me}" y="${timeY_me}" font-size="${timeFontSize}" font-weight="bold" fill="${escapeXml(timeColor)}" text-anchor="end" dominant-baseline="alphabetic">${escapeXml(pos.time)}</text>`);
        }

        const textX = Math.round(rx + meWidth - halfEm);
        const bubbleCenterY = Math.round(mePosY + meHeight / 2);
        const textH = pos.lines.length * lineSpacing - (lineSpacing - activeFontSize);
        const textY = Math.round(bubbleCenterY - textH / 2);

        if (pos.lines.length === 1) {
          svgElements.push(`<text x="${textX}" y="${textY}" font-size="${activeFontSize}" ${isBoldStr} fill="${escapeXml(meTextColor)}" text-anchor="end" dominant-baseline="hanging">${escapeXml(pos.lines[0])}</text>`);
        } else {
          const textSpans = pos.lines.map((l, i) => `<tspan x="${textX}" dy="${i === 0 ? 0 : lineSpacing}">${escapeXml(l)}</tspan>`).join('');
          svgElements.push(`<text x="${textX}" y="${textY}" font-size="${activeFontSize}" ${isBoldStr} fill="${escapeXml(meTextColor)}" dominant-baseline="hanging">${textSpans}</text>`);
        }

      } else {
        const customSettings = (avatarSettingsMap && avatarSettingsMap[person]) || {
          color: '#DE8',
          text: person.charAt(0),
          textColor: '#ffffff',
          image: ''
        };

        const userArcRadius = (config && config['bubble-round'] !== undefined) ? parseInt(config['bubble-round'], 10) : 32;

        const bx = 160; // 상대방 말풍선 기준 X = 160px
        const shiftUpByHeight = Math.round(119 * (7 / 99));
        const adjustedPosY = pos.isContinuous
          ? Math.round(pos.posY + 12)
          : Math.round(pos.posY - Math.round(avatarDiameter * (2 / 5)) + 119 - shiftUpByHeight);

        const startX = 159;
        const startY = Math.round(pos.posY + 132);
        const wOffset = Math.max(10, Math.round(pos.width - 120 + userArcRadius));
        const hOffset = Math.max(10, Math.round(pos.height - 90));
        const pathD = buildUserBubblePath(startX, startY, wOffset, hOffset, userArcRadius);

        if (!pos.isContinuous) {
          svgElements.push(`<path d="${pathD}" fill="${escapeXml(youBubbleColor)}" />`);

          const cx = 73;
          const cy = pos.posY - 10 + 58;
          const size = Math.round(116 * 0.9);
          const ax = Math.round(cx - size / 2);
          const ay = Math.round(cy - size / 2);

          if (customSettings.image) {
            svgElements.push(`<clipPath id="avatar-clip-${index}">
              <rect x="${ax}" y="${ay}" width="${size}" height="${size}" rx="46" ry="46" />
            </clipPath>`);
            svgElements.push(`<image x="${ax}" y="${ay}" width="${size}" height="${size}" href="${escapeXml(customSettings.image)}" clip-path="url(#avatar-clip-${index})" />`);
          } else {
            svgElements.push(`<rect x="${ax}" y="${ay}" width="${size}" height="${size}" rx="46" ry="46" fill="${escapeXml(customSettings.color)}" />`);
            svgElements.push(`<text x="${cx}" y="${cy}" font-size="46" font-weight="bold" fill="${escapeXml(customSettings.textColor)}" text-anchor="middle" dominant-baseline="central">${escapeXml(customSettings.text)}</text>`);
          }

          if (!isDirectChat) {
            const nameFontSize = Math.floor(fontSize * 0.85);
            const nameX = Math.round((180 - nameFontSize) + 1);
            svgElements.push(`<text x="${nameX}" y="${Math.round(pos.posY + 5)}" font-size="${nameFontSize}" fill="${escapeXml(youNameColor)}" dominant-baseline="hanging">${escapeXml(dialog.person)}</text>`);
          }
        } else {
          const youHeight = Math.round(pos.height + 40);
          svgElements.push(`<rect x="${bx}" y="${adjustedPosY}" width="${Math.round(pos.width)}" height="${youHeight}" rx="${userArcRadius}" ry="${userArcRadius}" fill="${escapeXml(youBubbleColor)}" />`);
        }

        if (pos.showTime !== false) {
          const timeFontSize = Math.floor(fontSize * 0.7);
          const timeHalfEm = Math.round(timeFontSize * 0.5);
          const timeQuarterEm = Math.round(timeFontSize * 0.25);

          const timeX_you = Math.round(bx + pos.width + timeHalfEm);
          const timeY_you = Math.round(adjustedPosY + pos.height + 40 + timeQuarterEm);
          svgElements.push(`<text x="${timeX_you}" y="${timeY_you}" font-size="${timeFontSize}" font-weight="bold" fill="${escapeXml(timeColor)}" text-anchor="start" dominant-baseline="alphabetic">${escapeXml(pos.time)}</text>`);
        }

        const textX = Math.round(160 + activeFontSize * 0.5); // 160 + 0.5em = 184px

        const bubbleCenterY = Math.round(adjustedPosY + (pos.height + 40) / 2);
        const textH = pos.lines.length * lineSpacing - (lineSpacing - activeFontSize);
        const textY = Math.round(bubbleCenterY - textH / 2);

        if (pos.lines.length === 1) {
          svgElements.push(`<text x="${textX}" y="${textY}" font-size="${activeFontSize}" ${isBoldStr} fill="${escapeXml(youTextColor)}" dominant-baseline="hanging">${escapeXml(pos.lines[0])}</text>`);
        } else {
          const textSpans = pos.lines.map((l, i) => `<tspan x="${textX}" dy="${i === 0 ? 0 : lineSpacing}">${escapeXml(l)}</tspan>`).join('');
          svgElements.push(`<text x="${textX}" y="${textY}" font-size="${activeFontSize}" ${isBoldStr} fill="${escapeXml(youTextColor)}" dominant-baseline="hanging">${textSpans}</text>`);
        }
      }
    });

    svgElements.push(`</g>`);
    svgElements.push(`</g>`);

    // 3. 상단 헤더 영역
    svgElements.push(`<g id="header-bar">
      <rect width="${width}" height="240" fill="${escapeXml(bgColor)}" />
      <rect y="236" width="${width}" height="4" fill="rgba(0,0,0,0.06)" />
      <text x="60" y="52" font-size="36" font-weight="bold" fill="#000000" dominant-baseline="central">${escapeXml(config['capture-time'] || '오후 12:00')}</text>
      <text x="60" y="160" font-size="54" font-weight="bold" fill="#000000" dominant-baseline="central">${escapeXml(config['your-name'] || '카카오톡 대화')}</text>
      <circle cx="${width - 210}" cy="160" r="18" fill="none" stroke="#000000" stroke-width="5" />
      <line x1="${width - 197}" y1="173" x2="${width - 178}" y2="192" stroke="#000000" stroke-width="5" />
      <line x1="${width - 115}" y1="142" x2="${width - 55}" y2="142" stroke="#000000" stroke-width="5" />
      <line x1="${width - 115}" y1="168" x2="${width - 55}" y2="168" stroke="#000000" stroke-width="5" />
      <line x1="${width - 115}" y1="194" x2="${width - 55}" y2="194" stroke="#000000" stroke-width="5" />
    </g>`);

    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${realW}" height="${realH}" viewBox="0 0 ${realW} ${realH}">
<defs>
  <clipPath id="viewport-clip">
    <rect y="240" width="${width}" height="${height - 240}" />
  </clipPath>
</defs>
<style>
  text { font-family: ${escapeXml(selectedFont)}; }
</style>
<g transform="scale(${scaleXRatio}, ${scaleYRatio})">
${svgElements.join('\n')}
</g>
</svg>`;
  }

  // 글로벌 Engine 네임스페이스 등록
  window.ChatEngine = {
    drawCanvasChat,
    drawRoundRect,
    drawWrappedText,
    getCachedImage,
    exportTrueSVG,
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
