# SCCVI — Continuous Integration

## Quality workflow

`.github/workflows/ci.yml` runs for pull requests and pushes to `main`. It uses
Node.js 22, `npm ci`, non-secret public placeholders and executes lint, format
verification, typecheck, unit tests, production build, Prisma validation and
generation, OpenAPI validation and `git diff --check`.

The quality job does not connect to PostgreSQL, Supabase Auth, Resend, staging
or production. It requires no repository secrets.

## Isolated integration and E2E workflow

`.github/workflows/isolated-e2e.yml` runs only for same-repository pull
requests, pushes to `main` and manual dispatches. Fork pull requests do not
receive secrets and therefore do not run this job. A repository environment
named `sccvi-test` must define these secrets:

- `TEST_DATABASE_URL`
- `TEST_DATABASE_ID`
- `E2E_USER_EMAIL`
- `E2E_USER_PASSWORD`
- `E2E_SUPABASE_URL`
- `E2E_SUPABASE_ANON_KEY`
- `E2E_EXISTING_CHILD_ID`

Do not use development or production values. The database must contain the
persisted `ISOLATED_TEST` marker described in `docs/testing.md`, and its UUID
must match `TEST_DATABASE_ID`. Confirmation strings are not sufficient without
that persisted identity check.

The job fails closed if a secret is absent, installs Chromium, and runs
integration followed by E2E. A concurrency group prevents two workflow runs
from mutating the shared isolated fixture simultaneously. Cleanup is targeted
and re-verifies database identity before deletion.

GitHub environment protection rules and secrets must be configured by a
repository administrator before this workflow can pass. No secret values are
stored in the repository.

## Deployment boundary

These workflows validate code only. They do not deploy SCCVI, apply migrations,
seed an environment or import WHO/vaccination reference data. Staging and
production deployment remain separate backlog work.
