import { getPayload } from 'payload'

import config from '../../src/payload.config.js'

export const testFrontendUser = {
  email: 'frontend-user@campusblog.test',
  password: 'test-password',
  displayName: 'Frontend Test User',
}

type FrontendUserSeed = {
  displayName: string
  email: string
  password: string
}

type FrontendUserOptions = {
  isActive?: boolean
  roles?: Array<'admin' | 'editor' | 'user'>
  verificationToken?: string | null
  verified?: boolean
}

type FrontendAuthState = {
  _verificationToken?: string | null
  _verified?: boolean | null
  email: string
  id: number | string
}

export async function deleteFrontendUserByEmail(email: string) {
  const payload = await getPayload({ config })

  await payload.delete({
    collection: 'users',
    where: {
      email: {
        equals: email,
      },
    },
  })
}

export async function seedFrontendUser(): Promise<void> {
  await createFrontendUser(testFrontendUser, { isActive: true, roles: ['user'], verified: true })
}

export async function cleanupFrontendUser(): Promise<void> {
  await deleteFrontendUserByEmail(testFrontendUser.email)
}

export async function createFrontendUser(
  user: FrontendUserSeed,
  options: FrontendUserOptions = {},
): Promise<void> {
  const payload = await getPayload({ config })

  await deleteFrontendUserByEmail(user.email)

  const created = await payload.create({
    collection: 'users',
    data: {
      ...user,
      isActive: options.isActive ?? true,
      roles: options.roles ?? ['user'],
    },
    disableVerificationEmail: true,
  })

  const nextData: Record<string, boolean | null | string> = {}
  const hasVerificationTokenOverride = Object.prototype.hasOwnProperty.call(options, 'verificationToken')

  if (options.verified !== undefined) {
    nextData._verified = options.verified
  }

  if (hasVerificationTokenOverride) {
    nextData._verificationToken = options.verificationToken ?? null
  }

  if (Object.keys(nextData).length > 0) {
    await payload.update({
      collection: 'users',
      id: created.id,
      data: nextData as never,
      overrideAccess: true,
      showHiddenFields: true,
    })
  }
}

export async function getFrontendUserAuthState(
  email: string,
): Promise<FrontendAuthState | null> {
  const payload = await getPayload({ config })
  const users = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    showHiddenFields: true,
    where: {
      email: {
        equals: email,
      },
    },
  })

  return (users.docs[0] as FrontendAuthState | undefined) ?? null
}

export async function createFrontendPasswordResetToken(email: string): Promise<string> {
  const payload = await getPayload({ config })

  const token = await payload.forgotPassword({
    collection: 'users',
    data: { email },
    disableEmail: true,
    overrideAccess: true,
  })

  if (typeof token !== 'string' || token.length === 0) {
    throw new Error(`Unable to create password reset token for ${email}`)
  }

  return token
}

export async function verifyFrontendUser(email: string): Promise<void> {
  const payload = await getPayload({ config })
  const authState = await getFrontendUserAuthState(email)

  if (!authState?._verificationToken) {
    throw new Error(`Missing verification token for ${email}`)
  }

  await payload.verifyEmail({
    collection: 'users',
    token: authState._verificationToken,
  })
}
