# Website-only BADAI PROMPT — Telegram login + QRIS

## Policy and scope
An independent website purchase at https://badaiprompt.vercel.app. Do not wire the bot's digital-goods purchase callback to external QRIS. Sales inside the Telegram bot require Stars.

## Implementation as of 10 October 2026
- Website Login OIDC code + PKCE: api/website-login.js. Single-use state, server-side token exchange, signed Telegram RS256 JWT + JWKS, short-lived secure cookies.
- Website QRIS backend: api/website-checkout.js. Independent provider invoices in telegram_state, one-invoice-per-buyer protections, provider status verification, signature-verified callback, premium Appwrite account/team/profile activation, website session token.
- Frontend: beli-premium.html. BELI, verified Telegram identity, QRIS, polling, premium confirmation, Appwrite custom-session login. Existing LP email/WA checkout stays available until rollout flag enabled.
- Optional consent-based bot website purchase confirmation after verified Premium activation.
- Unit and Playwright simulated tests included. No real payment made.

## All changes gated OFF by default
- TELEGRAM_WEBSITE_LOGIN_ENABLED=false
- TELEGRAM_SITE_CHECKOUT_ENABLED=false
- TELEGRAM_WEBSITE_PAID_NOTICE_ENABLED=false
Existing production payment flow continues unchanged without these flags.

## BotFather owner setup
1. Open @BotFather → @BadaiPromptBot → Login Widget or Web Login.
2. Register the allowed origin https://badaiprompt.vercel.app and callback https://badaiprompt.vercel.app/api/website-login.
3. Obtain numeric Client ID and secret, and set in Vercel environment variables TELEGRAM_OIDC_CLIENT_ID and TELEGRAM_OIDC_CLIENT_SECRET. Do not paste secrets into chat.
4. Redeploy, then enable TELEGRAM_WEBSITE_LOGIN_ENABLED only for controlled auth QA. Keep TELEGRAM_SITE_CHECKOUT_ENABLED and TELEGRAM_WEBSITE_PAID_NOTICE_ENABLED OFF.

## Security
- Telegram ID in URL or bot callback is not enough; server requires signed OIDC identity.
- Website-current tracks active provider transaction. Failures or uncertain provider creation block duplicate invoices pending manual review.
- BuatQRIS webhook signature is checked, and provider status checked again for the known transaction ID.
- Paid Appwrite entitlement derives only from verified paid order, with no fabricated email or WhatsApp. Existing unlinked email accounts must be linked explicitly, never silently merged.
- Browser gets an Appwrite custom token only after backend activation; Telegram bot notification requires START consent and confirmed Premium.
- Website notifications are best-effort and idempotent, not yet guaranteed to retry indefinitely.

## Not yet verified live
- Actual BotFather allowed URLs and ID/secret are missing from Vercel project.
- Real OIDC consent exchange, merchant sandbox transaction, paid membership for email-less accounts, webhook retries, end-to-end website session and bot receipt.
- Current BuatQRIS merchant configuration is in live mode (test_mode:false). Arrange an authorized test method rather than making a real payment during development.

Never enable the no-form website checkout until the end-to-end smoke test passes. Sources: https://core.telegram.org/bots/telegram-login and https://appwrite.io/docs/products/auth/custom-token
