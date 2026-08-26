# BATCH-07 Security and Dependency Review

Date: 2026-08-26

## Authorization review

The centralized authorization matrix and server services were reviewed for
`ADMIN`, `CENTER_MANAGER`, `HEALTH_STAFF` and `GUARDIAN` across health centers,
communities, guardians, children, growth, vaccination, alerts, campaigns, QR,
reports and dashboard queries.

No confirmed P0 authorization bypass was found. Regression coverage now checks
cross-center denial across protected modules, guardian relationship scope,
center-manager clinical read-only behavior, QR management denial and report
denial for guardians. Navigation remains supplementary; services continue to
load resource scope and authorize server-side.

## Input validation findings

- Active/deactivation Server Action values previously depended on TypeScript
  `boolean` types without runtime validation. A shared Zod boolean schema now
  validates those service boundaries.
- QR revocation now validates the credential identifier as a UUID before any
  persistence query.
- Report routes already validate filters with Zod. They now return safe 401,
  403, 400 or 500 statuses instead of describing every failure as 400.

## Audit safety

Critical audit writes use one server-only typed service. Metadata recursively
omits keys associated with credentials, passwords, tokens, PINs, provider keys,
authorization headers and cookies. Audit events pass only explicit operational
metadata; growth correction note contents are no longer copied into audit JSON.

Critical audit writes execute inside the corresponding domain transaction. An
audit persistence failure propagates and rolls back that operation. This is the
documented fail-closed strategy for changes that require traceability.

## Secret and configuration review

`.env.local` and `.env.test.local` are ignored. Server-only configuration is
accessed through the server environment module; only the Supabase URL and anon
key use the `NEXT_PUBLIC_` boundary.

A local pattern review of tracked content and Git patch history found no private
key marker, credentialed PostgreSQL URL, JWT-like Supabase token or Resend-like
key. This is a targeted pattern review, not proof against every possible secret
format. No values were printed or copied, and no credential was rotated.

## Dependency review

`npm ls --depth=0` completed successfully. `lucide-react` was removed because it
was unused. Playwright and Redocly CLI were added as development-only tooling.

`npm audit` currently reports five unresolved findings:

- High: `prisma → @prisma/config → deepmerge-ts` stack exhaustion for recursive
  object graphs. This path is Prisma configuration tooling and is not reachable
  from SCCVI HTTP input. The audit-proposed fix is a major downgrade to Prisma
  6.12, while the current Prisma 7 line still pins the affected dependency.
- Moderate: `exceljs → uuid` buffer bounds issue in UUID v3/v5/v6 APIs when a
  caller supplies a buffer. SCCVI does not call the transitive UUID API and
  supplies only authorized report data to ExcelJS. No newer ExcelJS release is
  available; forcing an unsupported transitive major or downgrading ExcelJS was
  rejected.

There are no critical audit findings. These two upstream paths remain temporary
accepted risks pending compatible upstream releases. `npm audit fix --force`
must not be used because its proposed changes are breaking or regressive.
