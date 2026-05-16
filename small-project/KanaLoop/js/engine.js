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
  NEW_CHAR_COUNT: 1,
  HISTORY_LIMIT: 100, // 시스템에서 관리하는 최대 기록 추적 수
  MASTERY_THRESHOLD: 0.85, // 85% 숙련도 기준
  CONFIG: {
    BASE_PROBABILITY: 1.0,
    MIN_SPEED_CRITERIA: 500, // 500ms보다 느리면 문제로 판단
    MAX_PROBABILITY: 10.0,    // 확률 천장
    ACC_SENSITIVITY: 2.0,   // 오답 시 가중치 점프 폭
    SPEED_SENSITIVITY: 1.5, // 지연 응답 시 가중치 반영 비율
    DECAY_FACTOR: 0.96      // 지수 감쇠 계수 (최근 데이터 강조)
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
   * 가중치 계산 (Accuracy + Speed + Exponential Decay)
   * 링 버퍼에서 최신 데이터일수록 높은 가중치를 부여하여 개인화된 숙련도를 측정합니다.
   * 임베디드의 지수 이동 평균(EMA) 필터와 유사한 원리를 사용하여 최근 실수를 강조합니다.
   */
  calculateWeight: (data) => {
    const n = data.total_attempts < ENGINE.HISTORY_LIMIT ? data.total_attempts : ENGINE.HISTORY_LIMIT;
    if (n === 0) return ENGINE.CONFIG.MAX_PROBABILITY; // 한 번도 안 푼 건 최우선 노출

    let weightedErrorSum = 0;
    let weightedSpeedSum = 0;
    let weightTotal = 0;

    // 링 버퍼의 최신 데이터(head)부터 역순으로 가중치(Decay) 적용
    for (let i = 0; i < n; i++) {
      // 최근 데이터일수록 i가 작으므로 recencyWeight가 1에 가까움 (decay^0 = 1)
      const recencyWeight = Math.pow(ENGINE.CONFIG.DECAY_FACTOR, i);
      // head가 최근 기록 인덱스이므로 head - i 로 역추적 (링 버퍼 순환 고려)
      const index = (data.head - i + 100) % 100;
      
      const result = (data.results && data.results[index] !== undefined) ? data.results[index] : 0;
      const speed = (data.speeds && data.speeds[index] !== undefined) ? data.speeds[index] : 0;

      // 오답 페널티 (1 - 정답여부)
      weightedErrorSum += (1 - result) * recencyWeight;
      
      // 속도 페널티 (기준 속도 대비 가중치)
      const speedRatio = speed / ENGINE.CONFIG.MIN_SPEED_CRITERIA;
      weightedSpeedSum += speedRatio * recencyWeight;
      
      weightTotal += recencyWeight;
    }

    // 정규화된 가중 평균 계산
    const avgError = weightedErrorSum / weightTotal;
    const avgSpeed = weightedSpeedSum / weightTotal;

    let finalScore = ENGINE.CONFIG.BASE_PROBABILITY 
                   + (ENGINE.CONFIG.ACC_SENSITIVITY * avgError) 
                   + (ENGINE.CONFIG.SPEED_SENSITIVITY * avgSpeed);

    // 상한선 제한 및 반환
    return Math.min(finalScore, ENGINE.CONFIG.MAX_PROBABILITY);
  },

  /**
   * 난이도 조절: 세션 정답률이 MASTERY_THRESHOLD를 넘으면 신규 문제 추가
   */
  adjustDifficulty: () => {
    if (ENGINE.recentResults.length < 10) return;

    const correctCount = ENGINE.recentResults.filter(r => r === true).length;
    const accuracy = correctCount / ENGINE.recentResults.length;

    // 정답률이 MASTERY_THRESHOLD(85%)를 넘으면 새로운 글자 추가
    if (accuracy >= ENGINE.MASTERY_THRESHOLD && ENGINE.activePool.length < ENGINE.MAX_POOL_SIZE) {
      ENGINE.lastAddedChar = ""; // 이번 차례에 추가된 문자열 초기화
      for (let i = 0; i < ENGINE.NEW_CHAR_COUNT; i++) {
        let nextCode = Math.max(...ENGINE.activePool) + 1;
        
        // 작은 글자이거나 이미 풀에 있는 글자라면 건너뛰기
        while (nextCode <= ENGINE.range.end && (ENGINE.smallChars.includes(nextCode) || ENGINE.activePool.includes(nextCode))) {
          nextCode++;
        }

        if (nextCode <= ENGINE.range.end && ENGINE.activePool.length < ENGINE.MAX_POOL_SIZE) {
          ENGINE.activePool.push(nextCode);
          const addedChar = ENGINE.toChar(nextCode);
          ENGINE.lastAddedChar += (ENGINE.lastAddedChar ? ", " : "") + addedChar;
          console.log("학습 마스터! 새 표준 글자 추가:", addedChar);
          ENGINE.recentResults = []; // 새 글자 추가 후 세션 성적 초기화
        }
      }
    }
    
    if (ENGINE.recentResults.length >= 20) ENGINE.recentResults = [];
  },

  /**
   * 메타 가중치 튜닝: 예측과 실제 결과의 차이를 바탕으로 모델의 민감도를 조절합니다.
   */
  tuneMetaWeights: (isCorrect) => {
    // 정답 시 기준치(1.0), 오답 시 최대치(10.0)를 실제 결과값으로 상정
    const actualResult = isCorrect ? ENGINE.CONFIG.BASE_PROBABILITY : ENGINE.CONFIG.MAX_PROBABILITY;
    const error = actualResult - ENGINE.expectedWeight;

    if (error > 0) { 
      // 모델이 취약점을 과소평가함 -> 민감도 상향
      ENGINE.CONFIG.ACC_SENSITIVITY += error * 0.01;
    } else if (error < -2) { 
      // 모델이 너무 겁을 먹음 (과잉 보호) -> 민감도 하향
      ENGINE.CONFIG.ACC_SENSITIVITY -= Math.abs(error) * 0.005;
    }

    // 민감도 범위 제한 (안전장치: 1.0 ~ 5.0)
    ENGINE.CONFIG.ACC_SENSITIVITY = Math.max(1.0, Math.min(5.0, ENGINE.CONFIG.ACC_SENSITIVITY));
  },

  /**
   * 문제 생성 (가중치 기반 정답 선택 + 오답 2)
   */
  generateQuestion: async () => {
    ENGINE.adjustDifficulty();

    // DB 데이터를 기반으로 각 문자의 가중치 계산
    const dbData = await getAllProgress();
    const weights = ENGINE.activePool.map(code => {
      const data = dbData[code] || { total_attempts: 0, head: 0, results: [], speeds: [] };
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