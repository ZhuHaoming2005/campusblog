import path from 'path'
import { sqliteD1Adapter } from '@payloadcms/db-d1-sqlite'
import { buildConfig } from 'payload'
import type { PayloadLogger } from 'payload'
import { en } from 'payload/i18n/en'
import { zh } from 'payload/i18n/zh'
import { fileURLToPath } from 'url'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { CloudflareContext } from '@opennextjs/cloudflare'
import type { GetPlatformProxyOptions } from 'wrangler'
import { r2Storage } from '@payloadcms/storage-r2'

import {
  isPayloadCLIProcess,
  resolveWranglerPlatformProxyConfigPath,
  shouldUseBuildTimeBindings,
  shouldUseRemoteBindings,
  shouldUseWranglerPlatformProxy,
} from './cloudflare/contextMode'
import { readRuntimeEnvFlag, readRuntimeEnvString } from './cloudflare/runtimeEnv'
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
const projectDir = path.resolve(dirname, '..')
const isProduction = process.env.NODE_ENV === 'production'
const isPayloadCLI = isPayloadCLIProcess(process.argv)
const useWranglerPlatformProxy = shouldUseWranglerPlatformProxy({
  argv: process.argv,
  env: process.env,
  nodeEnv: process.env.NODE_ENV,
})
const useBuildTimeBindings = shouldUseBuildTimeBindings({
  argv: process.argv,
  env: process.env,
})
const useRemoteBindings = shouldUseRemoteBindings({
  argv: process.argv,
  env: process.env,
  nodeEnv: process.env.NODE_ENV,
})
const wranglerPlatformProxyConfigPath = resolveWranglerPlatformProxyConfigPath({
  env: process.env,
  isPayloadCLI,
  isProduction,
  projectDir,
})

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
  useBuildTimeBindings
    ? createBuildTimeCloudflareContext()
    : useWranglerPlatformProxy
      ? await getCloudflareContextFromWrangler({
          configPath: wranglerPlatformProxyConfigPath,
          remoteBindings: useRemoteBindings,
        })
      : await getCloudflareContext({ async: true })
const cloudflareEnv = cloudflare.env as CloudflareEnv & {
  EMAIL?: EmailBindingLike
}
const publicAppURL =
  readRuntimeEnvString('NEXT_PUBLIC_SITE_URL', {
    bindings: cloudflareEnv,
    processEnv: process.env,
  }) || 'http://localhost:3000'
const authEmailDebug = readRuntimeEnvFlag('AUTH_EMAIL_DEBUG', {
  bindings: cloudflareEnv,
  fallback: !isProduction,
  processEnv: process.env,
})
const authEmailDebugDeliver = readRuntimeEnvFlag('AUTH_EMAIL_DEBUG_DELIVER', {
  bindings: cloudflareEnv,
  processEnv: process.env,
})
const authEmailDebugPrintURLs = readRuntimeEnvFlag('AUTH_EMAIL_DEBUG_PRINT_URLS', {
  bindings: cloudflareEnv,
  processEnv: process.env,
})
const authEmailFromAddress = readRuntimeEnvString('AUTH_EMAIL_FROM_ADDRESS', {
  bindings: cloudflareEnv,
  processEnv: process.env,
})
const authEmailFromName =
  readRuntimeEnvString('AUTH_EMAIL_FROM_NAME', {
    bindings: cloudflareEnv,
    processEnv: process.env,
  }) || 'CampusBlog'
const csrfOrigins = Array.from(
  new Set(
    [
      publicAppURL,
      readRuntimeEnvString('PAYLOAD_PUBLIC_SERVER_URL', {
        bindings: cloudflareEnv,
        processEnv: process.env,
      }),
    ]
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
  secret: readRuntimeEnvString('PAYLOAD_SECRET', {
    bindings: cloudflareEnv,
    processEnv: process.env,
  }),
  serverURL:
    readRuntimeEnvString('PAYLOAD_PUBLIC_SERVER_URL', {
      bindings: cloudflareEnv,
      processEnv: process.env,
    }) || publicAppURL,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteD1Adapter({ binding: cloudflareEnv.D1 }),
  logger: isProduction ? cloudflareLogger : undefined,
  plugins: [
    r2Storage({
      bucket: cloudflareEnv.R2,
      collections: { media: true },
    }),
  ],
})

// Adapted from https://github.com/opennextjs/opennextjs-cloudflare/blob/d00b3a13e42e65aad76fba41774815726422cc39/packages/cloudflare/src/api/cloudflare-context.ts#L328C36-L328C46
function getCloudflareContextFromWrangler(options: {
  configPath?: string
  remoteBindings: boolean
}): Promise<CloudflareContext> {
  return import(/* webpackIgnore: true */ `${'__wrangler'.replaceAll('_', '')}`).then(
    ({ getPlatformProxy }) =>
      getPlatformProxy({
        configPath: options.configPath,
        environment: options.configPath ? undefined : process.env.CLOUDFLARE_ENV,
        remoteBindings: options.remoteBindings,
      } satisfies GetPlatformProxyOptions),
  )
}

function createBuildTimeCloudflareContext(): CloudflareContext {
  const env = {
    AUTH_EMAIL_DEBUG: process.env.AUTH_EMAIL_DEBUG,
    AUTH_EMAIL_DEBUG_DELIVER: process.env.AUTH_EMAIL_DEBUG_DELIVER,
    AUTH_EMAIL_DEBUG_PRINT_URLS: process.env.AUTH_EMAIL_DEBUG_PRINT_URLS,
    AUTH_EMAIL_FROM_ADDRESS: process.env.AUTH_EMAIL_FROM_ADDRESS,
    AUTH_EMAIL_FROM_NAME: process.env.AUTH_EMAIL_FROM_NAME,
    D1: createUnavailableD1Database(),
    EMAIL: createUnavailableEmailBinding(),
    GITHUB_URL: process.env.GITHUB_URL,
    KV: createUnavailableKVNamespace(),
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    PAYLOAD_PUBLIC_SERVER_URL: process.env.PAYLOAD_PUBLIC_SERVER_URL,
    PAYLOAD_SECRET: process.env.PAYLOAD_SECRET,
    R2: createUnavailableR2Bucket(),
  } as unknown as CloudflareEnv & { EMAIL?: EmailBindingLike }

  return { env } as CloudflareContext
}

function unavailableBindingError(binding: string) {
  return new Error(
    `${binding} is unavailable while Next.js is collecting build-time route data. ` +
      'Move this operation to request/runtime execution or run it through the Payload CLI.',
  )
}

function createUnavailableD1Database(): D1Database {
  const createStatement = () =>
    ({
      all: async () => {
        throw unavailableBindingError('D1')
      },
      bind: () => createStatement(),
      first: async () => {
        throw unavailableBindingError('D1')
      },
      raw: async () => {
        throw unavailableBindingError('D1')
      },
      run: async () => {
        throw unavailableBindingError('D1')
      },
    }) as unknown as D1PreparedStatement

  return {
    batch: async () => {
      throw unavailableBindingError('D1')
    },
    dump: async () => {
      throw unavailableBindingError('D1')
    },
    exec: async () => {
      throw unavailableBindingError('D1')
    },
    prepare: () => createStatement(),
  } as unknown as D1Database
}

function createUnavailableKVNamespace(): KVNamespace {
  return new Proxy(
    {},
    {
      get: (_target, prop) =>
        prop === 'then'
          ? undefined
          : async () => {
              throw unavailableBindingError('KV')
            },
    },
  ) as KVNamespace
}

function createUnavailableR2Bucket(): R2Bucket {
  return new Proxy(
    {},
    {
      get: (_target, prop) =>
        prop === 'then'
          ? undefined
          : async () => {
              throw unavailableBindingError('R2')
            },
    },
  ) as R2Bucket
}

function createUnavailableEmailBinding(): EmailBindingLike {
  return {
    async send() {
      throw unavailableBindingError('EMAIL')
    },
  }
}
