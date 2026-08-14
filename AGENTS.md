# SCCVI — Agent Instructions

## 1. Project

SCCVI stands for:

Sistema de Control de Crecimiento y Vacunación Infantil.

SCCVI is a responsive web application designed for municipal health centers.

Its primary responsibilities are:

- Community management
- Guardian management
- Child management
- Child growth tracking
- WHO growth assessment
- Vaccination tracking
- Automatic alerts
- Email notifications
- Secure digital vaccination/growth card using QR
- Communication campaigns
- Dashboards
- Reports
- Audit logging

Before making architectural or domain-level changes, read the relevant documentation inside `/docs`.

---

## 2. Source of Truth

The following files define the project:

1. `AGENTS.md`
2. `docs/requirements.md`
3. `docs/business-rules.md`
4. `docs/architecture.md`
5. `docs/database.md`
6. `docs/backlog.md`
7. `docs/api/openapi.yaml`, when available

If the implementation conflicts with these documents, do not silently change the requirements or architecture.

Report the conflict before introducing a major architectural or domain change.

Do not invent missing requirements.

---

## 3. Approved Technology Stack

Use the following stack unless explicitly instructed otherwise.

### Language
- TypeScript

### Framework
- Next.js

### Frontend
- React

### Styling
- Tailwind CSS
- shadcn/ui

### Database
- PostgreSQL

### Database platform
- Supabase

### Authentication
- Supabase Auth

### ORM
- Prisma

### Validation
- Zod

### Forms
- React Hook Form

### Charts
- Recharts

### Unit and integration testing
- Vitest

### End-to-end testing
- Playwright

### API
- REST where appropriate
- OpenAPI documentation

### Package manager
- npm

Do not replace the approved stack without explicit authorization.

---

## 4. Architecture

SCCVI uses a modular monolith architecture.

Do NOT introduce microservices unless explicitly approved.

Primary modules:

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

Business logic must not live exclusively inside React components.

Use the following conceptual separation:

Presentation
→ Application
→ Domain
→ Persistence

### Presentation

Responsible for:

- Pages
- React components
- Forms
- Tables
- Charts
- User interaction

### Application

Responsible for:

- Actions
- Use cases
- Workflow orchestration

### Domain

Responsible for:

- Business rules
- Growth calculations
- Vaccination calculations
- Alert rules
- Authorization rules where appropriate

### Persistence

Responsible for:

- Prisma
- PostgreSQL
- Database queries and transactions

---

## 5. Expected Repository Structure

The repository should evolve toward the following structure:

src/
  app/
  components/
  modules/
  lib/
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

Do not create empty directories merely to reproduce this structure.

Create directories when they become necessary.

---

## 6. Module Structure

When useful, a domain module may contain:

modules/<module>/
  actions/
  components/
  queries/
  schemas/
  services/
  types/
  utils/

Prefer the simplest structure that preserves separation of concerns.

Avoid unnecessary abstraction.

---

## 7. TypeScript Rules

TypeScript strict mode must remain enabled.

Do not disable strict mode.

Avoid `any`.

Do not use `any` merely to suppress TypeScript errors.

If data is unknown, model and validate it correctly.

Prefer explicit domain types where they improve correctness.

Fix type problems rather than bypassing the type system.

---

## 8. Naming Conventions

### Files

Use kebab-case.

Examples:

create-child.ts
growth-service.ts
vaccination-status.ts

### React Components

Use PascalCase.

Examples:

ChildForm
GrowthChart
VaccinationHistory

### Variables and Functions

Use camelCase.

Examples:

childId
calculateExactAge
createGrowthRecord

### Prisma Models

Use PascalCase.

Examples:

Child
Guardian
GrowthRecord

### Enums

Use descriptive enum names.

Enum values should normally use UPPER_CASE.

Example:

AlertStatus.OPEN

---

## 9. Validation

All external and untrusted input must be validated.

Use Zod for application-level validation.

Frontend validation exists primarily for user experience.

Server-side validation remains mandatory.

Never trust:

- Form values
- URL parameters
- Query strings
- IDs received from the browser
- Client-side role checks
- Client-side hidden controls
- External API responses without validation when relevant

Reusable validation rules should be centralized.

Do not duplicate incompatible validation rules across screens.

---

## 10. Authentication

Authentication is handled through Supabase Auth.

Application user profiles are stored in the SCCVI database.

Never store plaintext passwords.

Never implement a custom password storage system unless explicitly requested.

Never expose:

- Supabase service role keys
- Authentication secrets
- Database credentials
- Private tokens

---

## 11. Authorization

The server is the primary authority for authorization.

Never rely only on hidden buttons or frontend route protection.

Every protected operation must verify, where applicable:

1. Authenticated user
2. User role
3. Requested action
4. Resource scope
5. Ownership or relationship to the resource

Example:

A GUARDIAN may only access children explicitly associated with that guardian.

Changing a child ID manually in a URL must never allow access to another child's information.

Authorization checks must occur server-side.

---

## 12. Roles

Supported application roles:

ADMIN
HEALTH_STAFF
CENTER_MANAGER
GUARDIAN

Do not introduce new roles without explicit approval and documentation updates.

Role behavior must remain consistent with project requirements.

---

## 13. Database Rules

Use Prisma for normal application database access.

Use PostgreSQL constraints when they improve data integrity.

Prefer UUID identifiers.

Maintain referential integrity.

Use indexes for frequently queried fields when justified.

Use database transactions when multiple dependent writes must succeed or fail together.

Never modify an already-applied production migration.

Create a new migration instead.

Schema changes and their corresponding migrations must be versioned together.

---

## 14. Deletion Policy

Prefer soft deletion or deactivation for important domain entities such as:

- Users
- Communities
- Guardians
- Children
- Vaccines

Historical medical-related records must not be silently deleted.

Changes to growth and vaccination history should remain auditable.

Any destructive database change requires careful review.

---

## 15. Growth Records

A growth measurement represents factual historical data.

GrowthRecord stores the original measurement.

GrowthAssessment stores derived calculations.

Do not overwrite an original measurement merely because an assessment is recalculated.

A growth measurement may include:

- Child
- Measurement date
- Weight
- Height/length
- Recording user
- Notes

Measurement dates cannot be in the future.

Growth age must be calculated from:

child birth date
→ measurement date

Do not use today's date to assess a historical measurement.

---

## 16. WHO Growth Logic

WHO growth logic is a safety-critical domain area.

Do NOT:

- Invent WHO values
- Guess pediatric thresholds
- Fabricate missing parameters
- Hardcode unofficial growth reference data
- Present unsupported calculations as official WHO results

WHO reference data must come from an approved and documented structured dataset.

The growth calculation engine must be isolated from the UI.

Initial required indicators:

- Weight for age
- Height/length for age

Additional indicators require explicit scope approval.

All critical growth calculation functions require automated tests.

The dataset name and version must be documented.

---

## 17. Medical Interpretation

SCCVI is a monitoring and decision-support system.

It must not represent automated alerts as definitive medical diagnoses.

Prefer language such as:

- Possible risk
- Requires evaluation
- Follow-up recommended
- Preventive alert

Do not automatically declare medical diagnoses from growth or vaccination data.

---

## 18. Vaccination Model

Keep these concepts separate:

Vaccine
VaccineSchedule
Vaccination

### Vaccine

Defines the vaccine.

### VaccineSchedule

Defines recommended doses and timing.

### Vaccination

Records what was actually administered to a child.

Do not store a static vaccination completion state when the state can be derived reliably from:

- Vaccine schedule
- Child age
- Vaccination history

Possible derived states may include:

APPLIED
PENDING
OVERDUE

Do not invent an official vaccination schedule.

The schedule must come from an approved and documented source.

---

## 19. Alerts

Alerts may originate from:

- Growth
- Vaccination
- Missed follow-up

Initial severities:

PREVENTIVE
CRITICAL

Initial statuses:

OPEN
REVIEWED
RESOLVED

Alert rules must be centralized and testable.

Do not duplicate alert logic inside UI components.

Alerts should support traceability to their source.

---

## 20. QR Security

Never encode medical or personal child information directly into a QR code.

QR codes must resolve using an opaque random token.

Persist only the protected token representation required by the approved design, preferably a secure token hash.

QR credentials must support:

- Validation
- Revocation
- Optional expiration
- Optional PIN protection

A revoked token must never provide access.

Do not expose internal child identifiers unnecessarily through the public QR flow.

---

## 21. Notifications

Email is the initial notification channel.

Telegram and WhatsApp are optional future integrations.

Core domain logic must not depend directly on one notification provider.

Use a notification service abstraction.

Notification delivery failures should be recorded appropriately.

Do not mark a failed notification as successfully delivered.

---

## 22. Campaigns

Authorized users may create communication campaigns.

Initial segmentation may include:

- Community
- Age
- Vaccination status

Campaign logic must respect authorization and guardian communication information.

Campaign delivery should use the notification abstraction.

---

## 23. Audit

Audit important events such as:

- Relevant authentication events
- User creation
- Child creation
- Child update
- Growth record creation/update
- Vaccination registration
- Alert resolution
- QR generation
- QR revocation

Do not generate audit records for every trivial UI interaction.

Audit records should provide useful traceability without exposing secrets.

---

## 24. Error Handling

Use predictable application errors.

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

Do not expose:

- Stack traces
- Database credentials
- Environment secrets
- Provider keys
- Internal security information

to application clients.

---

## 25. API Conventions

When REST endpoints are appropriate, use:

/api/v1/

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

Keep OpenAPI documentation synchronized with public REST endpoints.

Do not create unnecessary REST endpoints when a simpler approved server-side mechanism is sufficient.

---

## 26. Testing

Critical new behavior requires automated tests.

Prioritize unit tests for:

- Exact age calculations
- Growth calculations
- Z-score/percentile calculations
- Vaccination status
- Alert rules
- Authorization rules
- QR token validation

Use integration tests for important database workflows.

Use Playwright for critical end-to-end user workflows.

Never delete, disable, or weaken tests merely to make a task pass.

Do not mock away the behavior that a test is intended to verify.

---

## 27. Quality Gates

Before completing a task, run the relevant available checks.

Expected commands as the repository evolves:

npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e

If a relevant command fails:

1. Investigate the failure
2. Determine whether it was caused by the task
3. Fix applicable problems
4. Report unresolved failures

Do not report a task as DONE while known relevant quality checks are failing.

---

## 28. Definition of Done

A task is complete only when all applicable requirements are satisfied.

This includes:

- Implementation completed
- Scope respected
- TypeScript types correct
- Server validation present where required
- Authorization present where required
- Relevant tests added or updated
- Lint passes
- Typecheck passes
- Relevant tests pass
- Build passes when applicable
- Documentation updated when behavior, architecture, database or API changes
- No known critical issue remains

"Works on the screen" is not sufficient to consider a task complete.

---

## 29. Security

Never commit:

- Passwords
- API keys
- Supabase service role keys
- Database credentials
- Private secrets
- Production tokens

Use environment variables.

Keep real `.env` files outside version control.

Maintain `.env.example` with placeholder or empty values only.

Use secure random token generation for security-sensitive credentials.

Do not invent cryptographic algorithms.

---

## 30. Scope Control

Do not add major features outside the approved scope.

Do not add:

- Microservices
- Native mobile applications
- Telemedicine
- Billing
- Accounting
- Medication prescribing
- Complete electronic medical records
- Vaccine inventory
- Automatic definitive medical diagnosis

unless explicitly added to project scope.

Do not replace approved technologies merely because another technology is available.

---

## 31. Dependency Policy

Before introducing a dependency:

1. Determine whether the existing stack already solves the problem
2. Verify that the dependency is actually necessary
3. Prefer maintained and widely supported packages
4. Avoid duplicate libraries serving the same purpose
5. Avoid unnecessary infrastructure

Do not introduce major dependencies without explaining why they are needed.

---

## 32. Git Workflow

The stable branch is:

main

Do not develop directly on main.

Normal task branches use:

task/<task-number>-<description>

Examples:

task/001-init-nextjs
task/008-initial-prisma-schema
task/034-growth-form

Bug fixes:

fix/<description>

Documentation:

docs/<description>

Production emergency fixes, when applicable:

hotfix/<description>

Normally, one backlog task should correspond to one branch.

Do not automatically merge branches.

---

## 33. Commit Convention

Use clear Conventional Commit-style messages where practical.

Examples:

feat: implement community CRUD [TASK-019]

fix: prevent unauthorized child access

test: add exact age calculation tests

docs: update database design

chore: configure prisma

Commits should describe coherent changes.

Avoid vague commit messages such as:

update
changes
stuff
final

---

## 34. Pull Requests

Important changes should be reviewed through Pull Requests.

Recommended PR title:

[TASK-XXX] Task description

A Pull Request summary should include:

- Task
- Changes
- Database changes
- Tests
- Quality checks executed
- Known risks or limitations

Do not merge automatically unless explicitly instructed.

The preferred merge strategy is Squash and Merge.

---

## 35. Backlog Status

Supported task statuses:

TODO
IN_PROGRESS
IN_REVIEW
BLOCKED
DONE

A task should normally move:

TODO
→ IN_PROGRESS
→ IN_REVIEW
→ DONE

BLOCKED means a required dependency or decision is missing.

Do not implement a BLOCKED task by inventing the missing decision.

---

## 36. Database Migration Safety

Database migrations require special care.

Never silently perform destructive changes such as:

- DROP TABLE
- DROP COLUMN
- Incompatible type changes
- Destructive data transformations
- Adding NOT NULL constraints that existing data cannot satisfy

Report migration risks before proceeding.

Development migrations may use Prisma development tooling.

Production migrations must use the approved deployment process.

Do not run development migration commands against production.

---

## 37. Environments

The project may use:

LOCAL
STAGING
PRODUCTION

Development must never accidentally use production credentials or the production database.

Environment-specific secrets must remain separated.

---

## 38. Parallel Work

Do not parallelize tasks that strongly depend on each other or modify the same critical files.

Be especially careful with parallel changes to:

- schema.prisma
- database migrations
- authentication
- authorization
- central domain services

When dependencies exist, complete prerequisite tasks first.

---

## 39. Special Security Review

For authentication, guardians, children and QR functionality, explicitly consider:

- Broken access control
- IDOR
- Server-side authorization
- Resource ownership
- Token security
- Secret leakage
- Unauthorized child access

A valid login does not automatically authorize access to every resource.

---

## 40. Special Medical Domain Review

For growth, WHO, vaccination and alert functionality, explicitly verify:

- No invented clinical data
- Dataset/source documented
- Dataset version documented
- Calculations tested
- Original measurements preserved
- Automated messages do not claim definitive diagnosis
- Historical records remain traceable

---

## 41. Documentation

Update documentation when changing:

- Architecture
- Business rules
- Database schema
- Public API
- Project setup
- Requirements
- Major dependencies

Documentation is part of the project's source of truth.

Do not allow implementation and documentation to silently diverge.

---

## 42. Task Execution Procedure

For every assigned task:

1. Read this AGENTS.md
2. Read the relevant project documentation
3. Inspect the existing implementation
4. Check task dependencies and status
5. Identify affected modules
6. Implement the smallest coherent change
7. Add or update relevant tests
8. Run relevant quality checks
9. Update documentation when necessary
10. Summarize the implementation
11. Report unresolved limitations

Do not make unrelated refactors unless necessary for the assigned task.

Do not automatically begin another backlog task.

---

## 43. Completion Report

At the end of a task, report:

1. Implementation summary
2. Files created or modified
3. Database changes, if any
4. Tests created or modified
5. Commands executed
6. Quality check results
7. Assumptions
8. Remaining risks or limitations

Do not claim that checks passed unless they were actually executed successfully.

---

## 44. Priority of Instructions

When project instructions appear to conflict, use the following priority:

1. Explicit current task instructions
2. AGENTS.md
3. docs/business-rules.md
4. docs/requirements.md
5. docs/architecture.md
6. docs/database.md
7. Existing repository conventions

If a requested change appears to violate a medical safety, security, privacy, or data-integrity rule, report the conflict before implementing it.

---

## 45. Core Principle

Prefer correctness, security, maintainability and traceability over unnecessary complexity.

SCCVI should remain simple enough to develop efficiently while being robust enough to reliably support its defined requirements.

---

## 46. User Interface Language

All user-facing SCCVI interface content must be written in Spanish.

This includes:

- Navigation
- Page titles
- Buttons
- Form labels
- Placeholders
- Validation messages shown to users
- Tables
- Empty states
- Alerts
- Notifications
- Dashboard text
- Report labels
- QR digital card text
- User-visible error messages

Internal implementation may remain in English.

Use English for:

- TypeScript identifiers
- Function names
- Variable names
- File names
- Prisma models
- Database fields
- Enums
- Internal error codes
- Technical documentation when appropriate

Example:

Internal code:

`createChild()`
`Child`
`GrowthRecord`

User interface:

`Registrar niño`
`Historial de crecimiento`
`Guardar`
`Cancelar`

Do not mix English and Spanish in the user interface unless the term is a widely accepted technical or proper name.

Spanish is the default application language for SCCVI.