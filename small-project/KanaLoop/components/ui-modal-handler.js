/*
 * ui-modal-handler.js
 * 앱 메뉴 출력용. view/ 이하 .html의 반영과 제어
 */

import { getAllProgress } from './db-handler.js';
import { ALPHABETS, INTERVALS } from './engine.js';

let analysisMode = 'default';

export function getStandardCharCount(domain) {
  const rows = ALPHABETS[domain] || [];
  if (rows.length === 0) return 0;
  if (Array.isArray(rows[0])) {
    let count = 0;
    for (const row of rows) { count += row.length; }
    return count;
  }
  return rows.length;
}

export function refreshPersonalizedSettings(config) {
  const listContainer = document.getElementById('personalized-settings-list');
  if (!listContainer) return;
  listContainer.innerHTML = `
    <div style="margin-top:8px;">
      <b>• 진도 합격 기준 점수:</b> <span style="color:#2196F3; font-weight:bold;">${((config.masteryScore || 0.8) * 100).toFixed(0)}%</span>
    </div>
    <div style="margin-top:8px;">
      <b>• 최대 학습 풀 크기:</b> <span style="color:#4CAF50; font-weight:bold;">${config.MAX_POOL_SIZE || 10}개</span>
    </div>
  `;
}

export function renderStudyStatsChart(stats) {
  const container = document.getElementById('study-chart-container');
  const totalDisplay = document.getElementById('total-study-time');

  if (!container) {
    console.error("[CRITICAL] '#study-chart-container' 엘리먼트를 DOM에서 찾을 수 없습니다.");
    return;
  }

  const totalMinRounded = Math.round((stats?.total || 0) / 60);
  if (totalDisplay) totalDisplay.innerText = `${totalMinRounded}분`;

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }

  const maxSec = Math.max(...days.map(d => stats?.history?.[d] || 0), 1);

  container.innerHTML = days.map(day => {
    const sec = stats?.history?.[day] || 0;
    const height = (sec / maxSec) * 100;
    const label = day.slice(5);
    return `
      <div style="flex:1; display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end;">
        <div title="${Math.round(sec / 60)}분" style="width:100%; max-width:30px; height:${height}%; background:#4a90e2; border-radius:4px 4px 0 0; min-height:2px;"></div>
        <div style="font-size:9px; margin-top:5px; color:#999; white-space:nowrap;">${label}</div>
      </div>
    `;
  }).join('');
}

export async function renderResponseTimeChart(domain) {
  const container = document.getElementById('response-time-chart');
  if (!container) {
    console.error("[CRITICAL] '#response-time-chart' 엘리먼트가 고착되지 않았습니다.");
    return;
  }

  const allData = await getAllProgress(domain);

  const correctBins = new Array(26).fill(0);
  let totalCount = 0;

  Object.values(allData).forEach(data => {
    if (!data.recentLatencies) return;
    data.recentLatencies.forEach(ms => {
      const sec = ms / 1000;
      const binIndex = Math.min(Math.floor(sec / 0.2), 25);
      correctBins[binIndex]++;
      totalCount++;
    });
  });

  if (totalCount === 0) {
    container.innerHTML = `<div style="color:#aaa; text-align:center; padding-top:15px; font-size:11px; width:100%;">분포 데이터 부족</div>`;
    return;
  }

  const maxFreq = Math.max(...correctBins, 1);
  const barHtml = correctBins.map((cVal, idx) => {
    const cHeight = (cVal / maxFreq) * 100;
    const isMaxBucket = (cVal === maxFreq);
    const bgColor = isMaxBucket ? '#222222' : '#b39ddb';
    return `<div title="${(idx * 0.2).toFixed(1)}s: ${cVal}개" style="flex:1; height:${cHeight}%; background:${bgColor}; min-width:1px;"></div>`;
  }).join('');

  const points = correctBins.map((v, i) => {
    const x = ((i + 0.5) / 26) * 100;
    const y = 100 - (v / maxFreq) * 100;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  container.innerHTML = barHtml + `
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; overflow:visible;">
      <polyline points="${points}" fill="none" stroke="#FF5722" stroke-width="1.2" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
    </svg>
  `;
}

function getLatencyColor(avgSec) {
  if (!avgSec || avgSec <= 0) return '#f0f0f0';
  const ratio = Math.min(Math.max((avgSec - 1) / 4, 0), 1);
  const r = Math.floor(200 + (255 - 200) * ratio);
  const g = Math.floor(240 - (240 - 150) * ratio);
  const b = Math.floor(200 - (200 - 150) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

export function getStageColor(stage) {
  if (stage === 0) return '#f0f0f0';
  const colors = [
    '#ffdddd', // lv.0
    '#ffe0cc', // lv.1
    '#ffe6ba', // lv.2
    '#fff0b3', // lv.3
    '#edf2b2', // lv.4
    '#d9efb0', // lv.5
    '#c3e9ad', // lv.6
    '#aedfaa', // lv.7
    '#99d5a6'  // lv.8
  ];
  return colors[Math.min(stage, 8)];
}

export function renderProgressTable(domain, domainProgress) {
  const table = document.getElementById('progress-table');
  const countLabel = document.getElementById('settings-active-count');

  if (!table) return;
  table.innerHTML = '';

  const safeProgress = domainProgress || {};
  const rawDataset = ALPHABETS[domain] || [];

  let totalCount = 0;
  let learnedCount = 0;
  let globalIdx = 0;

  // 1. [정밀 정산] 진행률 집계를 위한 인덱스 사전 매핑 (언더바 완전 제외)
  rawDataset.forEach((rowStr) => {
    if (typeof rowStr === 'string') {
      for (let i = 0; i < rowStr.length; i++) {
        if (rowStr[i] !== '_') {
          totalCount++;
          const progress = safeProgress[globalIdx.toString()];
          if (progress && progress.stage > 0) learnedCount++;
          globalIdx++;
        }
      }
    }
  });

  // 2. 행렬 드로잉 (문자열 데이터셋의 1줄 = 테이블의 1행 강제 매치)
  let charIdxMarker = 0; // 실제 문자 ID 추적용 포인터

  rawDataset.forEach((rowStr) => {
    if (typeof rowStr !== 'string') return;

    const tr = document.createElement('tr');

    for (let i = 0; i < rowStr.length; i++) {
      const charName = rowStr[i];
      const td = document.createElement('td');
      td.style.border = "1px solid #e5e5e5";
      td.style.padding = "7px 2px";
      td.style.transition = "background-color 0.2s ease";

      // [규격 2] 언더바 발견 시 인덱스 계산 제외 및 공백 빈 셀 처리
      if (charName === '_') {
        td.style.background = "#e9e9e9";
        td.innerHTML = `&nbsp;`;
        tr.appendChild(td);
        continue;
      }

      // 일반 글자 정산 고착
      const cId = charIdxMarker;
      charIdxMarker++; // 다음 글자를 위해 ID 확보

      const progress = safeProgress[cId.toString()];
      const hasProgress = progress && progress.stage > 0;

      td.style.cursor = "pointer";

      let isOverdue = false;
      if (hasProgress) {
        const lastTime = progress.lastSessionTime || Date.now();
        const timeDiffMin = (Date.now() - lastTime) / (60 * 1000);
        const requiredMin = INTERVALS[progress.stage] || INTERVALS[INTERVALS.length - 1];
        isOverdue = timeDiffMin >= requiredMin;
      }

      if (!hasProgress) {
        td.style.background = "#e9e9e9";
        td.style.color = "#bbbbbb";
        td.innerHTML = `
          <div style="font-size:15px; font-weight:bold; opacity:0.35;">${charName}</div>
          <div style="font-size:9px; color:#bfbfbf; margin-top:3px;">-</div>
        `;
      } else {
        const avgLat = progress.recentLatencies && progress.recentLatencies.length > 0
          ? (progress.recentLatencies.reduce((a, b) => a + b, 0) / progress.recentLatencies.length / 1000)
          : 0;

        const infoText = analysisMode === 'stage'
          ? `Lv.${progress.stage} | ${progress.outCnt} Out`
          : `${avgLat ? avgLat.toFixed(1) + 's' : '-'}`;

        td.style.background = (analysisMode === 'stage') ? getStageColor(progress.stage) : getLatencyColor(avgLat);
        td.style.color = "#222222";

        if (analysisMode === 'stage' && isOverdue) {
          td.style.border = "2px solid #F44336";
          td.style.padding = "6px 1px"; // 2px 테두리로 인한 레이아웃 밀림(Jitter) 방지
        }

        td.innerHTML = `
          <div style="font-size:16px; font-weight:bold;">${charName}</div>
          <div style="font-size:9px; color:#555555; margin-top:2px; font-family:monospace; line-height:1.1;">
            ${infoText}
          </div>
        `;
      }

      td.onclick = () => {
        if (hasProgress) {
          if (confirm(`[${charName}] 기록을 초기화할까요?`)) window.resetSingleCharProgress?.(domain, cId);
        } else {
          if (confirm(`[${charName}] 진도를 나갈까요?`)) window.activateSingleCharProgress?.(domain, cId);
        }
      };

      tr.appendChild(td);
    }

    // 문자열 한 줄이 끝나는 즉시 무조건 행 마감 처리하여 다음 행 유도
    table.appendChild(tr);
  });

  // 진행률 표기 수정
  if (countLabel) {
    const percent = totalCount > 0 ? ((learnedCount / totalCount) * 100).toFixed(1) : "0.0";
    countLabel.innerText = `${learnedCount} / ${totalCount} (${percent}%)`;
  }
}

/**
 * 분석 모드 토글 액션 바인딩
 */
export function toggleAnalysisMode() {
  analysisMode = (analysisMode === 'default') ? 'stage' : 'default';
  const btn = document.getElementById('btn-analysis');
  if (btn) btn.innerText = analysisMode === 'stage' ? "장기기억" : "응답속도";

  if (window.userConfig && window.globalProgressCache) {
    renderProgressTable(window.userConfig.currentDomain, window.globalProgressCache[window.userConfig.currentDomain]);
  }
}

/**
 * 스피드런 랭킹 리더보드 렌더링 함수
 */
export function renderLeaderboardUI(rankings) {
  // leaderboard.html 내부에 id="leaderboard-list" 인 빈 컨테이너가 있다고 가정합니다.
  const listContainer = document.getElementById('leaderboard-list');
  if (!listContainer) {
    console.warn("[Leaderboard] 랭킹을 표시할 '#leaderboard-list' 엘리먼트를 찾을 수 없습니다.");
    return;
  }

  // 하드코딩된 기존 더미 데이터(1, 2, 3, 10, 32위 등)를 모두 초기화하여 비움
  listContainer.innerHTML = '';

  if (!rankings || rankings.length === 0) {
    listContainer.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 30px; color:#777;">등록된 스피드런 기록이 없습니다.</td></tr>';
    return;
  }

  // 도메인 치환용 맵
  const domainMap = {
    'hira': 'あ',
    'kata': 'ア',
    'hangle': '가',
    'english(a)': 'a',
    'english(A)': 'A',
    'english': 'a',
    'ENGLISH': 'A',
    'alphabet': 'a'
  };

  // DB에서 불러온 실제 데이터로 1위부터 순차적으로 DOM 요소 생성
  let html = '';
  rankings.forEach((entry, index) => {
    const rank = index + 1; // 1위부터 순차적으로 계산
    const isTop3 = rank <= 3;
    const rankStyle = isTop3 ? 'font-weight:bold; color:#FF9800;' : 'color:#555;';

    let displayName = entry.name || '게스트';
    if (displayName.startsWith('GUEST_')) {
      displayName = 'G_' + displayName.substring(6, 10) + '...';
    }

    let domainDisplay = domainMap[entry.domain] || entry.domain || '';

    html += `
      <tr>
        <td style="text-align:center; ${rankStyle} font-size:16px;">${rank}</td>
        <td style="font-weight:bold; color:#333; text-align:center;">${displayName}</td>
        <td style="text-align:center;">${domainDisplay} <span style="font-size:11px; color:#999;">(${entry.charCount || 0})</span></td>
        <td style="text-align:center; font-weight:bold; color:#2196F3;">${entry.elapsedStr || '-'}</td>
        <td style="text-align:center;">${entry.accuracy || 0}%</td>
        <td style="text-align:center; font-size:11px; color:#aaa;">${entry.updatedAt}</td>
      </tr>
    `;
  });

  listContainer.innerHTML = html;
}