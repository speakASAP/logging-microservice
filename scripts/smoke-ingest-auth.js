#!/usr/bin/env node
/**
 * Smoke: POST /api/logs always requires an Auth-issued ingest principal.
 *
 * Pass a real (caller → logging-microservice) RS256 bearer via SMOKE_INGEST_TOKEN
 * (minted with auth-microservice/scripts/provision-service-token.js). Do not use
 * legacy LOG_INGEST_BEARER_TOKENS — those are removed.
 *
 * Expects: without Authorization → 401; with valid ingest principal → 201.
 */
const { execFileSync } = require('node:child_process');

const namespace = process.env.K8S_NAMESPACE || 'statex-apps';
const service = process.env.SMOKE_SERVICE_NAME || 'logging-auth-smoke';
const message = process.env.SMOKE_MESSAGE || `logging-auth-smoke-${new Date().toISOString()}`;
const token = (process.env.SMOKE_INGEST_TOKEN || '').trim();

if (!token) {
  console.error(
    'missing SMOKE_INGEST_TOKEN — supply an Auth-issued RS256 principal with role internal:logging-microservice:ingest|admin',
  );
  process.exit(10);
}

function kubectl(args) {
  return execFileSync('kubectl', ['-n', namespace, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();
}

const podJson = JSON.parse(kubectl(['get', 'pod', '-l', 'app=logging-microservice', '-o', 'json']));
const pod = (podJson.items || []).find(
  (item) => item.status?.phase === 'Running' && !item.metadata?.deletionTimestamp,
)?.metadata?.name;
if (!pod) {
  throw new Error('running logging-microservice pod not found');
}

const payload = JSON.stringify({
  level: 'info',
  msg: message,
  service,
  timestamp: new Date().toISOString(),
  metadata: { source: 'smoke-ingest-auth' },
});

const snippet = `
const payload = ${JSON.stringify(payload)};
const url = 'http://127.0.0.1:3367/api/logs';
const token = ${JSON.stringify(token)};
(async () => {
  const withoutAuth = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
  const withAuth = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: payload,
  });
  console.log(JSON.stringify({ without_auth_status: withoutAuth.status, with_auth_status: withAuth.status }));
  process.exit(withoutAuth.status === 401 && withAuth.status === 201 ? 0 : 2);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
`;

const result = kubectl(['exec', pod, '--', 'node', '-e', snippet]);
console.log(result);
