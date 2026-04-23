import { describe, expect, it } from 'vitest'

describe('wrangler env parser', () => {
  const sampleWranglerConfig = `{
    // top-level production defaults
    "vars": {
      "NEXT_PUBLIC_SITE_URL": "https://campusblog.net",
      "GITHUB_URL": "https://github.com/example/repo",
    },
    "env": {
      "dev": {
        "vars": {
          "NEXT_PUBLIC_SITE_URL": "https://campusblog-dev.example.workers.dev",
          "GITHUB_URL": "https://github.com/example/repo-dev",
        },
      },
    },
  }`

  it('reads top-level vars when no named environment is selected', async () => {
    const { parseWranglerEnvironmentVars } = await import('../../../scripts/lib/wrangler-env.mjs')

    expect(parseWranglerEnvironmentVars(sampleWranglerConfig)).toEqual({
      GITHUB_URL: 'https://github.com/example/repo',
      NEXT_PUBLIC_SITE_URL: 'https://campusblog.net',
    })
  })

  it('reads only the selected environment vars when an environment is provided', async () => {
    const { parseWranglerEnvironmentVars } = await import('../../../scripts/lib/wrangler-env.mjs')

    expect(parseWranglerEnvironmentVars(sampleWranglerConfig, 'dev')).toEqual({
      GITHUB_URL: 'https://github.com/example/repo-dev',
      NEXT_PUBLIC_SITE_URL: 'https://campusblog-dev.example.workers.dev',
    })
  })

  it('throws when the requested wrangler environment is missing', async () => {
    const { parseWranglerEnvironmentVars } = await import('../../../scripts/lib/wrangler-env.mjs')

    expect(() => parseWranglerEnvironmentVars(sampleWranglerConfig, 'staging')).toThrow(
      'Missing Wrangler environment: staging',
    )
  })
})
