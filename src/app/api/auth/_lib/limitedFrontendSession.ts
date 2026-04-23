import { getPayload } from 'payload'

import config from '@/payload.config'

type FrontendAuthUserDoc = {
  id: number | string
  lockUntil?: Date | string | null
}

export type FrontendLoginLockState = 'locked' | 'not_locked'

function isLocked(lockUntil: Date | string | null | undefined): boolean {
  if (!lockUntil) return false

  const timestamp =
    lockUntil instanceof Date ? lockUntil.getTime() : new Date(lockUntil).getTime()

  return Number.isFinite(timestamp) && timestamp > Date.now()
}

async function findFrontendAuthUser(email: string): Promise<FrontendAuthUserDoc | null> {
  const payload = await getPayload({ config: await config })
  const userResult = await payload.find({
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

  return (userResult.docs[0] as FrontendAuthUserDoc | undefined) ?? null
}

export async function getFrontendLoginLockState(args: {
  email: string
  request: Request
}): Promise<FrontendLoginLockState> {
  void args.request

  const user = await findFrontendAuthUser(args.email)
  return isLocked(user?.lockUntil) ? 'locked' : 'not_locked'
}
