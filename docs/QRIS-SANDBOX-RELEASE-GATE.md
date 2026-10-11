# BADAI PROMPT — QRIS sandbox release gate

## Isolation required before using BuatQRIS test_pay
- Vercel Preview must use a separate Appwrite project/database and test bot, NOT shared production credentials.
- Only use test=1 on BuatQRIS QR creation in Preview.
- Never allow is_test=true callback to grant a production Appwrite membership.
- Verify webhook HMAC signature, then independently confirm provider settlement status and exact transaction/amount.
- Sandbox transaction must remain identifiable as test; keep it out of revenue reporting and live delivery schedules.
- Test link issuance, one-time redemption, recovery of lost/expired links, double callbacks and simultaneous Telegram identities.
- Require explicit test readiness in Preview environment; never run test_pay through the production domain.

## Execution sequence
1. Configure isolated Appwrite Preview project with equivalent schema and restricted service API key.
2. Configure Preview branch env and separate webhook callback URL; verify no production writes.
3. Deploy Preview branch only (not production).
4. Create a test QRIS transaction with test=1, then mark it paid from the authorized BuatQRIS owner session using test_pay.
5. Confirm webhook signature, check provider status, mark test order paid, create test membership and token, and link test Telegram user.
6. Repeat with invalid signature, pending payment, expired token, repeated webhook, and two different Telegram users.
7. Inspect Appwrite Preview records and bot events. Do not promote until end-to-end tests pass.

**Current status:** sandbox run NOT performed; staging credentials and end-to-end QRIS guest checkout integration remain incomplete.
