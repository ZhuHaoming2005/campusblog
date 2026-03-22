import type { CollectionConfig } from 'payload'

import { adminOnly, adminOrActive } from '@/access/admin'
import { buildSlugField } from '@/fields/slug'

export const Tags: CollectionConfig = {
  slug: 'tags',
  admin: {
    defaultColumns: ['name', 'isActive', 'updatedAt'],
    useAsTitle: 'name',
  },
  access: {
    read: adminOrActive,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Tag name shown on posts and used for filtering.',
      },
    },
    buildSlugField('name'),
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Optional internal note about when this tag should be used.',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      admin: {
        description: 'Inactive tags are hidden from tag selectors in new posts.',
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}
