import React, { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { IconSearch } from '@tabler/icons-react'

import PostFeed from '@/components/PostFeed'
import SearchBar from '@/components/layout/SearchBar'
import { DEFAULT_LOCALE } from '@/lib/i18n/config'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { getFrontendRequestContext } from '@/lib/requestContext'
import { getFrontendPayload } from '@/app/(frontend)/lib/frontendSession'
import { getSchoolLayoutData, STATIC_PARAMS_PLACEHOLDER_SLUG } from '@/app/(frontend)/lib/cmsData'
import type { Post } from '@/payload-types'

async function SchoolSearchPageContent({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ q?: string }>
}) {
  await connection()

  const [{ slug }, { q }, { locale, t }] = await Promise.all([
    params,
    searchParams,
    getFrontendRequestContext(),
  ])
  if (slug === STATIC_PARAMS_PLACEHOLDER_SLUG) {
    notFound()
  }

  const schoolData = await getSchoolLayoutData(slug)
  if (!schoolData) {
    notFound()
  }

  const query = q?.trim() ?? ''
  if (!query) {
    return (
      <section className="bg-gradient-to-b from-campus-page via-campus-panel-soft/35 to-campus-page px-4 py-5 sm:px-5 lg:px-6">
        <div className="flex min-h-[45vh] flex-col items-center justify-center rounded-[2rem] border border-dashed border-campus-border-soft bg-gradient-to-br from-campus-panel to-campus-panel-soft/70 p-10 text-center shadow-[0_12px_32px_rgba(27,75,122,0.05)]">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[1.75rem] bg-campus-panel-strong text-campus-primary shadow-[0_10px_24px_rgba(27,75,122,0.08)]">
            <IconSearch size={46} />
          </div>
          <h2 className="font-headline text-3xl font-bold text-campus-primary">
            {t.search?.enterQuery ?? 'Please enter a search query'}
          </h2>
        </div>
      </section>
    )
  }

  try {
    const payload = await getFrontendPayload()
    const result = await payload.find({
      collection: 'posts',
      where: {
        and: [
          { status: { equals: 'published' } },
          { school: { equals: schoolData.school.id } },
          {
            or: [{ title: { contains: query } }, { excerpt: { contains: query } }],
          },
        ],
      },
      limit: 20,
      sort: '-createdAt',
      depth: 2,
      overrideAccess: false,
    })

    const docs = result.docs as Post[]

    return (
      <section className="bg-gradient-to-b from-campus-page via-campus-panel-soft/35 to-campus-page px-4 py-5 sm:px-5 lg:px-6">
        <div className="space-y-6">
          <div className="flex flex-col gap-4">
            <div className="flex max-w-md flex-col gap-2">
              <p className="font-label text-xs font-semibold uppercase tracking-[0.18em] text-campus-text-soft">
                {t.search?.results ?? 'Search Results'}
              </p>
              <h1 className="font-headline text-2xl text-campus-primary">{query}</h1>
              <p className="font-label text-sm text-campus-text-soft">
                {result.totalDocs} {t.search?.articlesFound ?? 'articles found'}
              </p>
            </div>
            <div className="w-full max-w-md">
              <SearchBar
                placeholder={t.common.searchPlaceholder}
                searchPath={`/school/${slug}/search`}
              />
            </div>
          </div>

          {docs.length > 0 ? (
            <PostFeed posts={docs} locale={locale} showChannelName />
          ) : (
            <div className="flex min-h-[45vh] flex-col items-center justify-center rounded-[2rem] border border-dashed border-campus-border-soft bg-gradient-to-br from-campus-panel to-campus-panel-soft/70 p-10 text-center shadow-[0_12px_32px_rgba(27,75,122,0.05)]">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[1.75rem] bg-campus-panel-strong text-campus-primary shadow-[0_10px_24px_rgba(27,75,122,0.08)]">
                <IconSearch size={46} />
              </div>
              <h2 className="font-headline text-3xl font-bold text-campus-primary">
                {t.search?.noResults ?? 'No results found'}
              </h2>
              <p className="mt-3 max-w-sm font-label text-base text-campus-text-soft">
                {t.search?.tryDifferentQuery ?? 'Try a different search query'}
              </p>
            </div>
          )}
        </div>
      </section>
    )
  } catch (error) {
    console.error('Search error:', error)
    return (
      <section className="bg-gradient-to-b from-campus-page via-campus-panel-soft/35 to-campus-page px-4 py-5 sm:px-5 lg:px-6">
        <div className="flex min-h-[45vh] flex-col items-center justify-center rounded-[2rem] border border-dashed border-campus-border-soft bg-gradient-to-br from-campus-panel to-campus-panel-soft/70 p-10 text-center shadow-[0_12px_32px_rgba(27,75,122,0.05)]">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[1.75rem] bg-campus-panel-strong text-campus-primary shadow-[0_10px_24px_rgba(27,75,122,0.08)]">
            <IconSearch size={46} />
          </div>
          <h2 className="font-headline text-3xl font-bold text-campus-primary">
            {t.search?.error ?? 'Search error'}
          </h2>
          <p className="mt-3 max-w-sm font-label text-base text-campus-text-soft">
            {t.search?.errorMsg ?? 'An error occurred while searching'}
          </p>
        </div>
      </section>
    )
  }
}

export default function SchoolSearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const fallbackLocale = DEFAULT_LOCALE
  const fallbackDictionary = getDictionary(fallbackLocale)

  return (
    <Suspense
      fallback={
        <section className="bg-gradient-to-b from-campus-page via-campus-panel-soft/35 to-campus-page px-4 py-5 sm:px-5 lg:px-6">
          <div className="space-y-6">
            <div className="h-40 animate-pulse rounded-[2rem] bg-campus-panel-soft" />
            <p className="font-label text-sm text-campus-text-soft">
              {fallbackDictionary.search.results}
            </p>
          </div>
        </section>
      }
    >
      <SchoolSearchPageContent params={params} searchParams={searchParams} />
    </Suspense>
  )
}
