import 'server-only'

import { cacheLife, cacheTag } from 'next/cache'

import type { Post, School, SchoolSubChannel, User } from '@/payload-types'
import {
  CMS_CONTENT_CACHE_LIFE,
  CMS_STRUCTURE_CACHE_LIFE,
  POST_LIST_CACHE_TAG,
  SCHOOL_SUB_CHANNELS_CACHE_TAG,
  SCHOOLS_CACHE_TAG,
  getPostRelationshipCacheTags,
  postCacheTag,
  postsBySchoolCacheTag,
  postsBySchoolChannelCacheTag,
} from './cacheTags'
import { getFrontendPayload } from './frontendSession'

const POST_LIST_LIMIT = 20
const SCHOOL_LIST_LIMIT = 50
export const STATIC_PARAMS_PLACEHOLDER_SLUG = '__placeholder__'
export const STATIC_PARAMS_PLACEHOLDER_CHANNEL_SLUG = '__placeholder_channel__'

type DiscoverPageData = {
  posts: Post[]
}

type SchoolLayoutData = {
  school: School
  subChannels: SchoolSubChannel[]
}

type SchoolPageData = SchoolLayoutData & {
  posts: Post[]
}

type ChannelPageData = {
  school: School
  channel: SchoolSubChannel
  posts: Post[]
}

function isBuildTimeStaticGeneration() {
  return process.env.NEXT_PHASE === 'phase-production-build' || process.env.npm_lifecycle_event === 'build'
}

function isMissingLocalD1SchemaError(error: unknown) {
  let current: unknown = error

  while (current && typeof current === 'object') {
    const message = 'message' in current ? String(current.message) : ''
    if (message.includes('D1_ERROR') && message.includes('no such table')) {
      return true
    }
    current = 'cause' in current ? current.cause : null
  }

  return false
}

function shouldUseBuildTimeCmsFallback(error: unknown) {
  return isBuildTimeStaticGeneration() && isMissingLocalD1SchemaError(error)
}

async function getPayloadClient() {
  return getFrontendPayload()
}

function cachePostRelationshipTags(
  posts: Post | Post[] | null,
  options?: Parameters<typeof getPostRelationshipCacheTags>[1],
) {
  const relationshipTags = getPostRelationshipCacheTags(posts, options)
  if (relationshipTags.length > 0) {
    cacheTag(...relationshipTags)
  }
}

export async function getActiveSchools() {
  'use cache'

  cacheLife(CMS_STRUCTURE_CACHE_LIFE)
  cacheTag(SCHOOLS_CACHE_TAG)

  if (isBuildTimeStaticGeneration()) {
    return []
  }

  const payload = await getPayloadClient()
  let docs: unknown[]

  try {
    const result = await payload.find({
      collection: 'schools',
      where: { isActive: { equals: true } },
      sort: 'sortOrder',
      limit: SCHOOL_LIST_LIMIT,
      depth: 0,
    })
    docs = result.docs
  } catch (error) {
    if (shouldUseBuildTimeCmsFallback(error)) {
      return []
    }
    throw error
  }

  return docs as School[]
}

export async function getSchoolBySlug(slug: string) {
  'use cache'

  cacheLife(CMS_STRUCTURE_CACHE_LIFE)
  cacheTag(SCHOOLS_CACHE_TAG)

  if (isBuildTimeStaticGeneration()) {
    return null
  }

  const payload = await getPayloadClient()
  let docs: unknown[]

  try {
    const result = await payload.find({
      collection: 'schools',
      where: {
        and: [{ slug: { equals: slug } }, { isActive: { equals: true } }],
      },
      limit: 1,
      depth: 0,
    })
    docs = result.docs
  } catch (error) {
    if (shouldUseBuildTimeCmsFallback(error)) {
      return null
    }
    throw error
  }

  return (docs[0] as School | undefined) ?? null
}

export async function getSubChannelsBySchool(schoolId: number) {
  'use cache'

  cacheLife(CMS_STRUCTURE_CACHE_LIFE)
  cacheTag(SCHOOL_SUB_CHANNELS_CACHE_TAG)

  if (isBuildTimeStaticGeneration()) {
    return []
  }

  const payload = await getPayloadClient()
  let docs: unknown[]

  try {
    const result = await payload.find({
      collection: 'school-sub-channels',
      where: {
        and: [{ school: { equals: schoolId } }, { isActive: { equals: true } }],
      },
      sort: 'sortOrder',
      limit: SCHOOL_LIST_LIMIT,
      depth: 0,
    })
    docs = result.docs
  } catch (error) {
    if (shouldUseBuildTimeCmsFallback(error)) {
      return []
    }
    throw error
  }

  return docs as SchoolSubChannel[]
}

export async function getSchoolSubChannelBySlug(schoolId: number, channelSlug: string) {
  'use cache'

  cacheLife(CMS_STRUCTURE_CACHE_LIFE)
  cacheTag(SCHOOL_SUB_CHANNELS_CACHE_TAG)

  if (isBuildTimeStaticGeneration()) {
    return null
  }

  const payload = await getPayloadClient()
  let docs: unknown[]

  try {
    const result = await payload.find({
      collection: 'school-sub-channels',
      where: {
        and: [
          { school: { equals: schoolId } },
          { slug: { equals: channelSlug } },
          { isActive: { equals: true } },
        ],
      },
      limit: 1,
      depth: 0,
    })
    docs = result.docs
  } catch (error) {
    if (shouldUseBuildTimeCmsFallback(error)) {
      return null
    }
    throw error
  }

  return (docs[0] as SchoolSubChannel | undefined) ?? null
}

export async function getPublishedPosts() {
  'use cache'

  cacheLife(CMS_CONTENT_CACHE_LIFE)
  cacheTag(POST_LIST_CACHE_TAG)

  if (isBuildTimeStaticGeneration()) {
    return []
  }

  const payload = await getPayloadClient()
  let docs: unknown[]

  try {
    const result = await payload.find({
      collection: 'posts',
      where: { status: { equals: 'published' } },
      sort: '-publishedAt',
      limit: POST_LIST_LIMIT,
      depth: 2,
    })
    docs = result.docs
  } catch (error) {
    if (shouldUseBuildTimeCmsFallback(error)) {
      return []
    }
    throw error
  }

  const posts = docs as Post[]
  cachePostRelationshipTags(posts)

  return posts
}

export async function getPublishedPostBySlug(slug: string) {
  'use cache'

  cacheLife(CMS_CONTENT_CACHE_LIFE)
  cacheTag(postCacheTag(slug))

  if (isBuildTimeStaticGeneration()) {
    return null
  }

  const payload = await getPayloadClient()
  let docs: unknown[]

  try {
    const result = await payload.find({
      collection: 'posts',
      where: {
        and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }],
      },
      limit: 1,
      depth: 2,
    })
    docs = result.docs
  } catch (error) {
    if (shouldUseBuildTimeCmsFallback(error)) {
      return null
    }
    throw error
  }

  const post = (docs[0] as Post | undefined) ?? null
  cachePostRelationshipTags(post, { includeAllPostTags: true })

  return post
}

export async function getVisiblePostBySlug(slug: string, user: User | null) {
  if (isBuildTimeStaticGeneration()) {
    return null
  }

  const payload = await getPayloadClient()

  const where = user
    ? {
        and: [
          { slug: { equals: slug } },
          {
            or: [
              { status: { equals: 'published' } },
              {
                and: [{ status: { equals: 'hidden' } }, { author: { equals: user.id } }],
              },
            ],
          },
        ],
      }
    : {
        and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }],
      }

  let docs: unknown[]

  try {
    const result = await payload.find({
      collection: 'posts',
      where,
      limit: 1,
      depth: 2,
      ...(user ? { user, overrideAccess: false } : {}),
    })
    docs = result.docs
  } catch (error) {
    if (shouldUseBuildTimeCmsFallback(error)) {
      return null
    }
    throw error
  }

  return (docs[0] as Post | undefined) ?? null
}

export async function getPublishedPostsBySchool(schoolId: number) {
  'use cache'

  cacheLife(CMS_CONTENT_CACHE_LIFE)
  cacheTag(postsBySchoolCacheTag(schoolId))

  if (isBuildTimeStaticGeneration()) {
    return []
  }

  const payload = await getPayloadClient()
  let docs: unknown[]

  try {
    const result = await payload.find({
      collection: 'posts',
      where: {
        and: [{ school: { equals: schoolId } }, { status: { equals: 'published' } }],
      },
      sort: '-publishedAt',
      limit: POST_LIST_LIMIT,
      depth: 2,
    })
    docs = result.docs
  } catch (error) {
    if (shouldUseBuildTimeCmsFallback(error)) {
      return []
    }
    throw error
  }

  const posts = docs as Post[]
  cachePostRelationshipTags(posts)

  return posts
}

export async function getPublishedPostsBySchoolAndChannel(schoolId: number, channelId: number) {
  'use cache'

  cacheLife(CMS_CONTENT_CACHE_LIFE)
  cacheTag(postsBySchoolChannelCacheTag(schoolId, channelId))

  if (isBuildTimeStaticGeneration()) {
    return []
  }

  const payload = await getPayloadClient()
  let docs: unknown[]

  try {
    const result = await payload.find({
      collection: 'posts',
      where: {
        and: [
          { school: { equals: schoolId } },
          { subChannel: { equals: channelId } },
          { status: { equals: 'published' } },
        ],
      },
      sort: '-publishedAt',
      limit: POST_LIST_LIMIT,
      depth: 2,
    })
    docs = result.docs
  } catch (error) {
    if (shouldUseBuildTimeCmsFallback(error)) {
      return []
    }
    throw error
  }

  const posts = docs as Post[]
  cachePostRelationshipTags(posts)

  return posts
}

export async function getDiscoverPageData(): Promise<DiscoverPageData> {
  return {
    posts: await getPublishedPosts(),
  }
}

export async function getSchoolLayoutData(slug: string): Promise<SchoolLayoutData | null> {
  const school = await getSchoolBySlug(slug)
  if (!school) return null

  const subChannels = await getSubChannelsBySchool(school.id)

  return {
    school,
    subChannels,
  }
}

export async function getSchoolPageData(slug: string): Promise<SchoolPageData | null> {
  const school = await getSchoolBySlug(slug)
  if (!school) return null

  const [posts, subChannels] = await Promise.all([
    getPublishedPostsBySchool(school.id),
    getSubChannelsBySchool(school.id),
  ])

  return {
    school,
    posts,
    subChannels,
  }
}

export async function getChannelPageData(
  slug: string,
  channelSlug: string,
): Promise<ChannelPageData | null> {
  const school = await getSchoolBySlug(slug)
  if (!school) return null

  const channel = await getSchoolSubChannelBySlug(school.id, channelSlug)
  if (!channel) return null

  const posts = await getPublishedPostsBySchoolAndChannel(school.id, channel.id)

  return {
    school,
    channel,
    posts,
  }
}

export async function getActiveSchoolParams() {
  const schools = await getActiveSchools()

  if (schools.length === 0) {
    return [{ slug: STATIC_PARAMS_PLACEHOLDER_SLUG }]
  }

  return schools.map((school) => ({
    slug: school.slug,
  }))
}

export async function getActiveSchoolChannelParams() {
  const schools = await getActiveSchools()
  const schoolChannels = await Promise.all(
    schools.map(async (school) => {
      const subChannels = await getSubChannelsBySchool(school.id)

      return subChannels.map((channel) => ({
        slug: school.slug,
        channelSlug: channel.slug,
      }))
    }),
  )

  const params = schoolChannels.flat()

  if (params.length === 0) {
    return [
      {
        slug: STATIC_PARAMS_PLACEHOLDER_SLUG,
        channelSlug: STATIC_PARAMS_PLACEHOLDER_CHANNEL_SLUG,
      },
    ]
  }

  return params
}
