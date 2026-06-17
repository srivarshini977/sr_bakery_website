# SR Bakery Security Report

Date: 2026-06-17

## Passed

- Customer cannot access admin user APIs.
- Customer cannot access staff APIs.
- Staff cannot access admin user APIs.
- Staff cannot access frontend admin page.
- Chef cannot access billing order APIs and is restricted to KOT workflow.
- Passwords are hashed with bcrypt before save.
- JWT authentication is required for protected API routes.
- JWT hardcoded fallback was removed from auth modules.
- Real `.env` files are ignored by Git.
- Git scan did not find Atlas or Razorpay real secrets in tracked source files.

## Findings Fixed

- JWT modules previously had a hardcoded fallback secret. Fixed by requiring `JWT_SECRET` from environment.
- dotenv loading was made explicit in auth modules so static import order does not bypass `.env`.

## Remaining Security Risks

- Backend startup currently logs the full MongoDB URI, including credentials. Mask this before deployment.
- Razorpay routes still use mock order/payment IDs in parts of the backend.
- Password reset uses an in-memory mock reset code flow and returns the code in API response. This is acceptable for demo only, not production.
- CORS is configured as `origin: '*'`; production should restrict this to the deployed frontend domain.
- Admin/staff default passwords are documented in `backend/README.md`; rotate credentials before any public deployment.

## Security Readiness

- College/demo readiness: Good
- Real production readiness: Not yet, mainly due to logging, CORS, reset-code, default-password, and payment hardening requirements.
