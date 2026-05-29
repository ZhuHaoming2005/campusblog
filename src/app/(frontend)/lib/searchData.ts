import 'server-only'

import { cacheLife, cacheTag } from 'next/cache'
import type { Where } from 'payload'

import type { Post, PostsSelect } from '@/payload-types'
import {
  CMS_SEARCH_CACHE_LIFE,
  POST_LIST_CACHE_TAG,
  getPostRelationshipCacheTags,
  postsBySchoolCacheTag,
} from './cacheTags'
import { getFrontendPayload } from './frontendSession'
import { extractTextFromTiptapJson } from './tiptap-text'

export const SEARCH_POST_LIMIT = 20
export const SEARCH_QUERY_MAX_LENGTH = 100
export const SEARCH_CONTENT_PREVIEW_MAX_LENGTH = 220

const SEARCH_POST_SELECT: PostsSelect = {
  title: true,
  slug: true,
  excerpt: true,
  coverImage: true,
  author: true,
  tags: true,
  school: true,
  subChannel: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
}

const SEARCH_CONTENT_PREVIEW_SELECT: PostsSelect = {
  content: true,
}

type SearchQueryInput = string | string[] | null | undefined
type FrontendPayload = Awaited<ReturnType<typeof getFrontendPayload>>

export type SearchResultPost = Pick<
  Post,
  | 'id'
  | 'title'
  | 'slug'
  | 'excerpt'
  | 'coverImage'
  | 'author'
  | 'tags'
  | 'school'
  | 'subChannel'
  | 'publishedAt'
  | 'createdAt'
  | 'updatedAt'
> & {
  contentPreview?: string | null
}

type SearchContentPreviewPost = Pick<Post, 'id' | 'content'>

export type SearchPublishedPostsResult = {
  posts: SearchResultPost[]
  totalDocs: number
}

export function normalizeSearchQuery(input: SearchQueryInput): string {
  const rawValue = Array.isArray(input) ? input[0] : input
  return (rawValue ?? '').trim().slice(0, SEARCH_QUERY_MAX_LENGTH)
}

function emptySearchResult(): SearchPublishedPostsResult {
  return {
    posts: [],
    totalDocs: 0,
  }
}

async function addContentPreviewsForPostsWithoutExcerpts(
  payload: FrontendPayload,
  posts: SearchResultPost[],
): Promise<SearchResultPost[]> {
  const postsWithoutExcerpts = posts.filter((post) => !post.excerpt?.trim())

  if (postsWithoutExcerpts.length === 0) return posts

  const previewResult = await payload.find({
    collection: 'posts',
    depth: 0,
    limit: postsWithoutExcerpts.length,
    overrideAccess: false,
    select: SEARCH_CONTENT_PREVIEW_SELECT,
    where: {
      id: {
        in: postsWithoutExcerpts.map((post) => post.id),
      },
    },
  })
  const previewsByPostId = new Map(
    (previewResult.docs as SearchContentPreviewPost[]).map((post) => [
      String(post.id),
      extractTextFromTiptapJson(post.content, SEARCH_CONTENT_PREVIEW_MAX_LENGTH),
    ]),
  )

  return posts.map((post) => {
    if (post.excerpt?.trim()) return post

    const contentPreview = previewsByPostId.get(String(post.id))?.trim()
    if (!contentPreview) return post

    return {
      ...post,
      contentPreview,
    }
  })
}

async function searchPublishedPostsCached(
  normalizedQuery: string,
  schoolId?: number | string,
): Promise<SearchPublishedPostsResult> {
  'use cache'

  cacheLife(CMS_SEARCH_CACHE_LIFE)
  cacheTag(POST_LIST_CACHE_TAG)
  if (schoolId !== undefined && schoolId !== null) {
    cacheTag(postsBySchoolCacheTag(schoolId))
  }

  const andConditions: Where[] = [
    { status: { equals: 'published' } },
    ...(schoolId === undefined || schoolId === null ? [] : [{ school: { equals: schoolId } }]),
    {
      or: [
        { title: { contains: normalizedQuery } },
        { excerpt: { contains: normalizedQuery } },
      ],
    },
  ]

  const payload = await getFrontendPayload()
  const result = await payload.find({
    collection: 'posts',
    depth: 1,
    limit: SEARCH_POST_LIMIT,
    overrideAccess: false,
    select: SEARCH_POST_SELECT,
    sort: '-publishedAt',
    where: {
      and: andConditions,
    },
  })
  const posts = await addContentPreviewsForPostsWithoutExcerpts(
    payload,
    result.docs as SearchResultPost[],
  )
  const relationshipCacheTags = getPostRelationshipCacheTags(posts)

  if (relationshipCacheTags.length > 0) {
    cacheTag(...relationshipCacheTags)
  }

  return {
    posts,
    totalDocs: result.totalDocs,
  }
}

export async function searchPublishedPosts({
  query,
  schoolId,
}: {
  query: SearchQueryInput
  schoolId?: number | string
}): Promise<SearchPublishedPostsResult> {
  const normalizedQuery = normalizeSearchQuery(query)

  if (!normalizedQuery) {
    return emptySearchResult()
  }

  return searchPublishedPostsCached(normalizedQuery, schoolId)
}
