const test = require('node:test');
const assert = require('node:assert/strict');
const { applications, evaluate } = require('../server');

test('POC contains five applications with five distinct signals each', () => {
  assert.equal(applications.length, 5);
  for (const app of applications) {
    assert.ok(app.signals.length >= 5);
    assert.equal(new Set(app.signals.map(signal => signal.id)).size, app.signals.length);
  }
});

test('evaluation exposes raw, transformed, and decision stages', () => {
  const result = evaluate(applications[0]);
  assert.ok(['ALLOW', 'WARN', 'BLOCK'].includes(result.decision));
  assert.ok(result.signals.every(signal => Number.isFinite(signal.raw) && Number.isFinite(signal.score) && typeof signal.passed === 'boolean'));
});

test('a critical degraded signal blocks progression', () => {
  const result = evaluate(applications[0], { tests: 50 });
  assert.equal(result.decision, 'BLOCK');
});
