import React, { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import SchoolTopBar from '@/components/layout/SchoolTopBar'
import {
  getActiveSchoolParams,
  getSchoolLayoutData,
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

  const [{ slug }, { t }] = await Promise.all([params, getFrontendRequestContext()])
  if (slug === STATIC_PARAMS_PLACEHOLDER_SLUG) {
    notFound()
  }

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
