import React, { Suspense } from 'react'
import { Manrope, Noto_Sans_SC, Noto_Serif_SC } from 'next/font/google'

import { readCloudflareRuntimeEnvString } from '@/cloudflare/runtimeEnv'
import FrontendChrome from '@/components/layout/FrontendChrome'
import { TooltipProvider } from '@/components/ui/tooltip'
import { getCurrentFrontendUser, toSidebarUser } from '@/lib/frontendSession'
import { DEFAULT_LOCALE } from './lib/i18n/config'
import { getDictionary } from './lib/i18n/dictionaries'
import { getActiveSchools } from './lib/cmsData'
import { getFrontendRequestContext } from './lib/requestContext'
import './styles.css'

const headlineFont = Noto_Serif_SC({
  variable: '--font-headline',
  weight: ['700'],
  preload: false,
})

const bodyFont = Noto_Sans_SC({
  variable: '--font-body',
  weight: ['400', '500'],
  preload: false,
})

const labelFont = Manrope({
  subsets: ['latin'],
  variable: '--font-label',
  weight: ['400', '600', '800'],
})

export async function generateMetadata() {
  const t = getDictionary(DEFAULT_LOCALE)

  return {
    title: t.common.appName,
    description: t.common.appDescription,
  }
}

async function RootLayoutContent({
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fallbackLocale = DEFAULT_LOCALE

  return (
    <html
      lang={fallbackLocale}
      className={`${headlineFont.variable} ${bodyFont.variable} ${labelFont.variable}`}
    >
      <body className="bg-campus-surface font-body text-campus-on-surface antialiased">
        <TooltipProvider delayDuration={300}>
          <Suspense
            fallback={<div className="min-h-screen bg-campus-surface" aria-hidden="true" />}
          >
            <RootLayoutContent>{children}</RootLayoutContent>
          </Suspense>
        </TooltipProvider>
      </body>
    </html>
  )
}
