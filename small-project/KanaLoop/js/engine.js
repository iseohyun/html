/**
 * engine.js
 * 유니코드 기반 문제 생성 및 85% 규칙 난이도 엔진
 */

const ENGINE = {
  // 히라가나 유니코드 범위: 0x3041(あ) ~ 0x3096(ん)
  range: { start: 12353, end: 12438 },
  activePool: [], // 현재 학습 중인 유니코드 번호들
  MIN_POOL_SIZE: 3,
  MAX_POOL_SIZE: 100, // 모든 히라가나와 탁음을 수용할 수 있도록 상향
  MAX_SPEED_CRITERIA: 5000, // 5000ms 이상은 극단적 지연으로 간주하여 패널티 적용
  NEW_CHAR_COUNT: 1,
  HISTORY_LIMIT: 100, // 시스템에서 관리하는 최대 기록 추적 수
  MASTERY_THRESHOLD: 0.85, // 85% 숙련도 기준
  CONFIG: {
    BASE_PROBABILITY: 1.0,
    MIN_SPEED_CRITERIA: 500, // 500ms보다 느리면 문제로 판단
    MAX_PROBABILITY: 10.0,    // 확률 천장
    DECAY_FACTOR: 0.96,     // 지수 감쇠 계수 (최근 데이터 강조)
    RETENTION_SENSITIVITY: 0.01 // 망각 민감도 (시간당 가중치 증가분: 100시간당 1.0 증가)
  },
  currentTarget: null,
  recentResults: [], // 최근 20개의 정답 여부 (T/F)
  lastAddedChar: null, // 가장 최근에 추가된 문자 저장
  expectedWeight: 0,   // 현재 문제의 예측 가중치 저장

  // 필터링할 작은 글자 유니코드 목록 (ぁ, ぃ, ぅ, ぇ, ぉ, っ, ゃ, ゅ, ょ, ゎ, ゕ, ゖ)
  smallChars: [12353, 12355, 12357, 12359, 12361, 12387, 12419, 12421, 12423, 12436, 12437, 12438],

  /**
   * 유니코드를 문자로 변환
   */
  toChar: (code) => String.fromCharCode(code),

  /**
   * 초기 풀 구성 (DB 데이터를 우선 로드하고 없으면 기본값 세팅)
   */
  initPool: async () => {
    // 1. DB에서 기존 학습 데이터 가져오기
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
    const hoursSinceLast = lastMillis ? (Date.now() - lastMillis) / (1000 * 60 * 60) : 0;

    // 개별 글자의 단순 최근 평균 속도 계산 (최근 n개)
    let totalSpeed = 0;
    for (let j = 0; j < n; j++) totalSpeed += data.speeds[(data.head - j + 100) % 100] || 0;
    const rawAvgSpeed = totalSpeed / n;

    // 2. 동적 가중치 의존도(Decay Factor) 결정
    let localDecay = ENGINE.CONFIG.DECAY_FACTOR;
    // 오래된 글자의 풀이가 기준보다 느려질수록 과거 기록 의존도를 높임 (부족한 점을 더 오래 기억)
    if (hoursSinceLast > 12 && rawAvgSpeed > ENGINE.CONFIG.MIN_SPEED_CRITERIA) {
      const stalenessBonus = Math.min(0.03, (hoursSinceLast / 168)); // 최대 일주일 기준 상향폭
      const struggleFactor = Math.min(1.0, (rawAvgSpeed / 2000));
      localDecay = Math.min(0.99, localDecay + (stalenessBonus * struggleFactor));
    }

    for (let i = 0; i < n; i++) {
      const recencyWeight = Math.pow(localDecay, i);
      const index = (data.head - i + 100) % 100;

      const result = (data.results && data.results[index] !== undefined) ? data.results[index] : 0;
      const speed = (data.speeds && data.speeds[index] !== undefined) ? data.speeds[index] : 0;

      // 속도 페널티 (기준 속도 대비 가중치)
      const speedRatio = speed / ENGINE.CONFIG.MIN_SPEED_CRITERIA;
      weightedSpeedSum += speedRatio * recencyWeight;

      weightTotal += recencyWeight;
    }

    // 정규화된 가중 평균 계산
    const avgSpeed = weightedSpeedSum / weightTotal;

    // 망각 보너스 합산 (오래될수록 가중치 증가, 최대 5.0)
    const forgetBoost = Math.min(5.0, hoursSinceLast * ENGINE.CONFIG.RETENTION_SENSITIVITY);

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
    let nextCode = Math.max(...ENGINE.activePool) + 1;
    while (nextCode <= ENGINE.range.end && (ENGINE.smallChars.includes(nextCode) || ENGINE.activePool.includes(nextCode))) {
      nextCode++;
    }

    if (nextCode <= ENGINE.range.end && ENGINE.activePool.length < ENGINE.MAX_POOL_SIZE) {
      ENGINE.activePool.push(nextCode);
      ENGINE.lastAddedChar = ENGINE.toChar(nextCode);
      console.log("학습 마스터! 새 표준 글자 추가:", ENGINE.lastAddedChar);
      return true;
    }
    return false;
  },

  /**
   * 신규 학습 문자 추가 여부를 판단하는 핵심 로직
   */
  checkAndInhaleNewCharacter: async () => {
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
    const PROGRESS_RATIO = 0.85;
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

    if (currentMasteryRatio >= PROGRESS_RATIO) {
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

    // DB 데이터를 기반으로 각 문자의 가중치 계산
    const dbData = await getAllProgress();
    const weights = ENGINE.activePool.map(code => {
      const data = dbData[code.toString()] || { total_attempts: 0, head: 0, results: [], speeds: [] };
      return { code, score: ENGINE.calculateWeight(data) };
    });

    // 가중치 합계 계산 및 무작위 선택
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
    // 예측 가중치 저장 (튜닝 시 사용)
    ENGINE.expectedWeight = weights.find(w => w.code === targetCode).score;

    // 오답 후보 선정: 정답을 제외한 activePool 내에서 무작위 2개 추출
    let distractors = ENGINE.activePool
      .filter(c => c !== targetCode)
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);

    // 4. 정답 1개 + 오답 2개를 합친 뒤 셔플
    const options = [targetCode, ...distractors].sort(() => Math.random() - 0.5);
    return { target: targetCode, options };
  }
};