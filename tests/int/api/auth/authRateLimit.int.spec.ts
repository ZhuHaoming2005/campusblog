import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('authRateLimit', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('blocks after the configured limit inside one window', async () => {
    const store = new Map<string, string>()

    const kv = {
      get: vi.fn(async (key: string) => store.get(key) ?? null),
      put: vi.fn(async (key: string, value: string) => {
        store.set(key, value)
      }),
    }

    const { checkAuthRateLimit } = await import('@/app/api/auth/_lib/authRateLimit')

    const baseArgs = {
      action: 'resendVerification' as const,
      email: 'user@example.com',
      ip: '127.0.0.1',
      kv,
      now: 1_700_000_000_000,
    }

    const first = await checkAuthRateLimit(baseArgs)
    const second = await checkAuthRateLimit(baseArgs)
    const third = await checkAuthRateLimit(baseArgs)
    const fourth = await checkAuthRateLimit(baseArgs)

    expect(first.limited).toBe(false)
    expect(second.limited).toBe(false)
    expect(third.limited).toBe(false)
    expect(fourth.limited).toBe(true)
    expect(kv.put).toHaveBeenCalled()
  })

  it('fails open when kv is unavailable', async () => {
    const { checkAuthRateLimit } = await import('@/app/api/auth/_lib/authRateLimit')

    await expect(
      checkAuthRateLimit({
        action: 'login',
        email: 'user@example.com',
        ip: '127.0.0.1',
        kv: {
          get: vi.fn(async () => {
            throw new Error('kv offline')
          }),
          put: vi.fn(),
        },
      }),
    ).resolves.toMatchObject({ limited: false })
  })

  it('stores TTL as the remaining window duration instead of an absolute timestamp', async () => {
    const kv = {
      get: vi.fn(async () =>
        JSON.stringify({
          count: 2,
          startedAt: 1_700_000_000_000,
        }),
      ),
      put: vi.fn(async () => undefined),
    }

    const { checkAuthRateLimit } = await import('@/app/api/auth/_lib/authRateLimit')

    await checkAuthRateLimit({
      action: 'resendVerification',
      email: 'user@example.com',
      ip: '127.0.0.1',
      kv,
      now: 1_700_000_120_000,
    })

    expect(kv.put).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ expirationTtl: 480 }),
    )
  })

  it('does not write a KV expiration TTL below Cloudflare minimum near the end of a window', async () => {
    const kv = {
      get: vi.fn(async () =>
        JSON.stringify({
          count: 2,
          startedAt: 1_700_000_000_000,
        }),
      ),
      put: vi.fn(async () => undefined),
    }

    const { checkAuthRateLimit } = await import('@/app/api/auth/_lib/authRateLimit')

    await checkAuthRateLimit({
      action: 'resendVerification',
      email: 'user@example.com',
      ip: '127.0.0.1',
      kv,
      now: 1_700_000_570_000,
    })

    expect(kv.put).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ expirationTtl: 60 }),
    )
  })

  it('blocks repeated email-send attempts within a 60 second cooldown window', async () => {
    const store = new Map<string, string>()
    const kv = {
      get: vi.fn(async (key: string) => store.get(key) ?? null),
      put: vi.fn(async (key: string, value: string) => {
        store.set(key, value)
      }),
    }

    const { checkAuthCooldown, recordAuthCooldown } = await import('@/app/api/auth/_lib/authRateLimit')

    await recordAuthCooldown({
      action: 'forgotPassword',
      email: 'user@example.com',
      kv,
      now: 1_700_000_000_000,
    })

    const limited = await checkAuthCooldown({
      action: 'forgotPassword',
      email: 'user@example.com',
      kv,
      now: 1_700_000_030_000,
    })
    const allowed = await checkAuthCooldown({
      action: 'forgotPassword',
      email: 'user@example.com',
      kv,
      now: 1_700_000_061_000,
    })

    expect(limited).toMatchObject({
      limited: true,
      retryAfterSeconds: 30,
    })
    expect(allowed).toMatchObject({
      limited: false,
      retryAfterSeconds: 0,
    })
  })

  it('stores cooldown entries by action and email hash without depending on IP', async () => {
    const kv = {
      get: vi.fn(async () => null),
      put: vi.fn(async () => undefined),
    }

    const { recordAuthCooldown } = await import('@/app/api/auth/_lib/authRateLimit')

    await recordAuthCooldown({
      action: 'resendVerification',
      email: 'user@example.com',
      kv,
      now: 1_700_000_000_000,
    })

    expect(kv.put).toHaveBeenCalledWith(
      expect.stringMatching(/^auth:cooldown:resendVerification:[a-f0-9]{64}$/),
      JSON.stringify({ startedAt: 1_700_000_000_000 }),
      expect.objectContaining({ expirationTtl: 60 }),
    )
  })

  it('prefers Cloudflare visitor IP over spoofable forwarded headers', async () => {
    const { getRequestIP } = await import('@/app/api/auth/_lib/authRateLimit')
    const headers = new Headers({
      'cf-connecting-ip': '203.0.113.10',
      'x-forwarded-for': '198.51.100.77',
      'x-real-ip': '198.51.100.88',
    })

    expect(getRequestIP(headers)).toBe('203.0.113.10')
  })

  it('uses forwarded headers only when Cloudflare visitor IP is unavailable', async () => {
    const { getRequestIP } = await import('@/app/api/auth/_lib/authRateLimit')
    const headers = new Headers({
      'x-forwarded-for': '198.51.100.77, 198.51.100.78',
      'x-real-ip': '198.51.100.88',
    })

    expect(getRequestIP(headers)).toBe('198.51.100.77')
  })
})
