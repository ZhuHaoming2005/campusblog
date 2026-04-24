import React, { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { IconSchool } from '@tabler/icons-react'

import PostFeed from '@/components/PostFeed'
import {
  getActiveSchoolChannelParams,
  getChannelPageData,
  STATIC_PARAMS_PLACEHOLDER_CHANNEL_SLUG,
  STATIC_PARAMS_PLACEHOLDER_SLUG,
} from '@/lib/cmsData'
import { DEFAULT_LOCALE } from '@/lib/i18n/config'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { getFrontendRequestContext } from '@/lib/requestContext'

export async function generateStaticParams() {
  return getActiveSchoolChannelParams()
}

async function SubChannelPageContent({
  params,
}: {
  params: Promise<{ slug: string; channelSlug: string }>
}) {
  const [{ slug, channelSlug }, { locale, t }] = await Promise.all([
    params,
    getFrontendRequestContext(),
  ])
  if (
    slug === STATIC_PARAMS_PLACEHOLDER_SLUG ||
    channelSlug === STATIC_PARAMS_PLACEHOLDER_CHANNEL_SLUG
  ) {
    notFound()
  }

  const data = await getChannelPageData(slug, channelSlug)

  if (!data) {
    notFound()
  }

  const { school, channel, posts } = data

  return (
    <section className="bg-gradient-to-b from-campus-page via-campus-panel-soft/35 to-campus-page px-4 py-5 sm:px-5 lg:px-6">
      <div className="space-y-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_15rem] xl:items-start">
          <section className="rounded-[2rem] border border-campus-border-soft/80 bg-gradient-to-br from-campus-panel via-campus-panel-soft/70 to-campus-page p-6 shadow-[0_12px_32px_rgba(27,75,122,0.05)]">
            <p className="font-label text-xs font-semibold uppercase tracking-[0.18em] text-campus-text-soft">
              {channel.name}
            </p>
            <h1 className="mt-3 font-headline text-4xl text-campus-primary sm:text-5xl">
              {channel.name}
            </h1>
            <p className="mt-4 max-w-2xl font-label text-sm leading-7 text-campus-text-soft sm:text-base">
              {channel.description?.trim() || school.name}
            </p>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[1.5rem] border border-campus-border-soft/80 bg-gradient-to-br from-campus-panel-soft to-campus-panel-strong p-4 shadow-[0_10px_24px_rgba(27,75,122,0.05)]">
              <div className="font-label text-xs font-semibold uppercase tracking-[0.18em] text-campus-text-soft">
                {t.school.allPosts}
              </div>
              <div className="mt-3 font-headline text-3xl text-campus-primary">{posts.length}</div>
            </div>
            <div className="rounded-[1.5rem] border border-campus-border-soft/80 bg-gradient-to-br from-campus-panel-soft to-campus-panel-strong p-4 shadow-[0_10px_24px_rgba(27,75,122,0.05)]">
              <div className="font-label text-xs font-semibold uppercase tracking-[0.18em] text-campus-text-soft">
                {t.post.school}
              </div>
              <div className="mt-3 font-headline text-2xl text-campus-secondary">{school.name}</div>
            </div>
          </section>
        </div>

        {posts.length > 0 ? (
          <PostFeed posts={posts} locale={locale} />
        ) : (
          <div className="flex min-h-[45vh] flex-col items-center justify-center rounded-[2rem] border border-dashed border-campus-border-soft bg-gradient-to-br from-campus-panel to-campus-panel-soft/70 p-10 text-center shadow-[0_12px_32px_rgba(27,75,122,0.05)]">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[1.75rem] bg-campus-panel-strong text-campus-primary shadow-[0_10px_24px_rgba(27,75,122,0.08)]">
              <IconSchool size={46} />
            </div>
            <h2 className="font-headline text-3xl font-bold text-campus-primary">
              {t.school.noPosts}
            </h2>
            <p className="mt-3 max-w-sm font-label text-base text-campus-text-soft">
              {t.school.noPostsHint}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

export default function SubChannelPage({
  params,
}: {
  params: Promise<{ slug: string; channelSlug: string }>
}) {
  const fallbackLocale = DEFAULT_LOCALE
  const fallbackDictionary = getDictionary(fallbackLocale)

  return (
    <Suspense
      fallback={
        <section className="bg-gradient-to-b from-campus-page via-campus-panel-soft/35 to-campus-page px-4 py-5 sm:px-5 lg:px-6">
          <div className="space-y-6">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_15rem] xl:items-start">
              <section className="rounded-[2rem] border border-campus-border-soft/80 bg-gradient-to-br from-campus-panel via-campus-panel-soft/70 to-campus-page p-6 shadow-[0_12px_32px_rgba(27,75,122,0.05)]">
                <p className="font-label text-xs font-semibold uppercase tracking-[0.18em] text-campus-text-soft">
                  {fallbackDictionary.school.allPosts}
                </p>
              </section>
            </div>
            <div className="flex min-h-[45vh] flex-col items-center justify-center rounded-[2rem] border border-dashed border-campus-border-soft bg-gradient-to-br from-campus-panel to-campus-panel-soft/70 p-10 text-center shadow-[0_12px_32px_rgba(27,75,122,0.05)]">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[1.75rem] bg-campus-panel-strong text-campus-primary shadow-[0_10px_24px_rgba(27,75,122,0.08)]">
                <IconSchool size={46} />
              </div>
              <p className="font-label text-base text-campus-text-soft">
                {fallbackDictionary.school.homepage}
              </p>
            </div>
          </div>
        </section>
      }
    >
      <SubChannelPageContent params={params} />
    </Suspense>
  )
}
