# ADR-006 — Guatemala Routine Childhood Vaccination Schedule

Status: Accepted for review
Date: 2026-08-25

## Decision

SCCVI uses the Guatemala MSPAS routine childhood schedule published by the
Dirección Departamental de Redes Integradas de Servicios de Salud de
Totonicapán on 2026-01-12. The normalized application version is
`GT-MSPAS-2026-01-12`.

The routine schedule is stored in
`prisma/data/vaccination/gt-mspas-2026-01.json` and imported with
`npm run vaccination:import`. The normalized file is committed so validation
and import work without an undocumented local artifact or network request.

## Authority and provenance

Primary authority:

- Ministerio de Salud Pública y Asistencia Social de Guatemala (MSPAS),
  Programa Nacional de Inmunizaciones.
- Publication: “Esquema de vacunación del Ministerio de Salud Pública y
  Asistencia Social en Guatemala (MSPAS)”.
- Publication date/version: 2026-01-12.
- URL:
  `https://ddrisstotonicapan.gob.gt/2026/01/12/esquema-de-vacunacion-del-ministerio-de-salud-publica-y-asistencia-social-en-guatemala-mspas/`
- Retrieved: 2026-08-25.
- SHA-256 of the retrieved HTML response used for normalization:
  `abd1ac769ba8ae0ed174ef16df3b0f688425aca69a053a34b174e92b044d4afa`.

Supporting transition sources:

- Agencia Guatemalteca de Noticias, “10 preguntas y respuestas sobre la vacuna
  hexavalente”, 2025-11-07. It reports the MSPAS/DNPAP decision that new
  schedules start hexavalent at 2, 4, 6 and 18 months while schedules already
  started with pentavalent plus polio may be completed during the transition.
  URL: `https://agn.gt/10-preguntas-y-respuestas-sobre-la-vacuna-hexavalente/`.
- PAHO/WHO Guatemala, “Guatemala da un paso histórico hacia la salud universal
  con la introducción de la vacuna hexavalente”, 2025-11-07.
  URL: `https://www.paho.org/es/noticias/7-11-2025-guatemala-da-paso-historico-hacia-salud-universal-con-introduccion-vacuna`.
- PAHO/WHO Guatemala, “Guatemala vive un día histórico para la salud pública con
  la introducción de la vacuna contra la varicela”, 2025-11-12.
  URL: `https://www.paho.org/es/noticias/12-11-2025-guatemala-vive-dia-historico-para-salud-publica-con-introduccion-vacuna-contra`.

The source page links `ESQUEMAS-2026.pdf`. Visual inspection showed that the
two-page PDF is a legacy pentavalent poster and does not contain the November
2025 hexavalent or varicella additions. Its SHA-256 is
`2f656fb68e153b470cfcdb55fc7b96481404c06fe4551105dd2441ac9ff62dc1`.
It is deliberately excluded from current schedule normalization.

The normalized JSON SHA-256 is
`2f41138f393a6ee7707513886263f2dd8ed0cc07cab49e30f280949ae7350aae`.
The validator fails closed if this value, the row count, a vaccine reference or
a unique dose code does not match.

## Routine dose structure

| Target age/window | Vaccine | Dose |
| --- | --- | --- |
| Birth, first 24 hours | Hepatitis B | Birth dose |
| Birth to before 1 year | BCG | Birth dose |
| 2 months | Rotavirus | First |
| 2 months | Pneumococcal | First |
| 2 months | Hexavalent | First |
| 4 months | Rotavirus | Second |
| 4 months | Pneumococcal | Second |
| 4 months | Hexavalent | Second |
| 6 months | Seasonal influenza | First |
| 6 months | Hexavalent | Third |
| 12 months | MMR/SPR | First |
| 12 months | Pneumococcal | Booster |
| 12 months | Seasonal influenza | Second |
| 15 months | Varicella | First |
| 18 months | MMR/SPR | Second |
| 18 months | Hexavalent | Booster |
| 48 months | DPT | Second booster |
| 48 months | Bivalent oral polio (OPVb) | Second booster |
| 48 months | Varicella | Booster |
| 9 through 16 years | HPV/VPH | Single dose |
| 10 years | Td | Booster |

This produces 21 routine `VaccineSchedule` rows and 12 reconciled catalog
vaccine identities.

The source states point ages, not grace periods. A point-age dose is `PENDING`
through its calendar target date and `OVERDUE` afterward when no application is
recorded. BCG's “before one year” window is exclusive at the first birthday.
The HPV window remains pending through age 16 and becomes overdue at age 17.
SCCVI stores date of birth but not birth time, so “first 24 hours” is represented
as the birth calendar date; this limitation is shown only as monitoring logic,
not clinical advice.

No undocumented minimum intervals, catch-up rules or contraindication rules are
added. A late factual application can still be recorded and remains historical.

## Hexavalent transition

Pentavalent is not imported as the current routine product. The official
transition statement permits health services to finish already-started
pentavalent/polio schedules, but it does not define a deterministic database
cutover criterion or catch-up equivalence algorithm. SCCVI therefore:

- uses hexavalent for the current routine version;
- preserves factual historical pentavalent/polio records and their original
  schedule links;
- does not silently convert, delete or infer those records;
- requires a future documented equivalence/catch-up decision before automated
  cross-product completion is implemented.

## Version applicability

`VaccineScheduleVersion` stores authority, publication, effective dates, URL and
source hash. Current status evaluation selects the latest active version whose
effective interval contains the Guatemala business date. The initial version's
effective date is its dated publication, 2026-01-12, because the source does not
state a different retroactive date. This is the least destructive explicit
assumption and can be superseded by a later version without rewriting factual
`Vaccination` rows.

Every vaccination remains linked to the exact schedule row and version used at
registration. Import updates matching version/dose identities, marks removed
rows inactive, and never deletes historical vaccination events.

## Special-risk and campaign separation

The source publication also lists pregnancy, adult and special-risk vaccines.
They are documented source context but are not routine-childhood rows in this
version.

Temporary 2026 measles outbreak/containment strategies are campaign policy and
are not imported into `VaccineSchedule`. Campaign targeting remains a separate
application concept. No “dose zero” or outbreak dose is treated as routine.

## Reproducibility

From a clean checkout:

```text
npm install
npm run prisma:generate
npm run vaccination:validate
npm run vaccination:import
```

`vaccination:validate` does not require database access. Import requires only a
confirmed SCCVI development `DATABASE_URL`; it upserts the version, reconciles
recognized vaccine aliases and upserts stable dose codes. Repeated import must
produce the same 21 active rows without duplication.

## Consequences

- Routine status is deterministic and uses `America/Guatemala`.
- `APPLIED` requires a factual vaccination record.
- No coverage percentage is exposed because no denominator methodology is
  approved.
- Vaccination-status campaign segmentation remains partial because the backlog
  does not define how multiple dose states aggregate to one child/guardian.
- Medical contraindications and individual recommendations remain outside
  automated SCCVI logic.
