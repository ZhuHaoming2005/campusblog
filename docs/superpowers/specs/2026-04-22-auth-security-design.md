# Auth And Security Design

**Goal**

Upgrade the current frontend login and registration flow into a complete, secure authentication system built on Payload's official auth capabilities, with required email verification, password reset, Cloudflare Email Service delivery, KV-backed rate limiting, and safer frontend auth APIs.

**Scope**

- `src/payload.config.ts`
- `src/collections/Users.ts`
- Frontend auth pages and components under `src/app/(frontend)`
- New frontend auth API routes under `src/app/api`
- Cloudflare runtime configuration in `wrangler.jsonc` and env docs
- Integration and E2E tests covering auth flows and security boundaries

**Current Problems**

- Frontend registration currently posts directly to `POST /api/users`, which bypasses project-specific validation, rate limiting, and consistent response handling.
- Frontend registration auto-logs the user in immediately, which conflicts with the new requirement that users must verify email before they can sign in.
- The current `Users` auth setup does not explicitly enable Payload email verification, forgot-password flow customization, login lockout tuning, or project-specific email templates.
- Auth endpoints and profile/editor flows rely on session presence but do not yet centralize active-account checks, unverified-account handling, or structured auth logging.
- There is no dedicated debug mode for transactional auth emails, making local development and delivery troubleshooting expensive.

**Chosen Approach**

- Use Payload as the auth system of record.
  - Keep Payload responsible for user auth data, verification tokens, password reset tokens, auth cookies, and login attempt lockout.
- Add a thin project-owned frontend auth API layer.
  - Route frontend auth actions through project endpoints that validate input, enforce rate limits, normalize errors, and call Payload auth operations.
- Add a custom Payload `email` adapter backed by Cloudflare Email Service.
  - Follow Payload's official email integration path by configuring the `email` property in `payload.config.ts`.
- Use Cloudflare KV to accelerate request throttling and short-lived auth workflow state.
  - KV will back rate limiting counters and cooldown windows for high-frequency auth operations.

**Architecture**

1. Payload auth core
- `Users` remains the only auth collection.
- Enable `auth.verify` so email verification tokens and verification handling remain inside Payload's official auth system.
- Configure `auth.forgotPassword` so password reset tokens and expiration also stay inside Payload.
- Configure `maxLoginAttempts` and `lockTime` explicitly on the auth collection.

2. Frontend auth API layer
- Introduce project routes under `src/app/api/auth`:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/verify-email`
  - `POST /api/auth/resend-verification`
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/reset-password`
- These routes will be the only frontend-facing auth entrypoints.
- They will call Payload operations or the Payload REST auth endpoints and normalize all user-visible behavior.

3. Email delivery layer
- Add a lightweight custom Payload email adapter that sends email through Cloudflare Email Service.
- The adapter will support:
  - auth verification emails
  - forgot-password emails
  - future transactional auth notifications
- The adapter will accept HTML and text content from Payload and translate it into the Cloudflare Email Service request body.

4. KV-backed acceleration layer
- Use the existing `KV` binding for auth throttling and lightweight workflow caches.
- Store short-lived counters keyed by hashed dimensions such as:
  - login by normalized email + IP
  - register by IP
  - forgot-password by normalized email + IP
  - resend-verification by normalized email + IP
- Optionally store short-lived debug metadata for development-only inspection of the most recent auth emails.

**Behavior**

**Registration**

- Frontend registration submits to `POST /api/auth/register`.
- The route validates:
  - display name presence and length
  - email normalization and syntax
  - password minimum strength rules
  - safe `next` path handling
- The route enforces KV-backed rate limiting before touching Payload.
- The route creates the user through a server-side Payload Local API path with curated defaults:
  - default role remains `user`
  - `isActive` defaults to `true`
  - email verification required
- Success response does not sign the user into the full application.
- The user is redirected to a verification-pending screen that explains next steps and offers resend verification.

**Login**

- Frontend login submits to `POST /api/auth/login`.
- The route enforces KV-backed rate limiting before calling Payload.
- Payload remains responsible for core login attempt accounting and lockout.
- The route adds project-specific checks after auth:
  - block users whose email is not verified
  - block users whose `isActive` is `false`
- Login failures return normalized messages that do not leak whether the email exists.
- Verified and active users receive the normal auth cookie and redirect to a sanitized `next` target.

**Email Verification**

- Verification emails are generated through Payload `auth.verify`.
- Verification links target the frontend route backed by `GET /api/auth/verify-email`.
- After successful verification:
  - the user sees a confirmation page
  - the UI offers a path to login or continue to the sanitized `next` target
- Invalid or expired verification tokens render a safe retry state with resend verification access.

**Resend Verification**

- `POST /api/auth/resend-verification` accepts an email address.
- The route uses a generic success response regardless of whether the email exists, to avoid enumeration.
- KV enforces a short cooldown to prevent abuse.
- If the account exists, is active, and is still unverified, the route triggers Payload to send another verification email.

**Forgot Password**

- `POST /api/auth/forgot-password` accepts an email address.
- The route always returns a generic success response.
- KV limits request bursts by email and IP.
- If the account exists and is eligible, Payload sends the reset-password email.

**Reset Password**

- `POST /api/auth/reset-password` accepts the reset token and new password.
- The route validates password strength before submitting to Payload.
- Success redirects the user back to login.
- Failure returns a normalized invalid-or-expired-token response.

**Profile And Author Flows**

- Existing authenticated profile and editor flows remain server-protected.
- Any auth-sensitive frontend action that depends on a current user should additionally respect the account's verified and active status.
- Author-facing pages should treat "signed in but not verified" as an incomplete auth state and redirect to the verification-pending experience when needed.

**Payload Changes**

**`src/collections/Users.ts`**

- Replace `auth: true` with structured auth config.
- Enable:
  - `verify`
  - `forgotPassword`
  - `maxLoginAttempts`
  - `lockTime`
- Customize auth emails:
  - `verify.generateEmailSubject`
  - `verify.generateEmailHTML`
  - forgot-password email subject/body equivalents
- Preserve existing roles and admin restrictions.
- Remove public collection create access so direct `POST /api/users` registration is no longer allowed from the frontend.
- Allow new user creation only through the project-owned registration route, which uses server-side Local API with explicit field whitelisting.

**`src/payload.config.ts`**

- Add `email` configuration using the custom Cloudflare adapter.
- Add auth-related environment-derived configuration:
  - app base URL
  - default from name
  - default from address
  - debug mode flags
- Add explicit CSRF allow-listing for expected frontend origins.

**Frontend Pages**

- Keep `/login` and `/register`, but change their submit targets to the new frontend auth API.
- Add pages for:
  - verification pending
  - verification result
  - forgot password
  - reset password
- Add entry points from login/register pages:
  - "Forgot password?"
  - "Resend verification email"

**Email Adapter Design**

- Create a small adapter module under `src/lib` or `src/email`.
- The adapter will:
  - accept Payload email args
  - construct the Cloudflare Email Service request
  - call the REST API with the configured API token and account ID
  - return normalized delivery metadata
- It will support both HTML and text bodies.
- It will fail loudly in production for missing configuration.
- It will support a debug mode in local development and optionally in non-production environments.

**Email Debugging**

- Add a debug mode controlled by environment variables.
- In debug mode:
  - the adapter logs a structured, redacted record for every auth email
  - local development may skip real delivery and log the rendered verification/reset URL
  - the most recent debug records can be written into KV with a short TTL for inspection
- Debug records include:
  - template type
  - recipient
  - subject
  - masked token preview
  - destination URL
  - Cloudflare request status or skip reason
- Production debug logging must never emit full tokens or raw password-reset URLs into long-lived logs.

**KV Strategy**

- Use KV for fast, low-write-complexity controls around auth traffic, not as the source of truth for identity.
- Use the Cloudflare `KV` binding for auth throttling and debug caches, not the internal `payload_kv` table.
- Proposed KV key families:
  - `auth:rate:register:<ip-hash>`
  - `auth:rate:login:<email-hash>:<ip-hash>`
  - `auth:rate:forgot-password:<email-hash>:<ip-hash>`
  - `auth:rate:resend-verification:<email-hash>:<ip-hash>`
  - `auth:debug-email:<id>`
- Values store compact JSON with count, window start, and last-seen timestamps.
- TTLs remain short and operation-specific.
- Hash normalized email and IP before using them in keys to avoid plain-text sensitive data in KV namespaces.

**Validation And Security Rules**

- Normalize email to lowercase and trim whitespace before all auth operations.
- Keep using `sanitizeNextPath` / `maybeSanitizeNextPath` and extend if needed for new auth pages.
- Use uniform success messages for forgot-password and resend-verification to prevent account enumeration.
- Keep error messages for login generic enough that email existence is not revealed.
- Validate password strength server-side, not only in the client.
- Keep the profile update and editor APIs behind authenticated checks and review them for active/verified account enforcement.
- Add structured auth logging for:
  - registration attempts
  - rate-limit denials
  - login denials due to unverified or inactive accounts
  - email delivery failures
- Do not log raw passwords, raw verification tokens, or raw reset tokens.

**Testing**

- Add failing tests first, then implement.
- Integration coverage should include:
  - register succeeds and returns verification-pending state
  - unverified user cannot complete login
  - verified active user can login
  - resend verification returns generic success
  - forgot-password returns generic success
  - reset-password succeeds with valid token and fails safely with invalid token
  - rate limiting blocks repeated requests
  - debug mode logs or stores email metadata without leaking full tokens
- E2E coverage should include:
  - registration now lands on verification-pending flow instead of auto-login
  - login with unverified account shows the expected blocked state
  - verified account can enter `/user/me`
  - forgot-password and reset-password happy path
- Run `tsc --noEmit` before completion.

**Operational Requirements**

- Add required env/binding documentation for:
  - Cloudflare Email Service account ID
  - Cloudflare Email Service API token
  - default from address
  - app public base URL
  - email debug mode flag
- Extend `wrangler.jsonc` documentation and types if additional vars are required.
- Keep local development safe by default:
  - debug mode on
  - real delivery off unless explicitly enabled

**Out Of Scope**

- Replacing Payload's auth cookies with a custom session system
- Building multi-factor authentication
- Building admin-managed invitation-only registration
- Replacing Cloudflare KV with Durable Objects or D1 for rate limiting in this pass
- Building a full email analytics dashboard beyond basic debug logs
