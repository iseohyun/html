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
let progressMeta = {};

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
 * 로컬 localStorage 스토리지에 캐시 및 타임스탬프 동기화 보존
 */
const _saveLocalProgressCache = () => {
  if (!currentUserUid) return;
  try {
    const cacheKey = `KANALOOP_PROGRESS_CACHE_${currentUserUid}`;
    const metaKey = `KANALOOP_PROGRESS_META_${currentUserUid}`;
    localStorage.setItem(cacheKey, JSON.stringify(progressCache));
    localStorage.setItem(metaKey, JSON.stringify(progressMeta));
  } catch (e) {
    console.warn("[LocalFirst] localStorage 동기화 저장 실패:", e);
  }
};

/**
 * 로컬 localStorage 스토리지에서 캐시 및 타임스탬프 복원
 */
const _loadLocalProgressCache = () => {
  if (!currentUserUid) return false;
  try {
    const cacheKey = `KANALOOP_PROGRESS_CACHE_${currentUserUid}`;
    const metaKey = `KANALOOP_PROGRESS_META_${currentUserUid}`;
    const cachedData = localStorage.getItem(cacheKey);
    const cachedMeta = localStorage.getItem(metaKey);

    if (cachedData) {
      progressCache = JSON.parse(cachedData);
      progressMeta = cachedMeta ? JSON.parse(cachedMeta) : {};
      return true;
    }
  } catch (e) {
    console.warn("[LocalFirst] localStorage 복원 실패:", e);
  }
  return false;
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
 * DB/로컬에서 지원하는 모든 도메인의 학습 내역을 통합 수집하여 메모리 캐시 갱신 (서버 데이터 100% 수급 & 지능형 병합)
 */
export const refreshProgressCache = async () => {
  if (!currentUserUid) return;

  const domains = Object.keys(ALPHABETS);

  // 1. 브라우저 localStorage 캐시 0ms 즉시 복원
  const hasLocalCache = _loadLocalProgressCache();
  if (!hasLocalCache) {
    progressCache = {};
    progressMeta = {};
    domains.forEach(d => {
      progressCache[d] = {};
      progressMeta[d] = 0;
    });
  }

  // 2. 서버 DB의 전체 도메인 데이터를 1회 읽어와 로컬 데이터와 양방향 지능형 병합 (Smart Bidirectional Merge)
  try {
    let updatedDomainCount = 0;

    await Promise.all(domains.map(async (domain) => {
      const charsRef = collection(db, 'users', currentUserUid, 'progress', domain, 'chars');
      const snapshot = await getDocs(charsRef);

      if (!progressCache[domain]) progressCache[domain] = {};

      if (!snapshot.empty) {
        updatedDomainCount++;
        snapshot.forEach(docSnap => {
          const serverCharData = docSnap.data();
          const localCharData = progressCache[domain][docSnap.id];

          // 서버 데이터가 존재하고, 로컬이 없거나 서버의 최신 시각(lastSessionTime / updatedAt)이 더 최신/동일하면 서버 데이터 반영
          const serverTime = serverCharData.lastSessionTime || serverCharData.updatedAt || 0;
          const localTime = localCharData ? (localCharData.lastSessionTime || localCharData.updatedAt || 0) : -1;

          if (!localCharData || serverTime >= localTime) {
            progressCache[domain][docSnap.id] = serverCharData;
          }
        });
      }

      progressMeta[domain] = Date.now();
    }));

    // 3. 병합 완료된 양방향 진도 데이터를 localStorage에 정밀 동기화
    _saveLocalProgressCache();
    console.log(`[LocalFirst] 서버 DB 데이터 양방향 동기화 및 병합 완료 (${updatedDomainCount}개 도메인 서버 수급 완료). ID:`, currentUserUid);
  } catch (err) {
    console.warn("[LocalFirst] 서버 동기화 생략 (로컬 캐시 모드로 안전 구동):", err.message);
  }
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
 * 정산 완료된 단일 단어 스키마 상태를 로컬 캐시 및 localStorage에 0ms 실시간 반영 (서버 통신 0건)
 */
export const updateProgress = async (domain, charId, updatedItem) => {
  if (!currentUserUid) return;

  const key = charId.toString();
  if (!progressCache[domain]) progressCache[domain] = {};
  
  updatedItem.updatedAt = Date.now();
  progressCache[domain][key] = updatedItem;
  progressMeta[domain] = Date.now();

  // 100% 로컬 0ms 실시간 저장 (네트워크 Write 쿼리 발생 안함)
  _saveLocalProgressCache();
};

/**
 * 세션 완료 시 세션 풀 단어들의 상태를 로컬 정산하고, 서버에 지연 배치 1회 전송 (Lazy Batch Sync)
 */
export const saveSessionPoolState = async (domain, sessionPool) => {
  if (!currentUserUid || !sessionPool || sessionPool.length === 0) return;

  const now = Date.now();
  if (!progressCache[domain]) progressCache[domain] = {};
  progressMeta[domain] = now;

  // 1. 로컬 메모리 & localStorage 0ms 실시간 반영
  sessionPool.forEach(item => {
    const key = item.charId.toString();
    item.updatedAt = now;
    progressCache[domain][key] = item;
  });
  _saveLocalProgressCache();

  // 2. 비동기 지연 배치 Write 1회로 서버에 전송 (Lazy Batch Sync)
  try {
    const batch = writeBatch(db);

    sessionPool.forEach(item => {
      const key = item.charId.toString();
      const docRef = doc(db, 'users', currentUserUid, 'progress', domain, 'chars', key);
      batch.set(docRef, item);
    });

    // 메타 타임스탬프 업로드 (users/{uid} 루트 문서 연동)
    const userDocRef = doc(db, 'users', currentUserUid);
    batch.set(userDocRef, { progressMeta: { [domain]: now } }, { merge: true });

    await batch.commit();
    console.log(`[LocalFirst] 세션 배치 동기화 1회 완료 (${sessionPool.length}개 단어 DB 저장)`);
  } catch (err) {
    console.warn("[LocalFirst] 비동기 세션 배치 DB 저장 실패 (로컬 스토리지 보존):", err.message);
  }
};

/**
 * 세션 타임오버 시 일일 학습 시간 누계 업데이트 기록 (로컬 퍼스트)
 */
export const updateDailyStudyTime = async (seconds, domain) => {
  if (!currentUserUid || !domain) return;

  const today = new Date().toISOString().split('T')[0];
  const storageKey = `KANALOOP_STUDY_STATS_${currentUserUid}`;

  // 1. 로컬 localStorage 0ms 실시간 누계 기록
  try {
    const rawStats = localStorage.getItem(storageKey);
    const statsObj = rawStats ? JSON.parse(rawStats) : {};
    if (!statsObj[today]) statsObj[today] = {};
    statsObj[today][domain] = (statsObj[today][domain] || 0) + seconds;
    localStorage.setItem(storageKey, JSON.stringify(statsObj));
  } catch (e) {
    console.warn("[LocalFirst] 일일 학습시간 로컬 저장 실패:", e);
  }

  // 2. 비동기 백그라운드 서버 저장
  try {
    const docRef = doc(db, 'users', currentUserUid, 'study_stats', today);
    const updates = {};
    updates[domain] = increment(seconds);
    updates.lastUpdated = Date.now();
    await setDoc(docRef, updates, { merge: true });
  } catch (err) {
    console.warn("[LocalFirst] 일일 학습시간 DB 백그라운드 저장 생략 (로컬 스토리지 보존):", err.message);
  }
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
 * 사용자 커스텀 기획 환경설정 제어 아카이브 저장 (로컬 퍼스트 & 지능형 백그라운드 싱크)
 */
export const saveUserConfig = async (config) => {
  if (!currentUserUid) return;

  // 1. 로컬 0ms 즉시 보존
  try {
    localStorage.setItem(`KANALOOP_CONFIG_${currentUserUid}`, JSON.stringify(config));
  } catch (e) {
    console.warn("[LocalFirst] Config 로컬 저장 실패:", e);
  }

  // 2. 백그라운드 지연 DB 저장
  try {
    const docRef = doc(db, 'users', currentUserUid);
    await setDoc(docRef, { config, configUpdatedAt: Date.now() }, { merge: true });
  } catch (e) {
    console.warn("[LocalFirst] Config DB 백그라운드 저장 실패 (로컬 스토리지 보존):", e.message);
  }
};

export const getUserConfig = async () => {
  if (!currentUserUid) return null;

  // 1. 로컬 localStorage 0ms 즉시 수급 시도
  try {
    const cachedConfig = localStorage.getItem(`KANALOOP_CONFIG_${currentUserUid}`);
    if (cachedConfig) {
      return JSON.parse(cachedConfig);
    }
  } catch (e) {
    console.warn("[LocalFirst] Config 로컬 복원 실패:", e);
  }

  // 2. 로컬에 없는 경우 서버 getDoc 수급
  try {
    const docRef = doc(db, 'users', currentUserUid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists() && docSnap.data().config) {
      const config = docSnap.data().config;
      localStorage.setItem(`KANALOOP_CONFIG_${currentUserUid}`, JSON.stringify(config));
      return config;
    }
  } catch (e) {
    console.warn("[LocalFirst] Config 서버 수급 실패:", e.message);
  }

  return null;
};

/**
 * 최근 7일간의 학습 통계 가져오기 (100% 로컬 퍼스트 - 서버 Read 0건)
 */
export const getWeeklyStats = async (domain) => {
  if (!currentUserUid || !domain) return { total: 0, history: {} };

  const stats = { total: 0, history: {} };
  const days = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().split('T')[0];
    days.push(dayStr);
  }

  // 로컬 localStorage 스토리지에서 0ms 정산 (서버 getDoc 7회 쿼리 완전 제거)
  try {
    const storageKey = `KANALOOP_STUDY_STATS_${currentUserUid}`;
    const rawStats = localStorage.getItem(storageKey);
    const statsObj = rawStats ? JSON.parse(rawStats) : {};

    days.forEach(dayStr => {
      const seconds = (statsObj[dayStr] && statsObj[dayStr][domain]) || 0;
      stats.history[dayStr] = seconds;
      stats.total += seconds;
    });
  } catch (e) {
    console.warn("[LocalFirst] 주간 학습통계 로컬 계산 실패:", e);
  }

  return stats;
};

/**
 * 학습 모드 랭킹 기록 등록 (예외 방어)
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
    console.warn("[LocalFirst] 학습모드 랭킹 DB 저장 생략 (로컬 구동 유지):", error.message);
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