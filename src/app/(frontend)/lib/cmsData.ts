import 'server-only'

import { cacheLife, cacheTag } from 'next/cache'

import type { Post, School, SchoolSubChannel, User } from '@/payload-types'
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

async function getPayloadClient() {
  return getFrontendPayload()
}

export async function getActiveSchools() {
  'use cache'

  cacheLife(CMS_STRUCTURE_CACHE_LIFE)
  cacheTag(SCHOOLS_CACHE_TAG)

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

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'posts',
    where: { status: { equals: 'published' } },
    sort: '-publishedAt',
    limit: POST_LIST_LIMIT,
    depth: 2,
  })

  return docs as Post[]
}

export async function getPublishedPostBySlug(slug: string) {
  'use cache'

  cacheLife(CMS_CONTENT_CACHE_LIFE)
  cacheTag(postCacheTag(slug))

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

export async function getVisiblePostBySlug(slug: string, user: User | null) {
  const payload = await getPayloadClient()

  const where = user
    ? {
        and: [
          { slug: { equals: slug } },
          {
            or: [
              { status: { equals: 'published' } },
              {
                and: [
                  { status: { equals: 'hidden' } },
                  { author: { equals: user.id } },
                ],
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

  return docs as Post[]
}

export async function getPublishedPostsBySchoolAndChannel(schoolId: number, channelId: number) {
  'use cache'

  cacheLife(CMS_CONTENT_CACHE_LIFE)
  cacheTag(postsBySchoolChannelCacheTag(schoolId, channelId))

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

  return docs as Post[]
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
