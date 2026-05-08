import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireFrontendAuthMock = vi.fn()
const toAuthFailureResponseMock = vi.fn()

vi.mock('@/app/api/auth/_lib/frontendAuth', () => ({
  requireFrontendAuth: requireFrontendAuthMock,
  toAuthFailureResponse: toAuthFailureResponseMock,
}))

describe('editor post routes enforce auth before request validation', () => {
  beforeEach(() => {
    requireFrontendAuthMock.mockReset()
    toAuthFailureResponseMock.mockReset()
    toAuthFailureResponseMock.mockImplementation(
      (result: { code: string; status: number }) =>
        Response.json({ code: result.code, ok: false }, { status: result.status }),
    )
  })

  it('returns auth failure for create requests before business validation runs', async () => {
    requireFrontendAuthMock.mockResolvedValue({
      code: 'auth_required',
      error: 'Authentication is required.',
      location: '/login?next=%2Feditor',
      ok: false,
      status: 401,
    })

    const { POST } = await import('@/app/api/editor/posts/route')

    const response = await POST(
      new Request('https://example.com/api/editor/posts', {
        body: JSON.stringify({}),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      code: 'auth_required',
      ok: false,
    })
  })

  it('returns auth failure for update requests before business validation runs', async () => {
    requireFrontendAuthMock.mockResolvedValue({
      code: 'auth_required',
      error: 'Authentication is required.',
      location: '/login?next=%2Feditor',
      ok: false,
      status: 401,
    })

    const { PATCH } = await import('@/app/api/editor/posts/[id]/route')

    const response = await PATCH(
      new Request('https://example.com/api/editor/posts/1', {
        body: JSON.stringify({}),
        headers: { 'content-type': 'application/json' },
        method: 'PATCH',
      }),
      { params: Promise.resolve({ id: '1' }) },
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      code: 'auth_required',
      ok: false,
    })
  })
})
