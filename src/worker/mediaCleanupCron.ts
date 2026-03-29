import type { Payload } from 'payload'
import type { PayloadLogger } from 'payload'

type WorkerEnv = {
  D1: D1Database
  R2: R2Bucket
}

type CleanupResult = {
  deletedIds: number[]
  referencedCount: number
  scannedCount: number
}

const createLog =
  (level: string, fn: typeof console.log) => (objOrMsg: object | string, msg?: string) => {
    if (typeof objOrMsg === 'string') {
      fn(JSON.stringify({ level, msg: objOrMsg }))
    } else {
      fn(JSON.stringify({ level, ...objOrMsg, msg: msg ?? (objOrMsg as { msg?: string }).msg }))
    }
  }

const cloudflareLogger = {
  level: process.env.PAYLOAD_LOG_LEVEL || 'info',
  trace: createLog('trace', console.debug),
  debug: createLog('debug', console.debug),
  info: createLog('info', console.log),
  warn: createLog('warn', console.warn),
  error: createLog('error', console.error),
  fatal: createLog('fatal', console.error),
  silent: () => {},
} as unknown as PayloadLogger

export async function runMediaCleanupCron(env: WorkerEnv): Promise<CleanupResult> {
  const [
    { buildConfig, getPayload },
    { sqliteD1Adapter },
    { r2Storage },
    { en },
    { zh },
    { Comments },
    { Media },
    { Posts },
    { SchoolSubChannels },
    { Schools },
    { Tags },
    { Users },
    { cleanupAllOrphanMedia },
  ] = await Promise.all([
    import('payload'),
    import('@payloadcms/db-d1-sqlite'),
    import('@payloadcms/storage-r2'),
    import('payload/i18n/en'),
    import('payload/i18n/zh'),
    import('@/collections/Comments'),
    import('@/collections/Media'),
    import('@/collections/Posts'),
    import('@/collections/SchoolSubChannels'),
    import('@/collections/Schools'),
    import('@/collections/Tags'),
    import('@/collections/Users'),
    import('@/media/orphanCleanup'),
  ])

  const config = buildConfig({
    collections: [Users, Media, Schools, SchoolSubChannels, Tags, Posts, Comments],
    i18n: {
      fallbackLanguage: 'zh',
      supportedLanguages: {
        en,
        zh,
      },
    },
    secret: process.env.PAYLOAD_SECRET || '',
    db: sqliteD1Adapter({ binding: env.D1 }),
    logger: process.env.NODE_ENV === 'production' ? cloudflareLogger : undefined,
    plugins: [
      r2Storage({
        bucket: env.R2,
        collections: { media: true },
      }),
    ],
  })

  const payload = (await getPayload({ config })) as Payload
  return cleanupAllOrphanMedia({ payload })
}
