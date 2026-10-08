# BADAI PROMPT landing page v2

## Scope and baseline

The redesign starts from `a1722edfbb5ab9a0d0b2c6cad87e6ea4df5badb3` on `badai-prompt-v2`, not the older `main` checkout. Only the landing page, its presentation script, a local copy of the same browser SDK, validation scripts and these notes are changed. Member/admin pages, backend functions, database configuration and preview URLs are untouched.

The original landing HTML was 240,123 bytes. It accumulated styles from multiple designs and scripts for removed orbit, infographic and video elements, including HLS/GSAP/ScrollTrigger. A timed full-screen loader delayed seeing the product. The static product preview did not demonstrate opening/copying. Only nine screenshots were in the expandable/readable grid, although 22 existed in the moving rows. The old lightbox did not manage keyboard focus.

## Implemented flow

1. Hero: concise three-line promise, real BP preview images in a product frame; price and product-demo anchors.
2. Member Area: manual/automatic three-step visual tour with original previews and BP numbers. Clearly labelled as a demonstration, not an authenticated application or a fake copied prompt.
3. Updates: slow seamless gallery of original prompt previews, with a one-sentence explanation of updates during active access.
4. One-year access: large 12-month visualization and viewport-triggered progress line.
5. Affiliate: 50% focal point, four-step referral story and qualified terms, without earnings claims.
6. Canva: restrained light bonus card, lock/unlock reveal and the requested qualified wording.
7. Proof: all 22 original WhatsApp screenshots across three alternating rows. Six initially visible grid entries; the other 16 expand on demand. Full-image lightbox, zoom, arrow keys, Escape and focus restoration.
8. Pricing: 199K / 159K / 59K, fixed 59K emphasis, same-access explanation and six benefits. No crossed-out prices, countdown or fabricated urgency.
9. FAQ: six concise objection answers.
10. Final CTA: summary and the existing 59K checkout action.

The page is centered at a maximum content width of 744px. Animation pauses outside the viewport, on page hiding and through the global pause control; sliders also pause on hover/focus. Reduced-motion preferences disable animation. Native controls, focus indicators, labelled checkout and focus containment improve keyboard use. No claim of complete WCAG conformance is made.

## Payment preservation

The inline script beginning `const APPWRITE_ENDPOINT=` is byte-for-byte unchanged from the v2 baseline:

`SHA-256 e3fdee4377028c6d377f254db0e4868a947111502f1c5745d4c7a56db3192bad`

This includes account creation, existing-account errors, public configuration, backend-driven social proof, selected amount validation, QRIS creation, countdown, polling, success activation, automatic login and fallback credentials. The three pricing buttons still call `openCheckout(199000)`, `openCheckout(159000)` and `openCheckout(59000)` directly.

The only checkout changes are visual styles, accessible labels/focus handling, input autocomplete and legal links with explicit `.html` paths for the local static server. Payment behavior is exercised with intercepted API responses, never live orders or new production accounts.

## Validation

Requirements: Node.js, Python 3, Chromium and Playwright (tested with Node 24.19.0 and Playwright 1.62.1). The project itself still has no build step or runtime dependencies for its static server.

```sh
# Start the app manually when desired.
npm start

# Verify/download the 30 real images using system-verified HTTPS.
python3 scripts/verify-landing-assets.py /tmp/badai-assets

# Playwright must be resolvable by Node; dependencies can be installed outside the checkout.
# Example: npm install --prefix /tmp/badai-validation --no-save playwright@1.62.1
# Then set NODE_PATH=/tmp/badai-validation/node_modules if not already available.
ASSET_MANIFEST=/tmp/badai-assets/manifest.json node --test tests/landing.test.cjs
```

The tests start and stop their own local server on port 3199. `TEST_BASE_URL` can select an already-running instance, and `CHROMIUM_PATH` can select a browser. Without `ASSET_MANIFEST`, only the real-image decode test is explicitly skipped. All API writes in tests are mocked and unexpected external destinations fail the tests.

Verified: 16 tests passed, none skipped, at 375 / 390 / 430 / 768 / 1440px. Coverage includes the exact payment-script hash, all three amounts through account → QRIS → automatic poll → login redirect, closed registration, QRIS errors, duplicate accounts, login fallback, focus restoration, anchors, FAQ, tour playback, pause controls, reduced motion, all 22 screenshots and decoding every real image.

Two visual passes inspected the real imagery at mobile and desktop sizes. Refinements corrected desktop hero copy placement, cross-platform vector marks, mobile spacing and small-control sizing. Screenshots and detailed test output are kept in the task's `/workspace/badai-v2-review/` folder.

## Browser/network evidence limits

The environment's HTTPS proxy is trusted by its command-line TLS stack but not Chromium. A request to persistently add that CA to Chromium was rejected by automatic review, so browser TLS trust was not changed. Original images were downloaded over verified HTTPS and their unchanged bytes supplied to the test browser at the original URLs. The manifest stores source URLs, byte counts and SHA-256 hashes. No stock images or invented testimonials were substituted. API fixtures are isolated to the test harness; the deployed page retains real endpoints.

This validates rendered layout and client interactions. It does not claim a real charged payment or an authenticated production member session was tested.
