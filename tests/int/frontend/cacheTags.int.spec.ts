import { describe, expect, it } from 'vitest'

import {
  CMS_CONTENT_CACHE_LIFE,
  CMS_STRUCTURE_CACHE_LIFE,
  NEXT_CUSTOM_CACHE_TAG_LIMIT,
  POST_LIST_CACHE_TAG,
  RELATIONSHIP_CACHE_TAG_BUDGET,
  authorCacheTag,
  getPostRevalidationTags,
  getPostRelationshipCacheTags,
  mediaCacheTag,
  postCacheTag,
  postsBySchoolCacheTag,
  postsBySchoolChannelCacheTag,
  schoolCacheTag,
  schoolSubChannelCacheTag,
  tagCacheTag,
} from '@/lib/cacheTags'

describe('cache tag helpers', () => {
  it('keeps a finite fallback window for CMS caches', () => {
    expect(CMS_CONTENT_CACHE_LIFE).toMatchObject({
      stale: expect.any(Number),
      revalidate: expect.any(Number),
      expire: expect.any(Number),
    })
    expect(CMS_STRUCTURE_CACHE_LIFE).toMatchObject({
      stale: expect.any(Number),
      revalidate: expect.any(Number),
      expire: expect.any(Number),
    })
    expect(Number.isFinite(CMS_CONTENT_CACHE_LIFE.revalidate)).toBe(true)
    expect(Number.isFinite(CMS_CONTENT_CACHE_LIFE.expire)).toBe(true)
    expect(CMS_CONTENT_CACHE_LIFE.expire).toBeGreaterThan(CMS_CONTENT_CACHE_LIFE.revalidate)
    expect(Number.isFinite(CMS_STRUCTURE_CACHE_LIFE.revalidate)).toBe(true)
    expect(Number.isFinite(CMS_STRUCTURE_CACHE_LIFE.expire)).toBe(true)
    expect(CMS_STRUCTURE_CACHE_LIFE.expire).toBeGreaterThan(CMS_STRUCTURE_CACHE_LIFE.revalidate)
  })

  it('builds scoped post tags for list, detail, school, and channel caches', () => {
    expect(postCacheTag('hello-world')).toMatch(/^post:[a-f0-9]{16}$/)
    expect(postsBySchoolCacheTag(12)).toBe('posts:school:12')
    expect(postsBySchoolChannelCacheTag(12, 34)).toBe('posts:school:12:channel:34')
  })

  it('keeps post detail tags within the Next.js custom tag length limit', () => {
    expect(postCacheTag('a'.repeat(600))).toHaveLength('post:'.length + 16)
  })

  it('builds relationship cache tags for embedded post relations', () => {
    expect(schoolCacheTag(12)).toBe('school:12')
    expect(schoolSubChannelCacheTag(34)).toBe('channel:34')
    expect(mediaCacheTag(56)).toBe('media:56')
    expect(tagCacheTag(78)).toBe('tag:78')
    expect(authorCacheTag(98)).toBe('author:98')

    expect(
      getPostRelationshipCacheTags([
        {
          author: { id: 98, avatar: { id: 55 } },
          school: { id: 12 },
          subChannel: 34,
          coverImage: { id: 56 },
          tags: [{ id: 78 }, 90],
        },
        {
          author: 99,
          school: 12,
          subChannel: { id: 35 },
          coverImage: null,
          tags: [],
        },
      ]),
    ).toEqual([
      'author:98',
      'media:55',
      'school:12',
      'channel:34',
      'media:56',
      'tag:78',
      'author:99',
      'channel:35',
    ])
  })

  it('allows all embedded post tags for detail caches only', () => {
    const post = {
      author: 98,
      school: 12,
      tags: [{ id: 78 }, 90],
    }

    expect(getPostRelationshipCacheTags(post)).toEqual(['author:98', 'school:12', 'tag:78'])
    expect(getPostRelationshipCacheTags(post, { includeAllPostTags: true })).toEqual([
      'author:98',
      'school:12',
      'tag:78',
      'tag:90',
    ])
  })

  it('caps relationship tags below the Next.js per-entry custom tag limit', () => {
    const posts = Array.from({ length: NEXT_CUSTOM_CACHE_TAG_LIMIT + 10 }, (_, index) => ({
      author: index + 1,
      school: index + 1,
      subChannel: index + 1,
      coverImage: index + 1,
      tags: [{ id: index + 1 }],
    }))

    expect(getPostRelationshipCacheTags(posts)).toHaveLength(RELATIONSHIP_CACHE_TAG_BUDGET)
  })

  it('deduplicates all affected post tags when a post moves between scopes', () => {
    expect(
      getPostRevalidationTags(
        { slug: 'new-slug', schoolId: 12, subChannelId: 34 },
        { slug: 'old-slug', schoolId: 12, subChannelId: 56 },
      ),
    ).toEqual([
      POST_LIST_CACHE_TAG,
      postCacheTag('new-slug'),
      'posts:school:12',
      'posts:school:12:channel:34',
      postCacheTag('old-slug'),
      'posts:school:12:channel:56',
    ])
  })
})
