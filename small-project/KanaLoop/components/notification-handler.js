/**
 * components/notification-handler.js
 * PWA 백그라운드 푸시 알림 권한 획득 및 발송 예약 모듈
 */

import { messaging } from './firebase-config.js';

let fcmToken = null;

/**
 * 브라우저 푸시 알림 권한 요청 및 FCM 토큰 수급
 */
export async function requestNotificationPermission() {
  try {
    if (!('Notification' in window)) {
      console.log('이 브라우저는 알림을 지원하지 않습니다.');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log(' 사용자가 알림 권한을 거부했습니다.');
      return null;
    }

    // 서비스 워커 등록 확인 후 FCM 토큰 추출 (VAPID 웹푸시 공개키 필요)
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      fcmToken = await messaging.getToken({
        serviceWorkerRegistration: registration,
        vapidKey: 'YOUR_PUBLIC_VAPID_KEY_HERE' // 파이어베이스 콘솔에서 발급받은 키 입력
      });
      console.log('FCM Token 갱신 완료:', fcmToken);
      return fcmToken;
    }
  } catch (error) {
    console.error('푸시 알림 토큰 획득 실패:', error);
  }
  return null;
}

/**
 * [공학적 큐 적용] 특정 분(minute) 뒤에 유저 스마트폰/PC로 복습 알림 예약 발송 요청
 * @param {string} domain - 'hira', 'kata' 등 현재 복습 카테고리
 * @param {number} delayMinutes - 몇 분 뒤에 알림을 보낼지 (예: 10, 30, 120)
 */
export async function scheduleReviewNotification(domain, delayMinutes) {
  if (!fcmToken) {
    // 토큰이 없다면 재확보 시도
    await requestNotificationPermission();
    if (!fcmToken) return;
  }

  const categoryName = domain === 'hira' ? '히라가나' : domain === 'kata' ? '가타카나' : '가나';
  const targetTime = new Date(Date.now() + delayMinutes * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  try {
    /**
     * 클라이언트 과부하를 막기 위해 파이어베이스 Cloud Functions 혹은 
     * 백엔드 서버 예약 발송 API 엔드포인트에 큐(Queue) 등록 요청을 전송합니다.
     */
    await fetch('https://your-cloud-functions-url/scheduleNotification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: fcmToken,
        title: '🧠 뇌과학 복습 타이머 가동!',
        body: `지금이 '${categoryName}'을 망각하기 직전 최고의 타이밍입니다. 들어와서 고정하세요.`,
        delayMinutes: delayMinutes
      })
    });
    console.log(`[알림 예약] ${delayMinutes}분 뒤 복습 푸시 큐 등록 완료 (예정 시각: ${targetTime})`);
  } catch (error) {
    console.error('푸시 알림 예약 서버 통신 실패:', error);
  }
}