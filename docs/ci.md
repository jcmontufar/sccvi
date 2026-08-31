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

The quality and isolated-test workflows validate code only. They do not deploy
SCCVI, apply migrations, seed an environment or import WHO/vaccination reference
data.

## Protected staging deployment

`.github/workflows/staging.yml` is manual-only and targets the protected
`sccvi-staging` GitHub Environment. It accepts only a full commit SHA already
present on `main`, reruns quality and isolated tests, then waits for environment
approval. A single concurrency group serializes deployments.

The protected job performs fail-closed staging preflight, persisted database
identity verification, reviewed `prisma migrate deploy`, explicit WHO/MSPAS
verification or import, explicit minimal bootstrap verification or application,
candidate deployment, read-only smoke tests and stable-hostname promotion. The
candidate uses `--skip-domain`, so failed build or smoke leaves the prior stable
deployment in place. Reference import and bootstrap default to read-only verify
and require separate dispatch choices and confirmation strings before writing.

The workflow never deploys production and never sends email. See
`docs/staging.md` for environment variables, owner configuration and rollback.
