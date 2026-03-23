'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IconPlus } from '@tabler/icons-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import SearchBar from './SearchBar'

type SubChannel = {
  id: string | number
  name: string
  slug: string
}

type SchoolTopBarProps = {
  schoolName: string
  schoolSlug: string
  subChannels: SubChannel[]
  t: {
    school: {
      allPosts: string
      addSubChannel: string
    }
    common: {
      searchPlaceholder: string
    }
  }
}

export default function SchoolTopBar({
  schoolName,
  schoolSlug,
  subChannels,
  t,
}: SchoolTopBarProps) {
  const pathname = usePathname()
  const schoolBasePath = `/school/${schoolSlug}`
  const isAllPosts = pathname === schoolBasePath

  return (
    <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-campus-primary/5">
      {/* Top row: school name + centered search */}
      <div className="grid grid-cols-[auto_1fr_auto] items-center px-8 h-16 gap-4">
        <h2 className="font-headline text-2xl font-bold text-campus-primary truncate">
          {schoolName}
        </h2>
        <div className="flex justify-center">
          <SearchBar placeholder={t.common.searchPlaceholder} />
        </div>
        <div className="w-0" />
      </div>

      <Separator className="bg-campus-primary/5" />

      {/* Sub-channel tabs */}
      <div className="flex items-center gap-1.5 px-8 py-2.5 overflow-x-auto no-scrollbar">
        {/* All Posts tab */}
        <Link href={schoolBasePath} className="no-underline shrink-0">
          <span
            className={cn(
              'inline-flex items-center px-5 py-2 rounded-full font-label text-base cursor-pointer transition-all duration-250',
              isAllPosts
                ? 'bg-campus-primary/10 text-campus-primary font-semibold backdrop-blur-sm'
                : 'text-foreground/60 hover:text-foreground/90 hover:bg-campus-primary/[0.04]',
            )}
          >
            {t.school.allPosts}
          </span>
        </Link>

        {/* Sub-channel tabs */}
        {subChannels.map((channel) => {
          const channelPath = `${schoolBasePath}/channel/${channel.slug}`
          const isActive = pathname === channelPath
          return (
            <Link key={channel.id} href={channelPath} className="no-underline shrink-0">
              <span
                className={cn(
                  'inline-flex items-center px-5 py-2 rounded-full font-label text-base cursor-pointer transition-all duration-250',
                  isActive
                    ? 'bg-campus-primary/10 text-campus-primary font-semibold backdrop-blur-sm'
                    : 'text-foreground/60 hover:text-foreground/90 hover:bg-campus-primary/[0.04]',
                )}
              >
                {channel.name}
              </span>
            </Link>
          )
        })}

        {/* Add Sub-channel */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="default"
              className="shrink-0 gap-1.5 text-campus-accent/70 hover:text-campus-accent hover:bg-campus-accent/[0.04] rounded-full"
            >
              <IconPlus size={16} className="transition-transform duration-300 hover:rotate-90" />
              <span className="font-label text-sm font-bold">{t.school.addSubChannel}</span>
            </Button>
          </TooltipTrigger>
        </Tooltip>
      </div>
    </header>
  )
}
