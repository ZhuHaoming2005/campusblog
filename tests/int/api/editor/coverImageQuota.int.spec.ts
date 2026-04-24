import { describe, expect, it } from 'vitest'

import { resolveCoverImageForQuota } from '@/app/api/editor/posts/_lib/coverImageQuota'

describe('editor post cover image quota projection', () => {
  it('uses the existing cover image only when the request omits coverImage', () => {
    expect(
      resolveCoverImageForQuota({
        existingCoverImage: 42,
        submittedCoverImage: undefined,
      }),
    ).toBe(42)
  })

  it('keeps an explicit null cover image as a clear operation', () => {
    expect(
      resolveCoverImageForQuota({
        existingCoverImage: 42,
        submittedCoverImage: null,
      }),
    ).toBeNull()
  })

  it('uses a submitted cover image id over the existing value', () => {
    expect(
      resolveCoverImageForQuota({
        existingCoverImage: 42,
        submittedCoverImage: '17',
      }),
    ).toBe(17)
  })
})
