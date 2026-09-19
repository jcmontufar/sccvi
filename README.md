# SCCVI

Sistema de Control de Crecimiento y Vacunación Infantil (SCCVI) is a responsive
web application for municipal health centers in Guatemala. It manages
communities, guardians, children, factual growth and vaccination history,
preventive alerts, email and Telegram notifications, QR digital cards, campaigns,
dashboards, reports and audit records.

SCCVI is monitoring and decision-support software. It does not provide medical
diagnoses, invent growth thresholds or alter authoritative vaccination data.

## Technology

- TypeScript, Next.js 16 and React 19
- Tailwind CSS, shadcn/ui and Recharts
- PostgreSQL on Supabase, Prisma ORM and Supabase Auth
- Zod validation
- Vitest and Playwright
- Resend and Telegram Bot API behind a provider-independent dispatcher
- OpenAPI for implemented REST report exports

The application is a modular monolith with presentation, application, domain
and persistence boundaries. See [architecture](docs/architecture.md) and the
[project diagrams](docs/uml/README.md).

## Requirements and installation

Install Node.js 22 and npm, then use a dedicated Supabase development project:

```bash
npm ci
cp .env.example .env.local
```

On Windows, create `.env.local` from `.env.example` without printing or
committing its contents. Real `.env.local` and `.env.test.local` files are
ignored by Git.

## Environment configuration

Configure development values only in `.env.local`:

- `APP_URL`
- `DATABASE_URL` and `DIRECT_URL`
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` when an explicitly server-only workflow needs it
- `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM` and
  `RESEND_WEBHOOK_SECRET` for Resend delivery and status callbacks
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` and
  `TELEGRAM_WEBHOOK_SECRET` for the Telegram Bot API
- `QR_SECRET` when required by the configured QR boundary

Use the placeholders in `.env.example`; never copy real credentials into source
files, documentation, logs or pull requests. Development must never use
production credentials. Supabase Auth users require a corresponding active
SCCVI `User` profile. Authorization is enforced by the Next.js server.

## Database and seed

```bash
npm run prisma:validate
npm run prisma:generate
npx prisma migrate deploy
npm run prisma:seed
```

Apply migrations only to a confirmed non-production target. Use
`prisma migrate dev` only to intentionally create development migrations and
never edit an already-applied migration. The seed contains fictional
organizational data only.

## Authoritative reference data

WHO Child Growth Standards 2006 normalized data is committed with pinned
hashes:

```bash
npm run who:validate
npm run who:import
```

The current routine Guatemala schedule is `GT-MSPAS-2026-01-12`, with 21
versioned doses. Campaign rules remain separate:

```bash
npm run vaccination:validate
npm run vaccination:import
```

Imports require a confirmed development database. Provenance and medical
limitations are documented in ADR-005 and ADR-006 under
`docs/architecture/decisions/`.

## Development and quality

```bash
npm run dev
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
npm run openapi:validate
```

Open the configured `APP_URL`. User-facing application content is Spanish.

## Isolated integration and E2E tests

Integration and E2E suites must use a separate `sccvi-test` database and test
Supabase Auth project. They fail closed unless the persisted `ISOLATED_TEST`
marker and `TEST_DATABASE_ID` match. Create ignored `.env.test.local` using the
documented placeholders, then run:

```bash
npm run test:integration
npx playwright install chromium
npm run test:e2e
```

Playwright provisions fictional QR lifecycle fixtures inside the verified test
database and removes them afterward. It never falls back to development or
production. Full setup is in [docs/testing.md](docs/testing.md).

## CI and deployment preparation

GitHub Actions runs installation, lint, formatting, type checking, unit tests,
build, Prisma and OpenAPI validation. A separate serialized job can run
integration and E2E suites using only secrets from the protected `sccvi-test`
GitHub environment. See [docs/ci.md](docs/ci.md).

SCCVI has a dedicated isolated staging target at
`https://sccvi-staging.vercel.app`. Deployment is manual and protected: only a
commit already on `main` can pass quality, isolated tests, staging approval,
identity-guarded migrations, reference verification, candidate smoke and stable
promotion. See [the staging runbook](docs/staging.md). No production hosting
decision or production deployment is implied.

## Security constraints

- Never commit credentials, tokens, PINs, database URLs or provider keys.
- Never encode child or medical data directly in QR payloads.
- Preserve factual growth and vaccination history.
- Enforce role, center and guardian-child scope server-side.
- Do not invent WHO values, clinical classifications, vaccination timing,
  catch-up equivalence or coverage formulas.
- Use `America/Guatemala` for date-only business validation.

Project requirements, business rules, database design, testing strategy and
backlog live under [`docs/`](docs/).
