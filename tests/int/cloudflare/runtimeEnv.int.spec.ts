import { describe, expect, it } from 'vitest'

describe('runtimeEnv', () => {
  it('prefers Cloudflare bindings over process env for runtime strings', async () => {
    const { readRuntimeEnvString } = await import('@/cloudflare/runtimeEnv')

    expect(
      readRuntimeEnvString('GITHUB_URL', {
        bindings: {
          GITHUB_URL: 'https://workers.example.com/repo',
        },
        processEnv: {
          GITHUB_URL: 'https://process.example.com/repo',
        },
      }),
    ).toBe('https://workers.example.com/repo')
  })

  it('falls back to process env when a Cloudflare binding is unavailable', async () => {
    const { readRuntimeEnvString } = await import('@/cloudflare/runtimeEnv')

    expect(
      readRuntimeEnvString('GITHUB_URL', {
        bindings: undefined,
        processEnv: {
          GITHUB_URL: 'https://process.example.com/repo',
        },
      }),
    ).toBe('https://process.example.com/repo')
  })

  it('normalizes booleans from runtime env sources', async () => {
    const { readRuntimeEnvFlag } = await import('@/cloudflare/runtimeEnv')

    expect(
      readRuntimeEnvFlag('AUTH_EMAIL_DEBUG', {
        bindings: {
          AUTH_EMAIL_DEBUG: 'true',
        },
        processEnv: {
          AUTH_EMAIL_DEBUG: 'false',
        },
      }),
    ).toBe(true)

    expect(
      readRuntimeEnvFlag('AUTH_EMAIL_DEBUG', {
        bindings: {
          AUTH_EMAIL_DEBUG: '0',
        },
        processEnv: {},
      }),
    ).toBe(false)
  })
})
