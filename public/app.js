const state={apps:[],selected:null,busy:false};
const list=document.querySelector('#app-list'),detail=document.querySelector('#detail'),template=document.querySelector('#detail-template'),inspector=document.querySelector('#inspector'),modalJson=document.querySelector('#modal-json'),modalForm=document.querySelector('#modal-form');
const esc=value=>String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const label=value=>value.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
const outcomeKind=value=>value==='proceed'?'proceed':value==='blocked'||value==='insufficient_evidence'?'blocked':'warning';
const formatSignal=s=>`${Number(s.raw).toLocaleString(undefined,{maximumFractionDigits:3})}${s.unit?` ${s.unit}`:''}`;

function selectTab(id, updateHash=true) {
  const target=document.getElementById(id)||document.getElementById('home');
  document.querySelectorAll('.tab-page').forEach(page=>{const active=page===target;page.hidden=!active;page.classList.toggle('active',active);});
  document.querySelectorAll('[data-tab]').forEach(button=>{const active=button.dataset.tab===target.id;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
  if(updateHash&&location.hash!==`#${target.id}`)history.pushState(null,'',`#${target.id}`);
  window.scrollTo({top:0,behavior:'smooth'});
}

document.querySelectorAll('[data-tab]').forEach((button,index,buttons)=>{
  button.addEventListener('click',()=>selectTab(button.dataset.tab));
  button.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();let next=index;if(event.key==='ArrowRight')next=(index+1)%buttons.length;if(event.key==='ArrowLeft')next=(index-1+buttons.length)%buttons.length;if(event.key==='Home')next=0;if(event.key==='End')next=buttons.length-1;buttons[next].focus();selectTab(buttons[next].dataset.tab);});
});
document.querySelectorAll('[data-tab-link]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();selectTab(link.dataset.tabLink);}));
window.addEventListener('popstate',()=>selectTab(location.hash.slice(1)||'home',false));

const flowJsonExamples={
  'flow-json-source':{
    stage:'BLOCK 01 OUTPUT',title:'JUnit native result',description:'A compact representation of the report produced by the team-owned test framework.',data:{testsuite:{name:'checkout-api unit tests',tests:248,failures:2,errors:0,skipped:4,time_seconds:38.72},source_file:'build/test-results/TEST-checkout.xml'}
  },
  'flow-json-adapter':{
    stage:'BLOCK 02 OUTPUT',title:'Canonical signal candidate',description:'The shared adapter preserves the measurement and adds immutable pipeline context before submission.',data:{schema_version:'1.2.0',signal_id:'github:run-8842:junit:unit',occurred_at:'2026-08-25T09:14:22Z',subject:{kind:'build',name:'checkout-api',digest:{sha256:'9f2c4b81'}},producer:{tool:'junit',adapter:'cqp-junit-adapter',adapter_version:'3.1.0'},stage:'build',category:'testing',check_id:'junit.unit_tests',measurement:{kind:'ratio',passed:242,total:248,value:97.58,unit:'percent'},outcome:'fail',evidence:{run_id:'github:run-8842',report_uri:'s3://quality-reports/run-8842/junit.xml'}}
  },
  'flow-json-gateway':{
    stage:'BLOCK 03 OUTPUT',title:'Gateway admission receipt',description:'The gateway verifies the producer and contract, then returns an idempotent receipt.',data:{receipt_id:'receipt-7c84f1',signal_id:'github:run-8842:junit:unit',status:'accepted',schema_valid:true,producer_authenticated:true,subject_verified:true,idempotency:{duplicate:false,key:'github:run-8842:junit:unit'},received_at:'2026-08-25T09:14:24Z'}
  },
  'flow-json-ledger':{
    stage:'BLOCK 04 OUTPUT',title:'Append-only ledger record',description:'Accepted evidence is immutable and addressable by its subject fingerprint and signal ID.',data:{ledger_sequence:184220,record_type:'quality_signal',signal_id:'github:run-8842:junit:unit',subject_uri:'build:checkout-api@sha256:9f2c4b81',check_id:'junit.unit_tests',outcome:'fail',observed_at:'2026-08-25T09:14:22Z',recorded_at:'2026-08-25T09:14:24Z',supersedes:null,integrity:{payload_digest:'sha256:ab7189d4'}}
  }
};

function showFlowJson(id){
  const example=flowJsonExamples[id];if(!example)return;
  document.querySelectorAll('.json-toggle').forEach(button=>button.classList.toggle('active',button.dataset.json===id));
  document.querySelector('#flow-json-stage').textContent=example.stage;
  document.querySelector('#flow-json-title').textContent=example.title;
  document.querySelector('#flow-json-description').textContent=example.description;
  document.querySelector('#flow-json-code').textContent=JSON.stringify(example.data,null,2);
}

document.querySelectorAll('.json-toggle').forEach(button=>button.addEventListener('click',()=>showFlowJson(button.dataset.json)));
document.querySelector('#flow-copy-json')?.addEventListener('click',async event=>{try{await navigator.clipboard.writeText(document.querySelector('#flow-json-code').textContent);event.currentTarget.textContent='Copied';setTimeout(()=>event.currentTarget.textContent='Copy JSON',1200);}catch{event.currentTarget.textContent='Select and copy';}});
showFlowJson('flow-json-source');

function mountDecisionConstruction(){
  const payloads=document.querySelector('.payload-examples');
  if(!payloads||document.querySelector('.decision-construction'))return;
  payloads.insertAdjacentHTML('beforebegin',`<section class="decision-construction">
    <div class="section-heading"><p class="eyebrow">HOW A DECISION IS CONSTRUCTED</p><h2>Evidence plus context becomes an enforceable outcome</h2><p>The raw signal never decides whether deployment is allowed. The engine joins four independently owned inputs, calculates the technically correct result, and only then applies the team's rollout mode.</p></div>
    <div class="construction-inputs">
      <article><div class="construction-label"><span>01</span><div><b>Raw signals</b><small>Owned by quality tools</small></div></div><p>What was measured against an immutable subject.</p><pre><code>{
  "subject": "sha256:9f2c4b81",
  "check_id": "trivy.vulnerabilities",
  "measurement": { "kind": "count", "value": 1 },
  "outcome": "fail"
}</code></pre></article>
      <article><div class="construction-label"><span>02</span><div><b>Service catalogue</b><small>Owned by platform governance</small></div></div><p>Who owns the service and how critical it is.</p><pre><code>{
  "service": "checkout-api",
  "owner": "payments",
  "tier": "tier-1",
  "on_call": "payments-primary"
}</code></pre></article>
      <article><div class="construction-label"><span>03</span><div><b>Policy configuration</b><small>Owned centrally and by teams</small></div></div><p>Which gate, rules, floors, and adoption mode apply.</p><pre><code>{
  "gate": "prod_promotion",
  "mode": "warn",
  "policy": "payments/production",
  "critical_cve_limit": 0
}</code></pre></article>
      <article><div class="construction-label"><span>04</span><div><b>Trust &amp; completeness</b><small>Derived by the platform</small></div></div><p>Whether evidence may veto and whether anything required is absent.</p><pre><code>{
  "trust": { "state": "active", "gating": true },
  "present": ["trivy.vulnerabilities"],
  "pending": ["k6.load_suite"],
  "missing": []
}</code></pre></article>
    </div>
    <div class="merge-rail"><span></span><b>JOINED BY SUBJECT DIGEST + SERVICE IDENTITY</b><span></span></div>
    <div class="engine-visual"><div class="engine-heading"><span>DECISION ENGINE</span><strong>Pure policy evaluation</strong><small>The confidence score is informational; named rules determine the verdict.</small></div><ol><li><span>1</span><div><b>Resolve identity</b><small>Walk commit → build → artifact → deployment and inherit relevant evidence.</small></div></li><li><span>2</span><div><b>Assemble evidence</b><small>Add service tier, trust state, freshness, and explicit absence classifications.</small></div></li><li><span>3</span><div><b>Evaluate policy</b><small>Every named rule returns pass, fail, warn, or unknown with evidence and remediation.</small></div></li><li><span>4</span><div><b>Apply enforcement mode</b><small>Keep the raw result intact, then translate it using Observe, Warn, or Enforce.</small></div></li></ol><div class="assembled-json"><span>ASSEMBLED ENGINE INPUT</span><pre><code>{
  "service": { "name": "checkout-api", "tier": "tier-1" },
  "gate": "prod_promotion",
  "mode": "warn",
  "signals": [{
    "check_id": "trivy.vulnerabilities",
    "value": 1,
    "gating": true
  }],
  "completeness": {
    "required_present": ["trivy.vulnerabilities"],
    "pending": ["k6.load_suite"]
  },
  "policy_digest": "sha256:f168063"
}</code></pre></div></div>
    <div class="outcome-comparison"><article class="raw-result"><p class="eyebrow">RAW OUTCOME — TECHNICAL TRUTH</p><h3>Blocked</h3><p>What policy concluded before rollout mode. It is never hidden or rewritten.</p><pre><code>{
  "raw_outcome": "blocked",
  "rule": "security.no_new_critical",
  "verdict": "fail",
  "class": "blocking",
  "evidence": ["sig-trivy-1042"]
}</code></pre></article><div class="mode-bridge"><span>WARN MODE</span><b>→</b><small>Preserve failure<br>downgrade action</small></div><article class="enforced-result"><p class="eyebrow">ENFORCED OUTCOME — PIPELINE ACTION</p><h3>Proceed with warning</h3><p>What the pipeline does after applying the team's current adoption mode.</p><pre><code>{
  "outcome": "proceed_with_warning",
  "raw_outcome": "blocked",
  "mode": "warn",
  "mode_downgraded": true
}</code></pre></article></div>
    <div class="interview-takeaway"><strong>Key distinction</strong><span>The signal describes evidence. The catalogue describes criticality. Policy configuration describes expectations. Trust and completeness describe whether evidence is usable. The engine combines them; enforcement mode determines what the pipeline does.</span></div>
  </section>`);
}

function renderList(){list.innerHTML=state.apps.map(app=>`<button class="app-item ${app.id===state.selected?.id?'active':''}" data-id="${app.id}"><i class="dot ${outcomeKind(app.outcome)}"></i><span><span class="name">${esc(app.name)}</span><small>${esc(app.owner)} · ${app.mode}</small></span><span class="pill ${app.outcome}">${label(app.outcome)}</span></button>`).join('');document.querySelector('#proceed-count').textContent=state.apps.filter(a=>['proceed','proceed_with_warning'].includes(a.outcome)).length;}
function completenessItem(name,value,issue=false){return `<div class="complete-item ${issue&&value?'issue':''}"><b>${value}</b><span>${name}</span></div>`;}

function renderDetail(){
  const app=state.selected,fragment=template.content.cloneNode(true),kind=outcomeKind(app.outcome);
  fragment.querySelector('.crumb').textContent=`${app.owner} / ${app.environment} / ${app.change}`;fragment.querySelector('h2').textContent=app.name;fragment.querySelector('.policy-desc').textContent=`${app.policy.title} — ${app.policy.description}`;fragment.querySelector('.tier').textContent=app.tier;
  fragment.querySelectorAll('[data-mode]').forEach(button=>{button.classList.toggle('active',button.dataset.mode===app.mode);button.addEventListener('click',()=>act('setMode',null,{mode:button.dataset.mode}));});
  const card=fragment.querySelector('.decision-card');card.classList.add(kind);fragment.querySelector('.decision').textContent=label(app.outcome);fragment.querySelector('.decision-meta').textContent=`${app.confidence}% informational confidence${app.degraded?' · degraded':''}`;fragment.querySelector('.raw-outcome').textContent=`Policy concluded: ${label(app.rawOutcome)}${app.modeDowngraded?' · mode downgraded':''}`;
  fragment.querySelector('.subject-chain').innerHTML=app.subjects.map(s=>`<div class="subject"><small>${esc(s.kind)}</small><b>${esc(s.label)}</b><code title="${esc(s.digest)}">${esc(s.digest)}</code></div>`).join('');
  const c=app.completeness;fragment.querySelector('.completeness-grid').innerHTML=completenessItem('Present',c.requiredPresent.length)+completenessItem('Pending',c.pending.length,true)+completenessItem('Missing',c.requiredMissing.length,true)+completenessItem('Expired',c.expired.length,true)+completenessItem('Producer outage',c.missingDueToOutage.length,true)+completenessItem('Total required',app.signals.length);
  fragment.querySelector('.rules').innerHTML=app.rules.map(r=>`<article class="rule ${r.verdict}"><span class="rule-icon">${r.verdict==='pass'?'✓':r.verdict==='fail'?'!':'?'}</span><div><b>${esc(r.rule)}</b><small>${esc(r.detail)}</small>${r.remediation?`<small>Next: ${esc(label(r.remediation.action))}</small>`:''}</div><span class="rule-class">${r.class}</span></article>`).join('');
  fragment.querySelector('.signals').innerHTML=app.signals.map(s=>`<article class="signal-row ${!s.passed?'fail':''}"><div class="signal-name"><span class="source">${esc(s.source)}</span><div><b>${esc(s.label)}</b><small>${esc(s.kind)} · ${esc(s.category)}</small></div></div><div class="metric"><div class="meter"><i style="width:${s.score}%"></i></div><code>${formatSignal(s)}</code><small>Target ${s.direction==='higher'?'≥':'≤'} ${s.target}${s.unit?` ${s.unit}`:''}</small></div><div class="trust"><b>${esc(s.trust)}</b><small>${s.gating?'May veto':'No veto'}</small></div><span class="status-chip ${s.status!=='present'?s.status:!s.passed?'fail':s.trust}">${s.waiver?'waived':s.status==='present'?(s.passed?'passing':'failing'):s.status}</span></article>`).join('');
  const select=fragment.querySelector('#signal-select');select.innerHTML=app.signals.map(s=>`<option value="${s.id}">${esc(s.label)}</option>`).join('');
  fragment.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>{const signalId=select.value;if(button.dataset.action==='waive'||button.dataset.action==='threshold')openForm(button.dataset.action,signalId);else act(button.dataset.action,signalId);}));
  fragment.querySelectorAll('[data-inspect]').forEach(button=>button.addEventListener('click',()=>openInspector(button.dataset.inspect)));
  fragment.querySelector('.download-btn').href=`/api/apps/${app.id}/attestation`;
  fragment.querySelector('.history').innerHTML=[...app.history].reverse().map((h,i)=>`<article class="history-card ${i===0?'current':''}"><b>${label(h.outcome)}</b><small>${new Date(h.at).toLocaleString()} · ${label(h.cause)}</small><code>${esc(h.decisionId)}</code>${h.supersedes?`<small>Supersedes ${esc(h.supersedes)}</small>`:''}</article>`).join('');
  detail.replaceChildren(fragment);
}

function inspectionPayload(stage){const a=state.selected;
  if(stage==='raw')return{stage:'RAW EVIDENCE',title:'Canonical signal envelopes',description:'Source measurements before trust, completeness, or policy interpretation.',data:{schema_version:'1.2.0',correlation_key:a.change,signals:a.signals.map(s=>({signal_id:s.signalId,occurred_at:s.occurredAt,received_at:s.receivedAt,subject:{digest:s.subject},producer:{tool:s.source,run_url:`https://example.invalid/runs/${s.signalId}`},category:s.category,check_id:s.id,measurement:{kind:s.kind,value:s.raw,unit:s.unit,threshold:{op:s.direction==='higher'?'>=':'<=',value:s.target}},outcome:s.status!=='present'?s.status:s.passed?'pass':'fail',waiver:s.waiver,expires_at:null}))}};
  if(stage==='transformed')return{stage:'ASSEMBLED EVIDENCE',title:'Policy-ready transformations',description:'Normalized measurements enriched with trust, status, inherited subject identity, and gating authority.',data:{decision_id:a.decisionId,policy_digest:a.policyDigest,signals:a.signals.map(s=>({check_id:s.id,input:{value:s.raw,unit:s.unit},transformation:s.transform,measurement_kind:s.kind,normalized_confidence:s.score,trust:{state:s.trust,gating:s.gating},completeness:s.status,requirement:`${s.direction==='higher'?'>=':'<='} ${s.target}${s.unit?` ${s.unit}`:''}`,passed:s.passed,subject:s.subject}))}};
  return{stage:'POLICY ENGINE',title:'Named policy results',description:'The aggregate score is informational. Only explicit rule results determine the outcome.',data:{policy:{id:`${a.id}-quality-gate`,name:a.policy.title,digest:a.policyDigest,mode:a.mode},outcome:a.outcome,raw_outcome:a.rawOutcome,mode_downgraded:a.modeDowngraded,reasons:a.rules,evidence_completeness:a.completeness,degraded:a.degraded}};
}
async function openInspector(stage){modalForm.innerHTML='';let p;if(stage==='attestation'){const response=await fetch(`/api/apps/${state.selected.id}/attestation`);p={stage:'SIGNED ARTEFACT',title:'SLSA-style verification summary',description:'Demonstration DSSE envelope bound to the subject and exact policy digest. The signature is explicitly non-production.',data:await response.json()};}else p=inspectionPayload(stage);document.querySelector('#modal-stage').textContent=p.stage;document.querySelector('#modal-title').textContent=p.title;document.querySelector('#modal-description').textContent=p.description;modalJson.textContent=JSON.stringify(p.data,null,2);document.querySelector('#copy-status').textContent='';inspector.showModal();}

function openForm(type,signalId){const signal=state.selected.signals.find(s=>s.id===signalId);document.querySelector('#modal-stage').textContent=type==='waive'?'OPENVEX-STYLE EXCEPTION':'POLICY FEDERATION';document.querySelector('#modal-title').textContent=type==='waive'?'Add temporary waiver':'Edit team threshold';document.querySelector('#modal-description').textContent=type==='waive'?'A waiver remains visible, must have an owner and expiry, and downgrades the finding to a warning.':'Teams may tighten freely; unsafe loosening is clamped to the organization floor and reported.';modalJson.textContent='';modalForm.innerHTML=type==='waive'?`<form class="form-card" id="action-form"><label>Technical justification<input name="justification" value="vulnerable_code_not_in_execute_path" required></label><label>Owner<input name="owner" value="${esc(state.selected.owner)}" required></label><label>Ticket<input name="ticket" value="CQP-POC" required></label><button>Apply waiver</button></form>`:`<form class="form-card" id="action-form"><label>Requested threshold for ${esc(signal.label)}<input name="value" type="number" step="any" value="${signal.target}" required></label><small>Current organizational baseline: ${signal.target} ${esc(signal.unit)}</small><button>Apply threshold</button></form>`;inspector.showModal();document.querySelector('#action-form').addEventListener('submit',async e=>{e.preventDefault();const payload=Object.fromEntries(new FormData(e.currentTarget));inspector.close();await act(type,signalId,payload);});}

async function act(action,signalId,extra={}){if(state.busy)return;state.busy=true;detail.classList.add('is-busy');try{const response=await fetch(`/api/apps/${state.selected.id}/action`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,signalId,...extra})});const result=await response.json();if(!response.ok)throw Error(result.error||'Action failed');state.selected=result;state.apps=state.apps.map(a=>a.id===result.id?result:a);renderList();renderDetail();}catch(error){alert(error.message);}finally{state.busy=false;detail.classList.remove('is-busy');}}
async function load(preferredId){detail.innerHTML='<div class="loading">Assembling evidence…</div>';const response=await fetch('/api/apps');state.apps=await response.json();state.selected=state.apps.find(a=>a.id===preferredId)||state.apps[0];document.querySelector('#app-count').textContent=state.apps.length;document.querySelector('#signal-count').textContent=state.apps.reduce((n,a)=>n+a.signals.length,0);document.querySelector('#updated').textContent=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});renderList();renderDetail();}

async function resetDemoMemory(){
  const confirmed=window.confirm('Reset the entire demo? This clears all simulations, waivers, custom thresholds, trust changes, and decision history for every application.');
  if(!confirmed)return;
  const button=document.querySelector('#reset-memory');button.disabled=true;button.textContent='Resetting…';
  try{const response=await fetch('/api/reset',{method:'POST'});if(!response.ok)throw Error('Reset failed');const result=await response.json();state.apps=result.apps;state.selected=state.apps.find(app=>app.id===state.selected?.id)||state.apps[0];renderList();renderDetail();selectTab('home');}
  catch(error){alert(error.message);}
  finally{button.disabled=false;button.textContent='Reset demo';}
}
list.addEventListener('click',e=>{const button=e.target.closest('[data-id]');if(!button)return;state.selected=state.apps.find(a=>a.id===button.dataset.id);renderList();renderDetail();});document.querySelector('#refresh').addEventListener('click',()=>load(state.selected?.id));document.querySelector('#reset-memory').addEventListener('click',resetDemoMemory);document.querySelector('.modal-close').addEventListener('click',()=>inspector.close());document.querySelector('.modal-done').addEventListener('click',()=>inspector.close());inspector.addEventListener('click',e=>{if(e.target===inspector)inspector.close();});document.querySelector('#copy-json').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(modalJson.textContent);document.querySelector('#copy-status').textContent='Copied to clipboard';}catch{document.querySelector('#copy-status').textContent='Select and copy manually';}});mountDecisionConstruction();selectTab(location.hash.slice(1)||'home',false);load();
