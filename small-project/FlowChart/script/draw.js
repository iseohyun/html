const margin = 30;
const blockWidth = 100;
const blockHeight = 50;
const paddingLeft = 30;
const paddingTop = 10;

// 차트 전체를 그리는 함수
function drawChart() {
  const canvas = document.getElementById('flowchartCanvas');
  const ctx = canvas.getContext('2d');

  // 코드를 가져온다.
  let code = document.getElementById('code-input').value;

  // 코드를 표준 형식으로 재작성 한다.
  code = formatC(code);

  // 코드를 노드로 재구성한다.
  const nodes = code2nodeC(code)

  console.log(nodes);
  // 0번 노드(시작)부터 next를 검색하며 각 노드의 포지션을 구한다.
  const MaxId = Math.max(...nodes) + 1;
  getPos(0, 0, 1, 0, nodes.MaxId);
  console.log(nodes);

  // 최대 y값을 근거로 최대 height를 계산
  const maxY = Math.max(...nodes.map(node => node.y));
  const maxX = Math.max(...nodes.map(node => node.x));
  const maxHeight = (maxY + 1) * (blockHeight + margin) + paddingTop;
  const maxWidth = (maxX + 1) * (blockWidth + margin) + paddingLeft;
  canvas.height = Math.max(maxHeight, 800);
  canvas.width = Math.max(maxWidth, 600);

  // 도화지 청소
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // start node를 만듭니다.(0, 0)
  const node = { id: -1, type: "start", content: "start", x: 0, y: 0, next: 0 };
  nodes.push(node);
  // nodes의 x, y좌표를 기반으로 박스를 그립니다.
  nodes.forEach(node => drawNode(node));
  nodes.forEach(node => drawArrow(node));

  // 노드의 위치를 구합니다. x, y 개념좌표(실질좌표X)입니다.
  function getPos(id, x, y, next, loop) {
    const node = nodes.find(n => n.id === id);
    // 최초 진입이 아니고, 갱신 가능성이 없을 때
    if (node.x === x && node.y === y)
      return [node.width, node.height];
    if (node.type === 'loop')
      loop = node.id;

    const dx = x - node.x;
    const dy = y - node.y;
    node.x = x;
    node.y = y;

    if (node.yes !== undefined) {
      let widthYes = widthNo = heightYes = heightNo = 1;
      [widthYes, heightYes] = getPos(node.yes, x + 1, y, node.next, loop);
      if (node.no !== undefined) {
        [widthNo, heightNo] = getPos(node.no, x, y + 1, node.next, loop);
        [widthYes, heightYes] = getPos(node.yes, x + widthNo, y, node.next, loop);
        node.width = widthYes + widthNo;
        node.height = Math.max(heightYes, heightNo + 1);
      } else {
        node.width = widthYes + 1;
        node.height = heightYes;
      }
      // 이 블럭 안에 추가 블럭이 있다면 수행
      if (node.next !== next) {
        [width, height] = getPos(node.next, x, y + node.height, next, loop);
        if (width > 1 && node.no !== undefined) {
          [widthYes, heightYes] = getPos(node.yes, x + width, y, node.next, loop);
        }
        node.width = Math.max(node.width, width + 1, widthYes + width);
        node.height += height;
        // TODO: yes블럭 한번 더 실행
      }
    } else if (node.type == 'end' || node.next == next) {
      // 평문인데 유효한 next node가 부모의 next와 같다면, 마지막 평문으로 간주
      node.width = 1;
      node.height = 1;
    } else {
      // 평문인 경우
      const nextNode = nodes.find(n => n.id === node.next);
      const loopNode = nodes.find(n => n.id === loop);
      // 다음 노드가 있고, 
      // 최초 진입이거나, 내가 갱신된 만큼 갱신되어야 할 때(전체적으로 뒤로 미뤄야 할 때)
      // break나 continue가 아닐 때,
      if (nextNode !== undefined &&
        (nextNode.x === undefined || (dx === x - nextNode.x && dy === y + 1 - nextNode.y)) &&
        (loopNode === undefined || (node.next !== loop && node.next !== loopNode.next))) {
        [width, height] = getPos(node.next, x, y + 1, next, loop);
        node.width = Math.max(1, width);
        node.height = height + 1;
      } else {
        node.width = 1;
        node.height = 1;
      }
    }
    return [node.width, node.height];
  }

  // 노드는 사각형에 중앙에 content를 출력합니다.
  // 제일 먼저 0번 노드를 그립니다.
  // yes와 no가 있다면 margin 거리에 해당 노드를 그리고 화살표로 연결해야 합니다.
  function drawNode(node) {
    const width = blockWidth;
    const height = blockHeight;
    const x = node.x * (width + margin) + paddingLeft;
    const y = node.y * (height + margin) + paddingTop;
    if (node.type == 'if' || node.type == 'loop') {
      ctx.beginPath();
      ctx.moveTo(x + width / 2, y);
      ctx.lineTo(x + width, y + height / 2);
      ctx.lineTo(x + width / 2, y + height);
      ctx.lineTo(x, y + height / 2);
      ctx.closePath();
      ctx.stroke();
    } else if (node.type == 'start' || node.type == 'end') {
      ctx.beginPath();
      ctx.moveTo(x + height / 2, y);
      ctx.lineTo(x + width - height / 2, y);
      ctx.arc(x + width - height / 2, y + height / 2, height / 2, Math.PI / 2 * 3, Math.PI / 2, false);
      ctx.lineTo(x + height / 2, y + height);
      ctx.arc(x + height / 2, y + height / 2, height / 2, Math.PI / 2, Math.PI / 2 * 3, false);
      ctx.closePath();
      ctx.stroke();
    } else {
      ctx.strokeRect(x, y, width, height);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '20px Arial';
    ctx.fillText(node.content, x + width / 2, y + height / 2);
  }

  function drawArrow(node) {
    ctx.beginPath();
    if (node.type == 'if' || node.type == 'loop') {
      const yesNode = nodes.find(n => n.id === node.yes)
      drawSingleArrow(node.x, node.y, yesNode.x, yesNode.y, 'Yes');
      const noNode = nodes.find(n => n.id === node.no)
      if (noNode !== undefined) {
        drawSingleArrow(node.x, node.y, noNode.x, noNode.y, 'No');
      } else {
        const nextNode = nodes.find(n => n.id === node.next)
        drawSingleArrow(node.x, node.y, nextNode.x, nextNode.y, '');
      }
    } else if (node.type != 'end') {
      const nextNode = nodes.find(n => n.id === node.next)
      drawSingleArrow(node.x, node.y, nextNode.x, nextNode.y, '');
    }
    ctx.stroke();
  }

  function drawSingleArrow(x1, y1, x2, y2, text) {
    const fontSize = 15;
    ctx.font = `${fontSize}px Arial`;
    if (x1 === x2) {
      const sx = x1 * (blockWidth + margin) + blockWidth / 2 + paddingLeft;
      const sy = y1 * (blockHeight + margin) + blockHeight + paddingTop;
      const ex = x2 * (blockWidth + margin) + blockWidth / 2 + paddingLeft;
      const ey = y2 * (blockHeight + margin) - 2 + paddingTop;
      ctx.fillText(text, sx + margin / 2, sy + fontSize / 2);
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.lineTo(ex - 4, ey - 9);
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + 4, ey - 9);
    } else if (y1 === y2) {
      if (x1 < x2) {
        const sx = x1 * (blockWidth + margin) + blockWidth + paddingLeft;
        const sy = y1 * (blockHeight + margin) + blockHeight / 2 + paddingTop;
        const ex = x2 * (blockWidth + margin) - 2 + paddingLeft;
        const ey = y2 * (blockHeight + margin) + blockHeight / 2 + paddingTop;
        ctx.fillText(text, sx + fontSize / 2, sy - fontSize / 2);
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.lineTo(ex - 9, ey - 4);
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - 9, ey + 4);
      } else {
        const sx = x1 * (blockWidth + margin) + blockWidth / 2 + paddingLeft;
        const sy = y1 * (blockHeight + margin) + blockHeight + paddingTop;
        const ex = x2 * (blockWidth + margin) - 2 + paddingLeft;
        const ey = y2 * (blockHeight + margin) + blockHeight / 2 + paddingTop;
        ctx.fillText(text, sx - fontSize, sy - fontSize / 2);
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx, sy + margin / 4);
        ctx.arc(sx - margin / 4, sy + margin / 4, margin / 4, 0, Math.PI / 2, false);
        ctx.lineTo(ex - margin / 4, sy + margin / 2);
        ctx.arc(ex - margin / 4, sy + margin / 4, margin / 4, Math.PI / 2, Math.PI, false);
        ctx.lineTo(ex - margin / 2, ey + margin * 3 / 4);
        ctx.arc(ex - margin / 4, ey + margin / 4, margin / 4, Math.PI, Math.PI * 3 / 2, false);
        ctx.lineTo(ex, ey);
        ctx.lineTo(ex - 9, ey - 4);
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - 9, ey + 4);
      }
    } else if (y2 < y1) {
      // 왼쪽(x1 - 1, y1)에 피해가야 할 노드가 있는지
      let x = x1 - 1;
      for (; x >= 0; x--) {
        const leftNode = nodes.find(n => n.x === x && n.y === y1);
        if (leftNode !== undefined) break;
      }
      if (x < 0) {
        //바로 가도됨
        const sx = x1 * (blockWidth + margin) + paddingLeft;
        const sy = y1 * (blockHeight + margin) + blockHeight / 2 + paddingTop;
        const ex = x2 * (blockWidth + margin) - 2 + paddingLeft;
        const ey = y2 * (blockHeight + margin) + blockHeight / 2 + paddingTop;
        ctx.fillText('loop', sx - fontSize, sy - fontSize / 2);
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex - margin / 4, sy);
        ctx.arc(ex - margin / 4, sy - margin / 4, margin / 4, Math.PI / 2, Math.PI, false);
        ctx.lineTo(ex - margin / 2, ey + margin * 3 / 4);
        ctx.arc(ex - margin / 4, ey + margin / 4, margin / 4, Math.PI, Math.PI * 3 / 2, false);
        ctx.lineTo(ex, ey);
        ctx.lineTo(ex - 9, ey - 4);
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - 9, ey + 4);
      } else {
        const sx = x1 * (blockWidth + margin) + blockWidth / 2 + paddingLeft;
        const sy = y1 * (blockHeight + margin) + blockHeight + paddingTop;
        const ex = x2 * (blockWidth + margin) - 2 + paddingLeft;
        const ey = y2 * (blockHeight + margin) + blockHeight / 2 + paddingTop;
        ctx.fillText('loop', sx - fontSize * 3 / 2, sy + fontSize / 2);
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx, sy + margin / 4);
        ctx.arc(sx - margin / 4, sy + margin / 4, margin / 4, 0, Math.PI / 2, false);
        ctx.lineTo(ex - margin / 4, sy + margin / 2);
        ctx.arc(ex - margin / 4, sy + margin / 4, margin / 4, Math.PI / 2, Math.PI, false);
        ctx.lineTo(ex - margin / 2, ey + margin * 3 / 4);
        ctx.arc(ex - margin / 4, ey + margin / 4, margin / 4, Math.PI, Math.PI * 3 / 2, false);
        ctx.lineTo(ex, ey);
        ctx.lineTo(ex - 9, ey - 4);
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - 9, ey + 4);
      }
    } else {
      // 아랫쪽에 박스가 있는지 검색
      let y = y1 + 1;
      for (; y < y2; y++) {
        const bottomNode = nodes.find(n => n.x === x1 && n.y === y);
        if (bottomNode !== undefined) break;
      }
      if (y >= y2) {
        // 아래로 연결
        const sx = x1 * (blockWidth + margin) + blockWidth / 2 + paddingLeft;
        const sy = y1 * (blockHeight + margin) + blockHeight + paddingTop;
        const ex = x2 * (blockWidth + margin) + blockWidth / 2 + paddingLeft;
        const ey = y2 * (blockHeight + margin) - 2 + paddingTop;
        ctx.fillText(text, sx + fontSize / 2, sy - fontSize / 2);
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx, ey - margin * 3 / 4);
        ctx.arc(sx - margin / 4, ey - margin * 3 / 4, margin / 4, 0, Math.PI / 2, false);
        ctx.lineTo(ex + margin / 4, ey - margin / 2);
        ctx.arc(ex + margin / 4, ey - margin / 4, margin / 4, Math.PI * 3 / 2, Math.PI, true);
      } else {
        // 오른쪽으로 우회 연결
        const sx = x1 * (blockWidth + margin) + blockWidth + paddingLeft;
        const sy = y1 * (blockHeight + margin) + blockHeight / 2 + paddingTop;
        const ex = x2 * (blockWidth + margin) + blockWidth / 2 + paddingLeft;
        const ey = y2 * (blockHeight + margin) - 2 + paddingTop;
        ctx.fillText(text, sx + fontSize / 2, sy - fontSize / 2);
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + margin / 4, sy);
        ctx.arc(sx + margin / 4, sy + margin / 4, margin / 4, -Math.PI / 2, 0, false);
        ctx.lineTo(sx + margin / 2, ey - margin * 3 / 4);
        ctx.arc(sx + margin / 4, ey - margin * 3 / 4, margin / 4, 0, Math.PI / 2, false);
        ctx.lineTo(ex + margin / 4, ey - margin / 2);
        ctx.arc(ex + margin / 4, ey - margin / 4, margin / 4, Math.PI * 3 / 2, Math.PI, true);
      }
    }
  }
}

// 코드를 표준 형식으로 재작성 한 뒤 출력한다.
function codeFormat(target) {
  const code = target.value;
  target.value = formatC(code);
}

function downloadChart() {
  const canvas = document.getElementById('flowchartCanvas');
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = 'flowchart.png';
  link.click();
}