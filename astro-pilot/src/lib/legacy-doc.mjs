/**
 * 기존 문서 HTML 을 읽어 페이지 재료로 나눈다.
 * 기존 라우터(navigation.js 의 loadPageRoute)가 브라우저에서 하던 일을 빌드할 때 한다:
 *   - <article> 의 내용만 본문으로 쓴다 (문서 <head> 의 <style> 은 기존 사이트에서도 쓰이지 않았다)
 *   - <head> 의 문서 전용 스타일시트 · 스크립트를 골라낸다 (공통 모듈 · jQuery · highlight 는 레이아웃이 넣는다)
 *   - 아직 옮기지 않은 문서로 가는 링크를 기존 사이트 주소로 바꾼다
 * 읽기는 jsdom 으로 한다: 브라우저(DOMParser)와 같은 규칙으로 고쳐 읽어야 기존 사이트와 같은 결과가 나온다.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { resolve, posix } from 'node:path';
import { JSDOM } from 'jsdom';
import { REPO_ROOT, hrefFor } from './site.mjs';

// 레이아웃이 따로 넣거나 이 프로젝트에서는 쓰지 않는 자원
const SKIP_SCRIPT = /modules\/script\.js|code\.jquery\.com\/jquery|\/highlight\/|googletagmanager/;
const SKIP_STYLESHEET = /\/highlight\/|^\/style\.css/;
const DESCRIPTION_MAX = 150;

function stripVersion(url) {
  return url.replace(/\?v=[^"'&#]*/, '');
}

function lastModified(file) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', file], { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
    if (out) return out;
  } catch {
    // git 이 없으면 파일 시각으로 대신한다
  }
  return statSync(file).mtime.toISOString();
}

/** 본문 링크 중 사이트 안의 .html 문서를 가리키는 것을 갈 곳으로 바꾼다 */
function rewriteLinks(article, docUrl) {
  const docDir = posix.dirname(docUrl);
  article.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href || /^(https?:|mailto:|tel:|javascript:|#)/i.test(href)) return;
    const [pathPart, anchor] = href.split('#');
    if (!/\.html$/i.test(pathPart)) return;
    const absolute = pathPart.startsWith('/') ? pathPart : posix.normalize(posix.join(docDir, pathPart));
    a.setAttribute('href', hrefFor(absolute + (anchor ? '#' + anchor : '')));
  });
}

function makeDescription(article) {
  const firstText = Array.from(article.querySelectorAll('p, .script p, li'))
    .map((el) => el.textContent.replace(/\s+/g, ' ').trim())
    .find((text) => text.length > 40);
  if (!firstText) return '';
  return firstText.length > DESCRIPTION_MAX ? firstText.slice(0, DESCRIPTION_MAX - 1) + '…' : firstText;
}

/**
 * @param {string} docUrl 사이트 주소 (예: /coding/C/function.html)
 */
export function readLegacyDoc(docUrl) {
  const file = resolve(REPO_ROOT, '.' + docUrl);
  const root = new JSDOM(readFileSync(file, 'utf8'), { url: 'https://iseohyun.com' + docUrl }).window.document;
  const article = root.querySelector('article');
  if (!article) throw new Error(`<article> 이 없는 문서입니다: ${docUrl}`);

  rewriteLinks(article, docUrl);

  const head = root.querySelector('head');
  const stylesheets = Array.from(head ? head.querySelectorAll('link[rel="stylesheet"]') : [])
    .map((link) => stripVersion(link.getAttribute('href') || ''))
    .filter((href) => href && !SKIP_STYLESHEET.test(href));

  // 본문 밖의 스크립트 (보통 <head> 의 문서 전용 기능). 본문 안의 스크립트는 본문과 함께 제자리에서 실행된다.
  const outsideScripts = Array.from(root.querySelectorAll('script'))
    .filter((script) => !script.closest('article'))
    .map((script) => ({
      src: script.getAttribute('src') ? stripVersion(script.getAttribute('src')) : '',
      type: script.getAttribute('type') || '',
      defer: script.hasAttribute('defer'),
      code: script.getAttribute('src') ? '' : script.textContent,
    }))
    .filter((script) => (script.src ? !SKIP_SCRIPT.test(script.src) : !/gtag\(|dataLayer/.test(script.code)));

  const keywordsMeta = root.querySelector('meta[keywords]') || root.querySelector('meta[name="keywords"]');
  const keywords = keywordsMeta ? (keywordsMeta.getAttribute('keywords') || keywordsMeta.getAttribute('content') || '') : '';
  const tagsEl = root.querySelector('tags');

  return {
    html: article.innerHTML,
    stylesheets,
    scripts: outsideScripts,
    keywords,
    tags: tagsEl ? tagsEl.textContent.trim() : '',
    description: makeDescription(article),
    lastModified: lastModified(file),
  };
}
