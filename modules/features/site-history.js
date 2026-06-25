// modules/features/site-history.js

window.SiteModules = window.SiteModules || {};

window.SiteModules.UpdateLog = (function() {
  let activeYears = [2024, 2025, 2026];
  let firstSelectedYear = null;
  let activeTag = 'all';

  function parseDateString(dateStr) {
    if (!dateStr) return new Date();
    if (dateStr instanceof Date) return dateStr;
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-based month
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date(dateStr);
  }

  function selectYear(Y) {
    if (Y === 'all') {
      activeYears = [2024, 2025, 2026];
      firstSelectedYear = null;
    } else {
      const yearNum = parseInt(Y, 10);
      if (activeYears.length === 3) {
        activeYears = [yearNum];
        firstSelectedYear = yearNum;
      } else {
        const anchor = firstSelectedYear !== null ? firstSelectedYear : yearNum;
        const min = Math.min(anchor, yearNum);
        const max = Math.max(anchor, yearNum);
        activeYears = [];
        for (let y = min; y <= max; y++) {
          activeYears.push(y);
        }
      }
    }
  }

  function updateHistoryDisplay() {
    const items = document.querySelectorAll("#site-history li");
    items.forEach(item => {
      const itemYear = parseInt(item.getAttribute("data-year"), 10);
      const matchesYear = activeYears.includes(itemYear);

      const contentSpans = item.querySelectorAll("div > span.content");
      let hasVisibleContent = false;

      contentSpans.forEach(span => {
        let matchesTag = false;
        if (activeTag === 'all') {
          matchesTag = true;
        } else {
          if (activeTag === 'new' && span.classList.contains('new')) matchesTag = true;
          if (activeTag === 'update' && (span.classList.contains('update') || span.classList.contains('modify'))) matchesTag = true;
          if (activeTag === 'bugfix' && span.classList.contains('bugfix')) matchesTag = true;
        }

        if (matchesTag) {
          span.style.display = span.classList.contains("sub-item") ? "block" : "";
          hasVisibleContent = true;
        } else {
          span.style.display = "none";
        }
      });

      if (matchesYear && hasVisibleContent) {
        item.style.display = "";
      } else {
        item.style.display = "none";
      }
    });

    const filterContainer = document.getElementById("history-filters");
    if (!filterContainer) return;

    // Update Year UI active classes
    const yearGroup = filterContainer.querySelector(".year-btn-group");
    if (yearGroup) {
      const isAllYearsActive = activeYears.length === 3;
      yearGroup.querySelectorAll(".filter-btn").forEach(btn => {
        const filter = btn.dataset.filter;
        if (filter === "year-all") {
          if (isAllYearsActive) btn.classList.add("active");
          else btn.classList.remove("active");
        } else {
          const yearVal = parseInt(filter.substring(5), 10);
          if (activeYears.includes(yearVal)) btn.classList.add("active");
          else btn.classList.remove("active");
        }
      });
    }

    // Update Tag UI active classes
    const tagGroup = filterContainer.querySelector(".tag-btn-group");
    if (tagGroup) {
      tagGroup.querySelectorAll(".filter-btn").forEach(btn => {
        const filter = btn.dataset.filter;
        const tagVal = filter.substring(4);
        if (tagVal === activeTag) btn.classList.add("active");
        else btn.classList.remove("active");
      });
    }
  }

  async function getUpdateList(cnt = 'all', date = '2023-01-01', edate = '', keywords = "", targetId = "site-history") {
    const updateList = document.getElementById(targetId);
    if (!updateList) return;
    updateList.innerHTML = ""; // 기존 리스트 초기화

    // 필터 버튼 컨테이너 생성 및 이벤트 바인딩
    let filterContainer = document.getElementById("history-filters");
    if (!filterContainer && targetId === "site-history") {
      filterContainer = document.createElement("div");
      filterContainer.id = "history-filters";
      filterContainer.className = "history-filters";
      filterContainer.innerHTML = `
        <div class="filter-group-wrapper">
          <span class="filter-label">연도 선택</span>
          <div class="year-btn-group">
            <button class="filter-btn active" data-filter="year-all">전체</button>
            <button class="filter-btn active" data-filter="year-2026">2026년</button>
            <button class="filter-btn active" data-filter="year-2025">2025년</button>
            <button class="filter-btn active" data-filter="year-2024">2024년</button>
          </div>
        </div>
        <div class="filter-group-wrapper">
          <span class="filter-label">분류 선택</span>
          <div class="tag-btn-group">
            <button class="filter-btn active" data-filter="tag-all">전체</button>
            <button class="filter-btn" data-filter="tag-new">신규</button>
            <button class="filter-btn" data-filter="tag-update">갱신/개선</button>
            <button class="filter-btn" data-filter="tag-bugfix">Bugfix</button>
          </div>
        </div>
      `;
      updateList.parentNode.insertBefore(filterContainer, updateList);

      // 연도 버튼 이벤트
      filterContainer.querySelector(".year-btn-group").querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const filter = e.target.dataset.filter;
          const filterVal = filter.substring(5);
          selectYear(filterVal);
          updateHistoryDisplay();
        });
      });

      // 분류 버튼 이벤트
      filterContainer.querySelector(".tag-btn-group").querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const filter = e.target.dataset.filter;
          activeTag = filter.substring(4);
          updateHistoryDisplay();
        });
      });
    }

    try {
      // JSON 데이터 가져오기 (async/await 사용)
      const updatesResponse = await fetch("/update.json");
      const updates = await updatesResponse.json();

      const hierarchyResponse = await fetch("/hierarchy.json");
      const hierarchy = await hierarchyResponse.json();

      // 날짜 변환
      const startDate = parseDateString(date);
      const endDate = parseDateString(edate);
      if (!edate) {
        endDate.setTime(new Date().getTime());
      }
      endDate.setDate(endDate.getDate() + 1);
      
      // 필터링 및 정렬
      const filteredUpdates = updates
        .filter(update => {
          const uDate = parseDateString(update.date);
          const inRange = uDate >= startDate && uDate <= endDate;
          const matchKeyword = keywords === "" || update.content.some(content => content.includes(keywords));
          return inRange && matchKeyword;
        })
        .sort((a, b) => parseDateString(b.date) - parseDateString(a.date));

      // 출력 갯수 제한 적용
      const limitedUpdates = cnt === 'all' ? filteredUpdates : filteredUpdates.slice(0, cnt);

      // 리스트 생성
      limitedUpdates.forEach(update => {
        const listItem = document.createElement("li");

        // data-year 설정
        const year = update.date.split('-')[0];
        listItem.setAttribute("data-year", year);

        // data-tags 설정
        let tags = [];
        update.content.forEach(content => {
          if (content.includes("[신규]")) tags.push("new");
          if (content.includes("[갱신]") || content.includes("[기능개선]")) tags.push("update");
          if (content.includes("[bugfix]")) tags.push("bugfix");
          if (content.includes("[동영상]")) tags.push("youtube");
        });
        listItem.setAttribute("data-tags", tags.join(" "));

        if (targetId === "sidebar-update-list") {
          const dateSpan = document.createElement("span");
          dateSpan.className = "recent-date";
          dateSpan.textContent = update.date;
          listItem.appendChild(dateSpan);

          const contentSpan = document.createElement("span");
          contentSpan.className = "recent-content";

          let processedLines = [];
          let lastTag = "";

          update.content.forEach(origContent => {
            let isSubItem = /^\s*\[[^\]]+\]\s*:/.test(origContent);
            let content = origContent;

            const match = content.match(/^(\[[^\]]+\])/);
            if (match) {
              lastTag = match[1];
            }

            let processed = content;
            if (content.startsWith("[신규]")) {
              let endIndex = content.indexOf(":");
              if (endIndex === -1) endIndex = content.length;
              const title = content.substring(4, endIndex).trim();
              const path = findPath(hierarchy, title);
              if (path) {
                let text = "[신규] <a href='" + path + "'>" + title + "</a>";
                if (endIndex !== content.length) {
                  text += ": " + content.substring(endIndex + 1).trim();
                }
                processed = text;
              }
            } else if (content.startsWith("[갱신]")) {
              let endIndex = content.indexOf(":");
              if (endIndex === -1) endIndex = content.length;
              const title = content.substring(4, endIndex).trim();
              const path = findPath(hierarchy, title);
              if (path) {
                let text = "[갱신] <a href='" + path + "'>" + title + "</a>";
                if (endIndex !== content.length) {
                  text += ": " + content.substring(endIndex + 1).trim();
                }
                processed = text;
              }
            }
            if (isSubItem) {
              processed = `<span style="padding-left: 1em; display: inline-block;">${processed}</span>`;
            }
            processedLines.push(processed);
          });

          contentSpan.innerHTML = processedLines.join("<br>");
          listItem.appendChild(contentSpan);
        } else {
          // 날짜 출력
          const dateSpan = document.createElement("span");
          dateSpan.className = "date";
          dateSpan.textContent = update.date;

          const updateDiv = document.createElement("div");

          let lastTag = "";
          update.content.forEach(origContent => {
            let isSubItem = /^\s*\[[^\]]+\]\s*:/.test(origContent);
            let content = origContent;

            const match = content.match(/^(\[[^\]]+\])/);
            if (match) {
              lastTag = match[1];
            }

            const contentSpan = document.createElement("span");

            if (isSubItem) {
              contentSpan.style.paddingLeft = "2em";
              contentSpan.style.display = "block";
            }

            if (content.startsWith("[신규]")) {
              let endIndex = content.indexOf(":");
              if (endIndex === -1) {
                endIndex = content.length;
              }
              const title = content.substring(4, endIndex).trim();
              const path = findPath(hierarchy, title);

              if (path) {
                let text = "[신규] <a href='" + path + "'>" + title + "</a>";
                if (endIndex !== content.length) {
                  text += ": " + content.substring(endIndex + 1).trim();
                }
                content = text;
              }
              contentSpan.className = "new";
            } else if (content.startsWith("[기능개선]")) {
              contentSpan.className = "update";
            } else if (content.startsWith("[동영상]")) {
              contentSpan.className = "youtube";
            } else if (content.startsWith("[bugfix]")) {
              contentSpan.className = "bugfix";
            } else if (content.startsWith("[갱신]")) {
              let endIndex = content.indexOf(":");
              if (endIndex === -1) {
                endIndex = content.length;
              }
              const title = content.substring(4, endIndex).trim();
              const path = findPath(hierarchy, title);

              if (path) {
                let text = "[갱신] <a href='" + path + "'>" + title + "</a>";
                if (endIndex !== content.length) {
                  text += ": " + content.substring(endIndex + 1).trim();
                }
                content = text;
              }

              contentSpan.className = "modify";
            }

            contentSpan.className += " content";
            if (isSubItem) {
              contentSpan.classList.add("sub-item");
            }
            contentSpan.innerHTML = content;
            updateDiv.appendChild(contentSpan);
          });

          listItem.appendChild(dateSpan);
          listItem.appendChild(updateDiv);
        }
        updateList.appendChild(listItem);
      });

      // 초기 활성 필터링 상태 적용
      if (targetId === "site-history") {
        updateHistoryDisplay();
      }

    } catch (error) {
      console.error("Error fetching or processing data:", error);
    }
  }

  // 계층 경로 찾기 함수
  function findPath(hierarchy, title, currentPath = "") {
    const titles = title.split('>');
    let path = currentPath;

    for (const currentTitle of titles) {
      let found = false;

      for (const item of hierarchy) {
        if (item.주제 === currentTitle.trim()) {
          path += item.디렉토리 || "";

          if (item.목록) {
            hierarchy = item.목록;
            found = true;
            break;
          } else if (item.파일명) {
            return path + item.파일명;
          }
        }
      }

      if (!found) {
        return null; // 경로를 찾을 수 없는 경우
      }
    }

    return path; // 최종 경로 반환
  }

  function clearUpdateList() {
    const updateList = document.querySelector('ul#site-history');
    if (updateList) {
      while (updateList.firstChild) {
        updateList.removeChild(updateList.firstChild);
      }
    }
  }

  function toggle(tag) {
    const elements = document.querySelectorAll('ul#site-history span');
    elements.forEach(element => {
      if (tag === 'all' || element.classList.contains('date')) {
        element.style.display = 'block';
      } else {
        if (element.classList.contains(tag)) {
          element.style.display = 'block';
        } else {
          element.style.display = 'none';
        }
      }
    });

    const listItems = document.querySelectorAll('ul#site-history > li');
    listItems.forEach(item => {
      const spans = item.querySelectorAll('span');
      let allHidden = true;

      spans.forEach(span => {
        if (!span.classList.contains('date') && span.style.display !== 'none') {
          allHidden = false;
        }
      });

      if (allHidden) {
        item.style.display = 'none';
      } else {
        item.style.display = 'block';
      }
    });
  }

  return {
    getUpdateList: getUpdateList,
    clearUpdateList: clearUpdateList,
    toggle: toggle
  };
})();

// 글로벌 객체 매핑 및 대기열(Queue) 실행 처리
(function() {
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
