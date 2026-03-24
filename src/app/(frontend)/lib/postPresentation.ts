import type { Media, Post, School, SchoolSubChannel, Tag, User } from '@/payload-types'

import type { AppLocale } from './i18n/config'
import { extractTextFromTiptapJson } from './tiptap-text'

type RelationDoc = {
  id?: number | string | null
}

function isRelationDoc<T extends RelationDoc>(value: unknown): value is T {
  return Boolean(value) && typeof value === 'object' && 'id' in (value as RelationDoc)
}

export function getPostCoverImage(post: Post): Media | null {
  return isRelationDoc<Media>(post.coverImage) ? post.coverImage : null
}

export function getPostAuthor(post: Post): User | null {
  return isRelationDoc<User>(post.author) ? post.author : null
}

export function getPostSchool(post: Post): School | null {
  return isRelationDoc<School>(post.school) ? post.school : null
}

export function getPostSubChannel(post: Post): SchoolSubChannel | null {
  return isRelationDoc<SchoolSubChannel>(post.subChannel) ? post.subChannel : null
}

export function getPostPrimaryTag(post: Post): Tag | null {
  if (!Array.isArray(post.tags)) return null

  const firstTag = post.tags[0]
  return isRelationDoc<Tag>(firstTag) ? firstTag : null
}

export function getPostPreviewText(post: Post, maxLength = 220): string {
  const excerpt = post.excerpt?.trim()
  if (excerpt) return excerpt
  return extractTextFromTiptapJson(post.content, maxLength)
}

export function getPostPublishedLabel(
  value: string | null | undefined,
  locale: AppLocale,
): string | null {
  if (!value) return null

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
  }).format(parsed)
}

export function estimatePostReadingMinutes(post: Post): number {
  const text = extractTextFromTiptapJson(post.content, 12000).replace(/\s+/g, '')
  return Math.max(1, Math.ceil(text.length / 500))
}
