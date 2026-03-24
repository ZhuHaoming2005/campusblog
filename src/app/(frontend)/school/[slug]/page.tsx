import { headers as getHeaders } from 'next/headers.js'
import { cookies as getCookies } from 'next/headers.js'
import { notFound } from 'next/navigation'
import { IconSchool } from '@tabler/icons-react'

import PostFeed from '@/components/PostFeed'
import { getDictionary } from '../../lib/i18n/dictionaries'
import { resolveRequestLocale } from '../../lib/i18n/locale'
import { getPublishedPostsBySchool, getSchoolBySlug } from '../../lib/cmsData'

export default async function SchoolPage({
  params,
}: {
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

  const school = await getSchoolBySlug(slug)
  if (!school) {
    notFound()
  }

  const posts = await getPublishedPostsBySchool(school.id)

  return (
    <section className="px-6 lg:px-10 py-6">
      {/* School description card */}
      {school.description && (
        <div className="mb-6 p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-campus-primary/8 shadow-sm">
          <h3 className="font-label text-xs uppercase tracking-[0.15em] text-foreground/40 font-bold mb-2">
            {t.school.description}
          </h3>
          <p className="text-base text-foreground/70 leading-relaxed font-label">
            {school.description}
          </p>
        </div>
      )}

      {/* Posts grid */}
      {posts.length > 0 ? (
        <PostFeed posts={posts} locale={locale} showChannelName />
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-campus-primary/10 via-campus-teal/10 to-campus-accent/10 flex items-center justify-center mb-8 animate-float shadow-lg shadow-campus-primary/5">
            <IconSchool size={52} className="text-campus-primary/50" />
          </div>
          <h2 className="font-headline text-3xl font-bold text-campus-primary mb-3">
            {t.school.noPosts}
          </h2>
          <p className="text-foreground/60 font-label text-base max-w-sm">
            {t.school.noPostsHint}
          </p>
        </div>
      )}
    </section>
  )
}
