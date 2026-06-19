import { getPayload } from 'payload'
import config from '../../src/payload.config.js'
import { withD1Retry } from './d1Retry'

export const testAdmin = {
  email: 'dev@payloadcms.com',
  password: 'test',
  displayName: 'Test Admin',
  roles: ['admin' as const],
}

/**
 * Seeds a test admin for e2e admin tests.
 */
export async function seedTestAdmin(): Promise<void> {
  const payload = await getPayload({ config })

  // Delete existing test admin if any
  await withD1Retry(() =>
    payload.delete({
      collection: 'users',
      where: {
        email: {
          equals: testAdmin.email,
        },
      },
    }),
  )

  // Create fresh test admin
  const created = await withD1Retry(() =>
    payload.create({
      collection: 'users',
      data: testAdmin,
      disableVerificationEmail: true,
    }),
  )

  await withD1Retry(() =>
    payload.update({
      collection: 'users',
      id: created.id,
      data: {
        _verificationToken: null,
        _verified: true,
      } as never,
      overrideAccess: true,
      showHiddenFields: true,
    }),
  )
}

/**
 * Cleans up test admin after tests
 */
export async function cleanupTestAdmin(): Promise<void> {
  const payload = await getPayload({ config })

  await withD1Retry(() =>
    payload.delete({
      collection: 'users',
      where: {
        email: {
          equals: testAdmin.email,
        },
      },
    }),
  )
}
