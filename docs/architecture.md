# SCCVI — Software Architecture

## 1. Architecture Style

SCCVI uses a modular monolith architecture.

The system will be developed as a single deployable web application,
while the source code remains organized into independent domain modules.

Microservices are intentionally excluded from the initial architecture.

The objective is to keep SCCVI:

- Simple to develop
- Easy to deploy
- Easy to test
- Maintainable
- Modular
- Secure
- Suitable for incremental development with Codex

---

## 2. Technology Stack

### Language

TypeScript

### Web Framework

Next.js

### Frontend

React

### Styling

Tailwind CSS
shadcn/ui

### Database

PostgreSQL

### Database Platform

Supabase

### Authentication

Supabase Auth

### ORM

Prisma

### Validation

Zod

### Forms

React Hook Form is approved when a form requires its client-state features.
Current forms use React `useActionState` with Next.js Server Actions and Zod;
no unnecessary form dependency is installed.

### Charts

Recharts

### Unit and Integration Testing

Vitest

### End-to-End Testing

Playwright

### API Documentation

OpenAPI

### Package Manager

npm

---

## 3. High-Level Architecture

Conceptually:

Client
↓
Next.js Application
↓
Application / Domain Services
↓
Prisma ORM
↓
PostgreSQL / Supabase

External services may include:

- Supabase Auth
- Email provider
- Future Telegram provider
- Future WhatsApp provider

The application must not depend unnecessarily on external services.

---

## 4. Application Layers

The application follows four conceptual layers.

### Presentation

Responsible for:

- Pages
- React components
- Forms
- Tables
- Charts
- User interaction

The presentation layer must not be the only location where critical
business rules are implemented.

### Application

Responsible for:

- Actions
- Use cases
- Workflow orchestration
- Coordination between domain services

### Domain

Responsible for:

- Business rules
- Growth assessment
- Vaccination status
- Alert rules
- Authorization-related domain rules
- QR-related domain rules

### Persistence

Responsible for:

- Prisma
- PostgreSQL
- Queries
- Transactions
- Persistence-related operations

---

## 5. Request Flow

A typical protected operation should conceptually follow:

User
↓
Presentation
↓
Server Action / Route Handler
↓
Authentication
↓
Authorization
↓
Zod Validation
↓
Application / Domain Service
↓
Prisma
↓
PostgreSQL

Frontend validation may improve user experience but does not replace
server-side validation.

---

## 6. Primary Modules

The application contains the following primary modules:

- auth
- users
- health-centers
- communities
- guardians
- children
- growth
- vaccination
- alerts
- notifications
- campaigns
- qr
- reports
- dashboard
- audit

Modules should remain logically separated.

Avoid circular dependencies between modules.

---

## 7. Expected Source Structure

The repository should evolve toward:

src/
  app/
  components/
    ui/
    shared/
  modules/
    auth/
    users/
    health-centers/
    communities/
    guardians/
    children/
    growth/
    vaccination/
    alerts/
    notifications/
    campaigns/
    qr/
    reports/
    dashboard/
    audit/
  lib/
    prisma/
    supabase/
    auth/
    errors/
  services/
  validations/
  types/
  constants/

prisma/
  schema.prisma
  seed.ts
  migrations/

tests/
  unit/
  integration/
  e2e/

docs/
  requirements.md
  business-rules.md
  architecture.md
  database.md
  backlog.md
  api/
  uml/
  architecture/
    decisions/

This structure is a target architecture.

Empty directories should not be created unnecessarily.

---

## 8. Internal Module Structure

When required, a domain module may contain:

modules/<module>/
  actions/
  components/
  queries/
  schemas/
  services/
  types/
  utils/

Not every module requires every directory.

Prefer simplicity over unnecessary abstraction.

---

## 9. Authentication Architecture

Authentication is provided by Supabase Auth.

Supabase Auth is responsible for authentication identity.

The SCCVI database maintains the corresponding application profile and
role information.

Authentication and application authorization are separate concerns.

A successfully authenticated user does not automatically have
permission to access every resource.

---

## 10. Authorization Architecture

The server is the primary authorization authority.

Protected operations should conceptually evaluate:

Authenticated user
↓
Role
↓
Requested action
↓
Resource
↓
Ownership / authorized relationship
↓
Allow or deny

The application should provide a reusable authorization mechanism.

Conceptually:

authorize(user, action, resource)

Frontend visibility rules are supplementary and must never be the only
security mechanism.

---

## 11. Community Architecture

Communities belong to a HealthCenter.

Communities organize:

- Guardians
- Children

Community functionality includes:

- Registration
- Consultation
- Update
- Deactivation
- Search
- Filtering

---

## 12. Guardian Architecture

Guardian represents the responsible person associated with one or more
children.

Guardian may optionally be associated with an application User.

This allows SCCVI to register guardians who do not initially have
login access.

Guardian-to-child relationships are managed explicitly through
ChildGuardian.

---

## 13. Child Architecture

Child is a central SCCVI domain entity.

The child profile should act as the primary entry point for:

- General information
- Guardians
- Growth
- Vaccination
- Alerts
- QR digital card

Conceptually, the interface may provide:

Child
├── Overview
├── Growth
├── Vaccination
├── Alerts
└── Digital Card / QR

This avoids scattering the same child's information throughout unrelated
screens.

---

## 14. Growth Architecture

Growth data uses two distinct concepts:

GrowthRecord
and
GrowthAssessment

GrowthRecord represents factual measurements.

GrowthAssessment represents derived calculations.

Conceptual flow:

Health Staff
↓
Growth Form
↓
Server Validation
↓
Growth Service
↓
Store GrowthRecord
↓
Calculate Exact Age
↓
Growth Assessment Service
↓
Approved WHO Reference Dataset
↓
Store GrowthAssessment
↓
Evaluate Alert Rules
↓
Alert Service
↓
Notification Service when required

Original measurements must remain independent from calculated
assessments.

---

## 15. Growth Engine

Growth calculation logic must be isolated from the user interface.

The growth engine may provide functions conceptually similar to:

calculateExactAge()

findGrowthReference()

calculateZScore()

calculatePercentile()

classifyGrowth()

The exact implementation depends on the approved WHO reference dataset.

No official-looking reference data may be invented.

The engine requires automated unit tests.

---

## 16. Growth Dataset Architecture

WHO growth reference information must be maintained in a structured
form.

The implementation must record enough information to identify:

- Standard
- Version
- Sex
- Indicator
- Age reference
- Required calculation parameters

The final data representation depends on the approved official dataset.

Large official reference datasets should not be manually embedded as
unstructured values inside application functions.

---

## 17. Vaccination Architecture

Vaccination uses three separate concepts:

Vaccine
↓
VaccineSchedule
↓
Vaccination

Vaccine defines the vaccine.

VaccineSchedule defines expected doses and timing.

Vaccination records what was actually administered.

Conceptual child vaccination flow:

Child
↓
Approved Vaccine Schedule
↓
Compare with Vaccination History
↓
Determine Dose Status
├── APPLIED
├── PENDING
└── OVERDUE
↓
Evaluate Alert Rules
↓
Alert Service

Vaccination status should be derived where practical.

ADR-006 adds a versioned routine schedule artifact and importer. The status
engine selects the active version for the Guatemala business date and derives
`APPLIED`, `PENDING` or `OVERDUE`. Factual vaccination rows remain linked to
their original schedule version, and campaign rules are not schedule rows.

---

## 18. Alert Architecture

Alert rules must be centralized and testable.

Alerts may originate from:

- Growth
- Vaccination
- Missed follow-up

Conceptual flow:

Domain Event
↓
Alert Rule Evaluation
↓
AlertService
↓
Persist Alert
↓
NotificationService when required

Initial severity values:

PREVENTIVE
CRITICAL

Initial lifecycle:

OPEN
↓
REVIEWED
↓
RESOLVED

---

## 19. Notification Architecture

Core SCCVI logic must not depend directly on a specific notification
provider.

Conceptual design:

Application / Domain Event
↓
NotificationService
↓
Notification Provider

Initial provider type:

Email through the Resend adapter selected in ADR-005

Future optional provider types:

Telegram
WhatsApp

The notification service must record delivery state appropriately.

---

## 20. Campaign Architecture

Campaigns use the notification infrastructure.

Conceptual flow:

Authorized User
↓
Create Campaign
↓
Define Segmentation
↓
Determine Recipients
↓
Create CampaignRecipient Records
↓
NotificationService
↓
Provider
↓
Track Results

The implemented workflow persists recipients as a creation-time snapshot.
Vaccination targeting is dose-specific (`scheduleVersionCode`, `doseCode`,
`doseStatus`) and delegates status calculation to the central vaccination
engine; it never creates a global vaccination state. Age bounds use the
Guatemala business date.

Sending atomically claims a `DRAFT` campaign as `PROCESSING`, revalidates only
contact/center eligibility, and records recipients as `SENT`, `FAILED` or
`SKIPPED`. The campaign becomes `COMPLETED` when no provider delivery failed
and `FAILED` otherwise. Notification uniqueness prevents duplicate delivery
for the same recipient and channel. Creation, send start and aggregate outcome
are audited without message or contact content.

Initial segmentation may include:

- Community
- Age
- Vaccination status

---

## 21. QR Architecture

QR access must use opaque tokens.

The QR must not directly contain child medical information.

Generation flow:

Authorized User
↓
Request Digital Card
↓
Generate Secure Random Token
↓
Protect / Hash Token
↓
Store QRToken
↓
Create Access URL
↓
Generate QR

Access flow:

QR Scan
↓
Public Token Route
↓
Protect / Hash Received Token
↓
Find Matching QRToken
↓
Validate Active State
↓
Validate Expiration if enabled
↓
Validate PIN if required
↓
Authorization / Access Policy
↓
Display Authorized Digital Card

Revoked credentials must not provide access.

---

## 22. Dashboard Architecture

The dashboard should obtain information through dedicated queries or
services rather than duplicating calculations inside components.

Possible metrics:

- Registered children
- Communities
- Open alerts
- Pending vaccinations
- Vaccination coverage

Dashboard queries must respect authorization.

---

## 23. Reports Architecture

Reports may include:

- Growth
- Vaccination
- Alerts
- Communities
- Vaccination coverage
- Incomplete vaccination

Exports may include:

- PDF
- Excel

Report access must respect the same authorization rules used elsewhere
in SCCVI.

Reports must not become an authorization bypass.

The incomplete-vaccination report bulk-loads the applicable schedule version,
active schedules, authorized children and their factual vaccination records.
It then applies the same pure per-dose evaluator used by the child profile. This
avoids sequential per-child database evaluation without duplicating clinical
rules or changing historical cohort applicability.

---

## 24. Audit Architecture

Audit logging is centralized around important operations.

Possible audited events:

- User creation
- Child creation/update
- Growth creation/update
- Vaccination registration
- Alert resolution
- QR creation/revocation
- Relevant authentication events

Audit logging should provide useful traceability without logging every
UI interaction.

The centralized server-only audit service defines approved actions and entity
types and removes credential-like metadata keys recursively. Critical events
are written in the same Prisma transaction as the domain mutation. Audit
persistence therefore fails closed: a write failure rolls back the associated
critical operation rather than leaving an unaudited change.

Guardian mutations, child-guardian association, vaccine catalog mutations,
health-center mutations and community mutations follow this transactional
pattern. Their metadata contains only entity identifiers, changed-field names
and non-sensitive state changes; contact values and clinical content are not
recorded.

---

## 25. API Architecture

REST endpoints should be created where they provide clear value.

Convention:

/api/v1/

Example conceptual resources:

/api/v1/communities

/api/v1/guardians

/api/v1/children

/api/v1/alerts

/api/v1/reports

Public REST endpoints should be documented using OpenAPI.

The application does not require a separate backend service merely to
provide REST endpoints.

Next.js server capabilities will provide the backend functionality.

---

## 26. API Response Convention

Successful response:

{
  "success": true,
  "data": {}
}

Error response:

{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}

Application errors should use stable error codes where useful.

---

## 27. Database Architecture

Database:

PostgreSQL

ORM:

Prisma

Platform:

Supabase

Normal application persistence should use Prisma.

PostgreSQL constraints should be used when they provide stronger
integrity guarantees.

UUID identifiers are preferred.

---

## 28. Database Transactions

Use transactions when several dependent database operations must remain
consistent.

Example:

Create GrowthRecord
+
Create GrowthAssessment
+
Create related Alert

when partial completion would leave the system inconsistent.

Transactions should not be used unnecessarily for unrelated operations.

---

## 29. Deletion Architecture

Important entities should normally use deactivation / soft deletion.

Initial examples:

- Users
- Communities
- Guardians
- Children
- Vaccines

Historical growth and vaccination records must not be silently removed
when a related entity becomes inactive.

---

## 30. Supabase RLS Strategy

The SCCVI application server is the primary authorization authority.

Supabase Row Level Security may be used as defense in depth when direct
Supabase data access requires it.

The architecture should avoid duplicating complex authorization logic
across:

- Frontend
- Next.js server
- Prisma
- RLS

without a clear purpose.

---

## 31. Isolated staging deployment

Staging preserves the modular monolith: one dedicated Vercel project runs the
Next.js application and one dedicated Supabase project provides PostgreSQL and
Auth. Runtime Prisma uses the pooled `DATABASE_URL`; protected deployment tooling
alone receives `DIRECT_URL`. No service-role credential is required by normal
application runtime.

The deployment path is GitHub manual dispatch for a commit already on `main`,
quality checks, isolated tests, protected staging approval, identity-guarded
`migrate deploy`, approved reference-data verification/import, minimal bootstrap,
immutable candidate deployment, non-destructive smoke and stable-hostname
promotion. This is a staging decision only and does not resolve production
hosting TASK-089.

Authorization behavior must remain understandable and testable.

---

## 31. Validation Architecture

Zod is the standard application validation mechanism.

Reusable schemas should be centralized where appropriate.

Example conceptual schemas:

CreateChildSchema

UpdateChildSchema

CreateGuardianSchema

CreateGrowthRecordSchema

CreateVaccinationSchema

Client and server may reuse compatible schemas.

Server validation remains mandatory.

---

## 32. Error Architecture

Application errors should be predictable.

Examples:

UNAUTHORIZED

FORBIDDEN

VALIDATION_ERROR

COMMUNITY_NOT_FOUND

GUARDIAN_NOT_FOUND

CHILD_NOT_FOUND

INVALID_GROWTH_MEASUREMENT

GROWTH_STANDARD_NOT_FOUND

VACCINE_NOT_FOUND

QR_TOKEN_INVALID

QR_TOKEN_REVOKED

Sensitive internal details must not be exposed to clients.

---

## 33. Testing Architecture

Testing is divided into:

### Unit Tests

Used for isolated domain logic.

Priority examples:

- Exact age calculations
- Growth calculations
- Percentile/Z-score logic
- Vaccination status
- Alert rules
- Authorization
- QR token validation

### Integration Tests

Used for workflows involving application services and persistence.

Examples:

Create child
→ Database

Create growth record
→ Assessment

Growth assessment
→ Alert

Vaccination
→ Pending dose calculation

Integration execution requires a separately confirmed test database. The test
guard rejects production, the shared development URL and missing confirmation.
Fixtures are uniquely namespaced and cleaned by recorded identifiers; global
schema resets are prohibited.

### End-to-End Tests

Playwright will test critical user workflows.

Example:

Login
↓
Create community
↓
Create guardian
↓
Create child
↓
Register growth measurement
↓
View growth history/chart

Playwright uses an isolated application/database/Auth environment and a
dedicated fictional user. Missing test credentials are an explicit live-test
blocker, never permission to reuse personal or production credentials. Detailed
variables and commands are documented in `docs/testing.md`.

Playwright global setup performs the asynchronous environment/database
preflight and provisions deterministic fictional QR lifecycle fixtures only
after the persisted `ISOLATED_TEST` identity matches. Cleanup repeats that
identity verification. Desktop Chromium and Pixel 7 execute serially because
they share one controlled child fixture.

---

## 34. Security Architecture

Security requirements include:

- HTTPS in production
- Server-side authorization
- Server-side validation
- Secure authentication
- Environment-based secrets
- Secure random QR tokens
- QR revocation
- PIN hashing when enabled
- Audit of critical events
- Prevention of unauthorized child access
- Safe application errors

Security controls must not depend exclusively on the UI.

---

## 35. Environment Architecture

Conceptual environments:

LOCAL
STAGING
PRODUCTION

Development must not use production credentials.

Each environment should use appropriately isolated configuration.

Production secrets must never be committed to Git.

---

## 36. Deployment Architecture

The application should remain deployable as a standard Next.js
application.

Database and authentication services are provided through Supabase.

The exact web hosting provider is intentionally not fixed at this stage.

The architecture should avoid unnecessary provider lock-in.

GitHub Actions currently provides validation-only CI. Static quality checks use
no database secrets. A separate protected job may access only the isolated
`sccvi-test` environment for integration and Playwright execution. Neither
workflow deploys the application.

---

## 37. Git Architecture

Stable branch:

main

Development occurs in task branches.

Examples:

task/001-init-nextjs

task/008-initial-prisma-schema

task/034-growth-form

Important changes should use Pull Requests.

Preferred merge strategy:

Squash and Merge

Main should remain stable.

---

## 38. Documentation Architecture

Project knowledge should remain inside the repository.

Important documentation:

AGENTS.md

docs/requirements.md

docs/business-rules.md

docs/architecture.md

docs/database.md

docs/backlog.md

docs/api/openapi.yaml

docs/uml/

Architecture decisions may be recorded using ADRs inside:

docs/architecture/decisions/

---

## 39. Architecture Decision Records

Important architectural decisions should be documented when necessary.

Example future ADRs:

ADR-001 — Modular Monolith

ADR-002 — PostgreSQL

ADR-003 — Supabase Auth

ADR-004 — Prisma

Each ADR should explain:

- Context
- Decision
- Reason
- Consequences

---

## 40. Architectural Constraints

Codex must not introduce without explicit approval:

- Microservices
- Separate backend framework
- Native mobile application
- Additional ORM
- Alternative authentication architecture
- New database technology
- Unnecessary infrastructure

Architectural changes must be intentional and documented.

---

## 41. Architecture Principle

The preferred solution is the simplest architecture that:

- Satisfies SCCVI requirements
- Preserves data integrity
- Enforces security
- Supports automated testing
- Remains understandable
- Can be maintained efficiently
- Allows incremental development

Complexity must be justified rather than introduced by default.
