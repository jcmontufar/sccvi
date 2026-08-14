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

At the time of BATCH-02, Row Level Security is enabled on the 18 SCCVI application tables
in the development Supabase database, with no application-table RLS policies defined.
This denies direct anon/authenticated Data API table access by default.

Normal application persistence uses Prisma through the server database connection. RLS is
not treated as a replacement for SCCVI server authorization. A complete RLS policy design
has not been invented in this batch and must be added only through an approved future task
or architecture decision.

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

## BATCH-04 Authorization Boundaries

Vaccine catalog mutation is restricted to `ADMIN`; health staff and center managers may
consult catalog metadata. No vaccine schedule, dose timing, or vaccination-status rule is
created by this catalog workflow.

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
factual growth-measurement, and generic alert data; schedule-derived coverage and incomplete
vaccination reports remain excluded.

## QR Credential Security

QR payloads contain only an application access URL with a cryptographically random opaque
token. SCCVI stores a SHA-256 token hash, never the raw token. The raw token is returned once
at credential creation so the authorized user can render the QR code.

Optional numeric PINs contain 4 to 12 digits and are stored as salted scrypt hashes. PIN
comparison uses constant-time comparison. QR access rejects unknown, revoked, expired, or
inactive-child credentials before showing a card. Successful access updates `lastUsedAt`.
Generation and revocation are audited.

The initial public digital card exposes only the child's name, date of birth, and recorded
sex after credential validation. It intentionally excludes growth measurements, alerts,
vaccination history, internal child identifiers, guardian information, and organizational
details. This is the minimum useful card assumption until an approved public-card field
policy is documented.

## Notification Provider Boundary

The notification service defines a provider-independent email contract and persists
`PENDING`, `SENT`, and `FAILED` states. Only an adapter-confirmed success can become `SENT`;
provider failure becomes `FAILED`. No provider adapter or live delivery is configured while
TASK-053 remains blocked, and campaign creation never claims message delivery.
