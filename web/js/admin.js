/**
 * Admin panel: stats from logs, services list, log history with filters.
 * Uses same-origin /api/logs for query and services. Auth via LoggingAuth.
 */
(function () {
  var currentLogs = [];

  function api(path, options) {
    options = options || {};
    var token = window.LoggingAuth.getAccessToken();
    var headers = Object.assign({}, options.headers || {});
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return fetch(path, Object.assign({}, options, { headers: headers })).then(function (res) {
      if (res.status === 401) {
        window.LoggingAuth.clearTokens();
        window.location.reload();
        return Promise.reject(new Error('Unauthorized'));
      }
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

  function renderStats(logs) {
    var total = logs.length;
    var byLevel = { error: 0, warn: 0, info: 0, debug: 0 };
    logs.forEach(function (l) {
      if (byLevel.hasOwnProperty(l.level)) byLevel[l.level]++;
    });
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-error').textContent = byLevel.error;
    document.getElementById('stat-warn').textContent = byLevel.warn;
    document.getElementById('stat-info').textContent = byLevel.info;
    document.getElementById('stat-debug').textContent = byLevel.debug;
  }

  function loadServices() {
    var listEl = document.getElementById('services-list');
    listEl.innerHTML = '<p class="loading">Loading services…</p>';
    api('/api/logs/services').then(function (r) { return r.json(); }).then(function (data) {
      if (!data.success || !Array.isArray(data.data)) {
        listEl.innerHTML = '<p class="loading">No services</p>';
        return;
      }
      var services = data.data;
      listEl.innerHTML = '';
      services.forEach(function (s) {
        var tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = s;
        listEl.appendChild(tag);
      });
      var sel = document.getElementById('filter-service');
      var opts = sel.querySelectorAll('option');
      for (var i = opts.length - 1; i >= 1; i--) opts[i].remove();
      services.forEach(function (s) {
        var opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        sel.appendChild(opt);
      });
    }).catch(function () {
      listEl.innerHTML = '<p class="loading">Failed to load services</p>';
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
    api(path).then(function (r) { return r.json(); }).then(function (data) {
      if (!data.success || !Array.isArray(data.data)) {
        currentLogs = [];
        renderStats([]);
        document.getElementById('logs-tbody').innerHTML = '<tr><td colspan="5">No logs</td></tr>';
        return;
      }
      currentLogs = data.data;
      renderStats(currentLogs);
      var tbody = document.getElementById('logs-tbody');
      tbody.innerHTML = '';
      currentLogs.forEach(function (log) {
        var tr = document.createElement('tr');
        var time = log.timestamp ? new Date(log.timestamp).toLocaleString() : '—';
        var meta = log.metadata && Object.keys(log.metadata).length ? JSON.stringify(log.metadata) : '—';
        tr.innerHTML =
          '<td>' + escapeHtml(time) + '</td>' +
          '<td class="level-' + escapeHtml(log.level || '') + '">' + escapeHtml(log.level || '') + '</td>' +
          '<td>' + escapeHtml(log.service || '') + '</td>' +
          '<td>' + escapeHtml(log.message || '') + '</td>' +
          '<td class="metadata-cell" title="' + escapeAttr(meta) + '">' + escapeHtml(meta.length > 80 ? meta.slice(0, 80) + '…' : meta) + '</td>';
        tbody.appendChild(tr);
      });
    }).catch(function (e) {
      document.getElementById('logs-error').textContent = e.message || 'Failed to load logs';
      document.getElementById('logs-error').hidden = false;
      renderStats([]);
    });
  }

  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function escapeAttr(s) {
    return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function initLogin() {
    document.getElementById('login-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = document.getElementById('email').value.trim();
      var password = document.getElementById('password').value;
      var errEl = document.getElementById('login-error');
      errEl.hidden = true;
      window.LoggingAuth.login(email, password).then(function (result) {
        document.getElementById('user-email').textContent = result.user && (result.user.email || result.user.name) || email;
        showPanel();
        loadServices();
        loadLogs({ limit: 100 });
      }).catch(function (err) {
        errEl.textContent = err.message || 'Login failed';
        errEl.hidden = false;
      });
    });
  }

  function initFilters() {
    document.getElementById('filters-form').addEventListener('submit', function (e) {
      e.preventDefault();
      loadLogs({
        service: document.getElementById('filter-service').value || undefined,
        level: document.getElementById('filter-level').value || undefined,
        startDate: document.getElementById('filter-start').value || undefined,
        endDate: document.getElementById('filter-end').value || undefined,
        limit: document.getElementById('filter-limit').value || 100
      });
    });
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
      if (user) {
        document.getElementById('user-email').textContent = user.email || user.name || 'User';
        showPanel();
        loadServices();
        loadLogs({ limit: 100 });
      } else {
        showLogin();
      }
    }).catch(function () { showLogin(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
