import React, { Suspense } from 'react'

import { readCloudflareRuntimeEnvString } from '@/cloudflare/runtimeEnv'
import FrontendChrome from '@/components/layout/FrontendChrome'
import { getActiveSchools } from '@/lib/cmsData'
import { getCurrentFrontendUser, toSidebarUser } from '@/lib/frontendSession'
import { getFrontendRequestContext } from '@/lib/requestContext'

async function SiteLayoutContent({
  children,
}: {
  children: React.ReactNode
}) {
  const [{ headers, locale, t }, githubUrl, schools] = await Promise.all([
    getFrontendRequestContext(),
    readCloudflareRuntimeEnvString('GITHUB_URL', {
      processEnv: process.env,
    }),
    getActiveSchools(),
  ])
  const currentUser = await getCurrentFrontendUser(headers)

  const schoolItems = schools.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
  }))

  return (
    <FrontendChrome
      schools={schoolItems}
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
  return (
    <Suspense fallback={<div className="min-h-screen bg-campus-surface" aria-hidden="true" />}>
      <SiteLayoutContent>{children}</SiteLayoutContent>
    </Suspense>
  )
}
