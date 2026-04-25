# Enterprise Architecture Redesign — Monolith to Modular

**Domain:** Architecture Redesign · Domain-Driven Design · Modular Decomposition  
**Stack:** Java Spring MVC monolith · PostgreSQL → Modular Spring Boot · Event-driven integration (Kafka)  
**Scale:** 600K LOC · 4 development teams · 8-week release cycle  
**Pattern:** Modular monolith first · Selective service extraction · Strangler Fig · Domain-Driven Design

---

## A. Business Context

### The Enterprise Problem

A B2B SaaS company had been operating a Java Spring MVC monolith for five years. The system was the company's sole commercial product: an order management and inventory platform for mid-market retail clients. The monolith had grown to 600K lines of code across a single deployable WAR file with a shared PostgreSQL database.

Four development teams had been working inside the same codebase for the past two years. As the team count grew, the delivery system broke down:

- Release cycles had stretched from 2 weeks at founding to **8 weeks** — primarily due to merge conflict resolution, shared test environment scheduling, and cross-team release coordination
- **Deployment success rate** had dropped to 40% on first attempt — the remaining 60% of deployments required hotfixes or rollbacks within 24 hours
- Teams were **unable to scale independently**: a spike in order processing volume required scaling the entire application, including modules that were not under load
- Onboarding new developers took **6–8 weeks** — the codebase had no clear module boundaries, and understanding where a feature's code lived required traversing ~400 Spring beans and a 380-table PostgreSQL schema with no module-level segregation

### Why the System Needed Change

Beyond delivery metrics, the business had specific upcoming requirements that the monolith could not accommodate:

1. **Multi-tenancy isolation:** A key enterprise client required data isolation at the database level (not just row-level tenant filtering). This was impossible without module-level data ownership.
2. **Selective compliance scope:** The company was pursuing SOC 2 Type II. The auditor required the audit logging and access control scope to be demonstrably isolated from order processing. In the monolith, audit events were written in the same database transaction as business operations — making scope isolation impossible to demonstrate.
3. **Team autonomy for scaling:** The inventory team needed to deploy a new warehouse integration feature weekly. The 8-week shared release cycle was incompatible with that delivery pace.

### Business Constraints

| Constraint | Detail |
|-----------|--------|
| **No delivery freeze** | Product is in active use by 140+ enterprise clients. No extended freeze on feature releases. |
| **Team size** | 4 teams × 6 engineers each = 24 engineers total. No additional hiring approved. |
| **12-month transformation window** | Board had approved a 12-month architectural modernization budget. |
| **PostgreSQL as primary database** | No database technology change authorized (team expertise, client compliance requirements reference PostgreSQL). |
| **No client-visible API change** | External client REST API contracts must not change during the transformation. |

---

## B. Existing System Analysis

### Current Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│               Single Spring MVC WAR (Tomcat embedded)             │
│                                                                   │
│  ┌────────────┐ ┌──────────────┐ ┌───────────┐ ┌─────────────┐  │
│  │  Orders    │ │  Inventory   │ │   Users   │ │  Billing    │  │
│  │            │ │              │ │           │ │             │  │
│  │  ~160K LOC │ │  ~140K LOC   │ │  ~80K LOC │ │  ~110K LOC  │  │
│  └────┬───────┘ └──────┬───────┘ └─────┬─────┘ └──────┬──────┘  │
│       │                │               │               │          │
│  ┌────┴───────────────────────────────────────────┐    │          │
│  │              Shared Service Layer              │◄───┘          │
│  │  (utility beans, shared helpers, cross-domain  │               │
│  │   service calls via direct method invocation)  │               │
│  └────────────────────────┬───────────────────────┘               │
│                           │                                       │
│  ┌────────────────────────▼───────────────────────┐               │
│  │          Single PostgreSQL database            │               │
│  │          (~380 tables, shared schema)          │               │
│  │          All teams write to same schema        │               │
│  └────────────────────────────────────────────────┘               │
└───────────────────────────────────────────────────────────────────┘
```

### Technical Limitations

**Shared database with no module ownership:** All 380 tables lived in a single PostgreSQL schema. Orders tables had foreign key relationships to User tables, Billing tables, and Inventory tables. Changing the `orders` table structure required checking all foreign key relationships across the entire schema — including tables owned by other teams.

**Direct method invocation coupling:** The "shared service layer" allowed any module to call any other module's service beans directly — `orderService.createOrder()` directly called `inventoryService.reserveStock()` and `billingService.createInvoice()` as direct Java method calls within the same transaction. This created circular dependencies and made it impossible to deploy any module independently.

**Identified coupling violations (partial list):**

| From Module | Direct Calls To | Tables Directly Accessed |
|-------------|----------------|--------------------------|
| Orders | Inventory (3 services), Billing (2 services), Users (5 services) | 22 tables outside Orders schema |
| Inventory | Orders (2 services) | 8 tables outside Inventory schema |
| Billing | Orders (4 services), Users (3 services) | 18 tables outside Billing schema |

**Circular dependency:** Orders → Inventory → Orders (via `OrderInventoryReservationService`). This class alone had been the source of 7 production incidents in the past 12 months.

**Shared database migration risk:** Database schema migrations (Flyway) were a shared operation — a migration by the Inventory team could break the Orders team's JPQL queries if it renamed or dropped a column that both teams were reading.

### Bottlenecks

| Bottleneck | Measurable Impact |
|-----------|-------------------|
| **8-week release cycle** | Delivery velocity: 1.5 features/team/month |
| **40% deployment success rate** | ~10 hours/month per team in rollback and hotfix work |
| **Shared test environment** | Average 3-day wait for exclusive integration test environment access |
| **Monolith cold start** | 4.5 minutes cold start time on deploy |
| **Full test suite execution** | 87 minutes — run in full on every merge to main |

---

## C. Solution Evaluation

### Option 1 — Monolith Optimization (No Structural Change)

Add module-level conventions, enforce package visibility rules, and add code analysis (ArchUnit) to prevent further coupling growth. Improve CI/CD pipeline to reduce deployment friction.

**Pros:**
- Immediate, low-risk implementation
- No architectural change required
- Reduces future coupling growth via enforcement
- CI/CD improvements (parallel test execution, deployment automation) could reduce release cycle

**Cons:**
- Does not address existing 600K LOC of coupling violations — enforcement prevents growth but does not repair what exists
- Does not enable independent team deployments
- Does not solve multi-tenancy isolation or SOC 2 scope isolation requirements
- Deployment success rate improvement would be marginal — root cause is coupling, not process
- Does not address the team onboarding problem (no clear module boundaries in code)

**Risk:** Low  
**Cost:** 1–2 months  
**Scalability Impact:** None

---

### Option 2 — Modular Monolith (Module-Level Boundaries, Shared Deployment)

Restructure the monolith into explicitly bounded modules with enforced API contracts between them, while remaining a single deployable unit. Each module owns its own database tables (enforced through schema prefixes and package-level data source routing). Inter-module communication moves from direct method invocation to explicit API interfaces (Java interfaces, not HTTP). A separate module governance layer prevents direct cross-module persistence access.

**Pros:**
- Maintains single deployment unit — no distributed system complexity introduced
- Module boundaries can be enforced incrementally (ArchUnit rules added module by module)
- Database table ownership established via schema prefix convention without actual schema separation
- Enables per-module test suites — partial test execution (only changed modules) reduces CI time
- Directly enables team autonomy and onboarding clarity
- Creates the prerequisite structure for selective service extraction if needed later
- SOC 2 scope isolation achievable: audit module becomes a first-class bounded context with no shared tables

**Cons:**
- Still a shared deployment — one module's startup failure blocks all modules
- Database schema prefix convention requires migration effort (Flyway migrations to rename tables)
- Auto-scaling is still per-deployment, not per-module
- Requires significant codebase restructuring — high upfront coordination

**Risk:** Medium  
**Cost:** 6–9 months  
**Scalability Impact:** Medium — selective service extraction enabled as next step

---

### Option 3 — Full Microservices Decomposition

Extract each domain (Orders, Inventory, Users, Billing) into an independently deployable Spring Boot service with its own database. Inter-service communication via REST or gRPC. Event-driven integration via Kafka for asynchronous operations.

**Pros:**
- Maximum team autonomy and independent deployability
- Per-service scaling
- Technology heterogeneity possible
- Eliminates all shared state between domains

**Cons:**
- Distributed transaction management required: the current `createOrder()` → `reserveStock()` → `createInvoice()` is a synchronous multi-step operation across three domains in a single ACID transaction. Replacing with saga pattern is a significant design effort.
- Data migration: 380 tables must be partitioned across 4+ databases — high risk of data integrity errors during migration
- Operational complexity: 4 services × 2 environments × 3 configurations = significant ops burden for a 24-person team with no existing microservices operational experience
- 18–24 months to completion — exceeds the 12-month authorized window
- Risk of partial decomposition: system left split across monolith + partial services for 12+ months is the worst state to be in

**Risk:** High  
**Cost:** 18–24 months, requires significant new tooling (service mesh, distributed tracing, saga orchestrator)  
**Scalability Impact:** Maximum, but not achievable within constraints

---

## D. Final Architecture Decision

**Decision: Option 2 — Modular Monolith, with Selective Service Extraction for Specific Bounded Contexts**

### Why This Was Chosen

Option 2 solves the four primary business problems:
1. **Release cycle:** Module-level CI and independent test suites reduce cycle time
2. **Deployment success rate:** Module-level ownership and ArchUnit-enforced boundaries reduce the cross-module coupling that causes deployment failures
3. **SOC 2 scope isolation:** Audit module becomes a first-class bounded context with controlled write access
4. **Onboarding time:** Clear package structure with ArchUnit-enforced module contracts gives new developers an explicit map of the system

Full microservices (Option 3) is the correct long-term architecture. But attempting it now would:
- Require distributed saga orchestration for the `createOrder` workflow — a complex design problem that would consume the entire 12-month window before any team autonomy improvement is delivered
- Leave 24 engineers operating a system split across monolith and services simultaneously — the most difficult operational state

**Selective service extraction** of specific bounded contexts is included in the decision: two domains are appropriate for immediate extraction as services because they have minimal inbound synchronous dependencies:

1. **Notification Service** — receives events, sends emails/SMS. No other module calls it synchronously. Clean extraction candidate.
2. **Reporting Service** — read-only analytical queries against a read replica. No write operations. Extraction removes the reporting read load from the primary OLTP database.

These two are extracted as services in Phase 3. Orders, Inventory, Users, and Billing remain in the modular monolith.

### Architectural Principles Applied

- **Incremental, reversible steps:** Each phase leaves the system in a stable, production-ready state
- **Bounded contexts before service boundaries:** Domain clarity must precede physical separation. Rushing to services before understanding the domain produces the wrong service boundaries, which are expensive to fix
- **Event-driven decoupling at the right boundaries:** Notifications are genuinely asynchronous — domain events published to Kafka are appropriate. Inventory reservation is synchronous business logic — event-driven is not appropriate there
- **ArchUnit as architecture tests:** Module boundaries enforced via automated tests in the build pipeline — not documentation or team agreement

---

## E. System Architecture Design

### Target Architecture — Modular Monolith

```
┌───────────────────────────────────────────────────────────────────┐
│         Modular Spring Boot (single deployable JAR)               │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │               Module API Layer (public interfaces)          │  │
│  │  OrdersApi  │  InventoryApi  │  UsersApi  │  BillingApi     │  │
│  └──────┬──────┴───────┬────────┴─────┬──────┴────────┬────────┘  │
│         │              │              │               │            │
│  ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐ ┌──▼─────────┐  │
│  │  orders.*   │ │ inventory.* │ │   users.*   │ │ billing.*  │  │
│  │             │ │             │ │             │ │            │  │
│  │  Internal   │ │  Internal   │ │  Internal   │ │  Internal  │  │
│  │  service    │ │  service    │ │  service    │ │  service   │  │
│  │  impl +     │ │  impl +     │ │  impl +     │ │  impl +    │  │
│  │  repos      │ │  repos      │ │  repos      │ │  repos     │  │
│  │             │ │             │ │             │ │            │  │
│  │  Schema:    │ │  Schema:    │ │  Schema:    │ │  Schema:   │  │
│  │  ord_*      │ │  inv_*      │ │  usr_*      │ │  bil_*     │  │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──┬─────────┘  │
│         └───────────────┼───────────────┼────────────┘            │
│                 ┌────────▼───────────────▼───────┐                │
│                 │   Domain Event Publisher        │                │
│                 │   (Spring Application Events    │                │
│                 │    → Kafka for cross-service)   │                │
│                 └────────────────────────────────┘                │
└────────────────────────────┬──────────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
┌──────────────────┐ ┌──────────────┐  ┌────────────────────┐
│  PostgreSQL       │ │    Kafka     │  │  Notification Svc  │
│  (modular schema) │ │  (domain     │  │  (extracted svc)   │
│  ord_* inv_*      │ │   events)    │  │  Spring Boot       │
│  usr_* bil_*      │ └──────────────┘  └────────────────────┘
│  aud_*            │                   ┌────────────────────┐
└──────────────────┘                   │  Reporting Svc     │
                                       │  (extracted svc)   │
                                       │  Read replica only │
                                       └────────────────────┘
```

### Module Boundary Enforcement — ArchUnit

ArchUnit tests are added to the build pipeline as part of each module's test suite. These tests are architecture tests — they fail the build if module boundaries are violated:

```java
@AnalyzeClasses(packages = "com.company.platform")
public class ModuleArchitectureTest {

    // Rule 1: Orders module internals must not be accessed directly from other modules
    @ArchTest
    static final ArchRule orders_internals_are_not_accessed_externally =
        noClasses()
            .that().resideOutsideOfPackage("com.company.platform.orders..")
            .should().accessClassesThat()
            .resideInAPackage("com.company.platform.orders.internal..");

    // Rule 2: Cross-module calls must go through API interfaces only
    @ArchTest
    static final ArchRule cross_module_calls_via_api_only =
        noClasses()
            .that().resideInAPackage("com.company.platform.orders..")
            .should().dependOnClassesThat()
            .resideInAPackage("com.company.platform.inventory.internal..");

    // Rule 3: No cross-module direct JPA repository access
    @ArchTest
    static final ArchRule no_cross_module_repository_access =
        noClasses()
            .that().resideOutsideOfPackage("com.company.platform.orders..")
            .should().accessClassesThat()
            .areAssignableTo(JpaRepository.class)
            .andShould().resideInAPackage("com.company.platform.orders..");
}
```

### Database Module Ownership

Table naming convention enforces module ownership visually and in Flyway migration organization:

| Module | Table Prefix | Example Tables |
|--------|-------------|---------------|
| Orders | `ord_` | `ord_order`, `ord_order_line`, `ord_order_status` |
| Inventory | `inv_` | `inv_product`, `inv_warehouse`, `inv_stock_level` |
| Users | `usr_` | `usr_account`, `usr_role`, `usr_session` |
| Billing | `bil_` | `bil_invoice`, `bil_payment`, `bil_subscription` |
| Audit | `aud_` | `aud_event`, `aud_actor`, `aud_change_log` |

**Cross-module references:** Foreign keys across module table prefixes are converted to **logical references** (stored as `UUID`, no FK constraint). The application layer is responsible for consistency. This is a deliberate trade-off: losing the database-enforced FK in exchange for module independence. The integrity is validated via application-layer integrity checks that run nightly.

### Domain Event Design

Cross-module state changes that previously used direct method calls are replaced with domain events:

```
Orders Module: OrderCreatedEvent
  ├── Inventory Module listens → reserve stock
  ├── Billing Module listens → create invoice
  └── Notification Service listens → send confirmation email

Inventory Module: StockLevelChangedEvent
  └── Reporting Service listens → update inventory snapshot
```

**Synchronous vs asynchronous decision:**

| Operation | Communication Style | Reason |
|-----------|---------------------|--------|
| Orders → Inventory (reserve stock) | Synchronous (Spring ApplicationEvent, in-process) | Stock reservation must succeed or order fails atomically |
| Orders → Billing (create invoice) | Synchronous (in-process) | Invoice must be created in the same business transaction as the order |
| Orders → Notification Service | Asynchronous (Kafka) | Email delivery is not business-critical; ordering is decoupled |
| Inventory → Reporting Service | Asynchronous (Kafka) | Reports are near-real-time, not real-time |

Synchronous events remain in-process (Spring `ApplicationEventPublisher`) within the modular monolith — no network hop. This preserves the ACID transaction for order creation while logically separating the modules.

---

## F. Migration / Implementation Strategy

### Phase 1 — Audit Module Extraction and ArchUnit Baseline (Months 1–3)

**Priority: SOC 2 compliance requirement (hardest deadline)**

The Audit module is extracted first because:
- It has only inbound dependencies (all modules write to it; it writes to no other module)
- It has the highest business priority (SOC 2)
- It is the smallest module (~40K LOC)

Steps:
1. Identify all `AuditService.log()` call sites across the codebase (~340 call sites)
2. Replace direct calls with Spring `ApplicationEventPublisher.publishEvent(new AuditEvent(...))`
3. Create `aud_*` tables and Flyway migrations; rename existing audit tables via migration
4. Extract `AuditModule` to a clean package with ArchUnit boundary tests
5. Audit module now writes to its own tables via its own JPA repositories — no shared table access

**Parallel:** ArchUnit architecture tests added for all other module boundaries. Tests are initially set to `warn` mode — they report violations without failing the build. This generates a backlog of existing violations that teams resolve over subsequent phases.

Deliverable: SOC 2 audit scope demonstrably isolated. ArchUnit warnings baseline established (847 initial violations cataloged).

---

### Phase 2 — Module Boundary Remediation (Months 3–8)

Each team is assigned ownership of their module's ArchUnit violation backlog. The 847 initial violations are triaged into:

- **Violations resolved by removing the cross-module call** (logic belongs in the calling module) — 420 violations
- **Violations resolved by promoting to module API interface** (legitimate cross-module operation, needs proper contract) — 312 violations  
- **Violations resolved by domain event refactoring** (asynchronous, non-blocking operation) — 115 violations

Database table migration:
- Flyway migration scripts rename existing tables to module-prefixed names
- Foreign key constraints between module-prefixed tables are identified and converted to logical references (UUID columns with no FK constraint)
- 27 cross-module FK constraints converted to logical references over 8 weeks

By end of Phase 2, ArchUnit tests are promoted from `warn` to `fail` mode. The build now enforces module boundaries.

---

### Phase 3 — Notification and Reporting Service Extraction (Months 7–11)

**Notification Service extraction:**

The Notification module has zero synchronous inbound callers after Phase 2 event refactoring. It is extracted as a standalone Spring Boot service:
- Consumes `OrderCreatedEvent`, `InvoiceGeneratedEvent`, `PasswordResetRequestedEvent` from Kafka
- Owns all email/SMS template logic and delivery (AWS SES, SNS)
- Deployed independently on ECS Fargate

**Reporting Service extraction:**

The Reporting module reads aggregate data for dashboard and export APIs. Extracted as:
- Spring Boot service with read-only PostgreSQL data source (Aurora read replica endpoint)
- Kafka consumer for materialized view refresh events (`StockLevelChangedEvent`, `OrderStatusChangedEvent`)
- Local materialized views in its own PostgreSQL schema (`rpt_*` prefix)
- Deployed independently — scaling the reporting service does not require scaling the core monolith

**Module boundary after extraction:**

The modular monolith's Notification and Reporting modules are replaced with Kafka producers. The logic moved to independent services. The monolith's codebase shrinks from ~600K LOC to ~490K LOC.

---

### Phase 4 — Per-Module CI and Independent Test Suites (Months 9–12)

With module boundaries enforced, per-module test suites are created:
- Each module has a dedicated Gradle subproject with unit and integration tests
- CI pipeline runs only the test suites for modules changed in a given PR (via `gradle :orders:test` rather than full `gradle test`)
- Full regression suite runs on schedule (nightly), not on every PR

Result: PR CI time reduces from 87 minutes (full suite) to 8–22 minutes (changed modules only).

---

## G. Performance Optimization

### Database — Partitioned Schema Impact

After table renaming, PostgreSQL query plans were re-verified with `EXPLAIN ANALYZE`. Key finding: several queries that previously used indexes on table names that no longer existed (renamed tables) required index recreation:

```sql
-- Recreate index after table rename (example)
CREATE INDEX CONCURRENTLY idx_ord_order_status_created
    ON ord_order(status, created_at DESC)
    WHERE status IN ('PENDING', 'PROCESSING');
```

Partial indexes were added across all module tables for the most common filter patterns, reducing index bloat on status/type columns with low cardinality.

### Test Suite Optimization

The 87-minute test suite was profiled. Top consumers:
- Integration tests that spun up a full Spring context for each test class (48 test classes × ~12 sec context startup = ~9.6 minutes in context startup alone)
- Resolved by: Spring's `@DirtiesContext` removed from 38 of 48 test classes (they didn't actually need a fresh context); shared test application context with `@SpringBootTest` reuse

After optimization: full test suite 31 minutes. Module test suites: 2–8 minutes per module.

---

## H. Trade-offs & Engineering Decisions

### Complexity Introduced

**Logical FK references:** Converting 27 cross-module foreign keys to UUID logical references removes database-enforced integrity. If the application layer fails to enforce referential integrity (e.g., a bug allows an `ord_order` to reference a non-existent `usr_account`), the database will not catch it. This is mitigated by: (a) application-layer integrity checks on writes, (b) nightly consistency validation jobs that report cross-module integrity violations.

**Dual event system:** The in-process `ApplicationEventPublisher` for synchronous events and Kafka for asynchronous events creates two event systems to reason about. Developers must understand which type of event to use for which scenario. This is documented in the team's Architecture Decision Record and enforced via code review guidance.

**Kafka operational overhead:** Introducing Kafka for two use cases (Notifications, Reporting) adds significant operational infrastructure. A managed service (AWS MSK) was chosen to reduce operational burden. The trade-off: MSK has higher cost than self-managed Kafka but lower operational overhead for the team's current experience level.

### What Was Sacrificed

**Multi-database isolation:** Full module data isolation (each module in its own database) is not achieved in this phase. The modular monolith uses schema prefixes as a logical boundary but a single PostgreSQL instance. True database-level isolation would require service extraction for each module — planned for Year 2 if required. The immediate business requirement (SOC 2 audit scope) is satisfied by application-layer boundary enforcement.

**Auto-scaling per module:** The modular monolith is still one deployable unit — scaling requires scaling the whole unit. This is acceptable for the current load profile. The two extracted services (Notifications, Reporting) can scale independently.

### Long-term Implications

- Phase 2 and 3 create the architectural clarity that makes future service extraction safe. Orders, Inventory, Users, and Billing now have clean boundaries and can be extracted as services in Year 2 with well-defined Kafka event contracts already in place
- The ArchUnit architecture tests become a permanent guardrail — new engineers cannot accidentally reintroduce coupling violations without a failing build
- The SOC 2 audit module is independently auditable and now has a deployment cadence independent of the business logic modules

---

## I. Production Outcome

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Release cycle** | 8 weeks | 2 weeks | 75% reduction |
| **Deployment success rate (first attempt)** | 40% | 96% | 2.4× improvement |
| **Full test suite runtime** | 87 minutes | 31 minutes (full) / 8–22 min (per-module) | 64% / ~90% reduction |
| **Module coupling violations** | 847 | 0 (enforced by ArchUnit) | 100% resolution |
| **New developer onboarding** | 6–8 weeks | 2–3 weeks | ~70% reduction |
| **Cross-module deployment blocking incidents** | ~4/month | 0 (independent modules) | Eliminated |
| **SOC 2 audit scope** | Full monolith in scope | Audit module only | Scope reduction |

### Business Impact

- The inventory team began deploying weekly within 6 weeks of Phase 3 completion — the core business requirement was met
- SOC 2 Type II audit passed with the audit module designated as the compliance scope boundary
- Release frequency increased from 1.5 features/team/month to 4.2 features/team/month — the primary bottleneck (release coordination and test suite wait time) was the limiting factor, not team capacity
- The modular monolith architecture was presented to the enterprise client requiring data isolation as a structured roadmap to per-database module isolation in Year 2 — the client accepted the roadmap and did not terminate their contract
