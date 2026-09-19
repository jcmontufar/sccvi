# ADR-008 — Email and Telegram notifications

## Status

Accepted — 2026-09-19

## Decision

SCCVI delivers through one `NotificationDispatcher` and a channel-checked
provider registry. Implemented adapters are Resend (`EMAIL`) and Telegram Bot
API (`TELEGRAM`). The guardian's single preference selects exactly one eligible
channel; no fallback or simultaneous delivery occurs. Alerts for missed
follow-up and overdue vaccination, campaigns and the existing scheduled alert
job use this same boundary.

Each pending notification is claimed atomically through `deliveryClaimedAt`
before provider I/O. Campaign recipient/channel remains the campaign identity.
Operational alerts also enforce one notification per alert/guardian across
channels, so changing a preference cannot deliver the same alert twice.

## Telegram identity

Authorized center staff generate a 256-bit random deep-link token. Only its
SHA-256 digest is stored. It expires after 15 minutes, is single-use, revokes a
previous active token and is limited to three generations per guardian per
hour. The authenticated private-chat webhook consumes the token and obtains the
chat ID from Telegram; forms never accept a chat ID. `/stop` and the authorized
guardian screen revoke the connection. SCCVI stores no Telegram username,
personal name, phone number or photo.

## Provider callbacks and configuration

Resend callbacks are verified with the provider SDK and correlate through the
indexed `providerMessageId`. Delivered email remains `SENT`; bounced, failed or
suppressed email becomes `FAILED`. Telegram callbacks require the configured
secret-token header. Secrets are server-only and staging validation accepts
each provider only when its configuration group is complete.

Required variables are documented in `.env.example`. Provider setup, webhook
registration and live delivery verification are manual staging operations and
are not performed by this change.
