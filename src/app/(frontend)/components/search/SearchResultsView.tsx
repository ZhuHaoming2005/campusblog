import { IconSearch } from '@tabler/icons-react'

import type { AppLocale } from '@/app/(frontend)/lib/i18n/config'
import type { FrontendDictionary } from '@/app/(frontend)/lib/i18n/dictionaries'
import { getMediaImageAlt } from '@/app/(frontend)/lib/mediaAlt'
import PostBackButton from '@/components/PostBackButton'
import PostCard, { getAspectClass } from '@/components/PostCard'
import SearchBar from '@/components/layout/SearchBar'
import {
  getPostAuthor,
  getPostCoverImage,
  getPostPrimaryTag,
  getPostPublishedLabel,
  getPostSubChannel,
} from '@/lib/postPresentation'
import type { SearchResultPost } from '@/lib/searchData'

type SearchResultsViewProps = {
  backHref?: string
  error?: boolean
  locale: AppLocale
  posts: SearchResultPost[]
  query: string
  searchPath?: string
  sectionClassName: string
  showChannelName?: boolean
  t: FrontendDictionary
}

type SearchResultFeedProps = {
  locale: AppLocale
  posts: SearchResultPost[]
  showChannelName?: boolean
  t: FrontendDictionary
}

function SearchStateCard({
  message,
  title,
}: {
  message?: string
  title: string
}) {
  return (
    <div className="flex min-h-[45vh] flex-col items-center justify-center rounded-[2rem] border border-dashed border-campus-border-soft bg-gradient-to-br from-campus-panel to-campus-panel-soft/70 p-10 text-center shadow-[0_12px_32px_rgba(27,75,122,0.05)]">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[1.75rem] bg-campus-panel-strong text-campus-primary shadow-[0_10px_24px_rgba(27,75,122,0.08)]">
        <IconSearch size={46} />
      </div>
      <h2 className="font-headline text-3xl font-bold text-campus-primary">{title}</h2>
      {message ? (
        <p className="mt-3 max-w-sm font-label text-base text-campus-text-soft">{message}</p>
      ) : null}
    </div>
  )
}

function SearchResultFeed({
  locale,
  posts,
  showChannelName = false,
  t,
}: SearchResultFeedProps) {
  if (posts.length === 0) return null

  return (
    <div className="masonry-grid">
      {posts.map((post, index) => {
        const coverImage = getPostCoverImage(post)
        const primaryTag = getPostPrimaryTag(post)
        const author = getPostAuthor(post)
        const authorAvatar =
          author?.avatar && typeof author.avatar === 'object' ? author.avatar.url : null
        const subChannel = getPostSubChannel(post)

        return (
          <PostCard
            key={post.id}
            title={post.title}
            slug={post.slug}
            excerpt={post.excerpt}
            contentText={post.contentPreview}
            coverImageUrl={coverImage?.url}
            coverImageAlt={getMediaImageAlt(coverImage?.alt, 'cover-image')}
            authorName={author?.displayName}
            authorAvatarUrl={authorAvatar}
            tagLabel={primaryTag?.name}
            channelName={showChannelName ? subChannel?.name : null}
            publishedLabel={getPostPublishedLabel(post.publishedAt ?? post.createdAt, locale)}
            readingMinutes={null}
            aspectClass={getAspectClass(index)}
            anonymousLabel={t.common.anonymous}
            readTimeLabel={t.post.readTimeShort}
          />
        )
      })}
    </div>
  )
}

export default function SearchResultsView({
  backHref = '/',
  error = false,
  locale,
  posts,
  query,
  searchPath,
  sectionClassName,
  showChannelName = false,
  t,
}: SearchResultsViewProps) {
  const stateTitle = error
    ? (t.search?.error ?? 'Search error')
    : query
      ? (t.search?.noResults ?? 'No results found')
      : (t.search?.enterQuery ?? 'Please enter a search query')
  const stateMessage = error
    ? (t.search?.errorMsg ?? 'An error occurred while searching')
    : query
      ? (t.search?.tryDifferentQuery ?? 'Try a different search query')
      : undefined

  return (
    <section className={sectionClassName}>
      <div className="space-y-6">
        <div className="relative">
          <div
            data-testid="search-results-back-row"
            className="mb-3 flex justify-start sm:absolute sm:left-0 sm:top-1 sm:z-10 sm:mb-0"
          >
            <PostBackButton fallbackHref={backHref} label={t.post.back} />
          </div>
          <div
            data-testid="search-results-top-search-shell"
            className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_15rem]"
          >
            <div data-testid="search-results-toolbar" className="flex justify-center">
              <SearchBar
                key={query}
                initialQuery={query}
                placeholder={t.common.searchPlaceholder}
                searchPath={searchPath}
                className="mx-auto w-full max-w-[34rem]"
                inputClassName="h-10 border-campus-primary/12 text-sm shadow-[0_12px_28px_rgba(24,38,72,0.10)] sm:h-11"
              />
            </div>
          </div>
        </div>

        {!error && posts.length > 0 ? (
          <SearchResultFeed
            posts={posts}
            locale={locale}
            showChannelName={showChannelName}
            t={t}
          />
        ) : (
          <SearchStateCard message={stateMessage} title={stateTitle} />
        )}
      </div>
    </section>
  )
}
