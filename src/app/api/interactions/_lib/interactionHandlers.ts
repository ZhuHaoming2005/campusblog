import type { Where } from 'payload'

import type { User } from '@/payload-types'
import { getFrontendPayload } from '@/lib/frontendSession'
import { requireFrontendAuth, toAuthFailureResponse } from '@/app/api/auth/_lib/frontendAuth'

type AuthUser = User & {
  _verified?: boolean | null
}

type InteractionCollection = 'post-bookmarks' | 'post-likes' | 'user-follows'

async function requireInteractionAuth(headers: Headers) {
  const auth = await requireFrontendAuth({
    headers,
    nextPath: '/',
    requireVerified: true,
  })

  if (auth.ok === false) {
    return {
      response: toAuthFailureResponse(auth),
      user: null as AuthUser | null,
    }
  }

  return {
    response: null,
    user: auth.user as AuthUser,
  }
}

function toNumericId(value: string): number | null {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function isUniqueConflict(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /unique/i.test(message)
}

function ownWhere(userID: number | string, field: string, id: number | string): Where {
  return {
    and: [{ user: { equals: userID } }, { [field]: { equals: id } }],
  }
}

function followWhere(userID: number | string, followingID: number | string): Where {
  return {
    and: [{ follower: { equals: userID } }, { following: { equals: followingID } }],
  }
}

async function setPostInteraction(args: {
  collection: Extract<InteractionCollection, 'post-bookmarks' | 'post-likes'>
  enabled: boolean
  field: 'bookmarked' | 'liked'
  postId: number
  request: Request
}) {
  const auth = await requireInteractionAuth(args.request.headers)
  if (!auth.user) return auth.response

  const payload = await getFrontendPayload()
  await payload.findByID({
    collection: 'posts',
    depth: 0,
    id: args.postId,
    overrideAccess: false,
    user: auth.user,
  })

  const where = ownWhere(auth.user.id, 'post', args.postId)
  const existing = await payload.find({
    collection: args.collection,
    depth: 0,
    limit: 1,
    overrideAccess: false,
    user: auth.user,
    where,
  })

  if (args.enabled && existing.docs.length === 0) {
    try {
      await payload.create({
        collection: args.collection,
        data: {
          post: args.postId,
          user: auth.user.id,
        },
        overrideAccess: false,
        user: auth.user,
      })
    } catch (error) {
      if (!isUniqueConflict(error)) throw error
    }
  }

  if (!args.enabled && existing.docs.length > 0) {
    await payload.delete({
      collection: args.collection,
      overrideAccess: false,
      user: auth.user,
      where,
    })
  }

  return Response.json({ [args.field]: args.enabled, postId: args.postId })
}

export async function POSTPostLike(
  request: Request,
  context: { params: Promise<{ postId: string }> },
) {
  const { postId } = await context.params
  const numericPostId = toNumericId(postId)
  if (!numericPostId) return Response.json({ error: 'postId is required.' }, { status: 400 })

  return setPostInteraction({
    collection: 'post-likes',
    enabled: true,
    field: 'liked',
    postId: numericPostId,
    request,
  })
}

export async function DELETEPostLike(
  request: Request,
  context: { params: Promise<{ postId: string }> },
) {
  const { postId } = await context.params
  const numericPostId = toNumericId(postId)
  if (!numericPostId) return Response.json({ error: 'postId is required.' }, { status: 400 })

  return setPostInteraction({
    collection: 'post-likes',
    enabled: false,
    field: 'liked',
    postId: numericPostId,
    request,
  })
}

export async function POSTPostBookmark(
  request: Request,
  context: { params: Promise<{ postId: string }> },
) {
  const { postId } = await context.params
  const numericPostId = toNumericId(postId)
  if (!numericPostId) return Response.json({ error: 'postId is required.' }, { status: 400 })

  return setPostInteraction({
    collection: 'post-bookmarks',
    enabled: true,
    field: 'bookmarked',
    postId: numericPostId,
    request,
  })
}

export async function DELETEPostBookmark(
  request: Request,
  context: { params: Promise<{ postId: string }> },
) {
  const { postId } = await context.params
  const numericPostId = toNumericId(postId)
  if (!numericPostId) return Response.json({ error: 'postId is required.' }, { status: 400 })

  return setPostInteraction({
    collection: 'post-bookmarks',
    enabled: false,
    field: 'bookmarked',
    postId: numericPostId,
    request,
  })
}

async function setUserFollow(args: { enabled: boolean; followingId: number; request: Request }) {
  const auth = await requireInteractionAuth(args.request.headers)
  if (!auth.user) return auth.response

  if (String(auth.user.id) === String(args.followingId)) {
    return Response.json({ error: 'Users cannot follow themselves.' }, { status: 400 })
  }

  const payload = await getFrontendPayload()
  await payload.findByID({
    collection: 'users',
    depth: 0,
    id: args.followingId,
    overrideAccess: true,
    select: {
      isActive: true,
    },
  })

  const where = followWhere(auth.user.id, args.followingId)
  const existing = await payload.find({
    collection: 'user-follows',
    depth: 0,
    limit: 1,
    overrideAccess: false,
    user: auth.user,
    where,
  })

  if (args.enabled && existing.docs.length === 0) {
    try {
      await payload.create({
        collection: 'user-follows',
        data: {
          follower: auth.user.id,
          following: args.followingId,
        },
        overrideAccess: false,
        user: auth.user,
      })
    } catch (error) {
      if (!isUniqueConflict(error)) throw error
    }
  }

  if (!args.enabled && existing.docs.length > 0) {
    await payload.delete({
      collection: 'user-follows',
      overrideAccess: false,
      user: auth.user,
      where,
    })
  }

  return Response.json({ following: args.enabled, userId: args.followingId })
}

export async function POSTUserFollow(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const { userId } = await context.params
  const numericUserId = toNumericId(userId)
  if (!numericUserId) return Response.json({ error: 'userId is required.' }, { status: 400 })

  return setUserFollow({
    enabled: true,
    followingId: numericUserId,
    request,
  })
}

export async function DELETEUserFollow(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const { userId } = await context.params
  const numericUserId = toNumericId(userId)
  if (!numericUserId) return Response.json({ error: 'userId is required.' }, { status: 400 })

  return setUserFollow({
    enabled: false,
    followingId: numericUserId,
    request,
  })
}
