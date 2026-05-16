/**
 * db-handler.js
 * Firebase Firestore 연동 데이터 관리
 */

let currentUserUid = null;

/**
 * 사용자 UID 설정 및 데이터 초기화
 */
const initUser = (uid) => {
  currentUserUid = uid;
};

/**
 * 특정 문자의 숙련도 데이터 가져오기
 * @param {string} charCode - 유니코드 (예: '3041')
 */
const getProgress = async (charCode) => {
  if (!currentUserUid) return null;

  const docRef = db.collection('users').doc(currentUserUid).collection('progress').doc(charCode);
  const doc = await docRef.get();

  if (doc.exists) {
    return doc.data();
  } else {
    // 요청하신 새로운 데이터 구조 초기화 (100개 고정 사이즈)
    return {
      char: String.fromCharCode(parseInt(charCode)),
      total_attempts: 0,
      head: 0,
      results: new Array(100).fill(0),
      speeds: new Array(100).fill(0)
    };
  }
};

/**
 * 학습 결과 업데이트 (85% 규칙 반영을 위한 데이터 저장)
 * @param {string} charCode - 유니코드
 * @param {boolean} isCorrect - 정답 여부
 * @param {number} speed - 응답 속도 (ms)
 */
const updateProgress = async (charCode, isCorrect, speed) => {
  if (!currentUserUid) return;

  const docRef = db.collection('users').doc(currentUserUid).collection('progress').doc(charCode);
  const doc = await docRef.get();
  
  const defaultData = {
    char: String.fromCharCode(parseInt(charCode)),
    total_attempts: 0,
    head: 0,
    results: new Array(100).fill(0),
    speeds: new Array(100).fill(0)
  };

  // 문서가 존재하면 가져온 데이터를 기본값과 병합하여 필드 누락 방지
  let data = doc.exists ? { ...defaultData, ...doc.data() } : defaultData;

  // 데이터 반영
  data.total_attempts = (data.total_attempts || 0) + 1;
  data.head = data.total_attempts % 100; // 100개 단위 순환
  if (!Array.isArray(data.results)) data.results = new Array(100).fill(0);
  if (!Array.isArray(data.speeds)) data.speeds = new Array(100).fill(0);

  data.results[data.head] = isCorrect ? 1 : 0;
  data.speeds[data.head] = speed;

  await docRef.set(data);
};

/**
 * 모든 학습 데이터 가져오기 (통계용)
 */
const getAllProgress = async () => {
  if (!currentUserUid) return {};

  const snapshot = await db.collection('users').doc(currentUserUid)
    .collection('progress')
    .get();

  const dataMap = {};
  snapshot.forEach(doc => {
    dataMap[doc.id] = doc.data();
  });
  return dataMap;
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
 * 모든 학습 데이터 초기화 (삭제)
 */
const resetAllProgress = async () => {
  if (!currentUserUid) return;

  const snapshot = await db.collection('users').doc(currentUserUid).collection('progress').get();
  const batch = db.batch();

  snapshot.forEach(doc => {
    batch.delete(doc.ref);
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