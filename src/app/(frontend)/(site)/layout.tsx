import React from 'react'
import type { Viewport } from 'next'
import { connection } from 'next/server'

import { readCloudflareRuntimeEnvString } from '@/cloudflare/runtimeEnv'
import FrontendChrome from '@/components/layout/FrontendChrome'
import { getActiveSchools } from '@/lib/cmsData'
import { getCurrentFrontendUser, toSidebarUser } from '@/lib/frontendSession'
import { getFrontendRequestContext } from '@/lib/requestContext'
import { getUserSubscriptionNavigationData } from '@/lib/subscriptionData'

export const viewport: Viewport = {
  width: 450,
}

async function SiteLayoutContent({ children }: { children: React.ReactNode }) {
  await connection()

  const [{ headers, locale, t }, githubUrl, schools] = await Promise.all([
    getFrontendRequestContext(),
    readCloudflareRuntimeEnvString('GITHUB_URL', {
      processEnv: process.env,
    }),
    getActiveSchools(),
  ])
  const currentUser = await getCurrentFrontendUser(headers)
  const subscriptionData = await getUserSubscriptionNavigationData(currentUser)

  const schoolItems = schools.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
  }))

  return (
    <FrontendChrome
      schools={schoolItems}
      subscribedSchoolIds={subscriptionData.schoolIds}
      locale={locale}
      t={t}
      currentUser={toSidebarUser(currentUser)}
      githubUrl={githubUrl}
    >
      {children}
    </FrontendChrome>
  )
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteLayoutContent>{children}</SiteLayoutContent>
}
