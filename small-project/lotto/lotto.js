var auto = false;
var myNum = new Array(6).fill(0);
var winNum = new Array(7);
var count = 0;
var nWin = [0, 0, 0, 0, 0, 0];
var price = [2000000000, 80000000, 1500000, 50000, 5000];
var winCase = [8145060, 1357510, 35724, 733, 45]; // 등수별 승리 확률(경우의 수: 1/n)
var total_price = 0;
var times_a_week = 1;
var spd = 1;  // 자동으로 다시 뽑기 속도
var fUpdateMyNumbers = false;
var fUpdateSvg = false;
var lock = false;
var cur_year = new Date().getFullYear();
var from_year = cur_year;
var nHistoryEvent = 0;
var repaintTimerActive = false;
var pickType = 'myNum';
var winType = 'random';
var realRound = 1;
var realLottoData = {};
var syncPromise = null;
var isSyncing = false;
var simTimerId = null;
var accumDraws = 0;
var myNumStats = Array(46).fill(0);
var winNumStats = Array(46).fill(0);
var currentSlotId = 1;
var startRound = 1;
var frequencyModes = { my: 'dramatic', win: 'dramatic' };

var historicalEvent = [
  [1945, "광복절을 맞이하다."],
  [1443, "세종대왕이 한글을 창제했다."],
  [612, "을지문덕이 살수대첩에서 승리했다."],
  [-2333, "단군이 조선을 건국했다."],
  [-10000, ":오스트랄로 피테쿠스(100만년~)"],
];

function resetHistory() {
  count = 0;
  nWin = [0, 0, 0, 0, 0];
  total_price = 0;
  lock = false;
  myNumStats.fill(0);
  winNumStats.fill(0);
  myNum.fill(0);
  
  // 체크박스들 모두 해제
  for (var i = 1; i <= 45; i++) {
    var cb = document.getElementById('cb' + i);
    if (cb) cb.checked = false;
  }

  // 당첨 번호판도 리셋
  for (var i = 1; i <= 7; i++) {
    var winDiv = document.getElementById('win' + i);
    if (winDiv) {
      winDiv.innerHTML = i;
      winDiv.style.backgroundColor = '#eee';
      winDiv.style.color = '#000';
    }
  }

  startRound = realRound;
  updateInputs();
  updateSlotsUI();
}

function resetSettings() {
  stopSim();
  times_a_week = 1;
  pickType = 'myNum';
  winType = 'random';
  realRound = 1;
  price = [2000000000, 80000000, 1500000, 50000, 5000];
  
  var _times_a_week = document.getElementById('times-a-week');
  var _autospeedWeeks = document.getElementById('autospeedWeeks');
  var _autoSpeedSeconds = document.getElementById('autoSpeedSeconds');
  var _currentWeekInput = document.getElementById('current-week');
  var _currentWeekNumber = document.getElementById('current-week-number');
  
  if (_times_a_week) _times_a_week.value = times_a_week;
  if (_autospeedWeeks) _autospeedWeeks.value = 1;
  if (_autoSpeedSeconds) _autoSpeedSeconds.value = 1;
  if (_currentWeekInput) _currentWeekInput.value = 1;
  if (_currentWeekNumber) _currentWeekNumber.value = 1;
  
  var slider = document.getElementById('sim-speed-slider');
  var sliderText = document.getElementById('sim-speed-text');
  if (slider) slider.value = 0;
  if (sliderText) sliderText.innerHTML = "1주 = 1초";
  
  var _startDateInput = document.getElementById('simulation-start-date');
  if (_startDateInput) {
    var today = new Date();
    var yyyy = today.getFullYear();
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var dd = String(today.getDate()).padStart(2, '0');
    _startDateInput.value = yyyy + '-' + mm + '-' + dd;
  }

  var pickMyNumRadio = document.querySelector('input[name="pick-type"][value="myNum"]');
  if (pickMyNumRadio) pickMyNumRadio.checked = true;
  var winRandomRadio = document.querySelector('input[name="win-type"][value="random"]');
  if (winRandomRadio) winRandomRadio.checked = true;
  
  var priceDiv = document.getElementById('winning-price');
  var toggleBtn = document.getElementById('btn-toggle-price');
  if (priceDiv) priceDiv.style.display = 'none';
  if (toggleBtn) toggleBtn.innerHTML = '상세';
  
  var _price_1st = document.getElementById('price_1st');
  var _price_2nd = document.getElementById('price_2nd');
  var _price_3rd = document.getElementById('price_3rd');
  if (_price_1st) _price_1st.value = numberToText(price[0]) + "원";
  if (_price_2nd) _price_2nd.value = numberToText(price[1]) + "원";
  if (_price_3rd) _price_3rd.value = numberToText(price[2]) + "원";
  
  updateInputs();
}

function initLotto() {
  resetSettings();
  resetHistory();

  // 실제 당첨번호 동기화 구동 (최초 1회 실행)
  syncRealLottoData();

  // 타이머 루프 구동
  if (!repaintTimerActive) {
    repaintTimerActive = true;
    repaintTimer();
  }
  updateStatsHeatmaps();
  updateSlotsUI();
  
  // 로컬 이벤트 수동 매핑 바인딩
  if (typeof bindLocalEvents === 'function') bindLocalEvents();
}

function chPrice(money, rank, target) {
  money = money.replace("원", "");
  var num = parseInt(money);

  if (money.match("천") != null)
    num *= 1000;
  if (money.match("만") != null)
    num *= 10000;
  if (money.match("억") != null)
    num *= 100000000;
  if (money.match("조") != null)
    num *= 1000000000000;
  price[rank - 1] = num;
  target.value = numberToText(num) + "원";
}

function changeTimesAweek(value) {
  times_a_week = value;
  from_year = Math.round(cur_year - count / times_a_week / 52);
  var _from_year = document.getElementById('from-year');
  var _count = document.getElementById('count');
  var _event = document.getElementById('event');
  if (_from_year) _from_year.value = from_year;
  if (_count) _count.value = ": " + numberToText(count) + " 회(" + timeToText() + ")";
  nHistoryEvent = 0;
  if (_event) _event.value = "";
}

function chMyNum(chbox, num) {
  if (chbox.checked == true) {
    for (var i = 0; i < 6; i++) {
      if (myNum[i] == 0) { // 번호 추가
        myNum[i] = num;
        myNum.sort(function (a, b) {
          if (a > b) return 1;
          if (a === b) return 0;
          if (a < b) return -1;
        });
        return;
      }
    }
    // 추가할 수 없음
    chbox.checked = false;
  } else {
    //번호 해제
    for (var i = 0; i < 6; i++) {
      if (myNum[i] == num) { // 번호 추가
        myNum[i] = 0;
        myNum.sort(function (a, b) {
          if (a > b) return 1;
          if (a === b) return 0;
          if (a < b) return -1;
        });
        return;
      }
    }
  }
}

function checkout() {
  var hit = 0;
  for (var i = 0; i < 6; i++) {
    for (var j = 0; j < 6; j++) {
      if (myNum[i] == winNum[j])
        hit++;
    }
  }
  if (hit == 6) {
    auto = false;
    lock = true;
    alert("1등 당첨!"); // 1등이 당첨되면 자동진행을 멈춥니다.
    return 1;
  }

  if (hit == 5) {
    // 2등 여부
    for (var i = 0; i < 6; i++) {
      if (myNum[i] == winNum[6]) {
        return 2;
      }
    }
    return 3;
  }

  if (hit == 4) return 4;

  if (hit == 3) return 5;

  return 6;
}

function genWinNum() {
  for (var i = 0; i < 6; i++) {
    winNum[i] = Math.floor(Math.random() * 45) + 1;
    for (var j = 0; j < i; j++) {
      if (winNum[j] == winNum[i]) {
        i--;
        break;
      }
    }
  }
  winNum = winNum.slice(0, 6).sort(function (a, b) {
    if (a > b) return 1;
    if (a === b) return 0;
    if (a < b) return -1;
  });

  winNum[6] = Math.floor(Math.random() * 45) + 1;
  for (var i = 0; i < 6; i++) {
    if (winNum[i] == winNum[6]) {
      winNum[6] = Math.floor(Math.random() * 45) + 1;
      i = 0;
    }
  }

  for (var i = 0; i < 7; i++) {
    var curdiv = document.getElementById('win' + (i + 1));
    if (curdiv) {
      curdiv.innerHTML = winNum[i];
      curdiv.style.color = "white";
      switch (true) {
        case winNum[i] < 10:
          curdiv.style.backgroundColor = "#FDB635"; break;
        case winNum[i] < 20:
          curdiv.style.backgroundColor = "#1763D4"; break;
        case winNum[i] < 30:
          curdiv.style.backgroundColor = "#C53B1E"; break;
        case winNum[i] < 40:
          curdiv.style.backgroundColor = "#60666F"; break;
        default:
          curdiv.style.backgroundColor = "#22AE18"; break;
      }
    }
  }
  printOut(checkout());
}

function play() {
  playVisual(true);
}

function nplay(n, showMyNumVisual) {
  if (n > 1) {
    nplaySilent(n - 1);
  }
  if (!auto) return;
  playVisual(showMyNumVisual);
}

function startSim() {
  if (auto) return;
  auto = true;
  lock = false;
  setSettingsDisabled(true);

  var controlBtn = document.getElementById('btn-sim-control');
  if (controlBtn) {
    controlBtn.innerHTML = '■';
    controlBtn.style.backgroundColor = '#ff3b30';
  }

  var weeksInput = document.getElementById('autospeedWeeks');
  var secondsInput = document.getElementById('autoSpeedSeconds');
  var nWeeks = parseFloat(weeksInput ? weeksInput.value : 1) || 1;
  var mSeconds = parseFloat(secondsInput ? secondsInput.value : 1) || 1;
  if (nWeeks <= 0) nWeeks = 1;
  if (mSeconds <= 0) mSeconds = 1;

  var drawsPerSecond = (nWeeks * times_a_week) / mSeconds;
  var tickInterval = 50; 
  var drawsPerTick = drawsPerSecond * (tickInterval / 1000);
  
  accumDraws = 0;
  var lastMyNumRenderTime = 0;

  function tick() {
    if (!auto) {
      clearInterval(simTimerId);
      simTimerId = null;
      return;
    }
    accumDraws += drawsPerTick;
    var drawsToRun = Math.floor(accumDraws);
    if (drawsToRun > 0) {
      var now = Date.now();
      var showMyNumVisual = false;
      
      if (now - lastMyNumRenderTime >= 400) {
        showMyNumVisual = true;
        lastMyNumRenderTime = now;
      }
      
      nplay(drawsToRun, showMyNumVisual);
      accumDraws -= drawsToRun;
    }
  }

  if (simTimerId) clearInterval(simTimerId);
  simTimerId = setInterval(tick, tickInterval);
}

function stopSim() {
  auto = false;
  setSettingsDisabled(false);
  if (simTimerId) {
    clearInterval(simTimerId);
    simTimerId = null;
  }
  var controlBtn = document.getElementById('btn-sim-control');
  if (controlBtn) {
    controlBtn.innerHTML = '▶';
    controlBtn.style.backgroundColor = '#007aff';
  }
}

function setSettingsDisabled(disabled) {
  var container = document.getElementById('simulator-settings');
  if (!container) return;
  var inputs = container.querySelectorAll('input, select, button');
  for (var i = 0; i < inputs.length; i++) {
    inputs[i].disabled = disabled;
  }
  var resetBtn = document.getElementById('btn-reset-settings');
  if (resetBtn) {
    resetBtn.disabled = disabled;
    resetBtn.style.opacity = disabled ? 0.5 : 1.0;
  }
}

function nplaySilent(n) {
  for (var k = 0; k < n; k++) {
    if (pickType === 'myNum' && !lock) {
      for (var i = 0; i < 6; i++) {
        myNum[i] = Math.floor(Math.random() * 45) + 1;
        for (var j = 0; j < i; j++) {
          if (myNum[j] == myNum[i]) {
            i--;
            break;
          }
        }
      }
      myNum.sort(function (a, b) { return a - b; });
    }

    if (winType === 'myNum') {
      var loaded = loadRealRoundNumbers(realRound);
      if (!loaded) {
        loaded = loadRealRoundNumbers(1);
      }
      
      if (!loaded) {
        for (var i = 0; i < 6; i++) {
          winNum[i] = Math.floor(Math.random() * 45) + 1;
          for (var j = 0; j < i; j++) {
            if (winNum[j] == winNum[i]) {
              i--;
              break;
            }
          }
        }
        winNum = winNum.slice(0, 6).sort(function (a, b) { return a - b; });

        winNum[6] = Math.floor(Math.random() * 45) + 1;
        for (var i = 0; i < 6; i++) {
          if (winNum[i] == winNum[6]) {
            winNum[6] = Math.floor(Math.random() * 45) + 1;
            i = 0;
          }
        }
      }
    } else {
      for (var i = 0; i < 6; i++) {
        winNum[i] = Math.floor(Math.random() * 45) + 1;
        for (var j = 0; j < i; j++) {
          if (winNum[j] == winNum[i]) {
            i--;
            break;
          }
        }
      }
      winNum = winNum.slice(0, 6).sort(function (a, b) { return a - b; });

      winNum[6] = Math.floor(Math.random() * 45) + 1;
      for (var i = 0; i < 6; i++) {
        if (winNum[i] == winNum[6]) {
          winNum[6] = Math.floor(Math.random() * 45) + 1;
          i = 0;
        }
      }
    }

    // 숫자 빈도 집계
    for (var i = 0; i < 6; i++) {
      myNumStats[myNum[i]]++;
    }
    for (var i = 0; i < 7; i++) {
      winNumStats[winNum[i]]++;
    }

    var hit = 0;
    for (var i = 0; i < 6; i++) {
      for (var j = 0; j < 6; j++) {
        if (myNum[i] == winNum[j]) hit++;
      }
    }

    var rank = 6;
    if (hit == 6) {
      auto = false;
      lock = true;
      alert("1등 당첨!");
      rank = 1;
    } else if (hit == 5) {
      var is2nd = false;
      for (var i = 0; i < 6; i++) {
        if (myNum[i] == winNum[6]) { is2nd = true; break; }
      }
      rank = is2nd ? 2 : 3;
    } else if (hit == 4) {
      rank = 4;
    } else if (hit == 3) {
      rank = 5;
    }

    count++;
    updateRealRound();
    var prizeWon = 0;
    if (rank >= 1 && rank <= 5) {
      nWin[rank - 1]++;
      prizeWon = price[rank - 1];
      total_price += prizeWon;
    }
    total_price -= 1000;

    // 강제정지 조건 검사
    if (rank >= 1 && rank <= 5) {
      var checkId = 'stop-' + ['1st', '2nd', '3rd', '4th', '5th'][rank - 1];
      var checkEl = document.getElementById(checkId);
      if (checkEl && checkEl.checked) {
        var winDate = "";
        if (winType === 'myNum') {
          var currentDisplayRound = realRound - 1;
          if (currentDisplayRound <= 0) {
            if (typeof RealLotto !== 'undefined') currentDisplayRound = RealLotto.calculateLatestRound();
            else currentDisplayRound = 1;
          }
          var roundData = realLottoData[currentDisplayRound];
          winDate = roundData ? roundData.date : "";
        } else {
          winDate = getCalculatedDrawDate();
        }
        
        stopSim();
        showStopPopup(rank, winDate);
        break; // 루프 탈출
      }
    }
  }
}

function playVisual(showMyNumVisual) {
  if (showMyNumVisual === undefined) showMyNumVisual = true;

  if (pickType === 'myNum' && !lock) {
    for (var i = 0; i < 6; i++) {
      myNum[i] = Math.floor(Math.random() * 45) + 1;
      for (var j = 0; j < i; j++) {
        if (myNum[j] == myNum[i]) {
          i--;
          break;
        }
      }
    }
    myNum.sort(function (a, b) { return a - b; });
  }
  
  if (showMyNumVisual) {
    printMyNum();
  }

  if (winType === 'myNum') {
    var loaded = loadRealRoundNumbers(realRound);
    if (!loaded) {
      loaded = loadRealRoundNumbers(1);
    }
    
    if (!loaded) {
      for (var i = 0; i < 6; i++) {
        winNum[i] = Math.floor(Math.random() * 45) + 1;
        for (var j = 0; j < i; j++) {
          if (winNum[j] == winNum[i]) {
            i--;
            break;
          }
        }
      }
      winNum = winNum.slice(0, 6).sort(function (a, b) { return a - b; });

      winNum[6] = Math.floor(Math.random() * 45) + 1;
      for (var i = 0; i < 6; i++) {
        if (winNum[i] == winNum[6]) {
          winNum[6] = Math.floor(Math.random() * 45) + 1;
          i = 0;
        }
      }
    } else {
      var currentWeekInput = document.getElementById('current-week');
      var currentWeekNumber = document.getElementById('current-week-number');
      if (currentWeekInput) currentWeekInput.value = realRound;
      if (currentWeekNumber) currentWeekNumber.value = realRound;
    }
  } else {
    for (var i = 0; i < 6; i++) {
      winNum[i] = Math.floor(Math.random() * 45) + 1;
      for (var j = 0; j < i; j++) {
        if (winNum[j] == winNum[i]) {
          i--;
          break;
        }
      }
    }
    winNum = winNum.slice(0, 6).sort(function (a, b) { return a - b; });

    winNum[6] = Math.floor(Math.random() * 45) + 1;
    for (var i = 0; i < 6; i++) {
      if (winNum[i] == winNum[6]) {
        winNum[6] = Math.floor(Math.random() * 45) + 1;
        i = 0;
      }
    }
  }

  for (var i = 0; i < 7; i++) {
    var curdiv = document.getElementById('win' + (i + 1));
    if (curdiv) {
      curdiv.innerHTML = winNum[i];
      curdiv.style.color = "white";
      switch (true) {
        case winNum[i] < 10:
          curdiv.style.backgroundColor = "#FDB635"; break;
        case winNum[i] < 20:
          curdiv.style.backgroundColor = "#1763D4"; break;
        case winNum[i] < 30:
          curdiv.style.backgroundColor = "#C53B1E"; break;
        case winNum[i] < 40:
          curdiv.style.backgroundColor = "#60666F"; break;
        default:
          curdiv.style.backgroundColor = "#22AE18"; break;
      }
    }
  }

  // 숫자 빈도 집계
  for (var i = 0; i < 6; i++) {
    myNumStats[myNum[i]]++;
  }
  for (var i = 0; i < 7; i++) {
    winNumStats[winNum[i]]++;
  }

  var hit = 0;
  for (var i = 0; i < 6; i++) {
    for (var j = 0; j < 6; j++) {
      if (myNum[i] == winNum[j]) hit++;
    }
  }

  var rank = 6;
  if (hit == 6) {
    auto = false;
    lock = true;
    alert("1등 당첨!");
    rank = 1;
  } else if (hit == 5) {
    var is2nd = false;
    for (var i = 0; i < 6; i++) {
      if (myNum[i] == winNum[6]) { is2nd = true; break; }
    }
    rank = is2nd ? 2 : 3;
  } else if (hit == 4) {
    rank = 4;
  } else if (hit == 3) {
    rank = 5;
  }

  count++;
  updateRealRound();
  var prizeWon = 0;
  if (rank >= 1 && rank <= 5) {
    nWin[rank - 1]++;
    prizeWon = price[rank - 1];
    total_price += prizeWon;
  }
  total_price -= 1000;

  // 강제정지 조건 검사
  var isStopped = false;
  if (rank >= 1 && rank <= 5) {
    var checkId = 'stop-' + ['1st', '2nd', '3rd', '4th', '5th'][rank - 1];
    var checkEl = document.getElementById(checkId);
    if (checkEl && checkEl.checked) {
      var winDate = "";
      if (winType === 'myNum') {
        var currentDisplayRound = realRound - 1;
        if (currentDisplayRound <= 0) {
          if (typeof RealLotto !== 'undefined') currentDisplayRound = RealLotto.calculateLatestRound();
          else currentDisplayRound = 1;
        }
        var roundData = realLottoData[currentDisplayRound];
        winDate = roundData ? roundData.date : "";
      } else {
        winDate = getCalculatedDrawDate();
      }
      
      stopSim();
      showStopPopup(rank, winDate);
      isStopped = true;
    }
  }

  updateInputs();
}

function repaintTimer() {
  setTimeout(repaintTimer, 300);
  if (fUpdateMyNumbers) {
    printMyNum();
    fUpdateMyNumbers = false;
  }

}

function changSpd(newSpd) {
  spd = newSpd;
}

function printOut(rank) {
  count++;
  switch (rank) {
    case 1:
      nWin[0]++;
      total_price += price[0];
      break;
    case 2:
      nWin[1]++;
      total_price += price[1];
      break;
    case 3:
      nWin[2]++;
      total_price += price[2];
      break;
    case 4:
      nWin[3]++;
      total_price += price[3];
      break;
    case 5:
      nWin[4]++;
      total_price += price[4];
      break;
  }

  total_price -= 1000;
  fUpdateSvg = true;
}

function getCalculatedDrawDate() {
  var startDateInput = document.getElementById('simulation-start-date');
  if (!startDateInput) return "";
  var startVal = startDateInput.value;
  if (!startVal) return "";
  var baseDate = new Date(startVal);
  var elapsedWeeks = Math.floor(count / times_a_week);
  baseDate.setDate(baseDate.getDate() + (elapsedWeeks * 7));
  var yyyy = baseDate.getFullYear();
  var mm = String(baseDate.getMonth() + 1).padStart(2, '0');
  var dd = String(baseDate.getDate()).padStart(2, '0');
  return yyyy + '-' + mm + '-' + dd;
}

function updateInputs() {
  var _1st = document.getElementById('_1st');
  var _2nd = document.getElementById('_2nd');
  var _3rd = document.getElementById('_3rd');
  var _4th = document.getElementById('_4th');
  var _5th = document.getElementById('_5th');
  var _count = document.getElementById('count');
  var _total_price = document.getElementById('total-price');
  var _from_year = document.getElementById('from-year');
  var _event = document.getElementById('event');

  if (_1st) _1st.value = ": " + numberToText(nWin[0]) + " 번(" + numberToText(nWin[0] * price[0]) + "원)";
  if (_2nd) _2nd.value = ": " + numberToText(nWin[1]) + " 번(" + numberToText(nWin[1] * price[1]) + "원)";
  if (_3rd) _3rd.value = ": " + numberToText(nWin[2]) + " 번(" + numberToText(nWin[2] * price[2]) + "원)";
  if (_4th) _4th.value = ": " + numberToText(nWin[3]) + " 번(" + numberToText(nWin[3] * price[3]) + "원)";
  if (_5th) _5th.value = ": " + numberToText(nWin[4]) + " 번(" + numberToText(nWin[4] * price[4]) + "원)";
  if (_count) _count.value = ": " + numberToText(count) + " 회(" + timeToText() + ")";

  if (_total_price) _total_price.value = ": " + numberToText(total_price) + "원";
  if (winType === 'myNum') {
    var currentDisplayRound = realRound - 1;
    if (currentDisplayRound <= 0) {
      if (typeof RealLotto !== 'undefined') currentDisplayRound = RealLotto.calculateLatestRound();
      else currentDisplayRound = 1;
    }
    var roundData = realLottoData[currentDisplayRound];
    if (roundData && _event) {
      _event.value = "실제 로또 " + currentDisplayRound + "회차 당첨번호 (추첨일: " + roundData.date + ")";
    }
  } else {
    var calcDate = getCalculatedDrawDate();
    if (_event && calcDate) {
      _event.value = "무작위 시뮬레이션 당첨번호 (추첨일: " + calcDate + ")";
    }
    if (calcDate) {
      var calcYear = parseInt(calcDate.split('-')[0]);
      if (_from_year) _from_year.value = calcYear;
    }
  }
  updateStatsHeatmaps();
}



function Percent(num) {
  return Math.round(num * 10000000 / count) / 100000;
}

// 한국인에게 익숙한 단위로 변경
function numberToText(num) {
  var minus = false;
  var text;
  if (num < 0) {
    minus = true;
    num = -num;
  }

  if (num < 1000) {
    text = num;
  } else if (num < 10000) {
    text = (Math.round(num / 100) / 10 + "천");
  } else if (num < 100000000) {
    text = (Math.round(num / 1000) / 10 + "만");
  } else if (num < 1000000000000) {
    text = (Math.round(num / 10000000) / 10 + "억");
  } else if (num < 10000000000000000) {
    text = (Math.round(num / 100000000000) / 10 + "조");
  } else {
    text = (Math.round(num / 1000000000000000) / 10 + "경");
  }
  if (minus) {
    return "-" + text;
  } else {
    return text;
  }
}

function timeToText() {
  var week = count / times_a_week;
  if (week < 52)
    return Math.ceil(week) + "주";
  else {
    var time = Math.round(week * 10 / 52) / 10;
    return numberToText(time) + "년";
  }
}

function genRdnNum() {
  if (lock) return;
  if (pickType === 'random') return;
  for (var i = 0; i < 6; i++) {
    myNum[i] = Math.floor(Math.random() * 45) + 1;
    for (var j = 0; j < i; j++) {
      if (myNum[j] == myNum[i]) {
        i--;
        break;
      }
    }
  }
  myNum.sort(function (a, b) {
    if (a > b) return 1;
    if (a === b) return 0;
    if (a < b) return -1;
  });

  fUpdateMyNumbers = true;
}

function printMyNum() {
  if (lock) return;
  var j = 0;
  for (var i = 1; i <= 45; i++) {
    var cb = document.getElementById('cb' + i);
    if (!cb) continue;
    if (myNum[j] == i) {
      cb.checked = true;
      if (j < 5) j++;
    }
    else
      cb.checked = false;
  }
}

function togglePriceDetails() {
  var priceDiv = document.getElementById('winning-price');
  var toggleBtn = document.getElementById('btn-toggle-price');
  if (!priceDiv || !toggleBtn) return;

  if (priceDiv.style.display === 'none') {
    priceDiv.style.display = 'flex';
    toggleBtn.innerHTML = '닫기';
  } else {
    priceDiv.style.display = 'none';
    toggleBtn.innerHTML = '상세';
  }
}

function syncRealLottoData() {
  if (isSyncing) return syncPromise;
  
  if (typeof RealLotto !== 'undefined') {
    isSyncing = true;
    syncPromise = RealLotto.syncData(function(drwNo, currentIdx, totalCount, skippedCount, isDone, statusMsg) {
      var textEl = document.querySelector('#lotto-loading-overlay div:last-child');
      if (textEl) {
        if (isDone) {
          textEl.innerHTML = "동기화 완료! (과거 데이터 " + skippedCount + "회차 패스, 총 " + (skippedCount + totalCount) + "회차 확보)";
        } else {
          textEl.innerHTML = "로딩 중... (" + (statusMsg || "실시간 동기화") + ")<br>" + 
                             "<span style='font-size:0.8em;color:#eee;display:block;margin-top:8px;line-height:1.4;'>" + 
                             "과거 수집 정보: " + skippedCount + "회 확인 완료 (중복 패스)<br>" +
                             "현재 수집 회차: " + (drwNo ? drwNo + "회차 요청 중..." : "준비 중...") + "<br>" +
                             "진행 상태: (" + (currentIdx + 1) + " / " + totalCount + " 완료)" + 
                             "</span>";
        }
      }
    }).then(function(data) {
      realLottoData = data;
      isSyncing = false;
      var latestRound = RealLotto.calculateLatestRound();
      
      var currentWeekInput = document.getElementById('current-week');
      if (currentWeekInput) {
        currentWeekInput.max = latestRound;
      }
      
      console.log("로또 데이터 동기화 완료! 총 " + Object.keys(data).length + "개 회차 확보.");
      return data;
    }).catch(function(err) {
      console.error("로또 데이터 동기화 실패:", err);
      isSyncing = false;
      realLottoData = RealLotto.getLocalData() || {};
      return realLottoData;
    });
    return syncPromise;
  }
  return Promise.resolve({});
}

function showLoadingOverlay() {
  if (document.getElementById('lotto-loading-overlay')) return;
  
  var overlay = document.createElement('div');
  overlay.id = 'lotto-loading-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'rgba(0, 0, 0, 0.4)';
  overlay.style.backdropFilter = 'blur(4px)';
  overlay.style.webkitBackdropFilter = 'blur(4px)';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '9999';
  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity 0.3s ease';
  
  var spinner = document.createElement('div');
  spinner.className = 'spinner';
  spinner.style.width = '50px';
  spinner.style.height = '50px';
  spinner.style.border = '5px solid #f3f3f3';
  spinner.style.borderTop = '5px solid #1763D4';
  spinner.style.borderRadius = '50%';
  spinner.style.animation = 'spin 1s linear infinite';
  
  var text = document.createElement('div');
  text.innerHTML = '정보를 불러오는 중입니다...';
  text.style.color = 'white';
  text.style.marginTop = '20px';
  text.style.fontSize = '1.2em';
  text.style.fontWeight = 'bold';
  text.style.textShadow = '0 2px 4px rgba(0,0,0,0.5)';
  
  overlay.appendChild(spinner);
  overlay.appendChild(text);
  document.body.appendChild(overlay);
  
  overlay.offsetWidth; // force reflow
  overlay.style.opacity = '1';
}

function hideLoadingOverlay() {
  var overlay = document.getElementById('lotto-loading-overlay');
  if (!overlay) return;
  
  overlay.style.opacity = '0';
  setTimeout(function() {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }, 300);
}

function selectWinType(type) {
  winType = type;
  
  var radioBtn = document.querySelector('input[name="win-type"][value="' + type + '"]');
  if (radioBtn) radioBtn.checked = true;

  if (winType === 'myNum') {
    var latestRound = 1;
    if (typeof RealLotto !== 'undefined') {
      latestRound = RealLotto.calculateLatestRound();
    }
    var existingCount = Object.keys(realLottoData).length;
    
    if (existingCount < latestRound - 5 || isSyncing) {
      showLoadingOverlay();
      syncRealLottoData().then(function() {
        hideLoadingOverlay();
      }).catch(function() {
        hideLoadingOverlay();
      });
    }
  }
}

function updateRealRound() {
  var latestRound = 1227;
  if (typeof RealLotto !== 'undefined') {
    latestRound = RealLotto.calculateLatestRound();
  }
  var weeksPassed = Math.floor(count / times_a_week);
  var targetRound = startRound + weeksPassed;
  realRound = ((targetRound - 1) % latestRound) + 1;
}

function changeStartWeek(val) {
  realRound = parseInt(val) || 1;
  startRound = realRound;
  
  var currentWeekInput = document.getElementById('current-week');
  if (currentWeekInput) {
    currentWeekInput.value = realRound;
  }
  
  var currentWeekNumber = document.getElementById('current-week-number');
  if (currentWeekNumber) {
    currentWeekNumber.value = realRound;
  }
}

function loadRealRoundNumbers(round) {
  var data = realLottoData[round];
  if (data && data.numbers && data.bonus !== undefined) {
    for (var i = 0; i < 6; i++) {
      winNum[i] = data.numbers[i];
    }
    winNum[6] = data.bonus;
    
    if (data.first_win_amount !== undefined) {
      price[0] = data.first_win_amount;
      var _price_1st = document.getElementById('price_1st');
      if (_price_1st) {
        _price_1st.value = numberToText(price[0]) + "원";
      }
    }
    return true;
  }
  return false;
}

function toggleSim() {
  var controlBtn = document.getElementById('btn-sim-control');
  if (!controlBtn) return;
  
  if (auto) {
    stopSim();
  } else {
    startSim();
  }
}

function onSpeedSliderInput(val) {
  var v = parseInt(val);
  var weeks = 1;
  var seconds = 1;
  var text = "";
  if (v === 0) {
    weeks = 1;
    seconds = 1;
    text = "1주 = 1초";
  } else if (v > 0) {
    // 오른쪽(+) = 빠름: N주를 1초에 처리
    weeks = v + 1;
    seconds = 1;
    text = weeks + "주 = 1초";
  } else {
    // 왼쪽(-) = 느렸: 1주를 N초에 처리
    weeks = 1;
    seconds = Math.abs(v) + 1;
    text = "1주 = " + seconds + "초";
  }
  
  var elText = document.getElementById('sim-speed-text');
  if (elText) elText.innerHTML = text;
  
  var elWeeks = document.getElementById('autospeedWeeks');
  var elSeconds = document.getElementById('autoSpeedSeconds');
  if (elWeeks) elWeeks.value = weeks;
  if (elSeconds) elSeconds.value = seconds;

  if (auto) {
    if (simTimerId) {
      clearInterval(simTimerId);
    }
    
    var nWeeks = parseFloat(elWeeks ? elWeeks.value : 1) || 1;
    var mSeconds = parseFloat(elSeconds ? elSeconds.value : 1) || 1;
    var drawsPerSecond = (nWeeks * times_a_week) / mSeconds;
    var tickInterval = 50; 
    var drawsPerTick = drawsPerSecond * (tickInterval / 1000);
    
    accumDraws = 0;
    var lastMyNumRenderTime = 0;

    simTimerId = setInterval(function() {
      if (!auto) {
        clearInterval(simTimerId);
        simTimerId = null;
        return;
      }
      accumDraws += drawsPerTick;
      var drawsToRun = Math.floor(accumDraws);
      if (drawsToRun > 0) {
        var now = Date.now();
        var showMyNumVisual = false;
        if (now - lastMyNumRenderTime >= 400) {
          showMyNumVisual = true;
          lastMyNumRenderTime = now;
        }
        nplay(drawsToRun, showMyNumVisual);
        accumDraws -= drawsToRun;
      }
    }, tickInterval);
  }
}

function showStopPopup(rank, winDate) {
  var modal = document.getElementById('simulation-stop-modal');
  if (!modal) return;
  
  var elRank = document.getElementById('modal-rank');
  var elDate = document.getElementById('modal-draw-date');
  var elPrize = document.getElementById('modal-prize');
  var elTotalWon = document.getElementById('modal-total-won');
  var elTotalSpent = document.getElementById('modal-total-spent');
  var elNetProfit = document.getElementById('modal-net-profit');
  
  if (elRank) elRank.innerHTML = rank + "등";
  if (elDate) elDate.innerHTML = winDate || "-";
  
  var prizeWon = price[rank - 1];
  if (elPrize) elPrize.innerHTML = numberToText(prizeWon) + "원";
  
  var totalSpentVal = count * 1000;
  var totalWonVal = total_price + totalSpentVal;
  
  if (elTotalWon) elTotalWon.innerHTML = numberToText(totalWonVal) + "원";
  if (elTotalSpent) elTotalSpent.innerHTML = numberToText(totalSpentVal) + "원";
  
  if (elNetProfit) {
    var sign = total_price >= 0 ? "+" : "";
    elNetProfit.innerHTML = sign + numberToText(total_price) + "원";
    if (total_price >= 0) {
      elNetProfit.style.color = '#ff3b30';
    } else {
      elNetProfit.style.color = '#007aff';
    }
  }
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
  modal.classList.add('show');
}

function closeStopModal() {
  var modal = document.getElementById('simulation-stop-modal');
  if (modal) modal.classList.remove('show');
}

function setFrequencyMode(chartKey, mode) {
  if (!frequencyModes[chartKey]) return;
  frequencyModes[chartKey] = mode;

  var buttons = document.querySelectorAll('.chart-mode-btn[data-chart="' + chartKey + '"]');
  for (var i = 0; i < buttons.length; i++) {
    var btnMode = buttons[i].getAttribute('data-mode') || buttons[i].dataset.mode;
    if (btnMode === mode) {
      buttons[i].classList.add('active');
    } else {
      buttons[i].classList.remove('active');
    }
  }

  updateStatsHeatmaps();
}

function getFrequencyRangeText(statsArray) {
  var minValue = Infinity;
  var maxValue = -Infinity;
  var minNumber = 1;
  var maxNumber = 1;

  for (var i = 1; i <= 45; i++) {
    var value = statsArray[i] || 0;
    if (value <= minValue) {
      minValue = value;
      minNumber = i;
    }
    if (value >= maxValue) {
      maxValue = value;
      maxNumber = i;
    }
  }

  if (minValue === Infinity) minValue = 0;
  if (maxValue === -Infinity) maxValue = 0;

  return minNumber + "번(" + minValue + "회) ~ " + maxNumber + "번(" + maxValue + "회)";
}
function updateStatsHeatmaps() {
  try {
    var elSpent = document.getElementById('stat-total-spent');
    var elWon = document.getElementById('stat-total-won');
    var elProfit = document.getElementById('stat-total-profit');
    var spentVal = count * 1000;
    var wonVal = total_price + spentVal;
    if (elSpent) elSpent.innerHTML = numberToText(spentVal) + "원";
    if (elWon) elWon.innerHTML = numberToText(wonVal) + "원";
    
    if (elProfit) {
      var sign = total_price >= 0 ? "+" : "";
      elProfit.innerHTML = sign + numberToText(total_price) + "원";
      if (total_price >= 0) {
        elProfit.style.color = '#ff3b30';
      } else {
        elProfit.style.color = '#007aff';
      }
    }
  } catch (e) {
    console.error("[디버그 에러 - 기본요약]", e);
  }
  
  for (var r = 1; r <= 5; r++) {
    try {
      var suffix = r === 1 ? '1st' : r === 2 ? '2nd' : r === 3 ? '3rd' : r === 4 ? '4th' : '5th';
      var el = document.getElementById('stat-count-' + suffix);
      if (el) el.innerHTML = numberToText(nWin[r - 1]) + "회(" + numberToText(nWin[r - 1] * price[r - 1]) + "원)";
    } catch (e) {
      console.error("[디버그 에러 - 등수요약 r=" + r + "]", e);
    }
  }

  try { renderHeatmap('grid-my-stats', myNumStats); } catch (e) { console.error("[디버그 에러 - grid-my-stats]", e); }
  try { renderHeatmap('grid-win-stats', winNumStats); } catch (e) { console.error("[디버그 에러 - grid-win-stats]", e); }
  try { renderFrequencyChart('chart-my-bars', myNumStats, 'my'); } catch (e) { console.error("[디버그 에러 - chart-my-bars]", e); }
  try { renderFrequencyChart('chart-win-bars', winNumStats, 'win'); } catch (e) { console.error("[디버그 에러 - chart-win-bars]", e); }
  try { renderExpectationsChart(); } catch (e) { console.error("[디버그 에러 - expectations]", e); }
}

function renderHeatmap(gridId, statsArray) {
  var gridEl = document.getElementById(gridId);
  if (!gridEl) return;

  var chartKey = gridId.indexOf('win') !== -1 ? 'win' : 'my';
  var mode = frequencyModes[chartKey] || 'dramatic';
  
  var min = Infinity;
  var max = -Infinity;
  for (var i = 1; i <= 45; i++) {
    var val = statsArray[i] || 0;
    if (val < min) min = val;
    if (val > max) max = val;
  }
  if (min === Infinity) min = 0;
  if (max === -Infinity || max === 0) max = 1;
  
  var diff = max - min;
  if (diff === 0) diff = 1;
  
  for (var i = 1; i <= 45; i++) {
    var cell = document.getElementById(gridId + '-cell-' + i);
    if (!cell) {
      cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      cell.id = gridId + '-cell-' + i;
      cell.innerHTML = i;
      gridEl.appendChild(cell);
    }
    
    var val = statsArray[i] || 0;
    cell.title = String(val);
    
    var ratio = mode === 'dramatic' ? ((val - min) / diff) : (val / max);
    var hue = 240 - (ratio * 240);
    var saturation = 2 + (ratio * 98);
    var lightness = 70 - (ratio * 15);
    
    cell.style.backgroundColor = "hsl(" + hue + ", " + saturation + "%, " + lightness + "%)";
    if (ratio > 0.5) {
      cell.style.color = "white";
    } else {
      cell.style.color = "#333";
    }
  }
}

function renderFrequencyChart(svgId, statsArray, chartKey) {
  var svg = document.getElementById(svgId);
  if (!svg) return;
  svg.innerHTML = "";

  var mode = frequencyModes[chartKey] || 'dramatic';
  var rangeTextId = chartKey === 'my' ? 'chart-my-range' : 'chart-win-range';
  var rangeTextEl = document.getElementById(rangeTextId);
  var prefix = chartKey === 'my' ? '최소/최대 선택: ' : '최소/최대 당첨: ';
  if (rangeTextEl) {
    rangeTextEl.innerHTML = prefix + getFrequencyRangeText(statsArray);
  }

  var min = Infinity;
  var max = -Infinity;
  for (var i = 1; i <= 45; i++) {
    var val = statsArray[i] || 0;
    if (val < min) min = val;
    if (val > max) max = val;
  }
  if (min === Infinity) min = 0;
  if (max === -Infinity || max === 0) max = 1;
  var diff = max - min;
  if (diff === 0) diff = 1;

  var maxBarHeight = 185;
  var baseY = 190;

  for (var i = 1; i <= 45; i++) {
    var val = statsArray[i] || 0;
    var ratio = mode === 'dramatic' ? ((val - min) / diff) : (val / max);
    var hue = 240 - (ratio * 240);
    var saturation = 2 + (ratio * 98);
    var lightness = 70 - (ratio * 15);
    var fill = "hsl(" + hue + ", " + saturation + "%, " + lightness + "%)";

    var w = 8;
    var x = (i - 1) * 10 + 1;
    var h = ratio * maxBarHeight;
    var y = baseY - h;

    var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", w);
    rect.setAttribute("height", h);
    rect.setAttribute("fill", fill);
    rect.setAttribute("rx", 2);

    var title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = String(val);
    rect.appendChild(title);
    svg.appendChild(rect);
  }

  for (var i = 5; i <= 45; i += 5) {
    var x = (i - 1) * 10 + 5;
    var text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x);
    text.setAttribute("y", 210);
    text.setAttribute("font-size", "9px");
    text.setAttribute("font-weight", "bold");
    text.setAttribute("fill", "#666");
    text.setAttribute("text-anchor", "middle");
    text.textContent = i;
    svg.appendChild(text);

    var tick = document.createElementNS("http://www.w3.org/2000/svg", "line");
    tick.setAttribute("x1", x);
    tick.setAttribute("y1", 190);
    tick.setAttribute("x2", x);
    tick.setAttribute("y2", 195);
    tick.setAttribute("stroke", "#ccc");
    tick.setAttribute("stroke-width", "1");
    svg.appendChild(tick);
  }
}

// YYYYMMDD hh:mm:ss 형식 날짜 포맷터
function formatSlotDate(date) {
  var y = date.getFullYear();
  var mo = String(date.getMonth() + 1).padStart(2, '0');
  var d = String(date.getDate()).padStart(2, '0');
  var h = String(date.getHours()).padStart(2, '0');
  var mi = String(date.getMinutes()).padStart(2, '0');
  var s = String(date.getSeconds()).padStart(2, '0');
  return y + '' + mo + d + ' ' + h + ':' + mi + ':' + s;
}

// 현재 슬롯이 저장 후 변경됐는지 확인
function isCurrentSlotDirty() {
  var raw = localStorage.getItem('lotto_slot_' + currentSlotId);
  if (!raw) return count > 0; // 저장 없는데 진행 있으면 dirty
  try {
    var saved = JSON.parse(raw);
    return saved.count !== count || saved.total_price !== total_price;
  } catch(e) { return false; }
}

function saveSlot(slotId) {
  // 설정값도 함께 저장
  var sliderEl = document.getElementById('sim-speed-slider');
  var startDateEl = document.getElementById('simulation-start-date');
  var data = {
    count: count,
    nWin: nWin.slice(),
    total_price: total_price,
    myNumStats: myNumStats.slice(),
    winNumStats: winNumStats.slice(),
    settings: {
      times_a_week: times_a_week,
      pickType: pickType,
      winType: winType,
      realRound: realRound,
      startRound: startRound,
      price: price.slice(),
      sliderVal: sliderEl ? parseInt(sliderEl.value) : 0,
      startDate: startDateEl ? startDateEl.value : ''
    },
    savedAt: formatSlotDate(new Date())
  };
  localStorage.setItem('lotto_slot_' + slotId, JSON.stringify(data));
  currentSlotId = slotId;
  updateSlotsUI();
}

function loadSlot(slotId) {
  var raw = localStorage.getItem('lotto_slot_' + slotId);

  // --- 빈 슬롯 로드: 전체 리셋 후 해당 슬롯으로 전환 ---
  if (!raw) {
    if (currentSlotId !== slotId && isCurrentSlotDirty()) {
      var ok = confirm('[슬롯 ' + currentSlotId + '] 저장되지 않은 진행 내용이 있습니다.\n현재 슬롯을 저장하고 이동하시겠습니까?');
      if (ok) saveSlot(currentSlotId);
    }
    resetSettings();
    resetHistory();
    currentSlotId = slotId;
    updateSlotsUI();
    return;
  }

  // --- 저장된 슬롯으로 이동 ---
  if (currentSlotId !== slotId && isCurrentSlotDirty()) {
    var ok = confirm('[슬롯 ' + currentSlotId + '] 저장되지 않은 진행 내용이 있습니다.\n현재 슬롯을 저장하고 이동하시겠습니까?');
    if (ok) saveSlot(currentSlotId);
  }

  try {
    var data = JSON.parse(raw);

    count = data.count || 0;
    nWin = data.nWin || [0,0,0,0,0];
    total_price = data.total_price || 0;
    myNumStats = (data.myNumStats && data.myNumStats.length === 46) ? data.myNumStats.slice() : Array(46).fill(0);
    winNumStats = (data.winNumStats && data.winNumStats.length === 46) ? data.winNumStats.slice() : Array(46).fill(0);

    // 설정 복원
    if (data.settings) {
      var s = data.settings;
      if (s.times_a_week !== undefined) { times_a_week = s.times_a_week; var el = document.getElementById('times-a-week'); if (el) el.value = times_a_week; }
      if (s.pickType) { pickType = s.pickType; var r = document.querySelector('input[name="pick-type"][value="' + pickType + '"]'); if (r) r.checked = true; }
      if (s.winType) { winType = s.winType; var r = document.querySelector('input[name="win-type"][value="' + winType + '"]'); if (r) r.checked = true; }
      if (s.realRound !== undefined) { realRound = s.realRound; }
      if (s.price && s.price.length) { price = s.price.slice(); }
      if (s.sliderVal !== undefined) {
        var sl = document.getElementById('sim-speed-slider');
        if (sl) { sl.value = s.sliderVal; onSpeedSliderInput(s.sliderVal); }
      }
      if (s.startDate) { var sd = document.getElementById('simulation-start-date'); if (sd) sd.value = s.startDate; }
      if (s.startRound !== undefined) { startRound = s.startRound; }
    }

    startRound = realRound - Math.floor(count / times_a_week);
    currentSlotId = slotId;
    updateInputs();
    updateSlotsUI();
  } catch (e) {
    alert('슬롯 불러오기 중 에러: ' + e.message);
  }
}

// 슬롯 데이터 삭제(슬롯 초기화)
function clearSlot(slotId) {
  var confirmed = confirm('[슬롯 ' + slotId + '] 데이터를 삭제하시겠습니까?');
  if (!confirmed) return;
  localStorage.removeItem('lotto_slot_' + slotId);
  // 현재 활성 슬롯이었다면 초기화 후 해당 슬롯으로 전환
  if (currentSlotId === slotId) {
    resetSettings();
    resetHistory();
  }
  updateSlotsUI();
}

function updateSlotsUI() {
  for (var i = 1; i <= 5; i++) {
    var raw = localStorage.getItem('lotto_slot_' + i);
    var elText = document.getElementById('slot-text-' + i);
    var elRow = document.getElementById('slot-row-' + i);

    // 활성 슬롯 강조
    if (elRow) {
      if (i === currentSlotId) {
        elRow.classList.add('active');
      } else {
        elRow.classList.remove('active');
      }
    }

    if (elText) {
      if (raw) {
        try {
          var data = JSON.parse(raw);
          // 저장 이름: "YYYYMMDD hh:mm:ss" 형식만 표기
          elText.innerHTML = data.savedAt || '[슬롯 ' + i + ']';
        } catch(e) {
          elText.innerHTML = '[슬롯 ' + i + '] 데이터 손상됨';
        }
      } else {
        elText.innerHTML = '[슬롯 ' + i + '] 비어있음';
      }
    }
  }
}

function renderExpectationsChart() {
  var svg = document.getElementById('chart-win-ratios');
  if (!svg) return;
  svg.innerHTML = "";
  
  var probs = [1 / 8145060, 1 / 1357510, 1 / 35724, 1 / 733, 1 / 45];
  var ratios = [0, 0, 0, 0, 0];
  
  if (count > 0) {
    for (var i = 0; i < 5; i++) {
      var expected = count * probs[i];
      ratios[i] = expected > 0 ? (nWin[i] / expected) : 0;
    }
  }
  
  var maxRatio = 1.2;
  for (var i = 0; i < 5; i++) {
    if (ratios[i] > maxRatio) maxRatio = ratios[i];
  }
  if (maxRatio <= 0) maxRatio = 1.2;
  
  var chartHeight = 150;
  var chartTop = 20;
  var y100 = chartTop + chartHeight - (1.0 / maxRatio * chartHeight);
  
  var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", 10);
  line.setAttribute("y1", y100);
  line.setAttribute("x2", 240);
  line.setAttribute("y2", y100);
  line.setAttribute("stroke", "#ff3b30");
  line.setAttribute("stroke-width", "1");
  line.setAttribute("stroke-dasharray", "3,3");
  svg.appendChild(line);
  
  var lineText = document.createElementNS("http://www.w3.org/2000/svg", "text");
  lineText.setAttribute("x", 240);
  lineText.setAttribute("y", y100 - 3);
  lineText.setAttribute("font-size", "7px");
  lineText.setAttribute("fill", "#ff3b30");
  lineText.setAttribute("text-anchor", "end");
  lineText.textContent = "100%";
  svg.appendChild(lineText);

  for (var i = 0; i < 5; i++) {
    var ratio = ratios[i];
    var h = (ratio / maxRatio) * chartHeight;
    var y = chartTop + chartHeight - h;
    var x = i * 46 + 18;
    var w = 18;
    
    var fill = "#8e8e93";
    if (ratio >= 1.0) {
      fill = "#34c759";
    } else if (ratio > 0) {
      fill = "#ff9500";
    }
    
    var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", w);
    rect.setAttribute("height", h);
    rect.setAttribute("fill", fill);
    rect.setAttribute("rx", 3);
    
    var title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    var percentage = (ratio * 100).toFixed(2);
    title.textContent = (i + 1) + "등 - 당첨 비율: " + percentage + "% (당첨: " + nWin[i] + "회 / 기댓값: " + (count * probs[i]).toFixed(4) + "회)";
    rect.appendChild(title);
    svg.appendChild(rect);
    
    var label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", x + w/2);
    label.setAttribute("y", 205);
    label.setAttribute("font-size", "8.5px");
    label.setAttribute("font-weight", "bold");
    label.setAttribute("fill", "#555");
    label.setAttribute("text-anchor", "middle");
    label.textContent = (i + 1) + "등";
    svg.appendChild(label);
    
    if (ratio > 0) {
      var ratioText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      ratioText.setAttribute("x", x + w/2);
      ratioText.setAttribute("y", y - 3);
      ratioText.setAttribute("font-size", "7.5px");
      ratioText.setAttribute("font-weight", "bold");
      ratioText.setAttribute("fill", fill);
      ratioText.setAttribute("text-anchor", "middle");
      ratioText.textContent = Math.round(ratio * 100) + "%";
      svg.appendChild(ratioText);
    }
  }
}

function switchAnalysisTab(tabKey) {
  var tabMy = document.getElementById('tab-content-my');
  var tabWin = document.getElementById('tab-content-win');
  var btns = document.querySelectorAll('.analysis-tab-btn');
  
  if (tabKey === 'my') {
    if (tabMy) tabMy.style.display = 'block';
    if (tabWin) tabWin.style.display = 'none';
    if (btns[0]) btns[0].classList.add('active');
    if (btns[1]) btns[1].classList.remove('active');
  } else {
    if (tabMy) tabMy.style.display = 'none';
    if (tabWin) tabWin.style.display = 'block';
    if (btns[0]) btns[0].classList.remove('active');
    if (btns[1]) btns[1].classList.add('active');
  }
  
  // 탭 변환 시 차트들 강제 재렌더링
  updateStatsHeatmaps();
  
  // 이벤트 재바인딩 (DOM 갱신 대비)
  bindLocalEvents();
}

function bindLocalEvents() {
  var btnMy = document.getElementById('tab-btn-my');
  var btnWin = document.getElementById('tab-btn-win');
  if (btnMy) {
    btnMy.onclick = function() { switchAnalysisTab('my'); };
  }
  if (btnWin) {
    btnWin.onclick = function() { switchAnalysisTab('win'); };
  }
  
  // 차트 모드 스위치 버튼 동적 바인딩
  var modeBtns = document.querySelectorAll('.chart-mode-btn');
  modeBtns.forEach(function(btn) {
    var chartKey = btn.getAttribute('data-chart');
    var mode = btn.getAttribute('data-mode');
    btn.onclick = function() {
      setFrequencyMode(chartKey, mode);
    };
  });
}

function setPriceType(type) {
  if (type === 'default') {
    price = [2000000000, 60000000, 1500000, 50000, 5000];
  } else if (type === 'reallotto') {
    // 실제 당첨금 모드 연동
  }
  updateInputs();
}

// HTML onclick 이벤트가 전역에서 안전하게 호출할 수 있도록 window 객체에 명시적 등록
window.switchAnalysisTab = switchAnalysisTab;
window.setFrequencyMode = setFrequencyMode;
window.setPriceType = setPriceType;
if (typeof initLotto === 'function') window.initLotto = initLotto;
if (typeof saveSlot === 'function') window.saveSlot = saveSlot;
if (typeof loadSlot === 'function') window.loadSlot = loadSlot;
if (typeof clearSlot === 'function') window.clearSlot = clearSlot;
if (typeof chMyNum === 'function') window.chMyNum = chMyNum;
if (typeof closeStopModal === 'function') window.closeStopModal = closeStopModal;

// 최초 로드 시 실행 (자체 기동 구조)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    if (typeof initLotto === 'function') initLotto();
  });
} else {
  if (typeof initLotto === 'function') initLotto();
}
