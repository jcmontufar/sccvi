# Deployment architecture

```mermaid
flowchart TB
  User["Authorized browser or QR visitor"] -->|"HTTPS in production"| Web["Next.js application"]
  Web -->|"Cookie session and signed claims"| Auth["Supabase Auth"]
  Web -->|"Server-only Prisma connection"| DB["Supabase PostgreSQL"]
  Web -->|"Provider adapter"| Email["Resend"]
  CI["GitHub Actions quality job"] -->|"No secrets or database"| Build["Lint, types, unit tests, build"]
  E2ECI["Protected sccvi-test job"] --> TestAuth["Dedicated Supabase test Auth"]
  E2ECI --> TestDB["Dedicated PostgreSQL ISOLATED_TEST"]
  E2ECI --> Browser["Playwright desktop and Pixel 7"]
  Deploy["Protected sccvi-staging workflow"] -->|"Identity + migrate deploy"| StagingDB["Dedicated Supabase STAGING PostgreSQL"]
  Deploy -->|"Candidate, smoke, promote"| StagingWeb["Dedicated Vercel staging project"]
  StagingWeb --> StagingAuth["Dedicated Supabase STAGING Auth"]
  StagingWeb --> StagingDB
```

The staging workflow is manual, serialized and protected. It cannot target
production and does not promote a candidate until read-only smoke tests pass.
Production hosting remains undecided.
