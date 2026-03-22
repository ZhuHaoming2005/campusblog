import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/admin'

export const UserProfiles: CollectionConfig = {
  slug: 'user-profiles',
  admin: {
    defaultColumns: ['displayName', 'bizUserID', 'isActive', 'updatedAt'],
    useAsTitle: 'displayName',
  },
  access: {
    read: () => true,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    {
      name: 'bizUserID',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Foreign key reference to biz_users.id from the business user table.',
        position: 'sidebar',
      },
    },
    {
      name: 'displayName',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Public name shown in article bylines and profile cards.',
      },
    },
    {
      name: 'bio',
      type: 'textarea',
      admin: {
        description: 'Short profile biography shown on user-facing profile sections.',
      },
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Profile image displayed for the user across the site.',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      admin: {
        description: 'Controls whether this profile can be shown publicly.',
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}
