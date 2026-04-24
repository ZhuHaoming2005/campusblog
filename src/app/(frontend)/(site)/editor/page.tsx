import React, { Suspense } from 'react'
import { redirect } from 'next/navigation'
import type { JSONContent } from '@tiptap/core'

import type { Post } from '@/payload-types'
import { requireFrontendAuth } from '@/app/api/auth/_lib/frontendAuth'
import EditorForm from '@/components/editor/EditorForm'
import { getFrontendPayload } from '@/lib/frontendSession'
import { getFrontendRequestContext } from '@/lib/requestContext'

function toNumericId(value: string | number | undefined): number | undefined {
  if (value === undefined || value === '') return undefined
  const num = Number(value)
  return Number.isFinite(num) ? num : undefined
}

function toRelationId(value: unknown): string {
  if (typeof value === 'number' || typeof value === 'string') return String(value)
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: string | number | null }).id
    if (typeof id === 'number' || typeof id === 'string') return String(id)
  }
  return ''
}

function toMediaData(value: unknown): { alt?: string | null; id: string; url?: string | null } | null {
  if (!value || typeof value !== 'object' || !('id' in value)) return null

  const media = value as { alt?: string | null; id?: string | number | null; url?: string | null }
  if (typeof media.id !== 'string' && typeof media.id !== 'number') return null

  return {
    alt: media.alt,
    id: String(media.id),
    url: media.url,
  }
}

function toEditorContent(content: Post['content']): JSONContent | null {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return null
  return content as JSONContent
}

async function EditorPageContent({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>
}) {
  const [{ headers, t }, { draft }] = await Promise.all([
    getFrontendRequestContext(),
    searchParams,
  ])
  const auth = await requireFrontendAuth({
    headers,
    nextPath: '/editor',
    requireAuthorAccess: true,
    requireVerified: true,
  })

  if (auth.ok === false) {
    redirect(auth.location)
  }
  const currentUser = auth.user

  const payload = await getFrontendPayload()

  const draftId = toNumericId(draft)
  const [schoolsResult, subChannelsResult, tagsResult, initialPostResult] = await Promise.all([
    payload.find({
      collection: 'schools',
      where: { isActive: { equals: true } },
      sort: 'sortOrder',
      limit: 100,
      depth: 0,
    }),
    payload.find({
      collection: 'school-sub-channels',
      where: { isActive: { equals: true } },
      sort: 'sortOrder',
      limit: 500,
      depth: 0,
    }),
    payload.find({
      collection: 'tags',
      where: { isActive: { equals: true } },
      limit: 100,
      depth: 0,
    }),
    draftId
      ? payload
          .findByID({
            collection: 'posts',
            id: draftId,
            depth: 1,
            user: currentUser,
            overrideAccess: false,
          })
          .catch((): null => null)
      : Promise.resolve(null),
  ])

  const schools = schoolsResult.docs.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
  }))

  const subChannels = subChannelsResult.docs.map((ch) => ({
    id: ch.id,
    name: ch.name,
    slug: ch.slug,
    school:
      typeof ch.school === 'object' && ch.school !== null
        ? (ch.school as { id: string | number }).id
        : (ch.school as string | number),
  }))

  const tags = tagsResult.docs.map((tag) => ({
    id: tag.id,
    name: tag.name,
  }))

  if (draftId && (!initialPostResult || initialPostResult.status !== 'draft')) {
    redirect('/user/me')
  }

  const initialPost =
    initialPostResult && initialPostResult.status === 'draft'
      ? {
          id: String(initialPostResult.id),
          title: initialPostResult.title,
          excerpt: initialPostResult.excerpt ?? '',
          schoolId: toRelationId(initialPostResult.school),
          subChannelId: toRelationId(initialPostResult.subChannel),
          tagIds: (initialPostResult.tags ?? [])
            .map((tag: number | string | { id?: number | string | null }) => toRelationId(tag))
            .filter(Boolean),
          content: toEditorContent(initialPostResult.content),
          coverImageAlt: toMediaData(initialPostResult.coverImage)?.alt,
          coverImageId: toMediaData(initialPostResult.coverImage)?.id,
          coverImageUrl: toMediaData(initialPostResult.coverImage)?.url,
        }
      : null

  return (
    <EditorForm
      schools={schools}
      subChannels={subChannels}
      tags={tags}
      t={t}
      initialPost={initialPost}
    />
  )
}

export default function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>
}) {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" aria-hidden="true" />}>
      <EditorPageContent searchParams={searchParams} />
    </Suspense>
  )
}
