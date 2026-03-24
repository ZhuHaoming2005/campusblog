import Link from 'next/link'
import { IconHeart, IconUser } from '@tabler/icons-react'

import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CardSpotlight } from '@/components/ui/card-spotlight'

type PostCardProps = {
  title: string
  slug: string
  excerpt?: string | null
  contentText?: string | null
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

function NotebookPreview({ text }: { text: string }) {
  return (
    <div className="w-full h-full relative bg-[#fefcf3] overflow-hidden select-none">
      {/* Paper texture gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#fefcf3] via-[#fdf8ee] to-[#faf3e4]" />
      {/* Ruled lines */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, transparent, transparent 33px, rgba(176,166,150,0.24) 33px, rgba(176,166,150,0.24) 34px)',
          backgroundPositionY: '10px',
        }}
      />
      {/* Left margin line */}
      <div className="absolute left-10 top-0 bottom-0 w-px bg-[#e8b4b8]/45" />
      {/* Hole punches */}
      <div className="absolute left-2.5 top-6 w-3.5 h-3.5 rounded-full border border-[#d0c8bc]/40" />
      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border border-[#d0c8bc]/40" />
      {/* Text content */}
      <div className="relative z-10 pl-14 pr-5 pt-4 pb-3">
        <p className="text-[16px] leading-[34px] text-[#4a4540]/82 font-body line-clamp-[8] whitespace-pre-wrap break-words">
          {text}
        </p>
      </div>
    </div>
  )
}

export default function PostCard({
  title,
  slug,
  excerpt,
  contentText,
  coverImageUrl,
  coverImageAlt,
  authorName,
  authorAvatarUrl,
  tagLabel,
  aspectClass = 'aspect-[3/4]',
}: PostCardProps) {
  const previewText = excerpt || contentText || ''
  const hasImage = Boolean(coverImageUrl)

  return (
    <div className="masonry-item w-[96%] mx-auto">
      <Link href={`/post/${slug}`} className="no-underline block group">
        <CardSpotlight className="bg-card rounded-xl overflow-hidden shadow-sm border border-transparent hover:border-campus-primary/10 hover:shadow-[0_8px_30px_rgba(13,59,102,0.1)] transition-all duration-300 transform hover:scale-[1.02]">
          {/* Cover / Notebook Preview */}
          <div
            className={`relative ${aspectClass} overflow-hidden`}
          >
            {hasImage ? (
              <img
                alt={coverImageAlt || title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                src={coverImageUrl!}
              />
            ) : (
              <NotebookPreview text={previewText} />
            )}
            {tagLabel && (
              <Badge
                variant="secondary"
                className={`absolute top-2.5 left-2.5 text-[11px] font-label font-bold uppercase tracking-wider shadow-sm ${
                  hasImage
                    ? 'bg-white/20 backdrop-blur-md border-white/10 text-white'
                    : 'bg-[#4a4540]/8 backdrop-blur-sm border-[#4a4540]/10 text-[#4a4540]/70'
                }`}
              >
                {tagLabel}
              </Badge>
            )}
            {hasImage && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            )}
          </div>

          {/* Content */}
          <div className="p-4 space-y-2.5">
            <h3 className="font-headline text-lg leading-snug text-campus-primary line-clamp-2 group-hover:text-campus-teal transition-colors duration-200">
              {title}
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Avatar className="h-6 w-6 border border-campus-primary/10">
                  {authorAvatarUrl && <AvatarImage src={authorAvatarUrl} alt={authorName || ''} />}
                  <AvatarFallback className="bg-campus-surface-container text-campus-on-surface-variant text-xs">
                    <IconUser size={14} />
                  </AvatarFallback>
                </Avatar>
                <span className="text-[13px] font-label text-foreground/60">
                  {authorName || 'Anonymous'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-foreground/50 group/like cursor-pointer">
                <IconHeart
                  size={15}
                  className="group-hover/like:text-campus-accent group-hover/like:fill-campus-accent/20 transition-all duration-200"
                />
                <span className="text-[13px] font-label">0</span>
              </div>
            </div>
          </div>
        </CardSpotlight>
      </Link>
    </div>
  )
}
