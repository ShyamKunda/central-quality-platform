const test = require('node:test');
const assert = require('node:assert/strict');
const { applications, evaluate, applyAction, attestation, runtime } = require('../server');

function reset(app) {
  Object.assign(runtime.get(app.id), { mode: app.mode, overrides: {}, statuses: {}, trust: {}, waivers: {}, thresholds: {}, history: [], revision: 0 });
}
test.beforeEach(() => applications.forEach(reset));

test('contains five applications with five heterogeneous signals each', () => {
  assert.equal(applications.length, 5);
  for (const app of applications) {
    assert.ok(app.signals.length >= 5);
    assert.equal(new Set(app.signals.map(signal => signal.id)).size, app.signals.length);
    assert.ok(app.signals.every(signal => signal.kind && signal.category));
  }
});

test('decision includes subject chain, completeness, rules, and separate raw outcome', () => {
  const result = evaluate(applications[0]);
  assert.equal(result.subjects.length, 5);
  assert.equal(result.rules.length, result.signals.length);
  assert.equal(result.completeness.requiredPresent.length, 5);
  assert.ok(['proceed','proceed_with_warning','require_additional_validation','blocked','insufficient_evidence'].includes(result.outcome));
  assert.ok(result.rawOutcome);
});

test('critical signal failure blocks in enforce mode without confidence gating', () => {
  const result = applyAction(applications[0], { action:'degrade', signalId:'tests' });
  assert.equal(result.rawOutcome, 'blocked');
  assert.equal(result.outcome, 'blocked');
  assert.ok(result.rules.some(rule => rule.verdict === 'fail' && rule.class === 'blocking'));
});

test('warn mode preserves raw block but downgrades enforced outcome', () => {
  const app = applications[0];
  applyAction(app, { action:'setMode', mode:'warn' });
  const result = applyAction(app, { action:'degrade', signalId:'tests' });
  assert.equal(result.rawOutcome, 'blocked');
  assert.equal(result.outcome, 'proceed_with_warning');
  assert.equal(result.modeDowngraded, true);
});

test('pending evidence requests validation and later arrival resolves it', () => {
  const app = applications[0];
  let result = applyAction(app, { action:'pending', signalId:'latency' });
  assert.equal(result.outcome, 'require_additional_validation');
  assert.equal(result.completeness.pending.length, 1);
  result = applyAction(app, { action:'arrive', signalId:'latency' });
  assert.equal(result.outcome, 'proceed');
});

test('producer outages fail closed for security and degrade open for performance', () => {
  const app = applications[0];
  let result = applyAction(app, { action:'outage', signalId:'latency' });
  assert.equal(result.outcome, 'proceed_with_warning');
  assert.equal(result.degraded, true);
  applyAction(app, { action:'restore' });
  result = applyAction(app, { action:'outage', signalId:'cve' });
  assert.equal(result.outcome, 'blocked');
});

test('flaky checks are quarantined and lose their veto', () => {
  const result = applyAction(applications[0], { action:'flaky', signalId:'tests' });
  const signal = result.signals.find(item => item.id === 'tests');
  assert.equal(signal.trust, 'quarantined');
  assert.equal(signal.gating, false);
  assert.equal(result.outcome, 'proceed_with_warning');
});

test('unsafe team threshold is clamped to the organization floor', () => {
  const result = applyAction(applications[0], { action:'threshold', signalId:'tests', value:20 });
  assert.equal(result.thresholds.tests.clamped, true);
  assert.equal(result.thresholds.tests.applied, 73.5);
});

test('waiver remains visible and downgrades a failure to warning', () => {
  const app = applications[0];
  applyAction(app, { action:'degrade', signalId:'tests' });
  const result = applyAction(app, { action:'waive', signalId:'tests', owner:'Payments', ticket:'SEC-4471' });
  assert.equal(result.outcome, 'proceed_with_warning');
  assert.equal(result.signals.find(signal => signal.id === 'tests').waiver.ticket, 'SEC-4471');
});

test('decision ledger is append-only and records supersession pointers', () => {
  const app = applications[0];
  applyAction(app, { action:'degrade', signalId:'tests' });
  const result = applyAction(app, { action:'restore' });
  assert.equal(result.history.length, 2);
  assert.equal(result.history[1].supersedes, result.history[0].decisionId);
  assert.equal(result.history[0].supersededBy, result.history[1].decisionId);
});

test('attestation binds outcome to subject and policy digest', () => {
  const envelope = attestation(applications[0]);
  assert.equal(envelope.payloadType, 'application/vnd.in-toto+json');
  assert.ok(envelope.payload.subject[0].digest.sha256);
  assert.ok(envelope.payload.predicate.policy.digest.startsWith('sha256:'));
  assert.equal(envelope.signatures[0].demonstrationOnly, true);
});
