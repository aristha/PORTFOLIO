# AI-Assisted Engineering Governance

**Domain:** AI-assisted SDLC · Engineering Governance · Developer Productivity  
**Pattern:** Repository-native control model · Human approval boundary  
**Status:** Active engineering experiment

> **Public-scope note:** This page describes the architecture and engineering principles of an active private reference implementation. Internal schemas, procedure names, policy details, and gate-state definitions are intentionally omitted.

AI coding agents can generate changes quickly, but generation speed alone does not make a delivery process trustworthy. The engineering problem is whether an AI-assisted change is **bounded, verifiable, independently challenged, and approved by an accountable human**.

This case study focuses on the public architecture of that control model rather than its private implementation details.

---

## A. Problem

A simple AI coding flow often looks like this:

```text
Requirement
   ↓
AI coding agent
   ↓
Generated change
   ↓
Human review
   ↓
Merge
```

This is fast, but several controls can remain implicit:

- scope may expand beyond the original intent
- verification may rely too heavily on the same agent that implemented the change
- architecture, security, maintainability, and requirement compliance may collapse into one broad review
- the authority boundary between automation and human approval may be unclear

The target is therefore not a more autonomous coding agent. It is a **small control protocol around AI-assisted work**.

---

## B. Design Principles

### 1. AI assists execution; humans retain authority

AI may inspect, implement, test, and review within an explicitly bounded task. It does not own the final merge decision.

### 2. Scope is defined before implementation

Each change begins with an explicit work contract that captures enough information to answer:

- what outcome is required?
- what is inside and outside scope?
- what evidence is required?
- who has final approval authority?

The exact internal schema is intentionally kept outside this public case study.

### 3. Deterministic evidence comes before confidence claims

Where a claim can be verified by a repeatable check, that evidence should be preferred over statements such as “the change looks correct.”

Typical evidence includes:

- automated tests
- builds
- linting and type checks
- contract or policy checks
- expected-change verification

AI reasoning supplements deterministic evidence; it does not replace it.

### 4. Review has independent purposes

A single broad review prompt is easy to satisfy superficially. The model therefore separates review concerns so that the change is challenged from multiple engineering perspectives, including:

- requirement and contract fit
- engineering quality and risk
- hidden assumptions and adversarial failure modes

The implementation uses structured review stages, while the exact internal review schema remains private.

### 5. Human approval is a real authority boundary

Automation can summarize evidence and recommend readiness, but the final decision remains with the accountable reviewer.

---

## C. Public Architecture

The public control flow is:

```text
Requirement / Issue
      ↓
Bounded Work Contract
      ↓
AI-Assisted Implementation
      ↓
Deterministic Evidence
      ↓
Independent Engineering Review
      ↓
Readiness Evaluation
      ↓
Human Approve / Reject
```

The repository remains the primary engineering system of record.

| Artifact | Public responsibility |
|---|---|
| **Issue / requirement** | Why the change exists |
| **Work contract** | Scope, acceptance intent, evidence expectations |
| **Pull request** | Proposed implementation and review surface |
| **CI checks** | Repeatable technical evidence |
| **Review evidence** | Engineering challenge and risk assessment |
| **Human decision** | Final approval authority |

This allows the control model to be tested inside the workflow engineers already use rather than requiring a new orchestration platform first.

---

## D. Architecture Decision: Protocol Before Platform

Two broad directions were considered.

### Option 1 — Dedicated control-plane platform first

A separate service could eventually provide:

- dashboards
- cross-repository reporting
- agent orchestration
- centralized policies
- audit history

The risk is building substantial platform infrastructure before proving which controls are actually valuable in day-to-day engineering work.

### Option 2 — Repository-native protocol first

Use existing engineering primitives—issues, pull requests, CI, review evidence, and human approval—and add only the minimum control layer.

**Advantages**

- low adoption cost
- evidence remains close to the code
- avoids a second source of truth
- can be exercised on real repository changes
- allows the protocol to evolve before platformization

**Decision:** validate the protocol first.

A broader engineering control plane remains a possible future direction, but only where repeated usage demonstrates that repository-native controls are no longer sufficient.

---

## E. Trust Model

The model combines three different evidence layers.

### Deterministic evidence

Evidence that can be repeated by another engineer or CI system.

Examples:

- tests pass
- build passes
- required checks pass
- unexpected files were not modified

### Reasoned engineering review

Evidence that requires technical judgment.

Examples:

- architecture fit
- dependency impact
- security and operational risk
- maintainability
- hidden assumptions

### Human accountability

The human reviewer retains authority to:

- approve
- reject
- request rework
- require additional evidence

The objective is not a ceremonial “human in the loop.” It is **human authority supported by better evidence**.

---

## F. Current Outcome

The active reference implementation demonstrates that an AI governance layer can remain relatively small while making important controls explicit:

- scope is bounded before implementation
- deterministic verification is separated from subjective review
- review is independently structured
- readiness is evaluated before merge
- final authority remains human

This is an active engineering experiment, not a claim of universal process maturity.

The next useful evidence will come from repeated use across different kinds of changes and from measuring where the protocol reduces ambiguity, rework, or unsafe automation behavior.

---

## G. Next Evolution

The evolution remains evidence-driven:

1. Apply the model across different change types.
2. Capture recurring friction and failure modes.
3. Refine work-contract and review boundaries.
4. Add policy automation only where repeated evidence justifies it.
5. Evaluate whether cross-repository reporting or orchestration warrants a separate control-plane service.

The public design principle is:

> **AI accelerates implementation. Deterministic checks create evidence. Independent review challenges the change. Humans retain authority.**

---

## Engineering Takeaway

The useful question is not only:

> “Can an AI agent write this code?”

It is:

> “What evidence and authority boundaries make this AI-assisted change safe to approve?”

That shift turns AI coding from a generation problem into an engineering governance problem.
