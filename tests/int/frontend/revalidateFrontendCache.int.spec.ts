import { revalidateTag } from 'next/cache'
import { describe, expect, it, vi } from 'vitest'

import { postCacheTag } from '@/lib/cacheTags'

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}))

import {
  getMediaCacheInvalidationTags,
  getPostCacheInvalidationTags,
  getSchoolCacheInvalidationTags,
  getSchoolSubChannelCacheInvalidationTags,
  getTagCacheInvalidationTags,
  getUserCacheInvalidationTags,
  revalidateMediaCacheAfterChange,
  revalidatePostCacheAfterChange,
  revalidateTagCacheAfterChange,
  revalidateUserCacheAfterChange,
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
      postCacheTag('new-slug'),
      'posts:school:12',
      'posts:school:12:channel:34',
      postCacheTag('old-slug'),
      'posts:school:56',
      'posts:school:56:channel:78',
    ])
  })

  it('invalidates school structure and post list caches for school mutations', () => {
    expect(getSchoolCacheInvalidationTags({ id: 12 })).toEqual([
      'schools',
      'posts:list',
      'school:12',
      'posts:school:12',
    ])
  })

  it('invalidates channel structure and post list caches for channel mutations', () => {
    expect(
      getSchoolSubChannelCacheInvalidationTags({
        id: 34,
        school: 12,
      }),
    ).toEqual(['school-sub-channels', 'posts:list', 'channel:34', 'posts:school:12:channel:34'])
  })

  it('invalidates post caches that embedded tags or media', () => {
    expect(getTagCacheInvalidationTags({ id: 78 })).toEqual(['posts:list', 'tag:78'])
    expect(getMediaCacheInvalidationTags({ id: 56 })).toEqual(['posts:list', 'media:56'])
  })

  it('invalidates post caches that embedded author profiles or avatars', () => {
    expect(
      getUserCacheInvalidationTags({ id: 98, avatar: { id: 56 } }, { id: 98, avatar: { id: 57 } }),
    ).toEqual(['posts:list', 'author:98', 'media:56', 'media:57'])
  })

  it('runs tag and media cache invalidation hooks without failing the mutation', async () => {
    const tagDoc = { id: 78 }
    const mediaDoc = { id: 56 }

    await expect(revalidateTagCacheAfterChange({ doc: tagDoc } as never)).resolves.toBe(tagDoc)
    await expect(revalidateMediaCacheAfterChange({ doc: mediaDoc } as never)).resolves.toBe(
      mediaDoc,
    )
    expect(revalidateTag).toHaveBeenCalledWith('tag:78', 'max')
    expect(revalidateTag).toHaveBeenCalledWith('media:56', 'max')
  })

  it('runs user cache invalidation hooks without failing the mutation', async () => {
    const userDoc = { id: 98, avatar: { id: 56 } }

    await expect(revalidateUserCacheAfterChange({ doc: userDoc } as never)).resolves.toBe(userDoc)
    expect(revalidateTag).toHaveBeenCalledWith('author:98', 'max')
    expect(revalidateTag).toHaveBeenCalledWith('media:56', 'max')
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
