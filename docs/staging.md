# SCCVI isolated staging runbook

## Boundary

SCCVI staging is `https://sccvi-staging.vercel.app`, backed by one dedicated
Vercel project and one dedicated Supabase project. Its PostgreSQL database,
Supabase Auth users, URL and secrets are not interchangeable with development,
`ISOLATED_TEST` or future production. The Vercel project's Production target is
the stable **SCCVI staging** channel; it is not SCCVI production.

The owner created the database marker independently of Prisma. Deployment tools
never create, update or repair it. Every database operation requires exactly one
row in `public.sccvi_staging_database_identity` with `environment = 'STAGING'`
and a UUID matching `STAGING_DATABASE_ID`. Presence of a recognized development,
test or production marker blocks the operation.

## Secret scopes

Vercel runtime contains only `APP_URL`, `DATABASE_URL`, the public Supabase URL
and anonymous key, `SCCVI_DEPLOYMENT_ENV=STAGING`, `STAGING_DATABASE_ID`, and the
complete Resend configuration (including its webhook secret) when email is
enabled, and the complete Telegram bot configuration when Telegram is enabled.
`DIRECT_URL`, service-role keys,
Vercel credentials, bootstrap values and smoke credentials must not be Vercel
runtime variables.

The protected GitHub Environment `sccvi-staging` stores administrative and smoke
configuration. Configure a required reviewer, prevent self-review when the plan
supports it, and restrict deployments to `main`. Disable automatic Vercel Git
deployments so the protected workflow is the only promotion path.

Do not print secret values. Do not store a password, database URL, provider key,
service-role key or bypass secret in Git, workflow artifacts, screenshots or
traces.

## Preflight and migrations

The safe order is:

1. Dispatch `.github/workflows/staging.yml` with a full commit SHA already on
   `main`.
2. Pass quality and isolated-test jobs.
3. Obtain approval for the `sccvi-staging` GitHub Environment.
4. Run `npm run staging:db:preflight`. It verifies strict configuration, the
   persisted identity, Prisma schema/generation, migration status and migration
   history without applying a migration.
5. Run `npm run staging:db:deploy` only with
   `SCCVI_STAGING_MIGRATION_CONFIRMED=apply-reviewed-migrations-to-staging`.
   It uses `prisma migrate deploy`, then re-verifies identity, migration status,
   RLS and browser-role privilege revocation.

For the first deployment only, provisioning leaves the approved staging marker
table and its automatically owned indexes in `public`. Prisma otherwise reports
P3005 because that schema is not literally empty. The deploy wrapper inventories
the schema and permits this initialization path only when there is no Prisma
history, exactly one staging identity table is present, every public index
belongs to that table, and there are no other public relations, routines,
domains or enums. It verifies the identity, temporarily moves the intact marker
to a fixed guard schema, runs the real migrations with `prisma migrate deploy`,
and restores and hardens the marker in a `finally` path. An existing Prisma
history uses the normal idempotent deployment path. Any other non-empty state or
leftover guard schema fails closed for manual review.

The clean staging database had five repository migrations pending before
BATCH-12. This branch adds one additive security migration, so the first reviewed
deployment applies six migrations in repository order.

Never use `migrate dev`, `migrate reset`, schema reset, an automatic down
migration or development seed against staging. A non-zero preflight, failed or
unknown migration record, identity mismatch, missing table, disabled RLS or
browser-role grant blocks progression.

The BATCH-12 migration enables RLS and revokes all table privileges from `anon`
and `authenticated` on the 20 SCCVI application tables. Normal persistence
continues through the server-only Prisma connection. The marker is hardened only
if it already exists; it is never recreated.

## WHO/MSPAS reference data

`npm run staging:reference:verify` validates the committed source artifacts,
verifies staging identity, and performs read-only database verification.

The first import requires the separately reviewed command
`npm run staging:reference:import` and
`SCCVI_STAGING_REFERENCE_DATA_CONFIRMED=import-approved-reference-data-to-staging`.
Before writing, the command verifies both artifact hashes and schemas. One
transaction re-verifies identity, replaces only WHO 2006 weight/height reference
rows, reconciles the approved vaccination schedule, and verifies before commit:

- 7,428 WHO rows;
- 21 active vaccination doses;
- all 21 active doses belong to `GT-MSPAS-2026-01-12`;
- exactly one active matching schedule version.

Any mismatch rolls back both datasets. The source artifacts are never modified.

## Minimal bootstrap

Public signup remains disabled. The owner creates one controlled Supabase Auth
identity without placing its password in Git. The Auth UUID, email and display
name are supplied through protected environment configuration.

`npm run staging:bootstrap:apply` requires
`SCCVI_STAGING_BOOTSTRAP_CONFIRMED=create-minimal-fictional-staging-bootstrap`.
After identity verification, one transaction idempotently reconciles:

- health center `SCCVI-STAGING`;
- community `Validación técnica de staging`;
- one active, center-scoped `HEALTH_STAFF` profile linked by `authUserId`;
- one child explicitly named `[STAGING] Niño ficticio para pruebas de humo`,
  with no guardian, contact information, clinical measurements or vaccination
  records;
- one sanitized `STAGING_BOOTSTRAP` audit entry.

`npm run staging:bootstrap:verify` is read-only. The local-development fixtures
remain forbidden in staging and must never be used as a substitute.

## Integral fictional demo dataset

TASK-089 provides a separate, optional staging-only dataset after the minimal
bootstrap and approved WHO/MSPAS data exist. It uses fixed identifiers and the
marker `SCCVI_STAGING_DEMO_V1`; it contains five communities, 18 children and
guardians, longitudinal growth measurements, factual scheduled-dose
applications, overdue/pending scenarios, preventive alerts and missed
follow-ups. Names are prefixed with `[STAGING DEMO]` and no contact data is
created.

Read-only verification:

```bash
npm run staging:demo:verify
```

Reviewed application requires the operation-specific confirmation only for that
command:

```bash
SCCVI_STAGING_DEMO_CONFIRMED=apply-integral-fictional-demo-to-isolated-staging npm run staging:demo:apply
```

Both commands validate the strict staging environment and persisted staging
database identity. Apply verifies identity again inside one transaction, fails
on unrecognized deterministic IDs, and uses upserts so rerunning does not create
duplicates. It does not alter WHO/MSPAS reference rows or the schedule. This
operation is manual and is not part of `Deploy isolated staging`.

## Deployment and smoke

The workflow pulls only the dedicated staging Vercel project. It rejects
`DIRECT_URL`, a Supabase service-role key, smoke password or Vercel token if found
in downloaded Vercel runtime configuration. It builds and deploys an immutable
candidate using `--prod --skip-domain`, leaving the stable hostname on the prior
working deployment.

`npm run test:staging-smoke` uses a separate Playwright configuration with one
worker and no fixture setup, cleanup, screenshots, traces or video. It performs:

- HTTPS reachability;
- anonymous protected-route redirect;
- controlled login and authenticated shell load;
- read-only health-center, community, vaccine, growth, vaccination and report
  page loads;
- direct read-only verification of staging identity, WHO count, dose count and
  schedule version;
- safe invalid-QR behavior.

It does not create, update or delete SCCVI records. Only after smoke passes does
the workflow promote the candidate to the stable hostname. A final stable-host
reachability check completes the deployment. Deployment concurrency permits one
staging run at a time.

## Email provider boundary

Email configuration must be either complete (`EMAIL_PROVIDER=resend`, API key,
sender and `RESEND_WEBHOOK_SECRET`) or entirely omitted. Telegram configuration
must likewise provide bot token, bot username and webhook secret together or be
omitted. Deployment does not send notifications. Live provider verification is
a separately approved owner action using fictional data and controlled
recipients.

## Failure and rollback

- **Configuration or identity:** stop before database or deployment work. Correct
  configuration; never repair or recreate the marker automatically.
- **Migration:** do not run a down migration. Keep staging blocked, review the
  Prisma history and prepare a forward-fix migration. Restore the staging backup
  only when reviewed recovery is necessary.
- **Reference import:** the transaction rolls back. Keep the prior verified data
  and diagnose the artifact or reconciliation failure.
- **Bootstrap:** rerun the idempotent command after correcting configuration. Do
  not delete unrelated rows.
- **Build/candidate/smoke:** do not promote. The stable hostname retains the prior
  deployment.
- **Post-promotion reachability:** re-promote the prior compatible Vercel
  deployment. If a database migration is not backward-compatible, keep staging
  blocked and use a reviewed forward fix.

Before a migration, confirm the account's staging backup/recovery capability.
Vercel, Supabase, GitHub Environment approval and Resend capabilities remain
manual owner checks because they depend on account plans.
