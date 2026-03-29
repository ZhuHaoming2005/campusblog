import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  buildConfigMock,
  cleanupAllOrphanMediaMock,
  getPayloadMock,
  r2StorageMock,
  sqliteD1AdapterMock,
} = vi.hoisted(() => ({
  buildConfigMock: vi.fn((config) => config),
  cleanupAllOrphanMediaMock: vi.fn(),
  getPayloadMock: vi.fn(),
  r2StorageMock: vi.fn((args) => args),
  sqliteD1AdapterMock: vi.fn((args) => args),
}))

vi.mock('payload', () => ({
  buildConfig: buildConfigMock,
  getPayload: getPayloadMock,
}))

vi.mock('@payloadcms/db-d1-sqlite', () => ({
  sqliteD1Adapter: sqliteD1AdapterMock,
}))

vi.mock('@payloadcms/storage-r2', () => ({
  r2Storage: r2StorageMock,
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
vi.mock('@/media/orphanCleanup', () => ({
  cleanupAllOrphanMedia: cleanupAllOrphanMediaMock,
}))

describe('media cleanup cron', () => {
  const cloudflareContextSymbol = Symbol.for('__cloudflare-context__')
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, cloudflareContextSymbol)

  beforeEach(() => {
    vi.resetModules()
    buildConfigMock.mockClear()
    cleanupAllOrphanMediaMock.mockReset()
    getPayloadMock.mockReset()
    r2StorageMock.mockClear()
    sqliteD1AdapterMock.mockClear()

    Object.defineProperty(globalThis, cloudflareContextSymbol, {
      configurable: true,
      get() {
        return undefined
      },
    })
  })

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, cloudflareContextSymbol, originalDescriptor)
      return
    }

    Reflect.deleteProperty(globalThis, cloudflareContextSymbol)
  })

  it('runs orphan cleanup without mutating the getter-only cloudflare context', async () => {
    const env = {
      D1: { binding: 'd1' },
      R2: { binding: 'r2' },
    }
    const payload = { payload: true }
    const cleanupResult = {
      deletedIds: [42],
      referencedCount: 3,
      scannedCount: 5,
    }

    getPayloadMock.mockResolvedValue(payload)
    cleanupAllOrphanMediaMock.mockResolvedValue(cleanupResult)

    const { runMediaCleanupCron } = await import('@/worker/mediaCleanupCron')

    await expect(runMediaCleanupCron(env as never)).resolves.toEqual(cleanupResult)
    expect(sqliteD1AdapterMock).toHaveBeenCalledWith({ binding: env.D1 })
    expect(r2StorageMock).toHaveBeenCalledWith({
      bucket: env.R2,
      collections: { media: true },
    })
    expect(getPayloadMock).toHaveBeenCalled()
    expect(cleanupAllOrphanMediaMock).toHaveBeenCalledWith({ payload })
  })
})
