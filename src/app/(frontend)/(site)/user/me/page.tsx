import React, { Suspense } from 'react'

import { DEFAULT_LOCALE } from '@/lib/i18n/config'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { UserCenterPageContent } from './UserCenterPageContent'

function UserCenterPageFallback() {
  const fallbackLocale = DEFAULT_LOCALE
  const t = getDictionary(fallbackLocale)

  return (
    <section className="bg-gradient-to-b from-campus-page via-campus-panel-soft/30 to-campus-page px-6 pb-8 pt-[calc(var(--floating-toolbar-top)+var(--floating-toolbar-height)+1rem)] lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-[1.75rem] border border-campus-border-soft/80 bg-gradient-to-br from-campus-panel via-campus-panel-soft/55 to-campus-page p-6 shadow-[0_16px_40px_rgba(13,59,102,0.06)]">
          <p className="font-label text-xs uppercase tracking-[0.18em] text-campus-primary/45">
            {t.common.appName}
          </p>
          <h1 className="mt-2 font-headline text-4xl font-bold text-campus-primary">
            {t.userCenter.pageTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-foreground/60">
            {t.userCenter.pageSubtitle}
          </p>
        </div>
      </div>
    </section>
  )
}

export default function UserCenterPage() {
  return (
    <Suspense fallback={<UserCenterPageFallback />}>
      <UserCenterPageContent />
    </Suspense>
  )
}
