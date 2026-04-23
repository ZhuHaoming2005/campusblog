import { beforeEach, describe, expect, it, vi } from 'vitest'

const authMock = vi.fn()
const createLocalReqMock = vi.fn()
const getPayloadMock = vi.fn()
const logoutOperationMock = vi.fn()

vi.mock('payload', () => ({
  createLocalReq: createLocalReqMock,
  getPayload: getPayloadMock,
  logoutOperation: logoutOperationMock,
}))

vi.mock('@/payload.config', () => ({
  default: Promise.resolve({ fake: 'config' }),
}))

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    authMock.mockReset()
    createLocalReqMock.mockReset()
    getPayloadMock.mockReset()
    logoutOperationMock.mockReset()

    authMock.mockResolvedValue({
      user: {
        collection: 'users',
        email: 'reader@example.com',
        id: 7,
      },
    })
    createLocalReqMock.mockResolvedValue({ fake: 'req' })
    logoutOperationMock.mockResolvedValue(true)
    getPayloadMock.mockResolvedValue({
      auth: authMock,
      collections: {
        users: {
          config: {
            auth: {
              cookies: {
                domain: null,
                sameSite: 'Lax',
                secure: false,
              },
            },
          },
        },
      },
      config: {
        cookiePrefix: 'payload',
      },
    })
  })

  it('returns an error when no authenticated user is present', async () => {
    authMock.mockResolvedValueOnce({ user: null })

    const { POST } = await import('@/app/api/auth/logout/route')

    const response = await POST(
      new Request('https://example.com/api/auth/logout', {
        headers: {
          cookie: 'payload-token=abc',
        },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      code: 'logout_failed',
      ok: false,
    })
    expect(logoutOperationMock).not.toHaveBeenCalled()
  })

  it('expires the Payload auth cookie after a successful local logout operation', async () => {
    const { POST } = await import('@/app/api/auth/logout/route')

    const response = await POST(
      new Request('https://example.com/api/auth/logout', {
        headers: {
          cookie: 'payload-token=abc',
        },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(200)
    expect(authMock).toHaveBeenCalledWith({
      headers: expect.any(Headers),
    })
    expect(createLocalReqMock).toHaveBeenCalledWith(
      {
        req: {
          headers: expect.any(Headers),
          url: 'https://example.com/api/auth/logout',
        },
        user: {
          collection: 'users',
          email: 'reader@example.com',
          id: 7,
        },
      },
      expect.any(Object),
    )
    expect(logoutOperationMock).toHaveBeenCalledWith({
      allSessions: false,
      collection: expect.objectContaining({
        config: expect.objectContaining({
          auth: expect.any(Object),
        }),
      }),
      req: { fake: 'req' },
    })
    expect(response.headers.get('set-cookie')).toContain('payload-token=')
    expect(response.headers.get('set-cookie')).toContain('Expires=')
    expect(response.headers.get('set-cookie')).toContain('Path=/')
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      status: 'logged_out',
    })
  })
})
