import { beforeEach, describe, expect, it, vi } from 'vitest'

const getCurrentFrontendUserMock = vi.fn()
const payloadAuthMock = vi.fn()
const getPayloadMock = vi.fn()

async function importFrontendAuthModule() {
  vi.resetModules()
  vi.doMock('@/lib/frontendSession', () => ({
    getCurrentFrontendUser: getCurrentFrontendUserMock,
  }))

  return import('@/app/api/auth/_lib/frontendAuth')
}

async function importFrontendSessionModule() {
  vi.resetModules()
  vi.doUnmock('@/lib/frontendSession')
  vi.doMock('payload', () => ({
    getPayload: getPayloadMock,
  }))
  vi.doMock('@/payload.config', () => ({
    default: Promise.resolve({}),
  }))

  return import('@/lib/frontendSession')
}

describe('frontendAuth', () => {
  beforeEach(() => {
    vi.resetModules()
    getCurrentFrontendUserMock.mockReset()
    payloadAuthMock.mockReset()
    getPayloadMock.mockReset()
    getPayloadMock.mockResolvedValue({
      auth: payloadAuthMock,
    })
    delete globalThis.__campusblogFrontendPayloadPromise
  })

  it('returns a login redirect failure when there is no current user', async () => {
    getCurrentFrontendUserMock.mockResolvedValue(null)
    const { requireFrontendAuth } = await importFrontendAuthModule()

    const result = await requireFrontendAuth({
      headers: new Headers(),
      nextPath: '/editor',
      requireVerified: true,
    })

    expect(result).toMatchObject({
      ok: false,
      code: 'auth_required',
      location: '/login?next=%2Feditor',
      status: 401,
    })
  })

  it('returns an email verification failure for unverified users when verification is required', async () => {
    getCurrentFrontendUserMock.mockResolvedValue({
      _verified: false,
      email: 'user@example.com',
      id: 1,
      isActive: true,
    })
    const { requireFrontendAuth } = await importFrontendAuthModule()

    const result = await requireFrontendAuth({
      headers: new Headers(),
      nextPath: '/editor',
      requireVerified: true,
    })

    expect(result).toMatchObject({
      ok: false,
      code: 'email_verification_required',
      location: '/verify/pending?email=user%40example.com&next=%2Feditor',
      status: 403,
    })
  })

  it('fails closed for requireVerified on the user center as well', async () => {
    getCurrentFrontendUserMock.mockResolvedValue({
      _verified: null,
      email: 'user@example.com',
      id: 1,
      isActive: true,
    })
    const { requireFrontendAuth } = await importFrontendAuthModule()

    const result = await requireFrontendAuth({
      headers: new Headers(),
      nextPath: '/user/me',
      requireVerified: true,
    })

    expect(result).toMatchObject({
      ok: false,
      code: 'email_verification_required',
      location: '/verify/pending?email=user%40example.com&next=%2Fuser%2Fme',
      status: 403,
    })
  })

  it('returns an author access failure for inactive authors', async () => {
    getCurrentFrontendUserMock.mockResolvedValue({
      _verified: true,
      email: 'user@example.com',
      id: 1,
      isActive: false,
    })
    const { requireFrontendAuth } = await importFrontendAuthModule()

    const result = await requireFrontendAuth({
      headers: new Headers(),
      nextPath: '/editor',
      requireAuthorAccess: true,
      requireVerified: true,
    })

    expect(result).toMatchObject({
      ok: false,
      code: 'author_access_required',
      location: '/user/me',
      status: 403,
    })
  })

  it('fails closed for requireAuthorAccess when the active flag is missing', async () => {
    getCurrentFrontendUserMock.mockResolvedValue({
      _verified: true,
      email: 'user@example.com',
      id: 1,
    })
    const { requireFrontendAuth } = await importFrontendAuthModule()

    const result = await requireFrontendAuth({
      headers: new Headers(),
      nextPath: '/editor',
      requireAuthorAccess: true,
      requireVerified: true,
    })

    expect(result).toMatchObject({
      ok: false,
      code: 'author_access_required',
      location: '/user/me',
      status: 403,
    })
  })
})

describe('frontendSession', () => {
  beforeEach(() => {
    vi.resetModules()
    payloadAuthMock.mockReset()
    getPayloadMock.mockReset()
    getPayloadMock.mockResolvedValue({
      auth: payloadAuthMock,
    })
    delete globalThis.__campusblogFrontendPayloadPromise
  })

  it('keeps fully verified sessions unchanged', async () => {
    payloadAuthMock.mockResolvedValue({
      user: {
        _verified: true,
        email: 'verified@example.com',
        id: 9,
        isActive: true,
        roles: ['editor'],
      },
    })

    const { getCurrentFrontendUser } = await importFrontendSessionModule()

    await expect(getCurrentFrontendUser(new Headers())).resolves.toMatchObject({
      _verified: true,
      email: 'verified@example.com',
      id: 9,
      isActive: true,
      roles: ['editor'],
    })
  })
})
