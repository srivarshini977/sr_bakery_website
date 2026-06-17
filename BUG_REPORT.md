# SR Bakery Bug Report

Date: 2026-06-17

## Fixed During QA

1. Missing Gallery route
   - Symptom: `/gallery` loaded the 404 page and failed refresh testing.
   - Fix: Added `frontend/src/pages/Gallery.jsx`, registered `/gallery`, and added Gallery to the navbar.
   - Status: Fixed and verified by Playwright.

2. Route scroll restoration
   - Symptom: Navigating from a scrolled page opened the next route at the old scroll position.
   - Fix: Added `frontend/src/components/ScrollToTop.jsx` and mounted it inside the router.
   - Status: Fixed and verified by Playwright.

3. Empty image `src` console error
   - Symptom: React warned when placeholder/blank product images rendered as `<img src="">`.
   - Fix: Added conditional image fallbacks in Gallery, Admin Image Upload, and Master Management previews.
   - Status: Fixed and verified by Playwright console checks.

4. Chef QA flow mismatch
   - Symptom: Smoke test expected chefs to update billing orders, but the app correctly restricts chefs to KOTs.
   - Fix: Updated `scripts/qa_smoke_test.mjs` to verify KOT access and KOT status changes.
   - Status: Fixed. API smoke test passes 40/40.

5. JWT hardcoded fallback
   - Symptom: JWT modules could use a hardcoded fallback because dotenv was loaded after static imports.
   - Fix: Loaded dotenv in auth modules and removed hardcoded JWT fallback.
   - Status: Fixed and verified after backend restart.

## Remaining Warnings

- Frontend lint passes with 21 warnings for unused variables, empty catch blocks, and React hook dependency cleanup.
- Vite production build passes but warns that the main JS chunk is larger than 500 kB.
- Razorpay remains mock/simulated in backend routes; real Razorpay Checkout popup flow is not fully implemented in the customer checkout UI.
- Some backend startup logs print the full MongoDB URI. This should be masked before real production deployment.

## Current Bug Status

No blocking bugs found in the verified demo flows after fixes.
