const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "docs", "validation");

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  const screenshots = [];
  const checks = [];
  const viewports = [{ name: "desktop", width: 1440, height: 1000 }];

  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  async function snapshot(name, file) {
    const fullPath = path.join(outDir, file);
    await page.screenshot({ path: fullPath, fullPage: true });
    screenshots.push({ name, file: path.relative(root, fullPath) });
  }

  async function textIncludes(name, text) {
    const bodyText = await page.locator("body").innerText();
    checks.push({ name, passed: bodyText.includes(text) });
  }

  await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  await snapshot("landing desktop", "landing-desktop.png");
  await textIncludes("landing service offer", "Centralized logging built for developers");
  await textIncludes("landing pricing tiers", "Simple pricing. Predictable scale.");

  await page.click("text=Dashboard");
  await snapshot("dashboard denied", "dashboard-denied.png");
  await textIncludes("dashboard guest denied", "Authentication required");

  await page.selectOption('select[aria-label="Simulated authenticated session"]', "customer");
  await snapshot("dashboard customer", "dashboard-customer.png");
  await textIncludes("dashboard customer allowed", "Customer dashboard");
  await textIncludes("dashboard key masked", "[REDACTED_SECRET]");

  await page.click("text=Admin");
  await page.selectOption('select[aria-label="Simulated authenticated session"]', "adminMissing");
  await snapshot("admin denied", "admin-denied.png");
  await textIncludes("admin non-admin denied", "Access denied");

  await page.selectOption('select[aria-label="Simulated authenticated session"]', "admin");
  await page.click("text=Load live logs");
  await snapshot("admin authorized", "admin-authorized.png");
  await textIncludes("admin allowed", "Logging administration");
  await textIncludes("admin live adapter visible", "Live admin adapter");
  await textIncludes("admin no-token error", "A bearer token is required");

  await page.setViewportSize({ width: 390, height: 844 });
  viewports.push({ name: "mobile", width: 390, height: 844 });
  await page.click("text=Dashboard");
  await snapshot("dashboard mobile", "dashboard-mobile.png");

  const result = await page.evaluate(() => {
    const doc = document.documentElement;
    const bodyText = document.body.innerText;
    const forbiddenSensitivePatterns = [
      /Bearer\s+(?!token\b)[A-Za-z0-9._-]+/i,
      /authorization:\s*[A-Za-z0-9._-]+/i,
      /password\s*[:=]\s*\S+/i,
      /sk_live_[A-Za-z0-9]+/i,
      /lg_live_(?![A-Za-z0-9]+\.{3}\[REDACTED_SECRET\])[A-Za-z0-9_-]{12,}/i,
      /https?:\/\/(?!example\.invalid|logging\.alfares\.cz)[^\s"']+/i,
      /[A-Z0-9._%+-]+@(?!example\.invalid\b)[A-Z0-9.-]+\.[A-Z]{2,}/i,
    ];
    const storage = {
      localStorageKeys: Object.keys(localStorage),
      sessionStorageKeys: Object.keys(sessionStorage),
    };
    return {
      title: document.title,
      overflowX: doc.scrollWidth > doc.clientWidth,
      width: doc.clientWidth,
      scrollWidth: doc.scrollWidth,
      activeButtons: [...document.querySelectorAll("button.active")].map((button) => button.textContent.trim()).slice(0, 8),
      bodyStart: document.body.innerText.slice(0, 500),
      sensitiveExposure: {
        forbiddenPatternMatches: forbiddenSensitivePatterns
          .map((pattern) => pattern.source)
          .filter((source) => new RegExp(source, "i").test(bodyText)),
        redactedSecretPresent: bodyText.includes("[REDACTED_SECRET]"),
        onlyExampleInvalidEmails: [...bodyText.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)]
          .map((match) => match[0])
          .every((email) => email.endsWith("@example.invalid")),
        urlHasNoQueryOrHash: location.search === "" && location.hash === "",
        storage,
      },
    };
  });

  await browser.close();

  checks.push(
    { name: "console errors absent", passed: errors.length === 0 },
    { name: "mobile horizontal overflow absent", passed: !result.overflowX },
    { name: "sensitive forbidden patterns absent", passed: result.sensitiveExposure.forbiddenPatternMatches.length === 0 },
    { name: "browser storage empty", passed: result.sensitiveExposure.storage.localStorageKeys.length === 0 && result.sensitiveExposure.storage.sessionStorageKeys.length === 0 },
    { name: "url has no query or hash", passed: result.sensitiveExposure.urlHasNoQueryOrHash },
    { name: "emails are example.invalid only", passed: result.sensitiveExposure.onlyExampleInvalidEmails },
    { name: "live adapter visible", passed: checks.some((check) => check.name === "admin live adapter visible" && check.passed) },
    { name: "no-token live error visible", passed: checks.some((check) => check.name === "admin no-token error" && check.passed) },
  );

  const report = {
    targetUrl: "http://127.0.0.1:4173/",
    generatedAt: new Date().toISOString(),
    command: "NODE_PATH=/Users/Sergej.Stasok/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/Sergej.Stasok/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/visual-qa.cjs",
    viewports,
    screenshots,
    checks,
    result,
    errors,
    skippedGates: [
      { gate: "Package test suite", reason: "[MISSING: no package manifest or test runner exists in this checkout]." },
      { gate: "Lint/build/typecheck", reason: "[MISSING: no package manifest, build tool, lint command, or typechecker exists in this checkout]." },
      { gate: "Live API contract validation", reason: "[MISSING: approved bearer token for validation run; implemented admin log query/services contracts are documented, but no live token was supplied]." },
      { gate: "Sensitive-data fixture audit beyond local synthetic data", reason: "[MISSING: authoritative sensitive-field list and export/copy approval rules]." },
      { gate: "Deployment readiness", reason: "[UNKNOWN: deployment process and release gate owner]." },
    ],
  };

  fs.writeFileSync(path.join(outDir, "visual-qa.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
