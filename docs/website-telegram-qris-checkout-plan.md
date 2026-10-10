# BADAI PROMPT — Independent Website QRIS with Telegram Confirmation

## Intent & compliance boundary
Implement **website-first** sales originating independently at `https://badaiprompt.vercel.app`. This is not a Telegram Mini App, an in-bot third-party payment, or a workaround for Telegram's digital-goods Stars policy. Do not convert the Telegram bot's in-chat offer into an external QRIS transaction for in-Telegram digital sales. Purchases inside Telegram require Stars.

Website UI may say **BELI PREMIUM** while internally starting authentication, but the customer must see and approve any Telegram identity consent required on the first purchase.

## Status, 2026-10-10
- DONE (draft only): `telegram/web-identity.mjs` verifies **legacy widget** HMAC signatures with a strict five-minute timestamp, data whitelist, and Telegram ID validation. Not an OAuth/OIDC verifier.
- DONE (draft only): `telegram/website-purchase-notice.mjs` can notify a **previously linked** Telegram account once the existing website order worker has verified an order and granted paid access. It sends nothing without send permission, active bot, START consent, and Premium status. It is idempotent per order.
- DONE (draft only): production event-worker hook behind `TELEGRAM_WEBSITE_PAID_NOTICE_ENABLED=true`; remains disabled if unset.
- NOT DONE: Telegram Login setup at BotFather, site-specific OAuth/OIDC endpoint, no-form QRIS create & order persistence, verified identity→Appwrite custom session, complete payment→account activation for email-less buyers, live callback and delivery QA.
- Existing production checkout remains **name + email + WhatsApp**. Do NOT bypass its validation using placeholder email addresses, guessed phone numbers, or unsigned Telegram query IDs.

## Prerequisite requiring owner action
For the currently supported official Telegram Web Login flow, open **@BotFather → bot @BadaiPromptBot → Login Widget**. Register `https://badaiprompt.vercel.app` and the future exact callback `https://badaiprompt.vercel.app/api/telegram/website-callback` under allowed URLs. Keep Client Secret private in Vercel environment variables; do not paste it into chat.

Modern Telegram Login uses OpenID Connect. Build Authorization Code + PKCE on the backend, validate ID token against Telegram JWKS, exact audience, issuer, expiry, nonce/state, and enforce one-time state. Legacy HMAC verifier above applies only to older Login Widget callbacks.

## Release milestones
1. Site **BELI PREMIUM** button initializes consent as needed and resumes checkout for an authenticated Telegram session; if login is already valid, skip consent UI.
2. Server creates or resolves a **single verified account mapping** (Telegram ID ↔ Appwrite user ID) and protects account-merge situations. No fabricated email or WhatsApp. Existing email-based accounts require the owner to authenticate once to link, not silently overwrite.
3. Add dedicated order records with Telegram user ID and Appwrite user ID, transaction ID, amount = IDR 199000, callback signature verification, unique provider transaction and replay-proof order state. Reuse existing BuatQRIS merchant configuration; do not create duplicate charges on API timeouts.
4. Show QRIS only on the independent website. Notify pending status without falsely indicating payment success.
5. On authenticated BuatQRIS webhook + independent status verification, grant **365-day** Appwrite entitlement atomically and idempotently. Ensure member_profiles and paid-members eligibility are both valid before success screen. Support returning Premium customers and existing legacy paid access without reducing rights.
6. Issue secure, short-lived Appwrite website session after buyer clicks BELI (requires verified identity); browser lands directly in Member Area when payment confirmed.
7. If buyer opted into messaging and STARTed @BadaiPromptBot, send **separate informational confirmation** (not an invoice) with a Member Area link, once per paid website order.
8. Test webhook replay, failed/pending/expired, duplicate checkout click, revoked Telegram consent, wrong token, existing Appwrite membership conflicts, disconnect/reconnect, and live zero-value provider test mode where supported. Only then turn on the server flag and deploy.

## Current baseline observations
- `functions/payment-api/src/main.js:createPayment` currently rejects missing full_name, email, and whatsapp and creates QRIS orders through BuatQRIS, with a signed webhook.
- `functions/activate-member/src/main.js` activates successful paid orders using the **email** from the order, not Telegram ID; it only syncs an already-linked member and does not currently send confirmation.
- Migrating to login-free checkout requires an independent user-bound order flow; replacing a button label alone is insufficient.
- Telegram notification helper introduced in this draft is not an authorization source; it may never create an entitlement or alter payment status.

## Required release bar
No website auto-QRIS or Telegram confirmation should be described as live until provider test order, Appwrite entitlement, website session, bot receipt, and deletion/retry semantics have each been verified end-to-end. Production flags stay OFF meanwhile.
