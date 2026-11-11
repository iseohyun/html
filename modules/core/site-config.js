/**
 * @file modules/core/site-config.js
 * @module SiteModules.Config
 * @description 사이트 전역 설정의 단일 출처. Firebase 프로젝트 설정, SDK 버전, OAuth(네이버/카카오) 식별자와
 *   토큰 교환 엔드포인트, 레이아웃 기준 너비를 보관한다. 여기의 값은 모두 브라우저에 공개되는 값이며 비밀이 아니다.
 * @exports firebase, firebaseSdkVersion, oauth, layout
 */

window.SiteModules = window.SiteModules || {};

// admin.html처럼 단독으로도 로드될 수 있으므로 중복 로드 시 기존 객체를 유지한다
window.SiteModules.Config = window.SiteModules.Config || Object.freeze({
  firebase: Object.freeze({
    apiKey: "AIzaSyBu8rZQ_E_LKiGXu9jeIWn5FCPU7cWu734",
    authDomain: "iseohyun.firebaseapp.com",
    projectId: "iseohyun",
    storageBucket: "iseohyun.firebasestorage.app",
    messagingSenderId: "480884385518",
    appId: "1:480884385518:web:e624e46512c8c3834675ff",
    measurementId: "G-FP4D4V74P5"
  }),

  // gstatic compat SDK 버전. admin.html의 <script> 태그 버전과 함께 올려야 한다.
  firebaseSdkVersion: "10.0.0",

  oauth: Object.freeze({
    naver: Object.freeze({
      clientId: "hemXaBshyStfBhmNg05m",
      tokenExchangeUrl: "https://naverlogin-kw55rtsoba-uc.a.run.app"
    }),
    kakao: Object.freeze({
      clientId: "af28f94aa8260ab663fd27dffea1ee77",
      tokenExchangeUrl: "https://kakaologin-kw55rtsoba-uc.a.run.app"
    })
  }),

  layout: Object.freeze({
    // 사이드바가 드로어(삼선 메뉴)로 전환되는 너비. style.css의 @media (max-width: 960px)와 동일해야 한다.
    mobileBreakpoint: 960,
    // 목차 항목 클릭 시 사이드바를 자동으로 닫는 너비
    tocAutoCloseBreakpoint: 768
  })
});
