/**
 * RealLotto - 브라우저 로컬 스토리지를 활용한 로또 데이터 점진적 수집 라이브러리
 */
var RealLotto = {
  STORAGE_KEY: 'lotto_history_data',
  API_URL: 'https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=',

  /**
   * 1. 로컬 저장소에서 기존 데이터 로드
   */
  getLocalData() {
    var data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) {
      var seed = {
        "1": { "date": "2002-12-07", "numbers": [10, 23, 29, 33, 37, 40], "bonus": 16, "first_win_amount": 0, "first_winner_count": 0 },
        "2": { "date": "2002-12-14", "numbers": [9, 13, 21, 25, 32, 42], "bonus": 2, "first_win_amount": 2002006800, "first_winner_count": 1 },
        "3": { "date": "2002-12-21", "numbers": [11, 16, 19, 21, 27, 31], "bonus": 30, "first_win_amount": 2000000000, "first_winner_count": 1 },
        "4": { "date": "2002-12-28", "numbers": [14, 27, 30, 31, 40, 42], "bonus": 2, "first_win_amount": 0, "first_winner_count": 0 },
        "5": { "date": "2003-01-04", "numbers": [16, 24, 29, 40, 41, 44], "bonus": 3, "first_win_amount": 6574483200, "first_winner_count": 0 }
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(data);
  },

  /**
   * 2. 로컬 저장소에 데이터 저장
   */
  saveLocalData(data) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  },

  /**
   * 3. 현재 시점 기준 대략적인 최신 회차 계산 (또는 동적 탐색)
   * 로또는 2002년 12월 7일(1회차)부터 매주 토요일 20시 45분경 추첨합니다.
   */
  calculateLatestRound() {
    const firstDrawDate = new Date('2002-12-07T20:45:00+09:00');
    const now = new Date();
    const diffMs = now - firstDrawDate;
    const diffWeeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
    return diffWeeks + 1;
  },

  /**
   * 4. 단일 회차 API 호출
   */
  PROXY_LIST: [
    async function(targetUrl) {
      const response = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent(targetUrl));
      if (!response.ok) throw new Error("AllOrigins error");
      const json = await response.json();
      return json.contents;
    },
    async function(targetUrl) {
      const response = await fetch('https://api.codetabs.com/v1/proxy?url=' + encodeURIComponent(targetUrl));
      if (!response.ok) throw new Error("Codetabs error");
      return await response.text();
    },
    async function(targetUrl) {
      const response = await fetch('https://corsproxy.io/?' + encodeURIComponent(targetUrl));
      if (!response.ok) throw new Error("Corsproxy error");
      return await response.text();
    },
    async function(targetUrl) {
      const response = await fetch('https://thingproxy.freeboard.io/fetch/' + targetUrl);
      if (!response.ok) throw new Error("ThingProxy error");
      return await response.text();
    }
  ],

  async fetchWithProxyFallback(targetUrl) {
    var lastError = null;
    for (var i = 0; i < this.PROXY_LIST.length; i++) {
      try {
        const text = await this.PROXY_LIST[i](targetUrl);
        const parsed = JSON.parse(text);
        if (parsed.returnValue === 'success') {
          return text;
        }
        throw new Error("Invalid lotto return value");
      } catch (e) {
        console.warn("프록시 " + (i + 1) + "번 실패. 다음 시도... 에러:", e.message || e);
        lastError = e;
      }
    }
    throw lastError || new Error("모든 프록시 호출 실패");
  },

  async fetchRound(drwNo) {
    const targetUrl = `${this.API_URL}${drwNo}`;
    try {
      const text = await this.fetchWithProxyFallback(targetUrl);
      const result = JSON.parse(text);
      if (result.returnValue === 'success') {
        return {
          date: result.drwNoDate,
          numbers: [
            result.drwtNo1,
            result.drwtNo2,
            result.drwtNo3,
            result.drwtNo4,
            result.drwtNo5,
            result.drwtNo6
          ],
          bonus: result.bnusNo,
          first_win_amount: result.firstWinamnt,
          first_winner_count: result.firstPrzwnerCo
        };
      }
      return null;
    } catch (e) {
      console.error(drwNo + "회차 모든 프록시 경유 실패.");
      throw e;
    }
  },

  /**
   * 5. GitHub 오픈 데이터베이스에서 올인원 데이터 다운로드 (초고속 시딩)
   */
  async seedFromGithubDatabase(onProgress = null) {
    try {
      if (onProgress) {
        onProgress(0, 0, 1, 0, false, "GitHub 올인원 데이터베이스 연결 중...");
      }
      
      const response = await fetch('https://smok95.github.io/lotto/results/all.json');
      if (!response.ok) throw new Error("GitHub DB fetch failed");
      
      const allData = await response.json();
      const lottoData = this.getLocalData();
      let newCount = 0;
      
      for (let i = 0; i < allData.length; i++) {
        const item = allData[i];
        const drwNo = item.draw_no;
        
        if (!lottoData[drwNo]) {
          lottoData[drwNo] = {
            date: item.date ? item.date.substring(0, 10) : "",
            numbers: item.numbers,
            bonus: item.bonus_no,
            first_win_amount: item.divisions && item.divisions[0] ? item.divisions[0].prize : 2000000000,
            first_winner_count: item.divisions && item.divisions[0] ? item.divisions[0].winners : 0
          };
          newCount++;
        }
      }
      
      if (newCount > 0) {
        this.saveLocalData(lottoData);
      }
      
      console.log("GitHub Seeding 완료: " + newCount + "개 신규 회차 주입됨.");
      return lottoData;
    } catch (e) {
      console.error("GitHub 데이터베이스 Seeding 실패:", e);
      throw e;
    }
  },

  /**
   * 6. 데이터 동기화 메인 함수 (외부 호출용)
   * @param {Function} onProgress - 수집 진행 상황 콜백 (현재 수집 회차, 진행 인덱스, 대상 회차 수, 스킵된 수, 완료여부, 상태텍스트)
   * @returns {Promise<Object>} 전체 로또 데이터 객체
   */
  async syncData(onProgress = null) {
    let lottoData = this.getLocalData();
    
    // Step 1: GitHub 올인원 DB에서 데이터 Seeding 시도 (CORS 및 프록시 차단 영원히 해소)
    try {
      lottoData = await this.seedFromGithubDatabase(onProgress);
    } catch (err) {
      console.warn("GitHub Seeding 실패 (기존 프록시 수집 시도):", err);
    }
    
    // Step 2: 수집해야 할 누락 회차 목록 필터링
    const latestRound = this.calculateLatestRound();
    const existingRounds = Object.keys(lottoData).map(Number);
    const targetRounds = [];
    for (let r = 1; r <= latestRound; r++) {
      if (!existingRounds.includes(r)) {
        targetRounds.push(r);
      }
    }

    const skippedCount = existingRounds.length;
    const totalTargetsCount = targetRounds.length;

    if (totalTargetsCount === 0) {
      if (onProgress) {
        onProgress(latestRound, 0, 0, skippedCount, true, "동기화 완료!");
      }
      return lottoData;
    }

    console.log(`수집 시작: 총 ${totalTargetsCount}개의 회차를 추가 수집합니다.`);

    for (let i = 0; i < targetRounds.length; i++) {
      const drwNo = targetRounds[i];
      
      try {
        if (onProgress) {
          onProgress(drwNo, i, totalTargetsCount, skippedCount, false, "최신 미동기 회차 보충 중...");
        }
        
        const roundData = await this.fetchRound(drwNo);
        if (roundData) {
          lottoData[drwNo] = roundData;
          this.saveLocalData(lottoData);
        }
        
        await new Promise(resolve => setTimeout(resolve, 150));
        
      } catch (error) {
        console.error(`${drwNo}회차 수집 중 에러 발생:`, error);
        break;
      }
    }

    if (onProgress) {
      onProgress(latestRound, totalTargetsCount, totalTargetsCount, skippedCount, true, "동기화 완료!");
    }
    return lottoData;
  }
};