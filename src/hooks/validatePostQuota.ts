import { APIError, type CollectionBeforeChangeHook } from 'payload'

import { hasAdminRole } from '@/access/admin'
import { projectQuotaForPost } from '@/quota/postQuota'

type RelationValue = number | string | { id?: number | string | null } | null | undefined

type PostQuotaData = {
  author?: RelationValue
  content?: unknown
  coverImage?: RelationValue
  excerpt?: string | null
  id?: number | string
  title?: string | null
}

type QuotaUser = {
  id?: number | string | null
  quotaBytes?: number | null
  roles?: string[] | null
}

function getRelationId(value: RelationValue): number | string | null {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && (typeof value.id === 'number' || typeof value.id === 'string')) return value.id
  return null
}

export const validatePostQuota: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const user = req.user as QuotaUser | null | undefined

  if (!user?.id || hasAdminRole(user)) return data

  const nextPost = {
    ...((originalDoc ?? {}) as PostQuotaData),
    ...((data ?? {}) as PostQuotaData),
  }
  const authorId = getRelationId(nextPost.author)

  if (!authorId || String(authorId) !== String(user.id)) return data

  const projection = await projectQuotaForPost({
    candidatePost: {
      content: nextPost.content,
      coverImage: nextPost.coverImage,
      excerpt: nextPost.excerpt ?? null,
      title: nextPost.title ?? null,
    },
    excludePostId: operation === 'update' ? originalDoc?.id : null,
    payload: req.payload,
    quotaBytes: user.quotaBytes,
    req,
    userId: user.id,
  })

  if (!projection.allowed) {
    throw new APIError('Publishing quota exceeded.', 400)
  }

  return data
}
