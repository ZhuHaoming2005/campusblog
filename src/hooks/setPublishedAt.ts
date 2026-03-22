import type { CollectionBeforeChangeHook } from 'payload'

type PostStatus = 'draft' | 'published' | 'hidden'

type PostStatusData = {
  status?: PostStatus | null
  publishedAt?: Date | string | null
}

export const setPublishedAt: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  if (!data) return data

  const nextData = data as PostStatusData
  const previousData = (originalDoc ?? {}) as PostStatusData

  if (nextData.status === 'published' && previousData.status !== 'published' && !nextData.publishedAt) {
    nextData.publishedAt = new Date().toISOString()
  }

  return nextData
}
