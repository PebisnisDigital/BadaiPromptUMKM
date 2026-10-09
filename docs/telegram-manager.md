# Telegram Manager — implementation and release review

Prepared 9 October 2026 (WIB). Work branch: `feature/telegram-manager-20261009`. No production branch merge, frontend production deployment, active Function switch, real Telegram send, or customer deletion was performed for this task.

## Audit and baseline

GitHub `main` is `86bb681`; the frontend actually serving production came from `d85e766` on `fix/badai-motion`. This feature branch starts from that deployed frontend to preserve the existing member/admin improvements. A PR to `main` therefore includes the earlier deployed frontend changes as well. Reconcile this baseline before merging; do not deploy an older `main` checkout over the running site.

The active `activate-member` deployment is `6ac8fad9ae172fb04d94`, based on `019d310` plus the previous deletion fix. The active `payment-api` deployment is `6ac6fb7200126b22072d`, from `86bb681`. Their source was reconciled into this branch before adding Telegram. The BuatQRIS checkout portion of `payment-api`, the website checkout, and `api/buatqris-webhook.js` retain the verified production implementation. The payment Function receives only an annual-term calculation for admin activation and read-only profile permissions for newly created profiles. Existing profile data/permissions were not changed.

The three existing Telegram tables were empty. Their column/index statuses were available and permissions were `[]`, with row security off: browser users have no direct access. `telegram_bots.webhook_secret` had `encrypt:false` and there was no token column. All new token/secret writes use authenticated AES-256-GCM ciphertext with a random nonce and bot-specific additional authenticated data. Plaintext old values are refused, never silently accepted. There were no existing bot secrets to migrate.

## Files

- `api/telegram/{manager,link,webhook}.js`: protected admin/member endpoints and a separate secret-verified webhook.
- `functions/activate-member/src/telegram/{security,auth,policy,store,transport,service,delivery,runtime,renewal}.mjs`: encryption, verified identity, schedule/rights policy, Appwrite persistence, Telegram API, account linking, delivery, and transactional annual renewal.
- `functions/activate-member/src/main.js`: existing activation/expiry retained; scheduled Telegram worker gated by `TELEGRAM_ENABLED`; persisted payment events rechecked; renewal and issued flag committed together.
- `functions/payment-api/src/{main.js,access-policy.mjs}`: active checkout source preserved, annual default for new manual activations, lifetime/remaining term retained for existing members, browser write permission omitted on new member profiles.
- `admin.html`, `assets/telegram-manager.{css,js}`: standalone Telegram navigation, bot manager, testing center, settings, pause/resume and actual database statistics.
- `member.html`, `assets/telegram-member.js`: one-use Telegram linking from a verified logged-in session.
- `docs/telegram-schema.json`, `.env.example`, Function `.env.example`: additive schema and configuration contract.
- `tests/telegram.test.mjs`, `tests/fixtures/telegram-memory.mjs`, `scripts/verify-telegram-ui.cjs`, `.github/workflows/telegram-checks.yml`: automated checks without real Telegram/customer mutations. SDKs and Playwright are pinned and locked.

## Database applied

All changes use `badai_prompt_umkm`. No main database, project or Function was added.

- `telegram_bots`: `token_cipher`, `webhook_url`, `webhook_checked_at`, `last_error`.
- `telegram_deliveries`: `bot_id`, `chat_id`, `message_ids`, `dispatch_status`, `error_code`, `retry_at`, `kind`, `attempts`; existing enum columns were preserved.
- One server-only `telegram_state` table: `kind`, `bot_id`, `telegram_id`, `user_id`, `status`, `due_at`, `payload`. Stores settings, consent per bot, account linking claims, testers, idempotency/rate claims, cursors and audit records.
- Eleven added indexes: three state indexes; four delivery indexes; four member indexes for plan/active status/expiry/account linkage. All reported available after creation. Existing unique bot/user/delivery indexes retained.

The manifest is additive. Do not recreate tables or replace their permissions. Temporary state expires through bounded cleanup batches; customer membership and delivery history remain.

## Implemented behavior

Admin actions verify an Appwrite JWT with `Account.get`, then require confirmed `admin-users` membership using the server SDK. A caller-supplied `x-appwrite-user-id` is not used to authorize these new endpoints. Linking similarly verifies the real account session. Premium requires an active authoritative website profile and confirmed `paid-members` access. Telegram never creates an Appwrite login or grants website rights from `/premium`.

Token saving calls official `getMe`, stores Bot ID/name/username and ciphertext, and omits token and webhook secret from responses. Connection and webhook checks store real timestamps. Switching validates the bot, installs its webhook without dropping pending updates, counts per-bot START consent, then requires an expiring confirmation bound to the admin. Only the `main_bot_id` setting controls automatic delivery. Standby consent and subscriptions are preserved. Deleting a configuration with delivery history is refused so its messages can still be cleaned up; disable it instead.

Commands `/start`, `/prompt`, `/premium`, `/status`, `/bantuan` operate in private chats with verified numeric identities. The webhook checks Telegram's secret header and deduplicates `update_id`. Linking tokens expire after 10 minutes, are one-use, and enforce a one-to-one website/Telegram association. Free registration receives its first prompt when live sending is enabled; subsequent prompts follow three-day intervals. Published prompts are selected with a per-member cursor; previews and complete escaped copyable text are sent, with long text split within Telegram limits. All Message IDs are stored.

Premium follows the website term, normally 365 days. Renewal before expiry adds exactly 365 days to the previous expiry. Existing active profiles without an expiry retain their previous unlimited rights; these are explicitly treated as legacy access, not converted automatically. Premium suggestions follow the daily 06:00 WIB schedule. Expired profiles stop premium delivery and access through the existing expiry worker. Renewal notices are deduplicated per term within seven days of expiry.

Free prompt parts are all scheduled for deletion after 24 hours; premium prompts have no auto-delete. Pause stops sending but permits due free-message cleanup in live mode. Dry-run sends/deletes nothing. The 15-minute scheduler has up to 15 minutes of scheduling tolerance plus batch backlog. Small batches, cursor paging and a 20-second worker budget preserve the existing 30-second Function limit. Telegram 429 retries are bounded; uncertain network results or partial sends are held for review rather than replayed. A completed send with an interrupted member-progress update reconciles without resending.

Tests require explicitly authorized tester consent on the selected bot. Test deletion accepts only that bot/tester's test delivery. Statistics query actual database totals; no simulated values ship in production code. Recent member/prompt pickers are bounded to 50 and errors to 20 to limit free-tier reads.

## Checks performed

- `npm test`: 40/40 backend checks pass (32 Telegram/security/scheduling/renewal checks plus 8 deletion regression checks).
- `npm run test:telegram-ui`: passes at 1280, 390 and 320 px; actual-data rendering, token clearing, JWT request, connection/error recovery, switch confirmation and test deletion. Member linking and QRIS account/create/poll flows at Rp59,000/Rp159,000/Rp199,000 also pass with mocked APIs.
- Existing workspace UI checks pass at 1280/390/320 px for member browsing, copying, favorites, login, admin prompt editing, sales and settings; existing admin-deletion UI checks pass.
- Checkout HTML and QRIS relay compare byte-for-byte with the deployed frontend baseline. Payment checkout routes after `getConfig` compare byte-for-byte with the active `86bb681` backend.
- An empty Appwrite transaction was created and rolled back successfully; no rows changed. This confirms transaction API availability, not a live paid-order test.
- Syntax and whitespace checks pass. No live bot credentials were available, so Telegram `getMe`, send, delete, and switch behavior were exercised with controlled API doubles.

`tests/landing.test.cjs` is an older suite for a different landing-page revision: it expects a previous script hash, section layout and a removed `agreeTerms` checkbox. An exploratory run failed those stale assertions and was stopped. It was not changed or presented as passing. The current checkout is covered by the new regression smoke test above. This old suite should be reconciled as a separate baseline-cleanup step before requiring it in CI.

## Secrets and current activation status

Prepared through connectors without writing values to GitHub or chat:

- Appwrite server key `telegram-manager-server`, limited to `tables.read`, `rows.read`, `rows.write`, `teams.read`.
- Vercel sensitive `APPWRITE_API_KEY` and `TELEGRAM_MASTER_KEY` for preview/production.
- Matching Appwrite `activate-member` secret `TELEGRAM_MASTER_KEY`.

`TELEGRAM_ENABLED` and `TELEGRAM_SEND_ENABLED` default to false, and saved settings default to disabled/paused/dry-run. Do not rotate the master key on just one service. Keep it in the owner's secret manager; rotation requires decrypting and re-encrypting stored bot configurations before changing both runtimes.

No bot token has been submitted, no webhook installed, and no automation activated. The owner should enter the bot token only into the deployed authenticated Telegram Manager password field; do not send it through chat or commit an `.env` file. Telegram Stars checkout is intentionally not implemented; `/premium` explains membership/account linking and does not offer QRIS inside Telegram.

## Safe deployment gate

1. Review the PR and reconcile `main` with the already-deployed frontend baseline. Keep a copy of active deployment IDs for rollback. Run CI and the current checkout/UI checks.
2. Verify the additive schema remains available and server-only. Verify the server key scopes and matching master-key secrets, without revealing values.
3. Build inactive Appwrite archives containing each Function's package/lock and complete `src/` tree. Use `src/main.js`, `npm ci`, Node 22. Preserve Function permissions/events/scopes and the `*/15 * * * *` schedule; do not create a third Function. The activation archive includes all Telegram modules.
4. In a controlled release, activate the reviewed Function versions and publish the same reviewed frontend/API revision to the existing Vercel project. Keep Telegram sending disabled. Smoke-test existing checkout, authorized member access, and admin operations before changing any Telegram flags. For a preview, add its exact hostname as an Appwrite web platform before testing browser login.
5. Enable only `TELEGRAM_ENABLED=true` on `activate-member` for the paused/dry worker. Verify scheduled execution retains expiry behavior. When explicitly testing messages, set `TELEGRAM_SEND_ENABLED=true` consistently on Vercel and the Function while automation stays disabled/paused/dry-run.
6. Save `@BadaiPromptBot` via the authenticated admin form; verify its official identity. Use one owner/test account that has STARTed the bot, authorize it, then test message, published preview/text, and delete. Install/check the production webhook and test a real START/link flow. Check renewals/expiry against controlled test accounts; no customer data deletion is needed.
7. Only after those real integration checks, choose the main bot, save live settings, enable automatic delivery and resume. Monitor error/uncertain rows and Telegram blocking/rate limits.

Inactive Appwrite build artifacts passed: `activate-member` deployment `6ac911a8a36dea1c9e6c`, `payment-api` deployment `6ac911aab855c7d0be9a`. They were uploaded with `activate:false` and have not replaced the active deployments. Rebuild if source changes.

Production release remains gated on real bot tests, owner bot-token entry, and release review. Telegram does not provide an exactly-once send API; ambiguous sends require manual review. Existing members' legacy unlimited dates and large delivery backlog need operational review before broad rollout.
