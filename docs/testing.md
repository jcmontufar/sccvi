# SCCVI — Automated Test Strategy

## Test layers

- Unit tests use Vitest and require no database.
- Integration tests use Vitest against an isolated PostgreSQL database.
- End-to-end tests use Playwright against an isolated SCCVI application,
  database and Supabase Auth project with fictional fixtures only.

## Integration environment guard

Local integration tests read `.env.test.local`, which is ignored by Git. URL
inequality and `SCCVI_TEST_DATABASE_CONFIRMED=isolated-fictional-test-data-only`
are preliminary checks only. Before any test mutation, SCCVI connects to the
target and requires a persisted database identity whose UUID matches
`TEST_DATABASE_ID`. Missing, unreadable, development, staging, production and
mismatched markers all fail closed. This detects the same logical Supabase
database even when it is reached through a different direct, session-pooler or
transaction-pooler URL.

## Creating the isolated database identity

For local testing, create a PostgreSQL database or Supabase project used
exclusively for SCCVI automated tests. Do not run these statements on
development, staging or production.
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

GitHub Actions does not use that long-lived local target. Each isolated-test
job starts a fresh local Supabase Docker stack on the runner, including
PostgreSQL and Auth. Setup generates a per-job identity UUID, creates the
`ISOLATED_TEST` marker before migrations or fixture writes, positively verifies
it, applies repository migrations with `prisma migrate deploy`, imports the
approved reference artifacts and provisions only minimal fictional E2E data.
All database URLs are required to be the same loopback PostgreSQL URL in this
explicit CI mode, and the Supabase API must also be loopback-only. The runner
destroys the containers and their data when the job ends. No development,
staging or hosted test credentials are accepted as fallback.

BATCH-10 integration coverage verifies transactional audit persistence for
guardian, child-guardian, vaccine catalog, health-center and community
mutations. It also proves that an audit foreign-key failure rolls back its
associated mutation. Unit coverage verifies that bulk vaccination status
loading remains center-scoped and produces the same results as the central
per-dose evaluator, including historical non-applicability.

## Playwright environment

Local Playwright requires the database guard plus
`E2E_TARGET_CONFIRMED=isolated-test-application-only`, a dedicated test
Supabase URL and anonymous key, a fictional test user, and an authorized
fictional child fixture. The exact variable names are listed in `.env.example`.

Global setup deterministically derives and provisions isolated valid, revoked,
expired, PIN-protected and lockout QR fixtures for the configured fictional
child. Raw values exist only in the Playwright process environment; they are
not written to disk or logs. Global teardown re-verifies the persisted database
identity and removes exactly those token hashes. Playwright traces and videos
are disabled so ephemeral credentials are not captured.

The local server receives the isolated test database and Supabase public
configuration explicitly. It must not reuse an already-running development
server. Set `E2E_EXTERNAL_SERVER` only for a separately confirmed isolated test
deployment. Run with `npm run test:e2e`.

If the local dedicated database, auth user or fixtures are unavailable, the command
fails closed with `LIVE TEST EXECUTION BLOCKED`; this must not be reported as a
successful live E2E run.

## Current workflow coverage

- Core registry: login, community, guardian and child creation plus invalid
  community submission, with unique names and targeted cleanup.
- Growth: historical measurement, persisted history and WHO assessment display.
- Vaccination: factual registration, applied status and historical cohort
  regression.
- QR: invalid, valid, revoked, expired, correct PIN and persistent lockout,
  using fixtures created and removed by verified test setup.
- Campaigns: create a draft, preserve the recipient snapshot, initiate delivery
  and display the persisted provider-unavailable failure on desktop and Pixel
  7. The fictional guardian uses `example.invalid`; no external email is sent.

Growth E2E waits for the exact Server Action POST before checking the durable
redirect, avoiding the prior remote timing race without sleeps or extra retry
configuration.

Screenshots are retained only on failure. Visible assertions use Spanish UI
content. Test data is fictional and is not suitable for clinical use.

## Staging smoke boundary

Staging uses `playwright.staging.config.ts` and `tests/staging-smoke`; it does not
reuse isolated E2E global setup, fixtures or cleanup. The suite has one worker,
no retries, screenshots, traces or videos, and performs no SCCVI create, update
or delete operation. Global setup verifies the persisted STAGING identity and
the exact WHO/MSPAS counts through read-only SQL. Browser checks cover HTTPS,
anonymous route protection, controlled login, authenticated shell and safe
module/report/invalid-QR reads. The controlled bootstrap child has no guardian,
contact details or clinical records.
