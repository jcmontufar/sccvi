# SCCVI — Requirements

## 1. Purpose

SCCVI (Sistema de Control de Crecimiento y Vacunación Infantil) is a responsive web application designed to support municipal health centers in monitoring child growth and vaccination.

The system centralizes information about communities, guardians, children, growth controls, vaccinations, alerts, notifications, campaigns, digital QR cards and reports.

---

## 2. Actors

### ADMIN

Responsible for full system administration.

Main capabilities:

- Manage users
- Manage system configuration
- Access communities
- Access guardians
- Access children
- Access growth information
- Access vaccination information
- Manage alerts
- Manage campaigns
- Access reports
- Manage QR credentials
- Review relevant audit information

### HEALTH_STAFF

Health personnel responsible for child monitoring.

Main capabilities:

- View communities
- Register and consult guardians
- Register and consult children
- Record growth measurements
- Review growth history
- Record vaccinations
- Review vaccination history
- Review alerts
- Perform authorized follow-up activities

### CENTER_MANAGER

Responsible for operational monitoring.

Main capabilities:

- Monitor communities
- Monitor children and guardians
- Review alerts
- Review vaccination coverage
- Manage communication campaigns
- Access dashboards
- Generate reports

### GUARDIAN

Parent or authorized guardian associated with one or more children.

Main capabilities:

- Access authorized child information
- Review growth information
- Review vaccination information
- Access the digital card where enabled
- Receive authorized notifications

A guardian must never gain access to children with whom they have no authorized relationship.

---

## 3. Authentication

The system must:

- Authenticate authorized users
- Maintain secure sessions
- Support role-based access
- Protect private routes
- Support account recovery where appropriate
- Prevent unauthorized access to protected information

Authentication will use Supabase Auth.

---

## 4. User Management

Authorized administrators must be able to:

- Create application users
- View users
- Update permitted user information
- Assign supported roles
- Activate or deactivate users

Initial roles:

- ADMIN
- HEALTH_STAFF
- CENTER_MANAGER
- GUARDIAN

---

## 5. Health Centers

The architecture must support health centers as organizational entities.

A health center may contain:

- Users
- Communities

The initial implementation may operate with one center while preserving the ability to expand later.

---

## 6. Communities

The system must support:

- Create community
- View community
- Update community
- Deactivate community
- Search communities
- Filter communities

Community information may include:

- Name
- Location
- Estimated number of families
- Associated health center
- Active status

---

## 7. Guardians

The system must support:

- Register guardian
- View guardian
- Update guardian
- Deactivate guardian
- Associate guardian with a community
- Associate guardian with one or more children
- Store contact information
- Store notification preference

Guardian information may include:

- Full name
- Identification
- Phone
- Email
- Community
- Preferred notification channel

Not every guardian must initially have an application login account.

---

## 8. Children

The system must support:

- Register child
- View child
- Update child
- Deactivate child
- Associate child with a community
- Associate child with one or more guardians
- Access child growth history
- Access child vaccination history
- Access child alerts
- Manage authorized digital QR card access

Child information includes:

- Full name
- Date of birth
- Sex
- Community
- Active status

---

## 9. Child–Guardian Relationships

The system must support:

- One guardian associated with multiple children
- One child associated with multiple guardians
- Relationship type
- Identification of a primary guardian where appropriate

This relationship must be explicitly stored and used for authorization.

---

## 10. Growth Monitoring

The system must support periodic growth controls.

Growth records must support:

- Child
- Measurement date
- Weight
- Height or length
- Recording user
- Notes where appropriate

The system must maintain historical measurements.

Original measurements and calculated assessments must remain conceptually separate.

---

## 11. Growth History

Authorized users must be able to:

- View previous measurements
- Review measurements chronologically
- View relevant growth charts
- Review calculated assessments where available

Initial chart requirements include:

- Weight for age
- Height/length for age

---

## 12. WHO Growth Assessment

The system must support structured growth assessment using an approved WHO reference dataset.

Initial scope:

- Weight for age
- Height/length for age
- Age-based evaluation
- Sex-based reference selection

The system should support derived information such as:

- Z-score where supported by the approved reference
- Percentile where supported
- Classification
- Reference dataset name
- Reference dataset version

The system must not invent missing WHO reference values.

The exact official dataset must be selected and documented before implementing the final growth engine.

---

## 13. Growth Alerts

The system must support automatic alerts when configured growth conditions require follow-up.

Alerts may include:

- Possible low-growth risk
- Possible high-growth risk
- Missed growth control

Alerts are monitoring and follow-up indicators.

They must not be represented automatically as definitive medical diagnoses.

---

## 14. Vaccine Catalog

Authorized users must be able to maintain the vaccine catalog.

Vaccine information may include:

- Name
- Description
- Active status

---

## 15. Vaccine Schedule

The system must support vaccine schedules.

A scheduled vaccine dose may include:

- Vaccine
- Dose number
- Recommended age
- Minimum age where applicable
- Maximum age where applicable
- Required interval where applicable

The exact vaccination schedule must come from an approved and documented source.

The system must not invent an official vaccination schedule.

---

## 16. Vaccination Records

Authorized health personnel must be able to register administered vaccinations.

A vaccination record may include:

- Child
- Scheduled vaccine dose
- Application date
- Next dose date where applicable
- Recording user
- Notes

The system must preserve vaccination history.

---

## 17. Vaccination Status

The system must be capable of determining vaccination status from:

- Child age
- Approved vaccine schedule
- Recorded vaccinations

Relevant derived states may include:

- APPLIED
- PENDING
- OVERDUE

The system should avoid storing redundant static status when it can be derived reliably.

---

## 18. Vaccination Alerts

The system must support alerts for:

- Pending vaccine doses
- Overdue vaccine doses

Alert rules must be centralized and testable.

---

## 19. Alert Management

Alerts may originate from:

- Growth
- Vaccination
- Missed follow-up

Initial severities:

- PREVENTIVE
- CRITICAL

Initial lifecycle statuses:

- OPEN
- REVIEWED
- RESOLVED

Authorized users must be able to:

- View alerts
- Filter alerts
- Review alerts
- Resolve alerts

Resolution of important alerts should be auditable.

---

## 20. Notifications

The initial required notification channel is:

- Email

Future optional channels may include:

- Telegram
- WhatsApp

The system must:

- Record notification attempts
- Record delivery status where available
- Record failures
- Associate notifications with guardians where appropriate

Initial notification states:

- PENDING
- SENT
- FAILED

Core business logic must not depend directly on one email provider.

---

## 21. Communication Campaigns

Authorized users may create communication campaigns.

Campaigns may be segmented using criteria such as:

- Community
- Child age
- Vaccination status

Campaigns should support:

- Draft creation
- Recipient determination
- Message delivery
- Delivery tracking where appropriate

---

## 22. Digital Card and QR

The system must support a digital child growth/vaccination card.

The system must:

- Generate secure QR credentials
- Associate QR credentials with one child
- Validate QR credentials
- Allow revocation
- Optionally support expiration
- Optionally support PIN protection

The QR payload must not directly contain sensitive medical or personal child information.

QR access must use an opaque token-based mechanism.

---

## 23. Dashboard

The system should provide a dashboard containing useful operational information.

Possible indicators include:

- Number of registered children
- Number of communities
- Open alerts
- Pending vaccines
- Vaccination coverage
- Relevant charts

Dashboard information must respect user authorization.

---

## 24. Reports

The system must support reports related to:

- Growth
- Vaccination
- Alerts
- Communities
- Vaccination coverage
- Incomplete vaccination

Reports may support filtering by relevant criteria.

Export formats should include:

- PDF
- Excel

---

## 25. Audit

Critical operations should maintain appropriate traceability.

Relevant events may include:

- User creation
- Child creation/update
- Growth record creation/update
- Vaccination registration
- Alert resolution
- QR creation
- QR revocation
- Relevant authentication events

The system does not need to audit every trivial interface interaction.

---

## 26. API

The application may expose REST endpoints where appropriate.

API convention:

/api/v1/

Public REST endpoints should be documented using OpenAPI.

API responses should use a predictable structure.

Successful response:

{
  "success": true,
  "data": {}
}

Error response:

{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}

---

## 27. Responsive Web Application

SCCVI must be a responsive web application.

It should provide a usable experience on:

- Desktop computers
- Tablets
- Smartphones

A native Android or iOS application is not required for the initial project.

---

## 28. Security Requirements

The system must:

- Use HTTPS in production
- Protect authentication credentials
- Protect database credentials
- Protect provider API keys
- Validate untrusted input server-side
- Enforce authorization server-side
- Prevent unauthorized access to another child's information
- Use secure QR tokens
- Support QR revocation
- Avoid exposing internal secrets through API errors
- Keep real environment secrets outside Git

Frontend permission controls alone are not sufficient.

---

## 29. Data Integrity

The system must:

- Maintain referential integrity
- Preserve historical growth records
- Preserve historical vaccination records
- Use transactions for dependent operations when required
- Avoid silent destructive changes
- Maintain appropriate traceability for important modifications

---

## 30. Testing Requirements

Critical domain behavior must have automated tests.

Priority areas include:

- Exact age calculation
- Growth calculations
- WHO reference evaluation
- Vaccination status
- Alert rules
- Authorization
- QR token validation

Integration testing should cover important database workflows.

End-to-end testing should cover critical user workflows.

---

## 31. Maintainability

The application should:

- Use TypeScript strict mode
- Remain modular
- Centralize reusable validation
- Avoid duplicated business logic
- Keep domain logic outside UI components
- Maintain documentation alongside implementation
- Use controlled database migrations

---

## 32. Initial Out of Scope

The first version does not include:

- Native Android application
- Native iOS application
- Complete hospital information system
- Medication prescription
- Billing
- Accounting
- Telemedicine
- Vaccine inventory management
- Automatic definitive medical diagnosis
- Microservices architecture

These features must not be added unless the project scope is explicitly changed.

---

## 33. External Decisions

The following decisions must be completed before their dependent functionality is finalized:

### WHO Dataset

Resolved for the initial indicators: WHO Child Growth Standards 2006, using the
official daily LMS tables for weight-for-age and length/height-for-age. Source,
version, checksums and measurement methodology are recorded in ADR-005.

### Vaccination Schedule

An approved vaccination schedule and version must be selected and documented.

### Email Provider

Resolved: Resend is the initial email provider behind the provider-independent
notification service. Configuration and secret handling are recorded in ADR-005.

These unresolved decisions must not be filled using invented data.

Only the vaccination schedule remains unresolved after ADR-005.
