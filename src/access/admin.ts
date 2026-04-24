import type { Access } from 'payload'

type RoleAwareUser = {
  _verified?: boolean | null
  id?: number | string | null
  isActive?: boolean | null
  roles?: string[] | null
} | null

export const hasAdminRole = (user: RoleAwareUser): boolean => {
  return Boolean(user?.roles?.includes('admin'))
}

export const isVerifiedActiveUser = (user: RoleAwareUser): boolean => {
  return Boolean(user?.id && user.isActive === true && user._verified === true)
}

export const authenticated: Access = ({ req: { user } }) => {
  return Boolean(user)
}

export const adminOnly: Access = ({ req: { user } }) => {
  return hasAdminRole(user)
}

export const adminOrVerifiedActiveUser: Access = ({ req: { user } }) => {
  if (hasAdminRole(user)) return true

  return isVerifiedActiveUser(user)
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

export const adminOrVerifiedActiveAuthor: Access = ({ req: { user } }) => {
  if (hasAdminRole(user)) return true
  if (!isVerifiedActiveUser(user)) return false

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
