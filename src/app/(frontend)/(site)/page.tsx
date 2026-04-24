import React, { Suspense } from 'react'

import DiscoverHomepage from '@/components/discover/DiscoverHomepage'

import { getDiscoverPageData } from '@/lib/cmsData'
import { DEFAULT_LOCALE } from '@/lib/i18n/config'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { getFrontendRequestContext } from '@/lib/requestContext'

async function DiscoverPageContent() {
  const [{ locale, t }, { posts }] = await Promise.all([
    getFrontendRequestContext(),
    getDiscoverPageData(),
  ])

  return <DiscoverHomepage posts={posts} locale={locale} t={t} />
}

export default function DiscoverPage() {
  const fallbackLocale = DEFAULT_LOCALE
  const fallbackDictionary = getDictionary(fallbackLocale)

  return (
    <Suspense
      fallback={<DiscoverHomepage posts={[]} locale={fallbackLocale} t={fallbackDictionary} />}
    >
      <DiscoverPageContent />
    </Suspense>
  )
}
