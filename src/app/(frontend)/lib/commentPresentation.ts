import type { Comment, User } from '@/payload-types'

type RelationValue = number | string | { id?: number | string | null } | null | undefined

export type FrontendComment = {
  id: number
  author: {
    id: number | string
    avatarUrl?: string | null
    displayName: string
  } | null
  content: string
  createdAt: string
}

function extractRelationID(value: RelationValue): number | string | null {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && (typeof value.id === 'number' || typeof value.id === 'string')) return value.id
  return null
}

function getCommentAuthor(comment: Comment): FrontendComment['author'] {
  if (!comment.author || typeof comment.author !== 'object') return null

  const author = comment.author as User
  const authorID = extractRelationID(author.id)
  if (!authorID) return null

  return {
    id: authorID,
    avatarUrl: author.avatar && typeof author.avatar === 'object' ? author.avatar.url : null,
    displayName: author.displayName,
  }
}

export function toFrontendComment(comment: Comment): FrontendComment {
  return {
    id: comment.id,
    author: getCommentAuthor(comment),
    content: comment.content,
    createdAt: comment.createdAt,
  }
}
