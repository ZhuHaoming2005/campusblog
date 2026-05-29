import React, { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import SearchResultsView from '@/components/search/SearchResultsView'
import { DEFAULT_LOCALE } from '@/lib/i18n/config'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { getFrontendRequestContext } from '@/lib/requestContext'
import { getSchoolLayoutData, STATIC_PARAMS_PLACEHOLDER_SLUG } from '@/app/(frontend)/lib/cmsData'
import {
  normalizeSearchQuery,
  searchPublishedPosts,
  type SearchPublishedPostsResult,
} from '@/lib/searchData'

async function SchoolSearchPageContent({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ q?: string | string[] }>
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

  const query = normalizeSearchQuery(q)
  const searchPath = `/school/${slug}/search`
  let result: SearchPublishedPostsResult = {
    posts: [],
    totalDocs: 0,
  }
  let hasSearchError = false

  try {
    result = await searchPublishedPosts({ query, schoolId: schoolData.school.id })
  } catch (error) {
    console.error('Search error:', error)
    hasSearchError = true
  }

  return (
    <SearchResultsView
      backHref={`/school/${slug}`}
      error={hasSearchError}
      locale={locale}
      posts={result.posts}
      query={query}
      searchPath={searchPath}
      sectionClassName="bg-gradient-to-b from-campus-page via-campus-panel-soft/35 to-campus-page px-4 py-5 sm:px-5 lg:px-6"
      showChannelName
      t={t}
    />
  )
}

export default function SchoolSearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ q?: string | string[] }>
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
