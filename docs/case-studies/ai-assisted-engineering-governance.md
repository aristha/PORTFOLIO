# AI-Assisted Engineering Governance

**Domain:** AI-assisted SDLC · Engineering Governance · Developer Productivity  
**Pattern:** Repository-native control protocol · Human approval gate  
**Status:** Active reference implementation

AI coding agents can generate changes quickly, but speed alone does not make a delivery process trustworthy. The central engineering problem is not whether an agent can produce syntactically valid code; it is whether the change is bounded, verifiable, reviewable, and ultimately approved by an accountable human.

This case study documents a lightweight governance model for AI-assisted software delivery. The implementation is intentionally repository-native: GitHub Issues, task contracts, pull requests, deterministic checks, independent review rounds, and a human merge decision form the control plane.

---

## A. Problem

A conventional AI coding workflow often looks like this:

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

This is fast, but several controls are implicit:

- The agent may interpret scope more broadly than intended.
- Verification may depend on the agent's own judgment.
- Review can become a single-pass confirmation exercise.
- Architecture, security, maintainability, and requirement compliance can be mixed into one vague approval step.
- The final authority boundary between AI and human can be unclear.

The desired target was not a larger autonomous agent. It was a **small engineering protocol that constrains agent authority and produces evidence before human approval**.

---

## B. Design Principles

The protocol was shaped around five rules.

### 1. AI agents are workers, not authorities

Agents may inspect, implement, test, and review within an assigned scope. They do not own the final merge decision.

### 2. Scope must be explicit before implementation

Each unit of work begins with a task contract describing:

- goal
- allowed scope
- forbidden scope
- acceptance criteria
- deterministic verification
- authority boundary

This makes the task reviewable before code generation begins.

### 3. Verification should be deterministic where possible

Claims such as "the change looks correct" are weak evidence. The workflow prefers repeatable checks:

- tests
- linting
- type checks
- build verification
- contract checks
- repository policy checks

AI reasoning supplements these checks; it does not replace them.

### 4. Review should have independent purposes

A single broad review prompt tends to collapse concerns. The control protocol separates review into three rounds:

1. **Contract & Deterministic Compliance**  
   Does the change satisfy the requested contract and required checks?

2. **Engineering Quality & Risk**  
   Is the implementation maintainable, secure, appropriately designed, and operationally safe?

3. **Adversarial Final Challenge**  
   What assumptions could still be wrong? What failure mode or hidden impact has not been sufficiently challenged?

### 5. Human approval remains the final gate

The workflow may produce a recommendation such as:

```text
READY_FOR_HUMAN_APPROVAL
BLOCKED
FAILED
```

Only the human reviewer decides whether the change is merged.

---

## C. Repository-Native Architecture

The current reference flow is:

```text
GitHub Issue
    ↓
Task Contract
    ↓
Bounded Implementation
    ↓
Pull Request
    ↓
Deterministic Verification
    ↓
Review Round 1
Contract & Compliance
    ↓
Review Round 2
Engineering Quality & Risk
    ↓
Review Round 3
Adversarial Challenge
    ↓
Gate Evaluation
    ↓
Human Approve / Reject
```

The repository itself is the primary system of record.

| Artifact | Responsibility |
|---|---|
| **GitHub Issue** | Committed work item and business/engineering context |
| **Task Contract** | Goal, scope, verification, and authority boundary |
| **Pull Request** | Proposed implementation and review evidence |
| **GitHub Actions** | Deterministic verification |
| **Review reports** | Independent engineering assessment |
| **Gate result** | Consolidated readiness state |
| **Human reviewer** | Final merge authority |

This avoids introducing another platform before the process itself is proven useful.

---

## D. Key Architecture Decision: Protocol Before Platform

Two approaches were considered.

### Option 1 — Build a dedicated AI engineering control plane first

A standalone service could provide dashboards, orchestration, agent routing, policy management, and audit history.

**Advantages**

- richer visualization
- centralized governance
- easier cross-repository reporting

**Risks**

- significant platform work before validating the underlying workflow
- duplicate state between GitHub and the control plane
- integration complexity
- risk of solving orchestration before proving the control protocol

### Option 2 — Start with a repository-native protocol

Use the tools already present in the engineering workflow and add only the minimum control layer.

**Advantages**

- low adoption cost
- review evidence lives next to the code
- no second source of truth
- easy to dogfood on real repository changes
- protocol can evolve before platformization

**Decision:** Start with the repository-native protocol.

The broader control-plane concept remains a possible future direction, but only after repeated usage demonstrates which capabilities genuinely require a separate service.

---

## E. Reusable Agent Procedures

The control model is decomposed into reusable procedures rather than one large autonomous prompt:

```text
shape-work-item
      ↓
author-task-contract
      ↓
implement-bounded-change
      ↓
review-change
      ↓
evaluate-gate
```

Each procedure has a narrow responsibility.

This separation matters because the agent implementing a change should not implicitly redefine the task, weaken the verification criteria, and approve its own work in one uninterrupted context.

---

## F. Trust Model

The protocol deliberately combines three different kinds of trust evidence.

### Deterministic evidence

Examples:

- tests passed
- build passed
- lint passed
- expected files changed
- prohibited files unchanged

### Reasoned review evidence

Examples:

- architecture fit
- dependency impact
- security risk
- maintainability
- hidden assumptions
- operational consequences

### Human accountability

A human reviews the evidence and retains authority to:

- approve
- reject
- request another implementation
- override an automated readiness recommendation

The objective is not "human in the loop" as a ceremonial checkbox. The objective is **human authority supported by better evidence**.

---

## G. Current Outcome

The reference implementation demonstrates that a governance layer can remain small while still introducing meaningful control:

- work begins from an explicit contract
- implementation authority is bounded
- deterministic verification is separated from subjective review
- review is split into three independent purposes
- the final gate produces an explicit state
- merge authority remains human

The result is a more inspectable AI-assisted delivery flow without requiring a dedicated orchestration product.

This is an active engineering experiment rather than a claim of universal process maturity. The next value comes from repeated use on real changes and measurement of where the protocol reduces review ambiguity, rework, and unsafe agent behavior.

---

## H. Next Evolution

The next stages are intentionally evidence-driven:

1. Dogfood the protocol across different change types.
2. Measure recurring friction and failure modes.
3. Improve task-contract and review schemas.
4. Add policy checks only where repeated evidence justifies them.
5. Evaluate whether cross-repository reporting or orchestration warrants a separate control-plane service.

The design principle remains:

> **AI accelerates implementation. Deterministic checks create evidence. Independent review challenges the change. Humans retain authority.**

---

## Engineering Takeaway

The important shift is from asking:

> "Can an AI agent write this code?"

to asking:

> "What evidence and authority boundaries make this AI-assisted change safe to approve?"

That question turns AI coding from a generation problem into an engineering governance problem.
