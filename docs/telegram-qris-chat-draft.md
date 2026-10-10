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
- First-time Telegram buyers do not yet have secure passwordless Appwrite website sessions. Do not activate checkout until Telegram identity-to-Appwrite account creation/login and recovery are verified end-to-end. NEVER fabricate email identities.
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
