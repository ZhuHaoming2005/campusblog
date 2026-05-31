import { APIError, type CollectionBeforeValidateHook } from 'payload'

import { EDITOR_POST_TAG_LIMIT } from '@/tags/tagRules'

type RelationValue = number | string | { id?: number | string | null } | null | undefined

type PostTagData = {
  tags?: RelationValue[] | null
}

const extractRelationID = (value: RelationValue): number | string | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && (typeof value.id === 'number' || typeof value.id === 'string')) return value.id
  return null
}

export const validatePostTags: CollectionBeforeValidateHook = async ({ data, req }) => {
  const nextData = (data ?? {}) as PostTagData
  if (nextData.tags === undefined || nextData.tags === null) return data

  if (!Array.isArray(nextData.tags)) {
    throw new APIError('Tags must be submitted as an array.', 400)
  }

  const tagIds: Array<number | string> = []
  const seenTagIds = new Set<string>()

  for (const tag of nextData.tags) {
    const tagId = extractRelationID(tag)
    if (!tagId) {
      throw new APIError('Tags must be active.', 400)
    }

    const key = String(tagId)
    if (!seenTagIds.has(key)) {
      seenTagIds.add(key)
      tagIds.push(tagId)
    }
  }

  if (tagIds.length > EDITOR_POST_TAG_LIMIT) {
    throw new APIError(`Select up to ${EDITOR_POST_TAG_LIMIT} tags.`, 400)
  }

  if (tagIds.length === 0) return data

  const activeTags = await req.payload.find({
    collection: 'tags',
    depth: 0,
    limit: tagIds.length,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      and: [
        {
          id: {
            in: tagIds,
          },
        },
        {
          isActive: {
            equals: true,
          },
        },
      ],
    },
  })
  const activeTagIds = new Set(
    activeTags.docs
      .map((tag) => extractRelationID(tag as RelationValue))
      .filter((tagId): tagId is number | string => tagId !== null)
      .map(String),
  )

  if (tagIds.some((tagId) => !activeTagIds.has(String(tagId)))) {
    throw new APIError('Tags must be active.', 400)
  }

  nextData.tags = tagIds
  return nextData
}
