import type { CollectionConfig } from 'payload'

import { adminOnly, adminOrActive } from '@/access/admin'
import { buildSlugField } from '@/fields/slug'
import {
  revalidateCityCacheAfterChange,
  revalidateCityCacheAfterDelete,
} from '@/hooks/revalidateFrontendCache'

export const Cities: CollectionConfig = {
  slug: 'cities',
  admin: {
    defaultColumns: ['name', 'isActive', 'sortOrder', 'updatedAt'],
    useAsTitle: 'name',
  },
  access: {
    read: adminOrActive,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  hooks: {
    afterChange: [revalidateCityCacheAfterChange],
    afterDelete: [revalidateCityCacheAfterDelete],
  },
  defaultSort: 'sortOrder',
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'City display name used to group nearby schools.',
      },
    },
    buildSlugField('name'),
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Optional city summary for future location-based surfaces.',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      admin: {
        description: 'Controls whether schools can be associated with this city.',
        position: 'sidebar',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      index: true,
      admin: {
        description: 'Manual ordering value. Lower numbers appear first.',
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}
