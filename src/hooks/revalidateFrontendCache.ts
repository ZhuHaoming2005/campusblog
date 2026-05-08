import { revalidateTag } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import {
  POST_LIST_CACHE_TAG,
  SCHOOL_SUB_CHANNELS_CACHE_TAG,
  SCHOOLS_CACHE_TAG,
  getPostRevalidationTags,
} from '@/app/(frontend)/lib/cacheTags'

type RelationValue = number | string | { id?: number | string | null } | null | undefined

type PostCacheDoc = {
  school?: RelationValue
  slug?: string | null
  subChannel?: RelationValue
}

function getRelationId(value: RelationValue): number | string | null {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && (typeof value.id === 'number' || typeof value.id === 'string')) return value.id
  return null
}

function revalidateTags(tags: string[]) {
  for (const tag of tags) {
    revalidateTag(tag, 'max')
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

export function getSchoolCacheInvalidationTags() {
  return [SCHOOLS_CACHE_TAG, POST_LIST_CACHE_TAG]
}

export function getSchoolSubChannelCacheInvalidationTags() {
  return [SCHOOL_SUB_CHANNELS_CACHE_TAG, POST_LIST_CACHE_TAG]
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
  revalidateTags(getSchoolCacheInvalidationTags())
  return doc
}

export const revalidateSchoolCacheAfterDelete: CollectionAfterDeleteHook = async ({ doc }) => {
  revalidateTags(getSchoolCacheInvalidationTags())
  return doc
}

export const revalidateSchoolSubChannelCacheAfterChange: CollectionAfterChangeHook = async ({
  doc,
}) => {
  revalidateTags(getSchoolSubChannelCacheInvalidationTags())
  return doc
}

export const revalidateSchoolSubChannelCacheAfterDelete: CollectionAfterDeleteHook = async ({
  doc,
}) => {
  revalidateTags(getSchoolSubChannelCacheInvalidationTags())
  return doc
}
