// update.js (root bootstrapper)
// 하위 호환성을 유지하며 비동기로 모듈을 로드하고, 호출된 명령들을 대기열(Queue)에 보관했다가 실행시킵니다.

window.getUpdateList = function(...args) {
  window.SiteModules = window.SiteModules || {};
  if (window.SiteModules.UpdateLog && window.SiteModules.UpdateLog.getUpdateList) {
    window.SiteModules.UpdateLog.getUpdateList(...args);
  } else {
    window.SiteModules.updateLogQueue = window.SiteModules.updateLogQueue || [];
    window.SiteModules.updateLogQueue.push(args);
  }
};

window.clearUpdateList = function(...args) {
  window.SiteModules = window.SiteModules || {};
  if (window.SiteModules.UpdateLog && window.SiteModules.UpdateLog.clearUpdateList) {
    window.SiteModules.UpdateLog.clearUpdateList(...args);
  } else {
    window.SiteModules.clearUpdateQueue = window.SiteModules.clearUpdateQueue || [];
    window.SiteModules.clearUpdateQueue.push(args);
  }
};

window.toggle = function(...args) {
  window.SiteModules = window.SiteModules || {};
  if (window.SiteModules.UpdateLog && window.SiteModules.UpdateLog.toggle) {
    window.SiteModules.UpdateLog.toggle(...args);
  } else {
    window.SiteModules.toggleQueue = window.SiteModules.toggleQueue || [];
    window.SiteModules.toggleQueue.push(args);
  }
};

(function() {
  const script = document.createElement('script');
  script.src = '/modules/features/update-log.js';
  script.async = false;
  document.head.appendChild(script);
})();