import type { Access, CollectionConfig } from 'payload'

import { adminOnly, adminOrVerifiedActiveUser } from '@/access/admin'
import {
  revalidateMediaCacheAfterChange,
  revalidateMediaCacheAfterDelete,
} from '@/hooks/revalidateFrontendCache'
import { setMediaOwner, validateMediaUploadQuota } from '@/hooks/validateMediaUploadQuota'
import { collectMediaIdsFromPost, collectMediaIdsFromUser } from '@/media/orphanCleanup'

type RoleAwareUser = {
  id?: number | string | null
  roles?: string[] | null
} | null

type RelationValue = number | string | { id?: number | string | null } | null | undefined

type PublicMediaAccessRequest = {
  context?: {
    publicMediaIds?: number[]
  }
  payload?: {
    find?: (args: {
      collection: 'posts' | 'users'
      depth: 0
      limit: number
      overrideAccess: true
      page: number
      req: PublicMediaAccessRequest
      select?: Record<string, true>
      where?: Record<string, unknown>
    }) => Promise<{
      docs: unknown[]
      totalPages: number
    }>
  }
  user?: RoleAwareUser
}

const PAGE_SIZE = 100

function getRelationId(value: RelationValue): number | string | null {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && (typeof value.id === 'number' || typeof value.id === 'string')) return value.id
  return null
}

async function collectPublicMediaIds(req: PublicMediaAccessRequest): Promise<number[]> {
  if (Array.isArray(req.context?.publicMediaIds)) return req.context.publicMediaIds
  if (!req.payload?.find) return []

  const publicMediaIds = new Set<number>()
  const publishedAuthorIds = new Set<number | string>()
  let postPage = 1

  while (true) {
    const result = await req.payload.find({
      collection: 'posts',
      depth: 0,
      limit: PAGE_SIZE,
      overrideAccess: true,
      page: postPage,
      req,
      select: {
        author: true,
        content: true,
        coverImage: true,
      },
      where: { status: { equals: 'published' } },
    })

    for (const post of result.docs) {
      for (const mediaId of collectMediaIdsFromPost(post)) {
        publicMediaIds.add(mediaId)
      }

      const authorId = getRelationId((post as { author?: RelationValue }).author)
      if (authorId !== null) publishedAuthorIds.add(authorId)
    }

    if (postPage >= result.totalPages) break
    postPage += 1
  }

  if (publishedAuthorIds.size > 0) {
    let userPage = 1
    while (true) {
      const result = await req.payload.find({
        collection: 'users',
        depth: 0,
        limit: PAGE_SIZE,
        overrideAccess: true,
        page: userPage,
        req,
        select: {
          avatar: true,
        },
        where: {
          id: {
            in: Array.from(publishedAuthorIds),
          },
        },
      })

      for (const user of result.docs) {
        for (const mediaId of collectMediaIdsFromUser(user)) {
          publicMediaIds.add(mediaId)
        }
      }

      if (userPage >= result.totalPages) break
      userPage += 1
    }
  }

  const result = Array.from(publicMediaIds).sort((left, right) => left - right)
  if (req.context) {
    req.context.publicMediaIds = result
  }

  return result
}

const readMediaAccess: Access = async ({ req }) => {
  const user = req.user as RoleAwareUser
  if (user?.roles?.includes('admin')) return true

  const publicMediaIds = await collectPublicMediaIds(req as unknown as PublicMediaAccessRequest)
  const publicMediaConstraint =
    publicMediaIds.length > 0
      ? {
          id: {
            in: publicMediaIds,
          },
        }
      : null

  if (user?.id) {
    const ownerConstraint = {
      owner: {
        equals: user.id,
      },
    }

    return publicMediaConstraint
      ? {
          or: [ownerConstraint, publicMediaConstraint],
        }
      : ownerConstraint
  }

  return publicMediaConstraint ?? false
}

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    create: adminOrVerifiedActiveUser,
    delete: adminOnly,
    read: readMediaAccess,
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
