import React from 'react'
import { connection } from 'next/server'

import DiscoverHomepage from '@/components/discover/DiscoverHomepage'

import { getDiscoverPageData } from '@/lib/cmsData'
import { getCurrentFrontendUser } from '@/lib/frontendSession'
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
  return <DiscoverPageContent />
}
