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
requests, pushes to `main` and manual dispatches. Fork pull requests remain
excluded. It requires Docker on the GitHub-hosted runner but no long-lived
database, Supabase or application secrets.

The shared setup action starts a job-only local Supabase stack, obtains its
loopback PostgreSQL and Auth endpoints without logging them, generates a fresh
test identity and password, and explicitly creates and verifies the persisted
`ISOLATED_TEST` marker. It then runs Prisma validation/generation, applies all
repository migrations with `prisma migrate deploy`, imports the approved
reference artifacts through the identity-guarded importers, and provisions a
minimal fictional Auth/application fixture. The job installs Chromium and runs
integration followed by the complete E2E suite.

Explicit CI confirmations, GitHub Actions context, equal database URLs and
loopback-only PostgreSQL/Auth endpoints are all required. Any missing or
invalid value fails closed. Development and staging identities are explicitly
rejected, and neither environment is a fallback. Cleanup remains targeted and
re-verifies the persisted identity immediately before deletion. GitHub removes
the containers and data with the runner, so the former long-lived `sccvi-test`
GitHub Environment and its Supabase connection secrets are no longer required.
Local isolated testing remains supported as documented in `docs/testing.md`.

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
