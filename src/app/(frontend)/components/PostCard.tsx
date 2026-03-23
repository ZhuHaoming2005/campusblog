import Link from 'next/link'
import { IconHeart, IconUser } from '@tabler/icons-react'

import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CardSpotlight } from '@/components/ui/card-spotlight'

type PostCardProps = {
  title: string
  slug: string
  excerpt?: string | null
  coverImageUrl?: string | null
  coverImageAlt?: string | null
  authorName?: string | null
  authorAvatarUrl?: string | null
  tagLabel?: string | null
  aspectClass?: string
}

const ASPECT_CLASSES = [
  'aspect-[3/4]',
  'aspect-square',
  'aspect-[4/5]',
  'aspect-[3/2]',
  'aspect-[4/3]',
  'aspect-[2/3]',
]

export function getAspectClass(index: number): string {
  return ASPECT_CLASSES[index % ASPECT_CLASSES.length]
}

export default function PostCard({
  title,
  slug,
  coverImageUrl,
  coverImageAlt,
  authorName,
  authorAvatarUrl,
  tagLabel,
  aspectClass = 'aspect-[3/4]',
}: PostCardProps) {
  return (
    <div className="masonry-item">
      <Link href={`/post/${slug}`} className="no-underline block group">
        <CardSpotlight className="bg-card rounded-xl overflow-hidden shadow-sm border border-transparent hover:border-campus-primary/10 hover:shadow-[0_8px_30px_rgba(13,59,102,0.1)] transition-all duration-300 transform hover:scale-[1.02]">
          {/* Cover Image */}
          <div
            className={`relative ${aspectClass} bg-campus-surface-container overflow-hidden`}
          >
            {coverImageUrl ? (
              <img
                alt={coverImageAlt || title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                src={coverImageUrl}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-campus-surface-container to-campus-surface-dim/50">
                <svg
                  width="56"
                  height="56"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-campus-on-surface-variant/20"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              </div>
            )}
            {tagLabel && (
              <Badge
                variant="secondary"
                className="absolute top-3 left-3 bg-white/20 backdrop-blur-md border-white/10 text-white text-xs font-label font-bold uppercase tracking-wider shadow-sm"
              >
                {tagLabel}
              </Badge>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>

          {/* Content */}
          <div className="p-5 space-y-3">
            <h3 className="font-headline text-xl leading-tight text-campus-primary line-clamp-2 group-hover:text-campus-teal transition-colors duration-200">
              {title}
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Avatar className="h-7 w-7 border border-campus-primary/10">
                  {authorAvatarUrl && <AvatarImage src={authorAvatarUrl} alt={authorName || ''} />}
                  <AvatarFallback className="bg-campus-surface-container text-campus-on-surface-variant text-xs">
                    <IconUser size={14} />
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-label text-foreground/60">
                  {authorName || 'Anonymous'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-foreground/50 group/like cursor-pointer">
                <IconHeart
                  size={16}
                  className="group-hover/like:text-campus-accent group-hover/like:fill-campus-accent/20 transition-all duration-200"
                />
                <span className="text-sm font-label">0</span>
              </div>
            </div>
          </div>
        </CardSpotlight>
      </Link>
    </div>
  )
}
