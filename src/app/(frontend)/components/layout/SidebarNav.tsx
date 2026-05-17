'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { IconCompass, IconPencil, IconSchool, IconSparkles, IconUser } from '@tabler/icons-react'

import type { AppLocale } from '@/app/(frontend)/lib/i18n/config'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { GradientText } from '@/components/ui/gradient-text'
import { PrimaryActionButton } from '@/components/ui/primary-action-button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ChannelManageButton } from '@/components/subscription/ChannelManageButton'
import { SubscriptionManagerDialog } from '@/components/subscription/SubscriptionManagerDialog'
import { Tooltip, TooltipTrigger } from '@/components/ui/tooltip'
import { buildAuthHref } from '@/lib/authNavigation'
import type { SidebarUser } from '@/lib/sessionTypes'
import { cn } from '@/lib/utils'

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
    register: string
    userCenter: string
    languageLabel: string
    languageZh: string
    languageEn: string
    cancel: string
  }
  sidebar: {
    discover: string
    channels: string
    addChannel: string
    noSubscribedChannels: string
    subscribe: string
    subscribed: string
    subscriptionError: string
    unsubscribe: string
  }
}

type SidebarNavProps = {
  schools: SchoolItem[]
  subscribedSchoolIds?: Array<number | string>
  locale: AppLocale
  t: SidebarDictionary
  currentUser: SidebarUser | null
}

export default function SidebarNav({
  schools,
  subscribedSchoolIds = [],
  locale: _locale,
  t,
  currentUser,
}: SidebarNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const isDiscover = pathname === '/'
  const authNextPath =
    pathname && pathname !== '/login' && pathname !== '/register' ? pathname : undefined
  const loginHref = buildAuthHref('/login', authNextPath)
  const createPostHref = currentUser ? '/editor' : buildAuthHref('/login', '/editor')
  const canManageSubscriptions = Boolean(currentUser)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [pendingSchoolId, setPendingSchoolId] = useState<string | null>(null)
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null)
  const [subscribedIds, setSubscribedIds] = useState(
    () => new Set(subscribedSchoolIds.map((id) => String(id))),
  )
  const visibleSchools = canManageSubscriptions
    ? schools.filter((school) => subscribedIds.has(String(school.id)))
    : schools

  const handleAddChannelClick = () => {
    if (!canManageSubscriptions) {
      window.location.assign(loginHref)
      return
    }

    setIsDialogOpen(true)
  }

  const handleToggleSchool = async (school: SchoolItem) => {
    if (!canManageSubscriptions) {
      window.location.assign(loginHref)
      return
    }

    const schoolKey = String(school.id)
    const isSubscribed = subscribedIds.has(schoolKey)
    setPendingSchoolId(schoolKey)
    setSubscriptionError(null)

    try {
      const response = await fetch('/api/subscriptions/schools', {
        body: JSON.stringify({ schoolId: school.id }),
        headers: { 'content-type': 'application/json' },
        method: isSubscribed ? 'DELETE' : 'POST',
      })

      if (!response.ok) throw new Error(`Subscription update failed: ${response.status}`)

      setSubscribedIds((current) => {
        const next = new Set(current)
        if (isSubscribed) {
          next.delete(schoolKey)
        } else {
          next.add(schoolKey)
        }
        return next
      })
      router.refresh()
    } catch {
      setSubscriptionError(t.sidebar.subscriptionError)
    } finally {
      setPendingSchoolId(null)
    }
  }

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-full w-72 flex-col border-r border-campus-primary/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(246,247,251,0.86))] shadow-[0_16px_40px_rgba(24,38,72,0.08)] backdrop-blur-xl lg:flex">
      <div className="px-7 pb-6 pt-8">
        <Link href="/" className="group block no-underline">
          <GradientText as="h1" className="font-headline text-3xl font-bold">
            {t.common.appName}
          </GradientText>
          <p className="mt-1.5 font-label text-xs uppercase tracking-[0.15em] text-muted-foreground/55 transition-colors group-hover:text-muted-foreground/80">
            {t.common.appTagline}
          </p>
        </Link>
      </div>

      <Separator className="mx-6 mb-2 bg-campus-primary/8" />

      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-1 py-2">
          <Link
            href="/"
            className={cn(
              'group flex items-center gap-3 rounded-2xl px-4 py-3 no-underline transition-all duration-200',
              isDiscover
                ? 'bg-white/92 font-semibold text-campus-primary shadow-[0_10px_24px_rgba(24,38,72,0.08)] ring-1 ring-campus-primary/10'
                : 'text-foreground/68 hover:bg-white/80 hover:text-campus-primary hover:shadow-sm',
            )}
          >
            <IconCompass
              size={22}
              className={cn(
                'shrink-0 transition-transform duration-200',
                isDiscover
                  ? 'text-campus-accent'
                  : 'group-hover:scale-110 group-hover:text-campus-primary',
              )}
            />
            <span className="font-label text-base">{t.sidebar.discover}</span>
          </Link>

          <div className="px-1 pb-1 pt-5">
            <h3 className="mb-3 px-3 font-label text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground/48">
              {t.sidebar.channels}
            </h3>

            <div className="space-y-1">
              {visibleSchools.map((school) => {
                const schoolPath = `/school/${school.slug}`
                const isActive = pathname.startsWith(schoolPath)

                return (
                  <Tooltip key={school.id}>
                    <TooltipTrigger asChild>
                      <Link
                        href={schoolPath}
                        className={cn(
                          'group flex items-center gap-3 rounded-2xl px-4 py-2.5 no-underline transition-all duration-200',
                          isActive
                            ? 'bg-campus-primary/8 font-semibold text-campus-primary shadow-sm'
                            : 'text-foreground/68 hover:bg-white/78 hover:text-campus-primary',
                        )}
                      >
                        <IconSchool
                          size={20}
                          className={cn(
                            'shrink-0 transition-all duration-200',
                            isActive
                              ? 'text-campus-teal'
                              : 'group-hover:scale-110 group-hover:text-campus-teal',
                          )}
                        />
                        <span className="truncate font-label text-base">{school.name}</span>
                      </Link>
                    </TooltipTrigger>
                  </Tooltip>
                )
              })}

              <div className="mt-2">
                <ChannelManageButton
                  data-testid="sidebar-add-channel"
                  className="w-full justify-start"
                  aria-expanded={isDialogOpen}
                  onClick={handleAddChannelClick}
                  type="button"
                >
                  {t.sidebar.addChannel}
                </ChannelManageButton>
              </div>
            </div>
          </div>
        </nav>
      </ScrollArea>

      <Separator className="mx-6 mt-2 bg-campus-primary/8" />

      <div className="space-y-4 p-5">
        <PrimaryActionButton asChild data-testid="sidebar-create-post-button" className="w-full">
          <Link href={createPostHref}>
            <IconPencil size={20} />
            {t.common.createPost}
          </Link>
        </PrimaryActionButton>

        {currentUser ? (
          <Link
            href="/user/me"
            className="block rounded-[1.4rem] border border-campus-primary/10 bg-white/84 p-3 shadow-sm no-underline transition-all hover:bg-white hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 border border-campus-primary/10">
                {currentUser.avatarUrl ? (
                  <AvatarImage src={currentUser.avatarUrl} alt={currentUser.displayName} />
                ) : null}
                <AvatarFallback className="bg-campus-surface-container text-campus-on-surface-variant">
                  {currentUser.displayName.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-label text-base font-semibold text-campus-primary">
                  {currentUser.displayName}
                </p>
                <p className="truncate text-xs font-label text-foreground/50">
                  {currentUser.email}
                </p>
                <p className="mt-1 text-xs font-label text-campus-primary/65">
                  {t.common.userCenter}
                </p>
              </div>
            </div>
          </Link>
        ) : (
          <Link
            href={loginHref}
            className="block rounded-[1.4rem] border border-campus-primary/10 bg-white/84 p-3 shadow-sm no-underline transition-all hover:bg-white hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-campus-primary/10">
                <AvatarFallback className="bg-campus-surface-container text-campus-on-surface-variant">
                  <IconUser size={20} />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-label text-base font-semibold text-campus-primary">
                  {t.common.login}
                </p>
                <p className="mt-1 text-xs font-label text-foreground/50">{t.common.register}</p>
              </div>
              <div className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-campus-primary/8 text-campus-primary/70">
                <IconSparkles size={16} />
              </div>
            </div>
          </Link>
        )}
      </div>

      <SubscriptionManagerDialog
        closeLabel={t.common.cancel}
        error={subscriptionError}
        items={schools.map((school) => ({
          ...school,
          subscribed: subscribedIds.has(String(school.id)),
        }))}
        onOpenChange={setIsDialogOpen}
        onToggle={(school) => {
          void handleToggleSchool(school)
        }}
        open={isDialogOpen}
        pendingId={pendingSchoolId}
        subscribeLabel={t.sidebar.subscribe}
        title={t.sidebar.addChannel}
        unsubscribeLabel={t.sidebar.unsubscribe}
      />
    </aside>
  )
}
