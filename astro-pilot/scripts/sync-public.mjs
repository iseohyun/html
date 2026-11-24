/**
 * 저장소 루트의 공통 자원을 astro-pilot/public 으로 복사한다 (dev · build 전에 자동 실행).
 * 원본은 그대로 루트에 두고, 시범 프로젝트는 복사본을 정적 파일로 내보낸다.
 * 문서 HTML 은 복사하지 않는다: 문서는 src/pages 가 원본을 읽어 페이지로 만든다.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pilotRoot = resolve(here, '..');
const repoRoot = resolve(pilotRoot, '..');
const publicDir = join(pilotRoot, 'public');

// [저장소 루트 기준 경로, HTML 도 복사할지]
const ENTRIES = [
  ['style.css', false],
  ['hierarchy.json', false],
  ['search-index.json', false],
  ['modules', false],
  ['source', false],
  ['engineering/language/svg', false],
];

mkdirSync(publicDir, { recursive: true });

for (const [rel, withHtml] of ENTRIES) {
  const from = join(repoRoot, rel);
  const to = join(publicDir, rel);
  if (!existsSync(from)) {
    console.warn(`[sync-public] 없는 경로를 건너뜁니다: ${rel}`);
    continue;
  }
  rmSync(to, { recursive: true, force: true });
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, {
    recursive: true,
    filter: (src) => withHtml || !src.toLowerCase().endsWith('.html'),
  });
}

console.log(`[sync-public] ${ENTRIES.length}개 경로를 public/ 으로 복사했습니다.`);
