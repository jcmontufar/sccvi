# SCCVI — Development Backlog

## 1. Purpose

This document defines the ordered implementation backlog for SCCVI.

Codex must work incrementally.

A task must not automatically trigger implementation of the next task.

Before starting a task, Codex must:

1. Read `AGENTS.md`
2. Read the relevant files inside `/docs`
3. Review task dependencies
4. Inspect the existing implementation
5. Stay within the task scope

---

# 2. Task Status

Supported statuses:

- TODO
- IN_PROGRESS
- IN_REVIEW
- BLOCKED
- DONE

Normal lifecycle:

TODO
→ IN_PROGRESS
→ IN_REVIEW
→ DONE

Use BLOCKED when a required technical or domain decision is missing.

---

# 3. Priority

Priority levels:

- P0 — Critical
- P1 — High
- P2 — Normal
- P3 — Low

---

# MILESTONE 1 — FOUNDATION

## EPIC-01 — Project Initialization

### TASK-001 — Initialize Next.js Application

Status: TODO  
Priority: P1  
Dependencies: None

Objective:

Create the initial SCCVI Next.js application.

Requirements:

- Initialize Next.js
- Enable TypeScript
- Use npm
- Create the application inside the existing repository
- Preserve existing project documentation
- Application must run locally
- Do not implement domain functionality

Acceptance Criteria:

- Next.js application starts successfully
- TypeScript is enabled
- Existing `AGENTS.md` and `/docs` remain intact
- No unnecessary dependencies are introduced
- Production build succeeds

---

### TASK-002 — Configure TypeScript Strict Mode

Status: TODO  
Priority: P1  
Dependencies: TASK-001

Requirements:

- Enable strict TypeScript configuration
- Do not use `any` to bypass errors
- Configure useful path aliases where appropriate

Acceptance Criteria:

- TypeScript strict mode enabled
- Existing application compiles successfully
- Type checking succeeds

---

### TASK-003 — Configure Code Quality

Status: TODO  
Priority: P1  
Dependencies: TASK-001

Requirements:

- Configure ESLint
- Add consistent formatting strategy
- Add required npm scripts

Expected scripts should evolve toward:

- lint
- typecheck
- test
- build
- test:e2e

Acceptance Criteria:

- Lint command works
- Formatting conventions are documented/configured
- Existing source passes lint

---

### TASK-004 — Configure UI Foundation

Status: TODO  
Priority: P2  
Dependencies: TASK-001

Requirements:

- Configure Tailwind CSS
- Configure shadcn/ui
- Establish basic responsive UI foundation
- Do not build complete domain screens

Acceptance Criteria:

- Tailwind works
- shadcn/ui works
- Basic reusable UI component can render
- Build succeeds

---

### TASK-005 — Environment Validation

Status: TODO  
Priority: P1  
Dependencies: TASK-001

Requirements:

- Create `.env.example`
- Establish typed/validated environment configuration
- Use Zod where appropriate
- Separate public and private environment variables
- Never commit real secrets

Acceptance Criteria:

- Required variables are documented
- Missing required configuration produces predictable development errors
- Secrets remain outside version control

---

## EPIC-02 — Database Foundation

### TASK-006 — Configure Supabase Project Integration

Status: TODO  
Priority: P1  
Dependencies: TASK-005

Requirements:

- Prepare Supabase client configuration
- Separate browser/server usage where necessary
- Do not expose service-role credentials
- Do not implement authentication flows yet

Acceptance Criteria:

- Supabase configuration is centralized
- Environment variables are used
- Build succeeds
- No secret is exposed client-side

---

### TASK-007 — Configure Prisma

Status: TODO  
Priority: P1  
Dependencies: TASK-005

Requirements:

- Install and configure Prisma
- Configure PostgreSQL connection
- Use environment variables
- Create initial Prisma structure

Acceptance Criteria:

- Prisma validates successfully
- Database connection configuration is documented
- No credentials are committed

---

### TASK-008 — Initial Prisma Domain Schema

Status: TODO  
Priority: P1  
Dependencies: TASK-007

Requirements:

Implement the initial SCCVI Prisma schema according to:

- `docs/database.md`
- `docs/business-rules.md`

Include the domain entities that are sufficiently defined.

Do not invent:

- WHO reference values
- Vaccination schedule data

Acceptance Criteria:

- Relationships match documentation
- Important unique constraints exist
- Appropriate enums exist
- Appropriate indexes exist
- Prisma schema validates
- Migration can be generated successfully

---

### TASK-009 — Initial Database Migration

Status: TODO  
Priority: P1  
Dependencies: TASK-008

Requirements:

- Generate initial migration
- Review migration for destructive or unexpected behavior
- Apply to development database

Acceptance Criteria:

- Migration succeeds
- Schema and migration are versioned
- Database matches Prisma schema

---

### TASK-010 — Development Seed Foundation

Status: TODO  
Priority: P2  
Dependencies: TASK-009

Requirements:

Create safe development seed infrastructure.

May include fictional:

- Health center
- Communities
- Users where technically appropriate

Must not include:

- Real patient data
- Invented official WHO reference data
- Invented official vaccination schedule

Acceptance Criteria:

- Seed runs successfully
- Seed is repeatable where practical
- No sensitive real-world data is included

---

## EPIC-03 — Authentication and Authorization

### TASK-011 — Supabase Authentication Foundation

Status: TODO  
Priority: P1  
Dependencies: TASK-006, TASK-009

Requirements:

- Integrate Supabase Auth
- Establish server authentication utilities
- Establish session handling
- Do not implement every role screen yet

Acceptance Criteria:

- Authenticated session can be identified server-side
- Unauthenticated access can be detected
- Secrets remain protected

---

### TASK-012 — Login Flow

Status: TODO  
Priority: P1  
Dependencies: TASK-011

Requirements:

- Create login page
- Validate credentials through Supabase Auth
- Handle authentication errors safely
- Redirect authenticated users appropriately

Acceptance Criteria:

- Valid login succeeds
- Invalid login displays safe error
- Protected application area requires authentication

---

### TASK-013 — Application User Profile

Status: TODO  
Priority: P1  
Dependencies: TASK-011

Requirements:

- Connect Supabase Auth identity with SCCVI User
- Load role and active status
- Handle missing/inactive application profile safely

Acceptance Criteria:

- Authenticated user resolves to application profile
- Inactive users cannot use protected application functionality

---

### TASK-014 — Authorization Service

Status: TODO  
Priority: P0  
Dependencies: TASK-013

Requirements:

Create reusable server-side authorization.

Support initial roles:

- ADMIN
- HEALTH_STAFF
- CENTER_MANAGER
- GUARDIAN

Acceptance Criteria:

- Authorization decisions occur server-side
- Unauthorized actions return predictable errors
- Authorization logic has automated tests

---

### TASK-015 — Protected Application Layout

Status: TODO  
Priority: P1  
Dependencies: TASK-012, TASK-014

Requirements:

- Create protected application shell
- Navigation adapts to authorized role
- Frontend visibility supplements server authorization

Acceptance Criteria:

- Unauthenticated users cannot access protected layout
- Navigation is role-aware
- Server authorization remains authoritative

---

# MILESTONE 2 — CORE REGISTRY

## EPIC-04 — Health Centers

### TASK-016 — Health Center Domain

Status: TODO  
Priority: P2  
Dependencies: TASK-009, TASK-014

Requirements:

- Implement HealthCenter queries/services
- Support required validation
- Respect authorization

Acceptance Criteria:

- Health center can be read safely
- Domain validation is tested where relevant

---

### TASK-017 — Health Center Administration

Status: TODO  
Priority: P2  
Dependencies: TASK-016

Requirements:

- View health center information
- Update authorized fields
- Support active state where appropriate

Acceptance Criteria:

- Unauthorized users cannot modify health center
- Valid updates persist correctly

---

## EPIC-05 — Communities

### TASK-018 — Community Domain

Status: TODO  
Priority: P1  
Dependencies: TASK-009, TASK-014

Requirements:

- Create validation schemas
- Create community service/query layer
- Implement documented uniqueness rules

Acceptance Criteria:

- Domain operations respect health center scope
- Validation exists
- Duplicate invalid communities are prevented

---

### TASK-019 — Community CRUD

Status: TODO  
Priority: P1  
Dependencies: TASK-018

Requirements:

- Create community
- View community
- Update community
- Deactivate community
- Search/filter communities

Acceptance Criteria:

- CRUD operations work
- Authorization enforced server-side
- Deactivation preserves historical data
- Tests cover critical operations

---

### TASK-020 — Community User Interface

Status: TODO  
Priority: P2  
Dependencies: TASK-019

Requirements:

- Community list
- Create form
- Edit form
- Search/filter interface
- Responsive layout

Acceptance Criteria:

- UI works on desktop and mobile
- Validation errors are understandable
- UI does not bypass server authorization

---

## EPIC-06 — Guardians

### TASK-021 — Guardian Domain

Status: TODO  
Priority: P1  
Dependencies: TASK-009, TASK-014, TASK-018

Requirements:

- Guardian validation
- Guardian service/query layer
- Notification preference support
- Optional application user relationship

Acceptance Criteria:

- Guardian can exist without login account
- Domain constraints respected

---

### TASK-022 — Guardian CRUD

Status: TODO  
Priority: P1  
Dependencies: TASK-021

Requirements:

- Create guardian
- View guardian
- Update guardian
- Deactivate guardian
- Search/filter guardians

Acceptance Criteria:

- Operations work
- Authorization enforced
- Historical relationships preserved

---

### TASK-023 — Guardian User Interface

Status: TODO  
Priority: P2  
Dependencies: TASK-022

Requirements:

- Guardian list
- Guardian form
- Guardian detail view
- Responsive design

Acceptance Criteria:

- Core guardian workflow usable
- Validation errors displayed appropriately

---

## EPIC-07 — Children

### TASK-024 — Child Domain

Status: TODO  
Priority: P1  
Dependencies: TASK-009, TASK-014, TASK-018

Requirements:

- Child validation
- Child service/query layer
- Community relationship
- Active/inactive behavior

Acceptance Criteria:

- Invalid child data rejected
- Child operations respect authorization

---

### TASK-025 — Child-Guardian Relationship

Status: TODO  
Priority: P0  
Dependencies: TASK-021, TASK-024

Requirements:

- Associate guardian with child
- Support relationship type
- Support primary guardian
- Prevent duplicate relationship

Acceptance Criteria:

- `childId + guardianId` uniqueness enforced
- Relationship operations tested
- Authorization considered

---

### TASK-026 — Guardian Resource Authorization

Status: TODO  
Priority: P0  
Dependencies: TASK-014, TASK-025

Requirements:

Implement authorization ensuring GUARDIAN users can only access explicitly associated children.

Acceptance Criteria:

- Authorized guardian can access associated child
- Guardian cannot access unrelated child
- Manual child-ID manipulation is denied
- Automated IDOR tests exist

---

### TASK-027 — Child CRUD

Status: TODO  
Priority: P1  
Dependencies: TASK-024, TASK-025

Requirements:

- Create child
- View child
- Update child
- Deactivate child
- Search/filter children

Acceptance Criteria:

- CRUD works
- Relationships work
- Authorization enforced
- Historical data preserved on deactivation

---

### TASK-028 — Child User Interface

Status: TODO  
Priority: P1  
Dependencies: TASK-027

Requirements:

- Child list
- Child form
- Child detail page
- Guardian information
- Responsive layout

Acceptance Criteria:

- Core child workflow usable
- Authorization-safe
- Responsive

---

### TASK-029 — Child Profile Navigation

Status: TODO  
Priority: P2  
Dependencies: TASK-028

Requirements:

Provide child-centered navigation for:

- Overview
- Growth
- Vaccination
- Alerts
- Digital card

Acceptance Criteria:

- Child modules share consistent navigation
- Unauthorized sections remain protected

---

# MILESTONE 3 — GROWTH

## EPIC-08 — Growth Records

### TASK-030 — Growth Record Domain

Status: TODO  
Priority: P1  
Dependencies: TASK-027

Requirements:

- GrowthRecord validation
- Measurement date validation
- Weight/height validation
- Preserve historical measurements

Acceptance Criteria:

- Future measurement dates rejected
- Valid measurements accepted
- Domain tests exist

---

### TASK-031 — Exact Age Calculation

Status: TODO  
Priority: P0  
Dependencies: TASK-030

Requirements:

Create deterministic age calculation using:

birth date
→ measurement date

Acceptance Criteria:

- Does not use current date for historical measurements
- Boundary cases tested
- Leap-year/date cases tested where relevant

---

### TASK-032 — Growth Record CRUD

Status: TODO  
Priority: P1  
Dependencies: TASK-030, TASK-031

Requirements:

- Register growth measurement
- View history
- Authorized correction/update workflow
- Maintain auditability

Acceptance Criteria:

- Measurements persist correctly
- History is chronological
- Authorization enforced

---

### TASK-033 — Growth User Interface

Status: TODO  
Priority: P2  
Dependencies: TASK-032

Requirements:

- Growth registration form
- Growth history
- Child profile integration

Acceptance Criteria:

- Responsive
- Validation feedback clear
- Historical data displayed correctly

---

## EPIC-09 — WHO Growth Engine

### TASK-034 — Select and Document WHO Dataset

Status: IN_REVIEW
Priority: P0  
Dependencies: External domain decision

Requirements:

- Select approved official WHO dataset
- Document source
- Document version
- Document supported indicators
- Determine physical representation

Acceptance Criteria:

- Approved source documented
- Version documented
- Dataset structure understood

No implementation may invent this information.

---

### TASK-035 — Import WHO Growth Reference Data

Status: IN_REVIEW
Priority: P0  
Dependencies: TASK-034

Requirements:

- Import approved reference data
- Validate imported structure
- Preserve dataset version

Acceptance Criteria:

- Imported data matches approved source
- No manually invented values
- Import is reproducible

---

### TASK-036 — Growth Assessment Engine

Status: IN_REVIEW
Priority: P0  
Dependencies: TASK-031, TASK-035

Requirements:

Implement:

- Reference selection
- Z-score calculation where supported
- Percentile calculation where supported
- Classification

Implementation note: BATCH-05 persists z-score and percentile but leaves
classification null because SCCVI has not approved classification thresholds.

Acceptance Criteria:

- Calculations use approved dataset
- Unit tests cover reference examples
- No UI dependency
- Dataset version attached to results

---

### TASK-037 — Growth Assessment Persistence

Status: IN_REVIEW
Priority: P1  
Dependencies: TASK-036

Requirements:

- Store GrowthAssessment separately
- Preserve GrowthRecord
- Support recalculation without corrupting original measurement

Acceptance Criteria:

- Measurement remains unchanged
- Assessment contains standard/version
- Duplicate invalid assessment prevented

---

### TASK-038 — Growth Charts

Status: IN_REVIEW
Priority: P2  
Dependencies: TASK-036, TASK-037

Requirements:

Use Recharts to display initial:

- Weight for age
- Height/length for age

Acceptance Criteria:

- Charts use actual child data
- Reference interpretation is consistent with approved engine
- Responsive presentation

---

# MILESTONE 4 — VACCINATION

## EPIC-10 — Vaccine Catalog

### TASK-039 — Vaccine Domain and CRUD

Status: TODO  
Priority: P1  
Dependencies: TASK-014

Requirements:

- Vaccine validation
- Create/view/update/deactivate
- Preserve historical references

Acceptance Criteria:

- Vaccine catalog works
- Duplicate invalid names prevented where applicable
- Authorization enforced

---

### TASK-040 — Vaccine Catalog UI

Status: TODO  
Priority: P2  
Dependencies: TASK-039

Requirements:

- Vaccine list
- Vaccine form
- Active/inactive management

Acceptance Criteria:

- Authorized workflow usable
- Responsive UI

---

## EPIC-11 — Vaccination Schedule

### TASK-041 — Select and Document Vaccination Schedule

Status: BLOCKED  
Priority: P0  
Dependencies: External domain decision

Requirements:

- Select approved schedule
- Document authoritative source
- Document version/date
- Define supported doses

Acceptance Criteria:

- Approved source documented
- Version documented
- Dose structure defined

Do not invent schedule data.

---

### TASK-042 — Import Vaccination Schedule

Status: BLOCKED  
Priority: P0  
Dependencies: TASK-041

Requirements:

- Import approved schedule
- Validate data
- Preserve schedule version

Acceptance Criteria:

- Import reproducible
- Imported values match approved source

---

### TASK-043 — Vaccination Status Engine

Status: BLOCKED  
Priority: P0  
Dependencies: TASK-042

Requirements:

Determine:

- APPLIED
- PENDING
- OVERDUE

using child age, schedule and vaccination history.

Acceptance Criteria:

- Deterministic
- Tested
- No static redundant status required

---

## EPIC-12 — Vaccination Records

### TASK-044 — Vaccination Record Domain

Status: TODO  
Priority: P1  
Dependencies: TASK-027, TASK-039

Requirements:

- Vaccination validation
- Historical record handling
- Authorized recorder
- Prepare schedule relationship

Acceptance Criteria:

- Valid record persists
- Historical application date preserved

---

### TASK-045 — Vaccination Registration

Status: BLOCKED  
Priority: P1  
Dependencies: TASK-042, TASK-044

Requirements:

- Register administered dose
- Link approved schedule
- View vaccination history

Acceptance Criteria:

- Correct child and dose association
- Authorization enforced
- History preserved

---

### TASK-046 — Vaccination User Interface

Status: BLOCKED  
Priority: P2  
Dependencies: TASK-045

Requirements:

- Vaccination history
- Register vaccination form
- Pending/overdue display

Acceptance Criteria:

- Child profile integration
- Responsive UI
- Derived status displayed correctly

---

# MILESTONE 5 — ALERTS AND NOTIFICATIONS

## EPIC-13 — Alerts

### TASK-047 — Alert Domain

Status: TODO  
Priority: P1  
Dependencies: TASK-014, TASK-027

Requirements:

Implement:

- Alert types
- Severity
- Lifecycle
- Source traceability

Acceptance Criteria:

- OPEN/REVIEWED/RESOLVED supported
- PREVENTIVE/CRITICAL supported
- Authorization enforced

---

### TASK-048 — Growth Alert Rules

Status: BLOCKED  
Priority: P0  
Dependencies: TASK-036, TASK-047

Blocked reason: SCCVI has not approved growth alert z-score thresholds,
classification policy or alert wording. BATCH-05 does not invent them.

Requirements:

Generate appropriate monitoring alerts from approved growth assessment.

Acceptance Criteria:

- Centralized rules
- Tested
- No definitive diagnosis wording

---

### TASK-049 — Vaccination Alert Rules

Status: BLOCKED  
Priority: P0  
Dependencies: TASK-043, TASK-047

Requirements:

Generate alerts for:

- Pending doses
- Overdue doses

Acceptance Criteria:

- Centralized rules
- Tested
- Traceable to vaccination logic

---

### TASK-050 — Missed Follow-Up Alerts

Status: IN_REVIEW
Priority: P2  
Dependencies: TASK-047

Requirements:

Establish approved follow-up rule configuration before generating alerts.

Acceptance Criteria:

- Rule is explicit
- Alert generation tested
- No hidden hardcoded assumption

---

### TASK-051 — Alert Management UI

Status: TODO  
Priority: P1  
Dependencies: TASK-047

Requirements:

- Alert list
- Filters
- Detail
- Review
- Resolve

Acceptance Criteria:

- Authorization enforced
- Resolution auditable
- Responsive UI

---

## EPIC-14 — Notifications

### TASK-052 — Notification Service Abstraction

Status: TODO  
Priority: P1  
Dependencies: TASK-047

Requirements:

Create provider-independent notification service.

Acceptance Criteria:

- Domain does not depend directly on provider
- PENDING/SENT/FAILED supported
- Failures recorded

---

### TASK-053 — Select Email Provider

Status: IN_REVIEW
Priority: P1  
Dependencies: External technical decision

Requirements:

- Select email provider
- Document configuration
- Document required environment variables

Acceptance Criteria:

- Provider decision documented
- Secrets strategy documented

---

### TASK-054 — Email Provider Integration

Status: IN_REVIEW
Priority: P1  
Dependencies: TASK-052, TASK-053

Requirements:

- Implement email provider adapter
- Record success/failure
- Protect credentials

Acceptance Criteria:

- Test email can be delivered in approved environment
- Failure is recorded correctly

---

### TASK-055 — Alert Email Notifications

Status: IN_REVIEW
Priority: P1  
Dependencies: TASK-054, TASK-048 and/or TASK-049

BATCH-05 operational scope: `MISSED_FOLLOW_UP` email is enabled by the explicit
TASK-050 rule. Growth and vaccination alert emails remain blocked with their
respective rule tasks.

Requirements:

Send appropriate guardian notification for configured alerts.

Acceptance Criteria:

- Guardian relationship respected
- Delivery logged
- Failed delivery not marked SENT

---

# MILESTONE 6 — ADVANCED FEATURES

## EPIC-15 — Campaigns

### TASK-056 — Campaign Domain

Status: TODO  
Priority: P2  
Dependencies: TASK-052

Requirements:

- Campaign entity workflow
- Segmentation model
- Recipient resolution
- Delivery lifecycle

Acceptance Criteria:

- Campaign remains provider-independent
- Authorization enforced

---

### TASK-057 — Campaign Segmentation

Status: TODO  
Priority: P2  
Dependencies: TASK-056

Initial criteria:

- Community
- Age
- Vaccination status

Acceptance Criteria:

- Recipient selection deterministic
- Duplicate guardian recipients prevented

---

### TASK-058 — Campaign User Interface

Status: TODO  
Priority: P2  
Dependencies: TASK-056, TASK-057

Requirements:

- Create campaign
- Configure segmentation
- Preview recipients
- Review delivery status

Acceptance Criteria:

- Authorized workflow usable
- Responsive UI

---

## EPIC-16 — QR Digital Card

### TASK-059 — QR Token Security Service

Status: TODO  
Priority: P0  
Dependencies: TASK-014, TASK-027

Requirements:

- Secure random token generation
- Token protection/hash
- Validation
- Revocation
- Optional expiration

Acceptance Criteria:

- Raw protected token not unnecessarily persisted
- Revoked token denied
- Invalid token denied
- Automated security tests

---

### TASK-060 — QR PIN Protection

Status: TODO  
Priority: P1  
Dependencies: TASK-059

Requirements:

- Optional PIN
- Secure PIN hashing
- PIN verification

Acceptance Criteria:

- Plaintext PIN never stored
- Incorrect PIN denied
- Correct PIN accepted

---

### TASK-061 — Digital Card Access

Status: TODO  
Priority: P1  
Dependencies: TASK-059

Requirements:

- Public opaque-token route
- Validate QR credential
- Display authorized child card information
- Minimize exposed information

Acceptance Criteria:

- No child ID required in public URL
- Invalid/revoked token denied
- Sensitive data not encoded in QR

---

### TASK-062 — QR Generation UI

Status: TODO  
Priority: P2  
Dependencies: TASK-059, TASK-061

Requirements:

- Authorized QR generation
- Display/download/print as appropriate
- Revoke credential
- Regenerate credential

Acceptance Criteria:

- Authorization enforced
- QR resolves correctly
- Revocation works

---

## EPIC-17 — Dashboard

### TASK-063 — Dashboard Query Layer

Status: TODO  
Priority: P2  
Dependencies: Core registry and alert functionality

Requirements:

Provide authorized metrics such as:

- Registered children
- Communities
- Open alerts
- Pending vaccines where available
- Vaccination coverage where available

Acceptance Criteria:

- Queries centralized
- Authorization respected

---

### TASK-064 — Dashboard UI

Status: TODO  
Priority: P2  
Dependencies: TASK-063

Requirements:

- Metric cards
- Relevant charts
- Responsive layout

Acceptance Criteria:

- Desktop/mobile usable
- Metrics accurate
- Authorization respected

---

## EPIC-18 — Reports

### TASK-065 — Reports Query Layer

Status: TODO  
Priority: P2  
Dependencies: Relevant domain modules

Requirements:

Support authorized reports for:

- Growth
- Vaccination
- Alerts
- Communities
- Coverage
- Incomplete vaccination

Acceptance Criteria:

- Filters work
- Authorization respected
- Queries do not expose unauthorized children

---

### TASK-066 — PDF Report Export

Status: TODO  
Priority: P2  
Dependencies: TASK-065

Acceptance Criteria:

- Approved report can export PDF
- Output is readable
- Authorization respected

---

### TASK-067 — Excel Report Export

Status: TODO  
Priority: P2  
Dependencies: TASK-065

Acceptance Criteria:

- Approved report can export Excel
- Structured columns
- Authorization respected

---

# MILESTONE 7 — QUALITY AND DEPLOYMENT

## EPIC-19 — Audit

### TASK-068 — Audit Service

Status: TODO  
Priority: P1  
Dependencies: Core application foundation

Requirements:

Create centralized audit service.

Acceptance Criteria:

- Important events can be recorded
- Secrets excluded
- Audit failure strategy documented

---

### TASK-069 — Integrate Critical Audit Events

Status: TODO  
Priority: P1  
Dependencies: TASK-068

Initial events:

- User creation
- Child create/update
- Growth create/update
- Vaccination registration
- Alert resolution
- QR generation/revocation

Acceptance Criteria:

- Important operations create useful audit records
- Trivial UI events are not excessively logged

---

## EPIC-20 — API Documentation

### TASK-070 — OpenAPI Foundation

Status: TODO  
Priority: P2  
Dependencies: Public REST endpoints exist

Requirements:

- Create `docs/api/openapi.yaml`
- Document public REST conventions
- Document implemented public endpoints

Acceptance Criteria:

- Specification valid
- Matches implementation

---

## EPIC-21 — Testing

### TASK-071 — Unit Test Coverage Review

Status: TODO  
Priority: P1  
Dependencies: Core modules implemented

Requirements:

Review critical domain test coverage.

Priority:

- Age
- Growth
- Vaccination
- Alerts
- Authorization
- QR

Acceptance Criteria:

- Critical gaps identified and addressed

---

### TASK-072 — Integration Test Suite

Status: TODO  
Priority: P1  
Dependencies: Core modules implemented

Requirements:

Cover important persistence workflows.

Acceptance Criteria:

- Critical database workflows tested
- Test isolation maintained

---

### TASK-073 — Playwright E2E Foundation

Status: TODO  
Priority: P1  
Dependencies: Authentication and core UI

Requirements:

- Configure Playwright
- Establish test environment strategy
- Create first critical workflow

Acceptance Criteria:

- E2E suite executes successfully

---

### TASK-074 — Core Registry E2E

Status: TODO  
Priority: P1  
Dependencies: TASK-073, core registry UI

Workflow:

Login
→ Community
→ Guardian
→ Child

Acceptance Criteria:

- Critical registry workflow passes

---

### TASK-075 — Growth E2E

Status: BLOCKED  
Priority: P1  
Dependencies: TASK-073, growth engine/UI

Workflow:

Login
→ Child
→ Growth measurement
→ Assessment
→ History/chart

Acceptance Criteria:

- Critical growth workflow passes

---

### TASK-076 — Vaccination E2E

Status: BLOCKED  
Priority: P1  
Dependencies: TASK-073, vaccination functionality

Workflow:

Login
→ Child
→ Vaccination
→ History/status

Acceptance Criteria:

- Critical vaccination workflow passes

---

### TASK-077 — QR Security E2E

Status: TODO  
Priority: P0  
Dependencies: TASK-059, TASK-061, TASK-073

Test:

- Valid token
- Invalid token
- Revoked token
- Expired token where enabled
- PIN protected access where enabled

Acceptance Criteria:

- Unauthorized access paths fail safely

---

## EPIC-22 — Security Review

### TASK-078 — Authorization Security Review

Status: TODO  
Priority: P0  
Dependencies: Core protected modules

Requirements:

Review:

- Roles
- Resource scope
- Guardian access
- IDOR
- Server-side enforcement

Acceptance Criteria:

- No known critical authorization bypass remains

---

### TASK-079 — Secret and Configuration Review

Status: TODO  
Priority: P0  
Dependencies: Deployment preparation

Requirements:

Review:

- Git history
- Environment configuration
- Client bundle exposure
- Provider keys
- Database credentials

Acceptance Criteria:

- No known secret exposed

---

### TASK-080 — Input Validation Review

Status: TODO  
Priority: P1  
Dependencies: Core application

Requirements:

Review external input validation across protected operations.

Acceptance Criteria:

- Critical unvalidated inputs addressed

---

### TASK-081 — Dependency Review

Status: TODO  
Priority: P1  
Dependencies: Application substantially implemented

Requirements:

- Review dependencies
- Remove unused packages
- Review known security issues
- Avoid duplicate libraries

Acceptance Criteria:

- Dependency set justified
- Critical known issues addressed

---

## EPIC-23 — Documentation

### TASK-082 — README Finalization

Status: TODO  
Priority: P2  
Dependencies: Application setup stable

Requirements:

Document:

- Project purpose
- Requirements
- Installation
- Environment setup
- Development
- Testing
- Database migrations
- Deployment overview

Acceptance Criteria:

- New developer can set up project from README

---

### TASK-083 — Architecture Documentation Review

Status: TODO  
Priority: P2  
Dependencies: Architecture stable

Requirements:

Compare implementation with documentation.

Acceptance Criteria:

- Significant differences documented or corrected

---

### TASK-084 — Database Documentation Review

Status: TODO  
Priority: P2  
Dependencies: Database stable

Acceptance Criteria:

- `docs/database.md` reflects implemented schema

---

### TASK-085 — UML and Project Diagrams

Status: TODO  
Priority: P2  
Dependencies: Core architecture stable

Possible deliverables:

- Use case diagram
- Entity relationship diagram
- Component diagram
- Deployment diagram
- Relevant sequence diagrams

Acceptance Criteria:

- Diagrams match implementation

---

## EPIC-24 — CI/CD

### TASK-086 — GitHub Actions CI

Status: TODO  
Priority: P1  
Dependencies: Quality scripts configured

Requirements:

Run on Pull Requests:

- Install
- Lint
- Typecheck
- Tests
- Build

Acceptance Criteria:

- Failing checks block/identify invalid changes
- CI succeeds on valid main branch

---

### TASK-087 — E2E CI Strategy

Status: TODO  
Priority: P2  
Dependencies: TASK-073, TASK-086

Requirements:

Determine appropriate Playwright CI execution.

Acceptance Criteria:

- Critical E2E tests can execute predictably

---

## EPIC-25 — Deployment

### TASK-088 — Staging Environment

Status: TODO  
Priority: P1  
Dependencies: Core MVP stable

Requirements:

- Configure staging application
- Configure staging database
- Configure environment variables
- Apply migrations safely

Acceptance Criteria:

- Staging deploy succeeds
- Production data not used
- Smoke tests pass

---

### TASK-089 — Production Hosting Decision

Status: TODO  
Priority: P1  
Dependencies: Application architecture stable

Requirements:

Select compatible hosting for Next.js.

Document:

- Provider
- Deployment process
- Environment configuration
- Operational limitations

Acceptance Criteria:

- Decision documented
- No unnecessary architecture change required

---

### TASK-090 — Production Database Preparation

Status: TODO  
Priority: P0  
Dependencies: Production deployment approved

Requirements:

- Create isolated production database
- Configure production secrets
- Establish backup strategy
- Prepare migration process

Acceptance Criteria:

- Production database isolated
- Backup strategy documented
- Credentials protected

---

### TASK-091 — Production Deployment

Status: TODO  
Priority: P0  
Dependencies: TASK-078, TASK-079, TASK-080, TASK-086, TASK-089, TASK-090

Requirements:

- Deploy application
- Apply approved migrations
- Verify environment
- Run smoke tests

Acceptance Criteria:

- Application available through HTTPS
- Authentication works
- Database works
- Critical workflow works
- No known P0 issue remains

---

### TASK-092 — Production Smoke Tests

Status: TODO  
Priority: P0  
Dependencies: TASK-091

Test critical production functionality without destructive data operations.

Acceptance Criteria:

- Login works
- Protected access works
- Core application responds correctly
- Critical integrations respond correctly

---

# MILESTONE 8 — FINALIZATION

## EPIC-26 — Final Project Validation

### TASK-093 — Requirements Traceability Review

Status: TODO  
Priority: P1  
Dependencies: Application substantially complete

Requirements:

Compare implementation against:

- `docs/requirements.md`
- `docs/business-rules.md`

Acceptance Criteria:

- Each requirement is implemented, intentionally deferred, or documented as blocked/out of scope

---

### TASK-094 — Final Functional Review

Status: TODO  
Priority: P1  
Dependencies: TASK-093

Requirements:

Review complete SCCVI workflow.

Acceptance Criteria:

- No known critical functional issue remains

---

### TASK-095 — Final Medical Logic Review

Status: BLOCKED  
Priority: P0  
Dependencies: Growth and vaccination engines complete

Requirements:

Review:

- WHO dataset
- Growth calculations
- Vaccination schedule
- Alert wording
- Dataset versions

Acceptance Criteria:

- No invented clinical reference data
- Calculations traceable to approved source
- Automated output avoids definitive diagnosis

---

### TASK-096 — Final Security Review

Status: TODO  
Priority: P0  
Dependencies: Production candidate

Requirements:

Review:

- Authentication
- Authorization
- IDOR
- QR
- Secrets
- Validation
- Error exposure
- Audit

Acceptance Criteria:

- No known P0 security issue remains

---

### TASK-097 — Performance Review

Status: TODO  
Priority: P2  
Dependencies: Production candidate

Requirements:

Review:

- Important database queries
- Index usage
- Excessive data loading
- Obvious frontend performance problems

Acceptance Criteria:

- No known critical performance bottleneck in normal expected usage

---

### TASK-098 — Release Candidate

Status: TODO  
Priority: P1  
Dependencies: Final reviews complete

Requirements:

Prepare release candidate.

Acceptance Criteria:

- Build succeeds
- Tests succeed
- Documentation current
- Migration state known
- Deployment instructions current

---

### TASK-099 — SCCVI v1.0.0

Status: TODO  
Priority: P1  
Dependencies: TASK-098

Requirements:

Create the first stable SCCVI release.

Acceptance Criteria:

- Required project scope completed
- Approved blocked decisions resolved where required for v1
- Production deployment validated
- Release tagged as `v1.0.0`

---

# 4. MVP Definition

The first functional SCCVI MVP should support the following end-to-end workflow:

Login
→ Community
→ Guardian
→ Child
→ Growth measurement
→ Growth history
→ Vaccination
→ Alerts
→ Email notification

WHO growth assessment is enabled by the approved 2006 standard recorded in
ADR-005. Vaccination schedule functionality remains blocked until its
authoritative current source and exact version are formally selected.

---

# 5. Advanced Completion

Advanced SCCVI functionality includes:

- Approved WHO growth engine
- Approved vaccination schedule engine
- QR digital card
- Dashboard
- Reports
- Campaigns
- Audit
- Complete testing
- Deployment

---

# 6. Codex Execution Rule

Codex must implement only the explicitly assigned task.

Example:

If assigned:

TASK-001

Codex must not automatically implement:

TASK-002
TASK-003
TASK-004

even if those tasks appear straightforward.

At completion, Codex must stop and report results.

---

# 7. Backlog Principle

The backlog is ordered to minimize:

- Rework
- Architectural drift
- Security mistakes
- Database conflicts
- Unnecessary parallel dependencies

Correctness and traceability are more important than completing many tasks simultaneously.
