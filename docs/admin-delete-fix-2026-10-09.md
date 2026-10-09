# Admin deletion fix — 9 October 2026

The admin frontend called `/admin/sales/delete` in `activate-member`, but the active backend deployment `6ac6f94914e8e194e4d3` used source commit `019d310d417e55e06f77c6005234764a7819f93f`, which had no such route. Production executions returned HTTP 404 `Admin route not found`.

The replacement handler requires an admin session, protects admin accounts, verifies the selected order belongs to the member, and preflights related data before deletion. Order-only deletion removes one transaction. Member deletion removes linked orders (including unlinked checkout orders matching the account email), favorites, prompt history, usage events, paid-team access, profile and finally the login account. Another user's orders with the same email are excluded. Missing rows are tolerated for retries; failures stop deletion before the account is removed. Large datasets are paginated without the previous row cap.

The frontend keeps permanent deletion confirmations, prevents repeated requests and modal switching during deletion, restores buttons after either outcome, and distinguishes a successful deletion from a subsequent list-refresh failure.

The active backend was patched from its verified source rather than replacing unrelated activation or password behavior with newer, inactive repository code. Reproduce the deployment archive with `python3 scripts/package-admin-delete-fix.py work/activate-member.tar.gz`; its entrypoint is `src/main.js`, build command `npm install`. New deployment: `6ac8fad9ae172fb04d94`. Team execution permissions and API scopes were preserved. `payment-api` was not changed.

Validation: eight backend tests cover isolated order deletion, member cleanup and ownership, 5,101 history rows, retries, missing tables, authorization, child failures and entrypoint routing. Browser tests at 1280px and 390px cover confirmations, request payloads, pending-state lock, retries, button recovery, and refresh failures. All deletions were simulated. Production smoke tests sent an empty body to `/admin/sales/delete` (HTTP 400 with the expected validation error) and checked `/admin/health` (HTTP 200). No customer data was deleted during verification.

Operational limit: Appwrite executions have a 30-second timeout. If an exceptionally large account exceeds it, re-run the deletion; already deleted rows are skipped and the login account is removed last. Dashboard totals recalculate from retained transactions.
