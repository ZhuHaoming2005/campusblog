// @vitest-environment node

import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  shouldUseBuildTimeBindings,
  shouldUseRemoteBindings,
  shouldUseWranglerPlatformProxy,
} from '@/cloudflare/contextMode'
import { Media } from '@/collections/Media'
import { Posts } from '@/collections/Posts'

type AccessFunction = (args: { req: { user: unknown } }) => unknown

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

async function runAccess(access: unknown, user: unknown) {
  expect(access).toEqual(expect.any(Function))
  return await (access as AccessFunction)({ req: { user } })
}

describe('collection access boundaries', () => {
  it('allows only verified active non-admin users to create posts', async () => {
    await expect(runAccess(Posts.access?.create, activeVerifiedUser)).resolves.toBe(true)
    await expect(runAccess(Posts.access?.create, activeUnverifiedUser)).resolves.toBe(false)
    await expect(runAccess(Posts.access?.create, inactiveVerifiedUser)).resolves.toBe(false)
    await expect(runAccess(Posts.access?.create, adminUser)).resolves.toBe(true)
  })

  it('validates post quota inside the Payload collection lifecycle', () => {
    const beforeChangeHooks = Posts.hooks?.beforeChange ?? []

    expect(beforeChangeHooks.map((hook) => hook.name)).toContain('validatePostQuota')
  })

  it('does not leave media mutations on Payload default authenticated access', async () => {
    await expect(runAccess(Media.access?.create, activeVerifiedUser)).resolves.toBe(true)
    await expect(runAccess(Media.access?.create, activeUnverifiedUser)).resolves.toBe(false)
    await expect(runAccess(Media.access?.update, activeVerifiedUser)).resolves.toBe(false)
    await expect(runAccess(Media.access?.delete, activeVerifiedUser)).resolves.toBe(false)
    await expect(runAccess(Media.access?.delete, adminUser)).resolves.toBe(true)
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
})
