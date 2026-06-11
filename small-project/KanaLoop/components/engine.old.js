/**
 * engine.js
 * 유니코드 기반 문제 생성 및 85% 규칙 난이도 엔진
 */

const ALPHABETS = {
  hira: ["あいうえお", "かきくけこ", "さしすせそ", "たちつてと", "なにぬねの", "はひふへほ", "まみむめも", "やゆよ", "らりるれろ", "わを", "ん", "がぎぐげご", "ざじずぜぞ", "だぢづでど", "ばびぶべぼ", "ぱぴぷぺぽ"],
  kata: ["アイウエオ", "カキクケコ", "サシスセソ", "タチツテト", "ナニヌネノ", "ハヒフヘホ", "マミムメモ", "ヤユヨ", "ラリルレロ", "ワヲ", "ン", "ガギグゲゴ", "ザジズゼゾ", "ダヂヅデド", "バビブベボ", "パピプペポ"],
  hangle: ["가갸거겨고교구규그기", "나냐너녀노뇨누뉴느니", "다댜더뎌도됴두듀드디",
    "라랴러려로료루류르리", "마먀머며모묘무뮤므미", "바뱌버벼보뵤부뷰브비", "사샤서셔소쇼수슈스시", "아야어여오요우유으이", "자쟈저져조죠주쥬즈지", "차챠처쳐초쵸추츄츠치", "카캬커켜코쿄쿠큐크키", "타탸터텨토톼투튜트티", "파퍄퍼펴포뵤푸퓨프피", "하햐허혀호효후휴흐히"],
  alphabet: ["abcd", "efgh", "ijkl", "mnop", "qrst", "uvwx", "yz"]
}

const ENGINE = {
  activePool: [], // 현재 학습 중인 유니코드 번호들
  MIN_POOL_SIZE: 3, // TODO: 보기의 갯수와 동일하게 조정
  MAX_POOL_SIZE: 10, // TODO: 최대 학습갯수가 작을수록 훈련효과 상승
  MAX_SPEED_CRITERIA: 5000, // 5000ms 이상은 극단적 지연으로 간주하여 패널티 적용
  HISTORY_LIMIT: 10, // 시스템에서 관리하는 최대 기록 추적 수
  userPref: {
    autoProgress: true, // 자동 진도 여부 (true/false)
    masteryScore: 0.8, // 진도 추가 임계값 (0.6, 0.8, 0.9)
    BASE_PROBABILITY: 1.0,
    MAX_PROBABILITY: 10.0, // 확률 천장
    DECAY_FACTOR: 0.96, // 지수 감쇠 계수 (최근 데이터 강조)
    RETENTION_SENSITIVITY: 0.01 // 망각 민감도 (시간당 가중치 증가분: 100시간당 1.0 증가)
  },

  currentTarget: null,
  recentResults: [], // 최근 20개의 정답 여부 (T/F)
  lastAddedChar: null, // 가장 최근에 추가된 문자 저장
  targetHistory: [],   // 최근 출제된 정답(Target) 기록 (중복 출제 방지용)
  TARGET_HISTORY_LIMIT: 2, // 최근 N개 내에 나왔던 문자는 정답으로 선정 제외
  expectedWeight: 0,   // 현재 문제의 예측 가중치 저장

  // 필터링할 작은 글자 유니코드 목록 (히라가나 + 가타카나)
  smallChars: [
    12353, 12355, 12357, 12359, 12361, 12387, 12419, 12421, 12423, 12436, 12437, 12438, // Hira small chars
    12449, 12451, 12453, 12455, 12457, 12483, 12515, 12517, 12519, 12533, 12534, 12541, 12542, 12543 // Kata small & special
  ],

  // 유니코드를 문자로 변환
  toChar: (code) => String.fromCharCode(code),

  // 초기 풀 구성 (DB 데이터를 우선 로드하고 없으면 기본값 세팅)
  initPool: async () => {
    const dbData = await getAllProgress();
    // 유효한 숫자이면서 '작은 글자'가 아닌 키값만 추출 (오염된 데이터 방지)
    const existingKeys = Object.keys(dbData)
      .map(k => parseInt(k))
      .filter(k => !isNaN(k) && !ENGINE.smallChars.includes(k));
    if (existingKeys.length > 0) {
      // DB에 데이터가 있다면 해당 글자들로 풀을 구성
      ENGINE.activePool = existingKeys.sort((a, b) => a - b);
    }

    // 2. 최소 풀 크기를 보장 (신규 유저 혹은 데이터 부족 시)
    let code = ENGINE.range.start;
    while (ENGINE.activePool.length < ENGINE.MIN_POOL_SIZE) {
      if (!ENGINE.smallChars.includes(code) && !ENGINE.activePool.includes(code)) {
        ENGINE.activePool.push(code);
      }
      code++;
      if (code > ENGINE.range.end) break;
    }
    console.log("학습 풀 구성 완료:", ENGINE.activePool.map(c => ENGINE.toChar(c)));
  },

  /**
   * 가중치 계산 (Speed + Exponential Decay)
   * 링 버퍼에서 최신 데이터일수록 높은 가중치를 부여하여 개인화된 숙련도를 측정합니다.
   * 임베디드의 지수 이동 평균(EMA) 필터와 유사한 원리를 사용하여 최근 실수를 강조합니다.
   */
  calculateWeight: (data) => {
    const n = data.total_attempts < ENGINE.HISTORY_LIMIT ? data.total_attempts : ENGINE.HISTORY_LIMIT;
    if (n === 0) return ENGINE.CONFIG.MAX_PROBABILITY; // 한 번도 안 푼 건 최우선 노출
    let weightedSpeedSum = 0;
    let weightTotal = 0;
    // 1. 망각 및 최근 성능 분석 (lastTime 및 avgSpeed 참고)
    const lastMillis = data.lastTime ? (data.lastTime.toMillis ? data.lastTime.toMillis() : data.lastTime) : 0;
    const safeLastMillis = typeof lastMillis === 'number' ? lastMillis : 0; // Ensure lastMillis is a number
    const hoursSinceLast = safeLastMillis ? (Date.now() - safeLastMillis) / (1000 * 60 * 60) : 0;
    const safeHoursSinceLast = isNaN(hoursSinceLast) ? 0 : hoursSinceLast; // Ensure hoursSinceLast is not NaN
    // 개별 글자의 단순 최근 평균 속도 계산 (최근 n개)
    let totalSpeed = 0;
    for (let j = 0; j < n; j++) totalSpeed += data.speeds[(data.head - j + 100) % 100] || 0;
    const rawAvgSpeed = totalSpeed / n;
    // 2. 동적 가중치 의존도(Decay Factor) 결정
    let localDecay = ENGINE.CONFIG.DECAY_FACTOR;

    // 오래된 글자의 풀이가 기준보다 느려질수록 과거 기록 의존도를 높임 (부족한 점을 더 오래 기억)
    if (hoursSinceLast > 12) {
      const stalenessBonus = Math.min(0.03, (hoursSinceLast / 168)); // 최대 일주일 기준 상향폭
      const struggleFactor = Math.min(1.0, (rawAvgSpeed / 2000));
      localDecay = Math.min(0.99, localDecay + (stalenessBonus * struggleFactor));
    }

    for (let i = 0; i < n; i++) {
      const recencyWeight = Math.pow(localDecay, i);
      const index = (data.head - i + 100) % 100;
      const result = (data.results && data.results[index] !== undefined) ? data.results[index] : 0;
      const speed = (data.speeds && data.speeds[index] !== undefined) ? data.speeds[index] : 0;
      // Ensure values are numbers, converting NaN to 0 defensively
      const safeResult = isNaN(result) ? 0 : result;
      const safeSpeed = isNaN(speed) ? 0 : speed;
      weightTotal += weightedSpeedSum;
    }

    // 정규화된 가중 평균 계산
    const avgSpeed = weightedSpeedSum / weightTotal;
    // 망각 보너스 합산 (오래될수록 가중치 증가, 최대 5.0)
    const forgetBoost = Math.min(5.0, safeHoursSinceLast * ENGINE.CONFIG.RETENTION_SENSITIVITY);
    let finalScore = ENGINE.CONFIG.BASE_PROBABILITY
      + avgSpeed
      + forgetBoost;
    // 상한선 제한 및 반환
    return Math.min(finalScore, ENGINE.CONFIG.MAX_PROBABILITY);
  },

  /**
   * 마스터리 점수 계산 (반응 속도 기준)
   */
  calculateMasteryScore: (avgSpeed, targetSpeed = 800) => {
    // ENGINE.MAX_SPEED_CRITERIA(5000ms) 이상은 0점
    // 모든 학습 문자의 최근 5개 정답 중앙값(targetSpeed)이 100점
    if (avgSpeed >= ENGINE.MAX_SPEED_CRITERIA) return 0;
    if (avgSpeed <= targetSpeed) return 100;
    const denominator = Math.max(1, ENGINE.MAX_SPEED_CRITERIA - targetSpeed);
    return Math.max(0, 100 * (ENGINE.MAX_SPEED_CRITERIA - avgSpeed) / denominator);
  },

  /**
   * 신규 문자 추가 처리
   */
  addNewCharacter: () => {
    // 진도표 순서 정의 (청음, 탁음 순서)

    let primary = hiraRows, secondary = kataRows;
    if (ENGINE.CONFIG.autoProgress === 'kata') {
      primary = kataRows; secondary = hiraRows;
    }

    const findNext = (table) => {
      for (const row of table) {
        for (const char of row) {
          const code = char.charCodeAt(0);
          // 유효한 가나 문자이고 현재 풀에 없는 첫 번째 문자 선택
          if (code >= 12353 && code <= 12543 && !ENGINE.smallChars.includes(code) && !ENGINE.activePool.includes(code)) {
            return code;
          }
        }
      }
      return null;
    };

    let nextCode = findNext(primary) || findNext(secondary);
    if (nextCode && ENGINE.activePool.length < ENGINE.MAX_POOL_SIZE) {
      ENGINE.activePool.push(nextCode);
      ENGINE.lastAddedChar = ENGINE.toChar(nextCode);
      return true;
    }
    return false;
  },

  /**
   * 신규 학습 문자 추가 여부를 판단하는 핵심 로직
   */

  checkAndInhaleNewCharacter: async () => {
    // 자동 진도 설정이 꺼져있으면 중단
    if (ENGINE.CONFIG.autoProgress === 'off') return;
    const allData = await getAllProgress();
    const activeChars = ENGINE.activePool;

    // 1. 모든 학습 데이터에서 글자별 최근 5개 평균 속도 수집 (글로벌 기준점 계산용)
    const allRecentAverages = [];
    Object.values(allData).forEach(data => {
      if (!data || data.total_attempts < 5) return;
      const recentSpeeds = [];
      const limit = Math.min(data.total_attempts, 100);
      for (let i = 0; i < limit; i++) {
        const idx = (data.head - i + 100) % 100;
        if (data.results[idx] === 1) recentSpeeds.push(data.speeds[idx]);
        if (recentSpeeds.length === 5) break;
      }
      if (recentSpeeds.length === 5) {
        allRecentAverages.push(recentSpeeds.reduce((a, b) => a + b, 0) / 5);
      }
    });

    // 2. 글로벌 중앙값(recent5MedianSec 역할을 하는 targetSpeed) 계산
    let targetSpeed = 800;
    if (allRecentAverages.length > 0) {
      const sorted = [...allRecentAverages].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      targetSpeed = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    // 3. 현재 학습 풀(activePool)의 글자들에 대해 합격 여부 판단
    const PASS_SCORE = 85;
    const masteryScore = ENGINE.CONFIG.masteryScore;
    let passedCount = 0;
    activeChars.forEach(code => {
      const data = allData[code.toString()];
      if (!data || data.total_attempts < 5) return;
      const recentSpeeds = [];
      const limit = Math.min(data.total_attempts, 100);
      for (let i = 0; i < limit; i++) {
        const idx = (data.head - i + 100) % 100;
        if (data.results[idx] === 1 && data.speeds[idx] < ENGINE.MAX_SPEED_CRITERIA)
          recentSpeeds.push(data.speeds[idx]);
        else
          recentSpeeds.push(ENGINE.MAX_SPEED_CRITERIA); // 오답이나 극단적 지연은 최대치로 간주
        if (recentSpeeds.length === 5) break;
      }

      if (recentSpeeds.length === 5) {
        const charAvg = recentSpeeds.reduce((a, b) => a + b, 0) / 5;
        const score = ENGINE.calculateMasteryScore(charAvg, targetSpeed);
        if (score >= PASS_SCORE) passedCount++;
        else
          // 합격하지 못한 글자와 점수를 콘솔로 출력
          console.log(`글자: ${ENGINE.toChar(code)} | 최근5평균: ${charAvg.toFixed(0)}ms | 점수: ${score.toFixed(1)} (불합격)`);
      }
    });

    const poolSize = activeChars.length;
    const currentMasteryRatio = passedCount / poolSize;
    console.log(`[진도 체크] 기준속도: ${targetSpeed.toFixed(0)}ms | 합격 수: ${passedCount}/${poolSize} (${(currentMasteryRatio * 100).toFixed(1)}%)`);
    if (currentMasteryRatio >= masteryScore) {
      ENGINE.addNewCharacter();
    }
  },

  /**
   * 문제 생성 (가중치 기반 정답 선택 + 오답 2)
   */

  generateQuestion: async () => {
    // 기존의 세션 기반 난이도 조절 대신 누적 데이터 기반 진도 체크 실행
    if (ENGINE.recentResults.length >= 10) {
      await ENGINE.checkAndInhaleNewCharacter();
      ENGINE.recentResults = [];
    }

    // 최근 출제된 문자를 제외한 후보군 생성 (중복 방지)
    // 단, 전체 풀이 너무 작을 경우를 대비해 예외 처리
    let candidates = ENGINE.activePool.filter(code => !ENGINE.targetHistory.includes(code));
    if (candidates.length === 0) {
      candidates = ENGINE.activePool;
    }

    // DB 데이터를 기반으로 각 문자의 가중치 계산
    const dbData = await getAllProgress();
    const weights = candidates.map(code => {
      const data = dbData[code.toString()] || { total_attempts: 0, head: 0, results: [], speeds: [] };
      return { code, score: ENGINE.calculateWeight(data) };
    });

    // 가중치 합계 계산 및 룰렛 휠 선택
    const totalWeight = weights.reduce((sum, item) => sum + item.score, 0);
    let random = Math.random() * totalWeight;
    let targetCode = weights[weights.length - 1].code;

    for (const item of weights) {
      if (random < item.score) {
        targetCode = item.code;
        break;
      }
      random -= item.score;
    }

    ENGINE.currentTarget = targetCode;
    // 최근 출제 기록 업데이트
    ENGINE.targetHistory.push(targetCode);
    if (ENGINE.targetHistory.length > ENGINE.TARGET_HISTORY_LIMIT) {
      ENGINE.targetHistory.shift();
    }

    // 예측 가중치 저장 (튜닝 시 사용)
    ENGINE.expectedWeight = weights.find(w => w.code === targetCode).score;

    // 오답 후보 선정: 정답과 그 짝꿍(히라가나/가타카나)을 제외한 activePool 내에서 무작위 2개 추출
    // 히라가나와 가타카나의 유니코드 차이는 96(0x60)입니다.
    const isHira = targetCode < 12448;
    const counterpartCode = isHira ? targetCode + 96 : targetCode - 96;
    let distractors = ENGINE.activePool
      .filter(c => c !== targetCode && c !== counterpartCode)
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);

    // 4. 정답 1개 + 오답 2개를 합친 뒤 셔플
    const options = [targetCode, ...distractors].sort(() => Math.random() - 0.5);
    return { target: targetCode, options };
  }
};

export default ENGINE;