import React, { Suspense } from 'react'
import { notFound } from 'next/navigation'

import SchoolTopBar from '@/components/layout/SchoolTopBar'
import { getSchoolLayoutData } from '../../lib/cmsData'
import { getFrontendRequestContext } from '../../lib/requestContext'

async function SchoolLayoutContent({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const [{ slug }, { t }] = await Promise.all([params, getFrontendRequestContext()])
  const data = await getSchoolLayoutData(slug)

  if (!data) {
    notFound()
  }

  const channelItems = data.subChannels.map((ch) => ({
    id: ch.id,
    name: ch.name,
    slug: ch.slug,
  }))

  return (
    <div>
      <SchoolTopBar
        schoolName={data.school.name}
        schoolSlug={data.school.slug}
        subChannels={channelItems}
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
