const state = {
  route: "landing",
  dashboardTab: "api",
  session: "guest",
  search: "",
  service: "all",
  adminLevel: "all",
  adminStartDate: "",
  adminEndDate: "",
  adminLimit: "100",
  adminBackendUrl: "https://logging.alfares.cz",
  adminToken: "",
  adminDataMode: "demo",
  adminLoading: false,
  adminError: "",
  liveLogs: null,
  liveServices: null,
  liveCount: 0,
  liveLoadedAt: "",
};

const adminRoles = ["global:superadmin", "app:logging-microservice:admin", "internal:logging-microservice:admin"];
const dashboardPermission = "logging.dashboard.read";

const sessions = {
  guest: {
    label: "Guest",
    authenticated: false,
    tenantId: null,
    permissions: [],
    email: null,
  },
  customer: {
    label: "Customer user",
    authenticated: true,
    tenantId: "tenant_example_dev",
    permissions: ["logging.dashboard.read", "logging.logs.read", "logging.analysis.read"],
    email: "jane@example.invalid",
  },
  adminMissing: {
    label: "Authenticated, no admin right",
    authenticated: true,
    tenantId: "tenant_example_dev",
    permissions: ["logging.dashboard.read", "logging.logs.read"],
    email: "ops@example.invalid",
  },
  admin: {
    label: "Logging admin",
    authenticated: true,
    tenantId: "tenant_example_dev",
    permissions: ["logging.dashboard.read", "logging.logs.read", "logging.analysis.read", "app:logging-microservice:admin", "logging.notifications.manage"],
    email: "admin@example.invalid",
  },
};

const pricing = [
  { name: "Free", price: "$0", period: "/mo", cta: "Get started", features: ["5 GB logs", "7 day retention", "Basic search", "1 application"] },
  { name: "Pro", price: "$29", period: "/mo", cta: "Start Pro trial", features: ["100 GB logs", "30 day retention", "Advanced search", "Webhook integrations", "Email support"] },
  { name: "Team", price: "$99", period: "/mo", cta: "Start Team trial", featured: true, features: ["500 GB logs", "90 day retention", "Unlimited applications", "AI pattern analysis", "Webhook integrations", "Priority support"] },
  { name: "Enterprise", price: "Custom", period: "", cta: "Contact sales", features: ["Unlimited logs", "Custom retention", "SAML SSO", "Audit logs", "24/7 support", "Dedicated onboarding"] },
];

const logs = [
  { time: "10:15:32", level: "ERROR", app: "order-service", message: "Order failed to process", trace: "order_jd8n_2f8c", tenant: "acme" },
  { time: "10:15:31", level: "WARN", app: "payment-service", message: "Payment retry attempt", trace: "payment_jd9s", tenant: "acme" },
  { time: "10:15:30", level: "INFO", app: "user-service", message: "User login successful", trace: "user_jd-8f2c", tenant: "acme" },
  { time: "10:15:28", level: "INFO", app: "inventory-service", message: "Stock updated", trace: "sku-abc-123", tenant: "acme" },
  { time: "10:15:27", level: "WARN", app: "gateway", message: "Slow response", trace: "duration=1.2s", tenant: "acme" },
  { time: "10:15:26", level: "ERROR", app: "auth-service", message: "Invalid token", trace: "ip=203.0.113.45", tenant: "acme" },
  { time: "10:15:24", level: "INFO", app: "email-service", message: "Password changed", trace: "user_id=8f2c...", tenant: "acme" },
];

const services = [
  { name: "order-service", env: "Production", logs: "312,456", errorRate: "2.34%", status: "Healthy" },
  { name: "user-service", env: "Production", logs: "215,778", errorRate: "0.12%", status: "Healthy" },
  { name: "payment-service", env: "Production", logs: "185,231", errorRate: "1.96%", status: "Degraded" },
  { name: "inventory-service", env: "Production", logs: "98,221", errorRate: "0.45%", status: "Healthy" },
  { name: "email-service", env: "Staging", logs: "45,112", errorRate: "0.08%", status: "Healthy" },
];

const patterns = [
  { level: "ERROR", title: "Order processing failures", delta: "+132%", text: "Spike detected in order-service after payment retry messages. 34 correlated occurrences." },
  { level: "ERROR", title: "Invalid authentication tokens", delta: "+106%", text: "Auth-service token rejects increased after deploy marker. Check issuer validation and clock skew." },
  { level: "WARN", title: "Payment retries increasing", delta: "+74%", text: "Payment gateway retry loop appears every 60 seconds in three production regions." },
  { level: "WARN", title: "Slow upstream responses", delta: "+52%", text: "Gateway latency in inventory-service calls is above the baseline for the last 15 minutes." },
];

const app = document.querySelector("#app");

function currentSession() {
  return sessions[state.session];
}

function hasPermission(permission) {
  return currentSession().permissions.includes(permission);
}

function hasAnyPermission(permissions) {
  return permissions.some((permission) => hasPermission(permission));
}

function adminRequirementLabel() {
  return adminRoles.join(" or ");
}

function setRoute(route) {
  state.route = route;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function regenerateKey() {
  const seed = Math.random().toString(36).slice(2, 10);
  const key = document.querySelector("[data-api-key]");
  if (key) key.textContent = `lg_live_${seed}...[REDACTED_SECRET]`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatTimestamp(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 19);
  return date.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

function maskIdentifier(value) {
  if (!value) return "Unavailable";
  const text = String(value);
  if (text.includes("...")) return text;
  return `${text.slice(0, 6)}...`;
}

function normalizeLevel(level) {
  const normalized = String(level || "info").toLowerCase();
  if (normalized === "warning") return "WARN";
  if (["error", "warn", "info", "debug"].includes(normalized)) return normalized.toUpperCase();
  return "INFO";
}

function normalizeLogEntry(entry) {
  const trace = entry.correlation_id || entry.task_id || entry.project_id || entry.agent_id || entry.business_id || "";
  return {
    time: formatTimestamp(entry.timestamp),
    level: normalizeLevel(entry.level),
    app: entry.service || "unknown-service",
    message: entry.message || entry.msg || "(no message)",
    trace: maskIdentifier(trace),
    tenant: "backend",
  };
}

function normalizeService(name) {
  return {
    name,
    env: "Backend",
    logs: "Available",
    errorRate: "-",
    status: "Discovered",
  };
}

function clampLimit(value) {
  const numeric = Number.parseInt(value, 10);
  if (Number.isNaN(numeric)) return 100;
  return Math.min(Math.max(numeric, 1), 500);
}

function setAdminToken(value) {
  state.adminToken = value;
}

function setAdminBackendUrl(value) {
  state.adminBackendUrl = value.trim();
}

function setAdminFilter(key, value) {
  state[key] = value;
  render();
}

function adminBaseUrl() {
  return state.adminBackendUrl.replace(/\/+$/, "");
}

function adminQueryParams() {
  const params = new URLSearchParams();
  if (state.service !== "all") params.set("service", state.service);
  if (state.adminLevel !== "all") params.set("level", state.adminLevel.toLowerCase());
  if (state.adminStartDate) params.set("startDate", state.adminStartDate);
  if (state.adminEndDate) params.set("endDate", state.adminEndDate);
  params.set("limit", String(clampLimit(state.adminLimit)));
  return params;
}

async function fetchAdminJson(path) {
  const response = await fetch(`${adminBaseUrl()}${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${state.adminToken}`,
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || payload?.error?.message || payload?.error || `Request failed with HTTP ${response.status}`);
  }
  return payload;
}

async function loadLiveAdminData() {
  if (!state.adminToken.trim()) {
    state.adminDataMode = "live";
    state.adminError = "A bearer token is required for the discovered AdminRoleGuard endpoints.";
    render();
    return;
  }
  state.adminDataMode = "live";
  state.adminLoading = true;
  state.adminError = "";
  render();

  try {
    const [logsPayload, servicesPayload] = await Promise.all([
      fetchAdminJson(`/api/logs/query?${adminQueryParams().toString()}`),
      fetchAdminJson("/api/logs/services"),
    ]);
    const rows = Array.isArray(logsPayload.data) ? logsPayload.data : [];
    const serviceRows = Array.isArray(servicesPayload.data) ? servicesPayload.data : [];
    state.liveLogs = rows.map(normalizeLogEntry);
    state.liveServices = serviceRows.map(normalizeService);
    state.liveCount = Number.isFinite(logsPayload.count) ? logsPayload.count : rows.length;
    state.liveLoadedAt = new Date().toISOString();
  } catch (error) {
    state.adminError = error.message || "Live admin request failed.";
  } finally {
    state.adminLoading = false;
    render();
  }
}

function useDemoAdminData() {
  state.adminDataMode = "demo";
  state.adminError = "";
  state.liveLogs = null;
  state.liveServices = null;
  state.liveCount = 0;
  state.liveLoadedAt = "";
  render();
}

function nav() {
  return `
    <header class="topbar">
      <div class="brand"><span class="brand-mark" aria-hidden="true"></span><span>LogStream</span></div>
      <nav class="nav" aria-label="Primary">
        ${navButton("landing", "Landing")}
        ${navButton("dashboard", "Dashboard")}
        ${navButton("admin", "Admin")}
      </nav>
      <div class="session">
        <select aria-label="Simulated authenticated session" onchange="state.session=this.value; render()">
          ${Object.entries(sessions).map(([key, session]) => `<option value="${key}" ${state.session === key ? "selected" : ""}>${session.label}</option>`).join("")}
        </select>
        <button onclick="setRoute('dashboard')">Register</button>
      </div>
    </header>
  `;
}

function navButton(route, label) {
  return `<button class="${state.route === route ? "active" : ""}" onclick="setRoute('${route}')">${label}</button>`;
}

function landing() {
  return `
    <main>
      <section class="hero">
        <div class="hero-copy">
          <h1>Centralized logging built for developers</h1>
          <p>Collect, search, and analyze logs from every service. Real-time insights, AI-powered pattern analysis, and customer-ready ingestion keys in one logging microservice.</p>
          <div class="hero-actions">
            <button class="btn primary" onclick="setRoute('dashboard')">Try demo</button>
            <a class="btn" href="#pricing">Buy plan</a>
          </div>
        </div>
        <div class="hero-panel" aria-label="Live log stream preview">
          <div class="log-stream">
            ${logs.concat(logs).map((log, index) => `
              <div class="log-line">
                <span>2026-06-13T10:${String(42 + index).padStart(2, "0")}:12Z</span>
                <span class="level-${log.level.toLowerCase()}">${log.level}</span>
                <span>${log.app}</span>
                <span>${log.message} trace=${log.trace}</span>
              </div>
            `).join("")}
          </div>
        </div>
      </section>
      <section id="pricing" class="section">
        <div class="section-head">
          <h2>Simple pricing. Predictable scale.</h2>
          <p>Start free, connect one application, then upgrade when retention, analysis, and team controls matter.</p>
        </div>
        <div class="pricing-grid">
          ${pricing.map(plan => priceCard(plan)).join("")}
        </div>
      </section>
      <section class="section alt">
        <div class="product-band">
          <div>
            <h2>Operational logs with policy-aware access</h2>
            <p>Customer teams receive scoped API keys and webhooks. Administrators need an auth microservice policy claim before viewing cross-service errors, warnings, users, audit logs, or AI analysis.</p>
            <div class="proof-list">
              ${proof("SDK", "Developer first", "Quick SDKs, rich API keys, and code-friendly tools.")}
              ${proof("RT", "Real-time insight", "Stream logs in real time with instant search and alerts.")}
              ${proof("AI", "Pattern analysis", "Surface errors and anomalies before your users do.")}
            </div>
          </div>
          <img src="assets/logstream-concept.png" alt="LogStream landing, customer dashboard, and admin panel concept" />
        </div>
      </section>
      <section class="section">
        <div class="product-band">
          <div class="panel">
            <h2>Secure by design</h2>
            <ul class="policy-list">
              <li><span>Admin roles</span><strong>${adminRequirementLabel()}</strong></li>
              <li><span>Dashboard policy</span><strong>${dashboardPermission}</strong></li>
              <li><span>Tenant scoping</span><strong>tenant_id required</strong></li>
              <li><span>Default authorization</span><strong>deny</strong></li>
            </ul>
          </div>
          <div>
            <h2>Try the product path</h2>
            <p>Use the session selector in the header to test guest, customer, authenticated without admin policy, and logging-admin views. This mirrors how the auth microservice should issue claims.</p>
            <div class="hero-actions">
              <button class="btn primary" onclick="state.session='customer'; setRoute('dashboard')">Open customer dashboard</button>
              <button class="btn dark" onclick="state.session='admin'; setRoute('admin')">Open admin panel</button>
            </div>
          </div>
        </div>
      </section>
    </main>
  `;
}

function priceCard(plan) {
  return `
    <article class="price-card ${plan.featured ? "featured" : ""}">
      <h3>${plan.name}</h3>
      <div class="price">${plan.price}${plan.period ? `<span>${plan.period}</span>` : ""}</div>
      <ul>${plan.features.map(feature => `<li>${feature}</li>`).join("")}</ul>
      <button class="btn ${plan.featured ? "primary" : ""}" onclick="setRoute('dashboard')">${plan.cta}</button>
    </article>
  `;
}

function proof(code, title, text) {
  return `
    <div class="proof-item">
      <span class="proof-icon">${code}</span>
      <div><strong>${title}</strong><p>${text}</p></div>
    </div>
  `;
}

function requireAuth(routeName, requiredPermission, body) {
  const session = currentSession();
  if (!session.authenticated) {
    return accessDenied("Authentication required", `${routeName} is available only after authentication with the auth microservice.`, "Login or use the session selector to simulate an authenticated user.");
  }
  if (!session.tenantId) {
    return accessDenied("Tenant scope required", "The session is authenticated but does not include customer_id or tenant_id.", "Ask the auth microservice to include a tenant-scoped entitlement.");
  }
  const allowed = Array.isArray(requiredPermission) ? hasAnyPermission(requiredPermission) : !requiredPermission || hasPermission(requiredPermission);
  if (!allowed) {
    const requirement = Array.isArray(requiredPermission) ? requiredPermission.join(" or ") : requiredPermission;
    return accessDenied("Access denied", `This route requires ${requirement}.`, "The route must stay hidden until the auth microservice grants the required logging rights.");
  }
  return body();
}

function accessDenied(title, message, action) {
  return `
    <main class="access">
      <section class="access-box">
        <h1>${title}</h1>
        <p>${message}</p>
        <ul class="policy-list">
          <li><span>Current session</span><strong>${currentSession().label}</strong></li>
          <li><span>Email</span><strong>${currentSession().email || "Not authenticated"}</strong></li>
          <li><span>Tenant</span><strong>${currentSession().tenantId || "Missing"}</strong></li>
          <li><span>Permissions</span><strong>${currentSession().permissions.join(", ") || "None"}</strong></li>
        </ul>
        <p>${action}</p>
        <div class="hero-actions">
          <button class="btn primary" onclick="state.session='customer'; render()">Use customer session</button>
          <button class="btn dark" onclick="state.session='admin'; render()">Use admin session</button>
        </div>
      </section>
    </main>
  `;
}

function appShell(kind, content) {
  const admin = kind === "admin";
  const items = admin
    ? ["Overview", "Services", "Logs", "Errors", "AI Analysis", "Integrations", "Users", "Policies", "Audit Logs", "Settings"]
    : ["Overview", "Applications", "Logs", "Search", "Alerts", "Webhooks", "API Keys", "Integrations", "Usage", "Settings"];
  return `
    <main class="page-shell">
      <aside class="sidebar">
        <div class="side-title">${admin ? "Administration" : "Customer workspace"}</div>
        <div class="side-nav">${items.map((item, index) => `<button class="${index === 0 ? "active" : ""}"><span aria-hidden="true"></span>${item}</button>`).join("")}</div>
      </aside>
      <section class="main">${content}</section>
    </main>
  `;
}

function dashboard() {
  return requireAuth("Customer dashboard", dashboardPermission, () => appShell("customer", `
    <div class="page-head">
      <div>
        <h1>Customer dashboard</h1>
        <p>Connect applications, send logs through scoped keys, and monitor recent ingestion for ${currentSession().tenantId}.</p>
      </div>
      <div class="toolbar">
        <button class="btn small">View API documentation</button>
        <button class="btn primary small" onclick="regenerateKey()">Regenerate key</button>
      </div>
    </div>
    ${metrics([
      ["Ingested logs", "1.23M", "+12.4%", ""],
      ["Error logs", "2,345", "+8.1%", "danger"],
      ["Warning logs", "8,921", "-4.2%", "danger"],
      ["Applications", "12", "+2", ""],
    ])}
    <div class="dashboard-grid">
      <div class="panel">
        <h2>Logs over time</h2>
        ${chart()}
      </div>
      <div class="panel">
        <h2>Log levels</h2>
        ${levelSummary()}
      </div>
    </div>
    <div class="setup-grid">
      <div class="setup-box">
        <h2>Connect your application</h2>
        <div class="tabs">
          ${tab("api", "API Key")}
          ${tab("webhook", "Webhook")}
          ${tab("sdk", "SDK")}
        </div>
        ${connectionPanel()}
      </div>
      <div class="table-panel">
        <h2>Recent logs</h2>
        ${logTable(logs)}
      </div>
    </div>
  `));
}

function metrics(items) {
  return `<div class="metrics">${items.map(([label, value, delta, tone]) => `
    <div class="metric-card ${tone}">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${delta}</small>
    </div>
  `).join("")}</div>`;
}

function chart() {
  return `
    <div class="chart" aria-label="Line chart showing logs over time">
      <svg viewBox="0 0 720 260" role="img">
        <polyline points="0,180 45,150 90,132 135,118 180,124 225,92 270,104 315,86 360,96 405,82 450,100 495,76 540,88 585,72 630,66 720,48" fill="none" stroke="#0ea5a4" stroke-width="5" />
        <polyline points="0,218 45,206 90,202 135,190 180,194 225,176 270,186 315,168 360,174 405,164 450,176 495,154 540,160 585,150 630,144 720,138" fill="none" stroke="#ef4444" stroke-width="4" />
        <polyline points="0,232 45,226 90,220 135,218 180,214 225,210 270,212 315,204 360,206 405,196 450,200 495,192 540,190 585,184 630,186 720,178" fill="none" stroke="#f59e0b" stroke-width="4" />
      </svg>
    </div>
  `;
}

function levelSummary() {
  return `
    <div class="ai-list">
      ${[
        ["Info", "1.05M", "85.4%", "info"],
        ["Warn", "120K", "9.8%", "warn"],
        ["Error", "55K", "4.8%", "error"],
      ].map(([label, count, pct, tone]) => `
        <div class="pattern">
          <strong><span><span class="status ${tone}">${label}</span> ${count}</span><span>${pct}</span></strong>
          <p>${label} events across connected applications in the selected time range.</p>
        </div>
      `).join("")}
    </div>
  `;
}

function tab(id, label) {
  return `<button class="tab ${state.dashboardTab === id ? "active" : ""}" onclick="state.dashboardTab='${id}'; render()">${label}</button>`;
}

function connectionPanel() {
  if (state.dashboardTab === "webhook") {
    return `
      <p>Forward selected events to your own incident workflow.</p>
      <input class="field" value="https://example.invalid/log-events" aria-label="Webhook URL" />
      <div class="key-row"><code>Error, Warning, AI pattern detected</code><button class="btn small">Save</button></div>
    `;
  }
  if (state.dashboardTab === "sdk") {
    return `
      <p>Install the SDK and send structured logs from your service.</p>
      <pre class="code">npm install @logstream/node

import { LogStream } from "@logstream/node";
const logger = new LogStream(process.env.LOGSTREAM_KEY);
logger.error("Order failed", { trace_id: request.id });</pre>
    `;
  }
  return `
    <p>Use scoped ingest credentials to send logs to LogStream. Secrets stay masked in this draft shell until backend and security contracts approve reveal behavior.</p>
    <div class="key-row"><code data-api-key>lg_live_syn1...[REDACTED_SECRET]</code><button class="btn small" onclick="regenerateKey()">Rotate</button></div>
    <p>Ingest endpoint (HTTPS)</p>
    <div class="key-row"><code>https://logging.alfares.cz/api/logs</code><button class="btn small">Copy URL</button></div>
  `;
}

function admin() {
  return requireAuth("Admin panel", adminRoles, () => {
    const serviceRows = state.adminDataMode === "live" && state.liveServices?.length ? state.liveServices : services;
    const sourceLogs = state.adminDataMode === "live" && state.liveLogs ? state.liveLogs : logs;
    const filteredLogs = sourceLogs.filter(log => {
      const byService = state.service === "all" || log.app === state.service;
      const bySearch = !state.search || `${log.app} ${log.message} ${log.level}`.toLowerCase().includes(state.search.toLowerCase());
      return byService && bySearch;
    });
    return appShell("admin", `
      <div class="page-head">
        <div>
          <h1>Logging administration</h1>
          <p>Admin access granted by backend role <strong>app:logging-microservice:admin</strong>. Review services, errors, warnings, AI analysis, and notification integrations.</p>
        </div>
        <div class="toolbar">
          <input placeholder="Filter loaded rows" value="${escapeHtml(state.search)}" oninput="state.search=this.value; render()" />
          <select onchange="setAdminFilter('service', this.value)">
            <option value="all">All services</option>
            ${serviceRows.map(service => `<option value="${escapeHtml(service.name)}" ${state.service === service.name ? "selected" : ""}>${escapeHtml(service.name)}</option>`).join("")}
          </select>
          <button class="btn primary small">Run AI analysis</button>
        </div>
      </div>
      ${adminIntegrationPanel()}
      ${metrics([
        ["Data source", state.adminDataMode === "live" ? "Live" : "Demo", state.adminDataMode === "live" ? "Admin API" : "Synthetic", ""],
        ["Loaded rows", String(filteredLogs.length), state.adminDataMode === "live" ? `${state.liveCount} returned` : "Static", ""],
        ["Errors", String(filteredLogs.filter(log => log.level === "ERROR").length), "Visible rows", "danger"],
        ["Warnings", String(filteredLogs.filter(log => log.level === "WARN").length), "Visible rows", "danger"],
      ])}
      <div class="admin-grid">
        <div class="table-panel">
          <h2>Error and warning logs</h2>
          ${logTable(filteredLogs)}
        </div>
        <div class="panel">
          <h2>AI pattern analysis</h2>
          <div class="ai-list">${patterns.map(pattern => patternCard(pattern)).join("")}</div>
        </div>
      </div>
      <div class="setup-grid">
        <div class="table-panel">
          <h2>Services</h2>
          <div class="table-scroll">
            <table>
              <thead><tr><th>Service</th><th>Environment</th><th>Logs</th><th>Error rate</th><th>Status</th></tr></thead>
              <tbody>${serviceRows.map(service => `
                <tr>
                  <td>${escapeHtml(service.name)}</td>
                  <td>${escapeHtml(service.env)}</td>
                  <td>${escapeHtml(service.logs)}</td>
                  <td>${escapeHtml(service.errorRate)}</td>
                  <td><span class="status ${service.status === "Degraded" ? "warn" : "ok"}">${escapeHtml(service.status)}</span></td>
                </tr>
              `).join("")}</tbody>
            </table>
          </div>
        </div>
        <div class="panel">
          <h2>Notification integrations</h2>
          <ul class="policy-list">
            <li><span>Email</span><strong>Active</strong></li>
            <li><span>Slack</span><strong>Active</strong></li>
            <li><span>PagerDuty</span><strong>Active</strong></li>
            <li><span>Microsoft Teams</span><strong>Inactive</strong></li>
          </ul>
          <button class="btn small">Add integration</button>
        </div>
      </div>
    `);
  });
}

function adminIntegrationPanel() {
  const liveLoaded = state.adminDataMode === "live" && state.liveLoadedAt;
  return `
    <section class="integration-panel">
      <div class="integration-head">
        <div>
          <h2>Live admin adapter</h2>
          <p>Uses only discovered endpoints: <code>GET /api/logs/query</code> and <code>GET /api/logs/services</code>. Tokens are kept in memory for this page session and are not written to browser storage.</p>
        </div>
        <div class="toolbar">
          <button class="btn small" onclick="useDemoAdminData()">Use demo data</button>
          <button class="btn primary small" onclick="loadLiveAdminData()" ${state.adminLoading ? "disabled" : ""}>${state.adminLoading ? "Loading..." : "Load live logs"}</button>
        </div>
      </div>
      <div class="filter-grid">
        <label>
          <span>Backend URL</span>
          <input value="${escapeHtml(state.adminBackendUrl)}" oninput="setAdminBackendUrl(this.value)" aria-label="Logging backend URL" />
        </label>
        <label>
          <span>Bearer token</span>
          <input type="password" autocomplete="off" placeholder="Paste token for this request" oninput="setAdminToken(this.value)" aria-label="Admin bearer token" />
        </label>
        <label>
          <span>Level</span>
          <select onchange="setAdminFilter('adminLevel', this.value)" aria-label="Log level filter">
            ${["all", "error", "warn", "info", "debug"].map(level => `<option value="${level}" ${state.adminLevel === level ? "selected" : ""}>${level === "all" ? "All levels" : level.toUpperCase()}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Start date</span>
          <input type="datetime-local" value="${escapeHtml(state.adminStartDate)}" onchange="setAdminFilter('adminStartDate', this.value)" aria-label="Start date filter" />
        </label>
        <label>
          <span>End date</span>
          <input type="datetime-local" value="${escapeHtml(state.adminEndDate)}" onchange="setAdminFilter('adminEndDate', this.value)" aria-label="End date filter" />
        </label>
        <label>
          <span>Limit</span>
          <input type="number" min="1" max="500" value="${escapeHtml(state.adminLimit)}" onchange="setAdminFilter('adminLimit', this.value)" aria-label="Query limit" />
        </label>
      </div>
      ${state.adminError ? `<div class="inline-alert error">${escapeHtml(state.adminError)}</div>` : ""}
      ${liveLoaded ? `<div class="inline-alert">Live data loaded at ${escapeHtml(formatTimestamp(state.liveLoadedAt))}. Backend supports limit-only results; cursor pagination and full-text search remain unavailable.</div>` : ""}
    </section>
  `;
}

function patternCard(pattern) {
  return `
    <article class="pattern">
      <strong><span><span class="status ${pattern.level.toLowerCase()}">${escapeHtml(pattern.level)}</span> ${escapeHtml(pattern.title)}</span><span>${escapeHtml(pattern.delta)}</span></strong>
      <p>${escapeHtml(pattern.text)}</p>
    </article>
  `;
}

function logTable(rows) {
  return `
    <div class="table-scroll">
      <table>
        <thead><tr><th>Time</th><th>Level</th><th>Application</th><th>Message</th><th>Trace</th></tr></thead>
        <tbody>
          ${rows.map(log => `
            <tr>
              <td>${escapeHtml(log.time)}</td>
              <td><span class="status ${log.level.toLowerCase()}">${escapeHtml(log.level)}</span></td>
              <td>${escapeHtml(log.app)}</td>
              <td>${escapeHtml(log.message)}</td>
              <td>${escapeHtml(log.trace)}</td>
            </tr>
          `).join("") || `<tr><td colspan="5">No logs match the selected filters.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function footer() {
  return `
    <footer class="footer">
      <div class="footer-inner">
        <div class="brand"><span class="brand-mark" aria-hidden="true"></span><span>LogStream</span></div>
        <div>Admin roles: ${adminRequirementLabel()}. Dashboard scope: tenant_id. AI and notification endpoints are integration contracts.</div>
      </div>
    </footer>
  `;
}

function render() {
  const routes = {
    landing,
    dashboard,
    admin,
  };
  app.innerHTML = `<div class="app">${nav()}${routes[state.route]()}${state.route === "landing" ? footer() : ""}</div>`;
}

render();
