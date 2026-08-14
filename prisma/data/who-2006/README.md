# WHO Child Growth Standards 2006 reference data

This directory intentionally versions the normalized WHO reference CSV files
required by SCCVI. They are part of the repository and allow `npm run
who:validate` to run from a clean checkout without local source files.
Their LF line endings are enforced by the repository's `.gitattributes` because
validation intentionally checks the exact artifact bytes.

Source: the official WHO `igrowup-sas.zip` package at
https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/software/igrowup-sas.zip?sfvrsn=20022035_2,
retrieved 2026-08-14. The archive and extracted source-file hashes, normalized
file hashes, field mappings, attribution/licensing basis, and exact fresh-clone
commands are recorded in
`docs/architecture/decisions/adr-005-who-growth-follow-up-and-email.md`.

The files are mechanical, checksum-pinned derivatives of the official daily LMS
tables. No WHO value was interpolated, rounded, invented, or substituted.

WHO retains copyright. The data are included for SCCVI's municipal public-health
purpose under the official WHO data terms:
https://www.who.int/about/policies/publishing/data-policy/terms-and-conditions.
Their inclusion does not imply WHO endorsement, and WHO provides the data
without warranty.
