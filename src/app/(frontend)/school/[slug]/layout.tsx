import React from 'react'
import { headers as getHeaders } from 'next/headers.js'
import { cookies as getCookies } from 'next/headers.js'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'

import config from '@/payload.config'
import SchoolTopBar from '@/components/layout/SchoolTopBar'
import { getDictionary } from '../../lib/i18n/dictionaries'
import { resolveRequestLocale } from '../../lib/i18n/locale'

export default async function SchoolLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const headers = await getHeaders()
  const cookies = await getCookies()
  const locale = resolveRequestLocale({
    cookieLocale: cookies.get('locale')?.value,
    acceptLanguage: headers.get('accept-language'),
  })
  const t = getDictionary(locale)

  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const { docs: schools } = await payload.find({
    collection: 'schools',
    where: {
      and: [{ slug: { equals: slug } }, { isActive: { equals: true } }],
    },
    limit: 1,
    depth: 0,
  })

  const school = schools[0]
  if (!school) {
    notFound()
  }

  const { docs: subChannels } = await payload.find({
    collection: 'school-sub-channels',
    where: {
      and: [{ school: { equals: school.id } }, { isActive: { equals: true } }],
    },
    sort: 'sortOrder',
    limit: 50,
    depth: 0,
  })

  const channelItems = subChannels.map((ch) => ({
    id: ch.id,
    name: ch.name,
    slug: ch.slug,
  }))

  return (
    <div>
      <SchoolTopBar
        schoolName={school.name}
        schoolSlug={school.slug}
        subChannels={channelItems}
        t={t}
      />
      {children}
    </div>
  )
}
