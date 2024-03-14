// body > board > board-icons, base-ul
const body = document.querySelector("body");
const board = document.createElement("div");
board.setAttribute("id", "board");
body.appendChild(board);
var category = "";

const boardIcons = document.createElement("div");
boardIcons.setAttribute("id", "board-icons");
board.appendChild(boardIcons);

const exit = document.createElement("div");
exit.setAttribute("id", "exit");
exit.addEventListener("click", function (ev) { trigBoard(); });
boardIcons.appendChild(exit);

const baseUl = document.createElement("ul");
board.appendChild(baseUl);

// hierarchy.json으로부터 폴더 정보 읽음
var request = new XMLHttpRequest();
request.open('GET', '/hierarchy.json');
request.responseType = 'json';
request.send();
request.onload = function () {
  var list = request.response;
  var currentPath = window.location.pathname;
  var pathSegments = currentPath.split('/');
  var directory = pathSegments.join('/');
  if (directory.startsWith('/')) {
    directory = directory.substring(1);
  }

  // 리스트를 읽어 base-ul에 입력
  renderHierarchy(list, baseUl, '', directory);

  // 헤더를 작성한다. (본인 경로를 알아야 한다.)
  createHeader();
}

function renderHierarchy(data, parentElement, parentDirectories, directory) {
  if (Array.isArray(data)) {
    data.forEach(item => {
      const listItem = document.createElement('li');
      const currentDirectory = item.디렉토리;

      // 목록이 파일인지 디렉토리인지 확인한다.
      if (item.hasOwnProperty('파일명') && item.파일명) {
        // 현재 파일인 확인한다.

        if ((currentDirectory + item.파일명) === directory) {
          listItem.textContent = item.주제;
          const sublist = document.createElement('ul');
          listItem.classList.toggle('this-doc');
          listItem.appendChild(sublist);

          // 현재 파일의 헤더를 읽어온다.
          addContentsList(sublist);

          listItem.addEventListener('click', function () {
            event.stopPropagation();
            this.classList.toggle('collapsed');
          });
        } else {
          const anchor = document.createElement('a');
          anchor.href = `/${parentDirectories}${currentDirectory}${item.파일명}`;
          anchor.textContent = item.주제;

          listItem.appendChild(anchor);
        }
      } else {
        // 디렉토리인 경우에 수행한다.
        const text = document.createElement('span');
        text.textContent = item.주제;

        listItem.appendChild(text);
        listItem.classList.add('folder');

        if (directory.startsWith(currentDirectory)) {
          directory = directory.substring(currentDirectory.length);
          text.classList.add('this-path');
          category += " >> " + item.주제;
        } else {
          listItem.classList.add('collapsed');
        }

        listItem.addEventListener('click', function () {
          event.stopPropagation();
          this.classList.toggle('collapsed');
        });
      }

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

  function getParentDirectories(item) {
    let directories = parentDirectories.split('/').filter(Boolean);
    return directories.join('/');
  }
}

// 헤더 이벤트를 만들어야 하기 때문에 전역변수로 지정
let headers = document.querySelectorAll("h1,h2");

// 문서에서 헤더를 가져와서 리스트를 만듭니다.
function addContentsList(object) {
  var i = 0; j = 0;
  headers.forEach(function (header, index) {
    let listItem = document.createElement("li");
    let anchor = document.createElement("a");
    if (header.tagName == "H1") {
      i++; j = 0;
      anchor.textContent = i + ". " + header.textContent;
    } else {
      j++;
      anchor.innerHTML = "<span style='font-size:0.8em'> &nbsp; " + i + "-" + j + ". " + header.textContent + "</span>";
    }
    header.setAttribute("id", header.textContent);
    anchor.href = "#" + header.textContent;

    // 목차를 클릭했을 때, 스크롤이 올라가든 올라가지 않든 헤더를 숨깁니다.
    anchor.addEventListener("click", function (ev) {
      ev.stopPropagation();
      var header = document.querySelector("header");
      if (!header.classList.contains("hide")) {
        header.classList.add("hide");
        header.style.top = "-" + header.offsetHeight + "px";
        document.documentElement.style.setProperty('--header-height', '10px');
      }
    });


    listItem.appendChild(anchor);
    object.appendChild(listItem);
  });
}

// 보드를 보이기/숨기기 토글합니다.
function trigBoard() {
  var board = document.getElementById("board");
  if (board.style.visibility === "visible") {
    board.style.visibility = "hidden";
  } else {
    board.style.visibility = "visible";
  }
}

// 튜토리얼 목록을 보이거나 숨깁니다.
function trigTutorial() {
  var tutorials = document.querySelectorAll(".tutorial");
  var iconText = document.querySelector("#tutorial-icon span");

  // 모든 튜토리얼 요소를 순회하면서 토글합니다.
  tutorials.forEach(function (tutorial) {
    var currentDisplay = getComputedStyle(tutorial).display;

    if (currentDisplay === "none") {
      tutorial.style.display = "";
      iconText.innerText = "SHOW";
    } else {
      tutorial.style.display = "none";
      iconText.innerText = "HIDE";
    }
  });
}

// 스크롤 이벤트 리스너 추가
var target;
var lastScrollTop = 0;
var accumulatedScroll = 0;

document.addEventListener("scroll", function () {
  // 기능 1: 목차에 현재 보고있는 내용에 화살표를 표시합니다.
  let scrollPosition = window.scrollY;

  headers.forEach(function (header) {
    let headerPosition = header.getBoundingClientRect().top + scrollPosition;

    // 타겟을 설정
    if (scrollPosition >= (headerPosition - 20)) {
      target = header;
    }

    // 목차 항목 뒤에 빨간색 화살표를 제거
    let anchor = document.querySelector("a[href='#" + header.textContent + "']");
    if (anchor) {
      let arrow = anchor.querySelector(".arrow");
      if (arrow) {
        anchor.removeChild(arrow);
      }
    }
  });

  // 메뉴바가 출력되지 않는 상태에서 수행할 필요가 없다
  if (target && target.textContent) {
    let anchor = document.querySelector("a[href='#" + target.textContent + "']");
    if (anchor) {
      let arrow = anchor.querySelector(".arrow");

      if (!arrow) {
        arrow = document.createElement("span");
        arrow.className = "arrow";
        arrow.innerHTML = "&nbsp; &DoubleLongLeftArrow;";
        arrow.style.color = "red";
        anchor.appendChild(arrow);
      }
    }
  }

  // 기능2: 스크롤을 올리면 타이틀이 나타납니다.
  var lastScrollTop = 0;
  var accumulatedScroll = 0;

  window.addEventListener("scroll", function () {
    var scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

    if (scrollPosition > lastScrollTop) {
      // 내려가고 있습니까?
      // 목차를 클릭해서 타이틀 숨기기 기능에 들어갔다면 해제해야 합니다.
      var header = document.querySelector("header");
      if (header.classList.contains("hide")) {
        header.classList.remove("hide");
      }
      accumulatedScroll++;
      if (accumulatedScroll > 10) {
        // 올라간 상태 : 헤더 숨겨짐
        header.style.top = "-" + header.offsetHeight + "px";
        document.documentElement.style.setProperty('--header-height', '10px');

      }
    } else {
      // 올라가고 있습니까?
      accumulatedScroll = 0;
      // 내려간 상태 : 헤더 나타남
      var headerClass = document.querySelector("header").getAttribute("class");
      if (headerClass !== "hide") {
        document.querySelector("header").style.top = 0;
        document.documentElement.style.setProperty('--header-height', '70px');

      }
    }
    lastScrollTop = scrollPosition;
  });

});

// 해드 만들기
// body > header
const header = document.createElement("header");
body.appendChild(header);

// header > homeIcon, headline, board(menu)
function createHeader() {
  // header > homeIcon
  const homeIcon = document.createElement('div');
  homeIcon.innerHTML = '<a href="/index.html"><img src="/source/icon_home.svg"></a>';
  header.appendChild(homeIcon);

  // header > headline > doc-category, doc-title
  const headline = document.createElement('div');
  headline.setAttribute('id', 'headline');

  const docCategory = document.createElement('div');
  docCategory.setAttribute('id', 'doc-category');
  docCategory.innerHTML = category;
  headline.appendChild(docCategory);

  const docTitle = document.createElement('div');
  docTitle.setAttribute('id', 'doc-title');

  const titleElement = document.getElementById("title");
  docTitle.innerHTML = titleElement.textContent;
  headline.appendChild(docTitle);
  header.appendChild(headline);

  // header > icons > boardIcon, tutorialIcon
  const icons = document.createElement('div');
  icons.setAttribute('id', 'headerIcons');

  // 문서에 tutorial클레스를 가진 element가 1개라도 있으면 아래 루틴을 시작합니다.
  const tutorialElements = document.querySelectorAll('.tutorial');

  if (tutorialElements.length > 0) {
    const tutorialIcon = document.createElement('div');
    tutorialIcon.setAttribute('id', 'tutorial-icon');
    tutorialIcon.innerHTML = "totorial<br><span>SHOW</span>";
    tutorialIcon.addEventListener('click', () => {
      trigTutorial();
    });
    icons.appendChild(tutorialIcon);
  }

  const HeaderUpIcon = document.createElement('div');
  HeaderUpIcon.setAttribute('id', 'header-up-icon');
  HeaderUpIcon.innerHTML = "▲<br><span>UP</span>";
  HeaderUpIcon.addEventListener('click', () => {
    const header = document.querySelector("header");
    header.style.top = "-" + header.offsetHeight + "px";
  }, true);
  icons.appendChild(HeaderUpIcon);

  const boardIcon = document.createElement('div');
  boardIcon.innerHTML = '<img src="/source/icon_list.svg">';
  boardIcon.addEventListener('click', trigBoard, true);
  icons.appendChild(boardIcon);
  header.appendChild(icons);
}

// 최근 수정일자 넣기
var lastModified = document.createElement("p");
lastModified.setAttribute("id", "last-modified");
lastModified.innerHTML = "최근 수정: " + document.lastModified + "<br><a href=\"/info.html#저작권\" target=\"_black\">@iseohyun.com CC-BY-SA</a>";
document.body.appendChild(lastModified);

// 클릭시 클립보드에 복사하는 이벤트
var elementsToCopy = document.querySelectorAll("q");

elementsToCopy.forEach(function (element) {
  element.addEventListener("click", function () {
    var textToCopy = this.textContent || this.innerText;
    navigator.clipboard.writeText(textToCopy).then(function () {
      alert("\"" + textToCopy + "\"가 클립보드에 복사되었습니다.");
    }, function (err) {
      console.error('클립보드 복사 실패: ', err);
    });
  });
});

var preTags = document.querySelectorAll("pre, blockquote");

preTags.forEach(function (element) {
  if (element.tagName.toLowerCase() === 'pre' && element.querySelector('blockquote')) {
    return;
  }
  if (element.tagName.toLowerCase() === 'blockquote' && element.querySelector('pre')) {
    return;
  }

  let copyBtn = document.createElement("div");
  copyBtn.setAttribute("class", "copy-button");
  copyBtn.innerHTML = "COPY";

  var textToCopy = element.textContent || element.innerText;

  copyBtn.addEventListener("click", function () {
    navigator.clipboard.writeText(textToCopy).then(function () {
      alert("코드가 클립보드에 복사되었습니다.");
    }, function (err) {
      console.error('클립보드 복사 실패: ', err);
    });
  });
  element.appendChild(copyBtn);
});

// board의 스크롤 이벤트가 본문에 영향이 가지 않도록 확장되지 않도록 합니다.
board.addEventListener('scroll', (e) => {
  e.stopPropagation();
})

// reference를 문서 마지막에 추가합니다.
document.addEventListener('DOMContentLoaded', addReference);

var article = document.querySelector("article");
function addReference() {
  var details = document.querySelectorAll("a.detail");
  var detailsInfos = document.querySelectorAll("a.detail+span");
  if (details.length < 1) {
    return;
  }

  var refheader = document.createElement("h1");
  refheader.innerText = "References"
  refheader.id = "references"
  article.appendChild(refheader);

  for (i = 0; i < details.length; i++) {
    details[i].id = `detail-${i}`;
    details[i].innerHTML = `[${i + 1}]`;

    var description = detailsInfos[i].querySelector('.description');
    if (description) {
      // 본인의 위치 변경
      description.style.left = (- details[i].offsetLeft + article.offsetLeft + 50) + "px";
      description.style.width = ((article.offsetWidth > 860) ? 760 : article.offsetWidth * 0.9) + "px";
    }

    // 문서 하단에 내용을 추가 기재
    var refSpan = document.createElement('p');
    refSpan.style.textAlign = 'left';
    refSpan.style.textIndent = '-2em';
    refSpan.style.paddingLeft = '2em';
    var reference = detailsInfos[i].querySelector('.reference');

    refSpan.innerHTML = `[ <a href="#detail-${i}">${i + 1}</a> ] ${reference.innerHTML}`;
    article.appendChild(refSpan);
  }

  addReferenceImage();
}

function addReferenceImage() {
  var imgBoxs = document.querySelectorAll(".img-box");
  if (imgBoxs.length < 1) {
    return;
  }

  var refheader = document.createElement("h2");
  refheader.innerText = "그림 출처"
  refheader.id = "references-image"
  article.appendChild(refheader);

  for (i = 0; i < imgBoxs.length; i++) {
    var caption = imgBoxs[i].querySelector('.caption');
    imgBoxs[i].id = `ImageBox-${i}`;
    if (caption) {
      var imgInfoLine = document.createElement('p');
      imgInfoLine.style.textAlign = 'left';
      imgInfoLine.style.textIndent = '-2em';
      imgInfoLine.style.paddingLeft = '2em';
      var description = imgBoxs[i].querySelector('.description');
      // var link = imgBoxs[i].querySelector('img').attributes['src'];
      imgInfoLine.innerHTML = `[<a href="#ImageBox-${i}"> ${i + 1} </a>] ${caption.innerHTML}: ${description.innerHTML}<br>`;
      article.appendChild(imgInfoLine);
    }
  }
}