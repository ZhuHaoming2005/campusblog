import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  createPayloadRESTClientMock,
  getEditorPostTagClientMock,
  projectQuotaForPostRESTMock,
  rejectCrossSiteStateChangingRequestMock,
  requireFrontendAuthMock,
  toAuthFailureResponseMock,
} = vi.hoisted(() => ({
  createPayloadRESTClientMock: vi.fn(),
  getEditorPostTagClientMock: vi.fn(),
  projectQuotaForPostRESTMock: vi.fn(),
  rejectCrossSiteStateChangingRequestMock: vi.fn(),
  requireFrontendAuthMock: vi.fn(),
  toAuthFailureResponseMock: vi.fn(),
}))

vi.mock('@/app/api/auth/_lib/frontendAuth', () => ({
  requireFrontendAuth: requireFrontendAuthMock,
  toAuthFailureResponse: toAuthFailureResponseMock,
}))

vi.mock('@/app/api/auth/_lib/stateChangingRequestGuard', () => ({
  rejectCrossSiteStateChangingRequest: rejectCrossSiteStateChangingRequestMock,
}))

vi.mock('@/quota/postQuotaREST', () => ({
  projectQuotaForPostREST: projectQuotaForPostRESTMock,
}))

vi.mock('@/lib/payloadREST', () => {
  class PayloadRESTError extends Error {
    status: number

    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }

  return {
    PayloadRESTError,
    createPayloadRESTClient: createPayloadRESTClientMock,
  }
})

vi.mock('@/app/api/editor/posts/_lib/editorPostTagClient', () => ({
  getEditorPostTagClient: getEditorPostTagClientMock,
}))

describe('editor post routes resolve custom tags after quota validation', () => {
  beforeEach(() => {
    vi.resetModules()
    createPayloadRESTClientMock.mockReset()
    getEditorPostTagClientMock.mockReset()
    projectQuotaForPostRESTMock.mockReset()
    rejectCrossSiteStateChangingRequestMock.mockReset()
    requireFrontendAuthMock.mockReset()
    toAuthFailureResponseMock.mockReset()

    rejectCrossSiteStateChangingRequestMock.mockResolvedValue(null)
    requireFrontendAuthMock.mockResolvedValue({
      ok: true,
      user: { id: 5 },
    })
    projectQuotaForPostRESTMock.mockResolvedValue({
      allowed: false,
      remainingBytes: 100,
      requiredBytes: 200,
    })
  })

  it('does not create custom tags when create request fails quota validation', async () => {
    const payload = {
      create: vi.fn(async () => ({ id: 99, name: 'Custom' })),
      find: vi.fn(async () => ({ docs: [] })),
      findByID: vi.fn(async () => ({ id: 5, quotaBytes: 100 })),
    }
    createPayloadRESTClientMock.mockReturnValue(payload)

    const { POST } = await import('@/app/api/editor/posts/route')

    const response = await POST(
      new Request('https://example.com/api/editor/posts', {
        body: JSON.stringify({
          content: { type: 'doc', content: [] },
          school: 1,
          status: 'published',
          tags: [{ name: 'Custom' }],
          title: 'Quota blocked post',
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(400)
    expect(getEditorPostTagClientMock).not.toHaveBeenCalled()
    expect(payload.find).not.toHaveBeenCalledWith('tags', expect.anything())
    expect(payload.create).not.toHaveBeenCalled()
  })

  it('does not create custom tags when update request fails quota validation', async () => {
    const payload = {
      create: vi.fn(async () => ({ id: 99, name: 'Custom' })),
      find: vi.fn(async () => ({ docs: [] })),
      findByID: vi
        .fn()
        .mockResolvedValueOnce({ id: 5, quotaBytes: 100 })
        .mockResolvedValueOnce({ coverImage: null, id: 10, slug: 'draft', status: 'draft' }),
      update: vi.fn(),
    }
    createPayloadRESTClientMock.mockReturnValue(payload)

    const { PATCH } = await import('@/app/api/editor/posts/[id]/route')

    const response = await PATCH(
      new Request('https://example.com/api/editor/posts/10', {
        body: JSON.stringify({
          content: { type: 'doc', content: [] },
          school: 1,
          status: 'published',
          tags: [{ name: 'Custom' }],
          title: 'Quota blocked post',
        }),
        headers: { 'content-type': 'application/json' },
        method: 'PATCH',
      }),
      { params: Promise.resolve({ id: '10' }) },
    )

    expect(response.status).toBe(400)
    expect(getEditorPostTagClientMock).not.toHaveBeenCalled()
    expect(payload.find).not.toHaveBeenCalledWith('tags', expect.anything())
    expect(payload.create).not.toHaveBeenCalled()
    expect(payload.update).not.toHaveBeenCalled()
  })
})
