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

## Error and Secret Handling

User-visible errors use safe Spanish messages. Provider errors, stack traces, SQL errors,
credentials, tokens, passwords, and internal security details must not be returned to the
interface or written to audit metadata.
