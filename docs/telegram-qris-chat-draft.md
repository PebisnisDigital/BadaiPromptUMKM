# Telegram in-chat QRIS / buatqris — draft, NOT production-approved

Business decision: BADAI PROMPT website Premium Rp199.000/365 days; Telegram Free prompt every 3 days and deleted by bot after 24 hours; Premium immediately has the published library, with one curated daily prompt. No Telegram Stars integration is imported from PR #4/#6.

## Critical compliance warning
Telegram explicitly requires Stars for selling digital goods inside bots and Mini Apps, regardless of a separately operated website. QRIS issued *inside* this bot for a digital Member Area is NOT compliant with Telegram's published rules. The current branch is for internal technical feasibility and must not be deployed/activated unless product-owner review acknowledges the platform risk. Recommended compliant alternative: independent website checkout with Telegram Login, bot exclusively for free/paid fulfillment.

## Flow in proposed draft
1. User starts bot. Bot records Telegram ID/chat ID.
2. Free prompt includes MAU and 24-hour deletion/3-day wait information.
3. MAU opens mini offer with BELI PREMIUM. Callback is bound to verified user/previous Free delivery.
4. Server checks canonical backend settings: product_price = minimum_price = 199000, merchant active, server feature gate, paid-access writer.
5. Server creates QRIS with existing merchant settings and callback URL. Server records invoice by deterministic transaction hash; no fabricated email/WhatsApp.
6. Telegram sends HTTPS image or PNG data-URI as real chat photo.
7. Signed buatqris webhook updates ONLY matching Telegram invoice transaction, never existing website orders.
8. Existing 15-minute Appwrite scheduler activates verified payments with idempotent transactional invoice/member state and an access ledger; if account already linked and paid-access writer configured, Member Area entitlement is granted.
9. The Telegram member is notified and a first Premium prompt is attempted, and the old Free delete schedule is canceled by existing delivery handler's Premium check.

## Important limitations / blockers
- Checkout gated OFF by default via TELEGRAM_QRIS_ENABLED=false; paid-access capability APPWRITE_PREMIUM_API_KEY must be configured before ready().
- Scheduler runs every 15 minutes; webhook doesn't promise instantaneous confirmation.
- Passwordless Appwrite login is implemented in this draft via `/login` or the verified `BUKA MEMBER AREA` bot callback, hashed one-time token in `telegram_state` (5 minutes), POST `/api/telegram/login`, and Appwrite `users.createToken` -> `account.createSession`. Tokens are in URL fragments, never query strings; backend custom-token redemption is one-time. New Telegram members are provisioned without invented emails. **This has unit tests, but must be tested against real Appwrite Team memberships and browser sessions in an isolated account before public release.**
- Provider QR callback must be checked in a sandbox with exact payload, fees, expiry, and image formats; verify payment.success amount and idempotency.
- Lost QR image response, provider timeout or ambiguous delivery must be handled by manual reconciliation rather than generating a second QR automatically.
- Admin Qris settings UI, test checkout, refund/cancel, reconciliation retries, database schema migration and rollback are still needed.
- Existing PR #3 and #4 are draft; PR #4 has Stars and must NOT be merged into this branch.
- Production configuration, payment data and all existing member entitlements must remain unchanged until approved.

## Acceptance tests before launch
- No QR is created without explicit server feature gate, enabled merchant, non-dry-run bot, linked paid access capabilities and fixed-price settings.
- MAU and BELI callbacks are bound to the correct Telegram ID / Free delivery.
- Repeated click, duplicate provider callback, bad signature, wrong amount, expired QR, partial send, retry and concurrent callback do not double-charge or double-extend access.
- QR must display in Telegram for both HTTPS and base64 provider formats.
- Verified new buyer automatically gets Premium Telegram and secure Member Area access without repeated data entry.
- Existing paid member keeps legacy/lifetime rights; early renewal adds 365 days after current expiry.
- Test Free deletion, Premium retention, one-time welcome and scheduled deliveries, plus browser Admin/Member Area regression.
- Record GO/NO-GO and rollback plan; never broadcast or process real payment during development.

## Passwordless account reconciliation (2026-10-10)
- Telegram login is separately gated by `TELEGRAM_PASSWORDLESS_ENABLED=false`. `APPWRITE_PREMIUM_API_KEY` must include users.read/write and Teams/Rows permissions.
- Users.createToken issues a 180-second session token *after* a single-use Telegram code is atomically claimed. A valid unexpired Premium entitlement and matching member link are required at both issue and exchange time.
- Existing Appwrite users are never linked by guessed email or Telegram username; only a verified one-to-one server link. Existing deterministic `tg-user` IDs that lack previous linkage are refused to prevent takeover.
- The browser never stores a Telegram login code or Appwrite custom token in localStorage. After successful exchange it uses Appwrite account.createSession and redirects to Member Area.
- Passwordless recovery: send `/login` to the same Telegram bot and request a new one-time link. Losing Telegram access needs manual identity verification/support; do not auto-transfer paid subscriptions.
- Critical: QRIS is still **not compliant** for digital services sold inside Telegram; leave payment gate disabled regardless of passing tests.
