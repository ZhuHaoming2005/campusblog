import React, { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import SchoolTopBar from '@/components/layout/SchoolTopBar'
import { getCurrentFrontendUser } from '@/lib/frontendSession'
import {
  getActiveSchoolParams,
  getSchoolLayoutData,
  getSchoolSubscriptionState,
  STATIC_PARAMS_PLACEHOLDER_SLUG,
} from '@/lib/cmsData'
import { getFrontendRequestContext } from '@/lib/requestContext'

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

  const [data, currentUser] = await Promise.all([
    getSchoolLayoutData(slug),
    getCurrentFrontendUser(headers),
  ])

  if (!data) {
    notFound()
  }

  const channelItems = data.subChannels.map((ch) => ({
    id: ch.id,
    name: ch.name,
    slug: ch.slug,
  }))
  const subscriptionState = await getSchoolSubscriptionState(
    data.school.id,
    data.subChannels.map((channel) => channel.id),
    currentUser,
  )

  return (
    <div>
      <SchoolTopBar
        schoolId={data.school.id}
        schoolName={data.school.name}
        schoolSlug={data.school.slug}
        subChannels={channelItems}
        subscriptionLabels={{
          channelSubscribe: t.school.channelSubscribe,
          channelSubscribed: t.school.channelSubscribed,
          schoolSubscribe: t.school.subscribe,
          schoolSubscribed: t.school.subscribed,
        }}
        subscriptionState={subscriptionState}
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
