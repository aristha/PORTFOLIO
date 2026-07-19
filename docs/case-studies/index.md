# Case Studies

**Enterprise Architecture Decision Records — documented system transformations, performance engineering, and cross-technology integration.**

Each case study follows a consistent structure: business context, existing system analysis, structured option evaluation, final architecture decision, implementation strategy, and production outcome.

---

## Migration & Cloud

### [Legacy Java System Migration to AWS Cloud](./legacy-java-aws-migration)

**Domain:** Cloud Migration · Re-platforming · Database Migration  
**Stack:** Java EE 6 / JBoss AS 7.1 · Oracle 11g → AWS ECS Fargate · Aurora PostgreSQL  
**Scale:** 800K monthly transactions · 15-year-old system · 18-month migration

A regional insurance company's Java EE 6 monolith on aging on-premise hardware. The infrastructure contract was approaching end-of-life and horizontal scaling was impossible without significant capital investment. Three migration paths were evaluated: lift-and-shift (rehost), containerization (re-platform), and microservices decomposition (re-architect). The selected path, its implementation phasing, and the strangler fig pattern applied are documented in full.

**Key decisions:** ECS vs EC2 vs EKS · Oracle vs Aurora PostgreSQL · phased migration vs big-bang cutover

---

### [Enterprise Architecture Redesign — Monolith to Modular](./enterprise-architecture-redesign)

**Domain:** Architecture Redesign · Domain-Driven Design · Modular Decomposition  
**Stack:** Spring MVC monolith · PostgreSQL → Modular Spring Boot · Event-driven integration  
**Scale:** 600K LOC · 4 development teams · 8-week release cycle → 2-week cycle

A B2B SaaS company's five-year-old Java Spring MVC monolith had grown to a size where four development teams were consistently blocked by deployment conflicts, slow test suites, and inability to scale individual capabilities independently. Full microservices decomposition was evaluated but rejected in favor of a modular monolith-first strategy. The domain decomposition, bounded context identification, and selective service extraction path are fully documented.

**Key decisions:** Microservices vs modular monolith · domain decomposition strategy · event-driven integration patterns

---

## Performance Engineering

### [SQL Performance Optimization — Oracle & PostgreSQL](./sql-performance-optimization)

**Domain:** Database Performance · Query Optimization · Index Strategy  
**Stack:** Oracle 12c · PostgreSQL 13  
**Improvement:** Regulatory report query: 45 min → 2.8 min · Nightly batch: 8 hours → 1.2 hours

A financial services firm's quarterly regulatory reporting system was generating queries that locked critical transactional tables for extended periods. Nightly batch processing was routinely running beyond its window and causing morning operational failures. This case study documents the full diagnostic process — AWR report analysis, execution plan interpretation, wait event identification — and the specific optimization techniques applied at each layer.

**Key techniques:** Composite index design · partition pruning · materialized views · query rewriting · EXPLAIN ANALYZE

---

## Integration & Architecture

### [Multi-Technology System Integration](./multi-technology-integration)

**Domain:** System Integration · API Design · Authentication Unification  
**Stack:** React · Vue.js · Java Spring Boot · Python FastAPI · AWS API Gateway  
**Problem:** Four independently built systems with fragmented authentication and duplicate API logic

A retail enterprise had separate development teams deliver a React customer portal, a Vue.js administration panel, a Java Spring Boot core API, and a Python FastAPI ML recommendation service — each with its own authentication mechanism and partial API duplication. The integration redesign consolidated authentication under OAuth 2.0/OIDC, introduced Backend-for-Frontend services per client type, and unified API contracts under OpenAPI 3.x.

**Key decisions:** GraphQL federation vs BFF pattern · API Gateway routing strategy · Keycloak vs AWS Cognito

---

### [Technical Bidding & Solution Proposal](./technical-bidding)

**Domain:** Solution Architecture · RFP Response · Build vs Buy Evaluation  
**Stack:** Java microservices · Mendix · Python FastAPI · React  
**Context:** Government digital transformation — citizen services portal for 2M users

A government agency issued an RFP for a citizen services platform: 50+ digitized forms, document management, workflow engine, and reporting. Three competing architecture proposals were evaluated: Mendix (full low-code), custom Java microservices, and a hybrid Python/React stack. The case study documents the evaluation matrix, vendor lock-in risk analysis, total cost of ownership modeling, and the hybrid architecture recommendation submitted.

**Key decisions:** Mendix vs custom Java · monolith vs microservices for government scale · vendor lock-in vs delivery speed

---

## Case Study Format

All case studies follow this structure:

| Section | Content |
|---------|---------|
| **A. Business Context** | Enterprise problem, change drivers, business constraints |
| **B. Existing System Analysis** | Current architecture, technical limitations, bottlenecks |
| **C. Solution Evaluation** | Three options with pros, cons, risk, cost, and scalability impact |
| **D. Final Architecture Decision** | Decision rationale, rejected options, architectural principles applied |
| **E. System Architecture Design** | Component breakdown, data flow, integration points |
| **F. Migration / Implementation Strategy** | Phased plan, risk mitigation, rollout strategy |
| **G. Performance Optimization** | SQL tuning, caching, query optimization (where applicable) |
| **H. Trade-offs & Engineering Decisions** | Complexity introduced, sacrifices made, long-term implications |
| **I. Production Outcome** | System improvement, performance gains, business impact |
