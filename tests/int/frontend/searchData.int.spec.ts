import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  POST_LIST_CACHE_TAG,
  TAGS_CACHE_TAG,
  authorCacheTag,
  mediaCacheTag,
  postsBySchoolCacheTag,
  schoolCacheTag,
  schoolSubChannelCacheTag,
  tagCacheTag,
} from '@/lib/cacheTags'

const { cacheLifeMock, cacheTagMock, findMock, getFrontendPayloadMock } = vi.hoisted(() => ({
  cacheLifeMock: vi.fn(),
  cacheTagMock: vi.fn(),
  findMock: vi.fn(),
  getFrontendPayloadMock: vi.fn(),
}))

vi.mock('server-only', () => ({}))

vi.mock('next/cache', () => ({
  cacheLife: cacheLifeMock,
  cacheTag: cacheTagMock,
}))

vi.mock('@/app/(frontend)/lib/frontendSession', () => ({
  getFrontendPayload: getFrontendPayloadMock,
}))

describe('normalizeSearchQuery', () => {
  it('trims array or string input and caps the search term length', async () => {
    const { normalizeSearchQuery, SEARCH_QUERY_MAX_LENGTH } = await import('@/lib/searchData')

    expect(normalizeSearchQuery(['  campus life  '])).toBe('campus life')
    expect(normalizeSearchQuery(undefined)).toBe('')
    expect(normalizeSearchQuery('x'.repeat(SEARCH_QUERY_MAX_LENGTH + 25))).toHaveLength(
      SEARCH_QUERY_MAX_LENGTH,
    )
  })
})

describe('searchPublishedPosts', () => {
  beforeEach(() => {
    vi.resetModules()
    cacheLifeMock.mockReset()
    cacheTagMock.mockReset()
    findMock.mockReset()
    getFrontendPayloadMock.mockReset()
    getFrontendPayloadMock.mockResolvedValue({ find: findMock })
  })

  it('selects only search-card fields and tags relationship dependencies', async () => {
    const author = { id: 2, displayName: 'Alex', avatar: { id: 3, url: '/avatar.png' } }
    const school = { id: 10, name: 'North Campus' }
    const subChannel = { id: 11, name: 'News' }
    const coverImage = { id: 12, url: '/cover.png', alt: 'Cover' }
    const tag = { id: 13, name: 'Campus' }
    const post = {
      id: 1,
      title: 'Campus Life',
      slug: 'campus-life',
      excerpt: 'A concise campus update.',
      coverImage,
      author,
      tags: [tag],
      school,
      subChannel,
      publishedAt: '2026-05-01T00:00:00.000Z',
      createdAt: '2026-04-30T00:00:00.000Z',
      updatedAt: '2026-05-02T00:00:00.000Z',
    }
    findMock
      .mockResolvedValueOnce({
        docs: [],
        totalDocs: 0,
      })
      .mockResolvedValueOnce({
        docs: [post],
        totalDocs: 1,
      })

    const { searchPublishedPosts } = await import('@/lib/searchData')

    const result = await searchPublishedPosts({ query: 'campus life', schoolId: 10 })

    expect(result.totalDocs).toBe(1)
    expect(result.posts[0]).toEqual(post)
    expect(result.posts[0]).not.toHaveProperty('content')
    expect(findMock).toHaveBeenNthCalledWith(1, {
      collection: 'tags',
      depth: 0,
      limit: 20,
      overrideAccess: false,
      where: {
        and: [
          { isActive: { equals: true } },
          {
            or: [
              { name: { contains: 'campus life' } },
              { slug: { contains: 'campus life' } },
              { description: { contains: 'campus life' } },
            ],
          },
        ],
      },
    })
    expect(findMock).toHaveBeenNthCalledWith(2, {
      collection: 'posts',
      depth: 1,
      limit: 20,
      overrideAccess: false,
      select: {
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        author: true,
        tags: true,
        school: true,
        subChannel: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      sort: '-publishedAt',
      where: {
        and: [
          { status: { equals: 'published' } },
          { school: { equals: 10 } },
          {
            or: [{ title: { contains: 'campus life' } }, { excerpt: { contains: 'campus life' } }],
          },
        ],
      },
    })
    expect(cacheTagMock.mock.calls.flat()).toEqual(
      expect.arrayContaining([
        POST_LIST_CACHE_TAG,
        TAGS_CACHE_TAG,
        postsBySchoolCacheTag(10),
        authorCacheTag(2),
        mediaCacheTag(3),
        schoolCacheTag(10),
        schoolSubChannelCacheTag(11),
        mediaCacheTag(12),
        tagCacheTag(13),
      ]),
    )
  })

  it('returns an empty result without querying Payload for blank input', async () => {
    const { searchPublishedPosts } = await import('@/lib/searchData')

    await expect(searchPublishedPosts({ query: '   ' })).resolves.toEqual({
      posts: [],
      totalDocs: 0,
    })
    expect(findMock).not.toHaveBeenCalled()
  })

  it('matches published posts by tag text', async () => {
    findMock
      .mockResolvedValueOnce({
        docs: [{ id: 13, name: 'Campus Life' }],
        totalDocs: 1,
      })
      .mockResolvedValueOnce({
        docs: [],
        totalDocs: 0,
      })

    const { searchPublishedPosts } = await import('@/lib/searchData')

    await expect(searchPublishedPosts({ query: 'campus' })).resolves.toEqual({
      posts: [],
      totalDocs: 0,
    })

    expect(findMock).toHaveBeenNthCalledWith(1, {
      collection: 'tags',
      depth: 0,
      limit: 20,
      overrideAccess: false,
      where: {
        and: [
          { isActive: { equals: true } },
          {
            or: [
              { name: { contains: 'campus' } },
              { slug: { contains: 'campus' } },
              { description: { contains: 'campus' } },
            ],
          },
        ],
      },
    })
    expect(findMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        collection: 'posts',
        where: {
          and: [
            { status: { equals: 'published' } },
            {
              or: [
                { title: { contains: 'campus' } },
                { excerpt: { contains: 'campus' } },
                { tags: { in: [13] } },
              ],
            },
          ],
        },
      }),
    )
  })

  it('includes tag matches from later tag result pages', async () => {
    const firstPageTagIds = Array.from({ length: 20 }, (_, index) => ({ id: index + 1 }))
    findMock
      .mockResolvedValueOnce({
        docs: firstPageTagIds,
        totalDocs: 21,
        totalPages: 2,
      })
      .mockResolvedValueOnce({
        docs: [{ id: 21 }],
        totalDocs: 21,
        totalPages: 2,
      })
      .mockResolvedValueOnce({
        docs: [],
        totalDocs: 0,
      })

    const { searchPublishedPosts } = await import('@/lib/searchData')

    await searchPublishedPosts({ query: 'campus' })

    expect(findMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        collection: 'tags',
        page: 2,
      }),
    )
    expect(findMock).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        collection: 'posts',
        where: {
          and: [
            { status: { equals: 'published' } },
            {
              or: [
                { title: { contains: 'campus' } },
                { excerpt: { contains: 'campus' } },
                { tags: { in: [...firstPageTagIds.map((tag) => tag.id), 21] } },
              ],
            },
          ],
        },
      }),
    )
  })

  it('hydrates a bounded content preview only for posts without excerpts', async () => {
    const postWithoutExcerpt = {
      id: 1,
      title: 'Campus Body Match',
      slug: 'campus-body-match',
      excerpt: null as string | null,
      publishedAt: '2026-05-01T00:00:00.000Z',
      createdAt: '2026-04-30T00:00:00.000Z',
      updatedAt: '2026-05-02T00:00:00.000Z',
    }
    findMock
      .mockResolvedValueOnce({
        docs: [],
        totalDocs: 0,
      })
      .mockResolvedValueOnce({
        docs: [postWithoutExcerpt],
        totalDocs: 1,
      })
      .mockResolvedValueOnce({
        docs: [
          {
            id: 1,
            content: {
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Body preview fallback from the article.' }],
                },
              ],
            },
          },
        ],
        totalDocs: 1,
      })

    const { searchPublishedPosts } = await import('@/lib/searchData')

    const result = await searchPublishedPosts({ query: 'campus' })

    expect(findMock).toHaveBeenCalledTimes(3)
    expect(findMock.mock.calls[2]?.[0]).toEqual({
      collection: 'posts',
      depth: 0,
      limit: 1,
      overrideAccess: false,
      select: {
        content: true,
      },
      where: {
        id: {
          in: [1],
        },
      },
    })
    expect(result.posts[0]).toEqual({
      ...postWithoutExcerpt,
      contentPreview: 'Body preview fallback from the article.',
    })
    expect(result.posts[0]).not.toHaveProperty('content')
  })

  it('skips tag prequery for a single-character search term', async () => {
    findMock.mockResolvedValueOnce({
      docs: [],
      totalDocs: 0,
    })

    const { searchPublishedPosts } = await import('@/lib/searchData')

    await expect(searchPublishedPosts({ query: 'a' })).resolves.toEqual({
      posts: [],
      totalDocs: 0,
    })
    expect(findMock).toHaveBeenCalledTimes(1)
    expect(findMock).toHaveBeenNthCalledWith(1, expect.objectContaining({ collection: 'posts' }))
    expect(findMock).toHaveBeenNthCalledWith(1, expect.not.objectContaining({ collection: 'tags' }))
  })

  it('caps tag prequery results before building the posts query', async () => {
    const tagPage = (offset: number) =>
      Array.from({ length: 20 }, (_, index) => ({ id: offset + index + 1 }))
    findMock
      .mockResolvedValueOnce({
        docs: tagPage(0),
        totalDocs: 80,
        totalPages: 4,
      })
      .mockResolvedValueOnce({
        docs: tagPage(20),
        totalDocs: 80,
        totalPages: 4,
      })
      .mockResolvedValueOnce({
        docs: tagPage(40),
        totalDocs: 80,
        totalPages: 4,
      })
      .mockResolvedValueOnce({
        docs: [],
        totalDocs: 0,
        totalPages: 4,
      })
      .mockResolvedValueOnce({
        docs: [],
        totalDocs: 0,
      })

    const { searchPublishedPosts, SEARCH_TAG_MATCH_MAX_IDS } = await import('@/lib/searchData')

    await searchPublishedPosts({ query: 'campus' })

    expect(findMock).toHaveBeenCalledTimes(4)
    expect(findMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'tags', page: 4 }),
    )
    expect(findMock).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        collection: 'posts',
        where: {
          and: [
            { status: { equals: 'published' } },
            {
              or: [
                { title: { contains: 'campus' } },
                { excerpt: { contains: 'campus' } },
                {
                  tags: {
                    in: Array.from({ length: SEARCH_TAG_MATCH_MAX_IDS }, (_, index) => index + 1),
                  },
                },
              ],
            },
          ],
        },
      }),
    )
  })
})
