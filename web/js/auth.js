/**
 * Auth helpers: login via auth-microservice, token storage, validate, logout.
 */
(function () {
  const STORAGE_KEYS = { access: 'logging_admin_access', refresh: 'logging_admin_refresh' };

  function getConfig() {
    return window.LOGGING_WEB_CONFIG || {};
  }

  function getAuthUrl() {
    const base = (getConfig().authServiceUrl || '').replace(/\/$/, '');
    return base || (window.location.protocol + '//' + window.location.hostname.replace(/^([^.]+)/, 'auth.$1'));
  }

  window.LoggingAuth = {
    getAccessToken: function () {
      return sessionStorage.getItem(STORAGE_KEYS.access);
    },
    getRefreshToken: function () {
      return sessionStorage.getItem(STORAGE_KEYS.refresh);
    },
    setTokens: function (access, refresh) {
      if (access) sessionStorage.setItem(STORAGE_KEYS.access, access);
      if (refresh) sessionStorage.setItem(STORAGE_KEYS.refresh, refresh);
    },
    clearTokens: function () {
      sessionStorage.removeItem(STORAGE_KEYS.access);
      sessionStorage.removeItem(STORAGE_KEYS.refresh);
    },
    login: function (email, password) {
      var authUrl = getAuthUrl();
      return fetch(authUrl + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
      }).then(function (res) {
        if (!res.ok) return res.json().then(function (d) { throw new Error(d.message || 'Login failed'); });
        return res.json();
      }).then(function (data) {
        if (data.accessToken) {
          window.LoggingAuth.setTokens(data.accessToken, data.refreshToken);
          return { user: data.user };
        }
        throw new Error('No token in response');
      });
    },
    validate: function () {
      var token = window.LoggingAuth.getAccessToken();
      if (!token) return Promise.resolve(null);
      var authUrl = getAuthUrl();
      return fetch(authUrl + '/auth/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token })
      }).then(function (res) {
        if (!res.ok) return null;
        return res.json();
      }).then(function (data) {
        return (data && data.valid && data.user) ? data.user : null;
      }).catch(function () { return null; });
    },
    logout: function () {
      window.LoggingAuth.clearTokens();
    }
  };
})();
