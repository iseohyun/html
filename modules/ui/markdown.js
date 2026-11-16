/**
 * @file modules/ui/markdown.js
 * @module SiteModules.Markdown
 * @description 외부 라이브러리 없이 마크다운(.md) 원문을 사이트 문서용 HTML 문자열로 바꾼다.
 *   라우터(modules/core/navigation.js)는 경로가 .md 로 끝나는 문서를 원문 그대로 받아 이 모듈로 그린다.
 *   DOM 을 쓰지 않으므로 Node(scripts/build-search-index.js)에서도 require 로 불러 같은 결과를 얻는다.
 *
 *   지원: ATX 제목(#), 문단, 줄바꿈(줄 끝 공백 2칸 또는 \), **굵게**, *기울임*, ~~취소선~~, `인라인 코드`,
 *     [링크](주소 "제목"), ![그림](주소), <https://자동링크>, 맨 주소(https://...), 순서 있는/없는 목록(중첩, - [ ] 할 일),
 *     표(정렬 줄 :--- :---: ---:), 코드 울타리(``` 또는 ~~~, 언어는 language-* 클래스로 유지), 인용(>), 가로줄(---),
 *     맨 위의 YAML frontmatter(본문에 그리지 않고 meta 로 돌려준다).
 *   지원하지 않음: 원문 속 HTML(모두 글자로 보이게 이스케이프한다), 참조형 링크([a][b]), Setext 제목(=== / ---),
 *     들여쓰기 코드 블록, 각주.
 *
 *   제목 단계 규칙 (사이트 문서 규약: 본문의 h1 이 번호가 붙는 장, h2 가 절이고, 문서 제목은 hierarchy.json 에서 온다):
 *     1) 맨 처음 나오는 제목이 "# 제목" 이고 문서에 # 이 그것 하나뿐이면 문서 제목으로 본다.
 *        본문에는 그리지 않고(헤더와 문서 머리에 이미 제목이 나오므로) parse().title 로만 돌려준다.
 *     2) 남은 제목 가운데 가장 높은 단계가 h1 이 되도록 전체를 같은 폭으로 올린다.
 *        예) "# 제목 / ## 장 / ### 절" → 제목은 빠지고 장은 h1, 절은 h2.  "## 장 / ### 절"만 있어도 같다.
 *        예) # 이 여러 개인 문서 → 제목으로 보지 않고 그대로 # 은 h1, ## 는 h2.
 *     3) 인용(>)이나 목록 안의 제목은 목차와 번호에 끼지 않도록 굵은 문단(p.md-heading)으로 그린다.
 *     제목의 id 는 목차 모듈(toc.js)이 제목 글자 그대로 붙이므로, 문서 안 링크는 [절](#절 제목 그대로) 로 쓴다.
 *
 *   주소 규칙: 링크와 그림은 http/https, 상대 경로, #앵커만 허용한다(그 밖의 스킴은 링크 없이 글자만 남긴다).
 *     상대 경로는 options.basePath(.md 파일의 절대 경로)의 폴더를 기준으로 절대 경로로 바꾼다.
 * @exports render, parse
 */

(function () {
  const PLACEHOLDER = "\u0000";
  const HEADING_MARK = "\u0001";
  const MAX_HEADING_LEVEL = 6;
  const MAX_NESTING_DEPTH = 12;

  const RE_FENCE_OPEN = /^( {0,3})(`{3,}|~{3,})\s*([^\s`]*)[^`]*$/;
  const RE_HEADING = /^ {0,3}(#{1,6})(?:\s+(.*?))?(?:\s+#+)?\s*$/;
  const RE_HR = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/;
  const RE_QUOTE = /^ {0,3}>\s?/;
  const RE_LIST_ITEM = /^( *)([-*+]|\d{1,9}[.)])( +)(.*)$/;
  const RE_TABLE_DELIMITER = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/;
  const RE_URL_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
  const RE_SAFE_SCHEME = /^https?:\/\//i;

  function escapeHtml(text) {
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function escapeAttr(text) {
    return escapeHtml(text).replace(/"/g, "&quot;");
  }

  // 맨 위의 YAML frontmatter 를 떼어 낸다. "키: 값" 한 줄짜리만 읽고 그 밖의 YAML 문법은 건너뛴다.
  function splitFrontmatter(text) {
    const match = /^---[ \t]*\n([\s\S]*?)\n(?:---|\.\.\.)[ \t]*(?:\n|$)/.exec(text);
    if (!match) return { meta: {}, body: text };

    const meta = {};
    match[1].split("\n").forEach(line => {
      const pair = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
      if (!pair) return;
      meta[pair[1]] = pair[2].trim().replace(/^(["'])(.*)\1$/, "$2");
    });
    return { meta: meta, body: text.slice(match[0].length) };
  }

  // 상대 경로를 basePath(파일 경로)의 폴더 기준 절대 경로로 바꾼다. ?질의 와 #앵커 는 그대로 붙인다.
  function resolvePath(basePath, relativePath) {
    const tailIndex = relativePath.search(/[?#]/);
    const pathPart = tailIndex === -1 ? relativePath : relativePath.slice(0, tailIndex);
    const tail = tailIndex === -1 ? "" : relativePath.slice(tailIndex);
    if (pathPart.startsWith("/")) return relativePath;

    const parts = basePath.split("/");
    parts.pop();
    pathPart.split("/").forEach(part => {
      if (part === "." || part === "") return;
      if (part === "..") {
        if (parts.length > 1) parts.pop();
      } else {
        parts.push(part);
      }
    });
    return parts.join("/") + tail;
  }

  /**
   * 링크/그림 주소를 검사하고 정리한다.
   * @returns {{url: string, isExternal: boolean}|null} 허용하지 않는 주소면 null
   */
  function sanitizeUrl(rawUrl, ctx) {
    // 제어 문자를 끼워 스킴 검사를 피하는 주소(java\tscript: 등)를 막는다
    const url = String(rawUrl).replace(/[\u0000-\u001f\u007f\s]/g, "");
    if (!url) return null;
    if (RE_SAFE_SCHEME.test(url)) return { url: url, isExternal: true };
    // 스킴이 있거나(javascript:, data: 등) 다른 출처로 가는 "//호스트" 꼴은 허용하지 않는다
    if (RE_URL_SCHEME.test(url) || url.startsWith("//")) return null;
    if (url.startsWith("#")) return { url: url, isExternal: false };
    return { url: ctx.basePath ? resolvePath(ctx.basePath, url) : url, isExternal: false };
  }

  // ---------------------------------------------------------------------------
  // 줄 안(인라인) 문법
  // ---------------------------------------------------------------------------

  function renderInline(source, ctx) {
    const stash = [];
    const keep = (html) => {
      stash.push(html);
      return PLACEHOLDER + (stash.length - 1) + PLACEHOLDER;
    };
    const linkOpenTag = (target, title) => {
      const titleAttr = title ? ` title="${escapeAttr(title)}"` : "";
      const externalAttr = target.isExternal ? ' target="_blank" rel="noopener noreferrer"' : "";
      return `<a href="${escapeAttr(target.url)}"${titleAttr}${externalAttr}>`;
    };

    // 1. 인라인 코드: 안쪽은 다른 문법을 타지 않는다
    let text = source.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (match, ticks, code) =>
      keep(`<code>${escapeHtml(code.replace(/^ (.+) $/, "$1"))}</code>`));

    // 2. 역슬래시로 문법 글자를 그대로 쓰기 (\* \_ \| 등)
    text = text.replace(/\\([!-\/:-@\[-`{-~])/g, (match, char) => keep(escapeHtml(char)));

    // 3. <https://...> 자동 링크
    text = text.replace(/<(https?:\/\/[^\s<>]+)>/g, (match, url) => {
      const target = sanitizeUrl(url, ctx);
      return target ? keep(`${linkOpenTag(target)}${escapeHtml(url)}</a>`) : match;
    });

    // 4. 남은 글자는 모두 이스케이프한다 (원문 속 HTML 은 글자로 보인다)
    text = escapeHtml(text);

    // 5. 그림과 링크. 주소는 괄호 한 겹까지 허용한다: (a_(b).png)
    const destination = '\\(\\s*((?:[^()\\s]|\\([^()\\s]*\\))+)(?:\\s+"([^"]*)")?\\s*\\)';
    text = text.replace(new RegExp("!\\[([^\\]]*)\\]" + destination, "g"), (match, alt, url, title) => {
      const target = sanitizeUrl(decodeBasicEntities(url), ctx);
      if (!target) return alt;
      const titleAttr = title ? ` title="${title.replace(/"/g, "&quot;")}"` : "";
      return keep(`<img class="md-img" src="${escapeAttr(target.url)}" alt="${alt.replace(/"/g, "&quot;")}"${titleAttr}>`);
    });
    text = text.replace(new RegExp("\\[((?:[^\\[\\]]|\\[[^\\[\\]]*\\])*)\\]" + destination, "g"), (match, label, url, title) => {
      const target = sanitizeUrl(decodeBasicEntities(url), ctx);
      if (!target) return label;
      return keep(linkOpenTag(target, title ? decodeBasicEntities(title) : "")) + label + keep("</a>");
    });

    // 6. 맨 주소 (문장 끝의 구두점은 주소에서 뺀다)
    text = text.replace(/(^|[\s(])(https?:\/\/[^\s<]+)/g, (match, lead, rawUrl) => {
      const trailing = /[.,;:!?)]+$/.exec(rawUrl);
      const url = trailing ? rawUrl.slice(0, -trailing[0].length) : rawUrl;
      const target = sanitizeUrl(decodeBasicEntities(url), ctx);
      if (!target) return match;
      return lead + keep(`${linkOpenTag(target)}${url}</a>`) + (trailing ? trailing[0] : "");
    });

    // 7. 강조. 밑줄(_)은 낱말 안에서는 강조로 보지 않는다 (snake_case 보존)
    text = text
      .replace(/\*\*\*(?=\S)([\s\S]*?\S)\*\*\*/g, "<strong><em>$1</em></strong>")
      .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^\p{L}\p{N}_])__(?=\S)([\s\S]*?\S)__(?![\p{L}\p{N}_])/gu, "$1<strong>$2</strong>")
      .replace(/\*(?=[^\s*])([^*]*?[^\s*])\*/g, "<em>$1</em>")
      .replace(/(^|[^\p{L}\p{N}_])_(?=[^\s_])([^_]*?[^\s_])_(?![\p{L}\p{N}_])/gu, "$1<em>$2</em>")
      .replace(/~~(?=\S)([\s\S]*?\S)~~/g, "<del>$1</del>");

    // 8. 줄바꿈: 줄 끝의 공백 2칸 이상 또는 역슬래시
    text = text.replace(/(?: {2,}|\\)\n/g, "<br>\n");

    // 9. 따로 둔 조각을 되돌린다 (조각 안에 조각 번호가 들어갈 수 있어 남지 않을 때까지 반복)
    const restorePattern = new RegExp(PLACEHOLDER + "(\\d+)" + PLACEHOLDER, "g");
    while (text.indexOf(PLACEHOLDER) !== -1) {
      text = text.replace(restorePattern, (match, index) => stash[Number(index)]);
    }
    return text;
  }

  // ---------------------------------------------------------------------------
  // 블록 문법
  // ---------------------------------------------------------------------------

  function indentOf(line) {
    return line.length - line.trimStart().length;
  }

  function splitTableRow(line) {
    let row = line.trim();
    if (row.startsWith("|")) row = row.slice(1);
    if (row.endsWith("|") && !row.endsWith("\\|")) row = row.slice(0, -1);
    // \| 는 칸을 나누지 않고 | 글자로 남는다 (인라인 코드 안에서도 같다)
    return row.split(/(?<!\\)\|/).map(cell => cell.trim().replace(/\\\|/g, "|"));
  }

  function isTableStart(lines, index) {
    if (index + 1 >= lines.length) return false;
    if (!lines[index].includes("|") || !lines[index + 1].includes("-")) return false;
    if (!RE_TABLE_DELIMITER.test(lines[index + 1])) return false;
    return splitTableRow(lines[index]).length === splitTableRow(lines[index + 1]).length;
  }

  // 문단을 끊고 새 블록을 시작하는 줄인지
  function startsBlock(lines, index) {
    const line = lines[index];
    return RE_FENCE_OPEN.test(line) || RE_HEADING.test(line) || RE_HR.test(line) || RE_QUOTE.test(line) ||
      RE_LIST_ITEM.test(line) || isTableStart(lines, index);
  }

  function parseFence(lines, start, out) {
    const open = RE_FENCE_OPEN.exec(lines[start]);
    const indent = open[1].length;
    const fence = open[2];
    const language = open[3] || "";
    const closePattern = new RegExp("^ {0,3}" + fence[0] + "{" + fence.length + ",}\\s*$");
    const body = [];

    let i = start + 1;
    while (i < lines.length && !closePattern.test(lines[i])) {
      // 울타리가 들여써져 있으면 그만큼만 본문의 들여쓰기를 걷어 낸다
      body.push(lines[i].replace(new RegExp("^ {0," + indent + "}"), ""));
      i++;
    }
    const classAttr = language ? ` class="language-${escapeAttr(language)}"` : "";
    out.push(`<pre><code${classAttr}>${escapeHtml(body.join("\n"))}</code></pre>`);
    return i + 1; // 닫는 울타리가 없으면 문서 끝까지가 코드다
  }

  function parseTable(lines, start, out, ctx) {
    const aligns = splitTableRow(lines[start + 1]).map(cell => {
      const left = cell.startsWith(":");
      const right = cell.endsWith(":");
      if (left && right) return "center";
      if (right) return "right";
      return left ? "left" : "";
    });
    const cellHtml = (tag, text, column) => {
      const classAttr = aligns[column] ? ` class="md-align-${aligns[column]}"` : "";
      return `<${tag}${classAttr}>${renderInline(text || "", ctx)}</${tag}>`;
    };
    const header = splitTableRow(lines[start]);
    const rows = [];

    let i = start + 2;
    while (i < lines.length && lines[i].trim() !== "" && lines[i].includes("|")) {
      rows.push(splitTableRow(lines[i]));
      i++;
    }

    const head = `<thead><tr>${header.map((cell, column) => cellHtml("th", cell, column)).join(" ")}</tr></thead>`;
    // 칸 수는 머리 줄에 맞춘다: 모자라면 빈 칸, 넘치면 버린다
    const body = rows.map(row => `<tr>${header.map((unused, column) => cellHtml("td", row[column], column)).join(" ")}</tr>`).join(" ");
    out.push(`<table class="md-table">${head}<tbody>${body}</tbody></table>`);
    return i;
  }

  function parseQuote(lines, start, out, ctx, depth) {
    const inner = [];
    let i = start;
    while (i < lines.length && RE_QUOTE.test(lines[i])) {
      inner.push(lines[i].replace(RE_QUOTE, ""));
      i++;
    }
    out.push(`<blockquote class="md-quote">${renderBlocks(inner, ctx, depth + 1, false)}</blockquote>`);
    return i;
  }

  function parseList(lines, start, out, ctx, depth) {
    const first = RE_LIST_ITEM.exec(lines[start]);
    const baseIndent = first[1].length;
    const isOrdered = /\d/.test(first[2]);
    const isSameKind = (marker) => /\d/.test(marker) === isOrdered;
    const items = [];
    let isLoose = false;

    let i = start;
    while (i < lines.length) {
      const marker = RE_LIST_ITEM.exec(lines[i]);
      if (!marker || marker[1].length < baseIndent || !isSameKind(marker[2])) break;

      // 항목의 본문이 시작하는 칸: 이보다 깊이 들여쓴 줄은 이 항목에 속한다
      const contentOffset = marker[1].length + marker[2].length + (marker[3].length <= 4 ? marker[3].length : 1);
      const itemLines = [marker[4]];
      // 본문 칸까지 들여쓰지 않았더라도 이 항목의 기호보다 깊이 들여쓴 목록 줄은 하위 목록으로 본다
      const belongsToItem = (line) => indentOf(line) >= contentOffset ||
        (indentOf(line) > marker[1].length && RE_LIST_ITEM.test(line));
      i++;

      while (i < lines.length) {
        const line = lines[i];
        if (line.trim() === "") {
          // 빈 줄 뒤에 이 항목의 들여쓴 내용이 이어지면 항목 안의 문단 나눔이다
          let next = i + 1;
          while (next < lines.length && lines[next].trim() === "") next++;
          if (next < lines.length && belongsToItem(lines[next])) {
            for (let blank = i; blank < next; blank++) itemLines.push("");
            isLoose = true;
            i = next;
            continue;
          }
          break;
        }
        if (belongsToItem(line)) {
          itemLines.push(line.slice(Math.min(contentOffset, indentOf(line))));
        } else if (startsBlock(lines, i)) {
          break; // 같은 목록의 다음 항목이거나 목록 밖의 다른 블록
        } else {
          itemLines.push(line.trim()); // 들여쓰지 않고 이어 쓴 문단 줄
        }
        i++;
      }
      items.push(itemLines);

      // 항목 사이의 빈 줄: 같은 종류의 항목이 이어지면 한 목록으로 본다
      let next = i;
      while (next < lines.length && lines[next].trim() === "") next++;
      if (next > i) {
        const following = next < lines.length ? RE_LIST_ITEM.exec(lines[next]) : null;
        if (!following || following[1].length < baseIndent || !isSameKind(following[2])) break;
        isLoose = true;
        i = next;
      }
    }

    const tag = isOrdered ? "ol" : "ul";
    const startNumber = isOrdered ? parseInt(first[2], 10) : 1;
    const startAttr = isOrdered && startNumber !== 1 ? ` start="${startNumber}"` : "";
    const itemsHtml = items.map(itemLines => {
      let checkbox = "";
      const task = /^\[([ xX])\]\s+/.exec(itemLines[0]);
      if (task) {
        checkbox = `<input type="checkbox" disabled${task[1] === " " ? "" : " checked"}> `;
        itemLines[0] = itemLines[0].slice(task[0].length);
      }
      return `<li>${checkbox}${renderBlocks(itemLines, ctx, depth + 1, !isLoose)}</li>`;
    }).join("\n");
    out.push(`<${tag}${startAttr}>${itemsHtml}</${tag}>`);
    return i;
  }

  /**
   * 줄 묶음을 블록 HTML 로 바꾼다.
   * @param {string[]} lines
   * @param {Object} ctx 공용 상태 (basePath, headings)
   * @param {number} depth 0 이면 문서 최상위. 인용/목록 안은 1 이상
   * @param {boolean} isTight true 면 문단을 <p> 로 감싸지 않는다 (빈 줄 없이 붙여 쓴 목록의 항목)
   */
  function renderBlocks(lines, ctx, depth, isTight) {
    const out = [];
    // 지나치게 깊은 중첩은 더 풀지 않고 글자로 보여 준다 (재귀 폭주 방지)
    if (depth > MAX_NESTING_DEPTH) return `<p>${escapeHtml(lines.join("\n"))}</p>`;

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      if (line.trim() === "") {
        i++;
      } else if (RE_FENCE_OPEN.test(line)) {
        i = parseFence(lines, i, out);
      } else if (RE_HEADING.test(line)) {
        const heading = RE_HEADING.exec(line);
        const html = renderInline(heading[2] || "", ctx);
        if (depth === 0) {
          // 단계는 문서 전체의 제목을 다 본 뒤에 정하므로 자리만 잡아 둔다
          ctx.headings.push({ level: heading[1].length, html: html });
          out.push(HEADING_MARK + (ctx.headings.length - 1) + HEADING_MARK);
        } else {
          out.push(`<p class="md-heading"><strong>${html}</strong></p>`);
        }
        i++;
      } else if (RE_HR.test(line)) {
        out.push("<hr>");
        i++;
      } else if (RE_QUOTE.test(line)) {
        i = parseQuote(lines, i, out, ctx, depth);
      } else if (RE_LIST_ITEM.test(line)) {
        i = parseList(lines, i, out, ctx, depth);
      } else if (isTableStart(lines, i)) {
        i = parseTable(lines, i, out, ctx);
      } else {
        const paragraph = [line.trimStart()];
        i++;
        while (i < lines.length && lines[i].trim() !== "" && !startsBlock(lines, i)) {
          paragraph.push(lines[i].trimStart());
          i++;
        }
        const html = renderInline(paragraph.join("\n").replace(/\s+$/, ""), ctx);
        out.push(isTight ? html : `<p>${html}</p>`);
      }
    }
    return out.join("\n");
  }

  // 파일 머리의 "제목 단계 규칙"대로 자리 표시를 실제 제목 태그로 바꾼다
  function placeHeadings(html, headings) {
    const topLevelCount = headings.filter(heading => heading.level === 1).length;
    const titleIndex = headings.length > 0 && headings[0].level === 1 && topLevelCount === 1 ? 0 : -1;
    const bodyLevels = headings.filter((heading, index) => index !== titleIndex).map(heading => heading.level);
    const shift = bodyLevels.length > 0 ? Math.min.apply(null, bodyLevels) - 1 : 0;

    const placed = html.replace(new RegExp(HEADING_MARK + "(\\d+)" + HEADING_MARK + "\\n?", "g"), (match, rawIndex) => {
      const index = Number(rawIndex);
      if (index === titleIndex) return "";
      const level = Math.min(headings[index].level - shift, MAX_HEADING_LEVEL);
      return `<h${level}>${headings[index].html}</h${level}>\n`;
    });
    const titleText = titleIndex === 0 ? headings[0].html.replace(/<[^>]+>/g, "") : "";
    return { html: placed, titleText: titleText };
  }

  function decodeBasicEntities(text) {
    return text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  }

  /**
   * 마크다운 원문을 풀어 HTML 과 문서 정보를 돌려준다.
   * @param {string} text 마크다운 원문
   * @param {{basePath?: string}} [options] basePath: .md 파일의 절대 경로 (예: "/column/ai/note.md"). 상대 경로 링크/그림의 기준
   * @returns {{html: string, title: string, meta: Object}} title 은 frontmatter 의 title, 없으면 문서 제목으로 본 "# 제목"
   */
  function parse(text, options = {}) {
    const normalized = String(text == null ? "" : text).replace(/^﻿/, "").replace(/[\u0000\u0001]/g, "").replace(/\r\n?/g, "\n");
    const { meta, body } = splitFrontmatter(normalized);
    // 줄 머리의 탭은 공백 4칸으로 본다 (목록 들여쓰기 계산용)
    const lines = body.split("\n").map(line => line.replace(/^[\t ]+/, indent => indent.replace(/\t/g, "    ")));

    const ctx = { basePath: options.basePath || "", headings: [] };
    const blocksHtml = renderBlocks(lines, ctx, 0, false);
    const placed = placeHeadings(blocksHtml, ctx.headings);

    return {
      html: placed.html,
      title: meta.title || decodeBasicEntities(placed.titleText),
      meta: meta
    };
  }

  /** 마크다운 원문을 HTML 문자열로 바꾼다. (parse().html 과 같다) */
  function render(text, options) {
    return parse(text, options).html;
  }

  const api = { render: render, parse: parse };

  if (typeof window !== "undefined") {
    window.SiteModules = window.SiteModules || {};
    window.SiteModules.Markdown = api;
  }
  // Node 에서 색인 생성 스크립트가 같은 변환기를 쓴다
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();
