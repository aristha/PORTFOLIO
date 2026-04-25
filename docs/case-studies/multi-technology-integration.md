# Multi-Technology System Integration

**Domain:** System Integration · API Architecture · Authentication Unification · Cross-Stack Engineering  
**Stack:** React (customer portal) · Vue.js (admin panel) · Java Spring Boot (core API) · Python FastAPI (ML service) · AWS API Gateway  
**Problem:** Four independently built systems with fragmented authentication, duplicated API logic, and no unified contract  
**Pattern:** Backend-for-Frontend (BFF) · OAuth 2.0 / OIDC · OpenAPI 3.x contract-first

---

## A. Business Context

### The Enterprise Problem

A mid-sized retail enterprise had grown its technology portfolio organically over four years. Four separate development teams had delivered four separately-built systems:

1. **Customer Portal** — React SPA, built by an outsourced frontend team. Allows customers to view orders, track deliveries, and manage account information. ~120K active users.
2. **Admin Panel** — Vue.js SPA, built by an internal operations team. Back-office order management, inventory oversight, customer support tooling.
3. **Core API** — Java Spring Boot, built by the main backend team. Manages orders, customers, inventory, payments. The primary domain logic.
4. **Recommendation Engine** — Python FastAPI service, built by a data science team. Generates product recommendations and promotional pricing using ML models.

Each system worked independently. The problem emerged when the business required features that crossed team boundaries — and exposed that the four systems had no coherent integration architecture.

### Why Change Was Necessary

**Authentication fragmentation:** Each system had implemented its own authentication:

| System | Auth Mechanism |
|--------|---------------|
| React customer portal | Custom JWT issued by a dedicated `customer-auth-service` (Spring Boot) |
| Vue.js admin panel | OAuth 2.0 implicit flow against Azure AD (legacy, deprecated) |
| Core API | JWT validation against its own internal user store |
| Python FastAPI ML service | API key passed in header (static key, rotated manually) |

A customer authenticated in the React portal could not access the ML recommendations without the portal backend making a separate API-key call to the Python service. An admin user authenticated via Azure AD could not make API calls to the Core API without a separate session. No single sign-on. No centralized session invalidation.

**API duplication:** The React portal and the Vue.js admin panel both needed order data. Because the Core API exposed general-purpose REST endpoints, both frontends were calling the same endpoints with different data requirements — the portal needed a lightweight order summary (12 fields), the admin panel needed a rich order detail (60+ fields including audit data). Neither was getting exactly what it needed efficiently: the portal over-fetched, the admin panel under-fetched and made follow-up calls.

**No API contract governance:** The Core API team and the frontend teams had no shared contract. Changes to Core API response structures were discovered by frontend teams when their builds broke. The Python ML team had never published an API specification — their endpoint behavior was only documented in a Confluence page that was 18 months out of date.

**Security concerns:** The static API key used by the ML service for inter-service communication was a P0 security issue. If compromised, any caller could invoke the ML service without scope restriction. No audit trail on ML service calls.

### Business Constraints

| Constraint | Detail |
|-----------|--------|
| **No full rewrite** | All four systems are in active production. No freeze on feature delivery accepted. |
| **Team autonomy** | Each team retains ownership of their service. No central team created to own the integration layer. |
| **No breaking changes** | Existing frontend API calls must continue to work during transition. No coordinated big-bang cutover. |
| **6-month delivery window** | New feature requiring cross-system data (personalized recommendation in checkout) blocked until integration layer exists. |
| **Azure AD dependency** | Admin team cannot replace Azure AD for admin auth — IT policy requires all internal systems to use Azure AD. |

---

## B. Existing System Analysis

### Current Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    Internet                                 │
└────────┬────────────────────┬───────────────────┬──────────┘
         │                    │                   │
         ▼                    ▼                   ▼
┌─────────────────┐  ┌────────────────┐  ┌────────────────┐
│  React Customer │  │ Vue.js Admin   │  │  (direct calls │
│  Portal         │  │ Panel          │  │   from portal) │
│  (SPA)          │  │ (SPA)          │  └────────┬───────┘
│                 │  │                │           │
│  Auth: custom   │  │  Auth: Azure   │           │ API key
│  JWT token      │  │  AD OAuth 2.0  │           │
└────────┬────────┘  └───────┬────────┘           │
         │                   │                    ▼
         │ Bearer JWT         │ Bearer Azure AD   ┌────────────────┐
         ▼                   ▼   access token     │ Python FastAPI │
┌─────────────────────────────────────┐           │ ML Service     │
│       Java Spring Boot Core API     │           │                │
│       /api/v1/*                     │           │ Auth: static   │
│                                     │           │ API key        │
│  - customer-auth-service (internal) │           └────────────────┘
│  - validates custom JWT             │
│  - validates Azure AD token         │
│    (separate validation logic)      │
│  - NO validation for ML API key     │
└─────────────────────────────────────┘
```

### Technical Limitations

**Authentication coupling:** The Core API has two separate JWT validation code paths — one for customer JWTs (custom HMAC-signed), one for Azure AD tokens (OIDC). Adding a third client (e.g., a mobile app) requires a third validation path. There is no centralized token issuer.

**API shape mismatch:** The `/api/v1/orders/{id}` endpoint returns all 60+ fields for all callers. The React portal fetches this endpoint on every order list load — 12 fields are used, 48+ are discarded. At 120K active users making 4+ list views per session, this is significant over-fetching.

**GraphQL consideration:** The team briefly explored GraphQL federation to solve the over-fetching problem. Evaluation found: (a) the Python ML service team had no GraphQL experience, (b) GraphQL federation adds a gateway resolver complexity layer that the single existing backend team couldn't support, (c) none of the three frontends used GraphQL. The learning curve across four teams within a 6-month window was assessed as too high.

**Deployed API versioning:** The Core API had no versioning strategy — all endpoints were at `/api/v1/` and changes were made in-place. A versioning strategy was a prerequisite for any BFF layer.

---

## C. Solution Evaluation

### Option 1 — Full API Rewrite with Unified Auth

Rewrite the Core API with a new unified authentication system (all tokens issued by a single OAuth 2.0 authorization server). Consolidate all endpoint contracts. Replace the Python ML service's API key with machine-to-machine OAuth (client credentials).

**Pros:**
- Clean architecture from the start
- Single codebase, single team, single deployment pipeline

**Cons:**
- Requires full feature freeze on all four systems during rewrite — 9–12 months estimated
- Risks regression of existing functionality during migration
- Does not respect team autonomy — consolidation creates a central team dependency
- Does not fit 6-month constraint for the personalized checkout feature

**Risk:** High (feature freeze, regression risk, team disruption)  
**Cost:** 9–12 months × 4 teams  
**Scalability Impact:** High, but not within constraints

---

### Option 2 — Backend-for-Frontend (BFF) + Centralized Auth

Introduce two BFF services (one per frontend type: customer-facing, admin), an API Gateway routing layer, and a centralized OAuth 2.0/OIDC authorization server. Each BFF serves exactly the data shape required by its frontend. Existing Core API and ML service remain unchanged — they become internal services.

**Pros:**
- BFFs can be deployed incrementally per frontend — React portal first, Vue admin panel second
- Existing Core API and ML service require only minimal changes (accept standard OAuth tokens from the new auth server)
- Each frontend gets exactly the API shape it needs — eliminates over-fetch/under-fetch
- Authentication centralized without rewriting existing service implementations
- Team autonomy preserved — each team owns their BFF
- Fits 6-month constraint for checkout feature (React BFF includes recommendation endpoint aggregation)

**Cons:**
- Two new services to build and operate (BFF per frontend type)
- API Gateway adds a network hop
- Token migration: existing React portal users must re-authenticate when the token issuer changes
- Keycloak vs AWS Cognito decision required for auth server
- BFF pattern adds service-to-service call chains (BFF → Core API → ML service) increasing complexity

**Risk:** Medium  
**Cost:** ~4 months for BFF build + auth server setup  
**Scalability Impact:** High — each BFF can be scaled independently from the Core API

---

### Option 3 — GraphQL Federation

Introduce a GraphQL federated gateway (Apollo Federation or Netflix DGS). Each service exposes a GraphQL subgraph. The gateway merges them. Frontends query with GraphQL — exactly the fields they need.

**Pros:**
- Solves over-fetching/under-fetch elegantly for any query pattern
- Single gateway endpoint for all clients
- Schema introspection provides a living API contract

**Cons:**
- Python FastAPI GraphQL support is functional but the ML team had no GraphQL experience
- Apollo Federation operational complexity (schema registry, gateway, subgraph versioning) is high for the team's current operational maturity
- Existing React portal and Vue panel have no GraphQL clients — both would require refactoring
- GraphQL subscription support (for real-time admin updates) requires additional infrastructure
- No existing GraphQL expertise across four teams — learning curve risk

**Risk:** High (cross-team learning curve, operational complexity)  
**Cost:** 8–10 months across teams  
**Scalability Impact:** High, but not achievable within constraints

---

## D. Final Architecture Decision

**Decision: Option 2 — Backend-for-Frontend (BFF) + Centralized OAuth 2.0/OIDC**

### Why This Was Chosen

The BFF pattern is the correct architectural response to the actual problem: **different clients have genuinely different API needs**. The customer portal and the admin panel have different data shapes, different security contexts, and different performance characteristics. Serving them both from the same Core API endpoint is the root cause of the over-fetch problem.

The centralized OAuth 2.0/OIDC authorization server solves the authentication fragmentation without requiring any existing service to be rewritten — they only need to accept tokens from a new issuer.

**Keycloak selected over AWS Cognito:**
- Azure AD federation: Keycloak has native Azure AD identity provider federation via OIDC. Admin team continues to authenticate via Azure AD — Keycloak federates the Azure AD token and issues a Keycloak access token with standardized claims. AWS Cognito's Azure AD federation is less configurable and had limitations with the admin team's Azure AD tenant configuration (B2B guests, multi-tenant).
- Self-hosted Keycloak on ECS provides full control over token format, claim mapping, and session policy without vendor lock-in
- Token portability: Keycloak issues standard OIDC tokens usable by all four services without modification

### Architectural Principles Applied

- **Interface segregation at the API boundary:** Each frontend gets a dedicated interface (BFF) shaped for its specific needs
- **Incremental integration:** BFF for React portal deployed first (needed for the blocked checkout feature); Vue admin BFF in subsequent phase
- **Minimize blast radius:** Existing Core API is not modified — it becomes an internal service. If BFF introduction causes issues, the existing direct integration path can be temporarily reinstated
- **Standards-based auth:** OAuth 2.0/OIDC is the industry standard; all four services can integrate with standard libraries regardless of technology stack

---

## E. System Architecture Design

### Target Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          AWS (ap-southeast-1)                        │
│                                                                       │
│   ┌─────────────────────────────────────────────────────────────┐    │
│   │                    AWS API Gateway                           │    │
│   │  (rate limiting, SSL termination, routing)                   │    │
│   └──────┬──────────────────────────────────┬────────────────────┘   │
│          │ /customer/*                       │ /admin/*               │
│          ▼                                   ▼                        │
│   ┌─────────────────┐               ┌─────────────────┐              │
│   │  Customer BFF   │               │   Admin BFF     │              │
│   │  (Spring Boot)  │               │  (Spring Boot)  │              │
│   │                 │               │                 │              │
│   │  - Order summary│               │  - Order detail │              │
│   │  - Account view │               │  - Inventory    │              │
│   │  - Checkout     │               │  - Customer spt │              │
│   │  - Recommends   │               │  - Audit logs   │              │
│   └────┬────────────┘               └────┬────────────┘              │
│        │ OAuth2 client_credentials        │ OAuth2 client_credentials │
│        ▼                                  ▼                           │
│   ┌─────────────────────────────────────────────────────────────┐    │
│   │              Internal Services (private subnet)              │    │
│   │                                                               │    │
│   │  ┌──────────────────┐    ┌─────────────────────────────┐    │    │
│   │  │  Core API        │    │  Python FastAPI ML Service  │    │    │
│   │  │  (Spring Boot)   │    │  (Recommendations)          │    │    │
│   │  │                  │    │                             │    │    │
│   │  │  Validates:      │    │  Validates:                 │    │    │
│   │  │  Keycloak JWT    │    │  Keycloak JWT (service      │    │    │
│   │  │  (all clients)   │    │   client_credentials scope) │    │    │
│   │  └─────────┬────────┘    └─────────────────────────────┘    │    │
│   │            │ JDBC                                             │    │
│   │  ┌─────────▼────────┐    ┌─────────────────────────────┐    │    │
│   │  │  PostgreSQL /    │    │  Keycloak (auth server)     │    │    │
│   │  │  Aurora          │    │  - Customer realm           │    │    │
│   │  └──────────────────┘    │  - Admin realm (Azure AD    │    │    │
│   │                          │    federation)              │    │    │
│   │                          └─────────────────────────────┘    │    │
│   └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

**AWS API Gateway**

Responsibilities:
- SSL/TLS termination
- Rate limiting: 1,000 req/sec per IP (customer routes), 200 req/sec per IP (admin routes)
- Route-based forwarding to BFF services (`/customer/*` → Customer BFF, `/admin/*` → Admin BFF)
- Request logging to CloudWatch Logs

API Gateway does **not** perform token validation — this is delegated to each BFF. The reasoning: token validation at the gateway layer would require the gateway to understand Keycloak's public keys and token format, creating a coupling that would break if Keycloak's signing key is rotated. BFFs are responsible for their own security context.

**Keycloak (Authorization Server)**

Two realms:

| Realm | Users | Auth Flow |
|-------|-------|-----------|
| `customer` | 120K+ retail customers | Username/password, social login (Google, Facebook) |
| `admin` | Internal operations staff | Azure AD federation (OIDC), MFA enforced by Azure AD |

Token configuration:
- Access token lifetime: 15 minutes (short-lived, reduces blast radius of token compromise)
- Refresh token lifetime: 8 hours (customer), 1 hour (admin)
- Token format: JWT, signed with RS256 (asymmetric — public key published at JWKS endpoint)

Inter-service authentication uses OAuth 2.0 client_credentials grant. Each BFF and the Core API has a registered client with defined scopes:

| Client | Scope | Grants Access To |
|--------|-------|-----------------|
| `customer-bff` | `core-api:read`, `ml-service:recommendations` | Core API read endpoints, ML recommendations |
| `admin-bff` | `core-api:read`, `core-api:write`, `core-api:audit` | Full Core API access |
| `core-api` | `ml-service:recommendations` | ML service (for direct calls if needed) |

**Customer BFF — Spring Boot**

Exposes customer-facing endpoints. Key responsibilities:
- Token validation (validate Keycloak JWT from React portal via JWKS endpoint)
- Response aggregation: `/customer/checkout` aggregates Core API (order creation) + ML service (recommendations) in a single response
- Response shaping: maps Core API's 60-field order response to 12-field customer view
- Error normalization: translates Core API and ML service errors to consistent customer-facing error format

```java
// Example: aggregated checkout endpoint
@GetMapping("/checkout/context")
public CheckoutContext getCheckoutContext(
        @AuthenticationPrincipal Jwt jwt,
        @RequestParam String cartId) {

    String customerId = jwt.getSubject();

    // Parallel calls to Core API and ML service
    CompletableFuture<CartSummary> cartFuture =
        coreApiClient.getCartSummary(cartId, customerId);

    CompletableFuture<List<Recommendation>> recsFuture =
        mlServiceClient.getRecommendations(customerId, cartId);

    return CheckoutContext.builder()
        .cart(cartFuture.join())
        .recommendations(recsFuture.join())
        .build();
}
```

**Admin BFF — Spring Boot**

Exposes admin-facing endpoints. Key differences from Customer BFF:
- Token validation via Azure AD-federated Keycloak tokens (same JWKS endpoint, different realm)
- Role-based access control enforced at BFF level using Keycloak realm roles in JWT claims
- Richer data shapes: full order detail, audit trail, customer service notes
- Write operations forwarded to Core API (Customer BFF is read-mostly)

**Core API — Minimal Changes**

The Core API required two changes only:
1. Replace dual JWT validation (custom JWT + Azure AD) with a single Keycloak JWKS-based validation using Spring Security OAuth2 Resource Server
2. Add scope-based authorization (`@PreAuthorize("hasAuthority('SCOPE_core-api:write')")`) on write endpoints

No endpoint changes. No data model changes. The BFFs absorb all response shaping.

**Python FastAPI ML Service — Minimal Changes**

Replace static API key authentication with Keycloak JWT validation:

```python
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
import httpx

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
KEYCLOAK_JWKS_URL = "https://keycloak.internal/realms/services/protocol/openid-connect/certs"

async def verify_token(token: str = Depends(oauth2_scheme)):
    async with httpx.AsyncClient() as client:
        jwks = (await client.get(KEYCLOAK_JWKS_URL)).json()
    try:
        payload = jwt.decode(token, jwks, algorithms=["RS256"],
                             audience="ml-service")
        if "ml-service:recommendations" not in payload.get("scope", "").split():
            raise HTTPException(status_code=403, detail="Insufficient scope")
        return payload
    except JWTError as e:
        raise HTTPException(status_code=401, detail=str(e))
```

### OpenAPI Contract Governance

Each team publishes an OpenAPI 3.x specification as part of their build pipeline. A GitHub Actions workflow validates:
- No backward-incompatible changes to existing endpoints without a version increment
- All endpoints have defined response schemas (no `{}` schema)
- All security schemes reference the Keycloak JWKS endpoint

The BFF teams consume the Core API and ML service OpenAPI specs to generate typed HTTP clients (using `openapi-generator-cli`). Any breaking change in the Core API spec fails the BFF CI build — providing immediate feedback before deployment.

---

## F. Migration / Implementation Strategy

### Phase 1 — Keycloak Deployment and Customer Auth Migration (Months 1–2)

- Keycloak deployed on ECS Fargate with an Aurora PostgreSQL backend
- `customer` realm created; existing customer user store migrated (password hashes, profile data)
- React portal updated to use Keycloak's OIDC flow (Authorization Code with PKCE) — replaces custom JWT flow
- **Token migration:** Existing users are not invalidated — old custom JWT is accepted alongside Keycloak JWT for 4 weeks (dual-validation window). After 4 weeks, old JWT is rejected.

### Phase 2 — Customer BFF Deployment (Months 2–4)

- Customer BFF built and deployed behind API Gateway
- React portal is updated to call `/customer/*` BFF endpoints instead of Core API directly — **in parallel with Phase 1**
- React portal does not break during transition: API Gateway routes both old (`/api/v1/*`) and new (`/customer/*`) paths for a 4-week parallel period
- Core API updated to validate Keycloak JWTs (Spring Security OAuth2 Resource Server)
- ML service API key replaced with Keycloak client_credentials JWT

### Phase 3 — Admin BFF and Azure AD Federation (Months 3–5)

- Keycloak `admin` realm created with Azure AD identity provider federation
- Admin team re-authenticates via Azure AD → Keycloak issues standardized JWT
- Admin BFF deployed; Vue panel migrated to call `/admin/*` endpoints
- Admin BFF scopes restrict write operations to users with `admin-role` Keycloak realm role

### Phase 4 — Legacy Path Decommission (Month 6)

- Direct `/api/v1/*` access from frontends disabled at API Gateway
- Old custom customer-auth-service decommissioned
- Static ML service API key rotated and invalidated
- OpenAPI contract governance CI checks enforced

---

## G. Performance Optimization

### BFF Response Aggregation Latency

The checkout endpoint aggregates two downstream calls. Sequential calls would add latency (Core API P95: 120ms + ML service P95: 380ms = 500ms+). The parallel execution pattern (`CompletableFuture.allOf`) reduces this to `max(120ms, 380ms) = 380ms` P95.

**Circuit breaker on ML service:** The ML recommendations call is non-critical (checkout can proceed without recommendations). Spring Cloud Circuit Breaker (Resilience4j) is configured with:
- Failure threshold: 50% over a 10-second window
- Wait duration: 30 seconds before half-open
- Fallback: empty recommendations list (checkout is not blocked by ML service unavailability)

### Caching Strategy

Customer BFF caches recommendation responses in Redis (ElastiCache):
- Cache key: `recommendations:{customerId}:{cartId}`
- TTL: 5 minutes (recommendations are personalized but not real-time)
- Reduces ML service load by ~70% during peak browsing sessions (same customer browsing multiple pages)

Core API entity responses (product catalog, category tree) are cached in Spring's `@Cacheable` with Caffeine (local cache, 5-minute TTL). These are high-read, low-write entities that do not need distributed caching.

---

## H. Trade-offs & Engineering Decisions

### Complexity Introduced

**New operational components:** Keycloak adds an operational dependency — if Keycloak is unavailable, authentication for all four systems fails simultaneously. Mitigated with ECS multi-AZ deployment, Keycloak session persistence in Aurora, and a health check monitor. The centralization of auth is both the feature and the risk.

**BFF duplication risk:** The Customer BFF and Admin BFF share a significant overlap in the types of calls they make to the Core API. There is a risk that shared logic duplicates between the two BFFs over time. Mitigated by: (a) a shared library for Core API client generation (from OpenAPI spec), (b) explicitly not creating a "common BFF library" — shared behavior belongs in the Core API, not abstracted between BFFs.

**Token refresh complexity:** The React portal now manages Keycloak token refresh (access token 15-minute lifetime). The silent refresh implementation (using Keycloak's JavaScript adapter) adds client-side state management complexity that the previous custom JWT approach did not have.

### What Was Sacrificed

**Azure AD direct integration in Vue admin panel:** The Vue admin panel previously could inspect the raw Azure AD token for rich user profile data (department, manager, role). With Keycloak federation, the Azure AD token is exchanged for a Keycloak token — only mapped claims are forwarded. The admin team identified 3 Azure AD claims that needed to be explicitly mapped in the Keycloak Azure AD provider configuration.

### Long-term Implications

- The BFF pattern creates a clean extensibility point for a mobile app: a third BFF (`mobile-bff`) can be added without modifying Core API or Auth server
- Keycloak is a migration target for a potential AWS Cognito migration in Year 3 — the OIDC token format is portable regardless of which authorization server issues it
- The OpenAPI contract governance CI check prevents the "broken frontend by backend change" class of integration failures permanently

---

## I. Production Outcome

| Metric | Before | After |
|--------|--------|-------|
| **Auth mechanisms across systems** | 4 separate implementations | 1 centralized Keycloak |
| **Customer portal over-fetch** | 60 fields per order request | 12 fields per order request (80% reduction) |
| **Checkout endpoint round trips** | 3 sequential calls | 1 aggregated BFF call (parallel downstream) |
| **ML service security** | Static API key (no audit) | OAuth 2.0 scoped token (full CloudWatch audit) |
| **Admin→Core API auth failures** | Periodic (Azure AD token expiry mismatch) | Zero (Keycloak manages federation + refresh) |
| **API contract breaks hitting frontend** | ~2/month (discovered in production) | Zero (CI breaks on contract change before deploy) |
| **Checkout P95 latency** | 680ms (sequential calls from frontend) | 390ms (parallel BFF aggregation) |

The blocked personalized checkout feature was delivered in Month 4 — within the 6-month business constraint.
