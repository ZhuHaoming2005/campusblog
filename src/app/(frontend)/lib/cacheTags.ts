export const CMS_CONTENT_CACHE_LIFE = {
  stale: 300,
  revalidate: 3600,
  expire: 86400,
} as const

export const CMS_STRUCTURE_CACHE_LIFE = {
  stale: 300,
  revalidate: 3600,
  expire: 604800,
} as const

export const POST_LIST_CACHE_TAG = 'posts:list'
export const SCHOOLS_CACHE_TAG = 'schools'
export const SCHOOL_SUB_CHANNELS_CACHE_TAG = 'school-sub-channels'
export const NEXT_CUSTOM_CACHE_TAG_LIMIT = 128
export const RELATIONSHIP_CACHE_TAG_BUDGET = NEXT_CUSTOM_CACHE_TAG_LIMIT - 1

export type PostCacheReference = {
  schoolId?: number | string | null
  slug?: string | null
  subChannelId?: number | string | null
}

type RelationDocument = { id?: number | string | null }
type RelationValue = number | string | RelationDocument | null | undefined
type AuthorRelationValue =
  | RelationValue
  | (RelationDocument & {
      avatar?: RelationValue
    })

type PostRelationshipCacheReference = {
  author?: AuthorRelationValue
  coverImage?: RelationValue
  school?: RelationValue
  subChannel?: RelationValue
  tags?: RelationValue[] | null
}

type PostRelationshipCacheTagOptions = {
  includeAllPostTags?: boolean
  maxTags?: number
}

function hashCacheKey(value: string) {
  let hash = 0xcbf29ce484222325n
  const prime = 0x100000001b3n

  for (const char of value) {
    hash ^= BigInt(char.codePointAt(0) ?? 0)
    hash = BigInt.asUintN(64, hash * prime)
  }

  return hash.toString(16).padStart(16, '0')
}

function getRelationId(value: RelationValue): number | string | null {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && (typeof value.id === 'number' || typeof value.id === 'string')) return value.id
  return null
}

function getAuthorAvatarId(value: AuthorRelationValue): number | string | null {
  if (!value || typeof value !== 'object' || !('avatar' in value)) return null
  return getRelationId(value.avatar)
}

function addUniqueTag(tags: string[], tag: string | null, maxTags: number) {
  if (!tag || tags.length >= maxTags || tags.includes(tag)) return
  tags.push(tag)
}

export function postCacheTag(slug: string) {
  return `post:${hashCacheKey(slug)}`
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

export function schoolCacheTag(schoolId: number | string) {
  return `school:${schoolId}`
}

export function schoolSubChannelCacheTag(subChannelId: number | string) {
  return `channel:${subChannelId}`
}

export function mediaCacheTag(mediaId: number | string) {
  return `media:${mediaId}`
}

export function tagCacheTag(tagId: number | string) {
  return `tag:${tagId}`
}

export function authorCacheTag(authorId: number | string) {
  return `author:${authorId}`
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

export function getPostRelationshipCacheTags(
  posts: PostRelationshipCacheReference | PostRelationshipCacheReference[] | null | undefined,
  options: PostRelationshipCacheTagOptions = {},
) {
  const { includeAllPostTags = false, maxTags = RELATIONSHIP_CACHE_TAG_BUDGET } = options
  const postList = Array.isArray(posts) ? posts : posts ? [posts] : []
  const tags: string[] = []

  for (const post of postList) {
    const authorId = getRelationId(post.author)
    if (authorId) addUniqueTag(tags, authorCacheTag(authorId), maxTags)

    const authorAvatarId = getAuthorAvatarId(post.author)
    if (authorAvatarId) addUniqueTag(tags, mediaCacheTag(authorAvatarId), maxTags)

    const schoolId = getRelationId(post.school)
    if (schoolId) addUniqueTag(tags, schoolCacheTag(schoolId), maxTags)

    const subChannelId = getRelationId(post.subChannel)
    if (subChannelId) addUniqueTag(tags, schoolSubChannelCacheTag(subChannelId), maxTags)

    const mediaId = getRelationId(post.coverImage)
    if (mediaId) addUniqueTag(tags, mediaCacheTag(mediaId), maxTags)

    const postTags = includeAllPostTags ? (post.tags ?? []) : (post.tags ?? []).slice(0, 1)
    for (const tag of postTags) {
      const tagId = getRelationId(tag)
      if (tagId) addUniqueTag(tags, tagCacheTag(tagId), maxTags)
    }
  }

  return tags
}
