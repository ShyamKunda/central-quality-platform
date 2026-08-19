const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC = path.join(__dirname, 'public');

const applications = [
  {
    id: 'checkout-api', name: 'Checkout API', owner: 'Payments', change: 'pay-7f31c9a', environment: 'production',
    policy: { title: 'Payment safety gate', description: 'Block risky payment changes; warn when operational confidence is incomplete.' },
    signals: [
      { id: 'tests', source: 'CI', label: 'Test reliability', unit: '%', raw: 98.6, target: 98, direction: 'higher', weight: 25, transform: 'Pass rate adjusted for flaky retries' },
      { id: 'cve', source: 'SAST', label: 'Critical vulnerabilities', unit: 'critical', raw: 0, target: 0, direction: 'lower', weight: 30, transform: 'Critical CVEs introduced by this change' },
      { id: 'latency', source: 'APM', label: 'Checkout p95 latency', unit: 'ms', raw: 282, target: 300, direction: 'lower', weight: 20, transform: 'Canary p95 vs 7-day production baseline' },
      { id: 'errors', source: 'Canary', label: 'Error budget burn', unit: 'x', raw: 1.1, target: 2, direction: 'lower', weight: 15, transform: 'One-hour burn rate normalized to SLO' },
      { id: 'review', source: 'Git', label: 'Required approvals', unit: '%', raw: 100, target: 100, direction: 'higher', weight: 10, transform: 'Signed approvals / required approvals' }
    ]
  },
  {
    id: 'identity-service', name: 'Identity Service', owner: 'Platform Security', change: 'id-21d48e0', environment: 'staging',
    policy: { title: 'Authentication integrity', description: 'Require security evidence and protect login success and latency.' },
    signals: [
      { id: 'contract', source: 'CI', label: 'Contract tests', unit: '%', raw: 100, target: 100, direction: 'higher', weight: 20, transform: 'Passed consumer contracts / total contracts' },
      { id: 'secrets', source: 'Scanner', label: 'Leaked secrets', unit: 'findings', raw: 0, target: 0, direction: 'lower', weight: 30, transform: 'Verified secrets introduced in diff' },
      { id: 'login', source: 'Synthetic', label: 'Login success', unit: '%', raw: 99.7, target: 99.5, direction: 'higher', weight: 20, transform: 'Successful regional login journeys' },
      { id: 'latency', source: 'APM', label: 'Token issue p99', unit: 'ms', raw: 410, target: 450, direction: 'lower', weight: 15, transform: 'P99 token issuance during canary' },
      { id: 'threat', source: 'Review', label: 'Threat model freshness', unit: 'days', raw: 24, target: 90, direction: 'lower', weight: 15, transform: 'Days since relevant threat model review' }
    ]
  },
  {
    id: 'catalog-web', name: 'Catalog Web', owner: 'Storefront', change: 'web-a918be2', environment: 'preview',
    policy: { title: 'Customer experience', description: 'Balance functional, accessibility, performance, and visual confidence.' },
    signals: [
      { id: 'e2e', source: 'Playwright', label: 'Critical journeys', unit: '%', raw: 97, target: 98, direction: 'higher', weight: 25, transform: 'Stable pass rate for revenue journeys' },
      { id: 'a11y', source: 'Axe', label: 'Accessibility violations', unit: 'serious', raw: 1, target: 0, direction: 'lower', weight: 20, transform: 'Serious or critical WCAG violations' },
      { id: 'lcp', source: 'Lighthouse', label: 'Largest Contentful Paint', unit: 's', raw: 2.3, target: 2.5, direction: 'lower', weight: 20, transform: 'Mobile p75 LCP on preview build' },
      { id: 'visual', source: 'Percy', label: 'Visual diff', unit: '%', raw: 0.7, target: 1, direction: 'lower', weight: 15, transform: 'Changed pixels excluding approved regions' },
      { id: 'bundle', source: 'Build', label: 'JS bundle growth', unit: '%', raw: 2.1, target: 3, direction: 'lower', weight: 20, transform: 'Compressed entry bundle delta' }
    ]
  },
  {
    id: 'recommendation-engine', name: 'Recommendation Engine', owner: 'Personalization', change: 'ml-55c029f', environment: 'shadow',
    policy: { title: 'Responsible model promotion', description: 'Promote only when quality improves without fairness or stability regressions.' },
    signals: [
      { id: 'ndcg', source: 'ML Eval', label: 'Ranking quality NDCG', unit: '', raw: 0.812, target: 0.8, direction: 'higher', weight: 25, transform: 'Offline NDCG@10 on holdout set' },
      { id: 'drift', source: 'Feature Store', label: 'Feature drift PSI', unit: '', raw: 0.11, target: 0.2, direction: 'lower', weight: 20, transform: 'Max population stability index' },
      { id: 'fairness', source: 'ML Eval', label: 'Exposure disparity', unit: '%', raw: 3.4, target: 5, direction: 'lower', weight: 25, transform: 'Maximum segment exposure gap' },
      { id: 'inference', source: 'Shadow', label: 'Inference p95', unit: 'ms', raw: 74, target: 80, direction: 'lower', weight: 15, transform: 'Shadow traffic p95 model latency' },
      { id: 'coverage', source: 'Data Quality', label: 'Feature completeness', unit: '%', raw: 99.2, target: 99, direction: 'higher', weight: 15, transform: 'Non-null required online features' }
    ]
  },
  {
    id: 'fulfillment-worker', name: 'Fulfillment Worker', owner: 'Operations', change: 'ops-c87e41d', environment: 'canary',
    policy: { title: 'Operational resilience', description: 'Protect order processing, recovery, observability, and safe rollout.' },
    signals: [
      { id: 'integration', source: 'CI', label: 'Integration tests', unit: '%', raw: 99, target: 98, direction: 'higher', weight: 20, transform: 'Pass rate across carrier integrations' },
      { id: 'lag', source: 'Kafka', label: 'Consumer lag', unit: 'messages', raw: 640, target: 1000, direction: 'lower', weight: 20, transform: 'Max canary partition lag over 15 min' },
      { id: 'dlq', source: 'Runtime', label: 'Dead-letter rate', unit: '%', raw: 0.03, target: 0.1, direction: 'lower', weight: 25, transform: 'Dead-lettered / processed messages' },
      { id: 'rollback', source: 'Deploy', label: 'Rollback readiness', unit: '%', raw: 100, target: 100, direction: 'higher', weight: 20, transform: 'Validated rollback steps completed' },
      { id: 'alerts', source: 'Observability', label: 'Runbook coverage', unit: '%', raw: 92, target: 90, direction: 'higher', weight: 15, transform: 'Actionable alerts linked to current runbooks' }
    ]
  }
];

function normalize(signal, raw = signal.raw) {
  if (signal.target === 0) return raw === 0 ? 100 : Math.max(0, 100 - raw * 35);
  const ratio = signal.direction === 'higher' ? raw / signal.target : signal.target / Math.max(raw, 0.0001);
  return Math.round(Math.max(0, Math.min(1, ratio)) * 100);
}

function evaluate(app, overrides = {}) {
  const signals = app.signals.map(signal => {
    const raw = Number(overrides[signal.id] ?? signal.raw);
    const score = normalize(signal, raw);
    const passed = signal.direction === 'higher' ? raw >= signal.target : raw <= signal.target;
    return { ...signal, raw, score, passed };
  });
  const confidence = Math.round(signals.reduce((sum, s) => sum + s.score * s.weight, 0) / signals.reduce((sum, s) => sum + s.weight, 0));
  const failed = signals.filter(s => !s.passed);
  const criticalFailure = failed.some(s => s.weight >= 25);
  const decision = criticalFailure || confidence < 75 ? 'BLOCK' : failed.length || confidence < 90 ? 'WARN' : 'ALLOW';
  const reason = decision === 'ALLOW' ? 'All policy requirements are satisfied.' : `${failed.length} policy requirement${failed.length === 1 ? '' : 's'} need attention.`;
  return { ...app, signals, confidence, decision, reason, evaluatedAt: new Date().toISOString(), evidenceId: `ev-${app.change}-${Date.now().toString(36)}` };
}

function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}

function serveFile(reqPath, res) {
  const relative = reqPath === '/' ? 'index.html' : reqPath.slice(1);
  const file = path.normalize(path.join(PUBLIC, relative));
  if (!file.startsWith(PUBLIC)) return json(res, 403, { error: 'Forbidden' });
  fs.readFile(file, (error, data) => {
    if (error) return json(res, 404, { error: 'Not found' });
    const type = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' }[path.extname(file)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/api/apps') return json(res, 200, applications.map(app => evaluate(app)));
  const match = url.pathname.match(/^\/api\/apps\/([^/]+)\/evaluate$/);
  if (req.method === 'POST' && match) {
    const app = applications.find(item => item.id === match[1]);
    if (!app) return json(res, 404, { error: 'Application not found' });
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try { json(res, 200, evaluate(app, JSON.parse(body || '{}').overrides || {})); }
      catch { json(res, 400, { error: 'Invalid JSON body' }); }
    });
    return;
  }
  if (req.method === 'GET') return serveFile(url.pathname, res);
  json(res, 405, { error: 'Method not allowed' });
});

if (require.main === module) server.listen(PORT, HOST, () => console.log(`CQP POC running at http://${HOST}:${PORT}`));
module.exports = { applications, evaluate, normalize, server };
