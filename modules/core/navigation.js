// modules/core/navigation.js

window.SiteModules = window.SiteModules || {};
window.SiteModules.state = window.SiteModules.state || {
  category: "",
  cur_doc: { title: "", dir: "", file: "" },
  prv_doc: { title: "", dir: "", file: "" },
  next_doc: { title: "", dir: "", file: "" },
  currentPath: ""
};
window.SiteModules.authInitialized = false;

window.SiteModules.Navigation = (function () {
  let baseUl;
  let firebaseLoadedPromise = null;

  function loadFirebaseSDK() {
    return window.SiteModules.FirebaseConfig.loadSDKs();
  }

  function init() {
    const state = window.SiteModules.state;
    state.currentPath = window.location.pathname;

    // 파이어베이스 인증 관찰자 및 로그인 처리기 초기화
    loadFirebaseSDK().then(() => {
      window.firebase.auth().onAuthStateChanged((user) => {
        window.SiteModules.authInitialized = true;

        const loginBtn = document.getElementById("nav-login");
        const modalUserInfo = document.getElementById("login-modal-title");
        if (loginBtn) {
          if (user) {
            loginBtn.setAttribute("data-tooltip", (user.displayName || user.email || '사용자'));
            loginBtn.style.color = "#4285F4";
            if (modalUserInfo) {
              modalUserInfo.innerHTML = `<span style="font-weight: 800; color: #4285F4;">${user.displayName || '이름없음'}</span>님 (${user.email})`;
            }
          } else {
            loginBtn.setAttribute("data-tooltip", "게스트");
            loginBtn.style.color = "";
            if (modalUserInfo) {
              modalUserInfo.innerHTML = `게스트<br><span style="font-size: 0.85em; color: #5f6368; font-weight: normal;">로그인되어 있지 않습니다.</span>`;
            }
          }
        }

        // Q&A 질답 폼 리렌더링 트리거 (로그인 상태 변화에 반응)
        if (state && state.currentPath && state.currentPath !== "/index.html" && state.currentPath !== "/") {
          renderPageFeedbackArea(state.currentPath);
        }

        // 관리자 권한 상태에 따른 페이지 해시 리다이렉트
        const db = window.firebase.firestore();
        if (user) {
          db.collection('admins').doc(user.uid).get().then(docSnap => {
            if (docSnap.exists) {
              if (window.location.hash === "#/help.html") {
                window.location.hash = "#/admin.html";
              }
            } else {
              if (window.location.hash === "#/admin.html") {
                window.location.hash = "#/help.html";
              }
            }
          }).catch(err => console.error("Admin check on auth change failed:", err));
        } else {
          if (window.location.hash === "#/admin.html") {
            window.location.hash = "#/help.html";
          }
        }
      });
    }).catch(err => console.error("Firebase initialization failed:", err));

    // 1. 구글 머티리얼 심볼 링크 주입
    if (!document.getElementById("material-symbols-link")) {
      const link = document.createElement("link");
      link.id = "material-symbols-link";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0";
      document.head.appendChild(link);
    }

    // 2. Gemini 스타일의 이중 사이드바 컨테이너 빌드
    let sidebarContainer = document.getElementById("sidebar-container");
    if (!sidebarContainer) {
      const body = document.querySelector("body");
      sidebarContainer = document.createElement("div");
      sidebarContainer.setAttribute("id", "sidebar-container");
      body.appendChild(sidebarContainer);

      // A. 좌측 좁은 아이콘 바 (width 60px)
      const sidebarNav = document.createElement("div");
      sidebarNav.setAttribute("id", "sidebar-nav");
      sidebarNav.innerHTML = `
        <div class="nav-group">
          <div class="nav-item" id="nav-home" data-tooltip="홈으로 이동">
            <svg viewBox="0 0 500 500" style="width: 20px; height: 20px; stroke: currentColor; fill: none; stroke-linecap: round; stroke-width: 46px;">
              <path d="M 84 440 C -1 341 38 223 68 161 S 151 23 234 34 S 363 164 327 217 S 245 273 198 229 S 187 105 245 77 S 432 108 432 212 S 354 371 393 420 C 431 460 468 436 468 407"/>
              <path d="M 99 289 C 183 296 239 392 188 468"/>
              <path d="M 246 311 C 335 320 324 390 291 462" style="stroke-miterlimit: 17;"/>
              <path d="M 341 267 C 339 260 360 313 400 309" style="stroke-miterlimit: 17;"/>
            </svg>
          </div>
          <div class="nav-item" id="nav-sitemap" data-tab="tab-sitemap" data-tooltip="Site Map">
            <span class="material-symbols-outlined">account_tree</span>
            <span class="keybind-badge">1</span>
          </div>
          <div class="nav-item" id="nav-toc" data-tab="tab-toc" data-tooltip="목차">
            <span class="material-symbols-outlined">toc</span>
            <span class="keybind-badge">2</span>
          </div>
          <div class="nav-item" id="nav-search" data-tab="tab-search" data-tooltip="검색">
            <span class="material-symbols-outlined">search</span>
            <span class="keybind-badge">3</span>
          </div>
        </div>
        
        <!-- 동적 페이지 기능 아이콘 배치용 영역 -->
        <div class="nav-group" id="sidebar-page-features"></div>
        
        <div class="nav-group">
          <div class="nav-item" id="nav-login" data-tooltip="게스트">
            <span class="material-symbols-outlined">account_circle</span>
          </div>
          <div class="nav-item" id="nav-help" data-tooltip="질의 응답 / 인터페이스 소개">
            <span class="material-symbols-outlined">help</span>
          </div>
          <div class="nav-item" id="nav-info" data-tooltip="사이트 소개">
            <span class="material-symbols-outlined">info</span>
          </div>
        </div>
      `;
      sidebarContainer.appendChild(sidebarNav);

      // B. 우측 확장 패널 (width 240px)
      const sidebarPanel = document.createElement("div");
      sidebarPanel.setAttribute("id", "sidebar-panel");
      sidebarPanel.innerHTML = `
        <div class="panel-body">
          <!-- 1. Sitemap Pane -->
          <div class="tab-pane" id="tab-sitemap">
            <div class="sitemap-actions" style="margin-bottom: 10px; display: flex; gap: 8px;">
              <button id="home-btn" class="site-action-btn">홈</button>
              <button id="sitemap-toggle-all-btn" class="site-action-btn">전체 닫기</button>
              <button id="sitemap-open-current-btn" class="site-action-btn">현재 문서</button>
            </div>
            <ul class="sitemap-panel-list" id="sitemap-tree"></ul>
          </div>
          
          <!-- 2. TOC Pane -->
          <div class="tab-pane" id="tab-toc">
            <div class="toc-breadcrumb" id="toc-breadcrumb-info" style="font-size:0.75em; color:#5f6368; margin-bottom:4px; font-weight: 500;"></div>
            <ul class="toc-panel-list" id="toc-tree"></ul>
          </div>
          <!-- 3. Search Pane -->
          <div class="tab-pane" id="tab-search">
            <div class="panel-header">
              <span class="panel-header-title">문서 검색</span>
            </div>
            <div class="search-type-wrapper">
              <label class="search-type-option active">
                <input type="radio" name="search-type" value="title" checked style="display: none;">
                제목
              </label>
              <label class="search-type-option">
                <input type="radio" name="search-type" value="tag" style="display: none;">
                Tag
              </label>
              <label class="search-type-option">
                <input type="radio" name="search-type" value="all" style="display: none;">
                모든 문서
              </label>
            </div>
            <div class="search-input-wrapper" style="margin-bottom: 15px;">
              <input type="text" id="sidebar-search-input" placeholder="문서 제목 검색...">
            </div>
            <ul class="search-results-list" id="sidebar-search-results"></ul>
          </div>
        </div>
      `;
      sidebarContainer.appendChild(sidebarPanel);

      if (window.innerWidth > 768) {
        setPanelCollapsed(true);
      } else {
        document.documentElement.style.setProperty('--sidebar-width', '60px');
      }

      createModals();
      bindSidebarEvents();
    }

    baseUl = document.getElementById("sitemap-tree");
    if (baseUl) baseUl.innerHTML = "";

    // hierarchy.json 로드
    fetch('/hierarchy.json')
      .then(response => response.json())
      .then(list => {
        window.SiteModules.hierarchyListCached = list;

        // 백그라운드 검색 인덱서 탑재
        buildSearchCache(list);

        let directory = state.currentPath.split('/').join('/');
        if (directory.startsWith('/')) {
          directory = directory.substring(1);
        }

        // 초기 상태 로드
        renderHierarchy(list, baseUl, '', directory);

        // 라우터 초기화
        initRouter();

      })
      .catch(err => console.error("Error loading hierarchy.json:", err));
  }

  function resolveRelativePath(basePath, relativePath) {
    if (relativePath.startsWith("/")) return relativePath;

    const baseParts = basePath.split("/");
    baseParts.pop();

    const relParts = relativePath.split("/");
    for (const part of relParts) {
      if (part === "." || part === "") {
        continue;
      } else if (part === "..") {
        if (baseParts.length > 0) baseParts.pop();
      } else {
        baseParts.push(part);
      }
    }
    return baseParts.join("/");
  }

  function isKnownArticlePage(absolutePath) {
    const knownRootArticles = ["/index.html", "/admin.html", "/help.html", "/info.html", "/"];
    if (knownRootArticles.includes(absolutePath)) {
      return true;
    }

    const list = window.SiteModules.hierarchyListCached;
    if (!list) {
      return true;
    }

    const cleanTargetPath = absolutePath.startsWith('/') ? absolutePath.substring(1) : absolutePath;

    function search(items, currentDir) {
      for (const item of items) {
        const itemDir = currentDir + (item.디렉토리 || "");
        const fileName = item.파일명 || (item.목록 ? null : "index.html");
        if (fileName) {
          const fullPath = itemDir + fileName;
          if (fullPath === cleanTargetPath) {
            return true;
          }
        }
        if (item.목록) {
          if (search(item.목록, itemDir)) {
            return true;
          }
        }
      }
      return false;
    }

    return search(list, "");
  }

  // SPA 해시 라우터 구성
  function initRouter() {
    window.addEventListener("hashchange", handleRouteChange);

    // 글로벌 링크 가로채기 (페이지 리로드 없이 SPA로 동작하도록 설계)
    document.addEventListener("click", (e) => {
      const anchor = e.target.closest("a");
      if (anchor) {
        let href = anchor.getAttribute("href");
        if (href) {
          if (href.startsWith("#")) {
            // 만약 해시에 슬래시가 없는 단순 내부 앵커 이동인 경우 (예: href="#용어")
            if (!href.includes("/")) {
              e.preventDefault();
              const state = window.SiteModules.state;
              const currentPath = state.currentPath || "/index.html";
              window.location.hash = "#" + currentPath + href;
            }
          } else if (!href.startsWith("http")) {
            const isHtmlLink = href.includes(".html");
            const isTargetBlank = anchor.getAttribute("target") === "_blank";
            if (isHtmlLink && !isTargetBlank) {
              let cleanHref = href;
              const hashIdx = href.indexOf('#');
              if (hashIdx !== -1) {
                cleanHref = href.substring(0, hashIdx);
              }
              const queryIdx = cleanHref.indexOf('?');
              if (queryIdx !== -1) {
                cleanHref = cleanHref.substring(0, queryIdx);
              }

              const state = window.SiteModules.state;
              const absolutePath = resolveRelativePath(state.currentPath || "/index.html", cleanHref);

              // 최근 업데이트 항목 판별
              const isRecentUpdateLink = anchor.closest("#sidebar-update-list, #site-history") || anchor.classList.contains("recent-visit-link");
              if (isRecentUpdateLink) {
                let hashOrQuery = "";
                const firstHashOrQueryIdx = href.search(/[#?]/);
                if (firstHashOrQueryIdx !== -1) {
                  hashOrQuery = href.substring(firstHashOrQueryIdx);
                }

                const cacheEntry = window.SiteModules.searchCache && window.SiteModules.searchCache.find(p => p.url === absolutePath);
                if (cacheEntry) {
                  if (cacheEntry.hasArticle) {
                    e.preventDefault();
                    window.location.hash = "#" + absolutePath + hashOrQuery;
                  } else {
                    anchor.setAttribute("target", "_blank");
                  }
                } else {
                  // 비동기 팝업 차단 우회를 위한 빈 탭 사전 생성 후 페치
                  e.preventDefault();
                  const newTab = window.open("", "_blank");
                  fetch(absolutePath)
                    .then(res => {
                      if (!res.ok) throw new Error("Fetch failed");
                      return res.text();
                    })
                    .then(htmlText => {
                      const parser = new DOMParser();
                      const doc = parser.parseFromString(htmlText, "text/html");
                      const articleEl = doc.querySelector("article");
                      const hasArticle = !!articleEl;

                      if (window.SiteModules.searchCache) {
                        window.SiteModules.searchCache.push({
                          url: absolutePath,
                          hasArticle: hasArticle
                        });
                      }

                      if (hasArticle) {
                        newTab.close();
                        window.location.hash = "#" + absolutePath + hashOrQuery;
                      } else {
                        newTab.location.href = href;
                      }
                    })
                    .catch(err => {
                      console.error("Failed to dynamically check article for recent update link:", err);
                      newTab.location.href = href;
                    });
                }
                return;
              }

              if (!isKnownArticlePage(absolutePath)) {
                anchor.setAttribute("target", "_blank");
                return;
              }

              e.preventDefault();
              let hashOrQuery = "";
              const firstHashOrQueryIdx = href.search(/[#?]/);
              if (firstHashOrQueryIdx !== -1) {
                hashOrQuery = href.substring(firstHashOrQueryIdx);
              }
              window.location.hash = "#" + absolutePath + hashOrQuery;
            }
          }
        }
      }
    });

    // 초기 상태 라우팅 수행
    handleRouteChange();
  }

  function checkAdminAndLoadRoute(urlPath) {
    loadFirebaseSDK().then(() => {
      const auth = window.firebase.auth();
      const db = window.firebase.firestore();
      
      const checkAndLoad = () => {
        const user = auth.currentUser;
        if (urlPath === "/admin.html") {
          if (user) {
            db.collection('admins').doc(user.uid).get().then(docSnap => {
              if (docSnap.exists) {
                loadPageRoute(urlPath);
              } else {
                window.location.hash = "#/help.html";
              }
            }).catch(err => {
              console.error("Admin verification failed:", err);
              window.location.hash = "#/help.html";
            });
          } else {
            window.location.hash = "#/help.html";
          }
        } else if (urlPath === "/help.html") {
          if (user) {
            db.collection('admins').doc(user.uid).get().then(docSnap => {
              if (docSnap.exists) {
                window.location.hash = "#/admin.html";
              } else {
                loadPageRoute(urlPath);
              }
            }).catch(err => {
              console.error("Admin check failed for help page:", err);
              loadPageRoute(urlPath);
            });
          } else {
            loadPageRoute(urlPath);
          }
        }
      };

      if (window.SiteModules.authInitialized) {
        checkAndLoad();
      } else {
        const unsubscribe = auth.onAuthStateChanged(() => {
          unsubscribe();
          checkAndLoad();
        });
      }
    }).catch(err => {
      console.error("Firebase SDK load failed:", err);
      loadPageRoute(urlPath);
    });
  }

  function handleRouteChange() {
    let hash = window.location.hash;
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      const container = document.getElementById("sidebar-container");
      if (container) container.classList.remove("active");
    }

    if (!hash || hash === "#" || hash === "#/" || hash === "#/index.html" || hash === "#index.html") {
      const path = window.location.pathname;
      if (path === "/" || path === "/index.html" || path.endsWith("/index.html")) {
        loadHomeRoute();
      } else {
        // 서브페이지 직접 진입 (해시 없음): 기존 article 구조와 내용을 유지하면서 상태 데이터만 갱신
        postLoadPageActions(false, path, document.title);
      }
    } else {
      // hash 예: "#/basicStudy/math/1-1.html#title" 또는 "#basicStudy/math/1-1.html" 또는 "#연산operator"
      let cleanHash = hash;
      if (cleanHash.startsWith('#')) {
        cleanHash = cleanHash.substring(1);
      }

      // 만약 해시에 슬래시(/)가 존재하지 않는다면, 이는 서브페이지 경로가 아니라 단순 로컬 문서 앵커입니다.
      if (!cleanHash.includes('/')) {
        const id = decodeURIComponent(cleanHash);
        const targetElement = document.getElementById(id);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: "smooth" });
        }
        return; // 페이지 로딩 생략
      }

      if (cleanHash.startsWith('/')) {
        cleanHash = cleanHash.substring(1);
      }

      // sub-anchor가 존재하는 경우 fetch 경로와 스크롤용 분리
      let urlPath = cleanHash;
      let subAnchor = "";
      const secondHashIdx = cleanHash.indexOf('#');
      if (secondHashIdx !== -1) {
        urlPath = cleanHash.substring(0, secondHashIdx);
        subAnchor = cleanHash.substring(secondHashIdx + 1);
      }

      // 만약 현재 로드된 페이지와 이동하려는 페이지가 동일하다면, 페이지를 새로 페치하지 않고 스크롤만 수행
      const targetFullPath = "/" + urlPath;
      const state = window.SiteModules.state;
      if (state.currentPath === targetFullPath) {
        if (subAnchor) {
          const id = decodeURIComponent(subAnchor);
          const targetElement = document.getElementById(id);
          if (targetElement) {
            targetElement.scrollIntoView({ behavior: "smooth" });
          }
        } else {
          window.scrollTo(0, 0);
        }
        return;
      }

      if (targetFullPath === "/admin.html" || targetFullPath === "/help.html") {
        checkAdminAndLoadRoute(targetFullPath);
      } else {
        loadPageRoute(targetFullPath);
      }
    }
  }

  // 홈 페이지 (index.html 기본 내용)를 동적으로 완전 빌드 (무한 대기 루프 완벽 제거)
  function loadHomeRoute() {
    const article = document.querySelector("article");
    if (!article) return;

    if (window.SiteModules && window.SiteModules.state) {
      window.SiteModules.state.lastModifiedDate = null;
    }

    // 구조 빌드
    article.innerHTML = `
      <div id="site-intro">
        <img id="site-icon" src="/source/icon_seohyun.svg">
        <div id="site-name">iseohyun.com</div>
      </div>
      <ul id="site-history"></ul>
    `;

    // 최근 변경 사항 로그 빌드 (전체 로드하여 필터링 지원)
    if (window.SiteModules.UpdateLog && typeof window.SiteModules.UpdateLog.getUpdateList === 'function') {
      window.SiteModules.UpdateLog.getUpdateList('all', '2023-01-01', '', '', 'site-history');
    } else {
      window.SiteModules.updateLogQueue = window.SiteModules.updateLogQueue || [];
      window.SiteModules.updateLogQueue.push(['all', '2023-01-01', '', '', 'site-history']);
    }

    postLoadPageActions(true);
  }

  // 모든 상대 경로(img src, object data, iframe src, a href 등)를 loaded page의 절대 경로로 재조정하는 헬퍼 함수
  function resolveAllRelativePaths(tempDoc, urlPath) {
    // 1. src 속성을 갖는 요소들 (img, iframe, embed, source, video, audio, script 등)
    const srcElements = tempDoc.querySelectorAll("[src]");
    srcElements.forEach(el => {
      const src = el.getAttribute("src");
      if (src && !src.startsWith("/") && !src.startsWith("http:") && !src.startsWith("https:") && !src.startsWith("data:")) {
        el.setAttribute("src", resolveRelativePath(urlPath, src));
      }
    });

    // 2. data 속성을 갖는 object 태그
    const objectElements = tempDoc.querySelectorAll("object[data]");
    objectElements.forEach(el => {
      const data = el.getAttribute("data");
      if (data && !data.startsWith("/") && !data.startsWith("http:") && !data.startsWith("https:") && !data.startsWith("data:")) {
        el.setAttribute("data", resolveRelativePath(urlPath, data));
      }
    });

    // 3. href 속성을 갖는 요소들 (a, link 등)
    const hrefElements = tempDoc.querySelectorAll("[href]");
    hrefElements.forEach(el => {
      const href = el.getAttribute("href");
      if (href && !href.startsWith("/") && !href.startsWith("http:") && !href.startsWith("https:") && !href.startsWith("#") && !href.startsWith("javascript:") && !href.startsWith("mailto:") && !href.startsWith("tel:")) {
        el.setAttribute("href", resolveRelativePath(urlPath, href));
      }
    });

    // 4. onclick 속성 내의 window.location.href 상대 경로 재조정 및 SPA 해시 전환
    const onclickElements = tempDoc.querySelectorAll("[onclick]");
    onclickElements.forEach(el => {
      const onclick = el.getAttribute("onclick");
      if (onclick && (onclick.includes("location.href") || onclick.includes("location ="))) {
        const match = onclick.match(/(?:window\.)?location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/);
        if (match) {
          const relPath = match[1];
          if (!relPath.startsWith("/") && !relPath.startsWith("http:") && !relPath.startsWith("https:") && !relPath.startsWith("#")) {
            const absPath = resolveRelativePath(urlPath, relPath);
            el.setAttribute("onclick", `window.location.hash='#${absPath}'`);
          }
        }
      }
    });
  }

  function executePageStylesheets(tempDoc) {
    const links = tempDoc.querySelectorAll("link[rel='stylesheet']");
    links.forEach(oldLink => {
      const href = oldLink.getAttribute("href");
      if (href) {
        if (href.includes("highlight/")) {
          return; // CDN 버전이 index.html에 로드되므로 로컬 highlight 스타일 무시
        }
        if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) {
          return; // 이미 로드된 스타일시트 생략
        }
        const newLink = document.createElement("link");
        newLink.rel = "stylesheet";
        newLink.href = href;
        document.head.appendChild(newLink);
      }
    });
  }

  async function loadPageRoute(urlPath) {
    const article = document.querySelector("article");
    if (!article) return;

    // SPA 페이지 전환 시 잔존하는 ResizeObserver 및 윈도우 스냅 리스너 일괄 청소
    if (window.activeResizeObservers) {
      window.activeResizeObservers.forEach(obs => {
        try { obs.disconnect(); } catch (e) {}
      });
      window.activeResizeObservers = [];
    }
    if (window.activeWindowListeners) {
      window.activeWindowListeners.forEach(item => {
        try { window.removeEventListener(item.type, item.fn); } catch (e) {}
      });
      window.activeWindowListeners = [];
    }

    // SPA 페이지 전환 시 이전 소프로젝트 잔존 전역 함수 및 변수 일괄 소거 (네임스페이스 충돌 방어)
    const globalsToClean = [
      "init", "initApp", "rebuildGrid", "positionTooltip", "guide", "stepsData", "inputs",
      "cur_step", "cur_line", "language", "isFin", "isGreating", "stateHistory", "state",
      "EuclideanGridInput", "SqrtGridInput", "GridInput", "V", "titleText", "sentences",
      "activeCells", "clearGridRow", "highlightActiveStep", "nextStep", "prevStep", "initKeybindings",
      "triggerRandomStart", "resetToStart",
      "initChart", "redrawChart", "startChartAnimation", "drawBars", "updateChartRealtime",
      "triggerMathRendering", "setupDualInputBindings", "handleRunSimulation", "cleanupActiveWorker", "updateResultUI"
    ];
    globalsToClean.forEach(key => {
      try { delete window[key]; } catch(e) {}
    });

    try {
      const response = await fetch(urlPath);
      if (!response.ok) {
        throw new Error(`Failed to load: ${urlPath} (status ${response.status})`);
      }
      const htmlText = await response.text();

      const parser = new DOMParser();
      const tempDoc = parser.parseFromString(htmlText, "text/html");

      const fetchedArticle = tempDoc.querySelector("article");

      if (fetchedArticle) {
        // 본문 로드 전에 로딩 표시
        article.innerHTML = "<p style='padding:50px; text-align:center; font-size:1.2em; color:#747775;'>페이지를 불러오는 중입니다...</p>";

        // Last-Modified 헤더값 읽기 및 저장
        const lastModifiedHeader = response.headers.get("Last-Modified");
        const state = window.SiteModules.state;
        state.lastModifiedDate = lastModifiedHeader ? new Date(lastModifiedHeader) : null;

        // 본문 DOM을 렌더링하기 전 상대 경로를 모두 절대 경로로 변환하여 404 오류 원천 봉쇄
        resolveAllRelativePaths(tempDoc, urlPath);

        article.innerHTML = fetchedArticle.innerHTML;

        // 페이지 종속 스타일시트 추출 및 로드
        executePageStylesheets(tempDoc);

        // 페이지 종속 스크립트 추출 및 실행
        executePageScripts(tempDoc);

        // 후속 모듈 재호출
        postLoadPageActions(false, urlPath, tempDoc.title);
      } else {
        // article 엘리먼트가 없는 경우 -> 새 창에서 열고 기존 위치 고수
        window.open(urlPath, "_blank");

        // 브라우저 해시 주소 복구 (기존 위치 고수)
        const state = window.SiteModules.state;
        const previousPath = state.currentPath || "/index.html";
        
        window.removeEventListener("hashchange", handleRouteChange);
        window.location.hash = "#" + previousPath;
        setTimeout(() => {
          window.addEventListener("hashchange", handleRouteChange);
        }, 0);
      }
    } catch (err) {
      console.error(err);
      article.innerHTML = `<h1 style="color:red;">페이지 로드 오류</h1><p>해당 문서를 불러올 수 없습니다.<br>${err.message}</p>`;
    }
  }

  function executePageScripts(tempDoc) {
    const scripts = tempDoc.querySelectorAll("script");
    scripts.forEach(oldScript => {
      const src = oldScript.getAttribute("src");
      const id = oldScript.getAttribute("id");

      if (src && (src.includes("modules/script.js") || src.includes("jquery-latest.min.js") || src.includes("highlight/"))) {
        return;
      }

      // 소프로젝트 하위의 페이지 종속 스크립트들은 재진입 시 항상 새로 실행하도록 기존 캐시 태그 노드 제거
      if (src && (src.includes("/small-project/") || src.includes("/modules/features/"))) {
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) {
          existingScript.remove();
        }
      } else if (src && document.querySelector(`script[src="${src}"]`)) {
        return; // 이미 로드된 스크립트 실행 생략
      }

      const newScript = document.createElement("script");
      const scriptType = oldScript.getAttribute("type");
      if (scriptType) newScript.type = scriptType;
      if (src) {
        newScript.src = src;
        newScript.async = false; // 브라우저 스크립트 실행 순서 보장 (defer/순서 준수)
        if (id) newScript.id = id;
        document.head.appendChild(newScript);

        if (src.includes("mathjax")) {
          newScript.onload = () => {
            if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
              const article = document.querySelector("article");
              window.MathJax.typesetPromise([article]).catch(err => {
                console.warn("MathJax onload typeset error:", err);
              });
            }
          };
        }
      } else {
        // 일반 인라인 스크립트의 경우, const/let 재선언 SyntaxError를 방지하기 위해 IIFE로 래핑하여 실행
        if (scriptType !== "module") {
          newScript.textContent = `(function(){\n${oldScript.textContent}\n})();`;
        } else {
          newScript.textContent = oldScript.textContent;
        }
        document.body.appendChild(newScript);
        // type=module 스크립트는 append 후에도 DOM에 남겨야 실행되므로 remove() 생략
        if (scriptType !== "module") newScript.remove();
      }
    });
  }

  function postLoadPageActions(isHome, urlPath, docTitle) {
    const state = window.SiteModules.state;

    if (isHome) {
      state.currentPath = "/index.html";
      state.category = "";
      state.cur_doc = { title: "홈", dir: "", file: "index.html" };
      state.prv_doc = { title: "", dir: "", file: "" };
      state.next_doc = { title: "", dir: "", file: "" };
      document.title = "iseohyun.com";
      document.body.classList.remove("admin-mode");
    } else {
      state.currentPath = urlPath;

      const list = window.SiteModules.hierarchyListCached;
      if (list) {
        findAndPopulateState(list, state.currentPath);
      }

      // admin 페이지 여부에 따라 body.admin-mode 클래스 토글
      const isAdminPage = urlPath.endsWith("/admin.html") || urlPath.endsWith("/admin.htm");
      if (isAdminPage) {
        document.body.classList.add("admin-mode");
      } else {
        document.body.classList.remove("admin-mode");
      }
    }

    // A. 사이드바 트리 활성 메뉴 노드 표시 및 오토 익스팬드
    highlightSitemapTree(state.currentPath);

    // B. 목차 초기화
    if (window.SiteModules.TOC && typeof window.SiteModules.TOC.init === 'function') {
      window.SiteModules.TOC.init();
    }

    // C. 목차 리스트 렌더링
    const tocTree = document.getElementById("toc-tree");
    if (tocTree) {
      tocTree.innerHTML = "";
      if (window.SiteModules.TOC && typeof window.SiteModules.TOC.addContentsList === 'function' && !isHome) {
        window.SiteModules.TOC.addContentsList(tocTree);
      }
    }

    // D. 목차 탭 문서 세부사항 및 버튼 갱신
    updateTOCPanelInfo(isHome, docTitle);

    // E. 참조 및 copyright 재계산 생략 (피드백 이관 이후 맨 아래 배치 위해 연기)

    // F. 코드 하이라이트 구동
    if (window.SiteModules.CodeLoader && typeof window.SiteModules.CodeLoader.init === 'function') {
      window.SiteModules.CodeLoader.init();
    }

    // G. 코드 카피 버튼 재구축
    if (window.SiteModules.Clipboard && typeof window.SiteModules.Clipboard.init === 'function') {
      window.SiteModules.Clipboard.init();
    }

    // I. 튜토리얼 기능 연동
    updatePageFeatures();

    // I-2. MathJax 수식 렌더링 구동 (DOM 수정 완료 후, 최종 스크롤 정렬 직전에 실행하여 렌더링 후의 정확한 높이로 스크롤 정렬 보장)
    if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
      const article = document.querySelector("article");
      if (article) {
        window.MathJax.typesetPromise([article]).catch(err => {
          console.warn("MathJax post-load typeset error:", err);
        });
      }
    }

    // E. 참조 및 copyright 재계산
    if (window.SiteModules.Document && typeof window.SiteModules.Document.init === 'function') {
      window.SiteModules.Document.init();
    }

    // I-4. 모든 서브페이지 최하단 Q&A 피드백 영역 렌더링
    const isAdminPage = urlPath && (urlPath.endsWith("/admin.html") || urlPath.endsWith("/admin.htm"));
    if (!isHome && !isAdminPage) {
      renderPageFeedbackArea(urlPath);
      if (urlPath === "/help.html") {
        bindHelpSuggestionEvents(document.querySelector("article"));
      }
    } else {
      const oldArea = document.getElementById("page-feedback-area");
      if (oldArea) oldArea.remove();
    }

    // J. 서브 앵커 스크롤바 정렬 (querySelector 대신 안전한 getElementById 사용)
    const hash = window.location.hash;
    const lastHashIndex = hash.lastIndexOf("#");
    if (lastHashIndex > 0) {
      const subHash = hash.substring(lastHashIndex);
      if (subHash.startsWith('#')) {
        const id = decodeURIComponent(subHash.substring(1));
        const targetElement = document.getElementById(id);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: "smooth" });
        }
      }
    } else {
      window.scrollTo(0, 0);
    }
  }

  function highlightSitemapTree(currentPath) {
    const sitemapTree = document.getElementById("sitemap-tree");
    if (!sitemapTree) return;

    sitemapTree.querySelectorAll(".this-doc, .this-path, a.this-path").forEach(el => {
      el.classList.remove("this-doc", "this-path");
    });

    if (currentPath === "/index.html" || currentPath === "/") return;

    const activeAnchor = sitemapTree.querySelector(`a[href$="${currentPath}"]`);
    if (activeAnchor) {
      let li = activeAnchor.parentElement;
      li.classList.add("this-doc");

      let parent = li.parentElement;
      while (parent && parent !== sitemapTree) {
        if (parent.tagName === "LI" && parent.classList.contains("folder")) {
          parent.classList.add("this-path");
          parent.classList.remove("collapsed");
        }
        parent = parent.parentElement;
      }
    }
  }

  function updateTOCPanelInfo(isHome, pageTitle) {
    const panelTitle = document.getElementById("panel-title");
    const tabTOC = document.getElementById("tab-toc");
    if (!tabTOC) return;

    const existingDetails = tabTOC.querySelector(".toc-doc-details");
    if (existingDetails) existingDetails.remove();

    if (isHome) {
      if (panelTitle && document.getElementById("nav-toc").classList.contains("active")) {
        panelTitle.textContent = "목차 보기";
      }
      const tocTree = document.getElementById("toc-tree");
      if (tocTree) {
        tocTree.innerHTML = "<li style='padding: 10px; color: #747775; font-size: 0.85em;'>목차를 표시할 수 없는 페이지입니다.</li>";
      }
      return;
    }

    const state = window.SiteModules.state;

    // 문서 세부 정보 패널 구성
    const detailsDiv = document.createElement("div");
    detailsDiv.className = "toc-doc-details";

    // 5-2. 하단 이전글/다음글 단추 배치
    const navBtnDiv = document.createElement("div");
    navBtnDiv.className = "toc-doc-nav-buttons";

    const prevBtn = document.createElement("a");
    prevBtn.className = "nav-btn";
    if (state.prv_doc && state.prv_doc.file) {
      const parentDirs = state.prv_doc.parentDirs || "";
      prevBtn.href = `/${parentDirs}${state.prv_doc.dir || ""}${state.prv_doc.file}`;
      prevBtn.textContent = "이전글";
    } else {
      prevBtn.classList.add("disabled");
      prevBtn.textContent = "이전글 없음";
    }
    navBtnDiv.appendChild(prevBtn);

    const nextBtn = document.createElement("a");
    nextBtn.className = "nav-btn";
    if (state.next_doc && state.next_doc.file) {
      const parentDirs = state.next_doc.parentDirs || "";
      nextBtn.href = `/${parentDirs}${state.next_doc.dir || ""}${state.next_doc.file}`;
      nextBtn.textContent = "다음글";
    } else {
      nextBtn.classList.add("disabled");
      nextBtn.textContent = "다음글 없음";
    }
    navBtnDiv.appendChild(nextBtn);

    detailsDiv.appendChild(navBtnDiv);
    tabTOC.insertBefore(detailsDiv, tabTOC.firstChild);

    // 액티브 패널 타이틀 지정
    if (panelTitle && document.getElementById("nav-toc").classList.contains("active")) {
      panelTitle.textContent = pageTitle || state.cur_doc.title || "목차";
    }
  }

  function renderHierarchy(data, parentElement, parentDirectories, directory) {
    if (Array.isArray(data)) {
      data.forEach((item) => {
        const listItem = document.createElement('li');
        const currentDirectory = item.디렉토리 || "";

        const hasFile = item.hasOwnProperty('파일명') || !item.hasOwnProperty('목록');
        if (hasFile) {
          const fileName = item.hasOwnProperty('파일명') ? item.파일명 : "index.html";
          const anchor = document.createElement('a');
          anchor.href = `/${parentDirectories}${currentDirectory}${fileName}`;
          anchor.textContent = item.주제;
          listItem.appendChild(anchor);

          if (item.hasOwnProperty('목록')) {
            listItem.classList.add('folder');
            if (directory.startsWith(currentDirectory)) {
              directory = directory.substring(currentDirectory.length);
              anchor.classList.add('this-path');
              listItem.classList.add('this-path');
            } else {
              listItem.classList.add('collapsed');
            }

            listItem.addEventListener('click', function (event) {
              if (event.target.closest('li') !== this) return;
              event.stopPropagation();
              this.classList.toggle('collapsed');
            });
          }
        } else {
          const text = document.createElement('span');
          text.textContent = item.주제;

          listItem.classList.add('folder');
          listItem.appendChild(text);

          if (directory.startsWith(currentDirectory)) {
            directory = directory.substring(currentDirectory.length);
            text.classList.add('this-path');
          } else {
            listItem.classList.add('collapsed');
          }

          listItem.addEventListener('click', function (event) {
            if (event.target.closest('li') !== this) return;
            event.stopPropagation();
            this.classList.toggle('collapsed');
          });
        }

        if (item.display == "hidden")
          return;

        if (item.목록 && item.목록.length > 0) {
          const sublist = document.createElement('ul');
          const previousParentDirectories = parentDirectories;
          parentDirectories += currentDirectory;
          renderHierarchy(item.목록, sublist, parentDirectories, directory);

          parentDirectories = previousParentDirectories;
          listItem.appendChild(sublist);
        }

        parentElement.appendChild(listItem);
      });
    }
  }

  function trigBoard(mode = "trigger") {
    const container = document.getElementById("sidebar-container");
    const panel = document.getElementById("sidebar-panel");
    if (!container || !panel) return;

    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      if (mode === "trigger") {
        container.classList.toggle("active");
      } else if (mode === "visible") {
        container.classList.add("active");
      } else {
        container.classList.remove("active");
      }
    } else {
      const isCollapsed = panel.classList.contains("collapsed");
      let nextState = isCollapsed;

      if (mode === "trigger") {
        nextState = !isCollapsed;
      } else if (mode === "visible") {
        nextState = false;
      } else {
        nextState = true;
      }

      setPanelCollapsed(nextState);
    }
  }

  function setPanelCollapsed(shouldCollapse) {
    const panel = document.getElementById("sidebar-panel");
    if (!panel) return;

    if (shouldCollapse) {
      panel.classList.add("collapsed");
      document.documentElement.style.setProperty('--sidebar-width', '60px');
      // 패널이 접히면 모든 탭 아이콘에서 active 클래스를 제거하여 비활성 상태로 보이도록 합니다.
      const tabs = ["nav-sitemap", "nav-toc", "nav-search"];
      tabs.forEach(id => {
        const tabEl = document.getElementById(id);
        if (tabEl) tabEl.classList.remove("active");
      });
    } else {
      panel.classList.remove("collapsed");
      document.documentElement.style.setProperty('--sidebar-width', '300px');

      // 패널이 펼쳐질 때, 만약 활성화된 탭이 없다면 기본적으로 nav-sitemap을 활성화합니다.
      const tabs = ["nav-sitemap", "nav-toc", "nav-search"];
      const activeExists = tabs.some(id => {
        const tabEl = document.getElementById(id);
        return tabEl && tabEl.classList.contains("active");
      });
      if (!activeExists) {
        const defaultTab = document.getElementById("nav-sitemap");
        if (defaultTab) {
          defaultTab.classList.add("active");
          const paneEl = document.getElementById("tab-sitemap");
          if (paneEl) {
            document.querySelectorAll("#sidebar-panel .tab-pane").forEach(pane => {
              pane.classList.remove("active");
            });
            paneEl.classList.add("active");
          }
        }
      }
    }
  }

  function setDblClickListner(e) {
    const article = document.querySelector("article");
    if (!article) return;
    article.removeEventListener('dblclick', setDblClickListner);
    article.addEventListener('click', setClickListner);
    trigBoard("visible");
  }

  function setClickListner(e) {
    const article = document.querySelector("article");
    if (!article) return;
    article.removeEventListener('click', setClickListner);
    setTimeout(() => {
      article.addEventListener('dblclick', setDblClickListner);
    }, 2000);
    trigBoard("hidden");
  }

  function createModals() {
    const body = document.querySelector("body");

    // Help Modal
    if (!document.getElementById("help-modal-overlay")) {
      const helpModal = document.createElement("div");
      helpModal.id = "help-modal-overlay";
      helpModal.className = "site-modal-overlay";
      helpModal.innerHTML = `
        <div class="site-modal-card">
          <div class="site-modal-header">
            <span>인터페이스 가이드 (Help)</span>
            <span class="site-modal-close-btn" id="help-modal-close">&times;</span>
          </div>
          <div class="site-modal-body" id="help-modal-body"></div>
        </div>
      `;
      body.appendChild(helpModal);
    }

    // Login Modal
    if (!document.getElementById("login-modal-overlay")) {
      const loginModal = document.createElement("div");
      loginModal.id = "login-modal-overlay";
      loginModal.className = "site-modal-overlay";
      loginModal.innerHTML = `
        <div class="site-modal-card">
          <div class="site-modal-header">
            <span id="login-modal-title">로그인</span>
            <span class="site-modal-close-btn" id="login-modal-close">&times;</span>
          </div>
          <div class="site-modal-body login-modal-body" style="text-align: center; padding: 20px;">
            <button class="site-login-btn google-btn" id="login-google">구글 로그인</button>
            <button class="site-login-btn naver-btn" id="login-naver">네이버 로그인</button>
            <button class="site-login-btn kakao-btn" id="login-kakao">카카오 로그인</button>
            <button class="site-login-btn logout-btn" id="login-logout">로그아웃</button>
          </div>
        </div>
      `;
      body.appendChild(loginModal);
    }
  }

  function bindSidebarEvents() {
    const navHomeBtn = document.getElementById("nav-home");
    if (navHomeBtn) {
      navHomeBtn.addEventListener("click", () => {
        window.location.hash = "#/";
      });
    }

    const homeBtn = document.getElementById("home-btn");
    if (homeBtn) {
      homeBtn.addEventListener("click", () => {
        window.location.hash = "#/";
      });
    }

    // 모든폴더보기 액션 버튼 기동 (전체 열기/닫기 토글 & 현재 경로 열기)
    const toggleAllBtn = document.getElementById("sitemap-toggle-all-btn");
    if (toggleAllBtn) {
      toggleAllBtn.addEventListener("click", () => {
        const folders = document.querySelectorAll("#sitemap-tree li.folder, #sitemap-tree li");
        const isCollapse = toggleAllBtn.textContent === "전체 닫기";

        folders.forEach(f => {
          if (f.classList.contains("folder") || f.querySelector("ul")) {
            if (isCollapse) {
              f.classList.add("collapsed");
            } else {
              f.classList.remove("collapsed");
            }
          }
        });

        toggleAllBtn.textContent = isCollapse ? "전체 열기" : "전체 닫기";
      });
    }

    const openCurrentBtn = document.getElementById("sitemap-open-current-btn");
    if (openCurrentBtn) {
      openCurrentBtn.addEventListener("click", () => {
        // 1. Collapse all folders first
        const folders = document.querySelectorAll("#sitemap-tree li.folder, #sitemap-tree li");
        folders.forEach(f => {
          if (f.classList.contains("folder") || f.querySelector("ul")) {
            f.classList.add("collapsed");
          }
        });
        // 2. Sync the toggle-all button text
        const toggleAllBtn = document.getElementById("sitemap-toggle-all-btn");
        if (toggleAllBtn) {
          toggleAllBtn.textContent = "전체 열기";
        }
        // 3. Highlight/expand current path
        const state = window.SiteModules.state;
        highlightSitemapTree(state.currentPath);
      });
    }

    const searchOptions = document.querySelectorAll(".search-type-option");
    searchOptions.forEach(opt => {
      opt.addEventListener("click", () => {
        searchOptions.forEach(o => o.classList.remove("active"));
        opt.classList.add("active");
        
        const radio = opt.querySelector("input[type='radio']");
        if (radio) {
          radio.checked = true;
          const input = document.getElementById("sidebar-search-input");
          if (input) {
            if (radio.value === "title") {
              input.placeholder = "문서 제목 검색...";
            } else if (radio.value === "tag") {
              input.placeholder = "Tag 검색...";
            } else {
              input.placeholder = "전체 문서 검색...";
            }
            input.dispatchEvent(new Event("input"));
          }
        }
      });
    });

    const tabs = ["nav-sitemap", "nav-toc", "nav-search"];
    tabs.forEach(tabId => {
      const el = document.getElementById(tabId);
      if (el) {
        el.addEventListener("click", () => {
          const isActive = el.classList.contains("active");
          const panel = document.getElementById("sidebar-panel");
          const isPanelCollapsed = panel ? panel.classList.contains("collapsed") : true;

          if (isActive && !isPanelCollapsed) {
            // 이미 활성화된 탭을 열린 상태에서 또 누르면 좁게보기(접기)
            trigBoard("hidden");
          } else {
            tabs.forEach(id => {
              const tabEl = document.getElementById(id);
              if (tabEl) tabEl.classList.remove("active");
            });
            document.querySelectorAll("#sidebar-panel .tab-pane").forEach(pane => {
              pane.classList.remove("active");
            });

            el.classList.add("active");
            const targetTabPane = el.getAttribute("data-tab");
            const paneEl = document.getElementById(targetTabPane);
            if (paneEl) paneEl.classList.add("active");

            trigBoard("visible");
          }
        });
      }
    });

    const loginBtn = document.getElementById("nav-login");
    const loginClose = document.getElementById("login-modal-close");
    const loginOverlay = document.getElementById("login-modal-overlay");

    if (loginBtn) {
      loginBtn.addEventListener("click", () => {
        if (loginOverlay) loginOverlay.classList.add("active");
      });
    }
    if (loginClose) {
      loginClose.addEventListener("click", () => {
        if (loginOverlay) loginOverlay.classList.remove("active");
      });
    }

    const loginGoogle = document.getElementById("login-google");
    const loginNaver = document.getElementById("login-naver");
    const loginKakao = document.getElementById("login-kakao");
    const loginLogout = document.getElementById("login-logout");

    if (loginGoogle) {
      loginGoogle.addEventListener("click", () => {
        window.SiteModules.Auth.googleLogin(() => {
          alert("구글 로그인 성공!");
          if (loginOverlay) loginOverlay.classList.remove("active");
        });
      });
    }
    if (loginNaver) {
      loginNaver.addEventListener("click", () => {
        window.SiteModules.Auth.naverLogin();
      });
    }
    if (loginKakao) {
      loginKakao.addEventListener("click", () => {
        window.SiteModules.Auth.kakaoLogin();
      });
    }
    if (loginLogout) {
      loginLogout.addEventListener("click", () => {
        window.SiteModules.Auth.logoutUser(() => {
          alert("로그아웃 되었습니다.");
          if (loginOverlay) loginOverlay.classList.remove("active");
        });
      });
    }

    const helpBtn = document.getElementById("nav-help");
    if (helpBtn) {
      helpBtn.addEventListener("click", () => {
        window.location.hash = "#/help.html";
      });
    }

    const infoBtn = document.getElementById("nav-info");
    if (infoBtn) {
      infoBtn.addEventListener("click", () => {
        window.location.hash = "#/info.html";
      });
    }

    const searchInput = document.getElementById("sidebar-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim().toLowerCase();
        const resultsContainer = document.getElementById("sidebar-search-results");
        if (!resultsContainer) return;
        resultsContainer.innerHTML = "";

        if (query.length < 2) return;

        // Get active search type
        const activeRadio = document.querySelector("input[name='search-type']:checked");
        const searchType = activeRadio ? activeRadio.value : "title";

        let matches = [];

        if (searchType === "title") {
          const list = window.SiteModules.hierarchyListCached;
          matches = searchHierarchy(list, query);
        } else if (searchType === "tag") {
          const cache = window.SiteModules.searchCache || [];
          matches = cache.filter(item => {
            return item.tags.some(tag => tag.includes(query));
          });
        } else if (searchType === "all") {
          const cache = window.SiteModules.searchCache || [];
          matches = cache.filter(item => {
            const inTitle = item.title.toLowerCase().includes(query);
            const inTags = item.tags.some(tag => tag.includes(query));
            const inArticle = item.articleText.includes(query);
            return inTitle || inTags || inArticle;
          });
        }

        if (matches.length === 0) {
          const li = document.createElement("li");
          li.style.padding = "10px";
          li.style.color = "#747775";
          li.style.fontSize = "0.85em";
          li.textContent = "검색 결과가 없습니다.";
          resultsContainer.appendChild(li);
          return;
        }

        matches.forEach(match => {
          const li = document.createElement("li");
          li.innerHTML = `
            <a href="${match.url}">${match.title}</a>
            <span class="search-path-desc">${match.breadcrumb}</span>
          `;
          resultsContainer.appendChild(li);
        });
      });
    }
  }

  async function bindHelpSuggestionEvents(container) {
    const textarea = container.querySelector('#user-suggestion-textarea');
    const submitBtn = container.querySelector('#submit-suggestion-btn');
    const replyTextarea = container.querySelector('#dev-reply-textarea');

    try {
      const auth = window.SiteModules.FirebaseConfig.getAuth();
      const db = window.SiteModules.FirebaseConfig.getDb();
      if (auth && auth.currentUser && db) {
        const uid = auth.currentUser.uid;
        db.collection('admins').doc(uid).get().then(docSnap => {
          if (docSnap.exists) {
            let adminDiv = container.querySelector('#help-admin-link-area');
            if (!adminDiv) {
              adminDiv = document.createElement('div');
              adminDiv.id = 'help-admin-link-area';
              adminDiv.style.cssText = "margin-bottom: 20px; padding: 12px; background-color: #2b3a4a; border-radius: 6px; border: 1px solid #3b4a5a; text-align: center;";
              adminDiv.innerHTML = `<a href="/admin.html" style="color: #64b5f6; font-weight: bold; text-decoration: none; font-size: 14px;">⚙️ 관리자 대시보드로 이동</a>`;
              container.insertBefore(adminDiv, container.firstChild);
            }
          }
        }).catch(err => console.error("Admin check inside help failed:", err));
      }
    } catch (e) {
      console.error(e);
    }

    if (!textarea || !submitBtn) return;

    try {
      const data = await window.SiteModules.Auth.getUserSuggestion();
      if (data) {
        if (replyTextarea) {
          replyTextarea.value = data.reply || "";
        }
        if (data.suggestion && data.suggestion.trim() !== "") {
          textarea.value = data.suggestion;
          submitBtn.innerText = "수정";
        } else {
          submitBtn.innerText = "보내기";
        }
      } else {
        submitBtn.innerText = "보내기";
      }

      // 기존 이벤트 리스너 제거를 위한 클론 처리
      const newSubmitBtn = submitBtn.cloneNode(true);
      submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);

      newSubmitBtn.addEventListener('click', async () => {
        const text = textarea.value.trim();
        if (!text) {
          alert("건의사항을 입력해 주세요.");
          return;
        }

        if (newSubmitBtn.innerText === "보내기") {
          newSubmitBtn.disabled = true;
          await window.SiteModules.Auth.submitSuggestion(text);
          newSubmitBtn.innerText = "수정";
          newSubmitBtn.disabled = false;
          alert("건의사항이 등록되었습니다.");
        } else if (newSubmitBtn.innerText === "수정") {
          newSubmitBtn.innerText = "수정사항으로 건의하시겠습니까?";
        } else if (newSubmitBtn.innerText === "수정사항으로 건의하시겠습니까?") {
          newSubmitBtn.disabled = true;
          await window.SiteModules.Auth.submitSuggestion(text);
          newSubmitBtn.innerText = "수정";
          newSubmitBtn.disabled = false;
          alert("건의사항이 수정되었습니다.");
        }
      });
    } catch (err) {
      console.error("건의사항 바인딩 실패:", err);
    }
  }

  async function buildSearchCache(list) {
    window.SiteModules.searchCache = [];
    
    const pages = [];
    function traverse(data, currentPath = "", currentBreadcrumb = "") {
      if (!Array.isArray(data)) return;
      data.forEach(item => {
        const title = item.주제 || "";
        const dir = item.디렉토리 || "";
        const pathDesc = currentBreadcrumb ? `${currentBreadcrumb} > ${title}` : title;
        const hasFile = item.hasOwnProperty('파일명') || !item.hasOwnProperty('목록');
        if (hasFile) {
          const fileName = item.hasOwnProperty('파일명') ? item.파일명 : "index.html";
          const fullUrl = `/${currentPath}${dir}${fileName}`;
          pages.push({
            title: title,
            url: fullUrl,
            breadcrumb: pathDesc
          });
        }
        if (item.목록 && item.목록.length > 0) {
          traverse(item.목록, currentPath + dir, pathDesc);
        }
      });
    }
    traverse(list);

    const concurrency = 5;
    let index = 0;

    async function worker() {
      while (index < pages.length) {
        const pageIndex = index++;
        if (pageIndex >= pages.length) break;
        const page = pages[pageIndex];

        try {
          const res = await fetch(page.url);
          if (!res.ok) continue;
          const htmlText = await res.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlText, "text/html");
          
          const tagsEl = doc.querySelector("tags");
          const tagsText = tagsEl ? tagsEl.textContent : "";
          const tags = tagsText.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

          const articleEl = doc.querySelector("article");
          let articleText = "";
          if (articleEl) {
            const clone = articleEl.cloneNode(true);
            clone.querySelectorAll("script, style, tags, #site-intro, #site-toc-panel").forEach(el => el.remove());
            articleText = (clone.textContent || "").toLowerCase().replace(/\s+/g, ' ').trim();
          }

          window.SiteModules.searchCache.push({
            title: page.title,
            url: page.url,
            breadcrumb: page.breadcrumb,
            tags: tags,
            articleText: articleText,
            hasArticle: !!articleEl
          });
        } catch (err) {
          console.warn(`Failed to index page ${page.url}:`, err);
        }
      }
    }

    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);
  }

  function searchHierarchy(data, query, results = [], currentPath = "", currentBreadcrumb = "") {
    if (!Array.isArray(data)) return results;
    data.forEach(item => {
      const title = item.주제 || "";
      const dir = item.디렉토리 || "";
      const pathDesc = currentBreadcrumb ? `${currentBreadcrumb} > ${title}` : title;

      const hasFile = item.hasOwnProperty('파일명') || !item.hasOwnProperty('목록');
      if (hasFile) {
        const fileName = item.hasOwnProperty('파일명') ? item.파일명 : "index.html";
        const fullUrl = `/${currentPath}${dir}${fileName}`;
        if (title.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            title: title,
            url: fullUrl,
            breadcrumb: pathDesc
          });
        }
      }

      if (item.목록 && item.목록.length > 0) {
        searchHierarchy(item.목록, query, results, currentPath + dir, pathDesc);
      }
    });
    return results;
  }



  function updatePageFeatures() {
    const featuresContainer = document.getElementById("sidebar-page-features");
    if (!featuresContainer) return;
    featuresContainer.innerHTML = "";

    const tutorials = document.querySelectorAll(".tutorial");
    if (tutorials.length > 0) {
      const tutorialBtn = document.createElement("div");
      tutorialBtn.className = "nav-item";
      tutorialBtn.id = "sidebar-tutorial-toggle";
      tutorialBtn.setAttribute("data-tooltip", "튜토리얼 표시 토글");
      tutorialBtn.innerHTML = `<span class="material-symbols-outlined">school</span>`;

      let anyVisible = false;
      tutorials.forEach(t => {
        if (getComputedStyle(t).display !== "none") anyVisible = true;
      });
      if (anyVisible) tutorialBtn.classList.add("active");

      tutorialBtn.addEventListener("click", () => {
        trigTutorialInSidebar();
      });

      featuresContainer.appendChild(tutorialBtn);
    }
  }

  function trigTutorialInSidebar() {
    const tutorials = document.querySelectorAll(".tutorial");
    const iconBtn = document.getElementById("sidebar-tutorial-toggle");
    if (tutorials.length === 0) return;

    let active = false;
    tutorials.forEach(tutorial => {
      const currentDisplay = getComputedStyle(tutorial).display;
      if (currentDisplay === "none") {
        tutorial.style.display = "";
        active = true;
      } else {
        tutorial.style.display = "none";
      }
    });

    if (iconBtn) {
      if (active) {
        iconBtn.classList.add("active");
      } else {
        iconBtn.classList.remove("active");
      }
    }
  }

  function findAndPopulateState(data, targetPath, parentDirectories = "", currentBreadcrumb = "") {
    if (!Array.isArray(data)) return false;

    let cleanTarget = targetPath;
    if (!cleanTarget.startsWith('/')) cleanTarget = '/' + cleanTarget;
    const hashIndex = cleanTarget.indexOf('#');
    if (hashIndex !== -1) {
      cleanTarget = cleanTarget.substring(0, hashIndex);
    }

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const currentDir = item.디렉토리 || "";
      const pathDesc = currentBreadcrumb ? `${currentBreadcrumb} >> ${item.주제}` : item.주제;

      const hasFile = item.hasOwnProperty('파일명') || !item.hasOwnProperty('목록');
      if (hasFile) {
        const fileName = item.hasOwnProperty('파일명') ? item.파일명 : "index.html";
        const resolvedPath = `/${parentDirectories}${currentDir}${fileName}`;
        if (resolvedPath === cleanTarget) {
          const state = window.SiteModules.state;
          state.cur_doc.title = item.주제;
          state.cur_doc.dir = item.디렉토리;
          state.cur_doc.file = fileName;
          state.category = currentBreadcrumb;

          // 이전글 설정
          if (i > 0) {
            const prev = data[i - 1];
            state.prv_doc.title = prev.주제;
            state.prv_doc.dir = prev.디렉토리;
            state.prv_doc.file = prev.hasOwnProperty('파일명') ? prev.파일명 : (prev.hasOwnProperty('목록') ? "" : "index.html");
            state.prv_doc.parentDirs = parentDirectories;
          } else {
            state.prv_doc = { title: "", dir: "", file: "" };
          }

          // 다음글 설정
          if (i < data.length - 1) {
            const next = data[i + 1];
            state.next_doc.title = next.주제;
            state.next_doc.dir = next.디렉토리;
            state.next_doc.file = next.hasOwnProperty('파일명') ? next.파일명 : (next.hasOwnProperty('목록') ? "" : "index.html");
            state.next_doc.parentDirs = parentDirectories;
          } else {
            state.next_doc = { title: "", dir: "", file: "" };
          }

          return true;
        }
      }

      if (item.목록 && item.목록.length > 0) {
        const found = findAndPopulateState(item.목록, targetPath, parentDirectories + currentDir, pathDesc);
        if (found) return true;
      }
    }
    return false;
  }

  function findHierarchyPath(hierarchy, title, currentPath = "") {
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
          } else {
            const fileName = item.hasOwnProperty('파일명') ? item.파일명 : "index.html";
            return path + fileName;
          }
        }
      }

      if (!found) {
        return null;
      }
    }
    return path;
  }

  function getPageKey(path) {
    if (!path) return "@home";

    // 1. 쿼리 파라미터 분리 제거
    let cleanPath = path.split('?')[0];

    // 2. 앞뒤 슬래시 정리 및 확장자 제거
    if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
    if (cleanPath.endsWith('/')) cleanPath = cleanPath.substring(0, cleanPath.length - 1);
    cleanPath = cleanPath.replace(/\.html?$/i, '');

    // 3. 파일명이 'index' 인 경우 소프로젝트 범주로 취합하기 위해 떼어냄
    const parts = cleanPath.split('/');
    if (parts.length > 0 && parts[parts.length - 1].toLowerCase() === 'index') {
      parts.pop();
    }

    if (parts.length === 0 || (parts.length === 1 && parts[0] === '')) {
      return '@home';
    }

    return '@' + parts.join('>');
  }

  function renderPageFeedbackArea(urlPath) {
    if (urlPath === "/index.html" || urlPath === "/" || !urlPath) return;

    // admin 페이지인 경우 질답 폼을 생성하지 않음
    if (urlPath.endsWith("/admin.html") || urlPath.endsWith("/admin.htm")) {
      const oldArea = document.getElementById("page-feedback-area");
      if (oldArea) oldArea.remove();
      return;
    }

    if (urlPath === "/help.html") {
      // 관리자가 아닐때, 하단에 개별 페이지마다 동작하는 개별페이지 질의 폼이 생성되지 않도록 함
      window.SiteModules.FirebaseConfig.loadSDKs().then(() => {
        const auth = window.SiteModules.FirebaseConfig.getAuth();
        const db = window.SiteModules.FirebaseConfig.getDb();
        if (auth && auth.currentUser && db) {
          db.collection('admins').doc(auth.currentUser.uid).get().then(docSnap => {
            if (docSnap.exists) {
              renderFeedbackAreaActual(urlPath);
            }
          }).catch(err => {
            console.error("Admin check in feedback area failed:", err);
          });
        }
      });
      return;
    }

    renderFeedbackAreaActual(urlPath);
  }

  function renderFeedbackAreaActual(urlPath) {
    const article = document.querySelector("article");
    if (!article) return;

    const oldArea = document.getElementById("page-feedback-area");
    if (oldArea) oldArea.remove();

    const feedbackArea = document.createElement("div");
    feedbackArea.id = "page-feedback-area";
    feedbackArea.style.cssText = "margin-top: 50px; border-top: 1px solid #ddd; padding-top: 20px;";

    const pageKey = getPageKey(urlPath);

    feedbackArea.innerHTML = `
      <h3 style="font-size: 16px; margin-bottom: 15px; font-weight: bold;">💬 이 문서에 대한 질문 및 건의</h3>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 12px; font-weight: bold; background-color: #e8f0fe; color: #1a73e8; padding: 4px 8px; border-radius: 4px; border: 1px solid #d2e3fc; user-select: none;">${pageKey}</span>
          <span style="font-size: 11px; color: #747775;">(이 카테고리 태그가 질문과 함께 전송됩니다)</span>
        </div>
        <div>
          <textarea id="page-suggestion-textarea" placeholder="이 문서에 대한 건의사항이나 질문을 작성해 주세요." style="width: 100%; height: 80px; padding: 10px; border-radius: 6px; border: 1px solid #ccc; font-family: inherit; font-size: 13px; resize: vertical; box-sizing: border-box;"></textarea>
        </div>
        <div style="display: flex; justify-content: flex-end;">
          <button id="page-suggestion-submit-btn" style="padding: 8px 16px; background-color: #228be6; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px; transition: background-color 0.2s ease;">보내기</button>
        </div>
        <div style="margin-top: 15px;">
          <h4 style="font-size: 13px; font-weight: bold; margin-bottom: 5px; color: #495057;">이 문서의 질답 이력</h4>
          <div id="page-feedback-history" style="width: 100%; max-height: 200px; overflow-y: auto; padding: 10px; border-radius: 6px; border: 1px solid #ccc; background-color: #f1f3f5; font-size: 13px; box-sizing: border-box; white-space: pre-wrap; line-height: 1.5em; color: #495057;">이력 정보를 불러오는 중입니다...</div>
        </div>
      </div>
    `;

    const lastMod = document.getElementById("last-modified");
    if (lastMod) {
      article.insertBefore(feedbackArea, lastMod);
    } else {
      article.appendChild(feedbackArea);
    }

    const textarea = document.getElementById("page-suggestion-textarea");
    textarea.value = "";

    bindPageFeedbackEvents(feedbackArea, pageKey);
  }

  async function bindPageFeedbackEvents(container, pageKey) {
    const textarea = container.querySelector('#page-suggestion-textarea');
    const submitBtn = container.querySelector('#page-suggestion-submit-btn');
    const historyDiv = container.querySelector('#page-feedback-history');
    if (!textarea || !submitBtn) return;

    try {
      const data = await window.SiteModules.Auth.getUserSuggestion();
      updatePageFeedbackHistoryDisplay(data, pageKey, historyDiv);

      submitBtn.addEventListener('click', async () => {
        const userText = textarea.value.trim();
        if (!userText) {
          alert("질문 내용을 입력해 주세요.");
          return;
        }

        const text = pageKey + " " + userText;
        submitBtn.disabled = true;
        await window.SiteModules.Auth.submitSuggestion(text);
        textarea.value = "";
        submitBtn.disabled = false;
        alert("질문이 등록되었습니다.");

        const newData = await window.SiteModules.Auth.getUserSuggestion();
        updatePageFeedbackHistoryDisplay(newData, pageKey, historyDiv);
      });
    } catch (err) {
      console.error("페이지 피드백 연동 실패:", err);
      if (historyDiv) {
        historyDiv.innerHTML = `<span style="color:red; font-style:italic;">이력 데이터를 가져오지 못했습니다.</span>`;
      }
    }
  }

  function updatePageFeedbackHistoryDisplay(data, pageKey, historyDiv) {
    if (!historyDiv) return;

    if (!data || !data.reply) {
      historyDiv.innerHTML = `<span style="color:#868e96; font-style:italic;">과거 답변 기록이 없습니다.</span>`;
      return;
    }

    const blocks = data.reply.split("\n\n");
    const filteredBlocks = blocks.filter(block => block.includes(pageKey));

    if (filteredBlocks.length > 0) {
      historyDiv.textContent = filteredBlocks.join("\n\n");
    } else {
      historyDiv.innerHTML = `<span style="color:#868e96; font-style:italic;">이 문서에 대해 등록된 답변이 없습니다.</span>`;
    }
  }

  return {
    init: init,
    trigBoard: trigBoard,
    findHierarchyPath: findHierarchyPath
  };
})();
