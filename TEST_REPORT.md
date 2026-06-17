# SR Bakery Test Report

Date: 2026-06-17
Environment: Local frontend, local backend, MongoDB Atlas `sr_bakery`

## Startup And Build

- Backend startup: Passed
- MongoDB Atlas connection: Passed
- Backend health check: Passed, about 80 ms in final smoke run
- Frontend dev server: Passed
- Frontend production build: Passed
- Frontend lint: Passed with warnings

## API Smoke Test

Command:

```bash
node scripts/qa_smoke_test.mjs
```

Result: 40/40 passed.

Covered:

- Health check
- Admin login
- Staff logins
- Invalid login rejection
- Customer signup/login/JWT
- Customer/staff/admin role protection
- Product create/edit/toggle/delete
- Menu product loading
- Checkout order creation
- Chef KOT visibility and KOT updates
- Order lifecycle through delivered
- Review authorization and rating range
- Notifications
- Inventory create/edit/delete
- Contact submit/read/unread/delete
- Analytics endpoint
- PDF/Excel report exports
- QA cleanup

## Browser Route And Responsive Test

Command:

```bash
node run.js C:\tmp\sr-playwright-qa.js
```

Result: 64/64 passed.

Covered:

- Routes: `/`, `/about`, `/menu`, `/offers`, `/gallery`, `/contact`, `/login`, `/signup`, `/cart`, `/checkout`, `/track`
- Refresh behavior for public routes
- Protected checkout redirect
- Scroll-to-top on navigation
- Responsive widths: 320, 375, 425, 768, 1024, 1440, 1920
- Admin dashboard load
- Admin access to staff dashboard
- Staff dashboard load
- Staff blocked from admin page
- Browser console errors
- Failed browser requests

## Database Audit

Atlas collections verified:

- products: 70
- inventories: 152
- users: 12
- orders: 6
- invoices: 3
- kots: 3
- notifications: 57
- vendors: 2
- settings: 1

Indexes are present on key collections such as users, invoices, KOTs, products, settings, coupons, and reviews.

## Not Fully Verified

- Real Razorpay Checkout popup and live payment capture
- Large dataset performance under production load
- Email/SMS delivery for password reset and notifications
- Production deployment environment variables and domain/CORS settings
