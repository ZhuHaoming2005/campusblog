import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import config from '@/payload.config'
import type { Post, School, SchoolSubChannel } from '@/payload-types'

const POST_LIST_LIMIT = 20
const SCHOOL_LIST_LIMIT = 50

async function getPayloadClient() {
  const payloadConfig = await config
  return getPayload({ config: payloadConfig })
}

const getActiveSchoolsCached = unstable_cache(
  async (): Promise<School[]> => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'schools',
      where: { isActive: { equals: true } },
      sort: 'sortOrder',
      limit: SCHOOL_LIST_LIMIT,
      depth: 0,
    })

    return docs
  },
  ['schools-active'],
  {
    revalidate: 60 * 30,
    tags: ['schools'],
  },
)

const getSchoolBySlugCached = unstable_cache(
  async (slug: string): Promise<School[]> => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'schools',
      where: {
        and: [{ slug: { equals: slug } }, { isActive: { equals: true } }],
      },
      limit: 1,
      depth: 0,
    })

    return docs
  },
  ['school-by-slug'],
  {
    revalidate: 60 * 10,
    tags: ['schools'],
  },
)

const getSubChannelsBySchoolCached = unstable_cache(
  async (schoolId: number): Promise<SchoolSubChannel[]> => {
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

    return docs
  },
  ['school-sub-channels-by-school'],
  {
    revalidate: 60 * 10,
    tags: ['school-sub-channels'],
  },
)

const getSchoolSubChannelBySlugCached = unstable_cache(
  async (schoolId: number, channelSlug: string): Promise<SchoolSubChannel[]> => {
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

    return docs
  },
  ['school-sub-channel-by-slug'],
  {
    revalidate: 60 * 10,
    tags: ['school-sub-channels'],
  },
)

const getPublishedPostsCached = unstable_cache(
  async (): Promise<Post[]> => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'posts',
      where: { status: { equals: 'published' } },
      sort: '-publishedAt',
      limit: POST_LIST_LIMIT,
      depth: 2,
    })

    return docs
  },
  ['posts-published'],
  {
    revalidate: 60,
    tags: ['posts'],
  },
)

const getPublishedPostBySlugCached = unstable_cache(
  async (slug: string): Promise<Post[]> => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'posts',
      where: {
        and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }],
      },
      limit: 1,
      depth: 2,
    })

    return docs
  },
  ['post-published-by-slug'],
  {
    revalidate: 60,
    tags: ['posts'],
  },
)

const getPublishedPostsBySchoolCached = unstable_cache(
  async (schoolId: number): Promise<Post[]> => {
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

    return docs
  },
  ['posts-published-by-school'],
  {
    revalidate: 60,
    tags: ['posts', 'posts-by-school'],
  },
)

const getPublishedPostsBySchoolAndChannelCached = unstable_cache(
  async (schoolId: number, channelId: number): Promise<Post[]> => {
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

    return docs
  },
  ['posts-published-by-school-channel'],
  {
    revalidate: 60,
    tags: ['posts', 'posts-by-school-channel'],
  },
)

export async function getActiveSchools() {
  return getActiveSchoolsCached()
}

export async function getSchoolBySlug(slug: string) {
  const schools = await getSchoolBySlugCached(slug)
  return schools[0] ?? null
}

export async function getSubChannelsBySchool(schoolId: number) {
  return getSubChannelsBySchoolCached(schoolId)
}

export async function getSchoolSubChannelBySlug(schoolId: number, channelSlug: string) {
  const channels = await getSchoolSubChannelBySlugCached(schoolId, channelSlug)
  return channels[0] ?? null
}

export async function getPublishedPosts() {
  return getPublishedPostsCached()
}

export async function getPublishedPostBySlug(slug: string) {
  const posts = await getPublishedPostBySlugCached(slug)
  return posts[0] ?? null
}

export async function getPublishedPostsBySchool(schoolId: number) {
  return getPublishedPostsBySchoolCached(schoolId)
}

export async function getPublishedPostsBySchoolAndChannel(schoolId: number, channelId: number) {
  return getPublishedPostsBySchoolAndChannelCached(schoolId, channelId)
}
