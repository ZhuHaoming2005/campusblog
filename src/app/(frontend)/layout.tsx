import React from 'react'
import { Manrope, Noto_Sans_SC, Noto_Serif_SC } from 'next/font/google'

import { TooltipProvider } from '@/components/ui/tooltip'
import { DEFAULT_LOCALE } from './lib/i18n/config'
import { getDictionary } from './lib/i18n/dictionaries'
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fallbackLocale = DEFAULT_LOCALE

  return (
    <html
      lang={fallbackLocale}
      className={`${headlineFont.variable} ${bodyFont.variable} ${labelFont.variable}`}
    >
      <body className="bg-campus-surface font-body text-campus-on-surface antialiased">
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
      </body>
    </html>
  )
}
