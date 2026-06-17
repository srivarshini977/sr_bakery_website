# SR Bakery Performance Report

Date: 2026-06-17

## Measured Results

- Backend health check: about 80 ms in final API smoke run.
- Frontend production build: Passed.
- Browser route suite: 64/64 passed without failed requests.
- Responsive overflow checks: Passed at 320, 375, 425, 768, 1024, 1440, and 1920 px.

## Build Output

Vite build passed with one warning:

- Main JS bundle is about 1,026 kB before gzip and about 286 kB gzip.
- Vite warns when chunks exceed 500 kB after minification.

## Performance Risks

- Admin dashboard loads many modules in the main bundle. Code splitting dashboards and charts would reduce first load.
- Product/gallery image assets are large. Add image compression and thumbnails for production.
- Real large-dataset load testing was not performed.
- API pagination should be added for orders, products, invoices, notifications, and admin tables before production.

## Recommendation

Performance is acceptable for a college project, placement demo, hackathon demo, and portfolio showcase. For real bakery production, optimize bundle splitting, image delivery, pagination, and caching.
