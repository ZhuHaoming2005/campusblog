import { describe, expect, it, vi } from 'vitest'

import { cleanupAllOrphanMedia } from '@/media/orphanCleanup'

describe('orphan media cleanup', () => {
  it('reuses the full reference scan when deleting all orphan media', async () => {
    const find = vi.fn(async ({ collection }: { collection: string }) => {
      if (collection === 'media') {
        return {
          docs: [
            { id: 1 },
            { id: 2 },
          ],
          totalPages: 1,
        }
      }

      if (collection === 'posts') {
        return {
          docs: [{ coverImage: 1 }],
          totalPages: 1,
        }
      }

      if (collection === 'users') {
        return {
          docs: [],
          totalPages: 1,
        }
      }

      throw new Error(`Unexpected collection ${collection}`)
    })
    const deleteMock = vi.fn(async () => ({}))

    const result = await cleanupAllOrphanMedia({
      payload: {
        delete: deleteMock,
        find,
      } as never,
    })

    expect(result.deletedIds).toEqual([2])
    expect(result.referencedCount).toBe(1)
    expect(result.scannedCount).toBe(2)
    expect(find).toHaveBeenCalledTimes(3)
    expect(deleteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'media',
        id: 2,
        overrideAccess: true,
      }),
    )
  })
})
