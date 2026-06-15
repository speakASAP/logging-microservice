(function () {
  var currentLogs = [];
  var currentServices = [];

  function api(path, options) {
    options = options || {};
    var token = window.LoggingAuth.getAccessToken();
    var headers = Object.assign({}, options.headers || {});
    if (token) headers.Authorization = 'Bearer ' + token;
    return fetch(path, Object.assign({}, options, { headers: headers })).then(function (res) {
      if (res.status === 401) {
        window.LoggingAuth.clearTokens();
        window.location.reload();
        return Promise.reject(new Error('Unauthorized'));
      }
      if (res.status === 403) return Promise.reject(new Error('Logging admin role required'));
      return res;
    });
  }

  function showPanel() {
    document.getElementById('login-screen').hidden = true;
    document.getElementById('admin-panel').hidden = false;
  }
  function showLogin(err) {
    document.getElementById('admin-panel').hidden = true;
    document.getElementById('login-screen').hidden = false;
    var el = document.getElementById('login-error');
    el.hidden = !err;
    if (err) el.textContent = err;
  }
  function requireAdmin(user) {
    if (window.LoggingAuth.hasAdminRole(user)) return true;
    window.LoggingAuth.clearTokens();
    showLogin('Logging admin role required');
    return false;
  }
  function escapeHtml(value) {
    var div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }
  function escapeAttr(value) {
    return String(value == null ? '' : value).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function levelBadge(level) {
    var safe = escapeHtml(level || 'debug');
    return '<span class="status ' + safe + '">' + safe.toUpperCase() + '</span>';
  }
  function renderStats(logs) {
    var byLevel = { error: 0, warn: 0, info: 0, debug: 0 };
    logs.forEach(function (log) {
      if (byLevel.hasOwnProperty(log.level)) byLevel[log.level]++;
    });
    document.getElementById('stat-total').textContent = logs.length;
    document.getElementById('stat-error').textContent = byLevel.error;
    document.getElementById('stat-warn').textContent = byLevel.warn;
    document.getElementById('stat-services').textContent = currentServices.length;
  }
  function loadServices() {
    var listEl = document.getElementById('services-list');
    listEl.innerHTML = '<p class="loading">Loading services...</p>';
    return api('/api/logs/services').then(function (r) { return r.json(); }).then(function (data) {
      currentServices = data.success && Array.isArray(data.data) ? data.data : [];
      listEl.innerHTML = currentServices.length ? '' : '<p class="loading">No services found</p>';
      currentServices.forEach(function (service) {
        var tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = service;
        listEl.appendChild(tag);
      });
      var sel = document.getElementById('filter-service');
      while (sel.options.length > 1) sel.remove(1);
      currentServices.forEach(function (service) {
        var opt = document.createElement('option');
        opt.value = service;
        opt.textContent = service;
        sel.appendChild(opt);
      });
      renderStats(currentLogs);
    }).catch(function (error) {
      listEl.innerHTML = '<p class="error-msg">' + escapeHtml(error.message || 'Failed to load services') + '</p>';
    });
  }
  function loadLogs(filters) {
    filters = filters || {};
    var q = [];
    if (filters.service) q.push('service=' + encodeURIComponent(filters.service));
    if (filters.level) q.push('level=' + encodeURIComponent(filters.level));
    if (filters.startDate) q.push('startDate=' + encodeURIComponent(filters.startDate));
    if (filters.endDate) q.push('endDate=' + encodeURIComponent(filters.endDate));
    if (filters.limit) q.push('limit=' + encodeURIComponent(filters.limit));
    var path = '/api/logs/query' + (q.length ? '?' + q.join('&') : '');
    document.getElementById('logs-error').hidden = true;
    return api(path).then(function (r) { return r.json(); }).then(function (data) {
      currentLogs = data.success && Array.isArray(data.data) ? data.data : [];
      renderStats(currentLogs);
      renderLogs(currentLogs);
      renderAnalysis(currentLogs);
    }).catch(function (error) {
      document.getElementById('logs-error').textContent = error.message || 'Failed to load logs';
      document.getElementById('logs-error').hidden = false;
      currentLogs = [];
      renderStats([]);
      renderLogs([]);
      renderAnalysis([]);
    });
  }
  function renderLogs(logs) {
    var tbody = document.getElementById('logs-tbody');
    if (!logs.length) {
      tbody.innerHTML = '<tr><td colspan="5">No logs match the selected filters.</td></tr>';
      return;
    }
    tbody.innerHTML = logs.map(function (log) {
      var time = log.timestamp ? new Date(log.timestamp).toLocaleString() : '-';
      var message = log.message || log.msg || '';
      var meta = log.metadata && Object.keys(log.metadata).length ? JSON.stringify(log.metadata) : '-';
      return '<tr><td>' + escapeHtml(time) + '</td><td>' + levelBadge(log.level) + '</td><td>' + escapeHtml(log.service) + '</td><td>' + escapeHtml(message) + '</td><td title="' + escapeAttr(meta) + '">' + escapeHtml(meta.length > 90 ? meta.slice(0, 90) + '...' : meta) + '</td></tr>';
    }).join('');
  }
  function renderAnalysis(logs) {
    var box = document.getElementById('ai-analysis');
    if (!logs.length) {
      box.innerHTML = '<p class="loading">Run a query to analyze log patterns.</p>';
      return;
    }
    var groups = {};
    logs.forEach(function (log) {
      var key = (log.level || 'debug') + ':' + (log.service || 'unknown');
      groups[key] = (groups[key] || 0) + 1;
    });
    var rows = Object.keys(groups).sort(function (a, b) { return groups[b] - groups[a]; }).slice(0, 5);
    box.innerHTML = '<ul class="contract-list">' + rows.map(function (key) {
      var parts = key.split(':');
      return '<li><span>' + escapeHtml(parts[1]) + ' ' + escapeHtml(parts[0]) + ' pattern</span><b>' + groups[key] + ' events</b></li>';
    }).join('') + '</ul><p class="loading">AI microservice endpoint for logging pattern analysis is pending; this is a deterministic local summary of the current query.</p>';
  }
  function initLogin() {
    document.getElementById('login-form').addEventListener('submit', function (event) {
      event.preventDefault();
      var email = document.getElementById('email').value.trim();
      var password = document.getElementById('password').value;
      var errEl = document.getElementById('login-error');
      errEl.hidden = true;
      window.LoggingAuth.login(email, password).then(function (result) {
        if (!requireAdmin(result.user)) return;
        document.getElementById('user-email').textContent = result.user && (result.user.email || result.user.name) || email;
        showPanel();
        loadServices();
        loadLogs({ limit: 100 });
      }).catch(function (error) {
        errEl.textContent = error.message || 'Login failed';
        errEl.hidden = false;
      });
    });
  }
  function initFilters() {
    document.getElementById('filters-form').addEventListener('submit', function (event) {
      event.preventDefault();
      loadLogs({
        service: document.getElementById('filter-service').value || undefined,
        level: document.getElementById('filter-level').value || undefined,
        startDate: document.getElementById('filter-start').value || undefined,
        endDate: document.getElementById('filter-end').value || undefined,
        limit: document.getElementById('filter-limit').value || 100
      });
    });
    document.getElementById('analyze-btn').addEventListener('click', function () { renderAnalysis(currentLogs); });
  }
  function initLogout() {
    document.getElementById('logout-btn').addEventListener('click', function () {
      window.LoggingAuth.logout();
      showLogin();
    });
  }
  function init() {
    initLogin();
    initLogout();
    initFilters();
    window.LoggingAuth.validate().then(function (user) {
      if (user && requireAdmin(user)) {
        document.getElementById('user-email').textContent = user.email || user.name || 'User';
        showPanel();
        loadServices();
        loadLogs({ limit: 100 });
      } else if (!user) showLogin();
    }).catch(function () { showLogin(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
