// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { validatePostQuota } from '@/hooks/validatePostQuota'
import { projectQuotaForPost } from '@/quota/postQuota'

vi.mock('@/quota/postQuota', () => ({
  projectQuotaForPost: vi.fn(),
}))

const mockedProjectQuotaForPost = vi.mocked(projectQuotaForPost)

describe('validatePostQuota', () => {
  beforeEach(() => {
    mockedProjectQuotaForPost.mockReset()
    mockedProjectQuotaForPost.mockResolvedValue({
      allowed: true,
      quotaBytes: 2048,
      remainingBytes: 1024,
      requiredBytes: 256,
      usedBytes: 1024,
    })
  })

  it('loads the current quota from the user document instead of trusting req.user', async () => {
    const findByID = vi.fn().mockResolvedValue({
      id: 7,
      quotaBytes: 4096,
    })
    const req = {
      payload: {
        findByID,
      },
      user: {
        id: 7,
        roles: ['user'],
      },
    }

    await validatePostQuota({
      collection: {} as never,
      context: {},
      data: {
        author: 7,
        content: { type: 'doc', content: [] },
        title: 'Quota checked post',
      },
      operation: 'create',
      req,
    } as never)

    expect(findByID).toHaveBeenCalledWith({
      collection: 'users',
      depth: 0,
      id: 7,
      overrideAccess: true,
      req,
      select: {
        quotaBytes: true,
      },
    })
    expect(mockedProjectQuotaForPost).toHaveBeenCalledWith(
      expect.objectContaining({
        quotaBytes: 4096,
        userId: 7,
      }),
    )
  })
})
