import { revalidateTag } from 'next/cache'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}))

import {
  getPostCacheInvalidationTags,
  getSchoolCacheInvalidationTags,
  getSchoolSubChannelCacheInvalidationTags,
  revalidatePostCacheAfterChange,
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

  it('does not fail a post mutation when Next cache revalidation throws', async () => {
    const doc = {
      id: 1,
      school: 12,
      slug: 'cache-failure',
      subChannel: 34,
    }
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.mocked(revalidateTag).mockImplementationOnce(() => {
      throw new Error('cache unavailable')
    })

    try {
      await expect(
        revalidatePostCacheAfterChange({
          doc,
          previousDoc: null,
        } as never),
      ).resolves.toBe(doc)
      expect(warnSpy).toHaveBeenCalled()
    } finally {
      warnSpy.mockRestore()
    }
  })
})
