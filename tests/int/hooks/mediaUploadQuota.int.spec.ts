// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'

import { setMediaOwner, validateMediaUploadQuota } from '@/hooks/validateMediaUploadQuota'

describe('media upload ownership and quota hooks', () => {
  it('assigns the current verified user as media owner on create', () => {
    const data = setMediaOwner({
      collection: {} as never,
      context: {},
      data: {
        alt: 'cover image',
      },
      operation: 'create',
      req: {
        user: {
          id: 11,
          roles: ['user'],
        },
      },
    } as never)

    expect(data).toMatchObject({
      alt: 'cover image',
      owner: 11,
    })
  })

  it('rejects uploads that would exceed the owner media quota', async () => {
    const req = {
      payload: {
        find: vi.fn().mockResolvedValue({
          docs: [
            {
              filesize: 900,
            },
          ],
          page: 1,
          totalPages: 1,
        }),
        findByID: vi.fn().mockResolvedValue({
          id: 11,
          quotaBytes: 1000,
        }),
      },
      user: {
        id: 11,
        roles: ['user'],
      },
    }

    await expect(
      validateMediaUploadQuota({
        collection: {} as never,
        context: {},
        data: {
          filesize: 200,
          owner: 11,
        },
        operation: 'create',
        req,
      } as never),
    ).rejects.toThrow('Media upload quota exceeded.')
  })
})
