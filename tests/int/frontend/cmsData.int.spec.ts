import { beforeEach, describe, expect, it, vi } from 'vitest'

const findMock = vi.fn()
const getFrontendPayloadMock = vi.fn()

vi.mock('server-only', () => ({}))

vi.mock('@/lib/frontendSession', () => ({
  getFrontendPayload: getFrontendPayloadMock,
}))

describe('getVisiblePostBySlug', () => {
  beforeEach(() => {
    vi.resetModules()
    findMock.mockReset()
    getFrontendPayloadMock.mockReset()
    getFrontendPayloadMock.mockResolvedValue({ find: findMock })
  })

  it('allows the author to resolve a hidden post with access enforcement enabled', async () => {
    findMock.mockResolvedValueOnce({
      docs: [{ id: 7, slug: 'secret-post', status: 'hidden' }],
    })

    const { getVisiblePostBySlug } = await import('@/lib/cmsData')
    const author = { id: 42 } as never

    const post = await getVisiblePostBySlug('secret-post', author)

    expect(post?.status).toBe('hidden')
    expect(findMock).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'posts',
        user: author,
        overrideAccess: false,
        where: {
          and: [
            { slug: { equals: 'secret-post' } },
            {
              or: [
                { status: { equals: 'published' } },
                {
                  and: [
                    { status: { equals: 'hidden' } },
                    { author: { equals: 42 } },
                  ],
                },
              ],
            },
          ],
        },
      }),
    )
  })

  it('keeps anonymous slug lookups limited to published posts', async () => {
    findMock.mockResolvedValueOnce({ docs: [] })

    const { getVisiblePostBySlug } = await import('@/lib/cmsData')

    await getVisiblePostBySlug('secret-post', null)

    expect(findMock).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'posts',
        where: {
          and: [{ slug: { equals: 'secret-post' } }, { status: { equals: 'published' } }],
        },
      }),
    )
    expect(findMock).not.toHaveBeenCalledWith(expect.objectContaining({ overrideAccess: false }))
  })
})
