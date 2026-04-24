import type { CollectionConfig } from 'payload'

import { adminOnly, adminOrVerifiedActiveUser } from '@/access/admin'
import {
  revalidateMediaCacheAfterChange,
  revalidateMediaCacheAfterDelete,
} from '@/hooks/revalidateFrontendCache'
import { setMediaOwner, validateMediaUploadQuota } from '@/hooks/validateMediaUploadQuota'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    create: adminOrVerifiedActiveUser,
    delete: adminOnly,
    read: () => true,
    update: adminOnly,
  },
  hooks: {
    beforeValidate: [setMediaOwner],
    beforeChange: [validateMediaUploadQuota],
    afterChange: [revalidateMediaCacheAfterChange],
    afterDelete: [revalidateMediaCacheAfterDelete],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      hidden: true,
    },
  ],
  upload: {
    // These are not supported on Workers yet due to lack of sharp
    crop: false,
    focalPoint: false,
  },
}
