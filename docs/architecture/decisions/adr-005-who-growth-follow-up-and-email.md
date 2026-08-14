# ADR-005 — WHO Growth, Follow-Up and Email Decisions

## Status

Accepted for BATCH-05 on 2026-08-14.

## WHO reference decision

SCCVI uses the **WHO Child Growth Standards 2006** for children from birth
through the official daily table endpoint at age 1856 days. Initial indicators
are `WEIGHT_FOR_AGE` and `HEIGHT_FOR_AGE`, for `MALE` and `FEMALE`.

Authoritative pages:

- https://www.who.int/tools/child-growth-standards/standards
- https://www.who.int/tools/child-growth-standards/software
- https://www.who.int/tools/child-growth-standards/standards/weight-for-age
- https://www.who.int/tools/child-growth-standards/standards/length-height-for-age

The reproducible source artifact is the official WHO SAS macro package:

- File: `igrowup-sas.zip`
- URL: `https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/software/igrowup-sas.zip?sfvrsn=20022035_2`
- Retrieved: 2026-08-14
- SHA-256: `f5f7d6cd59bc54b7e216e673f3a373153ceaca127a2230004abbf2b8beef7200`

Source tables extracted from that package:

| File | Purpose | Rows | SHA-256 |
| --- | --- | ---: | --- |
| `weianthro.sas7bdat` | Daily weight-for-age LMS parameters | 3,714 | `50edec782b648c72c3553b00c539b741ed5ab03e1904a200e9f2345afd4bf2b8` |
| `lenanthro.sas7bdat` | Daily length/height-for-age LMS parameters and mode | 3,714 | `de83b6535888941a42dd55b82dc7a07889427d775900a1a969b1d322df34874c` |

The repository contains normalized, reviewable CSV derivatives:

| File | SHA-256 |
| --- | --- |
| `prisma/data/who-2006/weight-for-age.csv` | `62d1d0d3d68bcc5a6a6c50d07f0acf0ea99e9f49d873d6ca185d4259da730ded` |
| `prisma/data/who-2006/length-height-for-age.csv` | `1f504e7fd1d1b13f55efa909a20d24cae618072146712996240380822ad0a921` |

### Redistribution and repository policy

The normalized CSV files are committed to the repository; they are not generated
from an undocumented local file and are not ignored by Git. This is approach A of
the BATCH-05 reproducibility decision. The repository enforces LF checkout for
text files, with an explicit `.gitattributes` rule for these byte-verified CSV
artifacts, so Git cannot change their hashes on Windows.

The basis for retaining them is the official [WHO terms and conditions for data
compilations](https://www.who.int/about/policies/publishing/data-policy/terms-and-conditions),
which grant a royalty-free, worldwide, non-exclusive right to reproduce, extract,
download, copy, and distribute WHO datasets for public-health purposes, subject
to WHO attribution and the other stated conditions. SCCVI uses the data for its
municipal child-growth public-health purpose. WHO retains copyright; inclusion
does not imply WHO endorsement, and the data are provided without warranty. Any
use outside that public-health purpose requires a separate licensing review.

### Deterministic normalization

The verified `igrowup-sas.zip` archive was extracted and only the two source
tables identified above were used. The normalized output is UTF-8 CSV with LF
line endings and this fixed column order:

`standardName,standardVersion,sex,indicator,ageDays,l,m,s,measurementMode`

The transformation:

- maps source sex `1` to `MALE` and `2` to `FEMALE`;
- maps `age` directly to integer elapsed days without interpolation;
- copies the source `l`, `m`, and `s` values without recalculation or rounding;
- maps `loh` directly to `L` or `H` for length/height and leaves it empty for
  weight;
- adds only the constant standard name, version, and indicator identifiers; and
- orders each indicator deterministically by sex and age from 0 through 1856.

No source row is filled, interpolated, or substituted. Each committed file has
1,857 daily rows per sex. Import validates the committed-file SHA-256, row count,
sex, indicator, complete age sequence, positive LMS parameters, and expected
length/height mode before replacing only the same standard/version rows in one
transaction.

### Fresh-checkout workflow

No `who:prepare` step is needed because the checksum-pinned normalized files are
versioned. From a clean checkout of the branch:

```text
npm install
npm run who:validate
```

After configuring the confirmed SCCVI development database outside version
control, import with:

```text
npm run who:import
```

`who:validate` requires no database or secret and must report 7,428 rows before
an import is attempted.

## Calculation and measurement decision

Age selection uses exact elapsed days from birth date to measurement date. The
LMS calculation follows the formula documented by WHO. Weight-for-age applies
the WHO restricted extension beyond ±3 z-scores. Percentiles are derived from
the standard normal cumulative distribution.

The recorded `heightCm` remains unchanged. `measurementMethod` records whether
staff measured recumbent length or standing height. For the derived WHO
comparison only, the official macro rule is applied:

- below 731 days: standing height is converted to length by adding 0.7 cm;
- from 731 days: recumbent length is converted to height by subtracting 0.7 cm.

Legacy measurements keep a null method and must not receive a new height-for-age
assessment until staff records the method through an audited correction.

No clinical classification or growth-alert threshold is approved. SCCVI stores
z-score, percentile, standard, and version, but leaves classification null and
keeps TASK-048 blocked. The UI states that results support monitoring and are
not diagnoses.

## Follow-up decision

A missed-follow-up candidate exists only when staff explicitly provides a next
follow-up date while recording a growth measurement. The date must be after the
source measurement. A later factual growth measurement for the same child
qualifies as completion, including an early visit before the due date.

With no approved grace period, a still-incomplete follow-up becomes overdue on
the first Guatemala business date after its due date. Due-today and completed
follow-ups do not alert. One alert is allowed per follow-up source.

## Email provider decision

Resend is the approved initial email provider. Its adapter remains behind the
provider-independent notification service. Configuration uses:

- `EMAIL_PROVIDER=resend`
- `EMAIL_API_KEY` for the Resend API key
- `EMAIL_FROM` for the verified sender

All variables are optional at build time. Missing configuration produces a
recorded failed notification when delivery is requested; it does not expose a
secret or claim success. Alert email delivery is currently limited to
`MISSED_FOLLOW_UP`, and only active guardians with an email address and explicit
`EMAIL` preference are eligible. A database unique key and provider idempotency
key prevent duplicate alert-recipient sends.

Official provider reference:

- https://resend.com/docs/api-reference/emails/send-email

## Consequences

- The vaccination schedule and all schedule-derived vaccination behavior remain
  blocked.
- TASK-048 remains blocked until SCCVI approves explicit growth alert thresholds
  and wording.
- Campaign delivery is not enabled by this decision.
