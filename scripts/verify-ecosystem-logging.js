#!/usr/bin/env node
const { execFileSync } = require('node:child_process');

const namespace = process.env.K8S_NAMESPACE || 'statex-apps';
const serviceArgs = (process.argv.slice(2).length ? process.argv.slice(2) : [
  'auth-microservice',
  'payments-microservice',
  'orders-microservice',
  'catalog-microservice',
  'warehouse-microservice',
  'suppliers-microservice',
  'marketing-microservice',
  'docs-rag-microservice',
  'minio-microservice',
  'backups-microservice',
  'crypto-ai-agent',
]).filter(Boolean);

const services = serviceArgs.map((arg) => {
  const [deployment, serviceName] = arg.split(':');
  return { deployment, expectedServiceName: serviceName || deployment };
});

function kubectl(args, options = {}) {
  return execFileSync('kubectl', ['-n', namespace, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', options.allowError ? 'pipe' : 'inherit'],
  }).trim();
}

function kubectlMaybe(args) {
  try {
    return kubectl(args, { allowError: true });
  } catch {
    return '';
  }
}

function firstPodForApp(app) {
  return kubectlMaybe(['get', 'pod', '-l', `app=${app}`, '-o', 'jsonpath={.items[0].metadata.name}']);
}

function podEnv(pod, name) {
  if (!pod) return '';
  return kubectlMaybe(['exec', pod, '--', 'sh', '-lc', `printenv ${name} 2>/dev/null || true`]);
}

function centralLogStat(service) {
  const loggingPod = firstPodForApp('logging-microservice');
  if (!loggingPod) return { exists: false, detail: 'logging pod missing' };
  const safe = service.replace(/'/g, "'\\''");
  const output = kubectlMaybe([
    'exec',
    loggingPod,
    '--',
    'sh',
    '-lc',
    `[ -f /app/logs/'${safe}'.log ] && stat -c '%s bytes %y' /app/logs/'${safe}'.log || true`,
  ]);
  return output ? { exists: true, detail: output } : { exists: false, detail: 'missing' };
}

function deployImage(app) {
  return kubectlMaybe([
    'get',
    'deploy',
    app,
    '-o',
    'jsonpath={.spec.template.spec.containers[0].image}',
  ]);
}

const rows = services.map(({ deployment, expectedServiceName }) => {
  const pod = firstPodForApp(deployment);
  const envUrl = podEnv(pod, 'LOGGING_SERVICE_URL');
  const envToken = podEnv(pod, 'LOGGING_SERVICE_TOKEN');
  const serviceName = podEnv(pod, 'SERVICE_NAME') || expectedServiceName;
  const central = centralLogStat(serviceName);
  return {
    deployment,
    pod: pod || '[MISSING]',
    image: deployImage(deployment) || '[MISSING]',
    service_name: serviceName,
    logging_service_url: envUrl ? '[SET]' : '[MISSING]',
    logging_service_token: envToken ? '[SET]' : '[MISSING]',
    central_log: central.exists ? 'present' : '[MISSING]',
    central_detail: central.detail,
  };
});

console.log(JSON.stringify({ namespace, generated_at: new Date().toISOString(), rows }, null, 2));

const missing = rows.filter(
  (row) =>
    row.central_log !== 'present' ||
    row.logging_service_url !== '[SET]' ||
    row.logging_service_token !== '[SET]',
);
if (missing.length > 0) {
  process.exitCode = 2;
}
