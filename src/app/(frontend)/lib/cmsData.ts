import 'server-only'

import { unstable_cache } from 'next/cache'

import type { Comment, Post, School, SchoolSubChannel, User } from '@/payload-types'
import { toFrontendComment, type FrontendComment } from './commentPresentation'
import {
  CMS_CONTENT_CACHE_LIFE,
  CMS_STRUCTURE_CACHE_LIFE,
  POST_LIST_CACHE_TAG,
  SCHOOL_SUB_CHANNELS_CACHE_TAG,
  SCHOOLS_CACHE_TAG,
  postCacheTag,
  postsBySchoolCacheTag,
  postsBySchoolChannelCacheTag,
} from './cacheTags'
import { getFrontendPayload } from './frontendSession'
import { POST_FEED_SELECT, toPostFeedItems, type PostFeedItem } from './postFeedData'

const POST_LIST_LIMIT = 20
const SCHOOL_LIST_LIMIT = 50
export const STATIC_PARAMS_PLACEHOLDER_SLUG = '__placeholder__'
export const STATIC_PARAMS_PLACEHOLDER_CHANNEL_SLUG = '__placeholder_channel__'

type DiscoverPageData = {
  nearbyPosts: PostFeedItem[]
  preferredCitySchoolIds: Array<number | string>
  preferredSchoolCityId: number | string | null
  preferredSchoolId: number | string | null
  posts: PostFeedItem[]
}

type PreferredSchoolContext = {
  cityId: number | string | null
  schoolId: number | string | null
}

type SchoolLayoutData = {
  school: School
  subChannels: SchoolSubChannel[]
}

type SchoolPageData = SchoolLayoutData & {
  posts: PostFeedItem[]
}

type ChannelPageData = {
  school: School
  channel: SchoolSubChannel
  posts: PostFeedItem[]
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

type RelationValue = number | string | { id?: number | string | null } | null | undefined

function getRelationId(value: RelationValue): number | string | null {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && (typeof value.id === 'number' || typeof value.id === 'string')) return value.id
  return null
}

async function readActiveSchools() {
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

const getActiveSchoolsCached = unstable_cache(readActiveSchools, ['active-schools'], {
  revalidate: CMS_STRUCTURE_CACHE_LIFE.revalidate,
  tags: [SCHOOLS_CACHE_TAG],
})

export async function getActiveSchools() {
  if (shouldSkipCmsQueriesDuringStaticGeneration()) {
    return []
  }

  return getActiveSchoolsCached()
}

async function readSchoolBySlug(slug: string) {
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

const getSchoolBySlugCached = unstable_cache(readSchoolBySlug, ['school-by-slug'], {
  revalidate: CMS_STRUCTURE_CACHE_LIFE.revalidate,
  tags: [SCHOOLS_CACHE_TAG],
})

export async function getSchoolBySlug(slug: string) {
  if (shouldSkipCmsQueriesDuringStaticGeneration()) {
    return null
  }

  return getSchoolBySlugCached(slug)
}

async function readSubChannelsBySchool(schoolId: number) {
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

const getSubChannelsBySchoolCached = unstable_cache(
  readSubChannelsBySchool,
  ['sub-channels-by-school'],
  {
    revalidate: CMS_STRUCTURE_CACHE_LIFE.revalidate,
    tags: [SCHOOL_SUB_CHANNELS_CACHE_TAG],
  },
)

export async function getSubChannelsBySchool(schoolId: number) {
  if (shouldSkipCmsQueriesDuringStaticGeneration()) {
    return []
  }

  return getSubChannelsBySchoolCached(schoolId)
}

async function readSchoolSubChannelBySlug(schoolId: number, channelSlug: string) {
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

const getSchoolSubChannelBySlugCached = unstable_cache(
  readSchoolSubChannelBySlug,
  ['school-sub-channel-by-slug'],
  {
    revalidate: CMS_STRUCTURE_CACHE_LIFE.revalidate,
    tags: [SCHOOL_SUB_CHANNELS_CACHE_TAG],
  },
)

export async function getSchoolSubChannelBySlug(schoolId: number, channelSlug: string) {
  if (shouldSkipCmsQueriesDuringStaticGeneration()) {
    return null
  }

  return getSchoolSubChannelBySlugCached(schoolId, channelSlug)
}

async function readPublishedPosts() {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'posts',
    where: { status: { equals: 'published' } },
    sort: '-publishedAt',
    limit: POST_LIST_LIMIT,
    depth: 2,
    select: POST_FEED_SELECT,
  })

  return toPostFeedItems(docs as Post[])
}

const getPublishedPostsCached = unstable_cache(readPublishedPosts, ['published-posts'], {
  revalidate: CMS_CONTENT_CACHE_LIFE.revalidate,
  tags: [POST_LIST_CACHE_TAG],
})

export async function getPublishedPosts() {
  if (shouldSkipCmsQueriesDuringStaticGeneration()) {
    return []
  }

  return getPublishedPostsCached()
}

async function readPublishedPostBySlug(slug: string) {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'posts',
    where: {
      and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }],
    },
    limit: 1,
    depth: 2,
  })

  return (docs[0] as Post | undefined) ?? null
}

export async function getPublishedPostBySlug(slug: string) {
  if (shouldSkipCmsQueriesDuringStaticGeneration()) {
    return null
  }

  return unstable_cache(readPublishedPostBySlug, ['published-post-by-slug', slug], {
    revalidate: CMS_CONTENT_CACHE_LIFE.revalidate,
    tags: [POST_LIST_CACHE_TAG, postCacheTag(slug)],
  })(slug)
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

async function readPublishedPostsBySchool(schoolId: number) {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'posts',
    where: {
      and: [{ school: { equals: schoolId } }, { status: { equals: 'published' } }],
    },
    sort: '-publishedAt',
    limit: POST_LIST_LIMIT,
    depth: 2,
    select: POST_FEED_SELECT,
  })

  return toPostFeedItems(docs as Post[])
}

export async function getPublishedPostsBySchool(schoolId: number) {
  if (shouldSkipCmsQueriesDuringStaticGeneration()) {
    return []
  }

  return unstable_cache(readPublishedPostsBySchool, ['published-posts-by-school', String(schoolId)], {
    revalidate: CMS_CONTENT_CACHE_LIFE.revalidate,
    tags: [POST_LIST_CACHE_TAG, postsBySchoolCacheTag(schoolId)],
  })(schoolId)
}

async function readPublishedPostsBySchoolAndChannel(schoolId: number, channelId: number) {
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
    select: POST_FEED_SELECT,
  })

  return toPostFeedItems(docs as Post[])
}

export async function getPublishedPostsBySchoolAndChannel(schoolId: number, channelId: number) {
  if (shouldSkipCmsQueriesDuringStaticGeneration()) {
    return []
  }

  return unstable_cache(
    readPublishedPostsBySchoolAndChannel,
    ['published-posts-by-school-channel', String(schoolId), String(channelId)],
    {
      revalidate: CMS_CONTENT_CACHE_LIFE.revalidate,
      tags: [
        POST_LIST_CACHE_TAG,
        postsBySchoolCacheTag(schoolId),
        postsBySchoolChannelCacheTag(schoolId, channelId),
      ],
    },
  )(schoolId, channelId)
}

export async function getUserPreferredSchoolContext(user: User | null): Promise<PreferredSchoolContext> {
  if (!user?.id || shouldSkipCmsQueriesDuringStaticGeneration()) {
    return { cityId: null, schoolId: null }
  }

  const payload = await getPayloadClient()
  const userDoc = await payload.findByID({
    collection: 'users',
    depth: 0,
    id: user.id,
    overrideAccess: false,
    select: {
      school: true,
    },
    user,
  })

  const schoolId = getRelationId((userDoc as { school?: RelationValue }).school)
  if (!schoolId) return { cityId: null, schoolId: null }

  const schoolResult = await payload.find({
    collection: 'schools',
    depth: 0,
    limit: 1,
    select: {
      city: true,
    },
    where: {
      and: [
        {
          id: {
            equals: schoolId,
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
  const school = schoolResult.docs[0] as { city?: RelationValue } | undefined

  return {
    cityId: getRelationId(school?.city),
    schoolId,
  }
}

export async function getUserPreferredSchoolId(user: User | null): Promise<number | string | null> {
  const context = await getUserPreferredSchoolContext(user)
  return context.schoolId
}

async function getPreferredCitySchoolIds(context: PreferredSchoolContext) {
  if (!context.cityId || shouldSkipCmsQueriesDuringStaticGeneration()) {
    return []
  }

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'schools',
    depth: 0,
    limit: SCHOOL_LIST_LIMIT,
    pagination: false,
    where: {
      and: [
        {
          city: {
            equals: context.cityId,
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

  const preferredSchoolKey = context.schoolId == null ? null : String(context.schoolId)

  return (docs as School[])
    .map((school) => school.id)
    .filter((schoolId) => String(schoolId) !== preferredSchoolKey)
}

async function getPublishedPostsBySchoolIds(schoolIds: Array<number | string>) {
  if (schoolIds.length === 0 || shouldSkipCmsQueriesDuringStaticGeneration()) {
    return []
  }

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'posts',
    depth: 2,
    limit: POST_LIST_LIMIT,
    select: POST_FEED_SELECT,
    sort: '-publishedAt',
    where: {
      and: [
        {
          status: {
            equals: 'published',
          },
        },
        {
          school: {
            in: schoolIds,
          },
        },
      ],
    },
  })

  return toPostFeedItems(docs as Post[])
}

export async function getDiscoverPageData(user: User | null = null): Promise<DiscoverPageData> {
  const [posts, preferredSchoolContext] = await Promise.all([
    getPublishedPosts(),
    getUserPreferredSchoolContext(user),
  ])
  const preferredCitySchoolIds = await getPreferredCitySchoolIds(preferredSchoolContext)
  const nearbyPosts = await getPublishedPostsBySchoolIds(preferredCitySchoolIds)

  return {
    nearbyPosts,
    posts,
    preferredCitySchoolIds,
    preferredSchoolCityId: preferredSchoolContext.cityId,
    preferredSchoolId: preferredSchoolContext.schoolId,
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
