# SCCVI — Automated Test Strategy

## Test layers

- Unit tests use Vitest and require no database.
- Integration tests use Vitest against an isolated PostgreSQL database.
- End-to-end tests use Playwright against an isolated SCCVI application,
  database and Supabase Auth project with fictional fixtures only.

## Integration environment guard

Integration tests read `.env.test.local`, which is ignored by Git. URL
inequality and `SCCVI_TEST_DATABASE_CONFIRMED=isolated-fictional-test-data-only`
are preliminary checks only. Before any test mutation, SCCVI connects to the
target and requires a persisted database identity whose UUID matches
`TEST_DATABASE_ID`. Missing, unreadable, development, production and mismatched
markers all fail closed. This detects the same logical Supabase database even
when it is reached through a different direct, session-pooler or
transaction-pooler URL.

## Creating the isolated database identity

Create a PostgreSQL database or Supabase project used exclusively for SCCVI
automated tests. Do not run these statements on development or production.
Connect directly to that isolated target, generate a unique UUID, and execute:

```sql
CREATE TABLE public.sccvi_test_database_identity (
  singleton boolean PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  environment text NOT NULL CHECK (environment = 'ISOLATED_TEST'),
  identity uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.sccvi_test_database_identity
  (singleton, environment, identity)
VALUES
  (TRUE, 'ISOLATED_TEST', '<unique-test-database-uuid>');
```

Store that same UUID as `TEST_DATABASE_ID` in ignored `.env.test.local`, along
with the isolated connection URL and confirmation value. The UUID is an
identity, not an authentication secret, but it must not be reused for another
database. Grant the test database user read access to the marker. Do not add
this table to Prisma migrations: normal development and production databases
must remain unmarked and therefore unusable by destructive automated tests.

The integration setup verifies the marker before tests begin. Cleanup helpers
verify it again immediately before `DELETE` operations, including on the same
PostgreSQL client used by direct SQL cleanup.

Tests use uniquely named fixtures and delete only their recorded identifiers.
They never reset a schema or delete shared development data. Run them with
`npm run test:integration`.

## Playwright environment

Playwright requires the database guard plus
`E2E_TARGET_CONFIRMED=isolated-test-application-only`, a dedicated test
Supabase URL and anonymous key, a fictional test user, and an authorized
fictional child fixture. The exact variable names are listed in `.env.example`.

Optional local QR fixtures support valid, revoked, expired, PIN and locked
credential paths. Raw QR tokens and PINs stay in `.env.test.local`; Playwright
traces and videos are disabled so those credentials are not captured. Test
output must never print these variables.

The local server receives the isolated test database and Supabase public
configuration explicitly. It must not reuse an already-running development
server. Set `E2E_EXTERNAL_SERVER` only for a separately confirmed isolated test
deployment. Run with `npm run test:e2e`.

If the dedicated database, auth user or fixtures are unavailable, the command
fails closed with `LIVE TEST EXECUTION BLOCKED`; this must not be reported as a
successful live E2E run.

## Current workflow coverage

- Core registry: login, community, guardian and child creation plus invalid
  community submission, with unique names and targeted cleanup.
- Growth: historical measurement, persisted history and WHO assessment display.
- Vaccination: factual registration, applied status and historical cohort
  regression.
- QR: invalid, valid, revoked, expired, PIN and repeated-failure paths when the
  corresponding isolated fixtures exist.

Screenshots are retained only on failure. Visible assertions use Spanish UI
content. Test data is fictional and is not suitable for clinical use.
