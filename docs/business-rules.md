# SCCVI — Business Rules

## BR-001 — Community Assignment

Every active child must belong to a community.

A community belongs to a health center.

---

## BR-002 — Guardian and Child Relationship

A child may be associated with one or more guardians.

A guardian may be associated with one or more children.

The relationship must be explicitly stored through the ChildGuardian relationship.

---

## BR-003 — Duplicate Relationships

The same guardian must not be associated more than once with the same child.

The combination:

childId + guardianId

must be unique.

---

## BR-004 — Primary Guardian

A child may have a guardian identified as the primary guardian.

The system must preserve the relationship type between guardian and child.

---

## BR-005 — Guardian Account

A guardian record does not necessarily require an application user account.

A guardian may exist only as a contact and responsible person.

When a guardian has application access, the guardian may be associated with an application User.

---

## BR-006 — Guardian Access

A GUARDIAN user may only access children explicitly associated with that guardian.

Authentication alone does not authorize access to every child.

Changing a child identifier in a URL must not provide access to another child's information.

Authorization must be enforced server-side.

---

## BR-007 — Child Deactivation

Children with historical growth, vaccination or alert records should normally be deactivated rather than physically deleted.

Historical information must remain traceable.

---

## BR-008 — Guardian Deactivation

Guardians should normally be deactivated rather than physically deleted when historical relationships or notifications depend on them.

---

## BR-009 — Community Deactivation

Communities containing historical information should normally be deactivated rather than physically deleted.

---

## BR-010 — Growth Measurement

Every growth measurement must be associated with:

- A child
- A measurement date
- An authorized recording user

Required measurement values must follow the approved growth workflow.

---

## BR-011 — Measurement Date

A growth measurement date cannot be in the future.

---

## BR-012 — Original Growth Data

Growth measurements represent historical factual information.

Original measurements must remain separate from calculated growth assessments.

Recalculating an assessment must not silently replace the original factual measurement.

---

## BR-013 — Child Age for Growth Assessment

The child's age for a growth assessment must be calculated using:

child birth date
→ measurement date

The current date must not be used when evaluating a historical measurement.

---

## BR-014 — Growth Reference Selection

Growth assessment must select the appropriate approved reference according to relevant factors such as:

- Sex
- Age
- Growth indicator

---

## BR-015 — Approved WHO Dataset

WHO growth calculations must use an approved and documented official reference dataset.

The system must not:

- Invent reference values
- Guess missing parameters
- Fabricate thresholds
- Present unofficial reference data as WHO data

The dataset name and version must be documented.

---

## BR-016 — Initial Growth Indicators

The initial required growth indicators are:

- WEIGHT_FOR_AGE
- HEIGHT_FOR_AGE

Additional indicators require explicit project scope approval.

---

## BR-017 — Growth Assessment Storage

Calculated growth results should be stored separately from the original GrowthRecord.

A GrowthAssessment may contain:

- Indicator
- Z-score where supported
- Percentile where supported
- Classification
- Standard name
- Standard version

---

## BR-018 — Growth Interpretation

Automated growth assessments are monitoring and follow-up tools.

The application must not automatically represent a calculated alert as a definitive medical diagnosis.

Appropriate wording includes:

- Possible risk
- Requires evaluation
- Follow-up recommended
- Preventive alert

---

## BR-019 — Vaccine Definition

Vaccine represents the vaccine itself.

Vaccine must remain separate from:

- VaccineSchedule
- Vaccination

---

## BR-020 — Vaccine Schedule

VaccineSchedule defines expected vaccine doses and timing.

A scheduled dose may include:

- Vaccine
- Dose number
- Recommended age
- Minimum age
- Maximum age
- Required interval

where applicable.

---

## BR-021 — Approved Vaccination Schedule

The vaccination schedule must come from an approved and documented source.

The system must not invent an official vaccination schedule.

The schedule source and version should be documented.

ADR-006 approves `GT-MSPAS-2026-01-12` for routine childhood monitoring.
Temporary outbreak/campaign rules are not routine schedule rows. A future
schedule version must not rewrite factual historical vaccination events.

---

## BR-022 — Vaccination Record

Vaccination represents a dose actually recorded as administered to a child.

Every vaccination record must be associated with:

- A child
- A vaccine schedule dose
- An application date
- An authorized recording user

---

## BR-023 — Vaccination History

The original vaccination application date must remain preserved as historical information.

Vaccination history must not be silently overwritten.

---

## BR-024 — Vaccination Status

Vaccination status should be derived from:

- Child age
- Approved vaccine schedule
- Vaccination history

Initial relevant states may include:

- APPLIED
- PENDING
- OVERDUE

Status derivation must also establish that the scheduled dose is applicable to
the child under the selected schedule version. A current version must not be
applied retrospectively to an opportunity that ended before that version became
effective.

For `GT-MSPAS-2026-01-12`, an unrecorded hexavalent series is assessed only when
the child's first routine hexavalent opportunity at 2 months falls on or after
the version's `effectiveFrom`. Earlier cohorts remain unreconciled because the
authoritative transition source permits completion of previously started
pentavalent/polio schedules but does not define equivalence or catch-up logic.
Those inapplicable current-version rows are omitted rather than classified as
`OVERDUE`, and therefore cannot create vaccination alerts. Factual historical
`Vaccination` records remain preserved and may still be represented as
`APPLIED`.

---

## BR-025 — Avoid Redundant Vaccination Status

The application should not store a static "complete" vaccination state when the state can be reliably calculated from the approved schedule and vaccination history.

---

## BR-026 — Alert Sources

Alerts may originate from:

- Growth
- Vaccination
- Missed follow-up

Alert-generation rules must be centralized.

---

## BR-027 — Alert Severity

Initial supported alert severities are:

- PREVENTIVE
- CRITICAL

New severities require documentation and explicit approval.

---

## BR-028 — Alert Lifecycle

Initial alert statuses are:

- OPEN
- REVIEWED
- RESOLVED

An alert should preserve relevant lifecycle information such as review or resolution timestamps where applicable.

---

## BR-029 — Alert Resolution

Only an authorized user may resolve a protected alert.

Important alert resolutions should be auditable.

---

## BR-030 — Alert Interpretation

An alert is a follow-up mechanism.

Alerts must not automatically declare a definitive medical diagnosis.

---

## BR-031 — Notification Channel

Email is the required initial notification channel.

Future optional channels may include:

- Telegram
- WhatsApp

---

## BR-032 — Guardian Notification Preference

The system should respect the guardian's configured notification channel when that channel is available and enabled.

---

## BR-033 — Notification Status

Initial notification states are:

- PENDING
- SENT
- FAILED

A failed notification must not be recorded as successfully sent.

---

## BR-034 — Notification Provider Independence

Core business logic must not depend directly on a specific email, Telegram or WhatsApp provider.

Notification delivery should use an application-level notification service abstraction.

---

## BR-035 — Campaign Authorization

Only authorized users may create or send communication campaigns.

---

## BR-036 — Campaign Segmentation

Campaign recipients may be selected according to approved criteria such as:

- Community
- Child age
- Vaccination status

Vaccination segmentation must identify one approved schedule version, one
exact dose code and one derived dose state. A guardian qualifies when at least
one active authorized child matches that exact applicable dose through the
central vaccination-status engine. SCCVI must not aggregate multiple dose
states into an invented global child or guardian vaccination state.

Age segmentation uses the `America/Guatemala` business date.

Resolved recipients form a persisted snapshot when the draft is created. Send
must not silently replace that snapshot by recalculating clinical segmentation.
Immediately before delivery, SCCVI revalidates only that the guardian remains
active, has an email address, permits `EMAIL` and remains in authorized center
scope. An ineligible recipient is `SKIPPED`.

One notification per campaign recipient and channel is allowed. Only provider
confirmation produces `SENT`; provider failure produces `FAILED`.

---

## BR-037 — QR Association

Every valid SCCVI QR credential must resolve to exactly one child.

---

## BR-038 — QR Confidentiality

The QR payload must not directly contain sensitive child information or medical information.

The QR must use an opaque token-based access mechanism.

---

## BR-039 — QR Token Protection

Security-sensitive QR tokens must be generated using a secure random mechanism.

The persisted representation should follow the approved secure token design, preferably using a protected token hash.

---

## BR-040 — QR Revocation

A revoked QR credential must never provide access to protected child information.

---

## BR-041 — QR Expiration

The system may support expiration dates for QR credentials.

An expired credential must not provide access when expiration is enabled.

---

## BR-042 — QR PIN

If a QR credential has PIN protection enabled, successful PIN verification is required before displaying the protected digital card information.

PIN values must never be stored in plaintext.

---

## BR-043 — Server Authorization

Client-side interface restrictions are not sufficient authorization.

Protected operations must verify authorization on the server.

---

## BR-044 — Resource Authorization

For protected resources, authorization should evaluate where applicable:

- Authenticated user
- User role
- Requested action
- Resource
- Ownership or authorized relationship

---

## BR-045 — IDOR Prevention

The application must prevent insecure direct object reference access.

A user must not gain access to another child's information merely by modifying:

- URL parameters
- Request IDs
- Query parameters
- API requests

---

## BR-046 — Input Validation

All untrusted external input must be validated server-side.

Client-side validation does not replace server-side validation.

---

## BR-047 — Sensitive Credentials

The application must never commit or expose:

- Passwords
- Database credentials
- API keys
- Supabase service role keys
- Private tokens
- Production secrets

Secrets must use environment variables or approved secret-management mechanisms.

---

## BR-048 — Audit

Important domain and security events should maintain traceability.

Relevant events may include:

- User creation
- Child creation/update
- Growth creation/update
- Vaccination registration
- Alert resolution
- QR generation
- QR revocation
- Relevant authentication events

---

## BR-049 — Audit Scope

The system does not need to create audit records for every trivial UI interaction.

Audit logging should focus on actions relevant to:

- Security
- Medical-related historical information
- Important data modifications
- Administrative operations

---

## BR-050 — Data Integrity

The application must preserve referential integrity between related records.

Database constraints should be used when they provide reliable protection against invalid states.

---

## BR-051 — Transactions

Operations involving multiple dependent writes should use database transactions when partial completion could create inconsistent data.

Examples may include:

GrowthRecord
+
GrowthAssessment
+
Alert

when the operation requires atomic consistency.

---

## BR-052 — Destructive Changes

Destructive database changes require explicit review.

Examples include:

- DROP TABLE
- DROP COLUMN
- Incompatible data type changes
- Destructive data transformations

Codex must not silently perform destructive database changes.

---

## BR-053 — Historical Records

Growth and vaccination records are historical information.

They must not be silently removed merely because related entities are deactivated.

---

## BR-054 — Reports

Reports must respect user authorization.

A user must not gain access to protected information through report functionality that they could not access elsewhere in the system.

---

## BR-055 — Dashboard

Dashboard metrics and charts must respect user authorization and resource scope.

---

## BR-056 — API Authorization

REST endpoints must apply the same authentication, authorization and validation requirements as other server-side application operations.

---

## BR-057 — Predictable Errors

Application errors should use predictable codes where appropriate.

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

---

## BR-058 — Error Confidentiality

Errors returned to clients must not expose:

- Stack traces
- Database credentials
- Environment secrets
- Provider API keys
- Sensitive internal security information

---

## BR-059 — Soft Deactivation

Important entities should normally support deactivation through an active/inactive state when historical records depend on them.

This includes initially:

- Users
- Communities
- Guardians
- Children
- Vaccines

---

## BR-060 — Scope Control

The initial SCCVI scope does not include:

- Native mobile applications
- Telemedicine
- Billing
- Accounting
- Medication prescribing
- Complete electronic medical records
- Vaccine inventory
- Automatic definitive medical diagnosis
- Microservices architecture

These capabilities must not be introduced without explicit scope approval.

---

## BR-061 — Testing Critical Logic

Critical domain logic requires automated tests.

This includes particularly:

- Exact age calculations
- Growth calculations
- WHO reference evaluation
- Vaccination status
- Alert rules
- Authorization
- QR validation

---

## BR-062 — Documentation Consistency

When implementation changes:

- Business rules
- Database design
- Architecture
- Public API
- Requirements

the corresponding project documentation must be updated.

Implementation and documentation must not silently diverge.

---

## BR-063 — Blocked Medical Decisions

If an approved WHO dataset or vaccination schedule has not yet been selected, dependent implementation must remain blocked.

Codex must report the missing dependency rather than inventing clinical data.

---

## BR-064 — Health Center Scalability

The initial SCCVI deployment may use a single health center.

The data model should preserve the ability to support multiple health centers without requiring a complete architectural redesign.

---

## BR-065 — Explicit Growth Follow-Up

A missed growth follow-up may be generated only from a next follow-up date
explicitly scheduled by authorized staff. A later growth measurement for the
same child completes that follow-up, including a measurement performed before
the due date. Without an approved grace period, an incomplete follow-up becomes
overdue on the first America/Guatemala business date after its due date.

The same follow-up must not create more than one alert.
