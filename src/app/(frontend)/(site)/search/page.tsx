import React, { Suspense } from 'react'
import { connection } from 'next/server'

import SearchResultsView from '@/components/search/SearchResultsView'
import { DEFAULT_LOCALE } from '@/lib/i18n/config'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { getFrontendRequestContext } from '@/lib/requestContext'
import {
  normalizeSearchQuery,
  searchPublishedPosts,
  type SearchPublishedPostsResult,
} from '@/lib/searchData'

async function SearchPageContent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>
}) {
  await connection()

  const [{ locale, t }, { q }] = await Promise.all([getFrontendRequestContext(), searchParams])
  const query = normalizeSearchQuery(q)
  let result: SearchPublishedPostsResult = {
    posts: [],
    totalDocs: 0,
  }
  let hasSearchError = false

  try {
    result = await searchPublishedPosts({ query })
  } catch (error) {
    console.error('Search error:', error)
    hasSearchError = true
  }

  return (
    <SearchResultsView
      error={hasSearchError}
      locale={locale}
      posts={result.posts}
      query={query}
      sectionClassName="px-4 pb-6 pt-[var(--floating-toolbar-top)] sm:px-5 lg:px-6"
      showChannelName
      t={t}
    />
  )
}

export default function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>
}) {
  const fallbackLocale = DEFAULT_LOCALE
  const fallbackDictionary = getDictionary(fallbackLocale)

  return (
    <Suspense
      fallback={
        <section className="px-4 pb-6 pt-[var(--floating-toolbar-top)] sm:px-5 lg:px-6">
          <div className="space-y-6">
            <div className="h-40 animate-pulse rounded-[2rem] bg-campus-panel-soft" />
            <p className="font-label text-sm text-campus-text-soft">
              {fallbackDictionary.search.results}
            </p>
          </div>
        </section>
      }
    >
      <SearchPageContent searchParams={searchParams} />
    </Suspense>
  )
}
