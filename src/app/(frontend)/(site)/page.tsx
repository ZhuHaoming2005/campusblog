import React, { Suspense } from 'react'
import { connection } from 'next/server'

import DiscoverHomepage from '@/components/discover/DiscoverHomepage'

import { getDiscoverPageData } from '@/lib/cmsData'
import { getCurrentFrontendUser } from '@/lib/frontendSession'
import { DEFAULT_LOCALE } from '@/lib/i18n/config'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { getFrontendRequestContext } from '@/lib/requestContext'

async function DiscoverPageContent() {
  await connection()

  const { headers, locale, t } = await getFrontendRequestContext()
  const currentUser = await getCurrentFrontendUser(headers)
  const { nearbyPosts, posts, preferredCitySchoolIds, preferredSchoolCityId, preferredSchoolId } =
    await getDiscoverPageData(currentUser)

  return (
    <DiscoverHomepage
      nearbyPosts={nearbyPosts}
      posts={posts}
      locale={locale}
      preferredCitySchoolIds={preferredCitySchoolIds}
      preferredSchoolCityId={preferredSchoolCityId}
      preferredSchoolId={preferredSchoolId}
      t={t}
    />
  )
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
