import { describe, expect, it, vi } from 'vitest'

type BoundStatement = {
  all: ReturnType<typeof vi.fn>
  run: ReturnType<typeof vi.fn>
}

type PreparedStatement = {
  bind: (...values: unknown[]) => BoundStatement
}

describe('media cleanup cron', () => {
  it('deletes orphaned media directly from D1 and R2', async () => {
    const allMediaRows = [
      { id: 1, filename: 'cover.png' },
      { id: 2, filename: 'avatar.png' },
      { id: 3, filename: 'orphan.png' },
      { id: 4, filename: null },
    ]
    const postRows = [
      {
        cover_image_id: 1,
        content: JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'image',
              attrs: { mediaId: 2 },
            },
          ],
        }),
      },
      {
        cover_image_id: null,
        content: '{invalid-json}',
      },
    ]
    const userRows = [{ avatar_id: 2 }]

    const mediaDeleteRun = vi.fn().mockResolvedValue({})
    const mediaDeleteAll = vi.fn()
    const mediaDeleteStatement: PreparedStatement = {
      bind: vi.fn(() => ({
        all: mediaDeleteAll,
        run: mediaDeleteRun,
      })),
    }

    const allMediaAll = vi.fn().mockResolvedValue({ results: allMediaRows })
    const allMediaStatement: PreparedStatement = {
      bind: vi.fn(() => ({
        all: allMediaAll,
        run: vi.fn(),
      })),
    }

    const postAll = vi.fn().mockResolvedValue({ results: postRows })
    const postStatement: PreparedStatement = {
      bind: vi.fn(() => ({
        all: postAll,
        run: vi.fn(),
      })),
    }

    const userAll = vi.fn().mockResolvedValue({ results: userRows })
    const userStatement: PreparedStatement = {
      bind: vi.fn(() => ({
        all: userAll,
        run: vi.fn(),
      })),
    }

    const prepare = vi.fn((sql: string) => {
      if (sql.includes('DELETE FROM media')) return mediaDeleteStatement
      if (sql.includes('FROM media')) return allMediaStatement
      if (sql.includes('FROM posts')) return postStatement
      if (sql.includes('FROM users')) return userStatement

      throw new Error(`Unexpected SQL: ${sql}`)
    })

    const deleteObject = vi.fn().mockResolvedValue(undefined)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const env = {
      D1: { prepare },
      R2: { delete: deleteObject },
    }

    const { runMediaCleanupCron } = await import('@/worker/mediaCleanupCron')

    await expect(runMediaCleanupCron(env as never)).resolves.toEqual({
      deletedIds: [3, 4],
      referencedCount: 2,
      scannedCount: 4,
    })

    expect(deleteObject).toHaveBeenCalledTimes(1)
    expect(deleteObject).toHaveBeenCalledWith('orphan.png')
    expect(mediaDeleteStatement.bind).toHaveBeenNthCalledWith(1, 3)
    expect(mediaDeleteStatement.bind).toHaveBeenNthCalledWith(2, 4)
    expect(mediaDeleteRun).toHaveBeenCalledTimes(2)
    expect(warnSpy).toHaveBeenCalledWith(
      '[media-cleanup:cron] skipping R2 delete for media id=4 because filename is missing',
    )
  })
})
