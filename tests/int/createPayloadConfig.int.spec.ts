import { describe, expect, it, vi } from 'vitest'

vi.mock('url', () => ({
  fileURLToPath: vi.fn(() => {
    throw new TypeError('The "path" argument must be of type string or an instance of URL. Received undefined')
  }),
}))

vi.mock('payload', () => ({
  buildConfig: vi.fn((config) => config),
}))

vi.mock('@payloadcms/db-d1-sqlite', () => ({
  sqliteD1Adapter: vi.fn((args) => args),
}))

vi.mock('@payloadcms/storage-r2', () => ({
  r2Storage: vi.fn((args) => args),
}))

vi.mock('payload/i18n/en', () => ({ en: { label: 'en' } }))
vi.mock('payload/i18n/zh', () => ({ zh: { label: 'zh' } }))
vi.mock('@/collections/Comments', () => ({ Comments: { slug: 'comments' } }))
vi.mock('@/collections/Media', () => ({ Media: { slug: 'media' } }))
vi.mock('@/collections/Posts', () => ({ Posts: { slug: 'posts' } }))
vi.mock('@/collections/SchoolSubChannels', () => ({ SchoolSubChannels: { slug: 'school-sub-channels' } }))
vi.mock('@/collections/Schools', () => ({ Schools: { slug: 'schools' } }))
vi.mock('@/collections/Tags', () => ({ Tags: { slug: 'tags' } }))
vi.mock('@/collections/Users', () => ({ Users: { slug: 'users' } }))

describe('createPayloadConfig module', () => {
  it(
    'imports without depending on import.meta.url at module evaluation time',
    async () => {
      const module = await import('@/payload/createPayloadConfig')

      expect(module.createPayloadConfig).toBeTypeOf('function')
    },
    30000,
  )
})
