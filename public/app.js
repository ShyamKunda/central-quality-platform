const state = { apps: [], selected: null, degraded: false };
const list = document.querySelector('#app-list');
const detail = document.querySelector('#detail');
const template = document.querySelector('#detail-template');

const escapeHtml = value => String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[char]));
const formatValue = signal => `${Number(signal.raw).toLocaleString(undefined, { maximumFractionDigits: 3 })}${signal.unit ? ` ${signal.unit}` : ''}`;

function renderList() {
  list.innerHTML = state.apps.map(app => `<button class="app-item ${app.id === state.selected?.id ? 'active' : ''}" data-id="${app.id}"><i class="dot ${app.decision.toLowerCase()}"></i><span><span class="name">${escapeHtml(app.name)}</span><small>${escapeHtml(app.owner)} · ${app.environment}</small></span><span class="pill ${app.decision}">${app.decision}</span></button>`).join('');
  document.querySelector('#allow-count').textContent = state.apps.filter(app => app.decision === 'ALLOW').length;
}

function renderDetail() {
  const app = state.selected;
  const fragment = template.content.cloneNode(true);
  fragment.querySelector('.crumb').textContent = `${app.owner} / ${app.environment} / ${app.change}`;
  fragment.querySelector('h2').textContent = app.name;
  fragment.querySelector('.policy-desc').textContent = `${app.policy.title} — ${app.policy.description}`;
  const decisionCard = fragment.querySelector('.decision-card');
  decisionCard.classList.add(app.decision);
  fragment.querySelector('.decision').textContent = app.decision;
  fragment.querySelector('.confidence').textContent = `${app.confidence}% policy confidence`;
  fragment.querySelector('.evidence').textContent = app.evidenceId;
  fragment.querySelector('.change').textContent = app.change;
  fragment.querySelector('.signals').innerHTML = app.signals.map(signal => `
    <article class="signal-row">
      <div class="raw"><span class="source">${escapeHtml(signal.source)}</span><div><strong>${escapeHtml(signal.label)}</strong><small>${escapeHtml(signal.transform)}</small></div><code>${formatValue(signal)}</code></div>
      <div class="arrow">→</div>
      <div class="transform ${signal.passed ? '' : 'fail'}"><div class="meter"><i style="width:${signal.score}%"></i></div><b>${signal.score}/100 confidence</b><small>Target ${signal.direction === 'higher' ? '≥' : '≤'} ${signal.target}${signal.unit ? ` ${signal.unit}` : ''}</small></div>
      <div class="arrow">→</div>
      <div class="result ${signal.passed ? '' : 'fail'}"><i>${signal.passed ? '✓' : '!'}</i>${signal.passed ? 'Requirement met' : 'Policy exception'}</div>
    </article>`).join('');
  const button = fragment.querySelector('.simulate');
  button.textContent = state.degraded ? 'Restore live evidence' : 'Simulate degradation';
  button.addEventListener('click', simulate);
  detail.replaceChildren(fragment);
}

async function simulate() {
  const first = state.selected.signals[0];
  const degradedRaw = first.direction === 'higher' ? first.target * 0.7 : Math.max(first.target * 2, 1);
  const overrides = state.degraded ? {} : { [first.id]: degradedRaw };
  const response = await fetch(`/api/apps/${state.selected.id}/evaluate`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ overrides }) });
  state.selected = await response.json();
  state.degraded = !state.degraded;
  state.apps = state.apps.map(app => app.id === state.selected.id ? state.selected : app);
  renderList(); renderDetail();
}

async function load(preferredId) {
  detail.innerHTML = '<div class="loading">Correlating evidence…</div>';
  const response = await fetch('/api/apps');
  state.apps = await response.json();
  state.selected = state.apps.find(app => app.id === preferredId) || state.apps[0];
  state.degraded = false;
  document.querySelector('#app-count').textContent = state.apps.length;
  document.querySelector('#signal-count').textContent = state.apps.reduce((sum, app) => sum + app.signals.length, 0);
  document.querySelector('#updated').textContent = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  renderList(); renderDetail();
}

list.addEventListener('click', event => { const button = event.target.closest('[data-id]'); if (!button) return; state.selected = state.apps.find(app => app.id === button.dataset.id); state.degraded = false; renderList(); renderDetail(); });
document.querySelector('#refresh').addEventListener('click', () => load(state.selected?.id));
load();
