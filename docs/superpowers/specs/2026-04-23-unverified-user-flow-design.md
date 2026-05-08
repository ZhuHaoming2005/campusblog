# Payload Official Verification Flow Design

**Status**

- This spec replaces the earlier unverified-session design.
- The current target is the standard Payload verification flow only.
- Any design that gives unverified users a usable session, allows `/user/me` before verification, or moves verification recovery into the user center is explicitly out of scope.

**Goal**

Keep the product aligned with Payload's recommended auth behavior:

- registration creates the user and sends a verification email
- unverified users cannot complete login
- verification recovery is handled only on verification-specific pages
- verified-only pages continue to require a verified Payload session
- password creation and reset require a minimum of 8 characters
- auth email action links prefer the active trusted request origin in development

**Source Of Truth**

- Payload remains the source of truth for:
  - users
  - verification state
  - verification tokens
  - auth cookies
  - login lockout
  - password reset session issuance
- Next.js auth routes are thin wrappers only. They may normalize response shapes for the frontend, but they must not replace Payload's auth semantics.

**Core User Flow**

**Registration**

- `POST /api/auth/register` creates the `users` record through Payload.
- Payload's configured verify-email pipeline sends the verification email.
- Successful registration is treated as `verification_pending`, not as a logged-in session.
- The frontend redirects to `/verify/pending?email=...&next=...`.

**Login**

- Verified users log in through Payload's normal login flow and receive the normal Payload auth cookie.
- Unverified users do not receive a session.
- When Payload reports an unverified login attempt, the frontend login route returns:
  - HTTP `403`
  - code `email_verification_required`
  - a `location` pointing to `/verify/pending?email=...&next=...`
- Login must preserve Payload lockout behavior and must not collapse locked accounts into generic invalid credentials.

**Verification Recovery**

- `/verify/pending` is the only primary resend-verification surface.
- `/verify` displays verification success or verification failure results.
- Login and registration screens do not expose resend-verification entrypoints.
- The user center does not act as a verification recovery surface.

**Protected Frontend Access**

- `/user/me` requires a verified authenticated session.
- `/editor` and other verified-only routes also require a verified authenticated session.
- Unverified users are treated like logged-out users for frontend access because they do not receive a Payload session.

**Password Rules**

- Registration requires a minimum password length of 8 characters.
- Reset-password uses the same minimum password length of 8 characters.
- There is no extra uppercase/lowercase/digit composition rule.

**Auth Email Links**

- Verification and reset-password links prefer a trusted origin derived from the active request.
- If the request origin is missing or untrusted, link generation falls back to `NEXT_PUBLIC_SITE_URL`.
- This must keep local development links usable without weakening host validation.

**Route Expectations**

**`POST /api/auth/register`**

- Uses Payload create on the `users` collection.
- Relies on Payload verify-email configuration for email generation and delivery.
- Returns success as `verification_pending`.

**`POST /api/auth/login`**

- Preserves Payload success cookies for verified login.
- Maps unverified login failures to `email_verification_required`.
- Preserves lockout semantics.

**`POST /api/auth/resend-verification`**

- Reuses the existing `_verificationToken` when available.
- Generates a new `_verificationToken` only when one does not exist.
- Returns an enumeration-safe success shape.

**`POST /api/auth/reset-password`**

- Proxies or forwards Payload reset-password behavior.
- Preserves Payload `Set-Cookie` semantics.
- Does not replace Payload's session issuance with local custom logic.

**`GET /api/auth/verify-email`**

- Calls Payload verification.
- Redirects into the frontend verification result page.
- Preserves sanitized `next`.

**Security Constraints**

- No project-owned auth cookie is introduced.
- No reduced or limited session is introduced for unverified users.
- Public resend-verification remains enumeration-safe.
- Local API calls that pass `user` must continue to set `overrideAccess: false`.
- Unverified users must never gain `/user/me`, editor, author, or other verified-only access.

**UI Constraints**

- Login and registration remain focused on authentication only.
- Verification resend stays on verification-specific pages.
- Password reset continues to use the existing forgot-password and reset-password flow.
- User-center profile actions may link into the existing password reset flow, but must not create a parallel custom password-change backend.

**Testing Requirements**

- Integration tests must cover:
  - verified login preserving Payload cookies
  - unverified login returning `email_verification_required`
  - locked login preserving lockout semantics
  - resend-verification token reuse
  - reset-password cookie forwarding
- Frontend tests must cover:
  - login and registration screens not rendering resend-verification links
  - verification pages rendering resend-verification entrypoints
  - password reset and verification flows using the expected endpoints
- E2E must cover:
  - registration landing on `/verify/pending`
  - unverified login redirecting to `/verify/pending?email=...&next=...`
  - unverified login not reaching `/user/me`
  - resend-verification preserving `next`
  - verify-email success returning the user to the login flow
  - forgot-password and reset-password end to end

**Out Of Scope**

- Admin auth redesign
- Pre-registration staging records
- Limited sessions for unverified users
- Moving verification recovery into the user center
- Replacing the Cloudflare email adapter
