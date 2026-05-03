import { afterEach, describe, expect, it, vi } from 'vitest'

import { createPayloadRESTClient } from '../../../src/lib/payloadREST'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createPayloadRESTClient', () => {
  it('forwards CSRF provenance headers for internal Payload REST calls', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 1, quotaBytes: 1024 }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      }),
    )
    const request = new Request('https://example.com/api/editor/posts', {
      headers: {
        'accept-language': 'zh-CN',
        cookie: 'payload-token=abc',
        origin: 'https://example.com',
        'sec-fetch-site': 'same-origin',
      },
      method: 'POST',
    })

    const client = createPayloadRESTClient(request)

    await client.findByID('users', 1, { depth: 0 })

    const forwardedHeaders = fetchMock.mock.calls[0]?.[1]?.headers
    expect(forwardedHeaders).toBeInstanceOf(Headers)
    expect((forwardedHeaders as Headers).get('cookie')).toBe('payload-token=abc')
    expect((forwardedHeaders as Headers).get('origin')).toBe('https://example.com')
    expect((forwardedHeaders as Headers).get('sec-fetch-site')).toBe('same-origin')
  })
})
