import 'server-only'

import { cacheLife, cacheTag } from 'next/cache'

import type { Post, School, SchoolSubChannel } from '@/payload-types'
import { getFrontendPayload } from './frontendSession'

const POST_LIST_LIMIT = 20
const SCHOOL_LIST_LIMIT = 50

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

  cacheLife({ stale: 300, revalidate: 60 * 30, expire: 60 * 60 * 24 })
  cacheTag('schools')

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

  cacheLife({ stale: 300, revalidate: 60 * 10, expire: 60 * 60 })
  cacheTag('schools')

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

  cacheLife({ stale: 300, revalidate: 60 * 10, expire: 60 * 60 })
  cacheTag('school-sub-channels')

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

  cacheLife({ stale: 300, revalidate: 60 * 10, expire: 60 * 60 })
  cacheTag('school-sub-channels')

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

  cacheLife('minutes')
  cacheTag('posts')

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

  cacheLife('minutes')
  cacheTag('posts')

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

export async function getPublishedPostsBySchool(schoolId: number) {
  'use cache'

  cacheLife('minutes')
  cacheTag('posts')
  cacheTag('posts-by-school')

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

  cacheLife('minutes')
  cacheTag('posts')
  cacheTag('posts-by-school-channel')

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
  'use cache'

  cacheLife('minutes')
  cacheTag('posts')

  return {
    posts: await getPublishedPosts(),
  }
}

export async function getSchoolLayoutData(slug: string): Promise<SchoolLayoutData | null> {
  'use cache'

  cacheLife({ stale: 300, revalidate: 60 * 10, expire: 60 * 60 })
  cacheTag('schools')
  cacheTag('school-sub-channels')

  const school = await getSchoolBySlug(slug)
  if (!school) return null

  const subChannels = await getSubChannelsBySchool(school.id)

  return {
    school,
    subChannels,
  }
}

export async function getSchoolPageData(slug: string): Promise<SchoolPageData | null> {
  'use cache'

  cacheLife('minutes')
  cacheTag('schools')
  cacheTag('school-sub-channels')
  cacheTag('posts')
  cacheTag('posts-by-school')

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
  'use cache'

  cacheLife('minutes')
  cacheTag('schools')
  cacheTag('school-sub-channels')
  cacheTag('posts')
  cacheTag('posts-by-school-channel')

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
