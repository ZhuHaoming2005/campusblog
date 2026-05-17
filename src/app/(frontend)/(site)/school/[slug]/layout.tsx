import React, { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import SchoolTopBar from '@/components/layout/SchoolTopBar'
import {
  getActiveSchoolParams,
  getSchoolLayoutData,
  STATIC_PARAMS_PLACEHOLDER_SLUG,
} from '@/lib/cmsData'
import { getCurrentFrontendUser, toSidebarUser } from '@/lib/frontendSession'
import { getFrontendRequestContext } from '@/lib/requestContext'
import { getUserSubscriptionNavigationData } from '@/lib/subscriptionData'

export async function generateStaticParams() {
  return getActiveSchoolParams()
}

async function SchoolLayoutContent({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  await connection()

  const [{ slug }, { headers, t }] = await Promise.all([params, getFrontendRequestContext()])
  if (slug === STATIC_PARAMS_PLACEHOLDER_SLUG) {
    notFound()
  }

  const data = await getSchoolLayoutData(slug)

  if (!data) {
    notFound()
  }

  const currentUser = await getCurrentFrontendUser(headers)
  const sidebarUser = toSidebarUser(currentUser)
  const subscriptionData = await getUserSubscriptionNavigationData(currentUser)

  const channelItems = data.subChannels.map((ch) => ({
    id: ch.id,
    name: ch.name,
    slug: ch.slug,
  }))
  const topBarKey = [data.school.id, ...subscriptionData.channelIds.map((id) => String(id))].join(
    ':',
  )

  return (
    <div>
      <SchoolTopBar
        key={topBarKey}
        canManageSubscriptions={Boolean(sidebarUser)}
        schoolId={data.school.id}
        schoolName={data.school.name}
        schoolSlug={data.school.slug}
        subChannels={channelItems}
        subscribedChannelIds={subscriptionData.channelIds}
        t={t}
      />
      {children}
    </div>
  )
}

export default function SchoolLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  return (
    <Suspense fallback={<div className="min-h-[24rem]" aria-hidden="true" />}>
      <SchoolLayoutContent params={params}>{children}</SchoolLayoutContent>
    </Suspense>
  )
}
