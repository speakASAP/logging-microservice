(function () {
  var snippets = {
    node: "const url = 'https://logging.alfares.cz/api/logs';\n\nawait fetch(url, {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({\n    level: 'error',\n    service: 'orders-microservice',\n    message: 'Order failed to process',\n    timestamp: new Date().toISOString(),\n    metadata: { duration_ms: 842 }\n  })\n});",
    python: "import requests\nfrom datetime import datetime, timezone\n\nrequests.post('https://logging.alfares.cz/api/logs', json={\n    'level': 'error',\n    'service': 'orders-microservice',\n    'message': 'Order failed to process',\n    'timestamp': datetime.now(timezone.utc).isoformat(),\n    'metadata': {'duration_ms': 842},\n}, timeout=2)",
    curl: "curl -sf -X POST https://logging.alfares.cz/api/logs \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"level\":\"error\",\"service\":\"orders-microservice\",\"message\":\"Order failed\",\"metadata\":{\"duration_ms\":842}}'"
  };
  var sample = [
    { time: '10:15:32', level: 'error', service: 'orders-microservice', message: 'Order failed to process' },
    { time: '10:15:31', level: 'warn', service: 'payments-microservice', message: 'Payment retry attempt' },
    { time: '10:15:30', level: 'info', service: 'auth-microservice', message: 'User login successful' },
    { time: '10:15:28', level: 'info', service: 'catalog-microservice', message: 'Stock updated' },
    { time: '10:15:27', level: 'warn', service: 'gateway', message: 'Slow upstream response' }
  ];

  function status(level) {
    return '<span class="status ' + level + '">' + level.toUpperCase() + '</span>';
  }
  function renderSnippet(name) {
    document.getElementById('snippet').textContent = snippets[name] || snippets.node;
  }
  function renderLogs() {
    document.getElementById('recent-body').innerHTML = sample.map(function (row) {
      return '<tr><td>' + row.time + '</td><td>' + status(row.level) + '</td><td>' + row.service + '</td><td>' + row.message + '</td></tr>';
    }).join('');
  }
  function renderAnalysis() {
    document.getElementById('analysis-list').innerHTML = [
      '<div class="contract-list"><li><span>Repeated payment retries</span><b>Likely integration issue</b></li>',
      '<li><span>Auth token failures</span><b>Check issuer and expiry</b></li>',
      '<li><span>Slow gateway responses</span><b>Watch upstream services</b></li></div>'
    ].join('');
  }
  function init() {
    renderSnippet('node');
    renderLogs();
    renderAnalysis();
    document.querySelectorAll('.tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.tab').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        renderSnippet(btn.getAttribute('data-tab'));
      });
    });
    document.getElementById('refresh-btn').addEventListener('click', renderLogs);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
