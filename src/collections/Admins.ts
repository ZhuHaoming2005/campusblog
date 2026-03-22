import type { CollectionConfig } from 'payload'

import { hasAdminRole } from '@/access/admin'

export const Admins: CollectionConfig = {
  slug: 'admins',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['admin'],
      saveToJWT: true,
      options: [
        {
          label: 'Admin',
          value: 'admin',
        },
        {
          label: 'Editor',
          value: 'editor',
        },
      ],
      access: {
        update: ({ req: { user } }) => hasAdminRole(user),
      },
      admin: {
        description:
          'Admin role controls privileged operations in Payload collections/endpoints. Keep at least one admin role account.',
        position: 'sidebar',
      },
    },
  ],
}
