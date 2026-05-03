import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireFrontendAuthMock = vi.fn()
const toAuthFailureResponseMock = vi.fn()
const getFrontendPayloadMock = vi.fn()

vi.mock('@/app/api/auth/_lib/frontendAuth', () => ({
  requireFrontendAuth: requireFrontendAuthMock,
  toAuthFailureResponse: toAuthFailureResponseMock,
}))

vi.mock('@/lib/frontendSession', () => ({
  getFrontendPayload: getFrontendPayloadMock,
}))

const user = {
  _verified: true,
  id: 42,
  isActive: true,
  roles: ['user'],
}

function createPayloadMock() {
  return {
    create: vi.fn(async (args) => ({ id: 1001, ...args.data })),
    delete: vi.fn(async () => ({ docs: [], totalDocs: 0 })),
    find: vi.fn(async () => ({ docs: [], totalDocs: 0 })),
    findByID: vi.fn(async ({ id }) => ({ id })),
  }
}

describe('interaction routes', () => {
  beforeEach(() => {
    vi.resetModules()
    requireFrontendAuthMock.mockReset()
    toAuthFailureResponseMock.mockReset()
    getFrontendPayloadMock.mockReset()
    requireFrontendAuthMock.mockResolvedValue({ ok: true, user })
    toAuthFailureResponseMock.mockImplementation((result: { code: string; status: number }) =>
      Response.json({ code: result.code, ok: false }, { status: result.status }),
    )
  })

  it('checks follow target existence without requiring self-only user read access', async () => {
    const payload = createPayloadMock()
    getFrontendPayloadMock.mockResolvedValue(payload)

    const { POST } = await import('@/app/api/interactions/users/[userId]/follow/route')
    const response = await POST(
      new Request('https://example.com/api/interactions/users/77/follow', {
        method: 'POST',
      }),
      { params: Promise.resolve({ userId: '77' }) },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ following: true, userId: 77 })
    expect(payload.findByID).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'users',
        id: 77,
        overrideAccess: true,
        select: { isActive: true },
      }),
    )
    expect(payload.findByID.mock.calls[0]?.[0]).not.toHaveProperty('user')
    expect(payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'user-follows',
        data: { follower: user.id, following: 77 },
        overrideAccess: false,
        user,
      }),
    )
  })

  it('creates a post comment for a verified frontend user', async () => {
    const payload = createPayloadMock()
    payload.create.mockResolvedValueOnce({
      id: 1001,
      author: { id: user.id, displayName: 'Frontend Test User' },
      content: 'Useful context.',
      createdAt: '2026-05-04T00:00:00.000Z',
    })
    getFrontendPayloadMock.mockResolvedValue(payload)

    const { POST } = await import('@/app/api/interactions/posts/[postId]/comments/route')
    const response = await POST(
      new Request('https://example.com/api/interactions/posts/88/comments', {
        body: JSON.stringify({ content: ' Useful context. ' }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
      { params: Promise.resolve({ postId: '88' }) },
    )

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toMatchObject({
      comment: { content: 'Useful context.' },
      postId: 88,
    })
    expect(payload.findByID).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'posts',
        id: 88,
        overrideAccess: false,
        user,
      }),
    )
    expect(payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'comments',
        data: { author: user.id, content: 'Useful context.', post: 88 },
        overrideAccess: false,
        user,
      }),
    )
  })
})
