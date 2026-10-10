# Admin MARKETING: 365-day Free Telegram Campaign Calendar

## What is new
- Admin tab MARKETING, separate from Telegram bot configuration, inspired by the supplied 365-day rotation calendar screenshot.
- Global WIB marketing calendar with 365 drag-and-drop days; optional loop after Day 365.
- Library selector reads existing published, image-backed prompt cards from scene_prompts and prompts. The server rechecks published status, preview and fingerprint before sending.
- Reorder or swap slots, mobile alternative: select prompt and tap the target day.
- Every slot has editable upsell text sent AFTER image+prompt and an inline CTA (buy/upgrade Premium, Member Area, or HTTPS URL on the official BADAI PROMPT domain only).
- CTA opens independent BADAI PROMPT website checkout, not an inline QRIS invoice. Telegram's payment policies still matter for promotional bot messages.
- Configure campaign date, WIB send time for future Free sends, default copy, CTA defaults, optional 365-day repeat, and an OFF-by-default delivery toggle.
- Free receives scheduled content ONLY when due at the existing every-three-days interval; Premium keeps its separate daily distribution. Empty global days skip without random fallback. Free 24-hour deletion remains as configured in Telegram Manager.
- Original prompt is referenced, not overwritten. Upselling is a separate Telegram message after original prompt and included in the Free 24-hour deletion batch.

## Technical protections
- Every action requires team-admin JWT via existing /api/telegram/manager rate-limited API.
- Storage reuses telegram_state: kind marketing_slot/status scheduled, slot key telegram-marketing-NNN; settings at telegram-marketing-settings. No new DB table or automatic data changes on deploy.
- TELEGRAM_MARKETING_ENABLED=false by default. Saving slots or settings cannot trigger broadcasts.
- Actual activation also requires healthy sender, Telegram bot selection and manual enable after QA.
- Test a Free delivery with media, prompt, upsell, CTA, 24h deletion, and a Premium subscriber not receiving the Free campaign.
- Existing 29 curated Premium slots in telegram_state remain separate under telegram-content-NNN.
- This is stacked on Draft PR #7/#8, which include a separate disabled in-bot QRIS prototype. Do not merge without parent audit. For compliant production, extract only Marketing features onto a clean approved baseline.

## Scheduling semantics
- Date numbering is global, Asia/Jakarta. If start date is Oct 10, Oct 11 is Day 2.
- With a three-day Free cadence, a particular user sees only dates when their own delivery is due (not 365 daily messages). Different Free members may receive different calendar days.
- After Day 365, default stops; optional loop repeats slot numbers, but per-member deduplication may prevent already received prompts being sent again.
- Changes to today/past days do not change old Telegram messages. Time 06:00 is an approximate target; the scheduler polls about every 15 minutes.
- The independent LP Premium price stays Rp199,000/365 days.
