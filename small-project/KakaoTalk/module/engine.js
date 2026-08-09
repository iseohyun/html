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
   * 사용자 제출 obj_6 SVG path d 문자열 100% 원본 스케일 연동 드로잉 엔진
   * (답지 "이모네?" 정재현 실물 트레이싱 패스 100% 직대입 매핑)
   */
  const OBJ6_PATH_D = "M 256.2538133007931 338.071995118975 C 256.2538133007931 241, 256.2538133007931 241, 256.2538133007931 244.35631482611348 C 253.52841924925244 224.0101416463445, 253.0133874016181 222.72256191482776, 243.70509244901552 207.22531501062713 C 285.06215387674257 211.75759524342533, 281.34013902150554 237.14345490781494, 281.0826230976883 225.55523732416452 C 272.47833790300933 237.25266224409103, 290.0559335493788 199.75379122141405, 339.27320135921315 199.75379122141405 C 435.36405755936613 200.9256309408727, 559.2962702028068 197.34722590976656, 606.4526551840287 199.75379122141405 C 660.357281832895 200.9256309408727, 694.3406334158758 256.00209775542953, 689.6532745768441 275.92337298622664 C 688.481434867086 306.39120569215163, 688.768838705766 310.3788333329849, 687.3095951573281 341.5463972759114 C 690.8251142866019 389.59182577371615, 645.1233656060414 418.8878187601826, 618.1710522816082 418.8878187601826 C 567.5167507426772 420.67028057624645, 392.14649922544146 420.67028057624645, 330.39785336155245 418.6402136365109 C 306.4616894859903 420.0596584796412, 257.2444216761558 384.90446689588157, 257.42525930445396 349.78645515558264";

  function drawSpeechBubbleWithTail(c, x, y, w, h, radius, isMe, hasTail) {
    if (!hasTail) {
      drawRoundRect(c, x, y, w, h, radius);
      c.fill();
      return;
    }

    c.save();
    if (!isMe) {
      // obj_6 바운딩박스: X(243.70~689.65, W=445.95), Y(197.35~420.67, H=223.32)
      // "이모네?" 말풍선의 타겟 영역 (x-28, y, w+28, h) 스케일 변환
      const targetX = x - 28;
      const targetY = y;
      const targetW = w + 28;
      const targetH = h;

      const scaleX = targetW / 445.95;
      const scaleY = targetH / 223.32;

      c.translate(targetX, targetY);
      c.scale(scaleX, scaleY);
      c.translate(-243.70, -197.35);

      const pathObj = new Path2D(OBJ6_PATH_D);
      c.fill(pathObj);
    } else {
      const rx = x + w;
      const targetX = rx + 28;
      const targetY = y;
      const targetW = w + 28;
      const targetH = h;

      const scaleX = targetW / 445.95;
      const scaleY = targetH / 223.32;

      c.translate(targetX, targetY);
      c.scale(-scaleX, scaleY);
      c.translate(-243.70, -197.35);

      const pathObj = new Path2D(OBJ6_PATH_D);
      c.fill(pathObj);
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
    let lastPosY = 310;
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

    // 5. 스크롤 목표 스크롤 Y 좌표 갱신 (현재 진행률 대화 메시지 하단 밀착)
    const viewportBottomLimit = height - 280;
    maxScrollY = Math.max(0, lastPosY - viewportBottomLimit);

    // 새 대화 파일 로드 또는 스크롤 동기화: targetScrollY 및 currentScrollY를 최신 대화 위치로 100% 동기화!
    targetScrollY = maxScrollY;
    if (Math.abs(currentScrollY - targetScrollY) > 500) {
      currentScrollY = targetScrollY;
    }
    isScrollEasingActive = true;

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
      const isMe = (dialog.person === config['me']);

      if (isMe) {
        // 내 말풍선 그리기 (통합 S자 베지어 꼬리 일체형 패스)
        const bx = width - pos.width - 80;
        ctx.fillStyle = meBubbleColor;
        drawSpeechBubbleWithTail(ctx, bx, pos.posY, pos.width, pos.height + 40, 32, true, !pos.isContinuous);

        // 대화 시간 표시
        ctx.fillStyle = timeColor;
        ctx.font = `bold ${Math.floor(fontSize * 0.7)}px ${selectedFont}`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(pos.time, bx - 15, pos.posY + pos.height + 40);

        // 내 말풍선 텍스트 (커스텀 색상 연동)
        ctx.fillStyle = meTextColor;
        ctx.font = `${isBold}${fontSize}px ${selectedFont}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        drawWrappedText(ctx, pos.lines, bx + 22, pos.posY + 20, typingProgress, fontSize, lineSpacing);
      } else {
        // "이모네?" 텍스트 만났을 때: 오직 높이 스케일링만 조작하여 obj_6 원본 좌표 그대로 직대입 드로잉
        const dialogStr = (dialog.message || dialog.text || (pos.lines ? pos.lines.join('') : ''));
        if (dialogStr.includes('이모네')) {
          const bx = 180;
          ctx.save();
          const targetH = 140; // 높이 기준 스케일링
          const scale = targetH / 223.323;

          ctx.fillStyle = youBubbleColor;
          ctx.translate(bx - 12.55 * scale, pos.posY);
          ctx.scale(scale, scale);
          ctx.translate(-243.705, -197.347);

          const pathObj = new Path2D(OBJ6_PATH_D);
          ctx.fill(pathObj);
          ctx.restore();

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
              ctx.font = `bold 44px ${selectedFont}`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(customSettings.text, cx, cy);
            }

            // 상대방 이름
            ctx.fillStyle = youNameColor;
            ctx.font = `bold ${Math.floor(fontSize * 0.85)}px ${selectedFont}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.fillText(dialog.person, bx, pos.posY - 15);
          }

          // 대화 시간 표시
          ctx.fillStyle = timeColor;
          ctx.font = `bold ${Math.floor(fontSize * 0.7)}px ${selectedFont}`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          ctx.fillText(pos.time, bx + 445.95 * scale + 15, pos.posY + targetH);

          // "이모네?" 텍스트
          ctx.fillStyle = youTextColor;
          ctx.font = `${isBold}${fontSize * scale * 1.5}px ${selectedFont}`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          drawWrappedText(ctx, pos.lines, bx + 60 * scale, pos.posY + 35 * scale, typingProgress, fontSize * scale * 1.5, lineSpacing);
          ctx.restore();
          return;
        }

        // 일반 상대방 말풍선 그리기 (답지 obj_6 100% 일치 S자 3차 베지어 통합 패스)
        const bx = 180;

        ctx.fillStyle = youBubbleColor;
        drawSpeechBubbleWithTail(ctx, bx, pos.posY, pos.width, pos.height + 40, 32, false, !pos.isContinuous);

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

          // 상대방 이름 라벨 출력 (커스텀 닉네임 색상 연동)
          if (!isDirectChat) {
            ctx.fillStyle = youNameColor;
            ctx.font = `bold ${Math.floor(fontSize * 0.85)}px ${selectedFont}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.fillText(dialog.person, bx, pos.posY - 12);
          }
        }

        // 대화 시간 표시
        ctx.fillStyle = timeColor;
        ctx.font = `bold ${Math.floor(fontSize * 0.7)}px ${selectedFont}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(pos.time, bx + pos.width + 15, pos.posY + pos.height + 40);

        // 상대방 말풍선 텍스트 (커스텀 글씨 색상 연동)
        ctx.fillStyle = youTextColor;
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
