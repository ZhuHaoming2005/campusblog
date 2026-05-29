import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  POST_LIST_CACHE_TAG,
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
    findMock.mockResolvedValueOnce({
      docs: [post],
      totalDocs: 1,
    })

    const { searchPublishedPosts } = await import('@/lib/searchData')

    const result = await searchPublishedPosts({ query: 'campus life', schoolId: 10 })

    expect(result.totalDocs).toBe(1)
    expect(result.posts[0]).toEqual(post)
    expect(result.posts[0]).not.toHaveProperty('content')
    expect(findMock).toHaveBeenCalledWith({
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
            or: [
              { title: { contains: 'campus life' } },
              { excerpt: { contains: 'campus life' } },
            ],
          },
        ],
      },
    })
    expect(cacheTagMock.mock.calls.flat()).toEqual(
      expect.arrayContaining([
        POST_LIST_CACHE_TAG,
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

    expect(findMock).toHaveBeenCalledTimes(2)
    expect(findMock.mock.calls[1]?.[0]).toEqual({
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

  it('queries Payload for a single-character search term', async () => {
    findMock.mockResolvedValueOnce({
      docs: [],
      totalDocs: 0,
    })

    const { searchPublishedPosts } = await import('@/lib/searchData')

    await expect(searchPublishedPosts({ query: 'a' })).resolves.toEqual({
      posts: [],
      totalDocs: 0,
    })
    expect(findMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          and: [
            { status: { equals: 'published' } },
            {
              or: [{ title: { contains: 'a' } }, { excerpt: { contains: 'a' } }],
            },
          ],
        },
      }),
    )
  })
})
