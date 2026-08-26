# SCCVI — Automated Test Strategy

## Test layers

- Unit tests use Vitest and require no database.
- Integration tests use Vitest against an isolated PostgreSQL database.
- End-to-end tests use Playwright against an isolated SCCVI application,
  database and Supabase Auth project with fictional fixtures only.

## Integration environment guard

Integration tests read `.env.test.local`, which is ignored by Git. They refuse
to run unless `TEST_DATABASE_URL` is present, differs from any loaded
`DATABASE_URL` and `DIRECT_URL`, `NODE_ENV` is not `production`, and
`SCCVI_TEST_DATABASE_CONFIRMED=isolated-fictional-test-data-only` is set.

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
