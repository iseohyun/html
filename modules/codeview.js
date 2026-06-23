// modules/codeview.js

window.SiteModules = window.SiteModules || {};

window.SiteModules.CodeCleaner = (function() {
  
  async function readSrcCode(url, element, deleteType = "emptyline") {
    const target = document.getElementById(element);
    if (!target) return;

    try {
      // 기존 동기식 XMLHttpRequest를 비동기 Fetch API로 개선
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const text = await response.text();
      // HTML 출력을 위해 < 기호를 &lt;로 변경하고 정제 수행
      target.innerHTML = editText(text.replace(/</g, "&lt;"), deleteType);
    } catch (error) {
      console.error("Error reading source code:", error);
      target.innerHTML = `<span style="color:red;">Failed to load code from ${url}</span>`;
    }
  }

  function editText(text, deleteType) {
    if (deleteType.match("comment") != null) {
      text = text.replace(/\/\*(.|[\r\n])*\*\//g, "\n"); // 주석 제거
      text = text.replace(/\/\/(.)*/g, ""); // 주석 제거
    }

    if (deleteType.match("package") != null) {
      text = text.replace(/package(.)*/g, "");
    }

    if (deleteType.match("import") != null) {
      text = text.replace(/import(.)*/g, "");
    }

    // 연속된 줄바꿈을 하나의 줄바꿈으로 바꾼다. 반복한다.
    if (deleteType.match("emptyline") != null) {
      let new_text = "";
      while (true) {
        new_text = text.replace(/\n[ \r\t]*\n/g, "\n"); // 공백 라인제거
        if (new_text === text) {
          break;
        } else {
          text = new_text;
        }
      }
    }

    // trim
    // 앞 빈줄 삭제
    const match = text.match(/[a-zA-Z0-9\/]/);
    if (match) {
      text = text.substring(match.index);
    }

    // 뒷 줄 제거
    let i = text.length - 1;
    while (i > 0) {
      if ((text[i] === '\n') ||
        (text[i] === '\r') ||
        (text[i] === '\t') ||
        (text[i] === ' ')) {
        i--;
      } else {
        break;
      }
    }
    text = text.substring(0, i + 1);
    return text;
  }

  // 하위 호환성을 위해 window 전역 공간에 노출
  window.readSrcCode = readSrcCode;

  return {
    readSrcCode: readSrcCode,
    editText: editText
  };
})();