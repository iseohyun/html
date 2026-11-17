/**
 * 빌드할 때 쓰는 사이트 정보: 사이트맵(hierarchy.json), 옮겨 온 문서의 범위, 아직 옮기지 않은 문서로 가는 주소.
 * 사이트맵 순회는 브라우저용 /modules/core/hierarchy.js 를 그대로 불러 쓴다 (규칙을 두 벌로 두지 않으려고).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

export const REPO_ROOT = resolve(process.cwd(), '..');

// 시범 전환으로 옮겨 온 문서의 범위. 여기에 든 주소만 이 프로젝트가 페이지로 만든다.
export const MIGRATED_PREFIXES = ['/coding/C/'];

// 아직 옮기지 않은 문서는 기존 사이트(해시 주소)로 보낸다. 로컬에서는 LEGACY_BASE=http://localhost:5174/html/# 처럼 바꾼다.
export const LEGACY_BASE = process.env.LEGACY_BASE || 'https://iseohyun.com/#';

function loadHierarchyModule() {
  const source = readFileSync(resolve(REPO_ROOT, 'modules/core/hierarchy.js'), 'utf8');
  const sandbox = { window: { SiteModules: {} } };
  vm.runInNewContext(source, sandbox, { filename: 'hierarchy.js' });
  return sandbox.window.SiteModules.Hierarchy;
}

export const Hierarchy = loadHierarchyModule();
export const tree = JSON.parse(readFileSync(resolve(REPO_ROOT, 'hierarchy.json'), 'utf8'));

export function isMigrated(url) {
  return MIGRATED_PREFIXES.some((prefix) => url.startsWith(prefix)) && !Hierarchy.isDevPath(tree, url);
}

/** 사이트 안의 문서 주소를 실제로 갈 곳으로 바꾼다: 옮긴 문서는 그대로, 나머지는 기존 사이트로 */
export function hrefFor(url) {
  if (!url) return url;
  const [path, anchor] = url.split('#');
  if (isMigrated(path)) return url;
  return LEGACY_BASE + path + (anchor ? '#' + anchor : '');
}

/** 옮겨 온 문서 목록 (사이트맵 순서) */
export function migratedPages() {
  const pages = [];
  Hierarchy.forEachPage(Hierarchy.visibleItems(tree), (page) => {
    if (isMigrated(page.url)) pages.push(page);
  });
  return pages;
}

/** 헤더 탭: 같은 묶음의 형제 문서 (기존 navigation.js 의 buildHeaderTabs 와 같은 규칙) */
export function headerTabs(page) {
  const tabs = [];
  if (page.parentOverviewUrl) tabs.push({ label: '개론', href: hrefFor(page.parentOverviewUrl), selected: false });
  Hierarchy.visibleItems(page.siblings)
    .filter(Hierarchy.isPageItem)
    .forEach((item) => {
      const url = Hierarchy.getItemUrl(page.parentDirs, item);
      tabs.push({ label: item.주제 || '', href: hrefFor(url), selected: item === page.item });
    });
  return tabs.length < 2 ? [] : tabs;
}

/** 이전 · 다음 문서 */
export function neighbors(page) {
  const docs = Hierarchy.visibleItems(page.siblings).filter(Hierarchy.isPageItem);
  const index = docs.indexOf(page.item);
  const toLink = (item) => item && { title: item.주제, href: hrefFor(Hierarchy.getItemUrl(page.parentDirs, item)) };
  return { prev: toLink(docs[index - 1]), next: toLink(docs[index + 1]) };
}
