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
    findByID: vi.fn(async ({ collection, id }) => ({
      id,
      ...(collection === 'school-sub-channels' ? { school: 12 } : {}),
    })),
  }
}

describe('subscription routes', () => {
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

  it('creates an idempotent school subscription with Payload access enforced', async () => {
    const payload = createPayloadMock()
    getFrontendPayloadMock.mockResolvedValue(payload)

    const { POST } = await import('@/app/api/subscriptions/schools/route')
    const response = await POST(
      new Request('https://example.com/api/subscriptions/schools', {
        body: JSON.stringify({ schoolId: 12 }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ subscribed: true })
    expect(payload.findByID).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'schools',
        id: 12,
        overrideAccess: false,
        user,
      }),
    )
    expect(payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'school-subscriptions',
        data: { school: 12, user: user.id },
        overrideAccess: false,
        user,
      }),
    )
  })

  it('treats a concurrent unique conflict as an idempotent school subscription success', async () => {
    const payload = createPayloadMock()
    payload.create.mockRejectedValueOnce(new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed'))
    getFrontendPayloadMock.mockResolvedValue(payload)

    const { POST } = await import('@/app/api/subscriptions/schools/route')
    const response = await POST(
      new Request('https://example.com/api/subscriptions/schools', {
        body: JSON.stringify({ schoolId: 12 }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ schoolId: 12, subscribed: true })
  })

  it('removes school subscriptions and cascades matching channel subscriptions', async () => {
    const payload = createPayloadMock()
    getFrontendPayloadMock.mockResolvedValue(payload)

    const { DELETE } = await import('@/app/api/subscriptions/schools/route')
    const response = await DELETE(
      new Request('https://example.com/api/subscriptions/schools', {
        body: JSON.stringify({ schoolId: 12 }),
        headers: { 'content-type': 'application/json' },
        method: 'DELETE',
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ subscribed: false })
    expect(payload.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'school-sub-channel-subscriptions',
        overrideAccess: false,
        user,
        where: {
          and: [{ user: { equals: user.id } }, { school: { equals: 12 } }],
        },
      }),
    )
    expect(payload.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'school-subscriptions',
        overrideAccess: false,
        user,
        where: {
          and: [{ user: { equals: user.id } }, { school: { equals: 12 } }],
        },
      }),
    )
  })

  it('creates a channel subscription after deriving its parent school', async () => {
    const payload = createPayloadMock()
    getFrontendPayloadMock.mockResolvedValue(payload)

    const { POST } = await import('@/app/api/subscriptions/channels/route')
    const response = await POST(
      new Request('https://example.com/api/subscriptions/channels', {
        body: JSON.stringify({ channelId: 77 }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ subscribed: true })
    expect(payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'school-sub-channel-subscriptions',
        data: { channel: 77, school: 12, user: user.id },
        overrideAccess: false,
        user,
      }),
    )
  })
})
