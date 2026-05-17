import { beforeEach, describe, expect, it, vi } from 'vitest'

const checkAuthRateLimitMock = vi.fn()
const getRequestIPMock = vi.fn(() => '127.0.0.1')
const getFrontendLoginLockStateMock = vi.fn()
const payloadLoginMock = vi.fn()
const getPayloadMock = vi.fn()

const payloadConfigMock = Promise.resolve({})

vi.mock('@/app/api/auth/_lib/authRateLimit', () => ({
  checkAuthRateLimit: checkAuthRateLimitMock,
  getRequestIP: getRequestIPMock,
}))

vi.mock('@/app/api/auth/_lib/limitedFrontendSession', () => ({
  getFrontendLoginLockState: getFrontendLoginLockStateMock,
}))

vi.mock('@/payload.config', () => ({
  default: payloadConfigMock,
}))

vi.mock('payload', () => ({
  getPayload: getPayloadMock,
}))

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.resetModules()
    checkAuthRateLimitMock.mockReset()
    getRequestIPMock.mockClear()
    getFrontendLoginLockStateMock.mockReset()
    payloadLoginMock.mockReset()
    getPayloadMock.mockReset()
    checkAuthRateLimitMock.mockResolvedValue({ limited: false, retryAfterSeconds: 0 })
    getFrontendLoginLockStateMock.mockResolvedValue('not_locked')
    getPayloadMock.mockResolvedValue({
      collections: {
        users: {
          config: {
            auth: {
              cookies: {
                sameSite: 'Lax',
                secure: false,
              },
              removeTokenFromResponses: false,
              tokenExpiration: 3600,
            },
          },
        },
      },
      config: {
        cookiePrefix: 'payload',
      },
      login: payloadLoginMock,
    })
    vi.restoreAllMocks()
  })

  it('normalizes successful login responses and forwards set-cookie headers', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    payloadLoginMock.mockResolvedValue({
      exp: 123,
      token: 'abc',
      user: { email: 'user@example.com', id: 7 },
    })

    const { POST } = await import('@/app/api/auth/login/route')

    const response = await POST(
      new Request('https://example.com/api/auth/login', {
        body: JSON.stringify({
          email: 'USER@example.com',
          next: '/editor',
          password: 'password123',
        }),
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
        method: 'POST',
      }),
    )

    expect(fetchMock).not.toHaveBeenCalled()
    expect(getPayloadMock).toHaveBeenCalledWith({ config: await payloadConfigMock })
    expect(payloadLoginMock).toHaveBeenCalledWith({
      collection: 'users',
      data: {
        email: 'user@example.com',
        password: 'password123',
      },
      overrideAccess: false,
      req: {
        headers: expect.any(Headers),
      },
      showHiddenFields: true,
    })
    expect(response.headers.get('set-cookie')).toContain('payload-token=abc')

    const body = await response.json()
    expect(body).toMatchObject({
      next: '/editor',
      ok: true,
    })
  })

  it('returns an email-verification response for Payload unverified-login failures', async () => {
    payloadLoginMock.mockRejectedValue(
      Object.assign(new Error('Please verify your email before logging in.'), {
        name: 'UnverifiedEmail',
        status: 403,
      }),
    )

    const { POST } = await import('@/app/api/auth/login/route')

    const response = await POST(
      new Request('https://example.com/api/auth/login', {
        body: JSON.stringify({
          email: 'user@example.com',
          next: '/editor',
          password: 'password123',
        }),
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      code: 'email_verification_required',
      error: 'Please verify your email before logging in.',
      location: '/verify/pending?email=user%40example.com&next=%2Feditor',
      ok: false,
    })
  })

  it('returns a generic credential error when Payload login rejects credentials', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {})
    payloadLoginMock.mockRejectedValue(
      Object.assign(new Error('User not found'), {
        name: 'AuthenticationError',
        status: 401,
      }),
    )

    const { POST } = await import('@/app/api/auth/login/route')

    const response = await POST(
      new Request('https://example.com/api/auth/login', {
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'password123',
        }),
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      code: 'invalid_credentials',
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(consoleErrorMock).not.toHaveBeenCalled()
    expect(getFrontendLoginLockStateMock).toHaveBeenCalledWith({
      email: 'user@example.com',
      request: expect.any(Request),
    })
  })

  it('preserves Payload locked-account failures instead of collapsing them into invalid credentials', async () => {
    payloadLoginMock.mockRejectedValue(
      Object.assign(new Error('This user is locked due to having too many failed login attempts.'), {
        name: 'LockedAuth',
        status: 401,
      }),
    )

    const { POST } = await import('@/app/api/auth/login/route')

    const response = await POST(
      new Request('https://example.com/api/auth/login', {
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'password123',
        }),
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      code: 'account_locked',
      error: 'This account is temporarily locked.',
      ok: false,
    })
    expect(getFrontendLoginLockStateMock).not.toHaveBeenCalled()
  })

  it('preserves unexpected Payload login failures instead of collapsing them into invalid credentials', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    payloadLoginMock.mockRejectedValue(new Error('Service unavailable.'))

    const { POST } = await import('@/app/api/auth/login/route')

    const response = await POST(
      new Request('https://example.com/api/auth/login', {
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'password123',
        }),
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
        method: 'POST',
      }),
    )

    expect(getFrontendLoginLockStateMock).not.toHaveBeenCalled()
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({
      code: 'login_failed',
      error: 'Service unavailable.',
      ok: false,
    })
  })
})
