// @vitest-environment node

import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

type DurableObjectBinding = {
  class_name: string
  name: string
  script_name?: string
}

type ServiceBinding = {
  binding: string
  service: string
}

type DurableObjectMigration = {
  new_sqlite_classes?: string[]
  tag: string
}

type WranglerConfig = {
  d1_databases?: Array<{
    binding: string
    database_name?: string
    remote?: boolean
  }>
  durable_objects?: {
    bindings?: DurableObjectBinding[]
  }
  main?: string
  migrations?: DurableObjectMigration[]
  name?: string
  send_email?: Array<{
    name: string
    remote?: boolean
  }>
  services?: ServiceBinding[]
  vars?: Record<string, string>
}

type WranglerModule = {
  unstable_readConfig: (options: { config: string; env?: string }) => WranglerConfig
}

const require = createRequire(import.meta.url)
const { unstable_readConfig } = require('wrangler') as WranglerModule

function readConfig(fileName: string, env?: string): WranglerConfig {
  return unstable_readConfig({
    config: path.resolve(process.cwd(), fileName),
    env,
  })
}

function findDoBinding(config: WranglerConfig, name: string): DurableObjectBinding | undefined {
  return config.durable_objects?.bindings?.find((binding) => binding.name === name)
}

function findServiceBinding(config: WranglerConfig, name: string): ServiceBinding | undefined {
  return config.services?.find((binding) => binding.binding === name)
}

function findD1Binding(config: WranglerConfig, name: string) {
  return config.d1_databases?.find((binding) => binding.binding === name)
}

function findEmailBinding(config: WranglerConfig, name: string) {
  return config.send_email?.find((binding) => binding.name === name)
}

function hasDoQueueMigration(config: WranglerConfig) {
  return config.migrations?.some((migration) =>
    migration.new_sqlite_classes?.includes('DOQueueHandler'),
  )
}

function relativeMain(config: WranglerConfig) {
  return config.main ? path.relative(process.cwd(), config.main).replaceAll(path.sep, '/') : undefined
}

describe('Cloudflare deploy configuration', () => {
  it('uses the official OpenNext deploy command for app deployment', async () => {
    const packageJson = (await import('../../../package.json', { with: { type: 'json' } })) as {
      default: { scripts: Record<string, string | undefined> }
    }

    expect(packageJson.default.scripts['deploy:app']).toBe('opennextjs-cloudflare deploy')
    expect(packageJson.default.scripts['deploy:app:dev']).toBe(
      'opennextjs-cloudflare deploy --env=dev',
    )
    expect(packageJson.default.scripts['deploy:cache-do']).toBeUndefined()
    expect(packageJson.default.scripts['deploy:populate-cache']).toBeUndefined()
    expect(packageJson.default.scripts['deploy:worker']).toBeUndefined()
  })

  it('keeps the OpenNext cache Durable Object in the app worker config', () => {
    const production = readConfig('wrangler.jsonc')
    const dev = readConfig('wrangler.jsonc', 'dev')

    expect(findDoBinding(production, 'NEXT_CACHE_DO_QUEUE')).toMatchObject({
      class_name: 'DOQueueHandler',
    })
    expect(findDoBinding(production, 'NEXT_CACHE_DO_QUEUE')?.script_name).toBeUndefined()
    expect(findDoBinding(dev, 'NEXT_CACHE_DO_QUEUE')).toMatchObject({
      class_name: 'DOQueueHandler',
    })
    expect(findDoBinding(dev, 'NEXT_CACHE_DO_QUEUE')?.script_name).toBeUndefined()
    expect(findDoBinding(production, 'NEXT_TAG_CACHE_DO_SHARDED')).toMatchObject({
      class_name: 'DOShardedTagCache',
    })
    expect(findDoBinding(production, 'NEXT_TAG_CACHE_DO_SHARDED')?.script_name).toBeUndefined()
    expect(findDoBinding(dev, 'NEXT_TAG_CACHE_DO_SHARDED')).toMatchObject({
      class_name: 'DOShardedTagCache',
    })
    expect(findDoBinding(dev, 'NEXT_TAG_CACHE_DO_SHARDED')?.script_name).toBeUndefined()
    expect(hasDoQueueMigration(production)).toBe(true)
    expect(hasDoQueueMigration(dev)).toBe(true)
    expect(
      production.migrations?.some((migration) =>
        migration.new_sqlite_classes?.includes('DOShardedTagCache'),
      ),
    ).toBe(true)
    expect(
      dev.migrations?.some((migration) =>
        migration.new_sqlite_classes?.includes('DOShardedTagCache'),
      ),
    ).toBe(true)
    expect(findServiceBinding(production, 'WORKER_SELF_REFERENCE')).toMatchObject({
      service: 'campusblog',
    })
    expect(findServiceBinding(dev, 'WORKER_SELF_REFERENCE')).toMatchObject({
      service: 'campusblog-dev',
    })

    const workerEntrypoint = fs.readFileSync(path.resolve(process.cwd(), 'worker.ts'), 'utf8')
    expect(workerEntrypoint).toContain(
      "export { DOQueueHandler } from './.open-next/.build/durable-objects/queue.js'",
    )
    expect(workerEntrypoint).toContain(
      "export { DOShardedTagCache } from './.open-next/.build/durable-objects/sharded-tag-cache.js'",
    )
  })

  it('uses the high-traffic OpenNext cache adapters', () => {
    const openNextConfig = fs.readFileSync(path.resolve(process.cwd(), 'open-next.config.ts'), 'utf8')

    expect(openNextConfig).toContain(
      "import { withRegionalCache } from '@opennextjs/cloudflare/overrides/incremental-cache/regional-cache'",
    )
    expect(openNextConfig).toContain(
      "import doShardedTagCache from '@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache'",
    )
    expect(openNextConfig).toContain(
      "incrementalCache: withRegionalCache(r2IncrementalCache, { mode: 'long-lived' })",
    )
    expect(openNextConfig).toContain('tagCache: doShardedTagCache(')
  })

  it('does not use local-development remote bindings in the app deploy config', () => {
    const production = readConfig('wrangler.jsonc')
    const dev = readConfig('wrangler.jsonc', 'dev')

    expect(findD1Binding(production, 'D1')?.remote).toBeUndefined()
    expect(findD1Binding(production, 'NEXT_TAG_CACHE_D1')).toBeUndefined()
    expect(findEmailBinding(production, 'EMAIL')?.remote).toBeUndefined()
    expect(findD1Binding(dev, 'D1')?.remote).toBeUndefined()
    expect(findD1Binding(dev, 'NEXT_TAG_CACHE_D1')).toBeUndefined()
    expect(findEmailBinding(dev, 'EMAIL')?.remote).toBeUndefined()
  })

  it('uses Durable-Object-free remote D1 configs for Payload migrations', async () => {
    const packageJson = (await import('../../../package.json', { with: { type: 'json' } })) as {
      default: { scripts: Record<string, string> }
    }
    const productionDatabase = readConfig('wrangler.database.jsonc')
    const devDatabase = readConfig('wrangler.database.dev.jsonc')

    expect(packageJson.default.scripts['deploy:database']).toContain(
      'WRANGLER_CONFIG_PATH=wrangler.database.jsonc',
    )
    expect(packageJson.default.scripts['deploy:database:dev']).toContain(
      'WRANGLER_CONFIG_PATH=wrangler.database.dev.jsonc',
    )
    expect(packageJson.default.scripts['deploy:database:dev']).not.toContain(
      'WRANGLER_CONFIG_PATH=wrangler.dev.jsonc',
    )
    expect(devDatabase.name).toBe('campusblog-dev-database-proxy')
    expect(relativeMain(devDatabase)).toBe('src/worker/databaseProxyWorker.ts')
    expect(devDatabase.vars?.NEXT_PUBLIC_SITE_URL).toBe(
      'https://campusblog-dev.zhuhaoming.workers.dev',
    )
    expect(productionDatabase.durable_objects?.bindings ?? []).toEqual([])
    expect(devDatabase.durable_objects?.bindings ?? []).toEqual([])
    expect(findD1Binding(productionDatabase, 'D1')?.remote).toBe(true)
    expect(findD1Binding(devDatabase, 'D1')?.remote).toBe(true)
    expect(findD1Binding(devDatabase, 'D1')?.database_name).toBe('campusblog-dev')
  })
})
