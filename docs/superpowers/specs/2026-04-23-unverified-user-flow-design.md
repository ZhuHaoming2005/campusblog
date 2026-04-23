# Unverified User Flow Design

**Goal**

Adjust the current auth UX so unverified users keep a valid Payload login session but are treated like guests everywhere except the user center, remove resend-verification entrypoints from login and registration screens, lower password requirements to a minimum of 8 characters, and fix development-time verification links so the emailed URL verifies successfully against the active local origin.

**Scope**

- `src/app/(frontend)/components/auth/LoginForm.tsx`
- `src/app/(frontend)/components/auth/RegisterForm.tsx`
- `src/app/(frontend)/user/me/page.tsx`
- `src/app/(frontend)/verify/pending/page.tsx`
- `src/app/(frontend)/verify/page.tsx`
- `src/app/(frontend)/lib/frontendSession.ts`
- `src/app/api/auth/_lib/authInput.ts`
- `src/app/api/auth/_lib/frontendAuth.ts`
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/resend-verification/route.ts`
- `src/app/api/auth/verify-email/route.ts`
- `src/email/authEmailTemplates.ts`
- auth-related locale files and focused auth tests

**Current Problems**

- Login and registration screens still advertise resend verification directly, which encourages an auth-screen recovery path that the product no longer wants.
- Unverified users are currently redirected away from `/user/me`, which prevents the user center from acting as the canonical place to explain verification status and trigger resend.
- Frontend auth gating currently treats unverified users as fully blocked from any authenticated user surface, instead of preserving a limited logged-in state.
- Password validation requires strong-password rules with a 12-character minimum, which is stricter than the new requirement.
- Verification emails are generated from `NEXT_PUBLIC_SITE_URL`, so development links can point at the wrong host or origin and fail when clicked locally.

**Chosen Approach**

- Keep Payload as the source of truth for login sessions, verification tokens, and verification state.
- Model an unverified account as a limited frontend session state rather than as a failed login.
- Centralize all unverified-user behavior in the shared frontend auth gate and the user center instead of scattering resend actions across login/register/verify pages.
- Generate auth action URLs from the live request origin when available, with environment fallback only when request context is missing.

**Behavior**

**Unverified Session Model**

- Unverified users can log in successfully and retain the Payload auth cookie.
- Outside the user center, unverified users are treated like guests for product behavior and visible navigation.
- The existence of a session does not grant verified-only capabilities such as editor access or verified-user redirects.
- The frontend auth layer remains responsible only for capability checks and redirects; Payload still owns login state.
- When the product needs to actively guide an unverified user somewhere, the canonical destination is `/user/me`, because that is the only surface that exposes the resend-verification action.

**Global UI**

- Global navigation and other non-user-center public surfaces should render the same affordances shown to guests when the current user exists but `_verified === false`.
- This means unverified users do not get the normal authenticated shortcut experience outside `/user/me`.
- The limited-session rule applies to server-rendered navigation, page-level redirects, and any helper that turns the current user into display state for public UI.

**User Center**

- `/user/me` remains authentication-protected but no longer requires verification.
- If the current user is unverified, the page shows a prominent verification status panel near the top of the page.
- That panel includes:
  - a short explanation that the email address must be verified
  - the current account email
  - a button or form action that posts to `POST /api/auth/resend-verification`
- Verified users do not see this panel.
- Unverified users can still view the user center and manage baseline account information there.
- Authoring actions exposed from the user center, such as “Write article”, must remain unavailable or redirected through verified-only gating.

**Login And Registration Screens**

- Remove resend-verification links from the login form.
- Remove resend-verification links from the registration form.
- Login continues to recognize Payload’s unverified-account response, but the recovery destination becomes `/user/me` rather than an auth-screen resend flow.
- Registration success may still land on `/verify/pending` once as a post-registration instruction screen.
- `/verify/pending` remains a valid deep link, but it is no longer promoted from login or registration UI.

**Frontend Capability Gates**

- `requireFrontendAuth(...)` will distinguish between:
  - authentication required
  - verification required for a specific capability
  - author access required
- `/user/me` will request authentication only.
- `/editor` and author-facing APIs will continue to require both a verified user and author access where relevant.
- When an unverified user reaches a verified-only route, the gate should not turn that user into a generic authenticated success. It should return a failure that the caller can translate into guest-like behavior or redirect.
- For protected author routes, unverified users should be redirected to `/user/me` so the verification prompt is reachable immediately.
- For public-facing behavior and navigation, the response should remain equivalent to how the product handles a guest, while still preserving the actual underlying session cookie.

**Password Validation**

- Registration passwords must require a minimum length of 8 characters.
- Reset-password submissions must use the same minimum length of 8 characters.
- Uppercase, lowercase, and numeric composition requirements are removed unless another existing business rule still depends on them.
- Validation copy and tests must be updated to match the new requirement exactly.

**Verification Email Links**

- Auth action URLs used in verification and reset emails must prefer the active request origin when a request context is available.
- The request-origin priority order is:
  1. the current request’s origin derived from the route handling the auth action
  2. an explicit origin from a locally created Payload request object
  3. `NEXT_PUBLIC_SITE_URL` as a final fallback
- This keeps production links stable while making local development links point back to the actual local host that generated the email.
- Verification and reset-password flows must share the same URL-origin logic so dev behavior stays consistent.

**Route-Level Changes**

**`POST /api/auth/login`**

- Preserve the current fix for Payload verification and lockout semantics.
- Continue normalizing `403` unverified failures into the project error code.
- Do not add resend-verification UI coupling back into login responses.

**`POST /api/auth/register`**

- Keep using Payload’s built-in verification email pipeline.
- Update input validation to accept passwords with a minimum length of 8.

**`POST /api/auth/resend-verification`**

- Keep reusing the existing `_verificationToken` when present.
- This route becomes the user-center-owned verification recovery path.
- The response contract stays generic to avoid account enumeration.

**`GET /api/auth/verify-email`**

- Keep redirecting to the frontend verification result page.
- The primary bug fix is not in verification itself, but in generating the correct frontend verification URL in the email.

**Data And Security Constraints**

- Public pages must not leak whether an account exists or whether a resend target was valid.
- Unverified users must not gain editor or author APIs.
- The user center resend action must only trigger email sending through the existing generic-response route.
- No new auth state should be persisted outside Payload’s own verification fields and session cookie.

**Testing**

- Update login and registration component tests to assert resend-verification links are gone.
- Add or update user-center tests to assert:
  - authenticated unverified users can access `/user/me`
  - the verification warning panel is present
  - the resend-verification action is rendered there
- Update frontend auth-gate tests so:
  - `/user/me` passes for unverified authenticated users
  - verified-only routes still fail for unverified users
- Update auth-input tests for the 8-character minimum and removal of composition requirements.
- Add or update email-template tests so auth URLs prefer request origin in development-like contexts.
- Update E2E auth coverage so unverified users are treated like guests outside the user center and can resend verification from `/user/me`.

**Implementation Notes**

- Prefer adapting existing helpers such as `getCurrentFrontendUser`, `requireFrontendAuth`, and `readAuthNextPathFromReq` instead of introducing new auth-state abstractions.
- Keep the UI change set narrow: remove resend links from auth forms, add one verification panel to the user center, and avoid inventing a second verification-management surface.
- Reuse the existing resend-verification route rather than creating a new user-center-specific endpoint.

**Out Of Scope**

- Changing Payload Admin auth behavior
- Reworking registration success messaging beyond the removal of auth-screen resend links
- Adding a brand-new email-template system or replacing the current Cloudflare adapter
