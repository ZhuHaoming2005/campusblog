'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'
import { buildAuthHref } from '@/lib/authNavigation'
import { ChannelManageButton } from '@/components/subscription/ChannelManageButton'
import { SubscriptionManagerDialog } from '@/components/subscription/SubscriptionManagerDialog'
import SearchBar from './SearchBar'

type SubChannel = {
  id: string | number
  name: string
  slug: string
}

type SchoolTopBarProps = {
  canManageSubscriptions?: boolean
  schoolId: string | number
  schoolName: string
  schoolSlug: string
  subChannels: SubChannel[]
  subscribedChannelIds?: Array<number | string>
  t: {
    common: {
      cancel: string
      login: string
      searchPlaceholder: string
    }
    school: {
      addSubChannel: string
      allPosts: string
      homepage: string
      subscribe: string
      subscribed: string
      subscriptionError: string
      unsubscribe: string
    }
  }
}

export default function SchoolTopBar({
  canManageSubscriptions = false,
  schoolId,
  schoolName,
  schoolSlug,
  subChannels,
  subscribedChannelIds = [],
  t,
}: SchoolTopBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const schoolBasePath = `/school/${schoolSlug}`
  const loginHref = buildAuthHref('/login', pathname || schoolBasePath)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null)
  const [subscribedIds, setSubscribedIds] = useState(
    () => new Set(subscribedChannelIds.map((id) => String(id))),
  )
  const visibleSubChannels = canManageSubscriptions
    ? subChannels.filter((channel) => {
        const channelPath = `${schoolBasePath}/channel/${channel.slug}`
        return subscribedIds.has(String(channel.id)) || pathname === channelPath
      })
    : subChannels
  const tabItems = [
    { key: 'all-posts', href: schoolBasePath, label: t.school.allPosts },
    ...visibleSubChannels.map((channel) => ({
      key: String(channel.id),
      href: `${schoolBasePath}/channel/${channel.slug}`,
      label: channel.name,
    })),
  ]

  const activeIndex = Math.max(
    tabItems.findIndex((item) => pathname === item.href),
    0,
  )
  const tabGridMinWidth = `max(min(100%, 19rem), ${tabItems.length * 6.5}rem)`

  const handleManageChannelsClick = () => {
    if (!canManageSubscriptions) {
      window.location.assign(loginHref)
      return
    }

    setIsDialogOpen(true)
  }

  const handleToggleChannel = async (channel: SubChannel) => {
    if (!canManageSubscriptions) {
      window.location.assign(loginHref)
      return
    }

    const channelKey = String(channel.id)
    const isSubscribed = subscribedIds.has(channelKey)
    setPendingAction(channelKey)
    setSubscriptionError(null)

    try {
      const response = await fetch('/api/subscriptions/channels', {
        body: JSON.stringify({ channelId: channel.id, schoolId }),
        headers: { 'content-type': 'application/json' },
        method: isSubscribed ? 'DELETE' : 'POST',
      })

      if (!response.ok) throw new Error(`Subscription update failed: ${response.status}`)

      setSubscribedIds((current) => {
        const next = new Set(current)
        if (isSubscribed) {
          next.delete(channelKey)
        } else {
          next.add(channelKey)
        }
        return next
      })
      router.refresh()
    } catch {
      setSubscriptionError(t.school.subscriptionError)
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <header className="sticky top-0 z-40 isolate border-b border-campus-border-soft/90 bg-gradient-to-b from-campus-panel-soft via-campus-page to-campus-page">
      <div className="space-y-2 px-4 py-2.5 sm:px-5 lg:px-6">
        <div
          data-testid="school-topbar-title-row"
          className="flex flex-col gap-2 pr-32 sm:flex-row sm:items-center sm:justify-between sm:pr-44 lg:pr-56"
        >
          <div className="min-w-0">
            <p className="font-label text-[10px] font-semibold uppercase tracking-[0.18em] text-campus-text-soft">
              {t.school.homepage}
            </p>
            <h2 className="truncate font-headline text-2xl text-campus-primary sm:text-[2rem]">
              {schoolName}
            </h2>
          </div>
        </div>

        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-1.5">
            <div
              data-testid="school-channel-tabs-scroll"
              className="min-w-0 overflow-x-auto no-scrollbar"
            >
              <div className="rounded-[1.35rem] p-1">
                <div
                  data-testid="school-channel-tabs"
                  className="relative inline-grid w-fit overflow-hidden rounded-full border border-campus-primary/10 bg-[rgba(255,255,255,0.68)] p-0.5"
                  style={{
                    gridTemplateColumns: `repeat(${tabItems.length}, minmax(0, 1fr))`,
                    minWidth: tabGridMinWidth,
                  }}
                >
                  <span
                    data-testid="school-channel-tabs-indicator"
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-0.5 left-0.5 top-0.5 rounded-full bg-campus-primary transition-transform duration-300 ease-out"
                    style={{
                      width: `calc((100% - 0.25rem) / ${tabItems.length})`,
                      transform: `translateX(calc(${activeIndex} * 100%))`,
                    }}
                  />

                  {tabItems.map((item, index) => {
                    const isActive = index === activeIndex
                    return (
                      <Link key={item.key} href={item.href} className="relative z-10 no-underline">
                        <span
                          className={cn(
                            'inline-flex min-w-[6.5rem] items-center justify-center rounded-full px-3.5 py-1.5 font-label text-sm font-semibold text-center transition-colors duration-200',
                            isActive
                              ? 'text-white'
                              : 'text-foreground/65 hover:text-campus-primary',
                          )}
                        >
                          {item.label}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="relative shrink-0 pt-1">
              <ChannelManageButton
                data-testid="school-add-channel"
                aria-expanded={isDialogOpen}
                onClick={handleManageChannelsClick}
                type="button"
              >
                {t.school.addSubChannel}
              </ChannelManageButton>
            </div>
          </div>

          <div className="w-full xl:max-w-xs xl:flex-shrink-0">
            <SearchBar
              placeholder={t.common.searchPlaceholder}
              className="max-w-none"
              inputClassName="h-10 border-campus-primary/12 text-sm shadow-[0_12px_28px_rgba(24,38,72,0.10)]"
            />
          </div>
        </div>
      </div>

      <SubscriptionManagerDialog
        closeLabel={t.common.cancel}
        error={subscriptionError}
        items={subChannels.map((channel) => ({
          ...channel,
          subscribed: subscribedIds.has(String(channel.id)),
        }))}
        onOpenChange={setIsDialogOpen}
        onToggle={(channel) => {
          void handleToggleChannel(channel)
        }}
        open={isDialogOpen}
        pendingId={pendingAction}
        subscribeLabel={t.school.subscribe}
        title={t.school.addSubChannel}
        unsubscribeLabel={t.school.unsubscribe}
      />
    </header>
  )
}
