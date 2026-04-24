import { revalidateTag } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import {
  POST_LIST_CACHE_TAG,
  SCHOOL_SUB_CHANNELS_CACHE_TAG,
  SCHOOLS_CACHE_TAG,
  authorCacheTag,
  getPostRevalidationTags,
  mediaCacheTag,
  postsBySchoolCacheTag,
  postsBySchoolChannelCacheTag,
  schoolCacheTag,
  schoolSubChannelCacheTag,
  tagCacheTag,
} from '@/app/(frontend)/lib/cacheTags'

type RelationValue = number | string | { id?: number | string | null } | null | undefined

type PostCacheDoc = {
  school?: RelationValue
  slug?: string | null
  subChannel?: RelationValue
}

type DocumentWithId = {
  id?: number | string | null
}

type SchoolSubChannelCacheDoc = DocumentWithId & {
  school?: RelationValue
}

type UserCacheDoc = DocumentWithId & {
  avatar?: RelationValue
}

function getRelationId(value: RelationValue): number | string | null {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && (typeof value.id === 'number' || typeof value.id === 'string')) return value.id
  return null
}

function getDocumentId(doc?: DocumentWithId | null) {
  return typeof doc?.id === 'number' || typeof doc?.id === 'string' ? doc.id : null
}

function revalidateTags(tags: string[]) {
  for (const tag of tags) {
    try {
      revalidateTag(tag, 'max')
    } catch (error) {
      console.warn('Unable to revalidate frontend cache tag.', {
        error: error instanceof Error ? error.message : error,
        tag,
      })
    }
  }
}

export function getPostCacheInvalidationTags(
  current?: PostCacheDoc | null,
  previous?: PostCacheDoc | null,
) {
  return getPostRevalidationTags(
    {
      schoolId: getRelationId(current?.school),
      slug: current?.slug,
      subChannelId: getRelationId(current?.subChannel),
    },
    {
      schoolId: getRelationId(previous?.school),
      slug: previous?.slug,
      subChannelId: getRelationId(previous?.subChannel),
    },
  )
}

export function getSchoolCacheInvalidationTags(
  current?: DocumentWithId | null,
  previous?: DocumentWithId | null,
) {
  const tags = [SCHOOLS_CACHE_TAG, POST_LIST_CACHE_TAG]

  for (const doc of [current, previous]) {
    const schoolId = getDocumentId(doc)
    if (!schoolId) continue

    tags.push(schoolCacheTag(schoolId), postsBySchoolCacheTag(schoolId))
  }

  return [...new Set(tags)]
}

export function getSchoolSubChannelCacheInvalidationTags(
  current?: SchoolSubChannelCacheDoc | null,
  previous?: SchoolSubChannelCacheDoc | null,
) {
  const tags = [SCHOOL_SUB_CHANNELS_CACHE_TAG, POST_LIST_CACHE_TAG]

  for (const doc of [current, previous]) {
    const subChannelId = getDocumentId(doc)
    if (subChannelId) {
      tags.push(schoolSubChannelCacheTag(subChannelId))
    }

    const schoolId = getRelationId(doc?.school)
    if (schoolId && subChannelId) {
      tags.push(postsBySchoolChannelCacheTag(schoolId, subChannelId))
    }
  }

  return [...new Set(tags)]
}

export function getTagCacheInvalidationTags(
  current?: DocumentWithId | null,
  previous?: DocumentWithId | null,
) {
  const tags = [POST_LIST_CACHE_TAG]

  for (const doc of [current, previous]) {
    const tagId = getDocumentId(doc)
    if (tagId) tags.push(tagCacheTag(tagId))
  }

  return [...new Set(tags)]
}

export function getMediaCacheInvalidationTags(
  current?: DocumentWithId | null,
  previous?: DocumentWithId | null,
) {
  const tags = [POST_LIST_CACHE_TAG]

  for (const doc of [current, previous]) {
    const mediaId = getDocumentId(doc)
    if (mediaId) tags.push(mediaCacheTag(mediaId))
  }

  return [...new Set(tags)]
}

export function getUserCacheInvalidationTags(
  current?: UserCacheDoc | null,
  previous?: UserCacheDoc | null,
) {
  const tags = [POST_LIST_CACHE_TAG]

  for (const doc of [current, previous]) {
    const userId = getDocumentId(doc)
    if (userId) tags.push(authorCacheTag(userId))

    const avatarId = getRelationId(doc?.avatar)
    if (avatarId) tags.push(mediaCacheTag(avatarId))
  }

  return [...new Set(tags)]
}

export const revalidatePostCacheAfterChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
}) => {
  revalidateTags(
    getPostCacheInvalidationTags(doc as PostCacheDoc | null, previousDoc as PostCacheDoc | null),
  )
  return doc
}

export const revalidatePostCacheAfterDelete: CollectionAfterDeleteHook = async ({ doc }) => {
  revalidateTags(getPostCacheInvalidationTags(doc as PostCacheDoc | null))
  return doc
}

export const revalidateSchoolCacheAfterChange: CollectionAfterChangeHook = async ({ doc }) => {
  revalidateTags(getSchoolCacheInvalidationTags(doc as DocumentWithId | null))
  return doc
}

export const revalidateSchoolCacheAfterDelete: CollectionAfterDeleteHook = async ({ doc }) => {
  revalidateTags(getSchoolCacheInvalidationTags(doc as DocumentWithId | null))
  return doc
}

export const revalidateSchoolSubChannelCacheAfterChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
}) => {
  revalidateTags(
    getSchoolSubChannelCacheInvalidationTags(
      doc as SchoolSubChannelCacheDoc | null,
      previousDoc as SchoolSubChannelCacheDoc | null,
    ),
  )
  return doc
}

export const revalidateSchoolSubChannelCacheAfterDelete: CollectionAfterDeleteHook = async ({
  doc,
}) => {
  revalidateTags(getSchoolSubChannelCacheInvalidationTags(doc as SchoolSubChannelCacheDoc | null))
  return doc
}

export const revalidateTagCacheAfterChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
}) => {
  revalidateTags(
    getTagCacheInvalidationTags(doc as DocumentWithId | null, previousDoc as DocumentWithId | null),
  )
  return doc
}

export const revalidateTagCacheAfterDelete: CollectionAfterDeleteHook = async ({ doc }) => {
  revalidateTags(getTagCacheInvalidationTags(doc as DocumentWithId | null))
  return doc
}

export const revalidateMediaCacheAfterChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
}) => {
  revalidateTags(
    getMediaCacheInvalidationTags(
      doc as DocumentWithId | null,
      previousDoc as DocumentWithId | null,
    ),
  )
  return doc
}

export const revalidateMediaCacheAfterDelete: CollectionAfterDeleteHook = async ({ doc }) => {
  revalidateTags(getMediaCacheInvalidationTags(doc as DocumentWithId | null))
  return doc
}

export const revalidateUserCacheAfterChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
}) => {
  revalidateTags(
    getUserCacheInvalidationTags(doc as UserCacheDoc | null, previousDoc as UserCacheDoc | null),
  )
  return doc
}

export const revalidateUserCacheAfterDelete: CollectionAfterDeleteHook = async ({ doc }) => {
  revalidateTags(getUserCacheInvalidationTags(doc as UserCacheDoc | null))
  return doc
}
