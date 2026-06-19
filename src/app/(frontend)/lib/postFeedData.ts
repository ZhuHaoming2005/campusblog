import type { Media, Post, PostsSelect, School, SchoolSubChannel, Tag, User } from '@/payload-types'

import { getMediaImageAlt } from './mediaAlt'
import {
  estimatePostReadingMinutes,
  getPostAuthor,
  getPostCoverImage,
  getPostPreviewText,
  getPostSchool,
  getPostSubChannel,
  getPostTags,
} from './postPresentation'

export const POST_FEED_SELECT = {
  author: true,
  coverImage: true,
  createdAt: true,
  excerpt: true,
  publishedAt: true,
  school: true,
  slug: true,
  subChannel: true,
  tags: true,
  title: true,
  updatedAt: true,
} satisfies PostsSelect

export type PostFeedRelation = {
  id: number | string
  name: string
  slug: string
}

export type PostFeedSchool = PostFeedRelation & {
  cityId?: number | string | null
}

export type PostFeedItem = {
  id: number | string
  authorAvatarUrl?: string | null
  authorName?: string | null
  coverImageAlt?: string | null
  coverImageUrl?: string | null
  createdAt: string
  excerpt?: string | null
  previewText: string
  publishedAt?: string | null
  readingMinutes: number
  school?: PostFeedSchool | null
  slug: string
  subChannel?: PostFeedRelation | null
  tagLabels: string[]
  tags: PostFeedRelation[]
  title: string
  updatedAt?: string | null
}

type RelationValue = number | string | { id?: number | string | null } | null | undefined
type PostFeedInput = Post | PostFeedItem

function isRelationDoc<T extends { id?: number | string | null }>(value: unknown): value is T {
  return Boolean(value) && typeof value === 'object' && 'id' in (value as { id?: unknown })
}

function getRelationId(value: RelationValue): number | string | null {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && (typeof value.id === 'number' || typeof value.id === 'string')) return value.id
  return null
}

function toRelation(value: SchoolSubChannel | Tag | null): PostFeedRelation | null {
  if (!value || !value.id || !value.name || !value.slug) return null

  return {
    id: value.id,
    name: value.name,
    slug: value.slug,
  }
}

function getSchoolCityId(school: School | null): number | string | null {
  if (!school || !('city' in school)) return null
  return getRelationId(school.city)
}

function toSchoolRelation(school: School | null): PostFeedSchool | null {
  if (!school || !school.id || !school.name || !school.slug) return null

  return {
    id: school.id,
    name: school.name,
    slug: school.slug,
    cityId: getSchoolCityId(school),
  }
}

function getAuthorAvatarUrl(author: User | null): string | null {
  const avatar = author?.avatar
  return isRelationDoc<Media>(avatar) ? (avatar.url ?? null) : null
}

function hasContent(post: Pick<Post, 'content'>): boolean {
  return Boolean(post.content)
}

function getReadingMinutes(post: Post, previewText: string): number {
  if (hasContent(post)) return estimatePostReadingMinutes(post)
  const compactPreview = previewText.replace(/\s+/g, '')
  return Math.max(1, Math.ceil(compactPreview.length / 500))
}

export function isPostFeedItem(post: PostFeedInput): post is PostFeedItem {
  return (
    typeof post === 'object' &&
    post !== null &&
    'previewText' in post &&
    'tagLabels' in post &&
    'readingMinutes' in post
  )
}

export function toPostFeedItem(post: PostFeedInput): PostFeedItem {
  if (isPostFeedItem(post)) return post

  const author = getPostAuthor(post)
  const coverImage = getPostCoverImage(post)
  const school = getPostSchool(post)
  const subChannel = getPostSubChannel(post)
  const tags = getPostTags(post).map(toRelation).filter((tag): tag is PostFeedRelation => Boolean(tag))
  const previewText = hasContent(post) ? getPostPreviewText(post) : (post.excerpt?.trim() ?? '')

  return {
    id: post.id,
    authorAvatarUrl: getAuthorAvatarUrl(author),
    authorName: author?.displayName ?? null,
    coverImageAlt: getMediaImageAlt(coverImage?.alt, 'cover-image'),
    coverImageUrl: coverImage?.url ?? null,
    createdAt: post.createdAt,
    excerpt: post.excerpt ?? null,
    previewText,
    publishedAt: post.publishedAt ?? null,
    readingMinutes: getReadingMinutes(post, previewText),
    school: toSchoolRelation(school),
    slug: post.slug,
    subChannel: toRelation(subChannel),
    tagLabels: tags.map((tag) => tag.name),
    tags,
    title: post.title,
    updatedAt: post.updatedAt,
  }
}

export function toPostFeedItems(posts: PostFeedInput[]): PostFeedItem[] {
  return posts.map(toPostFeedItem)
}
