// C코드 입력을 표준format으로 정렬한다.
function formatC(code) {
  // 라인별로 앞뒤의 공백을 제거
  code = code.split('\n').map(line => line.trim()).filter(line => line !== '').join('\n');
  // 두 개 이상의 연속된 공백을 1개의 공백으로
  while (code.includes('  '))
    code = code.replace('  ', ' ');
  // 괄호가 없는 if문(한줄짜리 블럭)은 괄호 추가
  code = code.replace(/if\s*\(([^)]+)\)[\s\n]*([^{;\n]+;)/g, 'if ($1) { $2 }');
  code = code.replace(/while\s*\(([^)]+)\)[\s\n]*([^{;\n]+;)/g, 'while ($1) { $2 }');
  code = code.replace(/else\s*[\s\n]*([^{;\n]+;)/g, 'else { $1 }');
  // 세미콜론(;)과 괄호({})뒤에 항상 새 줄
  code = code.replace(/;/g, ';\n');
  code = code.replace(/\{([^\/\n]*\n)/g, '{\n$1');
  // code = code.replace(/\{/g, '{\n');
  code = code.replace(/}/g, '}\n');
  code = code.replace(/\}\s*\n\s*else/g, '} else');
  code = code.replace(/\s*\n\s*{/g, ' {');
  // 새줄에 시작된 괄호 열기({)는 이전 줄의 가장 마지막에 추가
  code = code.replace(/\n\s+{/g, '{');
  while (code.includes('\n\n'))
    code = code.replace('\n\n', '\n');

  // for문의 경우 (초기화;\n조건문;\n증감문)사이의 \n을 제거
  code = code.replace(/for\s*\(([^;]*);\s*\n\s*([^;]+);\s*\n\s*([^)]*)\)/g, 'for ($1; $2; $3)');
  // for문의 subblock에 {}이 없는 경우 {[^;];}추가
  code = code.replace(/for\s*\(([^;]*);([^;]+);([^)]*)\)[\s\n]*([^{;\n]+;)/g, 'for ($1; $2; $3) {\n$4\n}');

  // Indent code blocks
  let indentLevel = 0;
  return code.split('\n').map(line => {
    line = line.replace(/^\s/g, '');
    if (line.includes('}')) indentLevel--;
    const indentedLine = '  '.repeat(indentLevel) + line;
    if (line.includes('{')) indentLevel++;
    return indentedLine;
  }).join('\n').trim();
}

function code2nodeC(code) {
  const lines = code.split('\n');
  const nodes = getNodeC(lines, 0, lines.length);
  const node = {};

  // break, continue next 갱신
  // nodes.forEach(n => {
  //   if (n.content === 'break') {
  //     // Next: 중감문, Next(2): 판단문, Next(3): loop-out
  //     nodes.forEach(s => {
  //       if (s.id === n.next) n.next = s.next;
  //       if (s.type !== 'if')
  //         nodes.forEach(s => { if (s.id === n.next) n.next = s.next; });
  //     });
  //   } else if (n.content === 'continue')
  //     // Next: 중감문, Next(2): 판단문
  //     nodes.forEach(s => {
  //       if (s.type !== 'if')
  //         if (s.id === n.next) n.next = s.next;
  //     });
  // });


  // end-block삽입
  node.id = lines.length;
  node.type = "end";
  node.content = "end";
  nodes.push(node);

  // next가 end-block보다 큰 경우 next를 end-block로 변경
  // nodes.forEach(n => {
  //   if (n.next >= node.id) n.next = node.id;
  //   if (n.yes >= node.id) n.yes = node.id;
  //   if (n.no >= node.id) n.no = node.id;
  // });

  return nodes;
}

let MaxId = 1;
let loopId = [];
let breakId = [];
// C코드(formatted)로 입력이 들어오면 node정보로 바꿔서 출력
function getNodeC(lines, offset, next) {
  MaxId = Math.max(lines.length + 2, MaxId);
  const nodes = [];
  for (let i = 0; i < lines.length; i++) {
    const node = {};

    // 주석으로 시작하는 라인이 있다면 제일 첫 줄을 header로 저장하고, 코드가 나올 때까지 skip
    if (lines[i].startsWith('//')) {
      if (node.id == undefined) {
        node.id = i + offset;
        node.header = line.slice(2);
      }
      continue;
    }

    // 코드가 등장하면 가장 첫 줄이 code의 id가 됨
    if (node.id == undefined)
      node.id = i + offset;

    const line = lines[i].trim();

    // 분류 시작
    if (line.startsWith('if')) {
      node.type = 'if';
      node.content = line.match(/\(([^)]+)\)/)[1];

      // sub-block 검색
      let j;
      let openBraces = 1;
      let trueBlock;
      for (j = i + 1; j < lines.length; j++) {
        if (lines[j].includes('}')) openBraces--;
        if (openBraces === 0) {
          // sub-block 재귀
          node.yes = i + 1 + offset;
          node.next = j + 1 + offset;
          if (node.next == lines.length + offset)
            node.next = next
          trueBlock = lines.slice(i + 1, j);
          i = j;
          break;
        }
        if (lines[j].includes('{')) openBraces++;
      }

      // else block 검색
      if (lines[j].includes('else')) {
        node.no = j + offset + 1;
        let openBraces = 1;
        for (j++; j < lines.length; j++) {
          if (lines[j].includes('}')) openBraces--;
          if (openBraces === 0) {
            node.next = j + offset + 1;
            if (node.next == lines.length + offset)
              node.next = next
            falseBlock = lines.slice(node.no - offset, j);
            const subnodes = getNodeC(falseBlock, node.no, node.next);
            subnodes.forEach(node => nodes.push(node));
            i = j;
            break;
          }
          if (lines[j].includes('{')) openBraces++;
        }
      }

      // ture block을 처리한다. else블럭의 유무를 알기 전까지 next의 위치를 모르므로..
      const subnodes = getNodeC(trueBlock, node.yes, node.next);
      subnodes.forEach(node => nodes.push(node));
    } else if (line.startsWith('for')) {
      // 3개의 노드를 만듭니다. 초기화(기존 node사용), 판단문, 증감문
      const nodeIf = {};
      const nodeUpdate = {};
      const forParts = line.match(/for\s*\(([^;]*);([^;]+);([^)]*)\)/);
      node.content = forParts[1].trim();
      nodeIf.content = forParts[2].trim();
      nodeUpdate.content = forParts[3].trim();

      // ID설정
      if (node.content !== '') {
        node.type = 'plain';
        nodeIf.id = MaxId + 1;
        MaxId = nodeIf.id;
        nodeIf.type = 'loop';
        loopId.push(nodeIf.id);
        node.next = nodeIf.id;
        nodes.push(nodeIf);
      } else {
        node.type = 'loop';
        node.content = nodeIf.content;
        loopId.push(node.id);
      }
      // 연결
      if (nodeUpdate.content !== '') {
        nodeUpdate.id = MaxId + 1;
        MaxId = nodeUpdate.id;
        nodeUpdate.type = 'plain';
        if (nodeIf.id !== undefined)
          nodeUpdate.next = nodeIf.id;
        else
          nodeUpdate.next = node.id;
        nodes.push(nodeUpdate);
      }

      // 서브 블럭 검색
      let openBraces = 1;
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].includes('}')) openBraces--;
        if (openBraces === 0) {
          // sub-block 재귀
          nodeIf.yes = i + 1 + offset;
          nodeIf.next = j + 1 + offset;
          if (nodeIf.next == lines.length + offset)
            nodeIf.next = next
          breakId.push(nodeIf.next);
          const trueBlock = lines.slice(i + 1, j);
          if (nodeUpdate.id === undefined)
            if (node.type === 'loop')
              nodeUpdate.id = node.id;
            else
              nodeUpdate.id = nodeIf.id;
          const subnodes = getNodeC(trueBlock, nodeIf.yes, nodeUpdate.id);
          subnodes.forEach(node => nodes.push(node));
          if (node.type === 'loop') {
            node.next = nodeIf.next;
            node.yes = nodeIf.yes;
          }
          i = j;
          break;
        }
        if (lines[j].includes('{')) openBraces++;
      }
    } else if (line.startsWith('break;')) {
      node.content = 'break';
      node.type = 'plain';
      node.next = breakId.pop();
    } else if (line.startsWith('continue;')) {
      node.content = 'continue';
      node.type = 'plain';
      node.next = loopId.pop();
    } else {
      node.type = 'plain';
      node.content = line.replace(";", "");
      if (node.id - offset == lines.length - 1)
        node.next = next
      else
        node.next = i + 1 + offset;
    }
    nodes.push(node);
  }

  return nodes;
}
