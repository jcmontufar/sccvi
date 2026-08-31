# SCCVI — Security Foundation

## Authentication

Supabase Auth owns authentication identities, credentials, and cookie-based sessions.
SCCVI uses `@supabase/ssr` with the Next.js App Router and Proxy session refresh.
Server protection validates signed claims and never trusts client-provided session or role
information.

Passwords are never stored in the SCCVI PostgreSQL `User` model. `User.authUserId` links
the Supabase identity to the application profile.

An authenticated identity is allowed into protected application functionality only when
its SCCVI application profile exists and `User.isActive` is true.

## Server Authorization

The Next.js server is the primary authorization authority. Protected operations follow:

1. Validate the Supabase identity server-side.
2. Resolve the SCCVI application profile.
3. Confirm the profile is active.
4. Authorize the action and resource scope.
5. Validate untrusted input with Zod.
6. Execute through the application/service and Prisma persistence boundary.

Navigation visibility is supplementary and is not an authorization control.

Initial organizational access follows least privilege:

- `ADMIN`: global health-center and community access.
- `CENTER_MANAGER`: read/update its assigned health center and manage communities only
  inside that center.
- `HEALTH_STAFF`: read its assigned health center and communities; no organizational
  mutation permission.
- `GUARDIAN`: no health-center or community administration access.

Until a more precise cross-center policy is approved, non-admin access is restricted to
`User.healthCenterId`. IDs received from URLs, forms, or query strings are validated and
checked against that scope on the server to prevent IDOR.

## Row Level Security Boundary

The versioned BATCH-12 security migration enables Row Level Security on all 20
SCCVI application tables and revokes all table privileges from the Supabase
`anon` and `authenticated` roles. No application-table RLS policies are defined,
so browser/Data API access is denied by design in every migrated environment.
Post-migration staging verification fails if a table is missing, RLS is disabled
or either browser role has a table privilege.

Normal application persistence uses Prisma through the server database connection. RLS is
not treated as a replacement for SCCVI server authorization. A complete RLS policy design
has not been invented in this batch and must be added only through an approved future task
or architecture decision.

Staging administrative tooling also verifies the persisted STAGING marker and
rejects known development, isolated-test and production markers before every
write. `DIRECT_URL`, service-role credentials, bootstrap values and smoke
credentials are forbidden in Vercel runtime configuration.

## Guardian and Child Resource Access

A `GUARDIAN` application profile can read a child only when its `User.id` is linked to an
active `Guardian` record and that guardian is explicitly associated with the child through
`ChildGuardian`. The same server-loaded relationship is required to read the child's growth
history. A child identifier from a URL, form, or request is never sufficient authorization.

Organizational access remains center-scoped. `HEALTH_STAFF` may manage guardians, children,
guardian-child relationships, and factual growth measurements within its assigned center.
`CENTER_MANAGER` has read-only access to these records within its assigned center.
Guardians cannot create or correct growth measurements.

## Growth Record Traceability

Growth measurements remain factual historical records. New measurements and authorized
corrections create targeted `AuditLog` entries. Corrections require a reason and record the
changed fields plus protected before/after measurement values so an authorized reviewer can
reconstruct the correction. Growth records are never physically deleted by this workflow.

This targeted traceability supports TASK-032 without introducing the complete future audit
service. No WHO assessment, percentile, Z-score, classification, or clinical threshold is
implemented in this boundary.

## Error and Secret Handling

User-visible errors use safe Spanish messages. Provider errors, stack traces, SQL errors,
credentials, tokens, passwords, and internal security details must not be returned to the
interface or written to audit metadata.

Critical audit events use the centralized server-only audit service. Metadata
is explicitly selected and credential-like keys are removed recursively.
Critical audit failures propagate inside the domain transaction so the
associated operation rolls back rather than succeeding without traceability.

Automated integration and E2E execution must use the isolated environment guard
documented in `docs/testing.md`. The guard refuses the shared development URL,
production mode and unconfirmed targets. Playwright does not retain traces or
videos because QR/PIN workflows may contain ephemeral credentials.

## BATCH-04 Authorization Boundaries

Vaccine catalog mutation is restricted to `ADMIN`; health staff and center managers may
consult catalog metadata. The versioned schedule importer is an operational database task,
not a browser mutation. Vaccination history is readable only through authorized child scope;
only `ADMIN` and assigned-center `HEALTH_STAFF` may register a factual dose. Child, schedule
and duplicate checks execute server-side, and each registration creates an audit record.

Alerts are loaded through child and health-center scope. Guardians can read alerts only for
explicitly associated children and cannot review or resolve them. Operational roles follow
their assigned-center scope. The conservative lifecycle is `OPEN` → `REVIEWED` → `RESOLVED`;
skipped or reverse transitions are rejected, and resolution creates an audit record.

Campaigns are restricted to `ADMIN` and `CENTER_MANAGER`. Center managers can create and
read campaigns only inside their assigned center. Recipient previews use active guardians
with email addresses and active associated children, segmented only by authorized community
and age. Vaccination-status segmentation and actual delivery remain unavailable until their
medical/provider dependencies are approved.

Dashboard and report queries apply the same server-side center scope as their source
modules. Guardians do not receive operational reports. Reports include only community,
factual growth-measurement, factual vaccination, overdue-dose and generic alert data.
Schedule-derived percentage coverage remains excluded because no denominator methodology is
approved.

## QR Credential Security

QR payloads contain only an application access URL with a cryptographically random opaque
token. SCCVI stores a SHA-256 token hash, never the raw token. The raw token is returned once
at credential creation so the authorized user can render the QR code.

Optional numeric PINs contain 6 to 12 digits and are stored as salted scrypt hashes. PIN
comparison uses constant-time comparison. Five consecutive invalid PIN attempts lock the
credential for 15 minutes. Failed-attempt counters and lock expiration are stored in
PostgreSQL and updates are serialized with a row lock, so enforcement is shared across
application instances. A correct PIN resets the failed-attempt state. Invalid and locked
PIN submissions return the same safe response. QR access rejects unknown, revoked, expired,
or inactive-child credentials before showing a card. Successful access updates `lastUsedAt`.
Generation and revocation are audited.

The initial public digital card exposes only the child's name, date of birth, and recorded
sex after credential validation. It intentionally excludes growth measurements, alerts,
vaccination history, internal child identifiers, guardian information, and organizational
details. This is the minimum useful card assumption until an approved public-card field
policy is documented.

## Notification Provider Boundary

The notification service defines a provider-independent email contract and persists
`PENDING`, `SENT`, and `FAILED` states. Resend is the approved initial adapter. Only an
adapter-confirmed success can become `SENT`; missing configuration or provider failure becomes
`FAILED` with a safe message. API keys remain server-only environment values. Operational alert
email applies to missed growth follow-up and schedule-derived overdue vaccination alerts,
respects explicit guardian `EMAIL` preference, and is deduplicated by alert, guardian and
channel. Campaign creation still does not claim message delivery.
