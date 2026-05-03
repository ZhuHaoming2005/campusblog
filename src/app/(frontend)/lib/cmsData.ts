import 'server-only'

import { cacheLife, cacheTag } from 'next/cache'

import type { Comment, Post, School, SchoolSubChannel, User } from '@/payload-types'
import { toFrontendComment, type FrontendComment } from './commentPresentation'
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

export type SchoolSubscriptionState = {
  channels: Record<string, boolean>
  school: boolean
}

type SchoolPageData = SchoolLayoutData & {
  posts: Post[]
}

type ChannelPageData = {
  school: School
  channel: SchoolSubChannel
  posts: Post[]
}

export type PostInteractionState = {
  bookmarked: boolean
  followingAuthor: boolean
  liked: boolean
  likeCount: number
}

function shouldSkipCmsQueriesDuringStaticGeneration() {
  return (
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.npm_lifecycle_event === 'build'
  )
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

  if (shouldSkipCmsQueriesDuringStaticGeneration()) {
    return []
  }

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'schools',
    where: { isActive: { equals: true } },
    sort: 'sortOrder',
    limit: SCHOOL_LIST_LIMIT,
    depth: 0,
  })

  return docs as School[]
}

export async function getSchoolBySlug(slug: string) {
  'use cache'

  cacheLife(CMS_STRUCTURE_CACHE_LIFE)
  cacheTag(SCHOOLS_CACHE_TAG)

  if (shouldSkipCmsQueriesDuringStaticGeneration()) {
    return null
  }

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'schools',
    where: {
      and: [{ slug: { equals: slug } }, { isActive: { equals: true } }],
    },
    limit: 1,
    depth: 0,
  })

  return (docs[0] as School | undefined) ?? null
}

export async function getSubChannelsBySchool(schoolId: number) {
  'use cache'

  cacheLife(CMS_STRUCTURE_CACHE_LIFE)
  cacheTag(SCHOOL_SUB_CHANNELS_CACHE_TAG)

  if (shouldSkipCmsQueriesDuringStaticGeneration()) {
    return []
  }

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'school-sub-channels',
    where: {
      and: [{ school: { equals: schoolId } }, { isActive: { equals: true } }],
    },
    sort: 'sortOrder',
    limit: SCHOOL_LIST_LIMIT,
    depth: 0,
  })

  return docs as SchoolSubChannel[]
}

export async function getSchoolSubChannelBySlug(schoolId: number, channelSlug: string) {
  'use cache'

  cacheLife(CMS_STRUCTURE_CACHE_LIFE)
  cacheTag(SCHOOL_SUB_CHANNELS_CACHE_TAG)

  if (shouldSkipCmsQueriesDuringStaticGeneration()) {
    return null
  }

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
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

  return (docs[0] as SchoolSubChannel | undefined) ?? null
}

export async function getPublishedPosts() {
  'use cache'

  cacheLife(CMS_CONTENT_CACHE_LIFE)
  cacheTag(POST_LIST_CACHE_TAG)

  if (shouldSkipCmsQueriesDuringStaticGeneration()) {
    return []
  }

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'posts',
    where: { status: { equals: 'published' } },
    sort: '-publishedAt',
    limit: POST_LIST_LIMIT,
    depth: 2,
  })

  const posts = docs as Post[]
  cachePostRelationshipTags(posts)

  return posts
}

export async function getPublishedPostBySlug(slug: string) {
  'use cache'

  cacheLife(CMS_CONTENT_CACHE_LIFE)
  cacheTag(postCacheTag(slug))

  if (shouldSkipCmsQueriesDuringStaticGeneration()) {
    return null
  }

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'posts',
    where: {
      and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }],
    },
    limit: 1,
    depth: 2,
  })

  const post = (docs[0] as Post | undefined) ?? null
  cachePostRelationshipTags(post, { includeAllPostTags: true })

  return post
}

export async function getVisiblePostBySlug(slug: string, user: User | null) {
  if (shouldSkipCmsQueriesDuringStaticGeneration()) {
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

  const { docs } = await payload.find({
    collection: 'posts',
    where,
    limit: 1,
    depth: 2,
    ...(user ? { user, overrideAccess: false } : {}),
  })

  return (docs[0] as Post | undefined) ?? null
}

export async function getPublishedPostsBySchool(schoolId: number) {
  'use cache'

  cacheLife(CMS_CONTENT_CACHE_LIFE)
  cacheTag(postsBySchoolCacheTag(schoolId))

  if (shouldSkipCmsQueriesDuringStaticGeneration()) {
    return []
  }

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'posts',
    where: {
      and: [{ school: { equals: schoolId } }, { status: { equals: 'published' } }],
    },
    sort: '-publishedAt',
    limit: POST_LIST_LIMIT,
    depth: 2,
  })

  const posts = docs as Post[]
  cachePostRelationshipTags(posts)

  return posts
}

export async function getPublishedPostsBySchoolAndChannel(schoolId: number, channelId: number) {
  'use cache'

  cacheLife(CMS_CONTENT_CACHE_LIFE)
  cacheTag(postsBySchoolChannelCacheTag(schoolId, channelId))

  if (shouldSkipCmsQueriesDuringStaticGeneration()) {
    return []
  }

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
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

export async function getSchoolSubscriptionState(
  schoolId: number,
  channelIds: number[],
  user: User | null,
): Promise<SchoolSubscriptionState> {
  if (!user) {
    return {
      channels: {},
      school: false,
    }
  }

  const payload = await getPayloadClient()
  const [schoolSubscriptions, channelSubscriptions] = await Promise.all([
    payload.find({
      collection: 'school-subscriptions',
      depth: 0,
      limit: 1,
      overrideAccess: false,
      user,
      where: {
        and: [{ user: { equals: user.id } }, { school: { equals: schoolId } }],
      },
    }),
    channelIds.length > 0
      ? payload.find({
          collection: 'school-sub-channel-subscriptions',
          depth: 0,
          limit: channelIds.length,
          overrideAccess: false,
          user,
          where: {
            and: [{ user: { equals: user.id } }, { channel: { in: channelIds } }],
          },
        })
      : Promise.resolve({ docs: [] }),
  ])

  const channels = Object.fromEntries(
    channelSubscriptions.docs
      .map((subscription) => {
        const channel = (subscription as { channel?: number | string | { id?: number | string } })
          .channel
        const id =
          typeof channel === 'number' || typeof channel === 'string'
            ? channel
            : channel?.id

        return id ? [String(id), true] : null
      })
      .filter((entry): entry is [string, boolean] => Boolean(entry)),
  )

  return {
    channels,
    school: schoolSubscriptions.docs.length > 0,
  }
}

export async function getPublishedCommentsByPost(postId: number): Promise<FrontendComment[]> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'comments',
    depth: 1,
    limit: 100,
    overrideAccess: true,
    sort: 'createdAt',
    where: {
      and: [{ post: { equals: postId } }, { status: { equals: 'published' } }],
    },
  })

  return (docs as Comment[]).map(toFrontendComment)
}

export async function getPostInteractionState(
  postId: number,
  authorId: number | string | null,
  user: User | null,
): Promise<PostInteractionState> {
  const payload = await getPayloadClient()
  const likeCountPromise = payload.find({
    collection: 'post-likes',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { post: { equals: postId } },
  })

  if (!user) {
    const likeCount = await likeCountPromise
    return {
      bookmarked: false,
      followingAuthor: false,
      liked: false,
      likeCount: likeCount.totalDocs,
    }
  }

  const [likeCount, like, bookmark, follow] = await Promise.all([
    likeCountPromise,
    payload.find({
      collection: 'post-likes',
      depth: 0,
      limit: 1,
      overrideAccess: false,
      user,
      where: {
        and: [{ user: { equals: user.id } }, { post: { equals: postId } }],
      },
    }),
    payload.find({
      collection: 'post-bookmarks',
      depth: 0,
      limit: 1,
      overrideAccess: false,
      user,
      where: {
        and: [{ user: { equals: user.id } }, { post: { equals: postId } }],
      },
    }),
    authorId && String(authorId) !== String(user.id)
      ? payload.find({
          collection: 'user-follows',
          depth: 0,
          limit: 1,
          overrideAccess: false,
          user,
          where: {
            and: [{ follower: { equals: user.id } }, { following: { equals: authorId } }],
          },
        })
      : Promise.resolve({ docs: [] }),
  ])

  return {
    bookmarked: bookmark.docs.length > 0,
    followingAuthor: follow.docs.length > 0,
    liked: like.docs.length > 0,
    likeCount: likeCount.totalDocs,
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
