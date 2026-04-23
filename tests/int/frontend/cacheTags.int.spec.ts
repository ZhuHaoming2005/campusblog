import { describe, expect, it } from 'vitest'

import {
  POST_LIST_CACHE_TAG,
  getPostRevalidationTags,
  postCacheTag,
  postsBySchoolCacheTag,
  postsBySchoolChannelCacheTag,
} from '@/lib/cacheTags'

describe('cache tag helpers', () => {
  it('builds scoped post tags for list, detail, school, and channel caches', () => {
    expect(postCacheTag('hello-world')).toBe('post:hello-world')
    expect(postsBySchoolCacheTag(12)).toBe('posts:school:12')
    expect(postsBySchoolChannelCacheTag(12, 34)).toBe('posts:school:12:channel:34')
  })

  it('deduplicates all affected post tags when a post moves between scopes', () => {
    expect(
      getPostRevalidationTags(
        { slug: 'new-slug', schoolId: 12, subChannelId: 34 },
        { slug: 'old-slug', schoolId: 12, subChannelId: 56 },
      ),
    ).toEqual([
      POST_LIST_CACHE_TAG,
      'post:new-slug',
      'posts:school:12',
      'posts:school:12:channel:34',
      'post:old-slug',
      'posts:school:12:channel:56',
    ])
  })
})
