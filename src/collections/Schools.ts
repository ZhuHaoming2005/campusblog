import type { CollectionConfig } from 'payload'

import { adminOnly, adminOrActive } from '@/access/admin'
import { buildSlugField } from '@/fields/slug'
import { cleanupSchoolSubscriptionsBeforeDelete } from '@/collections/Interactions'
import {
  revalidateSchoolCacheAfterChange,
  revalidateSchoolCacheAfterDelete,
} from '@/hooks/revalidateFrontendCache'

export const Schools: CollectionConfig = {
  slug: 'schools',
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
    beforeDelete: [cleanupSchoolSubscriptionsBeforeDelete],
    afterChange: [revalidateSchoolCacheAfterChange],
    afterDelete: [revalidateSchoolCacheAfterDelete],
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
        description: 'School display name used in navigation, listing, and search.',
      },
    },
    buildSlugField('name'),
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Short introduction shown on the school page and in previews.',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      admin: {
        description: 'Controls whether the school is visible on the frontend.',
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
