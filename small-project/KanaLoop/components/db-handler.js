import { db, auth } from './firebase-config.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  increment,
  limit,
  orderBy,
  query,
  where,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import { ALPHABETS } from './engine.js';

// 내부 상주 변수 및 도메인별 다차원 메모리 캐시 구조화
let currentUserUid = null;
let progressCache = {};

/**
 * 게스트용 고유 기기 ID 생성 및 반환
 */
const _getOrCreateGuestId = () => {
  let guestId = localStorage.getItem('GUEST_ID');
  if (!guestId) {
    guestId = 'GUEST_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('GUEST_ID', guestId);
  }
  return guestId;
};

/**
 * 사용자 UID 설정 및 도메인 전역 캐시 갱신 초기화
 */
export const initUser = async (uid) => {
  if (uid) {
    currentUserUid = uid;
  } else {
    currentUserUid = _getOrCreateGuestId();
  }
  await refreshProgressCache();
};

/**
 * DB에서 지원하는 모든 도메인의 학습 내역을 통합 수집하여 메모리 캐시 갱신
 */
export const refreshProgressCache = async () => {
  if (!currentUserUid) return;

  // 캐시 메모리 구조 초기화
  progressCache = {};
  const domains = Object.keys(ALPHABETS);
  domains.forEach(d => progressCache[d] = {});

  // 최신 v10 getDocs 및 구조화 경로 매핑 적용
  await Promise.all(domains.map(async (domain) => {
    const charsRef = collection(db, 'users', currentUserUid, 'progress', domain, 'chars');
    const snapshot = await getDocs(charsRef);

    snapshot.forEach(doc => {
      progressCache[domain][doc.id] = doc.data();
    });
  }));

  console.log("Progress 다차원 캐시 동기화 완료. ID:", currentUserUid);
};

/**
 * 특정 도메인의 전체 진도 캐시 반환 (engine.js 진입점 연동 전용)
 */
export const getAllProgress = async (domain) => {
  return progressCache[domain] || {};
};

/**
 * 특정 단일 문자의 정밀 스키마 데이터 조회
 */
export const getProgress = async (domain, charId) => {
  const key = charId.toString();
  if (progressCache[domain] && progressCache[domain][key]) {
    return progressCache[domain][key];
  }

  return {
    charId: parseInt(charId),
    domain,
    lastSessionTime: 0,
    latenciesIdx: 0,
    outCnt: 0,
    recentLatencies: [],
    resetOutCnt: 0,
    stage: 0,
    sessionStreak: 0,
    totalSolved: 0
  };
};

/**
 * 정산 완료된 단일 단어 스키마 상태를 캐시 및 Firestore DB에 동기화 저장
 */
export const updateProgress = async (domain, charId, updatedItem) => {
  if (!currentUserUid) return;

  const key = charId.toString();
  if (!progressCache[domain]) progressCache[domain] = {};
  progressCache[domain][key] = updatedItem;

  // v10 setDoc 구조 모델 적용
  const docRef = doc(db, 'users', currentUserUid, 'progress', domain, 'chars', key);
  await setDoc(docRef, updatedItem);
};

/**
 * 세션 풀에 참여한 10개 단어들의 일련 변동 상태를 일괄 트랜잭션 동기화
 */
export const saveSessionPoolState = async (domain, sessionPool) => {
  if (!currentUserUid || !sessionPool || sessionPool.length === 0) return;

  // 구형 db.batch() 철폐 후 최신 writeBatch(db) 바인딩
  const batch = writeBatch(db);

  sessionPool.forEach(item => {
    const key = item.charId.toString();
    if (!progressCache[domain]) progressCache[domain] = {};
    progressCache[domain][key] = item;

    const docRef = doc(db, 'users', currentUserUid, 'progress', domain, 'chars', key);
    batch.set(docRef, item);
  });

  await batch.commit();
  console.log(`세션 풀 스트릭 데이터 일괄 동기화 완료 (${sessionPool.length}개)`);
};

/**
 * 세션 타임오버 시 일일 학습 시간 누계 업데이트 기록
 */
export const updateDailyStudyTime = async (seconds, domain) => {
  if (!currentUserUid || !domain) return;

  const today = new Date().toISOString().split('T')[0];
  const docRef = doc(db, 'users', currentUserUid, 'study_stats', today);

  const updates = {};
  updates[domain] = increment(seconds);
  updates.lastUpdated = Date.now();

  // firebase.firestore 글로벌 네임스페이스 제거 후 최신 독립형 increment 수급 적용
  await setDoc(docRef, updates, { merge: true });
};

/**
 * 타임오버 시 당일 최고 숙련도 반응속도 중간값 등의 요약 통계 저장
 */
export const updateDailyStats = async (avgAll, avgR10, avgR5) => {
  if (!currentUserUid) return;

  const today = new Date().toISOString().split('T')[0];
  const docRef = doc(db, 'users', currentUserUid, 'daily_summary', today);

  await setDoc(docRef, {
    avgAll,
    avgRecent10: avgR10,
    avgRecent5: avgR5,
    timestamp: Date.now()
  }, { merge: true });
};

/**
 * 글로벌 전역 랭킹 보드 스코어 스케줄 등록
 */
export const submitRanking = async (displayName, score) => {
  if (!currentUserUid) return;

  const docRef = doc(db, 'global_rankings', currentUserUid);
  await setDoc(docRef, {
    uid: currentUserUid,
    name: displayName,
    score: score,
    updatedAt: Date.now()
  });
};

/**
 * 스피드런 랭킹 기록 등록
 */
export const submitSpeedrunRanking = async (domain, charCount, elapsedTime, accuracy, customName = null) => {
  if (!currentUserUid) return;

  let displayName = customName;
  if (!displayName) {
    const userNameDisplay = document.getElementById('profile-name');
    displayName = userNameDisplay ? userNameDisplay.innerText : "게스트";
  }

  // 동일 사용자가 여러 번 노출될 수 있도록 타임스탬프를 포함한 고유 문서 ID 생성
  const docId = `${currentUserUid}_${domain}_${Date.now()}`;
  const docRef = doc(db, 'speedrun_rankings', docId);

  await setDoc(docRef, {
    uid: currentUserUid,
    name: displayName,
    domain: domain,
    charCount: charCount,
    elapsedTime: elapsedTime,
    accuracy: accuracy,
    updatedAt: Date.now()
  });

  return docId;
};

/**
 * 글로벌 랭킹 리스트 탑다운 조회
 */
export const getGlobalRankings = async (limitCount = 10, targetDomain = 'all') => {
  const rankingsRef = collection(db, 'speedrun_rankings');

  let q = query(rankingsRef, orderBy('accuracy', 'desc'), orderBy('elapsedTime', 'asc'), limit(limitCount));
  if (targetDomain !== 'all') {
    q = query(rankingsRef, where('domain', '==', targetDomain), orderBy('accuracy', 'desc'), orderBy('elapsedTime', 'asc'), limit(limitCount));
  }

  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();

      // 소요시간 mm:ss
      const totalM = Math.floor(data.elapsedTime / 60).toString().padStart(2, '0');
      const s = (data.elapsedTime % 60).toString().padStart(2, '0');
      const elapsedStr = `${totalM}:${s}`;

      // 완료시각 YYYY-MM-DD hh:mm:ss
      const d = new Date(data.updatedAt);
      const dateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;

      return {
        id: doc.id,
        ...data,
        score: `${data.accuracy}% (${elapsedStr})`,
        elapsedStr: elapsedStr, // 분리된 테이블 셀용 시간 포맷 별도 제공
        updatedAt: `${dateStr} ${timeStr}`
      };
    });
  } catch (error) {
    if (error.message && error.message.includes('index')) {
      console.error("🔥 [DB Error] Firebase 복합 인덱스가 누락되었습니다! 다음 링크를 클릭하여 생성하세요:\n", error.message);
    }
    throw error;
  }
};

/**
 * 사용자 커스텀 기획 환경설정 제어 아카이브 저장
 */
export const saveUserConfig = async (config) => {
  if (!currentUserUid) return;
  const docRef = doc(db, 'users', currentUserUid);
  await setDoc(docRef, { config }, { merge: true });
};

export const getUserConfig = async () => {
  if (!currentUserUid) return null;

  // v10 단일 문서 조회를 위한 getDoc 함수 처리
  const docRef = doc(db, 'users', currentUserUid);
  const docSnap = await getDoc(docRef);

  return docSnap.exists() ? docSnap.data().config : null;
};

/**
 * 최근 7일간의 학습 통계 가져오기
 */
export const getWeeklyStats = async (domain) => {
  if (!currentUserUid || !domain) return { total: 0, history: {} };

  const stats = { total: 0, history: {} };
  const promises = [];
  const days = [];

  // 최근 7일(오늘 포함)의 날짜 문자열(YYYY-MM-DD) 생성
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().split('T')[0];
    days.push(dayStr);

    const docRef = doc(db, 'users', currentUserUid, 'study_stats', dayStr);
    promises.push(getDoc(docRef));
  }

  // 7일 치 문서를 병렬로 한 번에 조회
  const snapshots = await Promise.all(promises);
  snapshots.forEach((snap, idx) => {
    const seconds = snap.exists() ? (snap.data()[domain] || 0) : 0;
    stats.history[days[idx]] = seconds;
    stats.total += seconds;
  });

  return stats;
};

/**
 * 학습 모드 랭킹 기록 등록
 * @returns {Promise<boolean>} 새로운 기록으로 갱신되었는지 여부
 */
export const submitStudyRanking = async (domain, correctCount, elapsedTime, accuracy, customName = null) => {
  if (!currentUserUid) return false;

  let displayName = customName;
  if (!displayName) {
    const userNameDisplay = document.getElementById('profile-name');
    displayName = userNameDisplay ? userNameDisplay.innerText : "게스트";
  }

  const docId = `${currentUserUid}_${domain}`;
  const docRef = doc(db, 'study_rankings', docId);

  try {
    const docSnap = await getDoc(docRef);
    let shouldUpdate = false;

    if (docSnap.exists()) {
      const data = docSnap.data();
      const existingCorrect = data.correctCount || 0;
      const existingTime = data.elapsedTime || Infinity;

      if (correctCount > existingCorrect) {
        shouldUpdate = true;
      } else if (correctCount === existingCorrect && elapsedTime < existingTime) {
        shouldUpdate = true;
      }
    } else {
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      await setDoc(docRef, {
        uid: currentUserUid,
        name: displayName,
        domain: domain,
        correctCount: correctCount,
        elapsedTime: elapsedTime,
        accuracy: accuracy,
        updatedAt: Date.now()
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error("[DB Error] 학습모드 랭킹 저장 실패:", error);
    return false;
  }
};

/**
 * 학습 모드 글로벌 랭킹 리스트 조회
 */
export const getStudyRankings = async (limitCount = 10, targetDomain = 'all') => {
  const rankingsRef = collection(db, 'study_rankings');

  // 정답수 내림차순, 소요시간 오름차순
  let q = query(rankingsRef, orderBy('correctCount', 'desc'), orderBy('elapsedTime', 'asc'), limit(limitCount));
  if (targetDomain !== 'all') {
    q = query(rankingsRef, where('domain', '==', targetDomain), orderBy('correctCount', 'desc'), orderBy('elapsedTime', 'asc'), limit(limitCount));
  }

  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();

      // 소요시간 mm:ss
      const totalM = Math.floor(data.elapsedTime / 60).toString().padStart(2, '0');
      const s = (data.elapsedTime % 60).toString().padStart(2, '0');
      const elapsedStr = `${totalM}:${s}`;

      // 완료시각 YYYY-MM-DD hh:mm:ss
      const d = new Date(data.updatedAt);
      const dateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;

      return {
        id: doc.id,
        ...data,
        elapsedStr: elapsedStr,
        updatedAt: `${dateStr} ${timeStr}`
      };
    });
  } catch (error) {
    if (error.message && error.message.includes('index')) {
      console.error("🔥 [DB Error] Firebase 복합 인덱스가 누락되었습니다! 다음 링크를 클릭하여 생성하세요:\n", error.message);
    }
    throw error;
  }
};

/**
 * 현재 로그인된 사용자 UID 또는 게스트 ID 조회 헬퍼
 */
export const getCurrentUserUid = () => currentUserUid;

/**
 * 사용자 건의사항 등록/수정
 */
export const submitSuggestion = async (text) => {
  if (!currentUserUid) return;

  const docRef = doc(db, 'suggestions', currentUserUid);
  const docSnap = await getDoc(docRef);
  const existingData = docSnap.exists() ? docSnap.data() : {};

  const suggestionHistory = existingData.suggestionHistory || [];
  suggestionHistory.push({
    text: text,
    timestamp: Date.now()
  });

  let displayName = "게스트";
  let email = "";
  if (auth && auth.currentUser) {
    displayName = auth.currentUser.displayName || "이름 없음";
    email = auth.currentUser.email || "";
  } else {
    displayName = localStorage.getItem('GUEST_ID') || "게스트";
  }

  await setDoc(docRef, {
    uid: currentUserUid,
    name: displayName,
    email: email,
    suggestion: text,
    suggestionHistory: suggestionHistory,
    reply: existingData.reply || "",
    updatedAt: Date.now()
  }, { merge: true });
};

/**
 * 사용자 자신의 건의사항 및 답변 가져오기
 */
export const getUserSuggestion = async () => {
  if (!currentUserUid) return null;

  const docRef = doc(db, 'suggestions', currentUserUid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
};