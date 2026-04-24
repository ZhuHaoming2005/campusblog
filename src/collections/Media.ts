import type { CollectionConfig } from 'payload'

import { adminOnly, adminOrVerifiedActiveUser } from '@/access/admin'
import {
  revalidateMediaCacheAfterChange,
  revalidateMediaCacheAfterDelete,
} from '@/hooks/revalidateFrontendCache'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    create: adminOrVerifiedActiveUser,
    delete: adminOnly,
    read: () => true,
    update: adminOnly,
  },
  hooks: {
    afterChange: [revalidateMediaCacheAfterChange],
    afterDelete: [revalidateMediaCacheAfterDelete],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: {
    // These are not supported on Workers yet due to lack of sharp
    crop: false,
    focalPoint: false,
  },
}
