/**
 * @file modules/features/site-history.js
 * @module SiteModules.UpdateLog
 * @description 홈 화면의 변경 이력 달력: changelog.json/holidays.json을 불러와 달력·필터·상세 팝업을 렌더링한다.
 * @requires SiteModules.Header (달력의 필터와 화면별 설정을 헤더 패널에 등록)
 * @exports getUpdateList, clearUpdateList, toggle
 */

window.SiteModules = window.SiteModules || {};

window.SiteModules.UpdateLog = (function () {
  const DEFAULT_YEARS = [2026, 2025, 2024];
  const DEFAULT_ENVS = ['iseohyun.com', 'WebApp', 'Android', 'Desktop', 'Video'];
  const DEFAULT_TYPES = ['Add', 'Changed', 'Fixed', 'Deleted'];
  const DEFAULT_SEARCH_TARGETS = ['title', 'content', 'category'];

  let filterState = {
    years: [...DEFAULT_YEARS],
    envs: [...DEFAULT_ENVS],
    types: [...DEFAULT_TYPES],
    searchText: '',
    searchTargets: [...DEFAULT_SEARCH_TARGETS],
    hasUserFiltered: false
  };

  let cachedUpdates = null;
  let cachedHierarchy = null;
  let cachedHolidays = new Map();

  function buildHolidayMap(rawData) {
    const map = new Map();
    if (!rawData || typeof rawData !== 'object') return map;
    Object.entries(rawData).forEach(([key, val]) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
        const list = Array.isArray(val) ? val : [String(val)];
        map.set(key, list.filter(Boolean));
      } else if (val && typeof val === 'object' && !Array.isArray(val)) {
        Object.entries(val).forEach(([dateKey, names]) => {
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
            const list = Array.isArray(names) ? names : [String(names)];
            map.set(dateKey, list.filter(Boolean));
          }
        });
      }
    });
    return map;
  }

  const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];

  const ENV_CLASS_MAP = {
    'iseohyun.com': 'env-iseohyun',
    'WebApp': 'env-webapp',
    'Android': 'env-android',
    'Desktop': 'env-desktop',
    'Video': 'env-video'
  };

  const TYPE_CLASS_MAP = {
    'Add': 'type-add',
    'Changed': 'type-changed',
    'Fixed': 'type-fixed',
    'Deleted': 'type-deleted'
  };

  const TYPE_BADGE_MAP = {
    'Add': { emoji: '✨', label: 'Add' },
    'Changed': { emoji: '♻️', label: 'Changed' },
    'Fixed': { emoji: '🐛', label: 'Fixed' },
    'Deleted': { emoji: '🔥', label: 'Deleted' }
  };

  // 점 달력 펼침 패널의 높이 전환 시간(ms). index.html의 .cal-day-detail-anim transition 값과 같아야 한다.
  const DAY_DETAIL_ANIMATION_MS = 250;

  let bgAlphaPercent = 25;
  let titleFontSizePx = 9;
  let contentFontSizePx = 8;
  try {
    const savedPct = parseInt(localStorage.getItem('cal_env_bg_percent_v2') || '25', 10);
    if (!isNaN(savedPct) && savedPct >= 5 && savedPct <= 100) {
      bgAlphaPercent = savedPct;
    }
    const savedTitlePx = parseInt(localStorage.getItem('cal_title_font_size_px_v2') || '9', 10);
    if (!isNaN(savedTitlePx) && savedTitlePx >= 1 && savedTitlePx <= 24) {
      titleFontSizePx = savedTitlePx;
    }
    const savedContentPx = parseInt(localStorage.getItem('cal_content_font_size_px_v2') || '8', 10);
    if (!isNaN(savedContentPx) && savedContentPx >= 1 && savedContentPx <= 22) {
      contentFontSizePx = savedContentPx;
    }
  } catch (e) {}

  function applyBgAlphaPercent(pct) {
    bgAlphaPercent = Math.max(5, Math.min(100, Number(pct) || 25));
    document.documentElement.style.setProperty('--cal-env-bg-alpha', (bgAlphaPercent / 100).toFixed(2));
    try {
      localStorage.setItem('cal_env_bg_percent_v2', String(bgAlphaPercent));
    } catch (e) {}
  }

  function applyTitleFontSizePx(px) {
    titleFontSizePx = Math.max(1, Math.min(24, Number(px) || 9));
    // 브라우저 최소 글꼴 크기 제한(10px~12px)을 우회하기 위해 12px 미만은 기준 12px + zoom 비율로 렌더링
    if (titleFontSizePx < 12) {
      document.documentElement.style.setProperty('--cal-title-font-size', '12px');
      document.documentElement.style.setProperty('--cal-title-zoom', (titleFontSizePx / 12).toFixed(4));
    } else {
      document.documentElement.style.setProperty('--cal-title-font-size', `${titleFontSizePx}px`);
      document.documentElement.style.setProperty('--cal-title-zoom', '1');
    }
    try {
      localStorage.setItem('cal_title_font_size_px_v2', String(titleFontSizePx));
    } catch (e) {}
  }

  function applyContentFontSizePx(px) {
    contentFontSizePx = Math.max(1, Math.min(22, Number(px) || 8));
    if (contentFontSizePx < 12) {
      document.documentElement.style.setProperty('--cal-content-font-size', '12px');
      document.documentElement.style.setProperty('--cal-content-zoom', (contentFontSizePx / 12).toFixed(4));
    } else {
      document.documentElement.style.setProperty('--cal-content-font-size', `${contentFontSizePx}px`);
      document.documentElement.style.setProperty('--cal-content-zoom', '1');
    }
    try {
      localStorage.setItem('cal_content_font_size_px_v2', String(contentFontSizePx));
    } catch (e) {}
  }

  applyBgAlphaPercent(bgAlphaPercent);
  applyTitleFontSizePx(titleFontSizePx);
  applyContentFontSizePx(contentFontSizePx);

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function parseDateString(dateStr) {
    if (!dateStr) return new Date();
    if (dateStr instanceof Date) {
      return new Date(dateStr.getFullYear(), dateStr.getMonth(), dateStr.getDate());
    }
    const parts = String(dateStr).trim().split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    const d = new Date(dateStr);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function toDateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function formatDateWithDay(dateStr) {
    const d = parseDateString(dateStr);
    const dayName = daysOfWeek[d.getDay()];
    return `${toDateKey(d)} (${dayName})`;
  }

  // 분류(type) 정규화 -> 'Add' | 'Changed' | 'Fixed' | 'Deleted'
  function normalizeTypeKey(item) {
    if (typeof item === 'string') {
      if (item.includes('[신규]') || item.includes('[추가]')) return 'Add';
      if (item.includes('[bugfix]') || item.includes('[개선]')) return 'Fixed';
      if (item.includes('[삭제]')) return 'Deleted';
      return 'Changed';
    }
    const t = String(item.type || 'Changed').toLowerCase();
    if (t === 'added' || t === 'add' || t === 'new') return 'Add';
    if (t === 'fixed' || t === 'bugfix') return 'Fixed';
    if (t === 'removed' || t === 'deleted' || t === 'delete') return 'Deleted';
    return 'Changed';
  }

  // 환경(env) 정규화 -> 배열 반환 (예: ['WebApp'] 또는 ['Desktop', 'Android'])
  function normalizeEnvList(item) {
    if (!item || typeof item === 'string') return ['iseohyun.com'];
    if (Array.isArray(item.env) && item.env.length > 0) {
      return item.env;
    }
    if (typeof item.env === 'string' && item.env.trim() !== '') {
      return [item.env.trim()];
    }
    const pPath = item.projectPath || '';
    if (pPath.includes('youtube.com')) return ['Video'];
    if (pPath.startsWith('/small-project/') || pPath.startsWith('http')) return ['WebApp'];
    return ['iseohyun.com'];
  }

  // 계층 경로 찾기 함수
  function findPath(hierarchy, title, currentPath = '') {
    if (!hierarchy || !title) return null;
    const cleanTitle = title.replace(/\s*\(\s*v\d+(?:\.\d+)*\s*\)/gi, '');
    const titles = cleanTitle.split('>');
    let path = currentPath;

    for (const currentTitle of titles) {
      let found = false;

      for (const item of hierarchy) {
        if (item.주제 === currentTitle.trim()) {
          path += item.디렉토리 || '';

          if (item.목록) {
            hierarchy = item.목록;
            found = true;
            break;
          } else {
            const fileName = Object.prototype.hasOwnProperty.call(item, '파일명') ? item.파일명 : 'index.html';
            return '/' + (path + fileName).replace(/^\/+/, '');
          }
        }
      }

      if (!found) {
        return null;
      }
    }

    return '/' + path.replace(/^\/+/, '');
  }

  // 개별 이벤트가 현재 필터 조건에 부합하는지 검사
  function matchesEventFilter(ev) {
    // 1. 연도 필터
    if (!filterState.years.includes(ev.year)) {
      return false;
    }

    // 2. 환경 필터 (복수 선택)
    const hasEnvMatch = ev.envs.some(e => filterState.envs.includes(e));
    if (!hasEnvMatch) {
      return false;
    }

    // 3. 분류 필터 (복수 선택)
    if (!filterState.types.includes(ev.typeKey)) {
      return false;
    }

    // 4. 검색어 필터
    const query = filterState.searchText.trim().toLowerCase();
    if (query.length > 0) {
      if (filterState.searchTargets.length === 0) {
        return false;
      }
      const item = ev.raw;
      const titleStr = (typeof item === 'string' ? item : (item.projectName || '')).toLowerCase();
      const contentStr = (typeof item === 'string' ? '' : `${item.summary || ''} ${item.detail || ''}`).toLowerCase();
      const categoryStr = `${ev.envs.join(' ')} ${ev.typeKey} ${item.type || ''} ${item.projectPath || ''}`.toLowerCase();

      let matchedQuery = false;
      if (filterState.searchTargets.includes('title') && titleStr.includes(query)) {
        matchedQuery = true;
      }
      if (!matchedQuery && filterState.searchTargets.includes('content') && contentStr.includes(query)) {
        matchedQuery = true;
      }
      if (!matchedQuery && filterState.searchTargets.includes('category') && categoryStr.includes(query)) {
        matchedQuery = true;
      }
      if (!matchedQuery) {
        return false;
      }
    }

    return true;
  }

  function ensureDetailModal() {
    let modal = document.getElementById('changelog-detail-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'changelog-detail-modal';
    modal.className = 'cal-modal-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="cal-modal-card">
        <div class="cal-modal-header">
          <div class="cal-modal-meta" id="cal-modal-meta"></div>
          <button type="button" class="cal-modal-close" id="cal-modal-close" title="닫기 (ESC)">&times;</button>
        </div>
        <div class="cal-modal-body" id="cal-modal-body"></div>
      </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('#cal-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
      });
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        modal.classList.remove('active');
      }
    });

    return modal;
  }

  function openEventDetailPopup(dateStr, ev, hierarchy) {
    const modal = ensureDetailModal();
    const metaEl = modal.querySelector('#cal-modal-meta');
    const bodyEl = modal.querySelector('#cal-modal-body');

    const item = ev.raw;
    const typeKey = ev.typeKey;
    const badgeClassMap = { Add: 'added', Changed: 'changed', Fixed: 'fixed', Deleted: 'removed' };
    const iconMap = { Add: '✨', Changed: '♻️', Fixed: '🐛', Deleted: '🔥' };
    const labelMap = { Add: '추가 (Add)', Changed: '수정 (Changed)', Fixed: '개선 (Fixed)', Deleted: '삭제 (Deleted)' };

    const badgeClass = badgeClassMap[typeKey] || 'changed';
    const envBadgesHtml = ev.envs.map(envName => {
      const envCls = ENV_CLASS_MAP[envName] || 'env-iseohyun';
      return `<span class="cal-modal-env-badge ${envCls}">${escapeHtml(envName)}</span>`;
    }).join('');

    const badgeHtml = `<span class="changelog-badge ${badgeClass}">${iconMap[typeKey]} ${labelMap[typeKey]}</span>`;
    const dateHtml = `<span class="cal-modal-date">${escapeHtml(formatDateWithDay(dateStr))}</span>`;
    metaEl.innerHTML = `${badgeHtml}${envBadgesHtml}${dateHtml}`;

    const projectName = item.projectName || '업데이트';
    const verHtml = item.version ? `<span class="cal-modal-version">v${escapeHtml(item.version)}</span>` : '';
    const summaryText = item.summary || '';
    const detailText = item.detail || item.summary || '';

    const resolvedPath = item.projectPath || findPath(hierarchy, projectName);
    let actionHtml = '';
    if (resolvedPath) {
      const isExternal = resolvedPath.startsWith('http://') || resolvedPath.startsWith('https://');
      if (isExternal) {
        actionHtml = `
          <div class="cal-modal-actions">
            <a class="cal-modal-link-btn" href="${escapeHtml(resolvedPath)}" target="_blank" rel="noopener noreferrer">
              <span>사이트 / 저장소 바로가기</span>
              <span class="material-symbols-outlined" style="font-size:17px;">open_in_new</span>
            </a>
          </div>
        `;
      } else {
        actionHtml = `
          <div class="cal-modal-actions">
            <a class="cal-modal-link-btn" href="${escapeHtml(resolvedPath)}" id="cal-modal-internal-link">
              <span>해당 페이지로 이동</span>
              <span class="material-symbols-outlined" style="font-size:17px;">arrow_forward</span>
            </a>
          </div>
        `;
      }
    }

    const formattedDetail = escapeHtml(detailText).replace(/\n/g, '<br>');
    const titleColorClass = TYPE_CLASS_MAP[typeKey] || 'type-changed';

    bodyEl.innerHTML = `
      <div class="cal-modal-title-row">
        <h3 class="cal-modal-title ${titleColorClass}">${escapeHtml(projectName)}</h3>
        ${verHtml}
      </div>
      ${summaryText ? `<div class="cal-modal-summary">${escapeHtml(summaryText)}</div>` : ''}
      ${formattedDetail && formattedDetail !== escapeHtml(summaryText) ? `
        <div class="cal-modal-detail-section">
          <div class="cal-modal-detail-label">상세 내용</div>
          <div class="cal-modal-detail-box">${formattedDetail}</div>
        </div>
      ` : ''}
      ${actionHtml}
    `;

    const internalLink = bodyEl.querySelector('#cal-modal-internal-link');
    if (internalLink) {
      internalLink.addEventListener('click', () => {
        modal.classList.remove('active');
      });
    }

    modal.classList.add('active');
  }

  // 달력의 필터와 화면별 설정을 만들어 헤더 패널(필터 아이콘 / 설정 아이콘)에 등록한다
  function buildHeaderPanels(targetId) {
    const filterContent = document.createElement('div');
    filterContent.className = 'cal-filter-content';
    const settingsContent = document.createElement('div');
    settingsContent.className = 'cal-filter-content';

    filterContent.innerHTML = `
        <table class="cal-filter-table">
          <tbody>
            <tr>
              <th>연도</th>
              <td>
                <div class="cal-filter-options">
                  <label class="cal-filter-chip">
                    <input type="checkbox" name="cal-year" value="2026" checked>
                    <span>2026</span>
                  </label>
                  <label class="cal-filter-chip">
                    <input type="checkbox" name="cal-year" value="2025" checked>
                    <span>2025</span>
                  </label>
                  <label class="cal-filter-chip">
                    <input type="checkbox" name="cal-year" value="2024" checked>
                    <span>2024</span>
                  </label>
                </div>
              </td>
            </tr>
            <tr>
              <th>환경</th>
              <td>
                <div class="cal-filter-options">
                  <label class="cal-filter-chip env-chip env-iseohyun">
                    <input type="checkbox" name="cal-env" value="iseohyun.com" checked>
                    <span>iseohyun.com</span>
                  </label>
                  <label class="cal-filter-chip env-chip env-webapp">
                    <input type="checkbox" name="cal-env" value="WebApp" checked>
                    <span>WebApp</span>
                  </label>
                  <label class="cal-filter-chip env-chip env-android">
                    <input type="checkbox" name="cal-env" value="Android" checked>
                    <span>Android</span>
                  </label>
                  <label class="cal-filter-chip env-chip env-desktop">
                    <input type="checkbox" name="cal-env" value="Desktop" checked>
                    <span>Desktop</span>
                  </label>
                  <label class="cal-filter-chip env-chip env-video">
                    <input type="checkbox" name="cal-env" value="Video" checked>
                    <span>Video</span>
                  </label>
                </div>
              </td>
            </tr>
            <tr>
              <th>분류</th>
              <td>
                <div class="cal-filter-options">
                  <label class="cal-filter-chip type-chip">
                    <input type="checkbox" name="cal-type" value="Add" checked>
                    <span class="cal-filter-type-emoji">✨</span>
                    <span class="type-add">Add</span>
                  </label>
                  <label class="cal-filter-chip type-chip">
                    <input type="checkbox" name="cal-type" value="Changed" checked>
                    <span class="cal-filter-type-emoji">♻️</span>
                    <span class="type-changed">Changed</span>
                  </label>
                  <label class="cal-filter-chip type-chip">
                    <input type="checkbox" name="cal-type" value="Fixed" checked>
                    <span class="cal-filter-type-emoji">🐛</span>
                    <span class="type-fixed">Fixed</span>
                  </label>
                  <label class="cal-filter-chip type-chip">
                    <input type="checkbox" name="cal-type" value="Deleted" checked>
                    <span class="cal-filter-type-emoji">🔥</span>
                    <span class="type-deleted">Deleted</span>
                  </label>
                </div>
              </td>
            </tr>
            <tr>
              <th>검색</th>
              <td>
                <div class="cal-filter-options cal-search-options">
                  <input type="text" id="cal-search-input" class="cal-search-input" placeholder="검색어 입력..." autocomplete="off">
                  <label class="cal-filter-chip">
                    <input type="checkbox" name="cal-search-target" value="title" checked>
                    <span>제목</span>
                  </label>
                  <label class="cal-filter-chip">
                    <input type="checkbox" name="cal-search-target" value="content" checked>
                    <span>내용</span>
                  </label>
                  <label class="cal-filter-chip">
                    <input type="checkbox" name="cal-search-target" value="category" checked>
                    <span>분류</span>
                  </label>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
    `;

    settingsContent.innerHTML = `
        <table class="cal-filter-table cal-settings-table">
          <tbody>
            <tr>
              <th>배경농도</th>
              <td>
                <div class="cal-settings-wrap">
                  <input type="range" id="cal-bg-alpha-slider" class="cal-bg-slider" min="5" max="100" step="1" value="${bgAlphaPercent}">
                  <span id="cal-bg-alpha-label" class="cal-bg-percent-label">${bgAlphaPercent}%</span>
                </div>
              </td>
            </tr>
            <tr>
              <th>제목크기</th>
              <td>
                <div class="cal-settings-wrap">
                  <input type="range" id="cal-title-size-slider" class="cal-bg-slider" min="1" max="24" step="1" value="${titleFontSizePx}">
                  <span id="cal-title-size-label" class="cal-bg-percent-label">${titleFontSizePx}px</span>
                </div>
              </td>
            </tr>
            <tr>
              <th>내용크기</th>
              <td>
                <div class="cal-settings-wrap">
                  <input type="range" id="cal-content-size-slider" class="cal-bg-slider" min="1" max="22" step="1" value="${contentFontSizePx}">
                  <span id="cal-content-size-label" class="cal-bg-percent-label">${contentFontSizePx}px</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
    `;

    window.SiteModules.Header.setPanels({ filter: filterContent, settings: settingsContent });

    // 기본값에서 하나라도 벗어나 있으면 필터가 걸린 것으로 본다
    function isFilterApplied() {
      return filterState.years.length !== DEFAULT_YEARS.length
        || filterState.envs.length !== DEFAULT_ENVS.length
        || filterState.types.length !== DEFAULT_TYPES.length
        || filterState.searchTargets.length !== DEFAULT_SEARCH_TARGETS.length
        || filterState.searchText.trim() !== '';
    }

    function syncFilterStateAndRender() {
      const checkedYears = Array.from(filterContent.querySelectorAll('input[name="cal-year"]:checked'))
        .map(el => parseInt(el.value, 10));
      const checkedEnvs = Array.from(filterContent.querySelectorAll('input[name="cal-env"]:checked'))
        .map(el => el.value);
      const checkedTypes = Array.from(filterContent.querySelectorAll('input[name="cal-type"]:checked'))
        .map(el => el.value);
      const checkedTargets = Array.from(filterContent.querySelectorAll('input[name="cal-search-target"]:checked'))
        .map(el => el.value);
      const searchInput = filterContent.querySelector('#cal-search-input');

      filterState.years = checkedYears;
      filterState.envs = checkedEnvs;
      filterState.types = checkedTypes;
      filterState.searchTargets = checkedTargets;
      filterState.searchText = searchInput ? searchInput.value : '';
      filterState.hasUserFiltered = true;
      window.SiteModules.Header.setFilterActive(isFilterApplied());

      renderCalendar(targetId);
    }

    filterContent.querySelectorAll('input[type="checkbox"]').forEach(chk => {
      chk.addEventListener('change', syncFilterStateAndRender);
    });

    const searchInput = filterContent.querySelector('#cal-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', syncFilterStateAndRender);
    }

    const bgSlider = settingsContent.querySelector('#cal-bg-alpha-slider');
    const bgLabel = settingsContent.querySelector('#cal-bg-alpha-label');
    if (bgSlider) {
      bgSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (bgLabel) bgLabel.textContent = `${val}%`;
        applyBgAlphaPercent(val);
      });
    }

    const titleSlider = settingsContent.querySelector('#cal-title-size-slider');
    const titleLabel = settingsContent.querySelector('#cal-title-size-label');
    if (titleSlider) {
      titleSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (titleLabel) titleLabel.textContent = `${val}px`;
        applyTitleFontSizePx(val);
      });
    }

    const contentSlider = settingsContent.querySelector('#cal-content-size-slider');
    const contentLabel = settingsContent.querySelector('#cal-content-size-label');
    if (contentSlider) {
      contentSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (contentLabel) contentLabel.textContent = `${val}px`;
        applyContentFontSizePx(val);
      });
    }
  }

  function renderCalendar(targetId = 'site-history') {
    const container = document.getElementById(targetId);
    if (!container || !cachedUpdates) return;

    container.innerHTML = '';

    // 1. 전체 이벤트 정규화 및 필터링 수행
    const dateMap = new Map();
    const filteredEvents = [];

    cachedUpdates.forEach(entry => {
      if (!entry || !entry.date) return;
      const d = parseDateString(entry.date);
      const key = toDateKey(d);

      const rawItems = (Array.isArray(entry.updates) || Array.isArray(entry.content))
        ? (entry.updates || entry.content)
        : [entry];

      rawItems.forEach(item => {
        const typeKey = normalizeTypeKey(item);
        const envs = normalizeEnvList(item);
        const ev = {
          dateObj: d,
          dateKey: key,
          year: d.getFullYear(),
          typeKey: typeKey,
          envs: envs,
          raw: item
        };

        if (matchesEventFilter(ev)) {
          filteredEvents.push(ev);
          if (!dateMap.has(key)) {
            dateMap.set(key, []);
          }
          dateMap.get(key).push(ev);
        }
      });
    });

    // 2. 달력 테이블 기본 뼈대 생성 (thead: 일, 월, 화, 수, 목, 금, 토)
    const tableWrap = document.createElement('div');
    tableWrap.className = 'update-calendar-wrapper';

    const table = document.createElement('table');
    table.className = 'update-calendar-table';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    daysOfWeek.forEach((dayName, idx) => {
      const th = document.createElement('th');
      th.textContent = dayName;
      if (idx === 0) th.className = 'sun-col';
      if (idx === 6) th.className = 'sat-col';
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    // 필터 결과가 0건인 경우 빈 안내 행 출력
    if (filteredEvents.length === 0) {
      const emptyTr = document.createElement('tr');
      const emptyTd = document.createElement('td');
      emptyTd.colSpan = 7;
      emptyTd.style.cssText = 'padding: 40px 16px; text-align: center; color: #64748b; font-weight: 600;';
      emptyTd.textContent = '선택한 필터 조건에 일치하는 업데이트 이벤트가 없습니다.';
      emptyTr.appendChild(emptyTd);
      tbody.appendChild(emptyTr);
      table.appendChild(tbody);
      tableWrap.appendChild(table);
      container.appendChild(tableWrap);
      return;
    }

    // 3. 기준 주(1행) 및 마지막 주 계산
    // - 초기 로드 상태에서는 오늘(Today)이 포함된 주가 1행
    // - 필터가 선택/변경된 경우, 필터된 최신 이벤트 날짜가 포함된 주가 1행!
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayKey = toDateKey(today);

    const maxFilteredTime = Math.max(...filteredEvents.map(ev => ev.dateObj.getTime()));
    const minFilteredTime = Math.min(...filteredEvents.map(ev => ev.dateObj.getTime()));
    const latestEventDate = new Date(maxFilteredTime);
    const earliestEventDate = new Date(minFilteredTime);

    const anchorEndDate = filterState.hasUserFiltered
      ? latestEventDate
      : (today > latestEventDate ? today : latestEventDate);

    const firstRowSunday = new Date(
      anchorEndDate.getFullYear(),
      anchorEndDate.getMonth(),
      anchorEndDate.getDate() - anchorEndDate.getDay()
    );

    const lastRowSunday = new Date(
      earliestEventDate.getFullYear(),
      earliestEventDate.getMonth(),
      earliestEventDate.getDate() - earliestEventDate.getDay()
    );

    const totalWeeks = Math.max(
      1,
      Math.round((firstRowSunday.getTime() - lastRowSunday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
    );

    function formatDotDate(d) {
      return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
    }

    // 좁은 화면의 점 달력: 점을 누르면 해당 주 바로 아래에 이벤트 1건을 펼쳐 보여준다 (한 번에 1개만 열림)
    let openDayDetail = null; // { row, dot }

    function closeDayDetail() {
      if (!openDayDetail) return;
      const { row, dot } = openDayDetail;
      openDayDetail = null;

      dot.classList.remove('is-active');
      dot.setAttribute('aria-expanded', 'false');

      const anim = row.querySelector('.cal-day-detail-anim');
      const removeRow = () => row.remove();
      anim.addEventListener('transitionend', removeRow, { once: true });
      // transitionend가 오지 않는 경우(모션 축소 설정, 숨김 상태 등)를 대비한 보조 제거
      setTimeout(removeRow, DAY_DETAIL_ANIMATION_MS + 100);
      anim.classList.remove('is-open');
    }

    function toggleDayDetail(weekTr, dot, info) {
      const isSameDot = openDayDetail && openDayDetail.dot === dot;
      closeDayDetail();
      if (isSameDot) return;

      const row = document.createElement('tr');
      row.className = 'cal-day-detail-row';
      const cell = document.createElement('td');
      cell.colSpan = 7;
      cell.className = 'cal-day-detail-cell';

      const anim = document.createElement('div');
      anim.className = 'cal-day-detail-anim';
      const inner = document.createElement('div');
      inner.className = 'cal-day-detail-inner';

      const card = document.createElement('div');
      card.className = `cal-day-detail-card ${info.envClass}`;

      const meta = document.createElement('div');
      meta.className = 'cal-day-detail-meta';
      meta.textContent = `${info.badgeInfo.emoji} ${info.badgeInfo.label} · ${formatDateWithDay(info.dateKey)}`;

      const title = document.createElement('strong');
      title.className = 'cal-day-detail-title';
      title.textContent = info.projectName;

      card.append(meta, title);

      if (info.summaryText) {
        const summary = document.createElement('p');
        summary.className = 'cal-day-detail-summary';
        summary.textContent = info.summaryText;
        card.appendChild(summary);
      }

      const moreBtn = document.createElement('button');
      moreBtn.type = 'button';
      moreBtn.className = 'cal-day-detail-more';
      moreBtn.textContent = '자세히 보기';
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEventDetailPopup(info.dateKey, info.ev, cachedHierarchy);
      });
      card.appendChild(moreBtn);

      inner.appendChild(card);
      anim.appendChild(inner);
      cell.appendChild(anim);
      row.appendChild(cell);
      weekTr.after(row);

      dot.classList.add('is-active');
      dot.setAttribute('aria-expanded', 'true');
      openDayDetail = { row, dot };

      // 닫힌 상태의 레이아웃을 먼저 확정(강제 리플로우)해야 높이 전환 애니메이션이 재생된다
      void anim.offsetHeight;
      anim.classList.add('is-open');
    }

    const weekRows = [];

    for (let w = 0; w < totalWeeks; w++) {
      const weekSunday = new Date(
        firstRowSunday.getFullYear(),
        firstRowSunday.getMonth(),
        firstRowSunday.getDate() - w * 7
      );
      const weekSaturday = new Date(
        weekSunday.getFullYear(),
        weekSunday.getMonth(),
        weekSunday.getDate() + 6
      );

      // 선택된 연도에 속하는 날짜가 하루도 없는 주는 건너뜀 (단, 1행은 항상 표시)
      if (w > 0) {
        let hasActiveYearDay = false;
        for (let i = 0; i < 7; i++) {
          const d = new Date(weekSunday.getFullYear(), weekSunday.getMonth(), weekSunday.getDate() + i);
          if (filterState.years.includes(d.getFullYear())) {
            hasActiveYearDay = true;
            break;
          }
        }
        if (!hasActiveYearDay) continue;
      }

      const tr = document.createElement('tr');
      let weekEventCount = 0;

      for (let dIdx = 0; dIdx < 7; dIdx++) {
        const cellDate = new Date(
          weekSunday.getFullYear(),
          weekSunday.getMonth(),
          weekSunday.getDate() + dIdx
        );
        const cellKey = toDateKey(cellDate);
        const isToday = cellKey === todayKey;
        const isFirstOfMonth = cellDate.getDate() === 1;
        const holidayNames = cachedHolidays.get(cellKey) || [];
        const isHoliday = holidayNames.length > 0;

        const td = document.createElement('td');
        td.className = 'cal-cell';
        if (dIdx === 0) td.classList.add('sun-cell');
        if (dIdx === 6) td.classList.add('sat-cell');
        if (isHoliday) td.classList.add('holiday-cell');
        if (isToday) td.classList.add('is-today');
        if (!filterState.years.includes(cellDate.getFullYear()) && !isToday) {
          td.classList.add('out-of-year');
        }

        // 셀 상단 날짜 표시줄
        const dateHeader = document.createElement('div');
        dateHeader.className = 'cal-date-header';

        const dateLabel = document.createElement('span');
        dateLabel.className = 'cal-date-num';
        if (isFirstOfMonth || (w === 0 && dIdx === 0)) {
          const yearPrefix = (cellDate.getMonth() === 0 && isFirstOfMonth) || (w === 0 && dIdx === 0)
            ? `${cellDate.getFullYear()}.`
            : '';
          dateLabel.textContent = `${yearPrefix}${cellDate.getMonth() + 1}.${cellDate.getDate()}`;
          if (isFirstOfMonth) dateLabel.classList.add('month-start-badge');
        } else {
          dateLabel.textContent = `${cellDate.getMonth() + 1}.${cellDate.getDate()}`;
        }
        dateHeader.appendChild(dateLabel);

        if (isHoliday || isToday) {
          const rightGroup = document.createElement('div');
          rightGroup.className = 'cal-date-right';

          if (isHoliday) {
            const holidayBadge = document.createElement('span');
            holidayBadge.className = 'cal-holiday-label';
            const joinedHoliday = holidayNames.join(' · ');
            holidayBadge.textContent = joinedHoliday;
            holidayBadge.title = joinedHoliday;
            rightGroup.appendChild(holidayBadge);
          }

          if (isToday) {
            const todayBadge = document.createElement('span');
            todayBadge.className = 'cal-today-badge';
            todayBadge.textContent = '오늘';
            rightGroup.appendChild(todayBadge);
          }

          dateHeader.appendChild(rightGroup);
        }

        td.appendChild(dateHeader);

        // 해당 날짜의 필터링된 이벤트 카드 렌더링
        const dayEvents = dateMap.get(cellKey) || [];
        if (dayEvents.length > 0) {
          weekEventCount += dayEvents.length;
          const eventsWrap = document.createElement('div');
          eventsWrap.className = 'cal-events-wrap';
          // 좁은 화면 전용: 카드 대신 이벤트당 점 1개를 표시 (CSS가 화면 너비에 따라 둘 중 하나만 노출)
          const dotsWrap = document.createElement('div');
          dotsWrap.className = 'cal-dots';

          dayEvents.forEach(ev => {
            const item = ev.raw;
            // 배경색: 활성화된 환경 중 첫 번째 매칭 환경 색상 적용
            const matchedEnv = ev.envs.find(e => filterState.envs.includes(e)) || ev.envs[0] || 'iseohyun.com';
            const envClass = ENV_CLASS_MAP[matchedEnv] || 'env-iseohyun';
            // 우상단 border 걸침 배지: 분류(type) 이모지 배지
            const badgeInfo = TYPE_BADGE_MAP[ev.typeKey] || TYPE_BADGE_MAP.Changed;

            const card = document.createElement('div');
            card.className = `cal-event-card ${envClass}`;

            const projectName = typeof item === 'string' ? item : (item.projectName || '업데이트');
            const summaryText = typeof item === 'string' ? '' : (item.summary || '');

            card.innerHTML = `<span class="cal-type-badge" title="${escapeHtml(badgeInfo.label)}">${badgeInfo.emoji}</span><strong class="cal-event-project" title="${escapeHtml(projectName)}">${escapeHtml(projectName)}</strong>${
              summaryText ? `<span class="cal-event-summary">${escapeHtml(summaryText)}</span>` : ''
            }`;

            card.addEventListener('click', (e) => {
              e.stopPropagation();
              openEventDetailPopup(cellKey, ev, cachedHierarchy);
            });

            eventsWrap.appendChild(card);

            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = `cal-dot ${envClass.replace('env-', 'dot-')}`;
            dot.setAttribute('aria-label', `${projectName}${summaryText ? ': ' + summaryText : ''}`);
            dot.setAttribute('aria-expanded', 'false');
            dot.addEventListener('click', (e) => {
              e.stopPropagation();
              toggleDayDetail(tr, dot, {
                dateKey: cellKey,
                ev: ev,
                envClass: envClass,
                badgeInfo: badgeInfo,
                projectName: projectName,
                summaryText: summaryText
              });
            });
            dotsWrap.appendChild(dot);
          });

          td.appendChild(eventsWrap);
          td.appendChild(dotsWrap);
        }

        tr.appendChild(td);
      }

      weekRows.push({
        w,
        weekSunday,
        weekSaturday,
        tr,
        isEmpty: weekEventCount === 0
      });
    }

    // 4. 한 주간 내용이 없는 경우 기본 접기 제공 (연속된 빈 주는 하나로 묶어서 접기)
    let idx = 0;
    while (idx < weekRows.length) {
      const current = weekRows[idx];
      if (!current.isEmpty) {
        tbody.appendChild(current.tr);
        idx++;
        continue;
      }

      const emptyGroup = [];
      while (idx < weekRows.length && weekRows[idx].isEmpty) {
        emptyGroup.push(weekRows[idx]);
        idx++;
      }

      const newestSat = emptyGroup[0].weekSaturday;
      const oldestSun = emptyGroup[emptyGroup.length - 1].weekSunday;
      const rangeLabel = `${formatDotDate(oldestSun)} ~ ${formatDotDate(newestSat)}`;
      const weekCountLabel = emptyGroup.length === 1
        ? '1주간 내용 없음'
        : `${emptyGroup.length}주 연속 내용 없음`;

      const toggleTr = document.createElement('tr');
      toggleTr.className = 'cal-empty-weeks-toggle-row';
      toggleTr.title = '클릭하여 빈 주간 펼치기/접기';

      const toggleTd = document.createElement('td');
      toggleTd.colSpan = 7;
      toggleTd.className = 'cal-empty-weeks-toggle-cell';
      toggleTd.innerHTML = `
        <div class="cal-empty-weeks-bar">
          <span class="cal-empty-weeks-chevron">▶</span>
          <span class="cal-empty-weeks-range">${escapeHtml(rangeLabel)}</span>
          <span class="cal-empty-weeks-badge">${escapeHtml(weekCountLabel)}</span>
          <span class="cal-empty-weeks-action">펼치기</span>
        </div>
      `;
      toggleTr.appendChild(toggleTd);

      const actionSpan = toggleTd.querySelector('.cal-empty-weeks-action');
      toggleTr.addEventListener('click', () => {
        const expanded = toggleTr.classList.toggle('is-expanded');
        emptyGroup.forEach(item => {
          item.tr.classList.toggle('is-collapsed', !expanded);
        });
        if (actionSpan) {
          actionSpan.textContent = expanded ? '접기' : '펼치기';
        }
      });

      tbody.appendChild(toggleTr);
      emptyGroup.forEach(item => {
        item.tr.classList.add('cal-empty-week-row', 'is-collapsed');
        tbody.appendChild(item.tr);
      });
    }

    table.appendChild(tbody);
    tableWrap.appendChild(table);
    container.appendChild(tableWrap);
  }

  async function getUpdateList(cnt = 'all', date = '2023-01-01', edate = '', keywords = '', targetId = 'site-history') {
    const updateList = document.getElementById(targetId);
    if (!updateList) return;

    if (targetId === 'site-history') {
      filterState = {
        years: [...DEFAULT_YEARS],
        envs: [...DEFAULT_ENVS],
        types: [...DEFAULT_TYPES],
        searchText: '',
        searchTargets: [...DEFAULT_SEARCH_TARGETS],
        hasUserFiltered: false
      };
      buildHeaderPanels(targetId);
    }

    try {
      // hierarchy.json은 Navigation이 이미 받아둔 캐시가 있으면 재사용한다
      const preloadedHierarchy = window.SiteModules.hierarchyListCached;
      const [updatesResponse, hierarchyData, holidaysResponse] = await Promise.all([
        fetch('/changelog.json', { cache: 'no-cache' }),
        preloadedHierarchy ? Promise.resolve(preloadedHierarchy) : fetch('/hierarchy.json').then(res => res.json()),
        fetch('/holidays.json', { cache: 'no-cache' }).catch(() => null)
      ]);
      if (!updatesResponse.ok) {
        throw new Error(`changelog.json 로드 실패 (status ${updatesResponse.status})`);
      }
      cachedUpdates = await updatesResponse.json();
      cachedHierarchy = hierarchyData;
      if (holidaysResponse && holidaysResponse.ok) {
        const rawHolidays = await holidaysResponse.json();
        cachedHolidays = buildHolidayMap(rawHolidays);
      }

      renderCalendar(targetId);
    } catch (error) {
      console.error('Error fetching or rendering changelog calendar:', error);
      const errorNotice = document.createElement('li');
      errorNotice.style.cssText = 'list-style: none; padding: 40px 10px; text-align: center; color: #747775;';
      errorNotice.textContent = '변경 이력을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.';
      updateList.appendChild(errorNotice);
    }
  }

  function clearUpdateList() {
    const updateList = document.getElementById('site-history');
    if (updateList) {
      updateList.innerHTML = '';
    }
  }

  function toggle(tag) {
    renderCalendar('site-history');
  }

  return {
    getUpdateList: getUpdateList,
    clearUpdateList: clearUpdateList,
    toggle: toggle
  };
})();

// 글로벌 객체 매핑 및 대기열(Queue) 실행 처리
(function () {
  const UpdateLog = window.SiteModules.UpdateLog;
  window.getUpdateList = UpdateLog.getUpdateList;
  window.clearUpdateList = UpdateLog.clearUpdateList;
  window.toggle = UpdateLog.toggle;

  if (window.SiteModules.updateLogQueue) {
    window.SiteModules.updateLogQueue.forEach(args => UpdateLog.getUpdateList(...args));
    delete window.SiteModules.updateLogQueue;
  }
  if (window.SiteModules.clearUpdateQueue) {
    window.SiteModules.clearUpdateQueue.forEach(args => UpdateLog.clearUpdateList(...args));
    delete window.SiteModules.clearUpdateQueue;
  }
  if (window.SiteModules.toggleQueue) {
    window.SiteModules.toggleQueue.forEach(args => UpdateLog.toggle(...args));
    delete window.SiteModules.toggleQueue;
  }
})();
