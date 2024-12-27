// update.json에서 정보를 읽어 <ul id="update-list">에 출력합니다.
// <ul id="update-list">
//   <li>
//   <span class="date">"2024-01-01"</span>
//     <div>
//       <span class="content [category]"> ... </span>
//       ...
//     </div>
//   </li>
// </ul>

// arguments: cnt='출력 갯수(default=all)', date='출력 시작 날자(default="2023.1.1")', keywords(default="")는 content검색 조건입니다.

// getUpdateList 함수 정의
async function getUpdateList(cnt = 'all', date = '2023-01-01', edate = '', keywords = "") {
  // HTML 요소 가져오기
  const updateList = document.getElementById("update-list");
  updateList.innerHTML = ""; // 기존 리스트 초기화

  try {
    // JSON 데이터 가져오기
    const updatesResponse = await fetch("update.json");
    const updates = await updatesResponse.json();

    const hierarchyResponse = await fetch("hierarchy.json");
    const hierarchy = await hierarchyResponse.json();

    // 날짜 변환
    const startDate = new Date(date);
    const endDate = new Date(edate || new Date());
    endDate.setDate(endDate.getDate() + 1);
    
    // 필터링 및 정렬
    const filteredUpdates = updates
      .filter(update => new Date(update.date) >= startDate && new Date(update.date) <= endDate &&
        (keywords === "" || update.content.some(content => content.includes(keywords))))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // 출력 갯수 제한 적용
    const limitedUpdates = cnt === 'all' ? filteredUpdates : filteredUpdates.slice(0, cnt);

    // 리스트 생성
    limitedUpdates.forEach(update => {
      const listItem = document.createElement("li");

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
          privious_class = "bugrix";
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

        contentSpan.className += " content"
        contentSpan.innerHTML = content;
        updateDiv.appendChild(contentSpan);
      });

      listItem.appendChild(dateSpan);
      listItem.appendChild(updateDiv);
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

// tags: new, youtube, update, bugrix, modify
// span class="tag"가 포함되어 있지 않으면 display:none
// 단, all인 경우 모두 display:block
function toggle(tag) {
  const elements = document.querySelectorAll('ul#update-list span');
  elements.forEach(element => {
    if (tag === 'all' || element.classList.contains('date')) {
      // all인 경우 모든 요소 표시
      element.style.display = 'block';
    } else {
      // 특정 태그만 표시, 나머지는 숨김
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

    // 모든 date를 제외한 span이 hidden 상태라면 li도 숨김
    if (allHidden) {
      item.style.display = 'none';
    } else {
      item.style.display = 'block';
    }
  });
}