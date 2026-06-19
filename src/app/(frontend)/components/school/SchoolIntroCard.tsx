'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { buildAuthHref } from '@/lib/authNavigation'
import { cn } from '@/lib/utils'

type SchoolIntroCardProps = {
  canManageSubscriptions?: boolean
  school: {
    description?: string | null
    id: string | number
    name: string
    slug: string
  }
  schoolSubscribed?: boolean
  t: {
    school: {
      allPosts: string
      homepage: string
      subscribeSchool: string
      subscribedSchool: string
      subscriptionError: string
    }
  }
}

export function SchoolIntroCard({
  canManageSubscriptions = false,
  school,
  schoolSubscribed = false,
  t,
}: SchoolIntroCardProps) {
  return (
    <SchoolIntroCardContent
      key={`${school.id}:${schoolSubscribed ? 'subscribed' : 'unsubscribed'}`}
      canManageSubscriptions={canManageSubscriptions}
      school={school}
      schoolSubscribed={schoolSubscribed}
      t={t}
    />
  )
}

function SchoolIntroCardContent({
  canManageSubscriptions,
  school,
  schoolSubscribed,
  t,
}: Required<SchoolIntroCardProps>) {
  const pathname = usePathname()
  const router = useRouter()
  const loginHref = buildAuthHref('/login', pathname || `/school/${school.slug}`)
  const [isSubscribed, setIsSubscribed] = useState(schoolSubscribed)
  const [isPending, setIsPending] = useState(false)
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null)
  const description =
    school.description?.trim() || `${school.name} ${t.school.homepage.toLowerCase()}`

  const handleToggleSchool = async () => {
    if (!canManageSubscriptions) {
      window.location.assign(loginHref)
      return
    }

    const wasSubscribed = isSubscribed
    setIsPending(true)
    setSubscriptionError(null)

    try {
      const response = await fetch('/api/subscriptions/schools', {
        body: JSON.stringify({ schoolId: school.id }),
        headers: { 'content-type': 'application/json' },
        method: wasSubscribed ? 'DELETE' : 'POST',
      })

      if (!response.ok) throw new Error(`Subscription update failed: ${response.status}`)

      setIsSubscribed(!wasSubscribed)
      router.refresh()
    } catch {
      setSubscriptionError(t.school.subscriptionError)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <section
      data-testid="school-intro-card"
      className="min-h-[13rem] rounded-[2rem] border border-campus-border-soft/80 bg-gradient-to-br from-campus-panel via-campus-panel-soft/70 to-campus-page px-6 py-7 shadow-[0_12px_32px_rgba(27,75,122,0.05)] sm:py-8"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-label text-xs font-semibold uppercase tracking-[0.18em] text-campus-text-soft">
            {t.school.allPosts}
          </p>
          <h1 className="mt-3 font-headline text-4xl text-campus-primary sm:text-5xl">
            {school.name}
          </h1>
        </div>

        <div className="shrink-0">
          <Button
            data-testid="school-subscribe-toggle"
            aria-pressed={isSubscribed}
            disabled={isPending}
            onClick={() => void handleToggleSchool()}
            type="button"
            variant="outline"
            className={cn(
              'h-10 rounded-full px-4 font-label text-sm font-bold',
              isSubscribed
                ? 'border-campus-teal/25 bg-campus-teal/10 text-campus-primary hover:bg-campus-teal/15 hover:text-campus-primary'
                : 'border-campus-primary/10 bg-white/70 text-campus-accent hover:bg-campus-accent/5 hover:text-campus-accent',
            )}
          >
            {isSubscribed ? t.school.subscribedSchool : t.school.subscribeSchool}
          </Button>

          {subscriptionError ? (
            <p className="mt-2 max-w-40 text-right font-label text-xs text-destructive">
              {subscriptionError}
            </p>
          ) : null}
        </div>
      </div>

      <p className="mt-4 max-w-2xl font-label text-sm leading-7 text-campus-text-soft sm:text-base">
        {description}
      </p>
    </section>
  )
}
