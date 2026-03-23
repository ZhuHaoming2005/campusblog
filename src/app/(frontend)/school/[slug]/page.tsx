import { headers as getHeaders } from 'next/headers.js'
import { cookies as getCookies } from 'next/headers.js'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import { IconSchool } from '@tabler/icons-react'

import config from '@/payload.config'
import PostCard, { getAspectClass } from '@/components/PostCard'
import { getDictionary } from '../../lib/i18n/dictionaries'
import { resolveRequestLocale } from '../../lib/i18n/locale'

type MediaDoc = {
  url?: string
  alt?: string
}

type TagDoc = {
  name?: string
}

type UserProfileDoc = {
  displayName?: string
  avatar?: MediaDoc | string | number | null
}

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

  const { docs: posts } = await payload.find({
    collection: 'posts',
    where: {
      and: [{ school: { equals: school.id } }, { status: { equals: 'published' } }],
    },
    sort: '-publishedAt',
    limit: 20,
    depth: 2,
  })

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
        <div className="masonry-grid">
          {posts.map((post, index) => {
            const coverImage =
              post.coverImage && typeof post.coverImage === 'object'
                ? (post.coverImage as MediaDoc)
                : null

            const firstTag =
              post.tags && Array.isArray(post.tags) && post.tags.length > 0
                ? typeof post.tags[0] === 'object'
                  ? (post.tags[0] as TagDoc).name
                  : null
                : null

            const authorProfile =
              post.authorProfile && typeof post.authorProfile === 'object'
                ? (post.authorProfile as UserProfileDoc)
                : null

            const authorAvatar =
              authorProfile?.avatar && typeof authorProfile.avatar === 'object'
                ? (authorProfile.avatar as MediaDoc).url
                : null

            return (
              <PostCard
                key={post.id}
                title={post.title}
                slug={post.slug}
                coverImageUrl={coverImage?.url}
                coverImageAlt={coverImage?.alt}
                authorName={authorProfile?.displayName}
                authorAvatarUrl={authorAvatar}
                tagLabel={firstTag}
                aspectClass={getAspectClass(index)}
              />
            )
          })}
        </div>
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
