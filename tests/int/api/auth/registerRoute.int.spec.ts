import { beforeEach, describe, expect, it, vi } from 'vitest'

const getFrontendPayloadMock = vi.fn()
const checkAuthRateLimitMock = vi.fn()
const getRequestIPMock = vi.fn(() => '127.0.0.1')

vi.mock('@/lib/frontendSession', () => ({
  getFrontendPayload: getFrontendPayloadMock,
}))

vi.mock('@/app/api/auth/_lib/authRateLimit', () => ({
  checkAuthRateLimit: checkAuthRateLimitMock,
  getRequestIP: getRequestIPMock,
}))

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    getFrontendPayloadMock.mockReset()
    checkAuthRateLimitMock.mockReset()
    getRequestIPMock.mockClear()
    checkAuthRateLimitMock.mockResolvedValue({ limited: false, retryAfterSeconds: 0 })
  })

  it('creates a verification-pending user using a strict field whitelist', async () => {
    const createMock = vi.fn().mockResolvedValue({
      email: 'user@example.com',
      id: 42,
    })
    getFrontendPayloadMock.mockResolvedValue({ create: createMock })

    const { POST } = await import('@/app/api/auth/register/route')

    const response = await POST(
      new Request('https://example.com/api/auth/register', {
        body: JSON.stringify({
          displayName: 'Campus User',
          email: 'user@example.com',
          isActive: false,
          next: '/editor',
          password: 'StrongPass123',
          roles: ['admin'],
        }),
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
        method: 'POST',
      }),
    )

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'users',
        data: {
          displayName: 'Campus User',
          email: 'user@example.com',
          password: 'StrongPass123',
        },
        context: {
          authNextPath: '/editor',
        },
        overrideAccess: true,
        req: expect.objectContaining({
          headers: expect.any(Headers),
          url: 'https://example.com/api/auth/register',
        }),
      }),
    )
    expect(createMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        disableVerificationEmail: true,
      }),
    )

    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body).toMatchObject({
      ok: true,
      next: '/editor',
      status: 'verification_pending',
    })
  })

  it('returns Payload field validation errors as 400 instead of collapsing them into register_failed', async () => {
    const createMock = vi.fn().mockRejectedValue({
      data: {
        errors: [
          {
            message: 'This email is already registered.',
            path: 'email',
          },
        ],
      },
      message: 'The following field is invalid: email',
      status: 400,
    })
    getFrontendPayloadMock.mockResolvedValue({ create: createMock })

    const { POST } = await import('@/app/api/auth/register/route')

    const response = await POST(
      new Request('https://example.com/api/auth/register', {
        body: JSON.stringify({
          displayName: 'Campus User',
          email: 'user@example.com',
          password: 'StrongPass123',
        }),
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      code: 'invalid_email',
      error: 'This email is already registered.',
      ok: false,
    })
  })
})
