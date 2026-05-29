import { defineCloudflareConfig } from '@opennextjs/cloudflare'
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache'
import { withRegionalCache } from '@opennextjs/cloudflare/overrides/incremental-cache/regional-cache'
import doQueue from '@opennextjs/cloudflare/overrides/queue/do-queue'
import doShardedTagCache from '@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache'

const config = defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: 'long-lived' }),
  queue: doQueue,
  tagCache: doShardedTagCache({
    baseShardSize: 12,
    regionalCache: true,
  }),
})

const openNextConfig = {
  ...config,
  edgeExternals: [
    ...(config.edgeExternals ?? []),
    '@payloadcms/db-d1-sqlite',
    '@payloadcms/drizzle',
    'drizzle-kit',
    'drizzle-orm',
  ],
}

export default openNextConfig
