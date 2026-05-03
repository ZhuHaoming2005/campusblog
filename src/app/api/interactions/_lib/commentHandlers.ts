import type { Comment } from '@/payload-types'
import { toFrontendComment } from '@/lib/commentPresentation'
import { getCurrentFrontendUser, getFrontendPayload } from '@/lib/frontendSession'
import { requireFrontendAuth, toAuthFailureResponse } from '@/app/api/auth/_lib/frontendAuth'

type CommentBody = {
  content?: string
  parentId?: number | string | null
}

function toNumericId(value: number | string | undefined | null): number | null {
  if (value === undefined || value === null || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

async function readBody(request: Request): Promise<CommentBody> {
  if (!request.body) return {}
  return (await request.json()) as CommentBody
}

export async function GETPostComments(
  request: Request,
  context: { params: Promise<{ postId: string }> },
) {
  const { postId } = await context.params
  const numericPostId = toNumericId(postId)
  if (!numericPostId) return Response.json({ error: 'postId is required.' }, { status: 400 })

  const payload = await getFrontendPayload()
  const user = await getCurrentFrontendUser(request.headers)

  await payload.findByID({
    collection: 'posts',
    depth: 0,
    id: numericPostId,
    overrideAccess: false,
    ...(user ? { user } : {}),
  })

  const comments = await payload.find({
    collection: 'comments',
    depth: 1,
    limit: 100,
    overrideAccess: true,
    sort: 'createdAt',
    where: {
      and: [{ post: { equals: numericPostId } }, { status: { equals: 'published' } }],
    },
  })

  return Response.json({
    comments: (comments.docs as Comment[]).map(toFrontendComment),
    postId: numericPostId,
  })
}

export async function POSTPostComment(
  request: Request,
  context: { params: Promise<{ postId: string }> },
) {
  const { postId } = await context.params
  const numericPostId = toNumericId(postId)
  if (!numericPostId) return Response.json({ error: 'postId is required.' }, { status: 400 })

  const auth = await requireFrontendAuth({
    headers: request.headers,
    nextPath: `/post/${numericPostId}`,
    requireVerified: true,
  })

  if (auth.ok === false) {
    return toAuthFailureResponse(auth)
  }

  const body = await readBody(request)
  const content = body.content?.trim()
  if (!content) {
    return Response.json({ error: 'content is required.' }, { status: 400 })
  }
  if (content.length > 2000) {
    return Response.json({ error: 'content is too long.' }, { status: 400 })
  }

  const parentId = toNumericId(body.parentId)
  const payload = await getFrontendPayload()

  await payload.findByID({
    collection: 'posts',
    depth: 0,
    id: numericPostId,
    overrideAccess: false,
    user: auth.user,
  })

  const comment = await payload.create({
    collection: 'comments',
    data: {
      author: auth.user.id,
      content,
      ...(parentId ? { parent: parentId } : {}),
      post: numericPostId,
    } as never,
    depth: 1,
    overrideAccess: false,
    user: auth.user,
  })

  return Response.json(
    {
      comment: toFrontendComment(comment as Comment),
      postId: numericPostId,
    },
    { status: 201 },
  )
}
