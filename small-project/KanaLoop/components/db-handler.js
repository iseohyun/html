import { db } from './firebase-config.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  increment,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// 내부 상주 변수 및 도메인별 다차원 메모리 캐시 구조화
let currentUserUid = null;
let progressCache = {
  hira: {},
  kata: {},
  hangle: {},
  alphabet: {}
};

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
  progressCache = { hira: {}, kata: {}, hangle: {}, alphabet: {} };
  const domains = ['hira', 'kata', 'hangle', 'alphabet'];

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
    domain,
    charId: parseInt(charId),
    stage: 0,
    recentLatencies: [],
    latenciesIdx: 0,
    outCnt: 0,
    resetOutCnt: 0,
    totalSolved: 0,
    lastSessionTime: 0,
    sessionStreak: 0
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

  // 최신 v10 setDoc 구조 모델 적용
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
export const updateDailyStudyTime = async (seconds) => {
  if (!currentUserUid) return;

  const today = new Date().toISOString().split('T')[0];
  const docRef = doc(db, 'users', currentUserUid, 'study_stats', today);

  // firebase.firestore 글로벌 네임스페이스 제거 후 최신 독립형 increment 수급 적용
  await setDoc(docRef, {
    totalSeconds: increment(seconds),
    lastUpdated: Date.now()
  }, { merge: true });
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
 * 글로벌 랭킹 리스트 탑다운 조회
 */
export const getGlobalRankings = async (limitCount = 10) => {
  // 최신 v10 복합 쿼리 체계(query, orderBy, limit) 적용
  const rankingsRef = collection(db, 'global_rankings');
  const q = query(rankingsRef, orderBy('score', 'desc'), limit(limitCount));

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
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

  // 최신 v10 단일 문서 조회를 위한 getDoc 함수 처리
  const docRef = doc(db, 'users', currentUserUid);
  const docSnap = await getDoc(docRef);

  return docSnap.exists() ? docSnap.data().config : null;
};