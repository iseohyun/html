/**
 * @file modules/core/site-config.js
 * @module SiteModules.Config
 * @description 사이트 전역 설정의 단일 출처. 문의 메일(Web3Forms) 주소와 접근 키, 레이아웃 기준 너비를 보관한다.
 *   여기의 값은 모두 브라우저에 공개되는 값이며 비밀이 아니다.
 * @exports feedback, layout
 */

window.SiteModules = window.SiteModules || {};

window.SiteModules.Config = window.SiteModules.Config || Object.freeze({
  // 의견 보내기(Web3Forms). 접근 키는 받는 주소에 묶인 공개용 키라 화면 코드에 둘 수 있다.
  feedback: Object.freeze({
    web3formsEndpoint: "https://api.web3forms.com/submit",
    web3formsAccessKey: "8ffc27ff-bbd8-4d15-949b-e0a99e11cded"
  }),

  layout: Object.freeze({
    // 사이드바가 드로어(삼선 메뉴)로 전환되는 너비. style.css의 @media (max-width: 960px)와 동일해야 한다.
    mobileBreakpoint: 960,
    // 목차 항목 클릭 시 사이드바를 자동으로 닫는 너비
    tocAutoCloseBreakpoint: 768
  })
});
