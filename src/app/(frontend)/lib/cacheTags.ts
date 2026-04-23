export const CMS_CONTENT_CACHE_LIFE = {
  stale: 300,
  revalidate: 60 * 60 * 24,
  expire: 60 * 60 * 24 * 7,
} as const

export const CMS_STRUCTURE_CACHE_LIFE = {
  stale: 300,
  revalidate: 60 * 60,
  expire: 60 * 60 * 24,
} as const

export const POST_LIST_CACHE_TAG = 'posts:list'
export const SCHOOLS_CACHE_TAG = 'schools'
export const SCHOOL_SUB_CHANNELS_CACHE_TAG = 'school-sub-channels'

export type PostCacheReference = {
  schoolId?: number | string | null
  slug?: string | null
  subChannelId?: number | string | null
}

export function postCacheTag(slug: string) {
  return `post:${slug}`
}

export function postsBySchoolCacheTag(schoolId: number | string) {
  return `posts:school:${schoolId}`
}

export function postsBySchoolChannelCacheTag(
  schoolId: number | string,
  subChannelId: number | string,
) {
  return `posts:school:${schoolId}:channel:${subChannelId}`
}

function addPostReferenceTags(tags: string[], reference: PostCacheReference) {
  tags.push(POST_LIST_CACHE_TAG)

  if (reference.slug) {
    tags.push(postCacheTag(reference.slug))
  }

  if (reference.schoolId) {
    tags.push(postsBySchoolCacheTag(reference.schoolId))
  }

  if (reference.schoolId && reference.subChannelId) {
    tags.push(postsBySchoolChannelCacheTag(reference.schoolId, reference.subChannelId))
  }
}

export function getPostRevalidationTags(...references: PostCacheReference[]) {
  const tags: string[] = []

  for (const reference of references) {
    addPostReferenceTags(tags, reference)
  }

  return [...new Set(tags)]
}
