/**
 * Frontend config. AUTH_SERVICE_URL is injected at Docker build via config.injected.js or defaults for local dev.
 */
(function () {
  var fallback = 'http://auth-microservice:3370';
  try {
    var host = window.location.hostname || '';
    var m = host.match(/^[^.]+\.(.+)$/);
    if (m) fallback = window.location.protocol + '//auth.' + m[1];
  } catch (e) {}
  window.LOGGING_WEB_CONFIG = {
    authServiceUrl: typeof window.__AUTH_SERVICE_URL__ !== 'undefined' ? window.__AUTH_SERVICE_URL__ : fallback
  };
})();
