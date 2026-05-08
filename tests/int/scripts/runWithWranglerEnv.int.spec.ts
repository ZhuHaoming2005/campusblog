import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

describe('run-with-wrangler-env helpers', () => {
  const tempDirs: string[] = []

  afterEach(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { force: true, recursive: true })
    }
  })

  it('merges top-level wrangler vars into the spawned process env', async () => {
    const { createWranglerEnv } = await import('../../../scripts/lib/run-with-wrangler-env.mjs')
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'campusblog-run-env-'))
    tempDirs.push(root)

    fs.writeFileSync(
      path.join(root, 'wrangler.jsonc'),
      JSON.stringify({
        vars: {
          GITHUB_URL: 'https://github.com/example/repo',
        },
      }),
    )

    expect(
      createWranglerEnv(
        {
          PATH: '/usr/bin',
        },
        root,
      ),
    ).toMatchObject({
      GITHUB_URL: 'https://github.com/example/repo',
      PATH: '/usr/bin',
    })
  })

  it('uses env-specific wrangler vars when CLOUDFLARE_ENV is set', async () => {
    const { createWranglerEnv } = await import('../../../scripts/lib/run-with-wrangler-env.mjs')
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'campusblog-run-env-dev-'))
    tempDirs.push(root)

    fs.writeFileSync(
      path.join(root, 'wrangler.jsonc'),
      JSON.stringify({
        vars: {
          NEXT_PUBLIC_SITE_URL: 'https://campusblog.net',
        },
        env: {
          dev: {
            vars: {
              NEXT_PUBLIC_SITE_URL: 'https://campusblog-dev.example.workers.dev',
            },
          },
        },
      }),
    )

    expect(
      createWranglerEnv(
        {
          CLOUDFLARE_ENV: 'dev',
          PATH: '/usr/bin',
        },
        root,
      ),
    ).toMatchObject({
      CLOUDFLARE_ENV: 'dev',
      NEXT_PUBLIC_SITE_URL: 'https://campusblog-dev.example.workers.dev',
      PATH: '/usr/bin',
    })
  })

  it('appends .cmd for bare commands on Windows while preserving shell=false usage', async () => {
    const { resolveCommandForPlatform } = await import('../../../scripts/lib/run-with-wrangler-env.mjs')

    expect(resolveCommandForPlatform('next', 'win32')).toBe('next.cmd')
    expect(resolveCommandForPlatform('opennextjs-cloudflare', 'win32')).toBe(
      'opennextjs-cloudflare.cmd',
    )
  })

  it('keeps explicit paths and file extensions unchanged on Windows', async () => {
    const { resolveCommandForPlatform } = await import('../../../scripts/lib/run-with-wrangler-env.mjs')

    expect(resolveCommandForPlatform('./scripts/tool.cmd', 'win32')).toBe('./scripts/tool.cmd')
    expect(resolveCommandForPlatform('node.exe', 'win32')).toBe('node.exe')
  })

  it('keeps commands unchanged on Linux and macOS', async () => {
    const { resolveCommandForPlatform } = await import('../../../scripts/lib/run-with-wrangler-env.mjs')

    expect(resolveCommandForPlatform('next', 'linux')).toBe('next')
    expect(resolveCommandForPlatform('opennextjs-cloudflare', 'darwin')).toBe(
      'opennextjs-cloudflare',
    )
  })

  it('routes Windows .cmd commands through cmd.exe instead of spawning them directly', async () => {
    const { resolveSpawnSpec } = await import('../../../scripts/lib/run-with-wrangler-env.mjs')

    expect(
      resolveSpawnSpec('opennextjs-cloudflare', ['build', '--env=dev'], {
        comSpec: 'C:\\Windows\\System32\\cmd.exe',
        platform: 'win32',
      }),
    ).toEqual({
      args: ['/d', '/s', '/c', 'opennextjs-cloudflare.cmd build --env=dev'],
      command: 'C:\\Windows\\System32\\cmd.exe',
    })
  })

  it('keeps direct spawning for Linux commands', async () => {
    const { resolveSpawnSpec } = await import('../../../scripts/lib/run-with-wrangler-env.mjs')

    expect(resolveSpawnSpec('opennextjs-cloudflare', ['build', '--env=dev'], { platform: 'linux' })).toEqual({
      args: ['build', '--env=dev'],
      command: 'opennextjs-cloudflare',
    })
  })
})
