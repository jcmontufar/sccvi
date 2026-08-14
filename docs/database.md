# SCCVI — Database Design

## 1. Purpose

This document defines the conceptual database model for SCCVI.

Database technology:

- PostgreSQL
- Supabase
- Prisma ORM

This document is the source of truth for the initial Prisma schema.

The physical Prisma implementation may introduce technical fields,
indexes or constraints when necessary, but must preserve the domain
model described here.

---

## 2. General Conventions

Preferred identifiers:

UUID

Important entities should normally include:

- id
- createdAt
- updatedAt

Entities that support deactivation should include:

- isActive

Historical medical-related records should not be silently deleted.

Foreign keys and database constraints should be used where they improve
data integrity.

---

# 3. HealthCenter

Represents a health center using SCCVI.

Fields:

- id: UUID, primary key
- name: string, required
- code: string, optional, unique when present
- address: string, optional
- phone: string, optional
- email: string, optional
- isActive: boolean, default true
- createdAt: datetime
- updatedAt: datetime

Relationships:

HealthCenter
1 → N User

HealthCenter
1 → N Community

---

# 4. User

Represents an SCCVI application user.

Authentication identity is managed by Supabase Auth.

Fields:

- id: UUID, primary key
- authUserId: UUID/string, unique, required
- healthCenterId: UUID, optional depending on role
- fullName: string, required
- email: string, required
- role: UserRole, required
- isActive: boolean, default true
- createdAt: datetime
- updatedAt: datetime

Initial UserRole values:

- ADMIN
- HEALTH_STAFF
- CENTER_MANAGER
- GUARDIAN

Relationships:

User
N → 1 HealthCenter

User
1 → 0..1 Guardian

User may also be referenced as the creator or recorder of domain records.

Passwords are not stored in the SCCVI database.

---

# 5. Community

Represents a community served by a health center.

Fields:

- id: UUID, primary key
- healthCenterId: UUID, required
- name: string, required
- location: string, optional
- estimatedFamilies: integer, optional
- isActive: boolean, default true
- createdAt: datetime
- updatedAt: datetime

Relationships:

Community
N → 1 HealthCenter

Community
1 → N Guardian

Community
1 → N Child

Recommended constraint:

The combination:

healthCenterId + name

should normally be unique.

---

# 6. Guardian

Represents a parent or authorized responsible person.

A Guardian does not necessarily require an application login.

Fields:

- id: UUID, primary key
- communityId: UUID, required
- userId: UUID, optional, unique when present
- fullName: string, required
- identification: string, optional
- phone: string, optional
- email: string, optional
- preferredNotificationChannel: NotificationChannel, optional
- isActive: boolean, default true
- createdAt: datetime
- updatedAt: datetime

Relationships:

Guardian
N → 1 Community

Guardian
0..1 → 1 User

Guardian
N ↔ N Child
through ChildGuardian

Initial NotificationChannel:

- EMAIL
- TELEGRAM
- WHATSAPP

EMAIL is the initially implemented delivery channel.

---

# 7. Child

Represents a child registered in SCCVI.

Fields:

- id: UUID, primary key
- communityId: UUID, required
- fullName: string, required
- dateOfBirth: date, required
- sex: Sex, required
- isActive: boolean, default true
- createdAt: datetime
- updatedAt: datetime

Initial Sex values:

- MALE
- FEMALE

Relationships:

Child
N → 1 Community

Child
N ↔ N Guardian
through ChildGuardian

Child
1 → N GrowthRecord

Child
1 → N Vaccination

Child
1 → N Alert

Child
1 → N QRToken

---

# 8. ChildGuardian

Explicit relationship between Child and Guardian.

Fields:

- id: UUID, primary key
- childId: UUID, required
- guardianId: UUID, required
- relationshipType: string, optional
- isPrimary: boolean, default false
- createdAt: datetime
- updatedAt: datetime

Relationships:

ChildGuardian
N → 1 Child

ChildGuardian
N → 1 Guardian

Required unique constraint:

childId + guardianId

A guardian must not be associated more than once with the same child.

Recommended indexes:

- childId
- guardianId

---

# 9. GrowthRecord

Stores an original historical growth measurement.

Fields:

- id: UUID, primary key
- childId: UUID, required
- measuredByUserId: UUID, required
- measurementDate: date/datetime, required
- weightKg: decimal, required
- heightCm: decimal, required
- measurementMethod: GrowthMeasurementMethod, required for new measurements;
  nullable only for legacy compatibility
- notes: text, optional
- createdAt: datetime
- updatedAt: datetime

Relationships:

GrowthRecord
N → 1 Child

GrowthRecord
N → 1 User

GrowthRecord
1 → N GrowthAssessment

GrowthRecord
1 → 0..1 GrowthFollowUp as the explicit next follow-up source

Rules:

- measurementDate cannot be in the future
- weight must be validated
- height/length must be validated
- historical measurements must remain traceable

Use appropriate decimal precision rather than floating-point storage
when practical.

---

# 10. GrowthAssessment

Stores a calculated assessment derived from a GrowthRecord.

Fields:

- id: UUID, primary key
- growthRecordId: UUID, required
- indicator: GrowthIndicator, required
- zScore: decimal, optional
- percentile: decimal, optional
- classification: string, optional
- standardName: string, required
- standardVersion: string, required
- calculatedAt: datetime, required
- createdAt: datetime
- updatedAt: datetime

Initial GrowthIndicator values:

- WEIGHT_FOR_AGE
- HEIGHT_FOR_AGE

Relationships:

GrowthAssessment
N → 1 GrowthRecord

Recommended unique constraint:

growthRecordId + indicator + standardVersion

This prevents accidental duplicate assessments for the same
measurement, indicator and standard version.

---

# 11. GrowthReference

Represents structured approved growth-reference information.

The exact physical fields depend on the selected official WHO dataset.

Conceptual fields:

- id: UUID, primary key
- standardName: string, required
- standardVersion: string, required
- sex: Sex, required
- indicator: GrowthIndicator, required
- ageReference: integer/decimal, required
- parameterL: decimal, optional
- parameterM: decimal, optional
- parameterS: decimal, optional
- additionalParameters: JSON, optional
- createdAt: datetime

Important:

This table must not be populated using invented reference values.

Its final structure must be reviewed after selecting the approved WHO
dataset.

ADR-005 selects the WHO Child Growth Standards 2006 daily LMS tables. The
physical model uniquely identifies standard + version + sex + indicator + age.

---

# 11A. GrowthFollowUp

Stores an explicit next follow-up scheduled by authorized staff from a growth
measurement.

Fields:

- id: UUID, primary key
- childId: UUID, required
- scheduledByUserId: UUID, required
- sourceGrowthRecordId: UUID, required, unique
- dueDate: date, required
- completedAt: datetime, optional
- completedByGrowthRecordId: UUID, optional
- createdAt: datetime
- updatedAt: datetime

A later growth measurement may complete the follow-up. One source measurement
may schedule at most one next follow-up.

---

# 12. Vaccine

Represents a vaccine definition.

Fields:

- id: UUID, primary key
- name: string, required
- description: text, optional
- isActive: boolean, default true
- createdAt: datetime
- updatedAt: datetime

Recommended constraint:

name should normally be unique.

Relationships:

Vaccine
1 → N VaccineSchedule

---

# 13. VaccineSchedule

Represents an expected vaccine dose.

Fields:

- id: UUID, primary key
- vaccineId: UUID, required
- doseNumber: integer, required
- recommendedAgeDays: integer, optional
- minimumAgeDays: integer, optional
- maximumAgeDays: integer, optional
- minimumIntervalDays: integer, optional
- scheduleName: string, required
- scheduleVersion: string, required
- isActive: boolean, default true
- createdAt: datetime
- updatedAt: datetime

Relationships:

VaccineSchedule
N → 1 Vaccine

VaccineSchedule
1 → N Vaccination

Recommended unique constraint:

vaccineId + doseNumber + scheduleVersion

Important:

Schedule data must come from an approved source.

Do not populate official-looking vaccination data using assumptions.

---

# 14. Vaccination

Represents an administered vaccine dose.

Fields:

- id: UUID, primary key
- childId: UUID, required
- vaccineScheduleId: UUID, required
- administeredByUserId: UUID, required
- applicationDate: date/datetime, required
- nextDoseDate: date/datetime, optional
- notes: text, optional
- createdAt: datetime
- updatedAt: datetime

Relationships:

Vaccination
N → 1 Child

Vaccination
N → 1 VaccineSchedule

Vaccination
N → 1 User

The vaccination record represents historical factual information.

---

# 15. Alert

Represents a system-generated or authorized follow-up alert.

Fields:

- id: UUID, primary key
- childId: UUID, required
- type: AlertType, required
- severity: AlertSeverity, required
- status: AlertStatus, required
- title: string, required
- message: text, required
- sourceType: string, optional
- sourceId: UUID/string, optional
- reviewedAt: datetime, optional
- reviewedByUserId: UUID, optional
- resolvedAt: datetime, optional
- resolvedByUserId: UUID, optional
- createdAt: datetime
- updatedAt: datetime

Relationships:

Alert
N → 1 Child

Alert
N → 0..1 User as reviewer

Alert
N → 0..1 User as resolver

Initial AlertType examples:

- GROWTH
- VACCINATION
- MISSED_FOLLOW_UP

Initial AlertSeverity:

- PREVENTIVE
- CRITICAL

Initial AlertStatus:

- OPEN
- REVIEWED
- RESOLVED

---

# 16. Notification

Represents an attempted or planned notification.

Fields:

- id: UUID, primary key
- guardianId: UUID, optional
- alertId: UUID, optional
- campaignRecipientId: UUID, optional
- channel: NotificationChannel, required
- destination: string, required
- subject: string, optional
- message: text, required
- status: NotificationStatus, required
- providerMessageId: string, optional
- errorMessage: text, optional
- sentAt: datetime, optional
- createdAt: datetime
- updatedAt: datetime

Initial NotificationStatus:

- PENDING
- SENT
- FAILED

Relationships:

Notification
N → 0..1 Guardian

Notification
N → 0..1 Alert

Notification
N → 0..1 CampaignRecipient

A failed delivery must not be stored as SENT.

---

# 17. Campaign

Represents a communication campaign.

Fields:

- id: UUID, primary key
- createdByUserId: UUID, required
- name: string, required
- subject: string, optional
- message: text, required
- status: CampaignStatus, required
- segmentation: JSON, optional
- scheduledAt: datetime, optional
- startedAt: datetime, optional
- completedAt: datetime, optional
- createdAt: datetime
- updatedAt: datetime

Initial CampaignStatus:

- DRAFT
- SCHEDULED
- PROCESSING
- COMPLETED
- FAILED

Relationships:

Campaign
N → 1 User

Campaign
1 → N CampaignRecipient

---

# 18. CampaignRecipient

Represents a resolved recipient of a campaign.

Fields:

- id: UUID, primary key
- campaignId: UUID, required
- guardianId: UUID, required
- status: CampaignRecipientStatus, required
- createdAt: datetime
- updatedAt: datetime

Initial CampaignRecipientStatus:

- PENDING
- SENT
- FAILED
- SKIPPED

Relationships:

CampaignRecipient
N → 1 Campaign

CampaignRecipient
N → 1 Guardian

CampaignRecipient
1 → N Notification

Recommended unique constraint:

campaignId + guardianId

---

# 19. QRToken

Represents secure digital-card access credentials.

Fields:

- id: UUID, primary key
- childId: UUID, required
- tokenHash: string, required, unique
- pinHash: string, optional
- failedPinAttempts: integer, default 0
- pinLockedUntil: datetime, optional
- expiresAt: datetime, optional
- revokedAt: datetime, optional
- lastUsedAt: datetime, optional
- createdByUserId: UUID, required
- createdAt: datetime
- updatedAt: datetime

Relationships:

QRToken
N → 1 Child

QRToken
N → 1 User as creator

Rules:

- Raw token must not be stored when the approved token-hash design is used
- QR payload must not contain medical data
- Revoked token must not provide access
- Expired token must not provide access when expiration is configured
- PIN must never be stored in plaintext
- Repeated invalid PIN attempts must use persistent throttling shared by all application instances

---

# 20. AuditLog

Represents an auditable application event.

Fields:

- id: UUID, primary key
- userId: UUID, optional
- action: string, required
- entityType: string, optional
- entityId: UUID/string, optional
- metadata: JSON, optional
- ipAddress: string, optional
- userAgent: string, optional
- createdAt: datetime

Relationships:

AuditLog
N → 0..1 User

Audit metadata must not contain passwords, authentication tokens or
other secrets.

---

# 21. Main Relationship Map

Conceptually:

HealthCenter
├── User
└── Community
    ├── Guardian
    │   └── ChildGuardian
    │       └── Child
    └── Child

Child
├── ChildGuardian
├── GrowthRecord
│   └── GrowthAssessment
├── Vaccination
├── Alert
└── QRToken

Vaccine
└── VaccineSchedule
    └── Vaccination

Guardian
├── ChildGuardian
├── Notification
└── CampaignRecipient

Campaign
└── CampaignRecipient
    └── Notification

User
├── GrowthRecord
├── Vaccination
├── Campaign
├── QRToken
└── AuditLog

---

# 22. Important Unique Constraints

Initial important uniqueness rules include:

HealthCenter.code
when present

User.authUserId

Guardian.userId
when present

Community:
healthCenterId + name

ChildGuardian:
childId + guardianId

GrowthAssessment:
growthRecordId + indicator + standardVersion

Vaccine.name

VaccineSchedule:
vaccineId + doseNumber + scheduleVersion

CampaignRecipient:
campaignId + guardianId

QRToken.tokenHash

GrowthReference:
standardName + standardVersion + sex + indicator + ageReference

Alert:
type + sourceType + sourceId

Notification:
alertId + guardianId + channel

Additional constraints may be introduced when justified.

---

# 23. Recommended Indexes

Indexes should be added based on actual query patterns.

Initial candidates include:

Community.healthCenterId

Guardian.communityId

Child.communityId

ChildGuardian.childId

ChildGuardian.guardianId

GrowthRecord.childId

GrowthRecord.measurementDate

Vaccination.childId

Vaccination.applicationDate

Alert.childId

Alert.status

Alert.severity

Notification.guardianId

Notification.status

QRToken.tokenHash

AuditLog.userId

AuditLog.createdAt

Do not add excessive indexes without justification.

---

# 24. Date and Time

Store timestamps consistently.

Prefer UTC for application timestamps.

Convert to the appropriate display timezone at the application boundary.

Birth dates and other date-only concepts should remain date-oriented
when the selected implementation supports it appropriately.

---

# 25. Decimal Measurements

Growth measurements and calculated values should use appropriate
database decimal precision.

Avoid relying on binary floating-point storage for values where
predictable decimal representation matters.

The exact Prisma Decimal precision should be decided when implementing
the physical schema.

---

# 26. Seed Data

Seed data may be used for:

- Development
- Automated testing
- Local demonstrations

Seeds must not contain real sensitive patient information.

Development seeds must not be designed to destroy production data.

Official WHO and vaccination schedule datasets must not be invented for
seed purposes.

---

# 27. Migration Rules

Every database schema change must use a versioned migration.

Development may use:

prisma migrate dev

Production must use the approved deployment migration process, such as:

prisma migrate deploy

Already-applied production migrations must not be edited.

Destructive migrations require explicit review.

---

# 28. Medical Dataset Status

The following database areas remain intentionally dependent on approved
external information:

GrowthReference

VaccineSchedule official data

The schema may prepare for these concepts, but official-looking data
must not be populated until approved sources and versions are selected.

---

# 29. Prisma Implementation

When Codex creates `schema.prisma`, it must:

1. Read this document
2. Read business rules
3. Preserve documented relationships
4. Add appropriate foreign keys
5. Add documented unique constraints
6. Add justified indexes
7. Use enums where appropriate
8. Avoid unsupported assumptions
9. Report ambiguities before making major domain decisions

The first Prisma schema does not need to implement every future feature
if the backlog explicitly divides the schema into incremental tasks.

---

# 30. Database Principle

The SCCVI database should prioritize:

- Integrity
- Historical traceability
- Security
- Clear relationships
- Predictable migrations
- Minimal redundancy

The database must support the domain rather than merely mirror the user
interface.
