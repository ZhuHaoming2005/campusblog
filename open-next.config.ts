import { defineCloudflareConfig } from '@opennextjs/cloudflare'

const config = defineCloudflareConfig({})

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
