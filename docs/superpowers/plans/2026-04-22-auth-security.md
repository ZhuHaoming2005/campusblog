# Auth And Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a complete frontend auth system with required email verification, password reset, Cloudflare Email Service delivery, KV-backed throttling, and safer Payload-backed auth boundaries.

**Architecture:** Keep Payload as the source of truth for auth state, verification tokens, reset tokens, cookies, and lockouts. Put a thin Next.js auth layer in front of it for validation, throttling, normalized responses, and author-access semantics; use a custom Payload email adapter that prefers the Cloudflare Workers `send_email` binding and only uses redacted debug logs.

**Tech Stack:** Payload CMS 3.x, Next.js App Router, Cloudflare Workers, Cloudflare KV, Cloudflare Email Service, TypeScript, Vitest, Playwright

---

## File Map

- Create: `src/email/cloudflareEmailAdapter.ts`
- Create: `src/email/emailDebug.ts`
- Create: `src/app/api/auth/_lib/authInput.ts`
- Create: `src/app/api/auth/_lib/authRateLimit.ts`
- Create: `src/app/api/auth/_lib/authResponses.ts`
- Create: `src/app/api/auth/_lib/frontendAuth.ts`
- Create: `src/app/api/auth/register/route.ts`
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/app/api/auth/verify-email/route.ts`
- Create: `src/app/api/auth/resend-verification/route.ts`
- Create: `src/app/api/auth/forgot-password/route.ts`
- Create: `src/app/api/auth/reset-password/route.ts`
- Create: `src/app/(frontend)/verify/pending/page.tsx`
- Create: `src/app/(frontend)/verify/page.tsx`
- Create: `src/app/(frontend)/forgot-password/page.tsx`
- Create: `src/app/(frontend)/reset-password/page.tsx`
- Modify: `src/payload.config.ts`
- Modify: `src/collections/Users.ts`
- Modify: `src/app/(frontend)/components/auth/LoginForm.tsx`
- Modify: `src/app/(frontend)/components/auth/RegisterForm.tsx`
- Modify: `src/app/(frontend)/components/auth/AuthExperience.tsx`
- Modify: `src/app/(frontend)/login/page.tsx`
- Modify: `src/app/(frontend)/register/page.tsx`
- Modify: `src/app/(frontend)/lib/frontendSession.ts`
- Modify: `src/app/(frontend)/editor/page.tsx`
- Modify: `src/app/(frontend)/user/me/page.tsx`
- Modify: `src/app/api/editor/posts/route.ts`
- Modify: `src/app/api/editor/posts/[id]/route.ts`
- Modify: `src/app/(frontend)/locales/zh-CN.json`
- Modify: `src/app/(frontend)/locales/en-US.json`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `wrangler.jsonc`
- Modify: `cloudflare-env.d.ts`
- Modify: `src/payload-types.ts`
- Create: `tests/int/email/cloudflareEmailAdapter.int.spec.ts`
- Create: `tests/int/api/auth/authInput.int.spec.ts`
- Create: `tests/int/api/auth/authRateLimit.int.spec.ts`
- Create: `tests/int/api/auth/frontendAuth.int.spec.ts`
- Create: `tests/int/api/auth/registerRoute.int.spec.ts`
- Create: `tests/int/api/auth/loginRoute.int.spec.ts`
- Create: `tests/int/api/auth/passwordRoutes.int.spec.ts`
- Create: `tests/int/frontend/verificationPages.int.spec.tsx`
- Modify: `tests/e2e/frontend.e2e.spec.ts`

### Task 1: Add the Cloudflare Email Service adapter and safe debug logging

**Files:**
- Create: `tests/int/email/cloudflareEmailAdapter.int.spec.ts`
- Create: `src/email/cloudflareEmailAdapter.ts`
- Create: `src/email/emailDebug.ts`
- Modify: `src/payload.config.ts`
- Modify: `wrangler.jsonc`
- Modify: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Write the failing adapter test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const sendMock = vi.fn()
const putMock = vi.fn()

describe('cloudflareEmailAdapter', () => {
  beforeEach(() => {
    sendMock.mockReset()
    putMock.mockReset()
  })

  it('prefers the Workers send_email binding and stores only redacted debug metadata', async () => {
    const { createCloudflareEmailAdapter } = await import('@/email/cloudflareEmailAdapter')

    const adapter = createCloudflareEmailAdapter({
      debug: true,
      defaultFromAddress: 'noreply@campusblog.net',
      defaultFromName: 'CampusBlog',
      emailBinding: { send: sendMock } as never,
      kv: { put: putMock } as never,
    })

    sendMock.mockResolvedValue({ messageId: 'cf-msg-1' })

    await adapter.sendEmail({
      html: '<p>verify</p>',
      subject: 'Verify your email',
      text: 'verify',
      to: 'user@example.com',
    })

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'noreply@campusblog.net',
        html: '<p>verify</p>',
        subject: 'Verify your email',
        to: 'user@example.com',
      }),
    )
    expect(putMock).toHaveBeenCalledWith(
      expect.stringMatching(/^auth:debug-email:/),
      expect.not.stringContaining('token='),
      expect.objectContaining({ expirationTtl: 900 }),
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/email/cloudflareEmailAdapter.int.spec.ts`
Expected: FAIL because the adapter module does not exist yet.

- [ ] **Step 3: Write the minimal debug helper**

```ts
export function redactDebugURL(value: string | null | undefined): string | null {
  if (!value) return null

  try {
    const url = new URL(value)
    for (const key of ['token', 'verificationToken']) {
      if (url.searchParams.has(key)) {
        const raw = url.searchParams.get(key) ?? ''
        const masked = raw.length <= 8 ? '[redacted]' : `${raw.slice(0, 4)}...[redacted]`
        url.searchParams.set(key, masked)
      }
    }
    return url.toString()
  } catch {
    return '[invalid-url]'
  }
}

export async function writeEmailDebugRecord(args: {
  kv?: { put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<unknown> }
  payload: {
    destinationURL?: string | null
    subject: string
    templateType: string
    to: string
  }
}) {
  const body = JSON.stringify({
    destinationURL: redactDebugURL(args.payload.destinationURL),
    subject: args.payload.subject,
    templateType: args.payload.templateType,
    to: args.payload.to,
  })

  if (args.kv) {
    await args.kv.put(`auth:debug-email:${Date.now().toString(36)}`, body, {
      expirationTtl: 900,
    })
  }
}
```

- [ ] **Step 4: Write the minimal adapter implementation**

```ts
import { writeEmailDebugRecord } from './emailDebug'

type EmailBinding = {
  send: (message: {
    from: string
    html?: string
    subject: string
    text?: string
    to: string
  }) => Promise<{ messageId?: string }>
}

export function createCloudflareEmailAdapter(args: {
  debug: boolean
  defaultFromAddress: string
  defaultFromName: string
  emailBinding?: EmailBinding
  kv?: { put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<unknown> }
}) {
  return {
    defaultFromAddress: args.defaultFromAddress,
    defaultFromName: args.defaultFromName,
    name: 'cloudflare-email-service',
    async sendEmail(message: {
      html?: string
      subject: string
      text?: string
      to: string
    }) {
      if (!args.emailBinding) {
        throw new Error('Cloudflare send_email binding is required')
      }

      const result = await args.emailBinding.send({
        from: args.defaultFromAddress,
        html: message.html,
        subject: message.subject,
        text: message.text,
        to: message.to,
      })

      if (args.debug) {
        await writeEmailDebugRecord({
          kv: args.kv,
          payload: {
            destinationURL: null,
            subject: message.subject,
            templateType: message.subject.includes('Reset') ? 'reset-password' : 'verify-email',
            to: message.to,
          },
        })
      }

      return result
    },
  }
}
```

```ts
// payload.config.ts
import { createCloudflareEmailAdapter } from './email/cloudflareEmailAdapter'

email: createCloudflareEmailAdapter({
  debug: process.env.AUTH_EMAIL_DEBUG === 'true',
  defaultFromAddress: process.env.AUTH_EMAIL_FROM_ADDRESS || '',
  defaultFromName: process.env.AUTH_EMAIL_FROM_NAME || 'CampusBlog',
  emailBinding: cloudflare.env.EMAIL,
  kv: cloudflare.env.KV,
}),
```

```jsonc
// wrangler.jsonc
"send_email": [
  {
    "name": "EMAIL",
    "remote": true
  }
],
```

```env
AUTH_EMAIL_FROM_ADDRESS=
AUTH_EMAIL_FROM_NAME=CampusBlog
AUTH_EMAIL_DEBUG=true
```

- [ ] **Step 5: Run the adapter test to verify it passes**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/email/cloudflareEmailAdapter.int.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add tests/int/email/cloudflareEmailAdapter.int.spec.ts src/email/cloudflareEmailAdapter.ts src/email/emailDebug.ts src/payload.config.ts wrangler.jsonc .env.example README.md
git commit -m "feat: add cloudflare email adapter"
```

### Task 2: Harden the Users auth collection and regenerate Payload types

**Files:**
- Create: `tests/int/api/auth/usersCollection.int.spec.ts`
- Modify: `src/collections/Users.ts`
- Modify: `src/payload-types.ts`
- Modify: `cloudflare-env.d.ts`

- [ ] **Step 1: Write the failing collection-config test**

```ts
import { describe, expect, it } from 'vitest'
import { Users } from '@/collections/Users'

describe('Users auth config', () => {
  it('requires verification, lockout, and closed public create access', () => {
    expect(Users.auth).toEqual(
      expect.objectContaining({
        lockTime: expect.any(Number),
        maxLoginAttempts: expect.any(Number),
        verify: expect.any(Object),
      }),
    )
    expect(Users.access?.create?.({ req: { user: null } } as never)).not.toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/api/auth/usersCollection.int.spec.ts`
Expected: FAIL because `Users.auth` is currently `true` and `create` is still public.

- [ ] **Step 3: Write the minimal collection implementation**

```ts
auth: {
  forgotPassword: {
    expiration: 1000 * 60 * 60,
    generateEmailHTML: ({ req, token, user }) => {
      const baseURL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      const url = `${baseURL}/reset-password?token=${encodeURIComponent(token)}`
      return `<p>${user.email}</p><p><a href="${url}">Reset your password</a></p>`
    },
  },
  lockTime: 1000 * 60 * 15,
  maxLoginAttempts: 5,
  verify: {
    generateEmailHTML: ({ token, user }) => {
      const baseURL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      const url = `${baseURL}/verify?token=${encodeURIComponent(token)}`
      return `<p>${user.email}</p><p><a href="${url}">Verify your email</a></p>`
    },
  },
},
access: {
  read: adminOrSelf,
  create: ({ req: { user } }) => hasAdminRole(user),
  update: adminOrSelf,
  delete: adminOnly,
},
```

```ts
admin: {
  // ...
},
// keep isActive semantics tied to author access
```

- [ ] **Step 4: Run the collection test again**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/api/auth/usersCollection.int.spec.ts`
Expected: PASS

- [ ] **Step 5: Regenerate generated auth types**

Run: `pnpm run generate:types`
Expected: PASS and updated `src/payload-types.ts` plus `cloudflare-env.d.ts` if bindings changed.

- [ ] **Step 6: Commit**

```bash
git add tests/int/api/auth/usersCollection.int.spec.ts src/collections/Users.ts src/payload-types.ts cloudflare-env.d.ts
git commit -m "feat: harden users auth config"
```

### Task 3: Add shared auth input validation and KV-backed best-effort throttling

**Files:**
- Create: `tests/int/api/auth/authInput.int.spec.ts`
- Create: `tests/int/api/auth/authRateLimit.int.spec.ts`
- Create: `src/app/api/auth/_lib/authInput.ts`
- Create: `src/app/api/auth/_lib/authRateLimit.ts`
- Create: `src/app/api/auth/_lib/authResponses.ts`

- [ ] **Step 1: Write the failing auth-input test**

```ts
import { describe, expect, it } from 'vitest'
import { normalizeAuthEmail, validatePasswordStrength } from '@/app/api/auth/_lib/authInput'

describe('authInput', () => {
  it('normalizes emails and rejects weak passwords', () => {
    expect(normalizeAuthEmail('  USER@Example.COM ')).toBe('user@example.com')
    expect(() => validatePasswordStrength('short')).toThrow('Password must be at least 12 characters long')
  })
})
```

- [ ] **Step 2: Run input test to verify it fails**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/api/auth/authInput.int.spec.ts`
Expected: FAIL because the input module does not exist.

- [ ] **Step 3: Write the minimal input helpers**

```ts
export function normalizeAuthEmail(value: string) {
  return value.trim().toLowerCase()
}

export function validatePasswordStrength(password: string) {
  if (password.length < 12) {
    throw new Error('Password must be at least 12 characters long')
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    throw new Error('Password must include upper, lower, and numeric characters')
  }
}
```

- [ ] **Step 4: Write the failing rate-limit test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getMock = vi.fn()
const putMock = vi.fn()

describe('authRateLimit', () => {
  beforeEach(() => {
    getMock.mockReset()
    putMock.mockReset()
  })

  it('uses KV as a best-effort cooldown window instead of a strong lock source', async () => {
    const { enforceBestEffortThrottle } = await import('@/app/api/auth/_lib/authRateLimit')

    getMock.mockResolvedValueOnce(JSON.stringify({ count: 2, windowStart: 1000 }))

    await expect(
      enforceBestEffortThrottle({
        ipHash: 'ip',
        keyPrefix: 'auth:rate:login',
        kv: { get: getMock, put: putMock } as never,
        limit: 2,
        now: 2000,
        windowMs: 60_000,
      }),
    ).rejects.toThrow('Too many requests')
  })
})
```

- [ ] **Step 5: Run rate-limit test to verify it fails**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/api/auth/authRateLimit.int.spec.ts`
Expected: FAIL because the rate-limit module does not exist.

- [ ] **Step 6: Write the minimal throttle helper**

```ts
export async function enforceBestEffortThrottle(args: {
  ipHash: string
  keyPrefix: string
  kv?: {
    get: (key: string) => Promise<string | null>
    put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<unknown>
  }
  limit: number
  now?: number
  windowMs: number
}) {
  if (!args.kv) return

  const now = args.now ?? Date.now()
  const key = `${args.keyPrefix}:${args.ipHash}`
  const record = JSON.parse((await args.kv.get(key)) ?? '{"count":0,"windowStart":0}') as {
    count: number
    windowStart: number
  }

  const inWindow = now - record.windowStart < args.windowMs
  const next = inWindow ? { count: record.count + 1, windowStart: record.windowStart } : { count: 1, windowStart: now }

  if (inWindow && record.count >= args.limit) {
    throw new Error('Too many requests')
  }

  await args.kv.put(key, JSON.stringify(next), {
    expirationTtl: Math.ceil(args.windowMs / 1000),
  })
}
```

- [ ] **Step 7: Run both tests to verify they pass**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/api/auth/authInput.int.spec.ts tests/int/api/auth/authRateLimit.int.spec.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add tests/int/api/auth/authInput.int.spec.ts tests/int/api/auth/authRateLimit.int.spec.ts src/app/api/auth/_lib/authInput.ts src/app/api/auth/_lib/authRateLimit.ts src/app/api/auth/_lib/authResponses.ts
git commit -m "feat: add auth validation and throttling helpers"
```

### Task 4: Add the shared frontend auth gate and move protected pages onto it

**Files:**
- Create: `tests/int/api/auth/frontendAuth.int.spec.ts`
- Create: `src/app/api/auth/_lib/frontendAuth.ts`
- Modify: `src/app/(frontend)/lib/frontendSession.ts`
- Modify: `src/app/(frontend)/editor/page.tsx`
- Modify: `src/app/(frontend)/user/me/page.tsx`
- Modify: `src/app/api/editor/posts/route.ts`
- Modify: `src/app/api/editor/posts/[id]/route.ts`

- [ ] **Step 1: Write the failing auth-gate test**

```ts
import { describe, expect, it, vi } from 'vitest'

const authMock = vi.fn()

vi.mock('@/lib/frontendSession', () => ({
  getCurrentFrontendUser: authMock,
}))

describe('requireFrontendAuth', () => {
  it('requires a verified user and author access when requested', async () => {
    const { requireFrontendAuth } = await import('@/app/api/auth/_lib/frontendAuth')

    authMock.mockResolvedValueOnce({
      _verified: false,
      id: 1,
      isActive: true,
    })

    await expect(
      requireFrontendAuth(new Headers(), {
        requireAuthorAccess: true,
        requireVerified: true,
      }),
    ).rejects.toThrow('EMAIL_NOT_VERIFIED')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/api/auth/frontendAuth.int.spec.ts`
Expected: FAIL because `requireFrontendAuth` does not exist.

- [ ] **Step 3: Write the minimal gate implementation**

```ts
import { getCurrentFrontendUser } from '@/app/(frontend)/lib/frontendSession'

export async function requireFrontendAuth(
  headers: Headers,
  options: {
    requireAuthorAccess?: boolean
    requireVerified?: boolean
  } = {},
) {
  const user = await getCurrentFrontendUser(headers)
  if (!user) throw new Error('AUTH_REQUIRED')
  if (options.requireVerified && user._verified === false) throw new Error('EMAIL_NOT_VERIFIED')
  if (options.requireAuthorAccess && user.isActive === false) throw new Error('AUTHOR_ACCESS_REQUIRED')
  return user
}
```

- [ ] **Step 4: Run the auth-gate test to verify it passes**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/api/auth/frontendAuth.int.spec.ts`
Expected: PASS

- [ ] **Step 5: Wire the gate into protected pages and editor APIs**

```ts
// editor/page.tsx
const currentUser = await requireFrontendAuth(headers, {
  requireAuthorAccess: true,
  requireVerified: true,
})
```

```ts
// user/me/page.tsx
const currentUser = await requireFrontendAuth(headers, {
  requireVerified: true,
})
```

```ts
// api/editor/posts/route.ts
const currentUser = await requireFrontendAuth(request.headers, {
  requireAuthorAccess: true,
  requireVerified: true,
})
```

```ts
// api/editor/posts/[id]/route.ts
const currentUser = await requireFrontendAuth(request.headers, {
  requireAuthorAccess: true,
  requireVerified: true,
})
```

- [ ] **Step 6: Commit**

```bash
git add tests/int/api/auth/frontendAuth.int.spec.ts src/app/api/auth/_lib/frontendAuth.ts src/app/(frontend)/lib/frontendSession.ts src/app/(frontend)/editor/page.tsx src/app/(frontend)/user/me/page.tsx src/app/api/editor/posts/route.ts src/app/api/editor/posts/[id]/route.ts
git commit -m "feat: add shared frontend auth gate"
```

### Task 5: Implement the thin frontend auth API routes

**Files:**
- Create: `tests/int/api/auth/registerRoute.int.spec.ts`
- Create: `tests/int/api/auth/loginRoute.int.spec.ts`
- Create: `tests/int/api/auth/passwordRoutes.int.spec.ts`
- Create: `src/app/api/auth/register/route.ts`
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/app/api/auth/verify-email/route.ts`
- Create: `src/app/api/auth/resend-verification/route.ts`
- Create: `src/app/api/auth/forgot-password/route.ts`
- Create: `src/app/api/auth/reset-password/route.ts`

- [ ] **Step 1: Write the failing registration-route test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const createMock = vi.fn()
const throttleMock = vi.fn()

vi.mock('@/app/api/auth/_lib/authRateLimit', () => ({
  enforceBestEffortThrottle: throttleMock,
}))

vi.mock('@/payload.config', () => ({
  default: Promise.resolve({ fake: 'config' }),
}))

vi.mock('payload', () => ({
  getPayload: vi.fn().mockResolvedValue({ create: createMock }),
}))

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    createMock.mockReset()
    throttleMock.mockReset()
  })

  it('creates a verification-required user with a strict field whitelist', async () => {
    const { POST } = await import('@/app/api/auth/register/route')

    createMock.mockResolvedValueOnce({ email: 'user@example.com', id: 1 })

    const response = await POST(
      new Request('http://localhost:3000/api/auth/register', {
        body: JSON.stringify({
          displayName: 'New User',
          email: 'USER@example.com',
          password: 'StrongPass123',
          roles: ['admin'],
        }),
        method: 'POST',
      }),
    )

    expect(response.status).toBe(200)
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'users',
        data: {
          displayName: 'New User',
          email: 'user@example.com',
          password: 'StrongPass123',
        },
      }),
    )
    expect(createMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ roles: ['admin'] }),
      }),
    )
  })
})
```

- [ ] **Step 2: Run the registration test to verify it fails**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/api/auth/registerRoute.int.spec.ts`
Expected: FAIL because the route does not exist.

- [ ] **Step 3: Write the minimal registration route**

```ts
import { getPayload } from 'payload'
import config from '@/payload.config'
import { normalizeAuthEmail, validatePasswordStrength } from '../_lib/authInput'
import { enforceBestEffortThrottle } from '../_lib/authRateLimit'

export async function POST(request: Request) {
  const body = await request.json()
  const email = normalizeAuthEmail(body.email)
  validatePasswordStrength(body.password)

  await enforceBestEffortThrottle({
    ipHash: 'ip',
    keyPrefix: 'auth:rate:register',
    kv: undefined,
    limit: 5,
    windowMs: 60_000,
  })

  const payload = await getPayload({ config: await config })

  await payload.create({
    collection: 'users',
    data: {
      displayName: String(body.displayName).trim(),
      email,
      password: String(body.password),
    },
  })

  return Response.json({ next: '/verify/pending', success: true })
}
```

- [ ] **Step 4: Write the failing login-route test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const loginMock = vi.fn()
const findMock = vi.fn()

vi.mock('payload', () => ({
  getPayload: vi.fn().mockResolvedValue({
    find: findMock,
    login: loginMock,
  }),
}))

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    loginMock.mockReset()
    findMock.mockReset()
  })

  it('checks author-access policy before issuing a session cookie', async () => {
    const { POST } = await import('@/app/api/auth/login/route')

    findMock.mockResolvedValueOnce({
      docs: [{ _verified: true, email: 'user@example.com', id: 1, isActive: false }],
    })

    const response = await POST(
      new Request('http://localhost:3000/api/auth/login', {
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'StrongPass123',
        }),
        method: 'POST',
      }),
    )

    expect(response.status).toBe(403)
    expect(loginMock).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 5: Run the login-route test to verify it fails**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/api/auth/loginRoute.int.spec.ts`
Expected: FAIL because the route does not exist.

- [ ] **Step 6: Write the minimal login/logout/password routes**

```ts
// login/route.ts
export async function POST(request: Request) {
  const payload = await getPayload({ config: await config })
  const body = await request.json()
  const email = normalizeAuthEmail(body.email)

  const existing = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    showHiddenFields: true,
    where: { email: { equals: email } },
  })

  const user = existing.docs[0]
  if (user && user.isActive === false) {
    return Response.json({ error: 'Author access is disabled for this account.' }, { status: 403 })
  }

  const result = await payload.login({
    collection: 'users',
    data: {
      email,
      password: String(body.password),
    },
  })

  return Response.json({ exp: result.exp, success: true, user: result.user })
}
```

```ts
// forgot-password/route.ts
export async function POST(request: Request) {
  const payload = await getPayload({ config: await config })
  const body = await request.json()

  await payload.forgotPassword({
    collection: 'users',
    data: {
      email: normalizeAuthEmail(body.email),
    },
  })

  return Response.json({ success: true })
}
```

```ts
// reset-password/route.ts
export async function POST(request: Request) {
  const payload = await getPayload({ config: await config })
  const body = await request.json()
  validatePasswordStrength(String(body.password))

  await payload.resetPassword({
    collection: 'users',
    data: {
      password: String(body.password),
      token: String(body.token),
    },
  })

  return Response.json({ success: true })
}
```

```ts
// verify-email/route.ts
export async function GET(request: Request) {
  const payload = await getPayload({ config: await config })
  const token = new URL(request.url).searchParams.get('token')
  if (!token) return Response.redirect(new URL('/verify?status=invalid', request.url))

  const success = await payload.verifyEmail({
    collection: 'users',
    token,
  })

  return Response.redirect(new URL(success ? '/verify?status=success' : '/verify?status=invalid', request.url))
}
```

- [ ] **Step 7: Run all auth-route tests to verify they pass**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/api/auth/registerRoute.int.spec.ts tests/int/api/auth/loginRoute.int.spec.ts tests/int/api/auth/passwordRoutes.int.spec.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add tests/int/api/auth/registerRoute.int.spec.ts tests/int/api/auth/loginRoute.int.spec.ts tests/int/api/auth/passwordRoutes.int.spec.ts src/app/api/auth/register/route.ts src/app/api/auth/login/route.ts src/app/api/auth/logout/route.ts src/app/api/auth/verify-email/route.ts src/app/api/auth/resend-verification/route.ts src/app/api/auth/forgot-password/route.ts src/app/api/auth/reset-password/route.ts
git commit -m "feat: add frontend auth routes"
```

### Task 6: Update frontend auth pages and forms for verification and password reset

**Files:**
- Create: `tests/int/frontend/verificationPages.int.spec.tsx`
- Create: `src/app/(frontend)/verify/pending/page.tsx`
- Create: `src/app/(frontend)/verify/page.tsx`
- Create: `src/app/(frontend)/forgot-password/page.tsx`
- Create: `src/app/(frontend)/reset-password/page.tsx`
- Modify: `src/app/(frontend)/components/auth/LoginForm.tsx`
- Modify: `src/app/(frontend)/components/auth/RegisterForm.tsx`
- Modify: `src/app/(frontend)/components/auth/AuthExperience.tsx`
- Modify: `src/app/(frontend)/login/page.tsx`
- Modify: `src/app/(frontend)/register/page.tsx`
- Modify: `src/app/(frontend)/locales/zh-CN.json`
- Modify: `src/app/(frontend)/locales/en-US.json`
- Modify: `tests/e2e/frontend.e2e.spec.ts`

- [ ] **Step 1: Write the failing frontend verification-page test**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import PendingVerificationPage from '@/app/(frontend)/verify/pending/page'

describe('PendingVerificationPage', () => {
  it('renders the resend verification and login recovery actions', async () => {
    const Page = await PendingVerificationPage()
    render(Page)

    expect(screen.getByText(/check your inbox/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the frontend verification-page test to verify it fails**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/frontend/verificationPages.int.spec.tsx`
Expected: FAIL because the new pages do not exist.

- [ ] **Step 3: Write the minimal page and form changes**

```tsx
// RegisterForm.tsx
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    displayName: displayName.trim(),
    email: email.trim(),
    password,
  }),
})

if (registerResponse.ok) {
  router.replace(`/verify/pending?email=${encodeURIComponent(email.trim().toLowerCase())}`)
  router.refresh()
}
```

```tsx
// LoginForm.tsx
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: email.trim(),
    password,
  }),
})
```

```tsx
// verify/pending/page.tsx
export default async function PendingVerificationPage() {
  return (
    <section>
      <h1>Check your inbox</h1>
      <p>We sent you a verification email.</p>
      <a href="/login">Sign in</a>
    </section>
  )
}
```

```tsx
// forgot-password/page.tsx
export default function ForgotPasswordPage() {
  return (
    <form action="/api/auth/forgot-password" method="post">
      <input name="email" type="email" />
      <button type="submit">Send reset email</button>
    </form>
  )
}
```

- [ ] **Step 4: Run the frontend verification-page test again**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/frontend/verificationPages.int.spec.tsx`
Expected: PASS

- [ ] **Step 5: Update the frontend E2E flow to the new auth behavior**

```ts
test('registers a new frontend account and lands on the verification pending screen', async ({ page }) => {
  await page.goto('http://localhost:3000/register?next=%2Fuser%2Fme')

  const registerPanel = page.locator('div[aria-hidden="false"]').filter({ has: page.locator('form') }).first()

  await registerPanel.locator('input[autocomplete="nickname"]').fill(newUser.displayName)
  await registerPanel.locator('input[type="email"]').fill(newUser.email)
  await registerPanel.locator('input[autocomplete="new-password"]').nth(0).fill(newUser.password)
  await registerPanel.locator('input[autocomplete="new-password"]').nth(1).fill(newUser.password)
  await registerPanel.locator('form button[type="submit"]').click()

  await expect(page).toHaveURL(/\/verify\/pending/)
  await expect(page.getByText(/check your inbox/i)).toBeVisible()
})
```

- [ ] **Step 6: Commit**

```bash
git add tests/int/frontend/verificationPages.int.spec.tsx tests/e2e/frontend.e2e.spec.ts src/app/(frontend)/verify/pending/page.tsx src/app/(frontend)/verify/page.tsx src/app/(frontend)/forgot-password/page.tsx src/app/(frontend)/reset-password/page.tsx src/app/(frontend)/components/auth/LoginForm.tsx src/app/(frontend)/components/auth/RegisterForm.tsx src/app/(frontend)/components/auth/AuthExperience.tsx src/app/(frontend)/login/page.tsx src/app/(frontend)/register/page.tsx src/app/(frontend)/locales/zh-CN.json src/app/(frontend)/locales/en-US.json
git commit -m "feat: add frontend verification and reset flows"
```

### Task 7: Run focused verification, regenerate types if needed, and finish the branch cleanly

**Files:**
- Verify only: `tests/int/email/cloudflareEmailAdapter.int.spec.ts`
- Verify only: `tests/int/api/auth/usersCollection.int.spec.ts`
- Verify only: `tests/int/api/auth/authInput.int.spec.ts`
- Verify only: `tests/int/api/auth/authRateLimit.int.spec.ts`
- Verify only: `tests/int/api/auth/frontendAuth.int.spec.ts`
- Verify only: `tests/int/api/auth/registerRoute.int.spec.ts`
- Verify only: `tests/int/api/auth/loginRoute.int.spec.ts`
- Verify only: `tests/int/api/auth/passwordRoutes.int.spec.ts`
- Verify only: `tests/int/frontend/verificationPages.int.spec.tsx`
- Verify only: `tests/e2e/frontend.e2e.spec.ts`

- [ ] **Step 1: Run all targeted integration tests together**

```bash
pnpm exec vitest run --config ./vitest.config.mts tests/int/email/cloudflareEmailAdapter.int.spec.ts tests/int/api/auth/usersCollection.int.spec.ts tests/int/api/auth/authInput.int.spec.ts tests/int/api/auth/authRateLimit.int.spec.ts tests/int/api/auth/frontendAuth.int.spec.ts tests/int/api/auth/registerRoute.int.spec.ts tests/int/api/auth/loginRoute.int.spec.ts tests/int/api/auth/passwordRoutes.int.spec.ts tests/int/frontend/verificationPages.int.spec.tsx
```

Expected: PASS

- [ ] **Step 2: Run the frontend E2E auth suite**

```bash
pnpm exec playwright test --config=playwright.config.ts tests/e2e/frontend.e2e.spec.ts
```

Expected: PASS with the updated verification-pending flow and password-reset flow.

- [ ] **Step 3: Regenerate types one final time**

```bash
pnpm run generate:types
```

Expected: PASS with no additional generated drift after the auth schema changes.

- [ ] **Step 4: Run the project typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: PASS

- [ ] **Step 5: Inspect the final diff before handoff**

```bash
git diff --stat HEAD~6..HEAD
```

Expected: only auth, email, config, locale, and auth test files changed.

- [ ] **Step 6: Commit any last verification-only adjustments**

```bash
git add src tests wrangler.jsonc .env.example README.md
git commit -m "test: verify auth security flow"
```
