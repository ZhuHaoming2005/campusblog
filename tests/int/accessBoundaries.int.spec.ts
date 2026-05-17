// @vitest-environment node

import path from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import {
  resolveWranglerPlatformProxyConfigPath,
  shouldUseBuildTimeBindings,
  shouldUseRemoteBindings,
  shouldUseWranglerPlatformProxy,
} from '@/cloudflare/contextMode'
import { Media } from '@/collections/Media'
import { Posts } from '@/collections/Posts'

type AccessFunction = (args: { req: { payload?: unknown; user: unknown } }) => unknown

const activeVerifiedUser = {
  _verified: true,
  id: 1,
  isActive: true,
  roles: ['user'],
}

const activeUnverifiedUser = {
  _verified: false,
  id: 2,
  isActive: true,
  roles: ['user'],
}

const inactiveVerifiedUser = {
  _verified: true,
  id: 3,
  isActive: false,
  roles: ['user'],
}

const adminUser = {
  _verified: false,
  id: 4,
  isActive: false,
  roles: ['admin'],
}

function createUserLookup(doc: unknown) {
  return {
    findByID: async () => doc,
  }
}

async function runAccess(access: unknown, user: unknown, payload?: unknown) {
  expect(access).toEqual(expect.any(Function))
  return await (access as AccessFunction)({ req: { payload, user } })
}

describe('collection access boundaries', () => {
  it('allows only verified active non-admin users to create posts', async () => {
    await expect(
      runAccess(Posts.access?.create, activeVerifiedUser, createUserLookup(activeVerifiedUser)),
    ).resolves.toBe(true)
    await expect(
      runAccess(Posts.access?.create, activeUnverifiedUser, createUserLookup(activeUnverifiedUser)),
    ).resolves.toBe(false)
    await expect(
      runAccess(Posts.access?.create, inactiveVerifiedUser, createUserLookup(inactiveVerifiedUser)),
    ).resolves.toBe(false)
    await expect(runAccess(Posts.access?.create, adminUser)).resolves.toBe(true)
  })

  it('does not trust active user fields from the request token', async () => {
    const staleTokenUser = {
      _verified: true,
      id: 5,
      isActive: true,
      roles: ['user'],
    }

    await expect(
      runAccess(
        Posts.access?.create,
        staleTokenUser,
        createUserLookup({
          _verified: true,
          id: 5,
          isActive: false,
          roles: ['user'],
        }),
      ),
    ).resolves.toBe(false)
  })

  it('validates post quota inside the Payload collection lifecycle', () => {
    const beforeChangeHooks = Posts.hooks?.beforeChange ?? []

    expect(beforeChangeHooks.map((hook) => hook.name)).toContain('validatePostQuota')
  })

  it('does not leave media mutations on Payload default authenticated access', async () => {
    await expect(
      runAccess(Media.access?.create, activeVerifiedUser, createUserLookup(activeVerifiedUser)),
    ).resolves.toBe(true)
    await expect(
      runAccess(Media.access?.create, activeUnverifiedUser, createUserLookup(activeUnverifiedUser)),
    ).resolves.toBe(false)
    await expect(runAccess(Media.access?.update, activeVerifiedUser)).resolves.toBe(false)
    await expect(runAccess(Media.access?.delete, activeVerifiedUser)).resolves.toBe(false)
    await expect(runAccess(Media.access?.delete, adminUser)).resolves.toBe(true)
  })

  it('does not allow anonymous users to read draft-only media', async () => {
    const payload = {
      find: vi.fn(async ({ collection }: { collection: string }) => {
        if (collection === 'posts') {
          return {
            docs: [
              {
                author: 41,
                content: {
                  type: 'doc',
                  content: [
                    {
                      type: 'image',
                      attrs: { mediaId: 102 },
                    },
                  ],
                },
                coverImage: 101,
              },
            ],
            totalPages: 1,
          }
        }

        if (collection === 'users') {
          return {
            docs: [
              {
                avatar: 103,
              },
            ],
            totalPages: 1,
          }
        }

        return { docs: [], totalPages: 1 }
      }),
    }

    await expect(runAccess(Media.access?.read, null, payload)).resolves.toEqual({
      id: {
        in: [101, 102, 103],
      },
    })
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'posts',
        overrideAccess: true,
        where: { status: { equals: 'published' } },
      }),
    )
  })

  it('allows authenticated users to read their own media without making all media public', async () => {
    const payload = {
      find: vi.fn(async () => ({ docs: [], totalPages: 1 })),
    }

    await expect(runAccess(Media.access?.read, activeVerifiedUser, payload)).resolves.toEqual({
      owner: {
        equals: activeVerifiedUser.id,
      },
    })
  })

  it('validates active schools at the post relationship boundary', () => {
    const schoolField = Posts.fields.find((field) => 'name' in field && field.name === 'school')

    expect(schoolField).toMatchObject({
      filterOptions: {
        isActive: {
          equals: true,
        },
      },
    })
  })
})

describe('Cloudflare context mode', () => {
  const realpath = (value: string) => value
  const nextBuildArgv = ['node', path.join('next', 'dist', 'bin', 'next'), 'build', '--webpack']
  const workerRuntimeArgv = ['node', 'worker.js']

  it('uses build-time placeholder bindings during Next build-time imports', () => {
    expect(
      shouldUseBuildTimeBindings({
        argv: nextBuildArgv,
        realpath,
      }),
    ).toBe(true)
    expect(
      shouldUseWranglerPlatformProxy({
        argv: nextBuildArgv,
        nodeEnv: 'production',
        realpath,
      }),
    ).toBe(false)
    expect(
      shouldUseRemoteBindings({
        argv: nextBuildArgv,
        nodeEnv: 'production',
        realpath,
      }),
    ).toBe(false)
  })

  it('detects Next production build workers by NEXT_PHASE', () => {
    const workerArgv = ['node', 'next-worker.js']
    const env = { NEXT_PHASE: 'phase-production-build' }

    expect(
      shouldUseBuildTimeBindings({
        argv: workerArgv,
        env,
        realpath,
      }),
    ).toBe(true)
    expect(
      shouldUseWranglerPlatformProxy({
        argv: workerArgv,
        env,
        nodeEnv: 'production',
        realpath,
      }),
    ).toBe(false)
    expect(
      shouldUseRemoteBindings({
        argv: workerArgv,
        env,
        nodeEnv: 'production',
        realpath,
      }),
    ).toBe(false)
  })

  it('detects the package build lifecycle before NEXT_PHASE is set', () => {
    const buildArgv = ['node', 'script-wrapper.js']
    const env = { npm_lifecycle_event: 'build' }

    expect(
      shouldUseBuildTimeBindings({
        argv: buildArgv,
        env,
        realpath,
      }),
    ).toBe(true)
    expect(
      shouldUseWranglerPlatformProxy({
        argv: buildArgv,
        env,
        nodeEnv: 'production',
        realpath,
      }),
    ).toBe(false)
    expect(
      shouldUseRemoteBindings({
        argv: buildArgv,
        env,
        nodeEnv: 'production',
        realpath,
      }),
    ).toBe(false)
  })

  it('keeps production Worker runtime on OpenNext Cloudflare context', () => {
    expect(
      shouldUseWranglerPlatformProxy({
        argv: workerRuntimeArgv,
        nodeEnv: 'production',
        realpath,
      }),
    ).toBe(false)
  })

  it('uses the local development Wrangler config for non-production Payload CLI imports', () => {
    expect(
      resolveWranglerPlatformProxyConfigPath({
        env: {},
        isPayloadCLI: true,
        isProduction: false,
        projectDir: 'D:\\code\\project\\campusblog',
      }),
    ).toBe(path.resolve('D:\\code\\project\\campusblog', 'wrangler.dev.jsonc'))
  })
})
