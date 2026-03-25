import { getPayload } from 'payload'
import { revalidateTag } from 'next/cache'
import { after } from 'next/server'
import config from '@payload-config'

import { getDictionary } from '@/app/(frontend)/lib/i18n/dictionaries'
import { resolveRequestLocale } from '@/app/(frontend)/lib/i18n/locale'
import { projectQuotaForPublishedPost } from '@/quota/postQuota'

export const runtime = 'nodejs'
export const maxDuration = 15

type PostRequestBody = {
  title?: string
  content?: unknown
  school?: string | number
  subChannel?: string | number
  tags?: (string | number)[]
  excerpt?: string
  coverImage?: string | number | null
  status?: 'draft' | 'published'
}

const EMPTY_TIPTAP_DOC = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
    },
  ],
}

function toNumericId(value: string | number | undefined | null): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const num = Number(value)
  return Number.isFinite(num) ? num : undefined
}

function formatBytes(value: number, locale: string): string {
  const formatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: value >= 1024 * 1024 ? 1 : 0,
  })

  if (value >= 1024 * 1024 * 1024) return `${formatter.format(value / (1024 * 1024 * 1024))} GB`
  if (value >= 1024 * 1024) return `${formatter.format(value / (1024 * 1024))} MB`
  if (value >= 1024) return `${formatter.format(value / 1024)} KB`
  return `${formatter.format(value)} B`
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const locale = resolveRequestLocale({
      acceptLanguage: request.headers.get('accept-language'),
    })
    const t = getDictionary(locale)
    const { id } = await context.params
    const postId = toNumericId(id)

    if (!postId) {
      return Response.json({ error: t.post.notFoundTitle }, { status: 400 })
    }

    const body = (await request.json()) as PostRequestBody
    const { title, content, school, subChannel, tags, excerpt, coverImage, status } = body
    const nextStatus = status === 'draft' ? 'draft' : 'published'

    if (nextStatus === 'published' && (!title || typeof title !== 'string' || !title.trim())) {
      return Response.json({ error: t.editor.titleRequired }, { status: 400 })
    }
    if (nextStatus === 'published' && !content) {
      return Response.json({ error: t.editor.contentRequired }, { status: 400 })
    }
    if (!school) {
      return Response.json({ error: t.editor.schoolRequired }, { status: 400 })
    }

    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })

    if (!user) {
      return Response.json({ error: t.editor.authRequired }, { status: 401 })
    }

    const [currentUser, existingPost] = await Promise.all([
      payload.findByID({
        collection: 'users',
        depth: 0,
        id: user.id,
        overrideAccess: false,
        user,
      }),
      payload.findByID({
        collection: 'posts',
        depth: 0,
        id: postId,
        overrideAccess: false,
        user,
      }),
    ])

    const schoolId = toNumericId(school)
    if (!schoolId) {
      return Response.json({ error: t.editor.schoolRequired }, { status: 400 })
    }

    const normalizedTitle =
      title && typeof title === 'string' && title.trim()
        ? title.trim()
        : `Untitled Draft ${Date.now().toString(36)}`
    const normalizedContent = content ?? EMPTY_TIPTAP_DOC

    const data: Record<string, unknown> = {
      title: normalizedTitle,
      content: normalizedContent,
      school: schoolId,
      status: nextStatus,
      excerpt: excerpt?.trim() || null,
      subChannel: null,
    }

    const subChannelId = toNumericId(subChannel)
    if (subChannelId) data.subChannel = subChannelId

    const coverImageId = toNumericId(coverImage)
    if (coverImage !== undefined) {
      data.coverImage = coverImageId ?? null
    }

    data.tags =
      tags && Array.isArray(tags) && tags.length > 0
        ? tags.map((tag) => toNumericId(tag)).filter(Boolean)
        : []

    if (nextStatus === 'published') {
      const projection = await projectQuotaForPublishedPost({
        candidatePost: {
          content: normalizedContent,
          coverImage: coverImageId ?? existingPost.coverImage ?? null,
          excerpt: excerpt?.trim() || null,
          title: normalizedTitle,
        },
        excludePostId: postId,
        payload,
        quotaBytes: currentUser.quotaBytes,
        userId: currentUser.id,
      })

      if (!projection.allowed) {
        return Response.json(
          {
            error: `${t.editor.quotaExceeded} ${t.userCenter.remainingQuota}: ${formatBytes(projection.remainingBytes, locale)}. ${t.editor.requiredQuota}: ${formatBytes(projection.requiredBytes, locale)}.`,
            quota: projection,
          },
          { status: 400 },
        )
      }
    }

    const post = await payload.update({
      collection: 'posts',
      id: postId,
      overrideAccess: false,
      user,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: data as any,
    })

    revalidateTag('posts', 'max')
    revalidateTag('posts-by-school', 'max')
    revalidateTag('posts-by-school-channel', 'max')

    after(() => {
      const channelInfo = subChannelId ? ` channel=${subChannelId}` : ''
      console.info(
        `[posts:update] id=${post.id} slug=${post.slug} school=${schoolId}${channelInfo} status=${nextStatus}`,
      )
    })

    return Response.json({
      success: true,
      post: { id: post.id, slug: post.slug, status: post.status },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('PATCH /api/posts/[id] error:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const locale = resolveRequestLocale({
      acceptLanguage: request.headers.get('accept-language'),
    })
    const t = getDictionary(locale)
    const { id } = await context.params
    const postId = toNumericId(id)

    if (!postId) {
      return Response.json({ error: t.post.notFoundTitle }, { status: 400 })
    }

    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })

    if (!user) {
      return Response.json({ error: t.editor.authRequired }, { status: 401 })
    }

    const post = await payload.delete({
      collection: 'posts',
      id: postId,
      overrideAccess: false,
      user,
    })

    revalidateTag('posts', 'max')
    revalidateTag('posts-by-school', 'max')
    revalidateTag('posts-by-school-channel', 'max')

    after(() => {
      console.info(`[posts:delete] id=${post.id} slug=${post.slug}`)
    })

    return Response.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('DELETE /api/posts/[id] error:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
