'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  IconCompass,
  IconSchool,
  IconPlus,
  IconPencil,
  IconUser,
} from '@tabler/icons-react'

import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { GradientText } from '@/components/ui/gradient-text'
import { MovingBorderLink } from '@/components/ui/moving-border'
import type { AppLocale } from '@/app/(frontend)/lib/i18n/config'

type SchoolItem = {
  id: string | number
  name: string
  slug: string
}

type SidebarDictionary = {
  common: {
    appName: string
    appTagline: string
    createPost: string
    login: string
    languageLabel: string
    languageZh: string
    languageEn: string
  }
  sidebar: {
    discover: string
    channels: string
    addChannel: string
  }
}

type SidebarNavProps = {
  schools: SchoolItem[]
  locale: AppLocale
  t: SidebarDictionary
}

export default function SidebarNav({ schools, locale, t }: SidebarNavProps) {
  const pathname = usePathname()
  const isDiscover = pathname === '/'

  return (
    <aside className="fixed left-0 top-0 h-full w-72 z-50 bg-white/70 backdrop-blur-xl shadow-[0_6px_24px_rgba(13,59,102,0.08)] border-r border-campus-primary/5 hidden lg:flex flex-col">
      {/* Brand */}
      <div className="px-7 pt-8 pb-6">
        <Link href="/" className="block no-underline group">
          <GradientText as="h1" className="font-headline text-3xl font-bold">
            {t.common.appName}
          </GradientText>
          <p className="font-label text-xs uppercase tracking-[0.15em] text-muted-foreground/60 mt-1.5 group-hover:text-muted-foreground/80 transition-colors">
            {t.common.appTagline}
          </p>
        </Link>
      </div>

      <Separator className="mx-6 mb-2 bg-campus-primary/5" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-1 py-2">
          {/* Discover */}
          <Link
            href="/"
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 no-underline group',
              isDiscover
                ? 'bg-campus-primary/8 text-campus-primary font-semibold shadow-sm shadow-campus-primary/5 border-r-[3px] border-campus-accent'
                : 'text-foreground/70 hover:bg-campus-primary/5 hover:text-campus-primary',
            )}
          >
            <IconCompass
              size={22}
              className={cn(
                'shrink-0 transition-transform duration-200',
                isDiscover && 'text-campus-accent',
                !isDiscover && 'group-hover:scale-110',
              )}
            />
            <span className="font-label text-base">{t.sidebar.discover}</span>
          </Link>

          {/* Channels Section */}
          <div className="pt-5 pb-1 px-1">
            <h3 className="font-label text-xs uppercase tracking-[0.15em] text-muted-foreground/50 font-bold mb-3 px-3">
              {t.sidebar.channels}
            </h3>

            <div className="space-y-0.5">
              {schools.map((school) => {
                const schoolPath = `/school/${school.slug}`
                const isActive = pathname.startsWith(schoolPath)
                return (
                  <Tooltip key={school.id}>
                    <TooltipTrigger asChild>
                      <Link
                        href={schoolPath}
                        className={cn(
                          'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group no-underline',
                          isActive
                            ? 'bg-campus-primary/8 text-campus-primary font-semibold shadow-sm shadow-campus-primary/5'
                            : 'text-foreground/70 hover:bg-campus-primary/5 hover:text-campus-primary',
                        )}
                      >
                        <IconSchool
                          size={20}
                          className={cn(
                            'shrink-0 transition-all duration-200',
                            isActive && 'text-campus-teal',
                            !isActive && 'group-hover:scale-110 group-hover:text-campus-teal',
                          )}
                        />
                        <span className="font-label text-base truncate">{school.name}</span>
                      </Link>
                    </TooltipTrigger>
                  </Tooltip>
                )
              })}

              {/* Add Channel */}
              <button className="flex items-center gap-3 px-4 py-2.5 text-campus-accent/60 hover:text-campus-accent hover:bg-campus-accent/5 transition-all duration-200 mt-1 w-full rounded-lg group">
                <IconPlus
                  size={20}
                  className="shrink-0 group-hover:rotate-90 transition-transform duration-300"
                />
                <span className="font-label text-sm font-bold uppercase tracking-wider">
                  {t.sidebar.addChannel}
                </span>
              </button>
            </div>
          </div>
        </nav>
      </ScrollArea>

      <Separator className="mx-6 mt-2 bg-campus-primary/5" />

      {/* Bottom Section */}
      <div className="p-5 space-y-4">
        {/* Create Post - Aceternity MovingBorder */}
        <MovingBorderLink
          href="/editor"
          containerClassName="w-full"
          className="font-label font-bold text-base"
        >
          <IconPencil size={20} />
          {t.common.createPost}
        </MovingBorderLink>

        {/* User */}
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-campus-primary/5 transition-colors duration-200 cursor-pointer">
          <Avatar className="h-10 w-10 border border-campus-primary/10">
            <AvatarFallback className="bg-campus-surface-container text-campus-on-surface-variant">
              <IconUser size={20} />
            </AvatarFallback>
          </Avatar>
          <span className="font-label font-semibold text-base text-campus-primary">
            {t.common.login}
          </span>
        </div>
      </div>
    </aside>
  )
}
