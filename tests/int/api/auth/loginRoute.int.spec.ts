import { beforeEach, describe, expect, it, vi } from 'vitest'

const checkAuthRateLimitMock = vi.fn()
const getRequestIPMock = vi.fn(() => '127.0.0.1')
const getFrontendLoginLockStateMock = vi.fn()

vi.mock('@/app/api/auth/_lib/authRateLimit', () => ({
  checkAuthRateLimit: checkAuthRateLimitMock,
  getRequestIP: getRequestIPMock,
}))

vi.mock('@/app/api/auth/_lib/limitedFrontendSession', () => ({
  getFrontendLoginLockState: getFrontendLoginLockStateMock,
}))

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    checkAuthRateLimitMock.mockReset()
    getRequestIPMock.mockClear()
    getFrontendLoginLockStateMock.mockReset()
    checkAuthRateLimitMock.mockResolvedValue({ limited: false, retryAfterSeconds: 0 })
    getFrontendLoginLockStateMock.mockResolvedValue('not_locked')
    vi.restoreAllMocks()
  })

  it('normalizes successful login responses and forwards set-cookie headers', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          exp: 123,
          user: { email: 'user@example.com', id: 7 },
        }),
        {
          headers: {
            'content-type': 'application/json',
            'set-cookie': 'payload-token=abc; Path=/; HttpOnly',
          },
          status: 200,
        },
      ),
    )

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

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(response.headers.get('set-cookie')).toContain('payload-token=abc')

    const body = await response.json()
    expect(body).toMatchObject({
      next: '/editor',
      ok: true,
    })
  })

  it('returns an email-verification response for upstream unverified-login failures', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          errors: [{ message: 'Please verify your email before logging in.' }],
        }),
        {
          headers: { 'content-type': 'application/json' },
          status: 403,
        },
      ),
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

  it('returns a generic credential error when the upstream login fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ errors: [{ message: 'User not found' }] }), {
        headers: { 'content-type': 'application/json' },
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
    expect(getFrontendLoginLockStateMock).toHaveBeenCalledWith({
      email: 'user@example.com',
      request: expect.any(Request),
    })
  })

  it('preserves Payload locked-account failures instead of collapsing them into invalid credentials', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          errors: [
            {
              message: 'This user is locked due to having too many failed login attempts.',
            },
          ],
        }),
        {
          headers: { 'content-type': 'application/json' },
          status: 401,
        },
      ),
    )
    getFrontendLoginLockStateMock.mockResolvedValue('locked')

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
  })

  it('preserves upstream 5xx login failures instead of collapsing them into invalid credentials', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ errors: [{ message: 'Service unavailable.' }] }), {
        headers: { 'content-type': 'application/json' },
        status: 503,
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

    expect(getFrontendLoginLockStateMock).not.toHaveBeenCalled()
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({
      code: 'login_failed',
      error: 'Service unavailable.',
      ok: false,
    })
  })
})
