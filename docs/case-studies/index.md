# Case Studies

**Engineering decisions across AI-assisted delivery, enterprise architecture, modernization, performance, and system integration.**

Each case study focuses on the decision process: context, constraints, options, trade-offs, implementation strategy, evidence, and outcome. The goal is not to present architecture as a diagram collection, but to show how technical decisions are made under real delivery constraints.

---

## AI-Assisted Engineering

### [AI-Assisted Engineering Governance](./ai-assisted-engineering-governance)

**Domain:** AI-assisted SDLC · Engineering Governance · Developer Productivity  
**Pattern:** Repository-native control protocol · Human approval gate  
**Status:** Active reference implementation

AI coding agents can implement changes quickly, but trustworthy delivery still requires explicit scope, repeatable verification, independent review, and accountable approval. This case study documents a lightweight control protocol built around GitHub Issues, task contracts, pull requests, deterministic checks, three review rounds, gate evaluation, and human merge authority.

**Key decisions:** Protocol vs dedicated control-plane platform · deterministic checks vs AI-only verification · single review vs three independent review purposes

---

## Migration & Cloud

### [Legacy Java System Migration to AWS Cloud](./legacy-java-aws-migration)

**Domain:** Cloud Migration · Re-platforming · Database Migration  
**Stack:** Java EE 6 / JBoss AS 7.1 · Oracle 11g → AWS ECS Fargate · Aurora PostgreSQL  
**Scale:** 800K monthly transactions · 15-year-old system · 18-month migration

A regional insurance company's Java EE 6 monolith on aging on-premise hardware. Three migration paths were evaluated: lift-and-shift, containerization, and microservices decomposition.

**Key decisions:** ECS vs EC2 vs EKS · Oracle vs Aurora PostgreSQL · phased migration vs big-bang cutover

---

### [Enterprise Architecture Redesign — Monolith to Modular](./enterprise-architecture-redesign)

**Domain:** Architecture Redesign · Domain-Driven Design · Modular Decomposition  
**Stack:** Spring MVC monolith · PostgreSQL → Modular Spring Boot · Event-driven integration  
**Scale:** 600K LOC · 4 development teams · 8-week release cycle → 2-week cycle

A growing Java Spring MVC monolith had created release conflicts, slow test cycles, and coupling across teams. Full microservices decomposition was evaluated but rejected in favor of a modular-monolith-first strategy.

**Key decisions:** Microservices vs modular monolith · bounded-context decomposition · event-driven integration

---

## Performance Engineering

### [SQL Performance Optimization — Oracle & PostgreSQL](./sql-performance-optimization)

**Domain:** Database Performance · Query Optimization · Index Strategy  
**Stack:** Oracle · PostgreSQL  
**Measured result:** Critical 5-table join over 3M records: 30 min → 5 min

This case study documents the diagnostic and optimization process across execution plans, index strategy, query rewriting, and data-access design.

**Key techniques:** Composite indexes · execution-plan analysis · query rewriting · partition strategy

---

## Integration & Architecture

### [Multi-Technology System Integration](./multi-technology-integration)

**Domain:** System Integration · API Design · Authentication Unification  
**Stack:** React · Vue.js · Java Spring Boot · Python FastAPI · AWS API Gateway

A heterogeneous enterprise environment required integration across multiple technology stacks and independently evolved client applications.

**Key decisions:** GraphQL federation vs BFF · API gateway routing · authentication consolidation

---

### [Technical Bidding & Solution Proposal](./technical-bidding)

**Domain:** Solution Architecture · RFP Response · Build vs Buy Evaluation  
**Stack:** Java · Mendix · Python · React

This case study focuses on structured architecture evaluation under delivery, cost, lock-in, and organizational constraints.

**Key decisions:** Low-code vs custom build · monolith vs microservices · delivery speed vs long-term flexibility

---

## Decision Framework

Most case studies use the same reasoning structure:

| Stage | Question |
|---|---|
| **Context** | What business and engineering problem actually needs to be solved? |
| **Constraints** | What limits the available solution space? |
| **Options** | What credible alternatives exist? |
| **Trade-offs** | What does each option improve, cost, or risk? |
| **Decision** | Why is the selected option the best fit for this context? |
| **Implementation** | How can the decision be introduced safely and incrementally? |
| **Evidence** | What deterministic or production evidence supports the result? |
| **Outcome** | What changed, and what remains intentionally unresolved? |
