import { cacheTag } from 'next/cache'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const findMock = vi.fn()
const findByIDMock = vi.fn()
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
    findByIDMock.mockReset()
    vi.mocked(cacheTag).mockReset()
    getFrontendPayloadMock.mockReset()
    getFrontendPayloadMock.mockResolvedValue({ find: findMock, findByID: findByIDMock })
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

  it('loads the current user school preference with access enforcement enabled', async () => {
    findMock.mockResolvedValueOnce({ docs: [] })
    findMock.mockResolvedValueOnce({ docs: [{ id: 10, city: 99 }] })
    findMock.mockResolvedValueOnce({ docs: [{ id: 10 }, { id: 11 }, { id: 12 }] })
    findMock.mockResolvedValueOnce({
      docs: [
        {
          id: 70,
          title: 'Same City Story',
          slug: 'same-city-story',
          status: 'published',
          school: { id: 11, name: 'South Campus', slug: 'south-campus', city: 99 },
          subChannel: null,
          author: {
            id: 8,
            displayName: 'Author',
            email: 'secret@example.com',
            roles: ['admin'],
          },
          tags: [],
          excerpt: 'Same city excerpt',
          content: {
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Full body' }] }],
          },
          createdAt: '2026-03-27T10:00:00.000Z',
          updatedAt: '2026-03-27T10:00:00.000Z',
          publishedAt: '2026-03-27T10:00:00.000Z',
        },
      ],
    })
    findByIDMock.mockResolvedValueOnce({ id: 42, school: 10 })

    const { getDiscoverPageData } = await import('@/lib/cmsData')
    const user = { id: 42 } as never

    const result = await getDiscoverPageData(user)

    expect(result).toMatchObject({
      nearbyPosts: [
        {
          id: 70,
          authorName: 'Author',
          previewText: 'Same city excerpt',
          school: { id: 11, name: 'South Campus', slug: 'south-campus', cityId: 99 },
          slug: 'same-city-story',
          title: 'Same City Story',
        },
      ],
      posts: [],
      preferredCitySchoolIds: [11, 12],
      preferredSchoolCityId: 99,
      preferredSchoolId: 10,
    })

    expect(findByIDMock).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'users',
        id: 42,
        overrideAccess: false,
        select: { school: true },
        user,
      }),
    )
    expect(findMock).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'schools',
        depth: 0,
        limit: 1,
        select: { city: true },
        where: {
          and: [
            { id: { equals: 10 } },
            { isActive: { equals: true } },
          ],
        },
      }),
    )
    expect(findMock).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'schools',
        depth: 0,
        limit: 50,
        pagination: false,
        where: {
          and: [
            { city: { equals: 99 } },
            { isActive: { equals: true } },
          ],
        },
      }),
    )
    expect(findMock).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'posts',
        depth: 2,
        limit: 20,
        select: expect.not.objectContaining({
          content: true,
        }),
        sort: '-publishedAt',
        where: {
          and: [
            { status: { equals: 'published' } },
            { school: { in: [11, 12] } },
          ],
        },
      }),
    )

    const serializedNearbyPosts = JSON.stringify(result.nearbyPosts)
    expect(serializedNearbyPosts).not.toContain('secret@example.com')
    expect(serializedNearbyPosts).not.toContain('roles')
    expect(serializedNearbyPosts).not.toContain('content')
  })

  it('selects only feed-card fields and returns sanitized discover page posts', async () => {
    findMock.mockResolvedValueOnce({
      docs: [
        {
          id: 1,
          title: 'Night Market',
          slug: 'night-market',
          status: 'published',
          school: { id: 10, name: 'North Campus', slug: 'north-campus', city: { id: 99 } },
          subChannel: { id: 101, name: 'Events', slug: 'events' },
          author: {
            id: 8,
            displayName: 'Alex',
            email: 'alex@example.com',
            roles: ['admin'],
          },
          tags: [{ id: 201, name: 'Campus Life', slug: 'campus-life' }],
          excerpt: 'Short summary',
          content: {
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Full body' }] }],
          },
          createdAt: '2026-03-27T10:00:00.000Z',
          updatedAt: '2026-03-27T10:00:00.000Z',
          publishedAt: '2026-03-27T10:00:00.000Z',
        },
      ],
    })

    const { getDiscoverPageData } = await import('@/lib/cmsData')

    const result = await getDiscoverPageData()

    const postQuery = findMock.mock.calls.find(
      ([query]) => query.collection === 'posts' && query.where?.status?.equals === 'published',
    )?.[0]
    expect(postQuery).toEqual(
      expect.objectContaining({
        collection: 'posts',
        depth: 2,
        select: expect.objectContaining({
          author: true,
          coverImage: true,
          excerpt: true,
          publishedAt: true,
          school: true,
          slug: true,
          subChannel: true,
          tags: true,
          title: true,
        }),
      }),
    )
    expect(postQuery?.select).not.toHaveProperty('content')
    expect(result.posts).toEqual([
      expect.objectContaining({
        id: 1,
        authorName: 'Alex',
        previewText: 'Short summary',
        school: { id: 10, name: 'North Campus', slug: 'north-campus', cityId: 99 },
        slug: 'night-market',
        tagLabels: ['Campus Life'],
        title: 'Night Market',
      }),
    ])

    const serializedPosts = JSON.stringify(result.posts)
    expect(serializedPosts).not.toContain('alex@example.com')
    expect(serializedPosts).not.toContain('roles')
    expect(serializedPosts).not.toContain('content')
  })

  it('tags same-city school and post queries for cache invalidation', async () => {
    findMock.mockResolvedValueOnce({ docs: [] })
    findMock.mockResolvedValueOnce({ docs: [{ id: 10, city: 99 }] })
    findMock.mockResolvedValueOnce({ docs: [{ id: 10 }, { id: 11 }, { id: 12 }] })
    findMock.mockResolvedValueOnce({ docs: [] })
    findByIDMock.mockResolvedValueOnce({ id: 42, school: 10 })

    const { getDiscoverPageData } = await import('@/lib/cmsData')

    await getDiscoverPageData({ id: 42 } as never)

    const calls = vi.mocked(cacheTag).mock.calls.flat()
    expect(calls).toContain('schools')
    expect(calls).toContain('posts:list')
    expect(calls).toContain('posts:school:11')
    expect(calls).toContain('posts:school:12')
  })
})

describe('build-time CMS query skipping', () => {
  const originalNextPhase = process.env.NEXT_PHASE

  beforeEach(() => {
    vi.resetModules()
    findMock.mockReset()
    findByIDMock.mockReset()
    getFrontendPayloadMock.mockReset()
    getFrontendPayloadMock.mockResolvedValue({ find: findMock, findByID: findByIDMock })
    process.env.NEXT_PHASE = 'phase-production-build'
  })

  afterEach(() => {
    process.env.NEXT_PHASE = originalNextPhase
  })

  it('uses placeholder school params without querying CMS during static generation', async () => {
    const { STATIC_PARAMS_PLACEHOLDER_SLUG, getActiveSchoolParams } = await import('@/lib/cmsData')

    await expect(getActiveSchoolParams()).resolves.toEqual([
      { slug: STATIC_PARAMS_PLACEHOLDER_SLUG },
    ])
    expect(getFrontendPayloadMock).not.toHaveBeenCalled()
  })

  it('uses empty post data without querying CMS during static generation', async () => {
    const { getDiscoverPageData, getPublishedPostBySlug } = await import('@/lib/cmsData')

    await expect(getDiscoverPageData()).resolves.toEqual({
      nearbyPosts: [],
      posts: [],
      preferredCitySchoolIds: [],
      preferredSchoolCityId: null,
      preferredSchoolId: null,
    })
    await expect(getPublishedPostBySlug('any-post')).resolves.toBeNull()
    expect(getFrontendPayloadMock).not.toHaveBeenCalled()
  })
})
