# Entity relationship diagram

```mermaid
erDiagram
  HealthCenter ||--o{ User : assigns
  HealthCenter ||--o{ Community : serves
  Community ||--o{ Guardian : contains
  Community ||--o{ Child : contains
  User o|--o| Guardian : account
  Guardian ||--o{ ChildGuardian : relates
  Child ||--o{ ChildGuardian : relates
  Child ||--o{ GrowthRecord : has
  GrowthRecord ||--o{ GrowthAssessment : derives
  GrowthRecord ||--o| GrowthFollowUp : schedules
  Vaccine ||--o{ VaccineSchedule : defines
  VaccineScheduleVersion ||--o{ VaccineSchedule : versions
  Child ||--o{ Vaccination : receives
  VaccineSchedule ||--o{ Vaccination : records
  Child ||--o{ Alert : receives
  Alert ||--o{ Notification : triggers
  Guardian ||--o{ Notification : receives
  User ||--o{ Campaign : creates
  Campaign ||--o{ CampaignRecipient : resolves
  Guardian ||--o{ CampaignRecipient : targets
  CampaignRecipient ||--o{ Notification : delivers
  Child ||--o{ QRToken : protects
  User ||--o{ QRToken : creates
  User ||--o{ AuditLog : acts
```

`GrowthReference` supplies approved parameters to derived assessments without
owning them relationally. Historical medical records use restrictive foreign
keys and are not cascade-deleted.
