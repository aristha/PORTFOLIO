# Legacy Java System Migration to AWS Cloud

**Domain:** Cloud Migration · Re-platforming · Database Migration · AWS Architecture  
**Stack:** Java EE 6 / JBoss AS 7.1 · Oracle 11g on-premise → AWS ECS Fargate · Aurora PostgreSQL  
**Scale:** 800K monthly transactions · 15-year-old production system · 18-month migration window  
**Pattern:** Strangler Fig · Phased cutover · Parallel-run validation

---

## A. Business Context

### The Enterprise Problem

A regional insurance company had been operating a Java EE 6 claims processing system on on-premise hardware for 15 years. The system handled online claims submission, adjudication workflow, policy management, and agent portal functionality for approximately 350,000 active policyholders and 800K monthly transactions at peak.

The triggering event was a hardware vendor end-of-life notification on the primary application server cluster. The options were:

1. Renew with new on-premise hardware (capital expenditure of ~$1.8M, another 5-year lock-in)
2. Execute a cloud migration before contract renewal

### Why the System Needed Change

Beyond the immediate hardware trigger, the system had accumulated structural problems over 15 years:

- **Deployment complexity:** Each release required a 3-hour maintenance window with manual EAR file deployment to JBoss AS 7.1 and post-deployment smoke testing by the operations team
- **Scaling impossibility:** The monolithic deployment model prevented selective scaling. During open enrollment periods (2× normal transaction volume), the only option was adding identical server nodes — expensive and slow
- **Oracle licensing cost:** Oracle Standard Edition licensing on-premise at approximately $420K/year — one of the largest IT line items
- **Development velocity:** Shared JBoss application server meant all development teams shared a single deployment pipeline; environment conflicts were common
- **Disaster recovery gap:** No tested DR environment. The documented RTO was 24 hours but was never validated

### Business Constraints

| Constraint | Detail |
|-----------|--------|
| **Zero downtime tolerance** | 24/7 claims processing; SLA of 99.9% uptime. No multi-hour maintenance windows acceptable |
| **Budget ceiling** | $1.4M approved for migration. New hardware renewal was $1.8M, making this financially viable |
| **Timeline** | 18 months before on-premise hardware and Oracle support contracts expired |
| **Legacy integration dependencies** | 3 third-party integrators (reinsurer, state bureau, fraud detection vendor) had direct JDBC connections to the Oracle database |
| **Regulatory compliance** | SOC 2 Type II, state insurance department data residency requirements (data must remain in-country) |
| **Team capability** | No existing AWS operational experience in the internal IT team at migration start |

---

## B. Existing System Analysis

### Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ON-PREMISE DATA CENTER                    │
│                                                              │
│  ┌─────────────────┐    ┌───────────────────────────────┐   │
│  │  Load Balancer  │    │   JBoss AS 7.1 Cluster        │   │
│  │  (F5 hardware)  │───▶│                               │   │
│  └─────────────────┘    │  ┌────────┐  ┌────────┐       │   │
│                         │  │ Node 1 │  │ Node 2 │  ...  │   │
│  ┌─────────────────┐    │  │  EAR   │  │  EAR   │       │   │
│  │  JSF/PrimeFaces │    │  └────────┘  └────────┘       │   │
│  │  Web Tier       │    └───────────────────┬───────────┘   │
│  │  (bundled in    │                        │ JDBC           │
│  │   same EAR)     │    ┌───────────────────▼───────────┐   │
│  └─────────────────┘    │   Oracle Database 11g         │   │
│                         │   (Primary + Standby)         │   │
│  External Systems:      │   ~2TB data                   │   │
│  ┌──────────────────┐   └───────────────────────────────┘   │
│  │ Reinsurer (JDBC) │                                        │
│  │ State Bureau(FTP)│                                        │
│  │ Fraud Det. (JDBC)│                                        │
│  └──────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
```

### Technology Breakdown

| Component | Technology | Age | Notes |
|-----------|-----------|-----|-------|
| Application server | JBoss AS 7.1 | 15 years | EOL, no security patches |
| Application framework | Java EE 6 (EJB 3.1, CDI, JPA 2.0) | 15 years | Extensive use of EJB session beans |
| Web tier | JSF 2.1 / PrimeFaces 3.x | 10 years | Tightly bundled in EAR |
| Database | Oracle 11g R2 | 15 years | SOE contract expiring |
| ORM | Hibernate 4.x (JPA) | 12 years | ~800 entity mappings |
| Messaging | Oracle Advanced Queuing | 12 years | Used for claim event processing |
| Build | Ant + custom scripts | 15 years | No reproducible builds |
| Source control | SVN | 12 years | No branching strategy |
| Deployments | Manual EAR copy | 15 years | No CI/CD |

### Technical Limitations

**Scalability:** The EAR deployment is monolithic — the claims adjudication engine, the policy management module, the agent portal, and the web tier are all packaged together. Scaling one requires scaling all. No module-level auto-scaling is possible.

**Deployment coupling:** All four development teams share one deployment unit. Any single team's release requires the entire EAR to be rebuilt and redeployed. Release coordination overhead was consuming approximately 20% of development capacity.

**Oracle AQ coupling:** The third-party fraud detection vendor had built a polling integration directly against Oracle AQ. Changing the messaging layer required third-party coordination.

**Session-state coupling:** HTTP session state was stored in-memory on JBoss nodes with JBoss clustering replication. This made stateless horizontal scaling impossible and caused cascading failures when nodes were removed.

### Identified Bottlenecks

| Bottleneck | Impact | Root Cause |
|-----------|--------|-----------|
| **Open enrollment peak load** | 15–20% error rate during peaks | No elastic scaling; fixed node count |
| **Deployment window** | 3-hour downtime per release | Monolithic EAR; manual process |
| **Report query performance** | Regulatory reports running 30–60 minutes | Lack of read replica; same DB for OLTP + reporting |
| **DR capability** | Untested 24-hour RTO | No automation; manual failover procedure |
| **Database CPU at batch time** | OLTP queries degraded during nightly batch | No workload isolation; shared Oracle instance |

---

## C. Solution Evaluation

### Option 1 — Rehost (Lift and Shift to EC2)

Move the existing application to AWS EC2 without code changes. Run JBoss AS 7.1 on EC2 instances with the Oracle database migrated to EC2 as well (Oracle on EC2 with BYOL licensing).

**Pros:**
- Lowest risk — no application code changes required
- Fastest execution path (~6 months vs 18)
- Eliminates hardware EOL risk immediately
- Retains Oracle AQ for third-party integrations

**Cons:**
- Oracle BYOL licensing on EC2 is still expensive (~$380K/year vs $420K on-premise; minimal saving)
- JBoss AS 7.1 is still EOL — security vulnerability exposure continues
- No elastic scaling capability gained (EC2 instances still manually provisioned)
- No improvement to deployment process — still manual EAR deployments
- Operational burden shifts to managing EC2 instances + Oracle on EC2
- No reduction in architectural complexity

**Risk:** Low  
**Cost:** $280K migration + $380K/year ongoing  
**Scalability Impact:** None — same fixed-capacity model

---

### Option 2 — Re-Platform (Containerize + Managed Database)

Migrate the application to Docker containers running on AWS ECS Fargate, with the Oracle database migrated to AWS Aurora PostgreSQL. Code changes required for database compatibility layer and containerization.

**Pros:**
- Elastic scaling enabled via ECS Fargate auto-scaling — directly solves open enrollment problem
- Oracle licensing eliminated → AWS Aurora pricing model (~$95K/year estimated; ~$325K annual saving)
- Managed database removes DBA operational overhead for patching, backups, failover
- Container-based deployment eliminates manual EAR process — enables CI/CD
- Incremental migration path is viable using strangler fig
- JBoss replaced with lightweight Spring Boot containers — moves off EOL platform
- Aurora Multi-AZ gives tested, automated failover (DR concern resolved)

**Cons:**
- Oracle-to-PostgreSQL migration is non-trivial with 15 years of Oracle-specific SQL, stored procedures, and Oracle AQ usage
- Code modernization required: EJB 3.1 to Spring Boot is significant but manageable
- Third-party integrators using Oracle AQ require integration redesign (coordination risk)
- AWS operational expertise gap — team training required
- Higher migration complexity than Option 1

**Risk:** Medium  
**Cost:** $1.1M migration + $95K/year ongoing  
**Scalability Impact:** High — elastic auto-scaling, read replicas for reporting, workload isolation

---

### Option 3 — Re-Architect (Decompose to Microservices)

Decompose the monolith into independently deployable microservices (Claims Service, Policy Service, Agent Portal Service, Notification Service) with an API Gateway, service mesh, and individual data stores per service.

**Pros:**
- Maximum long-term scalability and team autonomy
- Each domain can be deployed and scaled independently
- Technology heterogeneity possible per service

**Cons:**
- Estimated 36–42 months to complete — well beyond the 18-month constraint
- No AWS experience on the team makes distributed systems operations very high risk
- Distributed transaction management required for claims processing workflow (saga pattern complexity)
- Estimated $2.8M in delivery cost — exceeds approved budget by 100%
- High risk of partial delivery: migration stalls with the system split across on-premise and AWS simultaneously
- 15-year-old system does not have clear bounded context documentation — decomposition analysis alone requires months

**Risk:** High  
**Cost:** ~$2.8M migration  
**Scalability Impact:** Maximum — but not achievable within constraints

---

## D. Final Architecture Decision

**Decision: Option 2 — Re-Platform (Containerize + Aurora PostgreSQL)**

### Why This Was Chosen

Option 2 is the only option that:
- Fits within the $1.4M budget and 18-month timeline
- Eliminates Oracle licensing cost (the largest ongoing operational saving)
- Solves the elastic scaling problem (the highest business risk)
- Enables CI/CD deployment pipelines (the highest developer productivity barrier)
- Moves off EOL infrastructure (JBoss AS 7.1 and Oracle 11g)

The Oracle-to-PostgreSQL migration is the primary risk. Analysis of the database layer identified:
- ~420 stored procedures, of which ~60% used Oracle-specific syntax
- Oracle AQ usage limited to 3 queues (manageable to replace with Amazon SQS)
- Oracle-specific SQL constructs (CONNECT BY, ROWNUM, NVL) used throughout application code

These were assessed as addressable within the migration budget and timeline with dedicated migration tooling (AWS Schema Conversion Tool + manual remediation sprint backlog).

### Why Option 1 Was Rejected

Lift-and-shift to EC2 delays every structural problem. The Oracle licensing saving is negligible (~$40K/year). The deployment model does not improve. The EOL security exposure on JBoss AS 7.1 continues. No elastic scaling is enabled. The team would be executing another migration in 3–5 years with accumulated technical debt and no improvement in capabilities.

### Why Option 3 Was Rejected

Microservices decomposition is the architecturally ideal long-term state — but not the correct decision given the actual constraints. The 18-month timeline and $1.4M budget are real constraints. The team has no distributed systems operational experience. A partial microservices migration that stalls mid-way is worse than no migration at all — it leaves the system split across two environments with neither fully operational.

**The incremental path from Option 2 to microservices remains open.** After stabilization in AWS, individual domains (Policy, Notifications, Agent Portal) can be extracted incrementally from the containerized monolith. This is a better risk profile than attempting decomposition before the team has AWS operational experience.

### Architectural Principles Applied

- **Strangler Fig pattern:** Replace functionality incrementally rather than parallel-building a full replacement
- **Phased migration:** Each phase delivers production value and can be stopped without system degradation
- **Managed services preference:** AWS managed services (ECS Fargate, Aurora, ElastiCache) reduce operational burden on a team without existing AWS experience
- **Risk-adjusted architecture:** The right architecture is the one that can be delivered within real constraints, not the theoretically perfect one

---

## E. System Architecture Design

### Target Architecture (Post-Migration)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AWS (ap-southeast-1)                                  │
│                                                                               │
│  ┌──────────────┐    ┌───────────────────────────────────────────────────┐   │
│  │  CloudFront  │    │                    VPC (10.0.0.0/16)              │   │
│  │  + AWS WAF   │    │                                                    │   │
│  └──────┬───────┘    │  ┌─────────────────┐   ┌─────────────────────┐   │   │
│         │            │  │  Public Subnets  │   │  Private Subnets    │   │   │
│         ▼            │  │  (10.0.1.0/24)  │   │  (10.0.10.0/24)    │   │   │
│  ┌──────────────┐    │  │                  │   │                     │   │   │
│  │   Route 53   │    │  │  ┌────────────┐  │   │  ┌───────────────┐  │   │   │
│  │  (DNS + HCK) │    │  │  │    ALB     │  │   │  │  ECS Fargate  │  │   │   │
│  └──────┬───────┘    │  │  │  (HTTPS)   │  │   │  │  (App Tasks)  │  │   │   │
│         │            │  │  └─────┬──────┘  │   │  │               │  │   │   │
│         └────────────┤  └────────┼─────────┘   │  │  ┌─────────┐  │  │   │   │
│                      │           │              │  │  │Claims   │  │  │   │   │
│                      │           └──────────────┼──►  │Policy   │  │  │   │   │
│                      │                          │  │  │Agent    │  │  │   │   │
│                      │                          │  │  └────┬────┘  │  │   │   │
│                      │                          │  └───────┼───────┘  │   │   │
│                      │                          │          │ JDBC      │   │   │
│                      │                          │  ┌───────▼───────┐  │   │   │
│                      │                          │  │  Aurora PG    │  │   │   │
│                      │                          │  │  (Multi-AZ)   │  │   │   │
│                      │                          │  │  Primary +    │  │   │   │
│                      │                          │  │  Read Replica │  │   │   │
│                      │                          │  └───────────────┘  │   │   │
│                      │                          │                      │   │   │
│                      │  ┌─────────────────────┐ │  ┌───────────────┐  │   │   │
│                      │  │  S3 (Documents,     │ │  │  ElastiCache  │  │   │   │
│                      │  │   Reports, Backups) │ │  │  Redis        │  │   │   │
│                      │  └─────────────────────┘ │  │  (Sessions)   │  │   │   │
│                      │                          │  └───────────────┘  │   │   │
│                      │  ┌─────────────────────┐ │  ┌───────────────┐  │   │   │
│                      │  │  Amazon SQS         │ │  │  AWS Secrets  │  │   │   │
│                      │  │  (replaces Oracle   │ │  │  Manager      │  │   │   │
│                      │  │   AQ)               │ │  └───────────────┘  │   │   │
│                      │  └─────────────────────┘ └─────────────────────┘   │   │
│                      └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

**Compute — ECS Fargate**

The application is decomposed from a single EAR into three logical containers, running as separate ECS services within a shared ECS cluster:

| Service | Responsibility | Min Tasks | Max Tasks |
|---------|---------------|-----------|-----------|
| `claims-service` | Claims submission, adjudication workflow | 2 | 20 |
| `policy-service` | Policy management, agent portal | 2 | 10 |
| `batch-service` | Nightly batch processing, report generation | 1 | 4 |

Auto-scaling is configured on CPU (target 60%) and custom CloudWatch metrics for queue depth on SQS (claims intake queue).

**Database — Aurora PostgreSQL**

| Feature | Configuration |
|---------|--------------|
| Engine | Aurora PostgreSQL 15 |
| Class | `db.r6g.xlarge` (primary), `db.r6g.large` (read replica) |
| Multi-AZ | Enabled — automated failover, tested RTO < 60 seconds |
| Read replica | Dedicated endpoint for reporting queries (eliminates OLTP/reporting contention) |
| Backups | Automated daily snapshots, 35-day retention, PITR enabled |
| Encryption | AES-256 at rest (AWS KMS), TLS in transit |

**Session Management — ElastiCache Redis**

HTTP session state is externalized from the ECS containers to ElastiCache Redis (cluster mode, 2 shards, 1 replica per shard). This was the enabler for stateless horizontal scaling — removing the JBoss session replication coupling.

**Document Storage — S3**

Policy documents, claim attachments, and generated reports previously stored on a network-attached SAN are migrated to S3 with:
- Server-side encryption (SSE-S3)
- Lifecycle rules: Standard → Standard-IA at 90 days → Glacier at 365 days
- Pre-signed URLs for time-limited document access (replaces direct NAS path access)

**Messaging — Amazon SQS**

Oracle AQ is replaced with two SQS queues:
- `claims-intake.fifo` — ordered claim event processing (FIFO queue, exactly-once processing)
- `notifications.standard` — policy holder notifications (standard queue, at-least-once)

The three external integrators (reinsurer, state bureau, fraud detection) were migrated from JDBC to REST API endpoints over a 3-month coordination window during Phase 3.

**Security**

| Layer | Control |
|-------|---------|
| Network | VPC with public/private subnet segregation, NAT Gateway for outbound, no direct inbound to private subnets |
| Application | AWS WAF on CloudFront (OWASP Top 10 rules), rate limiting |
| Data | Aurora encryption at rest + in transit, S3 SSE, Secrets Manager for DB credentials |
| Access | IAM roles for ECS task execution, no long-lived credentials in code or environment |
| Audit | CloudTrail enabled, CloudWatch Logs for application logs, VPC Flow Logs |

### Data Flow

**Claim Submission (primary path):**

```
Browser → CloudFront → ALB (HTTPS) → ECS claims-service
  → Aurora PostgreSQL (write) + SQS claims-intake.fifo
  → claims-service consumer → adjudication logic
  → Aurora update + SQS notifications.standard
  → notification consumer → SES (email) + SNS (SMS)
```

**Report Generation (read path):**

```
Scheduled Lambda → ECS batch-service trigger
  → Aurora read replica (read-only endpoint)
  → Report generation → S3 (report storage)
  → Pre-signed URL → CloudFront → end user download
```

---

## F. Migration / Implementation Strategy

### Strategy: Strangler Fig with Parallel Run Validation

The migration is structured so that at every phase boundary, the system is in a stable, production-supportable state. No phase creates a half-migrated system that cannot be operated.

### Phase Plan

**Phase 1 — Foundation (Months 1–3)**

- AWS account structure: Organizations, separate accounts for Prod/Staging/Dev
- VPC design, subnet layout, security groups, IAM baseline
- AWS Landing Zone setup with CloudTrail, Config Rules, GuardDuty
- Infrastructure-as-code baseline (Terraform)
- Team AWS training: AWS Solutions Architect Associate for ops team

Deliverable: Stable AWS networking and security foundation. No application changes.

---

**Phase 2 — Database Migration (Months 3–7)**

- AWS Schema Conversion Tool (SCT) assessment: ~420 stored procedures analyzed
- PostgreSQL compatibility layer: 60% of procedures auto-converted, 40% manual
- Oracle-specific SQL patterns in Java code: identified and cataloged (~1,200 occurrences of `ROWNUM`, `NVL`, `CONNECT BY`, Oracle date functions)
- Aurora PostgreSQL cluster provisioned, initial schema loaded
- AWS DMS (Database Migration Service) configured for change-data-capture replication from Oracle to Aurora
- Dual-write validation: 6-week parallel-run period with Oracle as primary, Aurora receiving all writes, reconciliation jobs validating data consistency

Deliverable: Aurora PostgreSQL fully synchronized with Oracle, validated for data integrity. Oracle remains primary write target.

---

**Phase 3 — Application Modernization (Months 5–11)** *(overlaps Phase 2)*

- EJB 3.1 session beans converted to Spring Boot services
- Hibernate 4 → Hibernate 6 (JPA 3.1) upgrade with PostgreSQL dialect
- JSF/PrimeFaces frontend extracted: static assets to S3/CloudFront, REST API endpoints exposed
- Oracle AQ → Amazon SQS: internal messaging replaced
- Session state: JBoss cluster replication → ElastiCache Redis (Spring Session)
- External integrator coordination: 3 third parties migrated from JDBC to REST API (planned 3-month window)
- Docker image build pipeline: GitHub Actions → ECR
- ECS Fargate service definitions and auto-scaling policies configured

Deliverable: Application runs on ECS Fargate against Aurora PostgreSQL in staging environment. Full regression test pass.

---

**Phase 4 — Traffic Cutover (Month 12)**

- DNS pre-staging: Route 53 record created pointing to ALB (TTL: 60 seconds)
- Maintenance window (30 minutes, 2:00 AM local): final Oracle → Aurora DMS sync, read-only mode on legacy system, Aurora promoted to primary write target, DMS replication stopped
- Traffic cut via Route 53 DNS switch
- Parallel-run monitoring: 72-hour window with original Oracle system on standby (read-only), rollback path maintained via DNS revert

Deliverable: Production traffic 100% on AWS. Legacy system in standby. ✓

---

**Phase 5 — Stabilization (Months 12–15)**

- Production monitoring baseline: CloudWatch dashboards, alarms on error rate, latency, DB CPU
- Performance tuning: auto-scaling threshold calibration, connection pool sizing (HikariCP)
- Open enrollment peak load test: validated ECS auto-scaling to 18 tasks at 2.3× normal load
- Security audit: penetration test, WAF rule tuning
- Legacy Oracle system decommissioned at Month 15

Deliverable: Stable production system. Legacy decommissioned.

---

**Phase 6 — Operational Handover (Months 15–18)**

- Runbook documentation: deployment, rollback, DR failover, scaling procedures
- Aurora failover drill: tested 47-second RTO
- On-call rotation established with AWS operational procedures
- CI/CD pipeline mature: average deployment time 8 minutes, zero-downtime rolling deployments

Deliverable: Fully operational team. Migration complete.

---

### Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| **Oracle → PostgreSQL data loss** | 6-week parallel run with automated reconciliation, DMS validation reports |
| **Third-party JDBC integration failure** | 3-month coordination window in Phase 3; REST API tested with each vendor in staging before cutover |
| **Session state loss during cutover** | Redis persists sessions; no session loss during rolling ECS deployment |
| **ECS auto-scaling failure at peak** | Load test at 150% of expected open enrollment peak in staging before first enrollment window |
| **Aurora failover during business hours** | Multi-AZ, tested failover in staging; application connection retry logic (HikariCP) |
| **Rollback required post-cutover** | Oracle system maintained in standby for 72 hours post-cutover; DNS revert takes <5 minutes |

---

## G. Performance Optimization

### Database — Aurora PostgreSQL Tuning

The Oracle-to-PostgreSQL migration was also an opportunity to address the reporting query performance issues identified in the existing system analysis.

**Reporting isolation:** The Aurora read replica endpoint is exclusively used by `batch-service` and all reporting queries. This eliminates the OLTP/reporting contention that was causing degraded claims processing during report generation.

**Index review:** Oracle indexes were migrated by SCT, but PostgreSQL index usage patterns differ. Post-migration EXPLAIN ANALYZE was run on the 40 highest-frequency queries. Findings:
- 12 queries were using sequential scans despite having indexes — resolved by reviewing index cardinality and updating table statistics (`ANALYZE`)
- 6 queries had composite index column ordering mismatched to query filter patterns — indexes rebuilt with corrected column order
- `partial indexes` added for the most common query filter (`WHERE status = 'ACTIVE' AND policy_type = 'AUTO'`) — reduced index size by 68%

**Connection pool:** HikariCP configured with `maximumPoolSize=20`, `connectionTimeout=30000`, `idleTimeout=600000`, `maxLifetime=1800000` per ECS task. Aurora max_connections calculated against `db.r6g.xlarge` memory ceiling (3,906 max connections / 3 service types × 20 tasks max = 260 connections safety margin maintained).

### Application — ECS Task Tuning

**JVM settings per container:**
```
-XX:+UseContainerSupport
-XX:MaxRAMPercentage=75.0
-XX:+UseG1GC
-XX:MaxGCPauseMillis=200
-Djava.security.egd=file:/dev/./urandom
```

`UseContainerSupport` is critical — without it, the JVM reads host memory rather than container limits and will over-allocate heap.

### Open Enrollment Performance

Pre-migration peak: 15–20% error rate at 2× load. Post-migration result during first open enrollment:
- ECS scaled from 2 to 14 tasks over 22 minutes via CPU-based auto-scaling
- Error rate: 0.02% (SLA threshold 0.5%)
- P99 response time: 1,240ms (target: < 2,000ms)

---

## H. Trade-offs & Engineering Decisions

### Complexity Introduced

**Distributed session management:** Moving from JBoss in-memory session replication to ElastiCache Redis introduces a network-dependent session layer. Redis availability is now a P1 dependency. Mitigated with ElastiCache cluster mode (no single-point failure) and Spring Session fallback configuration.

**Oracle AQ → SQS paradigm shift:** Oracle AQ provided transactional messaging (a message dequeue and a DB write in the same XA transaction). SQS is not XA-capable. The claim intake processing was redesigned using the transactional outbox pattern — write claim to Aurora, write event to `outbox` table in the same JDBC transaction, a separate publisher process polls outbox and publishes to SQS. This is more complex but removes the XA dependency entirely and is idiomatic for the Aurora/SQS model.

**Container operational overhead:** ECS Fargate removes EC2 instance management but adds: container image management, ECR lifecycle policies, ECS task definition versioning, and container resource sizing. Teams needed training on this operational model.

### What Was Sacrificed

**Oracle-specific stored procedure logic:** ~40% of Oracle stored procedures were rewritten in Java service layer code rather than migrated to PL/pgSQL. This increases application codebase size but improves testability (JUnit vs PL/SQL test frameworks) and version control (stored procedures were not in source control).

**JSF/PrimeFaces UI:** The existing JSF frontend was preserved as a React migration was out of scope. Static JSF assets are served from CloudFront but the JSF component lifecycle remains server-side rendered. This is intentional technical debt with a planned React migration in Year 2.

### Long-term Implications

- Aurora PostgreSQL positions the team for Aurora Serverless v2 if transaction volume drops below cost-effective Reserved Instance thresholds
- ECS Fargate creates a natural container abstraction; EKS migration is possible if orchestration complexity requirements grow
- Removing Oracle AQ eliminates the primary barrier to Oracle licensing re-introduction — this path is permanently closed

---

## I. Production Outcome

### System Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Deployment time** | 3 hours (maintenance window) | 8 minutes (rolling, zero-downtime) | 95% reduction |
| **Open enrollment error rate** | 15–20% | 0.02% | ~750× improvement |
| **DR recovery time (RTO)** | ~24 hours (untested) | 47 seconds (tested, automated) | ~1,840× improvement |
| **Infrastructure cost** | $420K/year (Oracle + hardware) | $97K/year (Aurora + ECS) | 77% reduction |
| **Release frequency** | Once per 4–6 weeks | 2–4 times per week | 4–8× improvement |
| **Report generation time** | 30–60 minutes | 4–8 minutes | ~85% reduction |

### Business Impact

- **$323K annual infrastructure cost saving** — Oracle licensing elimination plus hardware decommission
- Open enrollment is now operationally routine rather than a company-wide emergency response event
- The company passed SOC 2 Type II re-audit with AWS infrastructure in scope — simplified evidence collection via CloudTrail and AWS Config
- The migration budget of $1.4M has a payback period of approximately 4.3 years on infrastructure savings alone, excluding productivity and reliability improvements
- Development teams moved to independent service deployments in Phase 6, ending the release coordination bottleneck that was consuming 20% of development capacity
