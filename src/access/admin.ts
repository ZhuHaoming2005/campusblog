import type { Access } from 'payload'

type RoleAwareUser = {
  roles?: string[] | null
} | null

export const hasAdminRole = (user: RoleAwareUser): boolean => {
  return Boolean(user?.roles?.includes('admin'))
}

export const adminOnly: Access = ({ req: { user } }) => {
  return hasAdminRole(user)
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
