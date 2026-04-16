import React from 'react'
import { Manrope, Noto_Sans_SC, Noto_Serif_SC } from 'next/font/google'
import { headers as getHeaders } from 'next/headers.js'
import { cookies as getCookies } from 'next/headers.js'

import FrontendChrome from '@/components/layout/FrontendChrome'
import { TooltipProvider } from '@/components/ui/tooltip'
import { getCurrentFrontendUser, toSidebarUser } from '@/lib/frontendSession'
import { getDictionary } from './lib/i18n/dictionaries'
import { resolveRequestLocale } from './lib/i18n/locale'
import { getActiveSchools } from './lib/cmsData'
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
  const headers = await getHeaders()
  const cookies = await getCookies()
  const locale = resolveRequestLocale({
    cookieLocale: cookies.get('locale')?.value,
    acceptLanguage: headers.get('accept-language'),
  })
  const t = getDictionary(locale)

  return {
    title: t.common.appName,
    description: t.common.appDescription,
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const githubUrl = process.env.GITHUB_URL
  const headers = await getHeaders()
  const cookies = await getCookies()
  const locale = resolveRequestLocale({
    cookieLocale: cookies.get('locale')?.value,
    acceptLanguage: headers.get('accept-language'),
  })
  const t = getDictionary(locale)

  const [schools, currentUser] = await Promise.all([
    getActiveSchools(),
    getCurrentFrontendUser(headers),
  ])

  const schoolItems = schools.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
  }))

  return (
    <html lang={locale} className={`${headlineFont.variable} ${bodyFont.variable} ${labelFont.variable}`}>
      <body className="bg-campus-surface font-body text-campus-on-surface antialiased">
        <TooltipProvider delayDuration={300}>
          <FrontendChrome
            schools={schoolItems}
            locale={locale}
            t={t}
            currentUser={toSidebarUser(currentUser)}
            githubUrl={githubUrl}
          >
            {children}
          </FrontendChrome>
        </TooltipProvider>
      </body>
    </html>
  )
}
