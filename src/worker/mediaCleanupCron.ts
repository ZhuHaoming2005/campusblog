import { collectMediaIdsFromPost, collectMediaIdsFromUser } from '@/media/orphanCleanup'

type WorkerEnv = {
  D1: D1Database
  R2: R2Bucket
}

type CleanupResult = {
  deletedIds: number[]
  referencedCount: number
  scannedCount: number
}

type MediaRow = {
  filename: string | null
  id: number | string
}

type PostRow = {
  content: string | null
  cover_image_id: number | string | null
}

type UserRow = {
  avatar_id: number | string | null
}

function toNumericId(value: number | string | null | undefined): number | null {
  if (value === undefined || value === null || value === '') return null

  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function parseJsonSafely(value: string | null): unknown {
  if (!value) return null

  try {
    return JSON.parse(value)
  } catch {
    console.warn('[media-cleanup:cron] encountered invalid post content JSON while scanning references')
    return null
  }
}

async function selectRows<Row>(env: WorkerEnv, sql: string): Promise<Row[]> {
  const result = await env.D1.prepare(sql).bind().all<Row>()
  return result.results ?? []
}

async function deleteMediaRow(env: WorkerEnv, mediaId: number): Promise<void> {
  await env.D1.prepare('DELETE FROM media WHERE id = ?').bind(mediaId).run()
}

export async function runMediaCleanupCron(env: WorkerEnv): Promise<CleanupResult> {
  const [mediaRows, postRows, userRows] = await Promise.all([
    selectRows<MediaRow>(env, 'SELECT id, filename FROM media'),
    selectRows<PostRow>(env, 'SELECT cover_image_id, content FROM posts'),
    selectRows<UserRow>(env, 'SELECT avatar_id FROM users'),
  ])

  const referencedMediaIds = new Set<number>()

  for (const post of postRows) {
    const content = parseJsonSafely(post.content)

    for (const mediaId of collectMediaIdsFromPost({
      content,
      coverImage: post.cover_image_id,
    })) {
      referencedMediaIds.add(mediaId)
    }
  }

  for (const user of userRows) {
    for (const mediaId of collectMediaIdsFromUser({ avatar: user.avatar_id })) {
      referencedMediaIds.add(mediaId)
    }
  }

  const deletedIds: number[] = []

  for (const media of mediaRows) {
    const mediaId = toNumericId(media.id)
    if (mediaId === null || referencedMediaIds.has(mediaId)) continue

    if (media.filename) {
      await env.R2.delete(media.filename)
    } else {
      console.warn(
        `[media-cleanup:cron] skipping R2 delete for media id=${mediaId} because filename is missing`,
      )
    }

    await deleteMediaRow(env, mediaId)
    deletedIds.push(mediaId)
  }

  return {
    deletedIds,
    referencedCount: referencedMediaIds.size,
    scannedCount: mediaRows.length,
  }
}
