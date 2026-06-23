// modules/features/update-log.js

window.SiteModules = window.SiteModules || {};

window.SiteModules.UpdateLog = (function() {
  
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

  async function getUpdateList(cnt = 'all', date = '2023-01-01', edate = '', keywords = "", targetId = "update-list") {
    const updateList = document.getElementById(targetId);
    if (!updateList) return;
    updateList.innerHTML = ""; // 기존 리스트 초기화

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

        if (targetId === "sidebar-update-list") {
          const dateSpan = document.createElement("span");
          dateSpan.className = "recent-date";
          dateSpan.textContent = update.date;
          listItem.appendChild(dateSpan);

          const contentSpan = document.createElement("span");
          contentSpan.className = "recent-content";

          let processedLines = [];
          update.content.forEach(content => {
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
            if (processed.startsWith(":")) {
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

          let privious_class = "";
          update.content.forEach(content => {
            const contentSpan = document.createElement("span");

            if (content.startsWith(":")) {
              contentSpan.style.paddingLeft = "1em";
              contentSpan.className = privious_class;
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
              privious_class = "new";
            } else if (content.startsWith("[기능개선]")) {
              contentSpan.className = "update";
              privious_class = "update";
            } else if (content.startsWith("[동영상]")) {
              contentSpan.className = "youtube";
              privious_class = "youtube";
            } else if (content.startsWith("[bugfix]")) {
              contentSpan.className = "bugfix";
              privious_class = "bugfix";
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
              privious_class = "modify";
            }

            contentSpan.className += " content";
            contentSpan.innerHTML = content;
            updateDiv.appendChild(contentSpan);
          });

          listItem.appendChild(dateSpan);
          listItem.appendChild(updateDiv);
        }
        updateList.appendChild(listItem);
      });

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
    const updateList = document.querySelector('ul#update-list');
    if (updateList) {
      while (updateList.firstChild) {
        updateList.removeChild(updateList.firstChild);
      }
    }
  }

  function toggle(tag) {
    const elements = document.querySelectorAll('ul#update-list span');
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

    const listItems = document.querySelectorAll('ul#update-list > li');
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
