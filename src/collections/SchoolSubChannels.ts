import type { CollectionConfig } from 'payload'

import { adminOnly, adminOrActive } from '@/access/admin'
import { buildSlugField } from '@/fields/slug'
import {
  revalidateSchoolSubChannelCacheAfterChange,
  revalidateSchoolSubChannelCacheAfterDelete,
} from '@/hooks/revalidateFrontendCache'

export const SchoolSubChannels: CollectionConfig = {
  slug: 'school-sub-channels',
  admin: {
    defaultColumns: ['name', 'school', 'isActive', 'sortOrder', 'updatedAt'],
    useAsTitle: 'name',
  },
  access: {
    read: adminOrActive,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  hooks: {
    afterChange: [revalidateSchoolSubChannelCacheAfterChange],
    afterDelete: [revalidateSchoolSubChannelCacheAfterDelete],
  },
  defaultSort: 'sortOrder',
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Sub-channel name, for example Lost and Found or Events.',
      },
    },
    buildSlugField('name'),
    {
      name: 'school',
      type: 'relationship',
      relationTo: 'schools',
      required: true,
      index: true,
      admin: {
        description: 'Parent school that this sub-channel belongs to.',
        position: 'sidebar',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Short summary displayed on channel pages and admin lists.',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      admin: {
        description: 'Controls whether this sub-channel is available to readers.',
        position: 'sidebar',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      index: true,
      admin: {
        description: 'Manual ordering value inside the same school.',
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}
