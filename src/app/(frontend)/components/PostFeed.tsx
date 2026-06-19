import type { Post } from '@/payload-types'

import type { AppLocale } from '@/lib/i18n/config'
import { getDictionary } from '@/app/(frontend)/lib/i18n/dictionaries'
import { toPostFeedItem, type PostFeedItem } from '@/app/(frontend)/lib/postFeedData'
import { getPostPublishedLabel } from '@/lib/postPresentation'
import PostCard, { getAspectClass, type PostCardVariant } from '@/components/PostCard'

export type PostFeedVariant = 'default' | 'discover'

type PostFeedProps = {
  posts: Array<Post | PostFeedItem>
  locale: AppLocale
  showSchoolName?: boolean
  showChannelName?: boolean
  variant?: PostFeedVariant
  featuredCount?: number
}

function getDiscoverAspectClass(index: number): string {
  if (index === 0) return 'aspect-[7/5]'
  if (index === 1) return 'aspect-[6/5]'
  return getAspectClass(index)
}

function getCardVariant(index: number, variant: PostFeedVariant, featuredCount: number): PostCardVariant {
  if (variant !== 'discover') return 'default'
  return index < featuredCount ? 'discover-featured' : 'discover-default'
}

export default function PostFeed({
  posts,
  locale,
  showSchoolName = false,
  showChannelName = true,
  variant = 'default',
  featuredCount = 0,
}: PostFeedProps) {
  if (posts.length === 0) return null
  const t = getDictionary(locale)

  return (
    <div
      data-testid={variant === 'discover' ? 'discover-post-feed' : undefined}
      className={variant === 'discover' ? 'masonry-grid masonry-grid--discover' : 'masonry-grid'}
    >
      {posts.map((post, index) => {
        const feedItem = toPostFeedItem(post)
        const cardVariant = getCardVariant(index, variant, featuredCount)
        const aspectClass =
          cardVariant === 'discover-featured' ? getDiscoverAspectClass(index) : getAspectClass(index)

        return (
          <PostCard
            key={feedItem.id}
            title={feedItem.title}
            slug={feedItem.slug}
            excerpt={feedItem.excerpt}
            contentText={feedItem.previewText}
            coverImageUrl={feedItem.coverImageUrl}
            coverImageAlt={feedItem.coverImageAlt}
            authorName={feedItem.authorName}
            authorAvatarUrl={feedItem.authorAvatarUrl}
            tagLabels={feedItem.tagLabels}
            schoolName={showSchoolName ? feedItem.school?.name : null}
            channelName={showChannelName ? feedItem.subChannel?.name : null}
            publishedLabel={getPostPublishedLabel(feedItem.publishedAt ?? feedItem.createdAt, locale)}
            readingMinutes={feedItem.readingMinutes}
            aspectClass={aspectClass}
            anonymousLabel={t.common.anonymous}
            readTimeLabel={t.post.readTimeShort}
            variant={cardVariant}
          />
        )
      })}
    </div>
  )
}
