import React, { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { IconChevronRight, IconClockHour4, IconMapPin, IconSchool } from '@tabler/icons-react'
import type { JSONContent } from '@tiptap/core'

import type { Post } from '@/payload-types'
import { TiptapReadOnly } from '@/components/editor/TiptapReadOnly'
import { PostComments } from '@/components/interactions/PostComments'
import { PostInteractionBar } from '@/components/interactions/PostInteractionBar'
import PostBackButton from '@/components/PostBackButton'
import PostFeed from '@/components/PostFeed'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { getCurrentFrontendUser } from '@/lib/frontendSession'
import { DEFAULT_LOCALE } from '@/lib/i18n/config'
import { getDictionary } from '@/lib/i18n/dictionaries'
import {
  getPublishedPostBySlug,
  getPublishedPosts,
  getPublishedPostsBySchool,
  getPublishedPostsBySchoolAndChannel,
  getPostInteractionState,
  getPublishedCommentsByPost,
  getVisiblePostBySlug,
} from '@/lib/cmsData'
import { getFrontendRequestContext } from '@/lib/requestContext'
import {
  estimatePostReadingMinutes,
  getPostAuthor,
  getPostPreviewText,
  getPostPrimaryTag,
  getPostPublishedLabel,
  getPostSchool,
  getPostSubChannel,
} from '@/lib/postPresentation'

function dedupePosts(posts: Post[]): Post[] {
  const seen = new Set<number>()

  return posts.filter((post) => {
    if (seen.has(post.id)) return false
    seen.add(post.id)
    return true
  })
}

async function getRelatedPosts(post: Post) {
  const school = getPostSchool(post)
  const channel = getPostSubChannel(post)
  const candidates: Post[] = []

  if (school && channel) {
    candidates.push(...(await getPublishedPostsBySchoolAndChannel(school.id, channel.id)))
  }

  if (school) {
    candidates.push(...(await getPublishedPostsBySchool(school.id)))
  }

  candidates.push(...(await getPublishedPosts()))

  return dedupePosts(candidates)
    .filter((candidate) => candidate.id !== post.id)
    .slice(0, 4)
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  await connection()

  const { slug } = await params
  const t = getDictionary(DEFAULT_LOCALE)
  const post = await getPublishedPostBySlug(slug)

  if (!post) {
    return {
      title: `${t.post.notFoundTitle} | ${t.common.appName}`,
    }
  }

  return {
    title: `${post.title} | ${t.common.appName}`,
    description: getPostPreviewText(post, 160),
  }
}

async function PostDetailPageContent({ params }: { params: Promise<{ slug: string }> }) {
  await connection()

  const { slug } = await params
  const { headers, locale, t } = await getFrontendRequestContext()
  const currentUser = await getCurrentFrontendUser(headers)
  const post = await getVisiblePostBySlug(slug, currentUser)

  if (!post) {
    notFound()
  }

  const school = getPostSchool(post)
  const channel = getPostSubChannel(post)
  const author = getPostAuthor(post)
  const authorId =
    author?.id ?? (typeof post.author === 'number' || typeof post.author === 'string' ? post.author : null)
  const [relatedPosts, comments, interactionState] = await Promise.all([
    getRelatedPosts(post),
    getPublishedCommentsByPost(post.id),
    getPostInteractionState(post.id, authorId, currentUser),
  ])
  const primaryTag = getPostPrimaryTag(post)
  const publishedLabel = getPostPublishedLabel(post.publishedAt ?? post.createdAt, locale)
  const readingMinutes = estimatePostReadingMinutes(post)
  const backHref = channel
    ? `/school/${school?.slug}/channel/${channel.slug}`
    : school
      ? `/school/${school.slug}`
      : '/'
  const articleContent =
    post.content && typeof post.content === 'object' && !Array.isArray(post.content)
      ? (post.content as JSONContent)
      : undefined

  return (
    <article className="bg-gradient-to-b from-campus-page via-campus-panel-soft/30 to-campus-page px-4 py-8 sm:px-5 lg:px-6">
      <div className="space-y-8">
        <div className="flex flex-col gap-4">
          <nav className="flex flex-wrap items-center gap-2 text-sm font-label text-campus-text-soft">
            <Link href="/" className="transition-colors hover:text-campus-primary">
              {t.post.discover}
            </Link>
            {school ? (
              <>
                <IconChevronRight size={14} />
                <Link
                  href={`/school/${school.slug}`}
                  className="transition-colors hover:text-campus-primary"
                >
                  {school.name}
                </Link>
              </>
            ) : null}
            {channel ? (
              <>
                <IconChevronRight size={14} />
                <Link
                  href={`/school/${school?.slug}/channel/${channel.slug}`}
                  className="transition-colors hover:text-campus-primary"
                >
                  {channel.name}
                </Link>
              </>
            ) : null}
          </nav>

          <PostBackButton fallbackHref={backHref} label={t.post.back} />
        </div>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-6">
            <header className="rounded-[2rem] border border-campus-border-soft/80 bg-gradient-to-br from-campus-panel via-campus-panel-soft/55 to-campus-page p-6 shadow-[0_18px_44px_rgba(27,75,122,0.05)] sm:p-8">
              <div className="flex flex-wrap gap-2">
                {primaryTag ? (
                  <Badge className="bg-campus-primary text-white hover:bg-campus-primary">
                    {primaryTag.name}
                  </Badge>
                ) : null}
                {school ? (
                  <Badge
                    variant="secondary"
                    className="border-campus-border-soft bg-campus-panel-strong text-campus-primary"
                  >
                    {school.name}
                  </Badge>
                ) : null}
                {channel ? (
                  <Badge
                    variant="secondary"
                    className="border-campus-border-soft bg-campus-panel-strong text-campus-secondary"
                  >
                    {channel.name}
                  </Badge>
                ) : null}
              </div>

              <h1 className="mt-5 font-headline text-4xl leading-tight text-campus-primary sm:text-5xl">
                {post.title}
              </h1>

              {post.excerpt ? (
                <p className="mt-4 max-w-3xl text-base leading-8 text-campus-text-soft sm:text-lg">
                  {post.excerpt}
                </p>
              ) : null}

              <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3 rounded-[1.5rem] border border-campus-border-soft/80 bg-campus-panel-strong px-4 py-3">
                  <Avatar className="h-10 w-10 border border-campus-border-soft">
                    {author?.avatar && typeof author.avatar === 'object' ? (
                      <AvatarImage src={author.avatar.url ?? undefined} alt={author.displayName} />
                    ) : null}
                    <AvatarFallback className="bg-campus-panel text-campus-primary">
                      {author?.displayName?.slice(0, 1).toUpperCase() ?? 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-label text-sm font-semibold text-foreground/80">
                      {author?.displayName ?? t.common.anonymous}
                    </div>
                    <div className="text-xs text-campus-text-soft">{t.post.author}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 font-label text-sm text-campus-text-soft">
                  {publishedLabel ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-campus-border-soft/80 bg-campus-panel-strong px-4 py-2">
                      <IconMapPin size={16} />
                      {t.post.published}: {publishedLabel}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-2 rounded-full border border-campus-border-soft/80 bg-campus-panel-strong px-4 py-2">
                    <IconClockHour4 size={16} />
                    {readingMinutes} {t.post.readTime}
                  </span>
                </div>
              </div>

              <PostInteractionBar
                authorId={authorId}
                className="mt-5"
                initialState={interactionState}
                labels={{
                  bookmark: t.post.bookmark,
                  bookmarked: t.post.bookmarked,
                  follow: t.post.followAuthor,
                  following: t.post.followingAuthor,
                  like: t.post.like,
                  liked: t.post.liked,
                }}
                postId={post.id}
                viewerId={currentUser?.id}
              />
            </header>

            <section className="rounded-[2rem] border border-campus-border-soft/80 bg-[linear-gradient(180deg,#FFFFFF_0%,#F9FBFE_100%)] p-6 shadow-[0_14px_36px_rgba(27,75,122,0.04)] sm:p-8">
              <TiptapReadOnly
                content={articleContent}
                bordered={false}
                className="min-h-[8rem]"
                contentClassName="article-prose tiptap-readonly"
                loadingClassName="article-prose"
              />
            </section>

            <PostComments
              canComment={currentUser?._verified === true && currentUser.isActive === true}
              initialComments={comments}
              labels={{
                anonymous: t.common.anonymous,
                authRequired: t.post.commentAuthRequired,
                empty: t.post.commentEmpty,
                error: t.post.commentError,
                placeholder: t.post.commentPlaceholder,
                submit: t.post.commentSubmit,
                submitting: t.post.commentSubmitting,
                title: t.post.comments,
              }}
              locale={locale}
              postId={post.id}
            />
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <section className="rounded-[1.75rem] border border-campus-border-soft/80 bg-gradient-to-br from-campus-panel-soft to-campus-panel-strong p-5 shadow-[0_12px_28px_rgba(27,75,122,0.04)]">
              <div className="text-xs font-label uppercase tracking-[0.18em] text-campus-text-soft">
                {t.post.school}
              </div>
              <div className="mt-3 flex items-start gap-3">
                <div className="rounded-2xl bg-campus-panel p-3 text-campus-primary">
                  <IconSchool size={20} />
                </div>
                <div>
                  <div className="font-headline text-xl text-campus-primary">
                    {school?.name ?? t.common.appName}
                  </div>
                  {school ? (
                    <Link
                      href={`/school/${school.slug}`}
                      className="mt-1 inline-flex items-center gap-1 text-sm text-campus-text-soft hover:text-campus-primary"
                    >
                      <IconMapPin size={14} />
                      /school/{school.slug}
                    </Link>
                  ) : null}
                </div>
              </div>
            </section>

            {channel ? (
              <section className="rounded-[1.75rem] border border-campus-border-soft/80 bg-gradient-to-br from-campus-panel-soft to-campus-page p-5 shadow-[0_12px_28px_rgba(27,75,122,0.04)]">
                <div className="text-xs font-label uppercase tracking-[0.18em] text-campus-text-soft">
                  {t.post.channel}
                </div>
                <div className="mt-3">
                  <div className="font-headline text-xl text-campus-primary">{channel.name}</div>
                  <Link
                    href={`/school/${school?.slug}/channel/${channel.slug}`}
                    className="mt-2 inline-flex text-sm text-campus-secondary hover:text-campus-primary"
                  >
                    /channel/{channel.slug}
                  </Link>
                </div>
              </section>
            ) : null}

            <section className="rounded-[1.75rem] border border-campus-border-soft/80 bg-gradient-to-br from-campus-panel to-campus-panel-soft/70 p-5 shadow-[0_12px_28px_rgba(27,75,122,0.04)]">
              <div className="text-xs font-label uppercase tracking-[0.18em] text-campus-text-soft">
                {t.post.author}
              </div>
              <div className="mt-3 flex items-start gap-3">
                <Avatar className="h-12 w-12 border border-campus-border-soft">
                  {author?.avatar && typeof author.avatar === 'object' ? (
                    <AvatarImage src={author.avatar.url ?? undefined} alt={author.displayName} />
                  ) : null}
                  <AvatarFallback className="bg-campus-panel-strong text-campus-primary">
                    {author?.displayName?.slice(0, 1).toUpperCase() ?? 'A'}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <div className="font-label text-base font-semibold text-foreground/80">
                    {author?.displayName ?? t.common.anonymous}
                  </div>
                  <p className="text-sm leading-6 text-campus-text-soft">
                    {author?.bio?.trim() || t.post.authorBioFallback}
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>

        {relatedPosts.length > 0 ? (
          <section className="space-y-4 rounded-[2rem] border border-campus-border-soft/80 bg-gradient-to-br from-campus-panel-soft via-campus-panel to-campus-page p-5 shadow-[0_14px_32px_rgba(27,75,122,0.04)] sm:p-6">
            <div>
              <h2 className="font-headline text-3xl text-campus-primary">
                {channel ? t.post.relatedChannel : t.post.relatedSchool}
              </h2>
            </div>
            <PostFeed posts={relatedPosts} locale={locale} showSchoolName showChannelName />
          </section>
        ) : null}
      </div>
    </article>
  )
}

export default function PostDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const fallbackLocale = DEFAULT_LOCALE
  const fallbackDictionary = getDictionary(fallbackLocale)

  return (
    <Suspense
      fallback={
        <article className="bg-gradient-to-b from-campus-page via-campus-panel-soft/30 to-campus-page px-4 py-8 sm:px-5 lg:px-6">
          <div className="space-y-8">
            <div className="flex flex-col gap-4">
              <nav className="flex flex-wrap items-center gap-2 text-sm font-label text-campus-text-soft">
                <Link href="/" className="transition-colors hover:text-campus-primary">
                  {fallbackDictionary.post.discover}
                </Link>
              </nav>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-campus-primary/10 px-3 py-1.5 text-xs font-label font-semibold text-campus-primary/70">
                {fallbackDictionary.post.back}
              </span>
            </div>

            <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-[2rem] border border-dashed border-campus-border-soft bg-gradient-to-br from-campus-panel to-campus-panel-soft/70 p-10 text-center shadow-[0_12px_32px_rgba(27,75,122,0.05)]">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[1.75rem] bg-campus-panel-strong text-campus-primary shadow-[0_10px_24px_rgba(27,75,122,0.08)]">
                <IconSchool size={46} />
              </div>
              <p className="font-label text-base text-campus-text-soft">
                {fallbackDictionary.common.appTagline}
              </p>
            </div>
          </div>
        </article>
      }
    >
      <PostDetailPageContent params={params} />
    </Suspense>
  )
}
