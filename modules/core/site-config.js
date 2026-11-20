/**
 * @file modules/core/site-config.js
 * @module SiteModules.Config
 * @description 사이트 전역 설정의 단일 출처. 문의 메일(Web3Forms) 주소와 접근 키, 로그인(Firebase) 설정,
 *   관리자 판정 값, 레이아웃 기준 너비를 보관한다. 여기의 값은 모두 브라우저에 공개되는 값이며 비밀이 아니다.
 * @exports feedback, firebase, push, firebaseSdkVersion, kakao, naver, admin, layout
 */

window.SiteModules = window.SiteModules || {};

window.SiteModules.Config = window.SiteModules.Config || Object.freeze({
  // 의견 보내기(Web3Forms). 접근 키는 받는 주소에 묶인 공개용 키라 화면 코드에 둘 수 있다.
  feedback: Object.freeze({
    web3formsEndpoint: "https://api.web3forms.com/submit",
    web3formsAccessKey: "8ffc27ff-bbd8-4d15-949b-e0a99e11cded"
  }),

  // 로그인(구글)에 쓰는 Firebase 프로젝트. 웹용 설정값이라 공개되어도 된다.
  firebase: Object.freeze({
    apiKey: "AIzaSyBu8rZQ_E_LKiGXu9jeIWn5FCPU7cWu734",
    authDomain: "iseohyun.firebaseapp.com",
    projectId: "iseohyun",
    messagingSenderId: "480884385518",
    appId: "1:480884385518:web:e624e46512c8c3834675ff"
  }),
  // 관리자 기기에 새 문의를 푸시로 알릴 때 쓰는 웹 푸시 공개 키(VAPID). 공개 키라 화면 코드에 둔다.
  push: Object.freeze({
    vapidKey: "BNlporOtHfs_Yv9hk3zEPcstxqjIBLFXJU9XnIMLUukvzZU-6VutRb_zGD55soGm5EtBKNiQQMVdZ560kpEneSM"
  }),
  // gstatic compat SDK 버전 (modules/core/auth.js 가 로그인할 때만 불러온다)
  firebaseSdkVersion: "10.0.0",

  // 카카오 · 네이버 로그인(modules/core/auth.js 의 loginWithOAuth).
  // clientId 는 로그인 화면 주소에 드러나는 공개 값이다(Client Secret 은 Cloud Function 비밀값에만 둔다).
  // 로그인 창은 이 사이트의 callbackPath 로 돌아오고, 그 코드를 loginEndpoint 가 Firebase 토큰으로 바꾼다.
  // clientId 가 비어 있으면 그 로그인은 「준비 중」으로 보인다.
  kakao: Object.freeze({
    name: "카카오",
    clientId: "e10f5dba1343212a115708b84584dad0", // REST API 키
    authorizeUrl: "https://kauth.kakao.com/oauth/authorize",
    callbackPath: "/auth/kakao-callback.html",
    // 카카오 콘솔과 functions/index.js 에 Redirect URI 로 등록한 곳만
    allowedOrigins: Object.freeze(["https://iseohyun.com", "http://localhost:8137"]),
    loginEndpoint: "https://asia-northeast3-iseohyun.cloudfunctions.net/kakaoLogin"
  }),
  naver: Object.freeze({
    name: "네이버",
    clientId: "f1zKks6XzuAlapalQCEi", // functions/index.js 의 NAVER_CLIENT_ID 와 같아야 한다
    authorizeUrl: "https://nid.naver.com/oauth2.0/authorize",
    callbackPath: "/auth/naver-callback.html",
    // 네이버 앱 설정과 functions/index.js 에 Callback URL 로 등록한 곳만
    allowedOrigins: Object.freeze(["https://iseohyun.com", "http://localhost:8137"]),
    loginEndpoint: "https://asia-northeast3-iseohyun.cloudfunctions.net/naverLogin"
  }),

  // 관리자: 메일 주소를 그대로 적지 않고 소문자 주소의 SHA-256 값으로 적는다.
  admin: Object.freeze({
    emailHashes: Object.freeze(["f15e2c6f064fa98d71a827aa527ab58d092bcabe4dd9839d0b269cfe7f24d7fd"])
  }),

  layout: Object.freeze({
    // 사이드바가 드로어(삼선 메뉴)로 전환되는 너비. style.css의 @media (max-width: 960px)와 동일해야 한다.
    mobileBreakpoint: 960,
    // 목차 항목 클릭 시 사이드바를 자동으로 닫는 너비
    tocAutoCloseBreakpoint: 768
  })
});
