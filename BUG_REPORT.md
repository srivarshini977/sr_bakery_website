# SR Bakery Bug Report

## Summary

Full-system QA found three issues during testing. All blocking issues found in the automated pass were fixed.

## Bugs Found And Fixed

### BUG-01: Local QA blocked by rate limiter

- Severity: Medium
- Area: Backend security middleware
- Finding: Repeated localhost QA/API workflows could hit `429 Too many requests`.
- Impact: Test automation and local demos could fail even when app logic worked.
- Fix Applied: Localhost bypass added for non-production environments in `backend/middleware/security.js`.
- Verification: Expanded API smoke suite passed `38/38`.

### BUG-02: Staff could mutate product/admin data

- Severity: High
- Area: Product API permissions
- Finding: Product create/edit/delete/toggle routes allowed `staff`.
- Impact: Staff could change menu/admin data outside their intended workflow.
- Fix Applied: Product mutation routes now require `admin` only in `backend/routes/products.js`.
- Verification: Smoke test confirms staff product mutation returns `403`.

### BUG-03: External Google Maps iframe failed in restricted/local browser QA

- Severity: Low
- Area: Footer UI
- Finding: Google Maps iframe generated failed external browser request in offline/restricted environments.
- Impact: Browser QA showed failed request; local demo could show noisy network errors.
- Fix Applied: Replaced iframe with stable location card and `Open in Maps` link in `frontend/src/components/Footer.jsx`.
- Verification: Browser QA passed `11/11` with no failed requests.

## Non-Blocking Observations

- Vite build reports a large bundle warning because charts, animation, and app code are bundled together.
- This is not a functional failure.
- Future optimization: add route-level code splitting for admin dashboard and chart-heavy pages.

## Current Known Issues

No blocking functional, security, or browser QA failures remain from the completed automated pass.
