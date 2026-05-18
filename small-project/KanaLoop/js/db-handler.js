/**
 * db-handler.js
 * Firebase Firestore 연동 데이터 관리
 */

let currentUserUid = null;
let progressCache = {}; // 메모리 캐시 추가

/**
 * 사용자 UID 설정 및 데이터 초기화
 */
const initUser = async (uid) => {
  currentUserUid = uid;
  await refreshProgressCache(); // 로그인 시 최초 1회 전체 로드
};

/**
 * DB에서 전체 데이터를 긁어와 캐시를 갱신 (네트워크 사용)
 */
const refreshProgressCache = async () => {
  if (!currentUserUid) return;
  const snapshot = await db.collection('users').doc(currentUserUid).collection('progress').get();
  progressCache = {};
  snapshot.forEach(doc => {
    const data = doc.data();
    // Sanitize data loaded from DB before caching
    if (!Array.isArray(data.results) || data.results.some(isNaN)) {
      data.results = new Array(100).fill(0);
    }
    if (!Array.isArray(data.speeds) || data.speeds.some(isNaN)) {
      data.speeds = new Array(100).fill(0);
    }
    data.head = typeof data.head === 'number' ? data.head : 0;
    data.total_attempts = typeof data.total_attempts === 'number' ? data.total_attempts : 0;
    progressCache[doc.id] = data;
  });
  console.log("Progress cache refreshed.");
};

/**
 * 특정 문자의 숙련도 데이터 가져오기
 * @param {string} charCode - 유니코드 (예: '3041')
 */
const getProgress = async (charCode) => {
  if (progressCache[charCode]) return progressCache[charCode];
  
    // 요청하신 새로운 데이터 구조 초기화 (100개 고정 사이즈)
    return {
      char: String.fromCharCode(parseInt(charCode)),
      total_attempts: 0,
      head: 0,
      results: new Array(100).fill(0),
      speeds: new Array(100).fill(0)
    };
};

/**
 * 학습 결과 업데이트 (85% 규칙 반영을 위한 데이터 저장)
 * @param {string} charCode - 유니코드
 * @param {boolean} isCorrect - 정답 여부
 * @param {number} speed - 응답 속도 (ms)
 * @param {number} weight - 현재 계산된 가중치 (1.0~10.0)
 */
const updateProgress = async (charCode, isCorrect, speed, weight) => {
  if (!currentUserUid) return;

  // 캐시에서 먼저 가져옴 (Read 쿼리 절약)
  let data = await getProgress(charCode);

  // 데이터 반영
  data.total_attempts = (data.total_attempts || 0) + 1;
  data.head = data.total_attempts % 100; // 100개 단위 순환

  data.results[data.head] = isCorrect ? 1 : 0;
  data.speeds[data.head] = speed;
  data.lastTime = firebase.firestore.FieldValue.serverTimestamp();
  data.weight = Math.round(Math.min(Math.max(weight * 10, 1), 100)); // 1.0~10.0 -> 1~100 정수화

  // 메모리 캐시 즉시 업데이트
  progressCache[charCode] = data;
  
  // DB 비동기 저장
  const docRef = db.collection('users').doc(currentUserUid).collection('progress').doc(charCode);
  await docRef.set(data);
};

/**
 * 모든 학습 데이터 가져오기 (통계용)
 */
const getAllProgress = async () => {
  return progressCache; // DB에 가지 않고 메모리 반환
};

/**
 * 전체 활성 문자 목록 가져오기
 */
const getActivePool = async () => {
  if (!currentUserUid) return [];

  const snapshot = await db.collection('users').doc(currentUserUid)
    .collection('progress')
    .where('lv', '<', 5) // 숙련도 5 미만인 문자들만 추출
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * 선택된 문자들의 학습 데이터만 초기화합니다.
 */
const resetSelectedProgress = async (codes) => {
  if (!currentUserUid) return;

  const batch = db.batch();
  codes.forEach(code => {
    const docRef = db.collection('users').doc(currentUserUid).collection('progress').doc(code.toString());
    batch.delete(docRef);
    delete progressCache[code.toString()]; // 메모리 캐시에서도 삭제
  });

  await batch.commit();
};

/**
 * 모든 학습 데이터 초기화 (삭제)
 */
const resetAllProgress = async () => {
  if (!currentUserUid) return;

  const snapshot = await db.collection('users').doc(currentUserUid).collection('progress').get();
  const batch = db.batch();

  snapshot.forEach(doc => {
    batch.delete(doc.ref);
    delete progressCache[doc.id]; // 메모리 캐시 전체 삭제
  });

  await batch.commit();
};

/**
 * 일일 학습 시간 업데이트
 */
const updateDailyStudyTime = async (seconds) => {
  if (!currentUserUid) return;
  const today = new Date().toISOString().split('T')[0];
  const docRef = db.collection('users').doc(currentUserUid).collection('sessions').doc(today);
  
  const doc = await docRef.get();
  const currentSeconds = doc.exists ? (doc.data().totalSeconds || 0) : 0;
  
  await docRef.set({ totalSeconds: currentSeconds + seconds }, { merge: true });
};

/**
 * 일일 학습 통계(평균 반응 속도) 업데이트
 */
const updateDailyStats = async (avg, r10, r5) => {
  if (!currentUserUid) return;
  const today = new Date().toISOString().split('T')[0];
  const docRef = db.collection('users').doc(currentUserUid).collection('sessions').doc(today);

  await docRef.set({
    avgResponseTime: Math.round(avg),
    recent10Avg: Math.round(r10),
    recent5Avg: Math.round(r5)
  }, { merge: true });
  
  console.log(`Daily stats saved: Avg ${avg}ms, R10 ${r10}ms, R5 ${r5}ms`);
};

/**
 * 학습 통계 데이터 가져오기 (최근 7일 및 총합)
 */
const getStudyStats = async () => {
  if (!currentUserUid) return { history: {}, total: 0 };
  const snapshot = await db.collection('users').doc(currentUserUid).collection('sessions').get();
  let total = 0;
  let history = {};
  snapshot.forEach(doc => {
    const sec = doc.data().totalSeconds || 0;
    history[doc.id] = sec;
    total += sec;
  });
  return { history, total };
};

/**
 * 사용자 개인화 설정 저장
 */
const saveUserConfig = async (config, learningTime) => {
  if (!currentUserUid) return;
  await db.collection('users').doc(currentUserUid).set({
    DECAY_FACTOR: config.DECAY_FACTOR,
    AUTO_PROGRESS: config.AUTO_PROGRESS,
    PROGRESS_RATIO: config.PROGRESS_RATIO,
    learningTime: learningTime
  }, { merge: true });
};

/**
 * 사용자 개인화 설정 로드
 */
const getUserConfig = async () => {
  if (!currentUserUid) return null;
  const doc = await db.collection('users').doc(currentUserUid).get();
  if (doc.exists) {
    return doc.data();
  }
  return null;
};

/**
 * 사용자 프로필 정보(이름, 이메일) 저장
 */
const saveUserProfile = async (name, email) => {
  if (!currentUserUid) return;
  await db.collection('users').doc(currentUserUid).set({
    displayName: name,
    email: email,
    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
};