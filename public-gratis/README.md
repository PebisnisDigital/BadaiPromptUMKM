# PROMPTIONAL GRATIS — Dynamic Appwrite sync (Live)
 
Public site: https://promptional-gratis.vercel.app
Vercel project ID: prj_wrGs15SJlBwVoV1j8JzK7TFNQGiq
Main PROMPTIONAL site (separate, UNTOUCHED): https://promptional.vercel.app

## Status as of 2026-10-14
- **All BP001–BP185** were explicitly authorized by the owner for free/public use without login.
- Root / renders the searchable 185-prompt catalog.
- /c/demo-rose/p/BP033 or /c/demo-noir/p/BP185 renders a full prompt, current image, and SALIN PROMPT.
- Every HTML page is rendered server-side with Appwrite data. **No browser fetch to Appwrite/API**.
- Server function source: `api/page.js` (one Vercel serverless function).
- Project deploy source is currently managed through the Vercel API with inline files, *not auto-synced with GitHub*. The GitHub copy is source-of-truth for subsequent controlled code changes. `index.html` in this folder is an archived static backup, NOT the live renderer.
- Existing BP links remain unchanged. No connection with Instagram or Repliz.
- Production main PROMPTIONAL is NOT affected.

## Updating content
1. Log in to existing PROMPTIONAL Admin and edit scene_prompts in Appwrite (title BPxxx stays the same, is_published true).
2. Save the row. The next non-cached page request reads fresh content from Appwrite, without deploying Vercel again.
3. Vercel's CDN uses Cache-Control public, s-maxage=60, stale-while-revalidate=60. Allow ~1–2 minutes for normal cache expiration/revalidation; occasionally a little longer depending on CDN/browser caching.
4. Check /c/demo-rose/p/BPxxx again, preferably in a fresh/incognito tab.

## Security and boundaries
- API key env **APPWRITE_RO_KEY**, scoped to **rows.read** only, installed server-side on the **promptional-gratis** Vercel project for production+preview. Never copy its value to the frontend, GitHub, sheets or chat.
- The function explicitly allows only BP001–BP185 and only published rows. It renders safe HTML-escaped text and does not reveal a disabled prompt.
- Brand examples demo-rose/demo-noir retain distinct names/colors; checkout URL remains OFF.
- All prompt text is intentionally available to public visitors by owner's approval. Noindex does not prevent sharing.
- If Appwrite is unavailable, the server displays a user-friendly 503 message without leaking secrets; once Appwrite returns, the site works normally. No "Failed to fetch" in browser.
- Changing prompt codes beyond BP185, or adding additional brands/checkout, requires new explicit access policy and code updates.
- The update does not send DMs, publish Instagram posts, alter checkout, modify the main PROMPTIONAL app, or merge PRs.

## Tests
- GitHub Actions: Public prompt sync checks
- `node --test tests/public-gratis-sync.test.cjs` for mocked update propagation, XSS, 404 fail-closed and 185 catalog links.
- Preview deployment and production smoke tests: /, /c/demo-rose/p/BP001, /c/demo-rose/p/BP033, /c/demo-noir/p/BP185, invalid BP186.
