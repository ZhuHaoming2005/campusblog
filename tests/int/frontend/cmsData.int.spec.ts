import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const findMock = vi.fn()
const getFrontendPayloadMock = vi.fn()

vi.mock('server-only', () => ({}))

vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}))

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

describe('build-time CMS structure fallback', () => {
  const originalNextPhase = process.env.NEXT_PHASE

  beforeEach(() => {
    vi.resetModules()
    findMock.mockReset()
    getFrontendPayloadMock.mockReset()
    getFrontendPayloadMock.mockResolvedValue({ find: findMock })
    process.env.NEXT_PHASE = 'phase-production-build'
  })

  afterEach(() => {
    process.env.NEXT_PHASE = originalNextPhase
  })

  it('uses placeholder school params when local D1 schema is absent during static generation', async () => {
    findMock.mockRejectedValueOnce(new Error('D1_ERROR: no such table: schools: SQLITE_ERROR'))

    const { STATIC_PARAMS_PLACEHOLDER_SLUG, getActiveSchoolParams } = await import('@/lib/cmsData')

    await expect(getActiveSchoolParams()).resolves.toEqual([
      { slug: STATIC_PARAMS_PLACEHOLDER_SLUG },
    ])
    expect(getFrontendPayloadMock).not.toHaveBeenCalled()
  })

  it('uses empty post data when local D1 posts schema is absent during static generation', async () => {
    findMock.mockRejectedValue(new Error('D1_ERROR: no such table: posts: SQLITE_ERROR'))

    const { getDiscoverPageData, getPublishedPostBySlug } = await import('@/lib/cmsData')

    await expect(getDiscoverPageData()).resolves.toEqual({ posts: [] })
    await expect(getPublishedPostBySlug('any-post')).resolves.toBeNull()
    expect(getFrontendPayloadMock).not.toHaveBeenCalled()
  })
})
