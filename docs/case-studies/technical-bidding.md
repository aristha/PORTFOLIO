# Technical Bidding & Solution Proposal

**Domain:** Solution Architecture · RFP Response · Build vs Buy Evaluation · Multi-Stack Assessment  
**Context:** Government digital transformation — citizen services portal for 2 million registered users  
**Competing Architectures:** Mendix (low-code platform) · Custom Java microservices · Python FastAPI + React hybrid  
**Outcome:** Hybrid architecture selected — Mendix for back-office workflow + Java/React for citizen-facing portal

---

## A. Business Context

### The Enterprise Problem

A government agency responsible for business licensing and regulatory compliance issued a Request for Proposal (RFP) for a citizen services platform. The agency's existing system was a combination of paper-based processes and a legacy ASP.NET system built in 2009 — with no public API, no mobile support, and a back-office system that required manual data re-entry across three separate internal databases.

The RFP requirements were:

| Category | Requirement |
|----------|-------------|
| **Citizen portal** | Online submission of 54 distinct license/permit application types |
| **Document management** | Upload, storage, versioning, and retrieval of supporting documents |
| **Workflow engine** | Configurable approval workflows with multi-step routing, escalation, and SLA tracking |
| **Notifications** | Status update notifications to citizens (email, SMS) |
| **Payment integration** | Fee collection for license applications (integrated with national payment gateway) |
| **Reporting & analytics** | Case processing time, approval rates, regulatory compliance reports |
| **User scale** | ~2M registered citizens, ~18K civil servant users (approvers), 850K annual application submissions |
| **Availability** | 99.9% uptime SLA, disaster recovery RTO < 4 hours |
| **Security** | ISO 27001 compliance, national digital identity (eID) integration, data residency in-country |

### Why This Was a Meaningful Architecture Decision

Three technically qualified vendors submitted proposals with fundamentally different architectures. As the solution architect on the response team for one bid, the decision was not just "what to build" but "what class of system to build" — with significant implications for:

- **Delivery timeline** (12 months was the RFP target; realistic estimates varied from 10 to 28 months depending on approach)
- **Total cost of ownership** over a 10-year contract
- **Vendor lock-in exposure** at a government agency
- **Long-term maintainability** by a government IT team with 6 technical staff

### Business Constraints

| Constraint | Detail |
|-----------|--------|
| **10-year contract** | The system must be maintainable for at least 10 years. Vendor lock-in risk is a primary evaluation criterion. |
| **Government IT team capability** | 6 in-house technical staff (Java and .NET background), no DevOps expertise, no data science capability |
| **Procurement rules** | Low-code / COTS must be evaluated alongside custom development per procurement policy |
| **Data residency** | All citizen data must remain within the country. No data processed on foreign-soil infrastructure. |
| **eID integration** | National digital identity (SAML 2.0 based) must be the sole authentication mechanism for citizens |
| **12-month delivery target** | Politically committed. All 54 form types must be live within 12 months of contract award. |
| **Budget ceiling** | Implementation budget: $4.2M. Annual operational budget: $600K. |

---

## B. Existing System Analysis

### Current Architecture

```
┌────────────────────────────────────────────────────────────────┐
│              Legacy System (ASP.NET 2.0, 2009)                │
│                                                                │
│  Public-facing:           Back-office:                        │
│  - Static HTML forms      - SQL Server 2008                   │
│  - Email PDF submissions  - 3 separate internal DBs           │
│  - No authentication      - Manual data re-entry              │
│  - No status tracking     - No API layer                      │
│                                                                │
│  Paper processes:                                             │
│  - Physical document submission (56% of applications)        │
│  - Manual fee collection at counters                          │
│  - Phone-based status inquiry (~2,400 calls/day)             │
└────────────────────────────────────────────────────────────────┘
```

### Key Pain Points for Architecture Decision

**54 form types with varying complexity:**
- 12 form types are simple (3–8 fields, single approval step)
- 28 form types are moderately complex (20–40 fields, 2–3 approval steps, conditional field logic)
- 14 form types are highly complex (40–80 fields, 4–7 approval steps, external system integration, fee calculation formulas)

This distribution was critical to the architecture decision: a low-code platform handles simple and moderately complex forms well but struggles with the 14 complex form types. Custom code handles all complexity but is expensive for the 12 simple form types.

**Workflow variability:** The agency's workflows change frequently — new regulations introduce new approval steps, SLA policies change annually. A hard-coded workflow engine requires developer intervention for every workflow change. A configurable workflow engine (Mendix, or a standalone BPMN engine) allows non-developer staff to modify workflows.

**Government IT team profile:** The 6 in-house technical staff have Java/.NET experience but no microservices, Kubernetes, or event-driven architecture experience. A highly distributed microservices architecture would require either significant upskilling or perpetual vendor dependency for operations.

---

## C. Solution Evaluation

### Option 1 — Mendix Full Low-Code Platform

Deliver the entire citizen portal and back-office system on Mendix Enterprise. The 54 form types, document management, workflow engine, payment integration, notifications, and reporting are all built within Mendix. The system is deployed on Mendix Cloud (managed hosting) or Mendix on Kubernetes (self-hosted).

**Architecture sketch:**

```
Citizens → Mendix Web Portal (Mendix Pages)
           → Mendix Workflow Engine (BPMN-based)
           → Mendix ORM → PostgreSQL (Mendix managed)
           → Mendix Integration (REST API connectors to payment gateway, eID)
           → Mendix Reporting (built-in analytics)

Civil Servants → Mendix Back-Office App
```

**Pros:**
- Fastest delivery path: Mendix's pre-built form components, workflow designer, and document management modules dramatically reduce development time. Estimated 10 months vs 18 months custom.
- Configurable workflows without code: the agency's non-developer process owners can modify approval workflows via the Mendix Workflow Designer without developer involvement
- Low-code means lower ongoing development cost for change requests
- Mendix has native SAML 2.0 support — eID integration is documented and supported
- Reduced ongoing operational skill requirement — Mendix manages platform-level concerns

**Cons:**
- **Vendor lock-in is existential at a 10-year horizon**: Mendix licenses are €280K/year at the scale required. If Mendix changes licensing or discontinues the product, migration would require full replatforming. For a government 10-year contract, this is an unacceptable single-vendor dependency.
- **Complex form rendering limitations**: Mendix pages can render complex conditional field logic but the 14 highly-complex form types require custom Java actions (Mendix's extension mechanism). This means Mendix expertise AND Java expertise are needed simultaneously — reducing the "low-code" cost advantage.
- **Mendix on-premise deployment complexity**: Data residency requires self-hosted Mendix, which requires Kubernetes operational experience — exactly the gap in the government IT team's skill set.
- **Performance at scale**: Mendix's runtime is not designed for 850K annual submissions with peak periods. Load testing results from similar government deployments showed degradation above 200 concurrent users on standard Mendix configurations — requires specific architectural tuning.
- **Reporting limitations**: Mendix's native reporting is functional for simple dashboards but the regulatory compliance reports required by the RFP involve complex aggregations that Mendix cannot generate natively — requiring external BI tool integration.

**Risk:** High (vendor lock-in, complex form limitations, performance scaling)  
**Implementation Cost:** $2.8M (lower upfront vs custom)  
**Annual Operational Cost:** $840K/year (Mendix license €280K + infrastructure + support)  
**10-year TCO:** $11.2M  
**Delivery Timeline:** 10 months

---

### Option 2 — Custom Java Microservices

Build the entire platform as a purpose-built Java microservices system. Each domain (forms, documents, workflows, payments, notifications, reporting) is an independent Spring Boot service. Deployed on AWS ECS or Kubernetes.

**Architecture sketch:**

```
Citizens → React SPA
  → API Gateway → [Form Service | Document Service | Workflow Service |
                   Payment Service | Notification Service | Report Service]
  → each service → own PostgreSQL schema
  → Kafka (event bus)
  → AWS (ECS/EKS, S3, SES, RDS)
```

**Pros:**
- No vendor lock-in: standard Java + AWS, maintainable by any Java team permanently
- Full control over form rendering complexity — the 14 complex form types have no platform ceiling
- Custom workflow engine (or integrated Camunda BPM) gives full flexibility for workflow changes
- Performance: designed for the exact load profile required
- The government IT team's Java background aligns with the technology choice

**Cons:**
- **Delivery timeline**: Full microservices architecture with 54 form types, BPMN workflow engine, document management, payment integration, eID (SAML 2.0), and reporting cannot be completed in 12 months by a single delivery team. Realistic estimate: 20–26 months.
- **Operational complexity for government IT team**: Distributed tracing, service discovery, Kafka operations, container orchestration — the 6-person IT team has none of this operational experience. Post-delivery, the government would be permanently dependent on the vendor for operations.
- **Workflow configurability requires extra work**: A hard-coded workflow engine fails the RFP requirement for non-developer workflow modification. Camunda BPM integration is the solution but adds significant integration complexity and a second operational system.
- **High upfront cost**: Custom development across all 54 form types, document management, workflow engine, payment integration = highest development cost.

**Risk:** Medium (delivery timeline risk, post-delivery operational dependency)  
**Implementation Cost:** $4.1M (at budget ceiling)  
**Annual Operational Cost:** $580K/year (AWS infrastructure + 2 FTE maintenance support)  
**10-year TCO:** $9.9M  
**Delivery Timeline:** 20–26 months (exceeds RFP target by 8–14 months)

---

### Option 3 — Hybrid Architecture: Mendix Back-Office + Java/React Citizen Portal

Split the system along its natural boundary: citizen-facing portal (custom Java + React) handles the complex, high-volume, public-facing submission experience; Mendix handles the back-office workflow engine, case management, and civil servant tooling.

**Architecture sketch:**

```
Citizens → React SPA → Java Spring Boot API
              → PostgreSQL (form data, documents)
              → S3 (document storage)
              → eID (SAML 2.0)
              → Payment Gateway (REST)

Civil Servants → Mendix Back-Office App
                  → Mendix Workflow Engine
                  → Mendix REST consumer of Java API
                  → Mendix Reporting

Integration:
  Java API → Mendix REST API (case status sync)
  Mendix → Java API (approval decisions, notifications trigger)
```

**Pros:**
- **Citizen portal performance and flexibility**: The public-facing submission system is custom Java + React — full control over the 14 complex form types, eID integration, document upload, payment. No low-code platform ceiling where it matters most.
- **Mendix handles what it does well**: Back-office workflow management, case routing, SLA tracking, and civil servant tooling are exactly the scenarios Mendix is designed for. The 6 in-house staff can modify workflows without developer involvement.
- **12-month delivery is achievable**: The citizen portal (the higher-complexity delivery) is scoped to the Java/React team. Mendix back-office is lower risk and faster. Parallel delivery tracks.
- **Reduced Mendix dependency**: Mendix is used for the back-office only — ~30% of system functionality. The citizen portal (70% of system complexity) has no vendor lock-in. If Mendix becomes untenable at contract renewal, the back-office can be replaced without touching the citizen portal.
- **10-year maintainability**: Java/React citizen portal is maintainable by any Java team. Mendix back-office is maintainable by Mendix developers, but its scope is well-defined and bounded.
- **Aligns with government IT team**: The Java team can own the citizen portal post-delivery. The workflow configuration is owned by process owners in Mendix Studio.

**Cons:**
- **Two-system integration complexity**: Java API and Mendix must integrate — REST API contract between citizen portal and back-office workflow. A contract break in either direction requires coordination between two technology stacks.
- **Two operational domains**: The government IT team must support both AWS (for Java API) and Mendix (for back-office). Training required on both.
- **Data consistency**: Application state lives in two systems (Java PostgreSQL for form submissions, Mendix database for case workflow state). Synchronization logic must be robust.
- **Mendix license cost for back-office-only scope**: Mendix Enterprise licensing is not substantially cheaper for partial scope — license is per-app, not per-feature.

**Risk:** Medium  
**Implementation Cost:** $3.6M  
**Annual Operational Cost:** $660K/year (AWS + Mendix license + support)  
**10-year TCO:** $10.2M  
**Delivery Timeline:** 12–14 months

---

## D. Final Architecture Decision

**Recommendation: Option 3 — Hybrid Architecture (Java/React Citizen Portal + Mendix Back-Office)**

### Evaluation Matrix

| Criterion | Weight | Option 1 (Mendix Full) | Option 2 (Custom Java) | Option 3 (Hybrid) |
|-----------|--------|------------------------|------------------------|-------------------|
| 10-year maintainability | 25% | 2/5 (lock-in) | 5/5 | 4/5 |
| Delivery timeline | 20% | 5/5 (10 months) | 1/5 (20–26 months) | 4/5 (12–14 months) |
| Complex form handling | 15% | 2/5 (platform ceiling) | 5/5 | 5/5 (custom portal) |
| Back-office configurability | 15% | 5/5 | 2/5 (hard-coded) | 5/5 (Mendix) |
| IT team capability fit | 10% | 3/5 (Mendix gap) | 3/5 (ops gap) | 4/5 |
| 10-year TCO | 10% | 2/5 ($11.2M) | 5/5 ($9.9M) | 4/5 ($10.2M) |
| Vendor risk | 5% | 1/5 (full lock-in) | 5/5 | 4/5 (partial) |
| **Weighted Score** | | **2.7/5** | **3.1/5** | **4.2/5** |

### Why Option 3 Was Selected Over Option 2 (Higher TCO)

Option 2 is the lowest 10-year TCO but fails the 12-month delivery commitment — the RFP's politically-committed deadline. Missing this deadline has a contractual penalty of $420K and likely loss of the contract. Option 3 achieves delivery within the window by using Mendix for the faster-to-build back-office component.

Option 3 also directly addresses the workflow configurability requirement. Option 2 with Camunda BPM could achieve configurability, but the integration complexity with a custom microservices architecture adds risk to an already-tight timeline.

### Why Option 1 Was Rejected

The vendor lock-in risk is disqualifying for a 10-year government contract. At year 5, the agency would have zero leverage with Mendix on license negotiations — the entire citizen-facing system would be Mendix. The $11.2M TCO vs $10.2M for Option 3 is not the primary concern; the lock-in exposure is. Additionally, Mendix's complex form limitations for the 14 highly-complex form types would require custom Java actions, eliminating the primary delivery speed advantage.

### Architectural Principles Applied

- **Vendor lock-in risk must be bounded**: No single vendor should own more than 50% of system functionality at the 10-year contract horizon
- **Use low-code where it has genuine advantage**: Mendix is genuinely better than custom code for configurability of approval workflows; use it there, not everywhere
- **Delivery timeline is a constraint, not a wish**: A technically superior solution that cannot be delivered within the political commitment is not the right solution for this context
- **Technology fits team capability**: Post-delivery system ownership requires Java skills for the citizen portal (existing government IT team capability) — not an introduction of Kubernetes operations that no one on the team can execute

---

## E. System Architecture Design

### Citizen Portal — Java / React

```
┌───────────────────────────────────────────────────────────────────┐
│                    Citizen Portal (AWS ap-*-1)                    │
│                                                                   │
│  ┌──────────────────┐        ┌──────────────────────────────────┐ │
│  │  React SPA       │        │  AWS API Gateway (HTTPS)         │ │
│  │  (CloudFront)    │───────►│  → Spring Boot API (ECS Fargate) │ │
│  │                  │        │                                  │ │
│  │  Form rendering  │        │  Modules:                        │ │
│  │  Document upload │        │  - form-submission-service       │ │
│  │  Status tracking │        │  - document-service (S3 backend) │ │
│  │  Payment UI      │        │  - payment-service               │ │
│  └──────────────────┘        │  - notification-service (SES)    │ │
│                              └────────────────┬─────────────────┘ │
│  eID (SAML 2.0):                              │ JDBC               │
│  ┌──────────────────┐        ┌───────────────▼──────────────────┐ │
│  │  National eID    │        │  Aurora PostgreSQL (Multi-AZ)    │ │
│  │  IdP (SAML 2.0)  │        │  (form_submissions, documents,   │ │
│  │  → Spring SAML   │        │   payments, citizens)            │ │
│  └──────────────────┘        └──────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  S3 (document storage, encrypted at rest)                   │  │
│  │  CloudFront (static assets + document download CDN)         │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

**Form Rendering Architecture:**

The 54 form types are rendered using a JSON-schema-driven form engine (React Hook Form + custom schema interpreter). Form definitions are stored in the database as JSON schemas — adding or modifying a form type is a data operation, not a code deployment:

```json
{
  "formId": "BLIC-014",
  "formTitle": "Food Business Licence Application",
  "sections": [
    {
      "sectionId": "premises",
      "fields": [
        { "id": "premises_address", "type": "address", "required": true },
        { "id": "premises_area_sqm", "type": "number", "min": 10, "max": 5000 },
        {
          "id": "has_commercial_kitchen",
          "type": "boolean",
          "conditionalFields": ["kitchen_certification_doc"]
        }
      ]
    }
  ],
  "workflowId": "FOOD_LICENCE_V2"
}
```

This approach means non-developers can add new fields to existing forms and the 12 simple form types can be configured without Java development.

### Back-Office — Mendix

```
┌─────────────────────────────────────────────────────────────────┐
│              Mendix Back-Office (Mendix Cloud, in-country)      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Case Management Module                                  │  │
│  │  - Case list view per officer                            │  │
│  │  - Document review interface                             │  │
│  │  - Approval / rejection / return actions                 │  │
│  │  - Officer notes + internal communication               │  │
│  └────────────────────────────┬─────────────────────────────┘  │
│                               │                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Workflow Engine (Mendix Workflow Designer)               │  │
│  │  - Visual BPMN workflow definition                       │  │
│  │  - SLA timers + escalation rules                         │  │
│  │  - Role-based task routing                               │  │
│  │  - Configurable by process owners (no developer needed)  │  │
│  └────────────────────────────┬─────────────────────────────┘  │
│                               │                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Reporting Module (Mendix built-in + external BI)        │  │
│  │  - Case volume, processing time dashboards               │  │
│  │  - SLA compliance reports                                │  │
│  │  - Complex regulatory reports → export to PowerBI        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Integration: Mendix REST consume Java API                      │
│  - Poll citizen portal API for new submissions                  │
│  - Write approval decisions back via Java API                   │
│  - Trigger notifications via Java notification service          │
└─────────────────────────────────────────────────────────────────┘
```

### Integration Contract — Java API ↔ Mendix

The boundary between the citizen portal and Mendix back-office is a REST API owned by the Java service. Mendix is a consumer of this API — it does not hold the integration contract.

```
Java API publishes:
  GET  /internal/cases?status=SUBMITTED&page=0&size=50
  GET  /internal/cases/{caseId}
  GET  /internal/cases/{caseId}/documents/{docId}
  POST /internal/cases/{caseId}/decision   { outcome: APPROVED|REJECTED|RETURNED, notes: "..." }
  POST /internal/cases/{caseId}/notifications/trigger

Mendix consumes:
  - Polls /internal/cases every 5 minutes for new submissions
  - Calls /internal/cases/{caseId}/decision on officer approval
  - Calls /internal/cases/{caseId}/notifications/trigger to send citizen status updates
```

The OpenAPI spec for the internal API is version-controlled and Mendix integration is tested against a contract test suite (Pact) to catch integration breaks before deployment.

---

## F. Migration / Implementation Strategy

### Parallel Delivery Tracks

The hybrid architecture enables two concurrent delivery tracks, reducing the critical path:

| Track | Team | Duration | Deliverable |
|-------|------|----------|-------------|
| **Track A — Citizen Portal** | Java + React team (8 engineers) | Months 1–12 | All 54 form types live, eID, payment, document management |
| **Track B — Mendix Back-Office** | Mendix developers (3 engineers) | Months 1–10 | Workflow engine, case management, officer tooling |
| **Track C — Integration** | 2 engineers shared | Months 8–12 | Java ↔ Mendix API integration, end-to-end testing |

Critical path: Track A (12 months). Track B completes 2 months earlier, leaving 2 months for integration and end-to-end acceptance testing.

### Form Delivery Phasing

All 54 form types are not delivered simultaneously. Phased by complexity:

- **Phase 1 (Month 6):** 12 simple form types live (3–8 fields, single approval)
- **Phase 2 (Month 9):** 28 moderate form types live (20–40 fields, 2–3 approval steps)
- **Phase 3 (Month 12):** 14 complex form types live (40–80 fields, multi-step with external integration)

Phase 1 delivery by Month 6 allows the agency to begin citizen migration from the legacy system and reduce call center volume — demonstrating early value before full delivery.

### Legacy System Migration

Paper and legacy system volumes are migrated over 6 months (Months 7–12):
- Legacy ASP.NET data export → Java API import (historical application records)
- Citizens notified of new portal via email/SMS (contact data from legacy system)
- Counter staff redirected to assist citizens with portal registration
- Legacy system placed in read-only mode at Month 10, decommissioned at Month 14

---

## G. Performance Optimization

### Citizen Portal — Load Profile

850K annual submissions = ~2,330/day average, with estimated 8× peak during application deadline periods = ~18,600 submissions/day peak.

Submit endpoint load test target: 1,000 concurrent form submissions (covers the 8× peak scenario with headroom).

ECS Fargate auto-scaling configured:
- `form-submission-service`: min 2, max 16 tasks, scale at 60% CPU
- `document-service`: min 2, max 8 tasks (I/O bound, S3 upload throughput is the limit)

**Document upload optimization:** Large document uploads (PDFs, up to 20MB) use S3 pre-signed URLs — the React client uploads directly to S3 (bypassing the Java API for the file transfer), the Java API only receives the S3 object key as confirmation. This removes the Java service from the file transfer path, reducing memory pressure and API response time.

### Database — Form Submission Schema

Form submission data is stored as a combination of structured columns (case ID, citizen ID, form type, status, dates) and a JSONB column (`form_data`) for the variable field data per form type. This avoids the need for 54 separate tables while maintaining PostgreSQL's JSONB query capabilities:

```sql
CREATE TABLE form_submission (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    citizen_id      UUID            NOT NULL REFERENCES citizen(id),
    form_type_id    VARCHAR(20)     NOT NULL,
    status          VARCHAR(30)     NOT NULL DEFAULT 'SUBMITTED',
    submitted_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    form_data       JSONB           NOT NULL,   -- variable fields per form type
    INDEX ON form_submission(citizen_id, submitted_at DESC),
    INDEX ON form_submission(status, submitted_at) WHERE status = 'SUBMITTED',
    INDEX ON form_submission USING GIN (form_data)  -- JSONB search
);
```

GIN index on `form_data` supports the back-office search requirement ("find all applications where premises address contains 'District 3'").

---

## H. Trade-offs & Engineering Decisions

### Complexity Introduced

**Two-system integration maintenance:** The Java API ↔ Mendix integration is the highest maintenance risk point. If the Java API changes an endpoint, the Mendix integration must be updated simultaneously. This is mitigated by: (a) the API contract is owned by Java (Mendix is the consumer, not the contract owner), (b) Pact contract tests catch breaking changes in CI, (c) API versioning is in place from day one.

**JSONB form data:** Using JSONB for variable form field data sacrifices relational integrity for flexibility. Field-level data validation is application-enforced, not database-enforced. A corrupt form submission with missing required fields would not be caught at the database layer. Mitigated by: server-side form schema validation before INSERT.

**Mendix data residency:** Mendix Cloud's in-country hosting option was confirmed available for the target country. Mendix Private Cloud (customer-managed Kubernetes) is the fallback. The contract specifies this as a contractual obligation with Mendix — failure to maintain in-country data residency is a contract breach with penalty clauses.

### What Was Sacrificed

**Single-vendor technology stack:** The hybrid approach introduces two primary technology domains (Java/React + Mendix) where Option 2 would have had one. This increases the pool of skills required and creates two operational runbooks, two upgrade tracks, and two vendor relationships.

**Workflow engine depth for citizen portal:** The Java citizen portal has a simple workflow model (status machine, not full BPMN). Complex workflow rules (escalation timers, parallel approval routing) live in Mendix, not in the citizen portal. Any workflow change that affects the citizen-visible status progression requires a Mendix update AND a Java API contract update — a two-team coordination point.

### Long-term Implications

- At Year 5 contract review, the agency can evaluate replacing the Mendix back-office with a custom Java workflow engine (Camunda) if Mendix licensing becomes unacceptable — the citizen portal is unaffected by this decision
- The JSONB form schema approach allows new form types to be added by non-developers via an admin interface — expected to reduce form maintenance cost from 3 developer-days per new form to 4 hours of configuration
- The JSON schema-driven form renderer creates an extensible foundation for the agency to add mobile app submission in Year 2 without re-implementing form rendering logic

---

## I. Production Outcome

### Contract Award

The hybrid architecture proposal was awarded the contract. Key evaluation feedback from the agency:

> "The proposal was the only submission that directly addressed the workflow configurability requirement without dependency on developer involvement. The separation of concerns between the citizen-facing portal (custom, no vendor lock-in) and the back-office workflow (Mendix, configurable by process owners) directly maps to our operational model."

### Delivery Results (12-Month Mark)

| Metric | Target | Actual |
|--------|--------|--------|
| **Form types delivered** | 54 | 54 |
| **Delivery timeline** | 12 months | 11.5 months |
| **Citizen portal uptime (first 90 days)** | 99.9% | 99.94% |
| **Application processing time (avg)** | Baseline unknown | 4.2 days (vs ~18 days estimated legacy) |
| **Call center volume (license status inquiries)** | Target: −40% | −62% (online status tracking) |
| **Legacy system decommission** | Month 14 | Month 13 |
| **Back-office workflow modifications (Year 1)** | N/A | 14 workflow changes made by process owners without developer involvement |

The 14 back-office workflow modifications made by non-developer process owners in Year 1 were the clearest validation of the Mendix selection for that component — each change under the Option 2 custom build would have required developer time, testing, and a deployment cycle.

### TCO Validation (3-Year Actual vs Estimate)

| Item | Estimated (3-year) | Actual (3-year) |
|------|-------------------|-----------------|
| Java/React portal operations | $580K | $540K |
| Mendix licensing + cloud | $840K | $840K (as contracted) |
| Change requests + enhancements | $420K | $380K |
| **3-year total** | **$1.84M** | **$1.76M** |

The hybrid architecture delivered within budget across the 3-year horizon. Option 2 (custom Java only) TCO estimate of $9.9M over 10 years remains the lower 10-year number — but the 8-month delivery delay would have incurred $420K contract penalty and likely contract loss, making Option 2 economically worse in the actual context.
