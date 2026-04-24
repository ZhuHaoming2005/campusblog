import type { CollectionConfig } from 'payload'

import {
  revalidateMediaCacheAfterChange,
  revalidateMediaCacheAfterDelete,
} from '@/hooks/revalidateFrontendCache'
import { syncMediaQuotaAfterChange, syncMediaQuotaAfterDelete } from '@/hooks/syncMediaQuota'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [syncMediaQuotaAfterChange, revalidateMediaCacheAfterChange],
    afterDelete: [syncMediaQuotaAfterDelete, revalidateMediaCacheAfterDelete],
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
