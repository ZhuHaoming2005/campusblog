import { describe, expect, it } from 'vitest'

import {
  getPostCacheInvalidationTags,
  getSchoolCacheInvalidationTags,
  getSchoolSubChannelCacheInvalidationTags,
} from '@/hooks/revalidateFrontendCache'

describe('frontend cache invalidation hooks', () => {
  it('includes new and previous post scopes when a post moves', () => {
    expect(
      getPostCacheInvalidationTags(
        {
          school: 12,
          slug: 'new-slug',
          subChannel: 34,
        },
        {
          school: 56,
          slug: 'old-slug',
          subChannel: 78,
        },
      ),
    ).toEqual([
      'posts:list',
      'post:new-slug',
      'posts:school:12',
      'posts:school:12:channel:34',
      'post:old-slug',
      'posts:school:56',
      'posts:school:56:channel:78',
    ])
  })

  it('invalidates school structure and post list caches for school mutations', () => {
    expect(getSchoolCacheInvalidationTags()).toEqual(['schools', 'posts:list'])
  })

  it('invalidates channel structure and post list caches for channel mutations', () => {
    expect(getSchoolSubChannelCacheInvalidationTags()).toEqual([
      'school-sub-channels',
      'posts:list',
    ])
  })
})
