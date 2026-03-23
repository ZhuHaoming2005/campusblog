import React from 'react'
import { headers as getHeaders } from 'next/headers.js'
import { cookies as getCookies } from 'next/headers.js'
import { getPayload } from 'payload'
import { IconBrandGithub } from '@tabler/icons-react'

import config from '@/payload.config'
import SidebarNav from '@/components/layout/SidebarNav'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import { TooltipProvider } from '@/components/ui/tooltip'
import { getDictionary } from './lib/i18n/dictionaries'
import { resolveRequestLocale } from './lib/i18n/locale'
import './styles.css'

export const metadata = {
  title: 'Campus Curator',
  description: 'Academic blog platform for campus communities',
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

  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const { docs: schools } = await payload.find({
    collection: 'schools',
    where: { isActive: { equals: true } },
    sort: 'sortOrder',
    limit: 50,
    depth: 0,
  })

  const schoolItems = schools.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
  }))

  return (
    <html lang={locale}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@700&family=Noto+Sans+SC:wght@400;500&family=Manrope:wght@400;600;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-campus-surface font-body text-campus-on-surface antialiased">
        <TooltipProvider delayDuration={300}>
          <SidebarNav schools={schoolItems} locale={locale} t={t} />
          {githubUrl ? (
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="fixed top-4 right-4 z-50 h-9 w-9 rounded-full bg-white/70 backdrop-blur-md shadow-sm border border-campus-primary/10 hover:bg-white/90 transition-all flex items-center justify-center text-campus-primary"
              aria-label="GitHub"
              title="GitHub"
            >
              <IconBrandGithub size={18} />
            </a>
          ) : null}
          <LanguageSwitcher
            locale={locale}
            label={t.common.languageLabel}
            zhLabel={t.common.languageZh}
            enLabel={t.common.languageEn}
          />
          <main className="lg:ml-72 min-h-screen">{children}</main>
        </TooltipProvider>
      </body>
    </html>
  )
}
