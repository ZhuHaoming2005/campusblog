import type { Access } from 'payload'

type RoleAwareUser = {
  _verified?: boolean | null
  id?: number | string | null
  isActive?: boolean | null
  roles?: string[] | null
} | null

type UserLookupRequest = {
  payload?: {
    findByID?: (args: {
      collection: 'users'
      depth: 0
      id: number | string
      overrideAccess: true
      req: UserLookupRequest
      select?: {
        _verified?: true
        isActive?: true
        quotaBytes?: true
      }
    }) => Promise<RoleAwareUser>
  }
  user?: RoleAwareUser
}

export const hasAdminRole = (user: RoleAwareUser): boolean => {
  return Boolean(user?.roles?.includes('admin'))
}

export const readCurrentUserState = async (
  req: UserLookupRequest,
  select: NonNullable<Parameters<NonNullable<UserLookupRequest['payload']>['findByID']>[0]['select']> = {
    _verified: true,
    isActive: true,
  },
): Promise<RoleAwareUser> => {
  const userID = req.user?.id
  if (!userID || !req.payload?.findByID) return null

  return req.payload.findByID({
    collection: 'users',
    depth: 0,
    id: userID,
    overrideAccess: true,
    req: req as never,
    select,
  })
}

export const isVerifiedActiveUser = async (req: UserLookupRequest): Promise<boolean> => {
  const user = await readCurrentUserState(req)
  return Boolean(req.user?.id && user?.isActive === true && user._verified === true)
}

export const authenticated: Access = ({ req: { user } }) => {
  return Boolean(user)
}

export const adminOnly: Access = ({ req: { user } }) => {
  return hasAdminRole(user)
}

export const adminOrVerifiedActiveUser: Access = async ({ req }) => {
  const { user } = req
  if (hasAdminRole(user)) return true

  return isVerifiedActiveUser(req as unknown as UserLookupRequest)
}

export const adminOrSelf: Access = ({ req: { user } }) => {
  if (hasAdminRole(user)) return true
  if (!user?.id) return false

  return {
    id: {
      equals: user.id,
    },
  }
}

export const adminOrAuthor: Access = ({ req: { user } }) => {
  if (hasAdminRole(user)) return true
  if (!user?.id) return false

  return {
    author: {
      equals: user.id,
    },
  }
}

export const adminOrVerifiedActiveAuthor: Access = async ({ req }) => {
  const { user } = req
  if (hasAdminRole(user)) return true
  if (!(await isVerifiedActiveUser(req as unknown as UserLookupRequest))) return false

  return {
    author: {
      equals: user?.id,
    },
  }
}

export const adminOrPublishedOrAuthor: Access = ({ req: { user } }) => {
  if (hasAdminRole(user)) return true
  if (!user?.id) {
    return {
      status: {
        equals: 'published',
      },
    }
  }

  return {
    or: [
      {
        status: {
          equals: 'published',
        },
      },
      {
        author: {
          equals: user.id,
        },
      },
    ],
  }
}

export const adminOrActive: Access = ({ req: { user } }) => {
  if (hasAdminRole(user)) return true

  return {
    isActive: {
      equals: true,
    },
  }
}

export const adminOrPublished: Access = ({ req: { user } }) => {
  if (hasAdminRole(user)) return true

  return {
    status: {
      equals: 'published',
    },
  }
}
