-- SCCVI uses Prisma over a server-only PostgreSQL connection. Browser roles must
-- not access application tables through the Supabase Data API.
ALTER TABLE "HealthCenter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Community" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Guardian" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Child" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChildGuardian" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GrowthRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GrowthAssessment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GrowthReference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GrowthFollowUp" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vaccine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VaccineScheduleVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VaccineSchedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vaccination" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Alert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Campaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CampaignRecipient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QRToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  "HealthCenter",
  "User",
  "Community",
  "Guardian",
  "Child",
  "ChildGuardian",
  "GrowthRecord",
  "GrowthAssessment",
  "GrowthReference",
  "GrowthFollowUp",
  "Vaccine",
  "VaccineScheduleVersion",
  "VaccineSchedule",
  "Vaccination",
  "Alert",
  "Notification",
  "Campaign",
  "CampaignRecipient",
  "QRToken",
  "AuditLog"
FROM anon, authenticated;

-- The environment marker is intentionally not managed by Prisma. Harden it
-- when present without creating or changing its identity row.
DO $$
BEGIN
  IF to_regclass('public.sccvi_staging_database_identity') IS NOT NULL THEN
    ALTER TABLE public.sccvi_staging_database_identity ENABLE ROW LEVEL SECURITY;
    REVOKE ALL PRIVILEGES ON TABLE public.sccvi_staging_database_identity
      FROM anon, authenticated;
  END IF;
END
$$;
