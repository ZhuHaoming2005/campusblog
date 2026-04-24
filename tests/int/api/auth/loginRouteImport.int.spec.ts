import { describe, expect, it, vi } from 'vitest'

describe('POST /api/auth/login module loading', () => {
  it('does not initialize Payload config when the route module is imported', async () => {
    vi.resetModules()
    vi.doMock('@/payload.config', () => {
      throw new Error('payload config should not load during login route import')
    })
    vi.doMock('@/app/api/auth/_lib/authRateLimit', () => ({
      checkAuthRateLimit: vi.fn(),
      getRequestIP: vi.fn(),
    }))

    await expect(import('@/app/api/auth/login/route')).resolves.toHaveProperty('POST')

    vi.doUnmock('@/payload.config')
    vi.doUnmock('@/app/api/auth/_lib/authRateLimit')
  })

  it('does not initialize Payload config when the lock-state helper is imported', async () => {
    vi.resetModules()
    vi.doMock('@/payload.config', () => {
      throw new Error('payload config should not load during lock-state helper import')
    })

    await expect(import('@/app/api/auth/_lib/limitedFrontendSession')).resolves.toHaveProperty(
      'getFrontendLoginLockState',
    )

    vi.doUnmock('@/payload.config')
  })
})
