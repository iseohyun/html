#!/usr/bin/env node
/**
 * @file scripts/build-search-index.js
 * @description hierarchy.json에 등록된 모든 문서를 읽어 사이드바 검색용 정적 색인(/search-index.json)을 생성한다.
 *   사이트(modules/core/search.js)는 이 파일 하나만 받아 태그/전체 검색을 수행하며,
 *   파일이 없으면 런타임에 문서를 직접 수집하는 방식으로 대체된다.
 *   외부 의존성 없이 Node 내장 모듈만 사용한다.
 *
 * 사용법:
 *   node scripts/build-search-index.js          색인 생성(덮어쓰기)
 *   node scripts/build-search-index.js --check  색인이 최신인지 검사만 수행(오래됐으면 종료 코드 1)
 *
 * 색인 항목 형식은 search.js의 런타임 수집 결과와 동일하다:
 *   { title, url, breadcrumb, tags: string[], articleText: string, hasArticle: boolean }
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const HIERARCHY_PATH = path.join(ROOT_DIR, 'hierarchy.json');
const OUTPUT_PATH = path.join(ROOT_DIR, 'search-index.json');
const DEFAULT_FILE_NAME = 'index.html';
// 본문 색인에서 제외하는 요소 (search.js의 런타임 수집과 동일한 기준)
const EXCLUDED_ELEMENTS = ['script', 'style', 'tags'];

// 문서에서 실제로 쓰이는 이름 있는 엔티티만 변환한다 (키는 소문자). 목록에 없는 엔티티는 원문 그대로 남는다.
const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  hellip: '…', deg: '°', pi: 'π', theta: 'θ', times: '×', infin: '∞', in: '∈', subset: '⊂',
  frac12: '½', grave: '`', backslash: '∖', triangle: '▵', cir: '○', notequal: '≠', integral: '∫'
};

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

// modules/core/hierarchy.js의 forEachPage와 동일한 규칙으로 문서 목록을 만든다
function listPages(list, parentDirs = '', ancestors = [], pages = []) {
  for (const item of list) {
    const title = item.주제 || '';
    const dir = item.디렉토리 || '';
    const isPage = hasOwn(item, '파일명') || !hasOwn(item, '목록');
    if (isPage) {
      const fileName = hasOwn(item, '파일명') ? item.파일명 : DEFAULT_FILE_NAME;
      pages.push({
        title: title,
        url: `/${parentDirs}${dir}${fileName}`,
        breadcrumb: ancestors.concat(title).join(' > ')
      });
    }
    if (item.목록 && item.목록.length > 0) {
      listPages(item.목록, parentDirs + dir, ancestors.concat(title), pages);
    }
  }
  return pages;
}

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (match, code) => {
    if (code[0] === '#') {
      const codePoint = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(codePoint) && codePoint > 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : match;
    }
    const named = NAMED_ENTITIES[code.toLowerCase()];
    return named !== undefined ? named : match;
  });
}

function removeElements(html, tagName) {
  return html.replace(new RegExp(`<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}\\s*>`, 'gi'), '');
}

// DOM의 textContent처럼 태그를 공백 없이 제거한다 (인라인 태그로 나뉜 단어가 떨어지지 않도록)
function htmlToText(html) {
  let text = html.replace(/<!--[\s\S]*?-->/g, '');
  // 인라인 SVG의 <?xml ...?> 선언과 <!DOCTYPE ...> 등은 DOM에서 텍스트가 아니므로 제거한다
  text = text.replace(/<[?!][^>]*>/g, '');
  for (const tagName of EXCLUDED_ELEMENTS) {
    text = removeElements(text, tagName);
  }
  // 태그는 "<" 바로 뒤에 영문자 또는 "/"가 오는 경우만 해당한다 (본문의 "x < 15" 같은 부등호 보존)
  text = text.replace(/<\/?[a-zA-Z][^>]*>/g, '');
  return decodeEntities(text).toLowerCase().replace(/\s+/g, ' ').trim();
}

function extractTags(html) {
  const match = /<tags\b[^>]*>([\s\S]*?)<\/tags\s*>/i.exec(html);
  if (!match) return [];
  return decodeEntities(match[1].replace(/<[^>]+>/g, ''))
    .split(',')
    .map(tag => tag.trim().toLowerCase())
    .filter(Boolean);
}

function extractArticle(html) {
  const open = /<article\b[^>]*>/i.exec(html);
  if (!open) return null;
  const start = open.index + open[0].length;
  const end = html.toLowerCase().lastIndexOf('</article');
  return html.slice(start, end > start ? end : html.length);
}

function buildIndex() {
  const hierarchy = JSON.parse(fs.readFileSync(HIERARCHY_PATH, 'utf8'));
  const entries = [];
  const missing = [];

  for (const page of listPages(hierarchy)) {
    const filePath = path.join(ROOT_DIR, decodeURIComponent(page.url));
    if (!fs.existsSync(filePath)) {
      missing.push(page.url);
      continue;
    }
    const html = fs.readFileSync(filePath, 'utf8');
    const articleHtml = extractArticle(html);
    entries.push({
      title: page.title,
      url: page.url,
      breadcrumb: page.breadcrumb,
      tags: extractTags(html),
      articleText: articleHtml === null ? '' : htmlToText(articleHtml),
      hasArticle: articleHtml !== null
    });
  }

  return { entries, missing };
}

function main() {
  const isCheckMode = process.argv.includes('--check');
  const { entries, missing } = buildIndex();
  const output = JSON.stringify(entries) + '\n';

  if (missing.length > 0) {
    console.warn(`[search-index] hierarchy.json에 등록됐지만 파일이 없는 문서 ${missing.length}건:`);
    missing.forEach(url => console.warn(`  - ${url}`));
  }

  if (isCheckMode) {
    // git의 줄바꿈 변환(autocrlf)으로 인한 차이는 무시한다
    const current = fs.existsSync(OUTPUT_PATH) ? fs.readFileSync(OUTPUT_PATH, 'utf8').split(String.fromCharCode(13)).join('') : null;
    if (current !== output) {
      console.error('[search-index] search-index.json이 최신이 아닙니다. "npm run build:search"를 실행하세요.');
      process.exit(1);
    }
    console.log(`[search-index] 최신 상태입니다 (${entries.length}건).`);
    return;
  }

  fs.writeFileSync(OUTPUT_PATH, output);
  console.log(`[search-index] ${entries.length}건 색인 생성 → ${path.relative(ROOT_DIR, OUTPUT_PATH)} (${(Buffer.byteLength(output) / 1024).toFixed(0)} KB)`);
}

main();
