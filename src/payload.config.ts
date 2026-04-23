import fs from 'fs'
import path from 'path'
import { sqliteD1Adapter } from '@payloadcms/db-d1-sqlite'
import { buildConfig } from 'payload'
import type { PayloadLogger } from 'payload'
import { en } from 'payload/i18n/en'
import { zh } from 'payload/i18n/zh'
import { fileURLToPath } from 'url'
import { CloudflareContext, getCloudflareContext } from '@opennextjs/cloudflare'
import { GetPlatformProxyOptions } from 'wrangler'
import { r2Storage } from '@payloadcms/storage-r2'

import { Posts } from './collections/Posts'
import { SchoolSubChannels } from './collections/SchoolSubChannels'
import { Schools } from './collections/Schools'
import { Comments } from './collections/Comments'
import { Tags } from './collections/Tags'
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { createCloudflareEmailAdapter } from './email/cloudflareEmailAdapter'

type EmailBindingLike = {
  send: (message: {
    content?: string
    from: string
    html?: string
    subject: string
    text?: string
    to: string
  }) => Promise<unknown>
}

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const realpath = (value: string) => (fs.existsSync(value) ? fs.realpathSync(value) : undefined)

const isCLI = process.argv.some(
  (value) => realpath(value)?.endsWith(path.join('payload', 'bin.js')) ?? false,
)
const isProduction = process.env.NODE_ENV === 'production'

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

const cloudflare =
  isCLI || !isProduction
    ? await getCloudflareContextFromWrangler()
    : await getCloudflareContext({ async: true })
const cloudflareEnv = cloudflare.env as CloudflareEnv & {
  EMAIL?: EmailBindingLike
}
const readRuntimeEnv = (key: string) =>
  String((cloudflareEnv as unknown as Record<string, unknown>)[key] ?? process.env[key] ?? '')
const publicAppURL = readRuntimeEnv('NEXT_PUBLIC_SITE_URL') || 'http://localhost:3000'
const authEmailDebugValue = readRuntimeEnv('AUTH_EMAIL_DEBUG')
const authEmailDebug =
  authEmailDebugValue === 'true' || (!isProduction && authEmailDebugValue !== 'false')
const authEmailDebugDeliver = readRuntimeEnv('AUTH_EMAIL_DEBUG_DELIVER') === 'true'
const authEmailDebugPrintURLs = readRuntimeEnv('AUTH_EMAIL_DEBUG_PRINT_URLS') === 'true'
const authEmailFromAddress = readRuntimeEnv('AUTH_EMAIL_FROM_ADDRESS')
const authEmailFromName = readRuntimeEnv('AUTH_EMAIL_FROM_NAME') || 'CampusBlog'
const csrfOrigins = Array.from(
  new Set(
    [publicAppURL, readRuntimeEnv('PAYLOAD_PUBLIC_SERVER_URL')]
      .map((value) => value.trim())
      .filter(Boolean),
  ),
)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Schools, SchoolSubChannels, Tags, Posts, Comments],
  csrf: csrfOrigins,
  i18n: {
    fallbackLanguage: 'zh',
    supportedLanguages: {
      en,
      zh,
    },
  },
  email: createCloudflareEmailAdapter({
    allowRealDelivery: isProduction || authEmailDebugDeliver,
    debug: authEmailDebug,
    debugPrintFullURLs: !isProduction && authEmailDebugPrintURLs,
    defaultFromAddress: authEmailFromAddress,
    defaultFromName: authEmailFromName,
    emailBinding: cloudflareEnv.EMAIL,
    kv: cloudflareEnv.KV,
  }),
  secret: readRuntimeEnv('PAYLOAD_SECRET'),
  serverURL: readRuntimeEnv('PAYLOAD_PUBLIC_SERVER_URL') || publicAppURL,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteD1Adapter({ binding: cloudflareEnv.D1 }),
  logger: isProduction ? cloudflareLogger : undefined,
  plugins: [
    r2Storage({
      bucket: cloudflare.env.R2,
      collections: { media: true },
    }),
  ],
})

// Adapted from https://github.com/opennextjs/opennextjs-cloudflare/blob/d00b3a13e42e65aad76fba41774815726422cc39/packages/cloudflare/src/api/cloudflare-context.ts#L328C36-L328C46
function getCloudflareContextFromWrangler(): Promise<CloudflareContext> {
  return import(/* webpackIgnore: true */ `${'__wrangler'.replaceAll('_', '')}`).then(
    ({ getPlatformProxy }) =>
      getPlatformProxy({
        environment: process.env.CLOUDFLARE_ENV,
        remoteBindings: isProduction,
      } satisfies GetPlatformProxyOptions),
  )
}
