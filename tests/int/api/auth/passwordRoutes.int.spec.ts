import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getFrontendPayloadMock = vi.fn()
const checkAuthCooldownMock = vi.fn()
const checkAuthRateLimitMock = vi.fn()
const getRequestIPMock = vi.fn(() => '127.0.0.1')
const createLocalReqMock = vi.fn()
const recordAuthCooldownMock = vi.fn()
const sendVerificationEmailMock = vi.fn()
const originalSiteURL = process.env.NEXT_PUBLIC_SITE_URL
const originalAllowedOrigins = process.env.AUTH_EMAIL_ALLOWED_ORIGINS

vi.mock('@/lib/frontendSession', () => ({
  getFrontendPayload: getFrontendPayloadMock,
}))

vi.mock('@/app/api/auth/_lib/authRateLimit', () => ({
  checkAuthCooldown: checkAuthCooldownMock,
  checkAuthRateLimit: checkAuthRateLimitMock,
  getRequestIP: getRequestIPMock,
  recordAuthCooldown: recordAuthCooldownMock,
}))

vi.mock('payload', () => ({
  createLocalReq: createLocalReqMock,
}))

vi.mock('@/app/api/auth/_lib/payloadVerificationEmail', () => ({
  sendVerificationEmail: sendVerificationEmailMock,
}))

describe('auth password and verification routes', () => {
  const testEnv = process.env as Record<string, string | undefined>

  beforeEach(() => {
    testEnv.NEXT_PUBLIC_SITE_URL = 'https://fallback.example.com'
    process.env.AUTH_EMAIL_ALLOWED_ORIGINS = 'https://preview.example.com'
    getFrontendPayloadMock.mockReset()
    checkAuthCooldownMock.mockReset()
    checkAuthRateLimitMock.mockReset()
    getRequestIPMock.mockClear()
    createLocalReqMock.mockReset()
    recordAuthCooldownMock.mockReset()
    sendVerificationEmailMock.mockReset()
    checkAuthCooldownMock.mockResolvedValue({ limited: false, retryAfterSeconds: 0 })
    checkAuthRateLimitMock.mockResolvedValue({ limited: false, retryAfterSeconds: 0 })
    recordAuthCooldownMock.mockResolvedValue(undefined)
    createLocalReqMock.mockResolvedValue({
      headers: new Headers(),
      payloadAPI: 'local',
      t: (value: string) => value,
    })
    vi.restoreAllMocks()
  })

  afterEach(() => {
    if (originalSiteURL === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL
    } else {
      testEnv.NEXT_PUBLIC_SITE_URL = originalSiteURL
    }

    if (originalAllowedOrigins === undefined) {
      delete process.env.AUTH_EMAIL_ALLOWED_ORIGINS
      return
    }

    process.env.AUTH_EMAIL_ALLOWED_ORIGINS = originalAllowedOrigins
  })

  it('returns generic success for forgot password requests', async () => {
    const forgotPasswordMock = vi.fn().mockResolvedValue('token')
    const sendEmailMock = vi.fn().mockResolvedValue(undefined)
    getFrontendPayloadMock.mockResolvedValue({ forgotPassword: forgotPasswordMock })
    getFrontendPayloadMock.mockResolvedValue({
      email: {
        defaultFromAddress: 'noreply@example.com',
        defaultFromName: 'CampusBlog',
        sendEmail: sendEmailMock,
      },
      forgotPassword: forgotPasswordMock,
    })

    const { POST } = await import('@/app/api/auth/forgot-password/route')

    const response = await POST(
      new Request('https://example.com/api/auth/forgot-password', {
        body: JSON.stringify({ email: 'user@example.com' }),
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(200)
    expect(forgotPasswordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        disableEmail: true,
      }),
    )
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(recordAuthCooldownMock).toHaveBeenCalledWith({
      action: 'forgotPassword',
      email: 'user@example.com',
    })
    await expect(response.json()).resolves.toMatchObject({
      code: 'password_reset_requested',
      ok: true,
    })
  })

  it('returns generic success for forgot password when no reset token is issued', async () => {
    const forgotPasswordMock = vi.fn().mockResolvedValue(null)
    const sendEmailMock = vi.fn().mockResolvedValue(undefined)
    getFrontendPayloadMock.mockResolvedValue({
      email: {
        defaultFromAddress: 'noreply@example.com',
        defaultFromName: 'CampusBlog',
        sendEmail: sendEmailMock,
      },
      forgotPassword: forgotPasswordMock,
    })

    const { POST } = await import('@/app/api/auth/forgot-password/route')

    const response = await POST(
      new Request('https://example.com/api/auth/forgot-password', {
        body: JSON.stringify({ email: 'missing@example.com' }),
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(200)
    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(recordAuthCooldownMock).toHaveBeenCalledWith({
      action: 'forgotPassword',
      email: 'missing@example.com',
    })
    await expect(response.json()).resolves.toMatchObject({
      code: 'password_reset_requested',
      ok: true,
    })
  })

  it('redirects forgot-password form submissions back to the page and preserves next', async () => {
    const forgotPasswordMock = vi.fn().mockResolvedValue('token')
    const sendEmailMock = vi.fn().mockResolvedValue(undefined)
    getFrontendPayloadMock.mockResolvedValue({
      email: {
        defaultFromAddress: 'noreply@example.com',
        defaultFromName: 'CampusBlog',
        sendEmail: sendEmailMock,
      },
      forgotPassword: forgotPasswordMock,
    })

    const { POST } = await import('@/app/api/auth/forgot-password/route')

    const formData = new FormData()
    formData.set('email', 'user@example.com')
    formData.set('next', '/editor')

    const response = await POST(
      new Request('https://example.com/api/auth/forgot-password', {
        body: formData,
        method: 'POST',
      }),
    )

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe(
      'https://example.com/forgot-password?email=user%40example.com&next=%2Feditor&status=sent',
    )
    expect(sendEmailMock.mock.calls[0]?.[0]?.html).toContain('next=%2Feditor')
    expect(recordAuthCooldownMock).toHaveBeenCalledWith({
      action: 'forgotPassword',
      email: 'user@example.com',
    })
  })

  it('uses the active request origin when sending real forgot-password emails', async () => {
    const forgotPasswordMock = vi.fn().mockResolvedValue('token')
    const sendEmailMock = vi.fn().mockResolvedValue(undefined)
    getFrontendPayloadMock.mockResolvedValue({
      email: {
        defaultFromAddress: 'noreply@example.com',
        defaultFromName: 'CampusBlog',
        sendEmail: sendEmailMock,
      },
      forgotPassword: forgotPasswordMock,
    })

    const { POST } = await import('@/app/api/auth/forgot-password/route')

    const response = await POST(
      new Request('https://preview.example.com/api/auth/forgot-password', {
        body: JSON.stringify({ email: 'user@example.com', next: '/editor' }),
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(200)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(sendEmailMock.mock.calls[0]?.[0]?.html).toContain(
      'https://preview.example.com/reset-password?token=token&next=%2Feditor',
    )
    expect(sendEmailMock.mock.calls[0]?.[0]?.html).not.toContain(
      'https://fallback.example.com/reset-password?token=token&next=%2Feditor',
    )
  })

  it('falls back to the configured site origin for forgot-password emails when request origin is untrusted', async () => {
    const forgotPasswordMock = vi.fn().mockResolvedValue('token')
    const sendEmailMock = vi.fn().mockResolvedValue(undefined)
    getFrontendPayloadMock.mockResolvedValue({
      email: {
        defaultFromAddress: 'noreply@example.com',
        defaultFromName: 'CampusBlog',
        sendEmail: sendEmailMock,
      },
      forgotPassword: forgotPasswordMock,
    })

    const { POST } = await import('@/app/api/auth/forgot-password/route')

    const response = await POST(
      new Request('https://evil.example.com/api/auth/forgot-password', {
        body: JSON.stringify({ email: 'user@example.com', next: '/editor' }),
        headers: {
          'content-type': 'application/json',
          origin: 'https://evil.example.com',
          'x-forwarded-for': '127.0.0.1',
          'x-forwarded-host': 'evil.example.com',
          'x-forwarded-proto': 'https',
        },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(200)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(sendEmailMock.mock.calls[0]?.[0]?.html).toContain(
      'https://fallback.example.com/reset-password?token=token&next=%2Feditor',
    )
    expect(sendEmailMock.mock.calls[0]?.[0]?.html).not.toContain(
      'https://evil.example.com/reset-password?token=token&next=%2Feditor',
    )
  })

  it('returns a safe invalid-token response when reset password fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ errors: [{ message: 'Invalid token' }] }), {
        headers: { 'content-type': 'application/json' },
        status: 400,
      }),
    )

    const { POST } = await import('@/app/api/auth/reset-password/route')

    const response = await POST(
      new Request('https://example.com/api/auth/reset-password', {
        body: JSON.stringify({
          password: 'StrongPass123',
          token: 'bad-token',
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      code: 'invalid_or_expired_token',
    })
  })

  it('returns reset-password JSON success with the sanitized next path', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          token: 'session-token',
          user: { id: 7 },
        }),
        {
          headers: {
            'content-type': 'application/json',
            'set-cookie': 'payload-token=session-token; Path=/; HttpOnly',
          },
          status: 200,
        },
      ),
    )

    const { POST } = await import('@/app/api/auth/reset-password/route')

    const response = await POST(
      new Request('https://example.com/api/auth/reset-password', {
        body: JSON.stringify({
          next: '/editor',
          password: 'StrongPass123',
          token: 'reset-token',
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(response.headers.get('set-cookie')).toContain('payload-token=session-token')
    await expect(response.json()).resolves.toMatchObject({
      code: 'password_reset_complete',
      next: '/editor',
      ok: true,
    })
  })

  it('redirects successful reset-password form submissions to login without rendering token errors', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          token: 'session-token',
          user: { id: 7 },
        }),
        {
          headers: {
            'content-type': 'application/json',
            'set-cookie': 'payload-token=session-token; Path=/; HttpOnly',
          },
          status: 200,
        },
      ),
    )

    const { POST } = await import('@/app/api/auth/reset-password/route')

    const formData = new FormData()
    formData.set('password', 'StrongPass123')
    formData.set('token', 'reset-token')
    formData.set('next', '/editor')

    const response = await POST(
      new Request('https://example.com/api/auth/reset-password', {
        body: formData,
        method: 'POST',
      }),
    )

    expect(response.status).toBe(302)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(response.headers.get('location')).toBe(
      'https://example.com/login?next=%2Feditor&status=password-reset',
    )
    expect(response.headers.get('set-cookie')).toContain('payload-token=session-token')
  })

  it('rejects mismatched reset-password confirmation values on form submissions', async () => {
    const resetPasswordMock = vi.fn()
    getFrontendPayloadMock.mockResolvedValue({ resetPassword: resetPasswordMock })

    const { POST } = await import('@/app/api/auth/reset-password/route')

    const formData = new FormData()
    formData.set('password', 'StrongPass123')
    formData.set('passwordConfirm', 'StrongPass124')
    formData.set('token', 'reset-token')
    formData.set('next', '/editor')

    const response = await POST(
      new Request('https://example.com/api/auth/reset-password', {
        body: formData,
        method: 'POST',
      }),
    )

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe(
      'https://example.com/reset-password?error=The+two+passwords+do+not+match.&next=%2Feditor&token=reset-token',
    )
    expect(resetPasswordMock).not.toHaveBeenCalled()
  })

  it('returns forgot-password JSON rate-limit responses with retry-after headers', async () => {
    checkAuthRateLimitMock.mockResolvedValue({
      limited: true,
      retryAfterSeconds: 120,
    })

    const { POST } = await import('@/app/api/auth/forgot-password/route')

    const response = await POST(
      new Request('https://example.com/api/auth/forgot-password', {
        body: JSON.stringify({ email: 'user@example.com', next: '/editor' }),
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('120')
    expect(getFrontendPayloadMock).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({
      code: 'rate_limited',
      error: 'Too many attempts. Please try again later.',
      ok: false,
    })
  })

  it('redirects forgot-password form submissions back to the page when rate limited', async () => {
    checkAuthRateLimitMock.mockResolvedValue({
      limited: true,
      retryAfterSeconds: 120,
    })

    const { POST } = await import('@/app/api/auth/forgot-password/route')

    const formData = new FormData()
    formData.set('email', 'user@example.com')
    formData.set('next', '/editor')

    const response = await POST(
      new Request('https://example.com/api/auth/forgot-password', {
        body: formData,
        method: 'POST',
      }),
    )

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe(
      'https://example.com/forgot-password?email=user%40example.com&error=Too+many+attempts.+Please+try+again+later.&next=%2Feditor',
    )
    expect(getFrontendPayloadMock).not.toHaveBeenCalled()
  })

  it('returns forgot-password cooldown responses with retry-after headers before attempting delivery', async () => {
    checkAuthCooldownMock.mockResolvedValue({
      limited: true,
      retryAfterSeconds: 60,
    })

    const { POST } = await import('@/app/api/auth/forgot-password/route')

    const response = await POST(
      new Request('https://example.com/api/auth/forgot-password', {
        body: JSON.stringify({ email: 'user@example.com', next: '/editor' }),
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('60')
    expect(getFrontendPayloadMock).not.toHaveBeenCalled()
    expect(recordAuthCooldownMock).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({
      code: 'rate_limited',
      error: 'Too many attempts. Please try again later.',
      ok: false,
    })
  })

  it('resends verification mail with a fresh token for existing unverified users', async () => {
    const findMock = vi.fn().mockResolvedValue({
      docs: [
        {
          _verified: false,
          email: 'user@example.com',
          id: 7,
          isActive: true,
        },
      ],
    })
    const updateMock = vi.fn().mockImplementation(async ({ data, id }) => ({
      _verificationToken: data._verificationToken,
      _verified: false,
      email: 'user@example.com',
      id,
      isActive: true,
    }))
    getFrontendPayloadMock.mockResolvedValue({
      collections: {
        users: {
          config: {
            auth: {
              verify: {},
            },
            slug: 'users',
          },
        },
      },
      config: { routes: { admin: '/admin' }, serverURL: 'https://example.com' },
      email: {
        defaultFromAddress: 'noreply@example.com',
        defaultFromName: 'CampusBlog',
        sendEmail: vi.fn(),
      },
      find: findMock,
      update: updateMock,
    })

    const { POST } = await import('@/app/api/auth/resend-verification/route')

    const response = await POST(
      new Request('https://example.com/api/auth/resend-verification', {
        body: JSON.stringify({ email: 'user@example.com' }),
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(200)
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'users',
        data: expect.objectContaining({
          _verificationToken: expect.any(String),
          _verified: false,
        }),
        id: 7,
        overrideAccess: true,
        showHiddenFields: true,
      }),
    )
    expect(sendVerificationEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        token: expect.any(String),
        user: expect.objectContaining({
          email: 'user@example.com',
        }),
      }),
    )
    expect(recordAuthCooldownMock).toHaveBeenCalledWith({
      action: 'resendVerification',
      email: 'user@example.com',
    })
    await expect(response.json()).resolves.toMatchObject({
      code: 'verification_resent',
      ok: true,
    })
  })

  it('reuses an existing verification token instead of invalidating older verification links', async () => {
    const findMock = vi.fn().mockResolvedValue({
      docs: [
        {
          _verificationToken: 'existing-token',
          _verified: false,
          email: 'user@example.com',
          id: 7,
        },
      ],
    })
    const updateMock = vi.fn()
    getFrontendPayloadMock.mockResolvedValue({
      collections: {
        users: {
          config: {
            auth: {
              verify: {},
            },
            slug: 'users',
          },
        },
      },
      config: { routes: { admin: '/admin' }, serverURL: 'https://example.com' },
      email: {
        defaultFromAddress: 'noreply@example.com',
        defaultFromName: 'CampusBlog',
        sendEmail: vi.fn(),
      },
      find: findMock,
      update: updateMock,
    })

    const { POST } = await import('@/app/api/auth/resend-verification/route')

    const response = await POST(
      new Request('https://example.com/api/auth/resend-verification', {
        body: JSON.stringify({ email: 'user@example.com', next: '/editor' }),
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(200)
    expect(updateMock).not.toHaveBeenCalled()
    expect(sendVerificationEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'existing-token',
      }),
    )
    expect(recordAuthCooldownMock).toHaveBeenCalledWith({
      action: 'resendVerification',
      email: 'user@example.com',
    })
  })

  it('redirects resend-verification form submissions back to pending and preserves next', async () => {
    const findMock = vi.fn().mockResolvedValue({
      docs: [
        {
          _verified: false,
          email: 'user@example.com',
          id: 7,
        },
      ],
    })
    const updateMock = vi.fn().mockImplementation(async ({ data, id }) => ({
      _verificationToken: data._verificationToken,
      _verified: false,
      email: 'user@example.com',
      id,
    }))
    getFrontendPayloadMock.mockResolvedValue({
      find: findMock,
      update: updateMock,
    })

    const { POST } = await import('@/app/api/auth/resend-verification/route')

    const formData = new FormData()
    formData.set('email', 'user@example.com')
    formData.set('next', '/editor')

    const response = await POST(
      new Request('https://example.com/api/auth/resend-verification', {
        body: formData,
        method: 'POST',
      }),
    )

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe(
      'https://example.com/verify/pending?email=user%40example.com&next=%2Feditor&status=resent',
    )
    expect(updateMock).toHaveBeenCalledTimes(1)
    expect(sendVerificationEmailMock).toHaveBeenCalledTimes(1)
    expect(recordAuthCooldownMock).toHaveBeenCalledWith({
      action: 'resendVerification',
      email: 'user@example.com',
    })
  })

  it('returns generic resend-verification success without sending mail for verified users', async () => {
    const findMock = vi.fn().mockResolvedValue({
      docs: [
        {
          _verificationToken: 'verify-token',
          _verified: true,
          email: 'user@example.com',
          id: 7,
        },
      ],
    })
    const sendEmailMock = vi.fn().mockResolvedValue(undefined)
    getFrontendPayloadMock.mockResolvedValue({
      email: {
        defaultFromAddress: 'noreply@example.com',
        defaultFromName: 'CampusBlog',
        sendEmail: sendEmailMock,
      },
      find: findMock,
    })

    const { POST } = await import('@/app/api/auth/resend-verification/route')

    const response = await POST(
      new Request('https://example.com/api/auth/resend-verification', {
        body: JSON.stringify({ email: 'user@example.com' }),
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(200)
    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(recordAuthCooldownMock).toHaveBeenCalledWith({
      action: 'resendVerification',
      email: 'user@example.com',
    })
    await expect(response.json()).resolves.toMatchObject({
      code: 'verification_resent',
      ok: true,
    })
  })

  it('returns generic resend-verification success without sending mail for missing users', async () => {
    getFrontendPayloadMock.mockResolvedValueOnce({
      find: vi.fn().mockResolvedValue({ docs: [] }),
    })

    const { POST } = await import('@/app/api/auth/resend-verification/route')

    const missingResponse = await POST(
      new Request('https://example.com/api/auth/resend-verification', {
        body: JSON.stringify({ email: 'missing@example.com' }),
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
        method: 'POST',
      }),
    )

    expect(missingResponse.status).toBe(200)
    expect(sendVerificationEmailMock).not.toHaveBeenCalled()
    expect(recordAuthCooldownMock).toHaveBeenCalledWith({
      action: 'resendVerification',
      email: 'missing@example.com',
    })
    await expect(missingResponse.json()).resolves.toMatchObject({
      code: 'verification_resent',
      ok: true,
    })
  })

  it('resends verification mail for unverified users even when no prior token is present', async () => {
    const updateMock = vi.fn().mockImplementation(async ({ data, id }) => ({
      _verificationToken: data._verificationToken,
      _verified: false,
      email: 'tokenless@example.com',
      id,
    }))
    getFrontendPayloadMock.mockResolvedValueOnce({
      find: vi.fn().mockResolvedValue({
        docs: [{ _verified: false, email: 'tokenless@example.com', id: 9 }],
      }),
      update: updateMock,
    })
    const { POST } = await import('@/app/api/auth/resend-verification/route')

    const tokenlessResponse = await POST(
      new Request('https://example.com/api/auth/resend-verification', {
        body: JSON.stringify({ email: 'tokenless@example.com' }),
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
        method: 'POST',
      }),
    )

    expect(tokenlessResponse.status).toBe(200)
    expect(updateMock).toHaveBeenCalledTimes(1)
    expect(sendVerificationEmailMock).toHaveBeenCalledTimes(1)
    expect(recordAuthCooldownMock).toHaveBeenCalledWith({
      action: 'resendVerification',
      email: 'tokenless@example.com',
    })
    await expect(tokenlessResponse.json()).resolves.toMatchObject({
      code: 'verification_resent',
      ok: true,
    })
  })

  it('returns resend-verification JSON rate-limit responses with retry-after headers', async () => {
    checkAuthRateLimitMock.mockResolvedValue({
      limited: true,
      retryAfterSeconds: 240,
    })

    const { POST } = await import('@/app/api/auth/resend-verification/route')

    const response = await POST(
      new Request('https://example.com/api/auth/resend-verification', {
        body: JSON.stringify({ email: 'user@example.com', next: '/editor' }),
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('240')
    expect(getFrontendPayloadMock).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({
      code: 'rate_limited',
      error: 'Too many attempts. Please try again later.',
      ok: false,
    })
  })

  it('redirects resend-verification form submissions back to pending when rate limited', async () => {
    checkAuthRateLimitMock.mockResolvedValue({
      limited: true,
      retryAfterSeconds: 240,
    })

    const { POST } = await import('@/app/api/auth/resend-verification/route')

    const formData = new FormData()
    formData.set('email', 'user@example.com')
    formData.set('next', '/editor')

    const response = await POST(
      new Request('https://example.com/api/auth/resend-verification', {
        body: formData,
        method: 'POST',
      }),
    )

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe(
      'https://example.com/verify/pending?email=user%40example.com&error=Too+many+attempts.+Please+try+again+later.&next=%2Feditor',
    )
    expect(getFrontendPayloadMock).not.toHaveBeenCalled()
  })

  it('returns resend-verification cooldown responses with retry-after headers before attempting delivery', async () => {
    checkAuthCooldownMock.mockResolvedValue({
      limited: true,
      retryAfterSeconds: 60,
    })

    const { POST } = await import('@/app/api/auth/resend-verification/route')

    const response = await POST(
      new Request('https://example.com/api/auth/resend-verification', {
        body: JSON.stringify({ email: 'user@example.com', next: '/editor' }),
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('60')
    expect(getFrontendPayloadMock).not.toHaveBeenCalled()
    expect(recordAuthCooldownMock).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({
      code: 'rate_limited',
      error: 'Too many attempts. Please try again later.',
      ok: false,
    })
  })

  it('redirects verify-email results back to the frontend and preserves next', async () => {
    const verifyEmailMock = vi.fn().mockResolvedValue(true)
    getFrontendPayloadMock.mockResolvedValue({ verifyEmail: verifyEmailMock })

    const { GET } = await import('@/app/api/auth/verify-email/route')

    const response = await GET(
      new Request('https://example.com/api/auth/verify-email?token=verify-token&next=/editor'),
    )

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe(
      'https://example.com/verify?status=success&next=%2Feditor',
    )
  })
})
