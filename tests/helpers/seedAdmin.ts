import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

export const testAdmin = {
  email: 'dev@payloadcms.com',
  password: 'test',
  roles: ['admin' as const],
}

/**
 * Seeds a test admin for e2e admin tests.
 */
export async function seedTestAdmin(): Promise<void> {
  const payload = await getPayload({ config })

  // Delete existing test admin if any
  await payload.delete({
    collection: 'admins',
    where: {
      email: {
        equals: testAdmin.email,
      },
    },
  })

  // Create fresh test admin
  await payload.create({
    collection: 'admins',
    data: testAdmin,
  })
}

/**
 * Cleans up test admin after tests
 */
export async function cleanupTestAdmin(): Promise<void> {
  const payload = await getPayload({ config })

  await payload.delete({
    collection: 'admins',
    where: {
      email: {
        equals: testAdmin.email,
      },
    },
  })
}
