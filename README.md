# CQP - Relay

A focused Continuous Quality Platform proof of concept that turns heterogeneous engineering evidence into an explainable delivery decision.

The demo observes and evaluates evidence. It does not schedule tests, own runners, or replace existing CI/CD, security, testing, deployment, or observability systems.

## What the project demonstrates

- Canonical quality signals from different tools and measurement types
- Immutable subject correlation across commit, build, artifact, deployment, and production
- Explicit evidence completeness: present, pending, required missing, expired, and producer outage
- Signal trust: active, quarantined, and disabled
- Versioned policy with organization floors, service-tier defaults, and team overrides
- Separate raw and enforced outcomes
- Observe, Warn, and Enforce rollout modes
- Visible, owned, expiring waivers
- Append-only decision history and demonstration attestations

## Run locally

Requirements: Node.js 18 or newer.

```bash
npm install
npm start
```

Open `http://127.0.0.1:3000`.

## Recommended walkthrough

### 1. Understand the architecture

Open **Flow Charts** and review these components in order:

1. Gateway + Adapter
2. Evidence Assembler
3. Policy Decision

Each section contains overview and detailed flows plus representative JSON outputs.

### 2. Inspect a baseline decision

Open **Decision Lab**, select an application, and review:

- Enforced and raw outcomes
- Subject chain
- Evidence completeness
- Named policy rules
- Canonical signals and trust states
- Decision history

Use the JSON buttons to inspect raw evidence, transformed evidence, rule results, and the demonstration attestation.

### 3. Run Decision Lab scenarios

Change one selected signal at a time:

| Action | Demonstrates | Expected behavior |
| --- | --- | --- |
| Fail threshold | Trusted blocking rule | Raw outcome becomes blocked |
| Mark pending | Long-running asynchronous evidence | Require additional validation |
| Result arrives | Late evidence and reevaluation | A new decision is appended |
| Producer outage | Explicit absence and degraded operation | Risk-specific fail-open or fail-closed behavior |
| Conflicting retry | Flaky-check trust management | Check is quarantined and loses its veto |
| Add waiver | Owned and expiring exception | Failure remains visible as a warning |
| Edit threshold | Team autonomy with central floors | Unsafe loosening is clamped and explained |
| Severe regression | Production evidence | A superseding decision records the changed evidence |

### 4. Compare enforcement modes

Repeat a failing scenario in each mode:

- **Observe:** record the technical result while allowing delivery to proceed.
- **Warn:** continue with a visible warning.
- **Enforce:** apply the raw policy outcome to the pipeline.

The raw technical conclusion remains visible in every mode.

### 5. Inspect the decision ledger

Every simulation appends a decision. Earlier decisions remain available and include supersession pointers, preserving what the platform believed at each point in time.

### 6. Reset the demo

Select **Reset demo** before handing the application to another reviewer. Reset restores:

- Signal values and statuses
- Trust and quarantine states
- Waivers
- Team threshold changes
- Enforcement modes
- Decision history

Restarting the server also resets the in-memory state.

## Important concepts

- **Signal:** one quality observation from a tool.
- **Subject:** the exact immutable software object being evaluated.
- **Subject chain:** commit to build to artifact to deployment to production window.
- **Evidence Assembler:** correlates applicable evidence and resolves time, freshness, and absence.
- **Trust:** determines whether a signal is permitted to veto delivery.
- **Rulebook:** versioned policy that turns evidence into named rule results.
- **Raw outcome:** what the technical rules concluded.
- **Enforced outcome:** what the current rollout mode allows the pipeline to do.
- **Waiver:** an owned and expiring exception that remains visible.

## Limitations

- Evidence, outcomes, outages, and signatures are simulated.
- Runtime state is stored in memory.
- Attestation signatures are demonstrative, not production cryptography.
- The POC does not include production identity, authorization, durable storage, real signing infrastructure, or CI/CD integrations.
- It demonstrates the decision architecture, not test execution.

## Tests

```bash
npm test
```

The automated suite validates decision behavior, evidence completeness, enforcement modes, outages, quarantine, waivers, thresholds, history, and attestations.
