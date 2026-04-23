# Payload Official Verification Flow Implementation Plan

**Goal:** Finish the auth changes so the product follows Payload's official verification flow: verified users log in normally, unverified users cannot log in and are redirected to `/verify/pending`, registration lands on `/verify/pending`, resend verification only appears on verification pages, password minimum is 8 characters, and auth emails use trusted request-origin-first links.

**Architecture:** Keep Payload as the sole auth/session authority. Do not create any limited or project-owned auth session. Use thin Next.js wrappers only to normalize Payload responses for the frontend, preserve Payload `Set-Cookie` semantics, and route users into verification-specific pages.

**Tech Stack:** Payload CMS 3.x, Next.js App Router, TypeScript, Vitest, Playwright, Cloudflare Workers

---

## File Map

- Modify: `docs/superpowers/specs/2026-04-23-unverified-user-flow-design.md`
- Modify: `src/app/api/auth/login/route.ts`
- Modify: `src/app/api/auth/_lib/frontendAuth.ts`
- Modify: `src/app/(frontend)/components/auth/LoginForm.tsx`
- Modify: `src/app/(frontend)/components/auth/RegisterForm.tsx`
- Modify: `src/app/(frontend)/verify/pending/page.tsx`
- Modify: `src/app/(frontend)/verify/page.tsx`
- Modify: `src/app/(frontend)/user/me/page.tsx`
- Modify: `tests/e2e/frontend.e2e.spec.ts`

### Task 1: Rewrite The Stale Spec To Match The Agreed Payload Flow

**Files:**
- Modify: `docs/superpowers/specs/2026-04-23-unverified-user-flow-design.md`
- Modify: `docs/superpowers/plans/2026-04-23-unverified-user-flow.md`

- [ ] Replace all limited-session and `/user/me`-as-verification-surface language with the official Payload flow:
  - unverified users cannot log in
  - registration succeeds and lands on `/verify/pending`
  - resend verification is only exposed on verification pages
  - `/user/me` requires a verified session
- [ ] Update testing expectations in the spec and plan so they match the official flow, including the missing E2E for unverified login.

### Task 2: Keep The Runtime Flow Aligned With Payload

**Files:**
- Verify: `src/app/api/auth/login/route.ts`
- Verify: `src/app/api/auth/_lib/frontendAuth.ts`
- Verify: `src/app/(frontend)/components/auth/LoginForm.tsx`
- Verify: `src/app/(frontend)/components/auth/RegisterForm.tsx`
- Verify: `src/app/(frontend)/verify/pending/page.tsx`
- Verify: `src/app/(frontend)/verify/page.tsx`
- Verify: `src/app/(frontend)/user/me/page.tsx`

- [ ] Confirm login returns `email_verification_required` and a verification-page location for unverified users.
- [ ] Confirm `/user/me` requires `requireVerified: true`.
- [ ] Confirm login and registration screens do not render resend-verification links.
- [ ] Confirm resend-verification remains available on verification pages.

### Task 3: Add The Missing Playwright Regression For Unverified Login

**Files:**
- Modify: `tests/e2e/frontend.e2e.spec.ts`

- [ ] Add a browser test that:
  - creates an unverified user
  - attempts login through the real login form
  - asserts the browser is redirected to `/verify/pending?email=...&next=...`
  - asserts the user does not land on `/user/me`
- [ ] Keep cleanup explicit by deleting the seeded unverified user after the test.

### Task 4: Verification

**Files:**
- Verify only: `tests/e2e/frontend.e2e.spec.ts`
- Verify only: current focused auth/frontend files

- [ ] Run the targeted Playwright file if the local test environment is available:

```bash
pnpm exec playwright test --config=playwright.config.ts tests/e2e/frontend.e2e.spec.ts
```

Expected: PASS

- [ ] If Playwright cannot run in the current environment, document that clearly and leave the E2E added but unexecuted.
