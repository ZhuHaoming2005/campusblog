'use client'

import { useState, useTransition } from 'react'
import { IconBell, IconBellRinging } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type SubscriptionToggleProps = {
  endpoint: string
  idField: 'channelId' | 'schoolId'
  idValue: number | string
  initialSubscribed?: boolean
  labels: {
    subscribe: string
    subscribed: string
  }
  className?: string
  testId?: string
}

export function SubscriptionToggle({
  endpoint,
  idField,
  idValue,
  initialSubscribed = false,
  labels,
  className,
  testId,
}: SubscriptionToggleProps) {
  const [subscribed, setSubscribed] = useState(initialSubscribed)
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    const nextSubscribed = !subscribed
    setSubscribed(nextSubscribed)

    startTransition(async () => {
      try {
        const response = await fetch(endpoint, {
          body: JSON.stringify({ [idField]: idValue }),
          headers: { 'content-type': 'application/json' },
          method: nextSubscribed ? 'POST' : 'DELETE',
        })

        if (response.status === 401 || response.status === 403) {
          const location = response.headers.get('location')
          if (location) {
            window.location.assign(location)
            return
          }
        }

        if (!response.ok) {
          setSubscribed(!nextSubscribed)
        }
      } catch {
        setSubscribed(!nextSubscribed)
      }
    })
  }

  const Icon = subscribed ? IconBellRinging : IconBell

  return (
    <Button
      aria-pressed={subscribed}
      className={cn(
        'h-9 rounded-full border px-3.5 font-label text-sm font-semibold',
        subscribed
          ? 'border-campus-secondary/20 bg-campus-secondary text-white hover:bg-campus-secondary/90'
          : 'border-campus-primary/10 bg-white/70 text-campus-primary hover:bg-campus-panel-strong',
        className,
      )}
      data-testid={testId}
      disabled={isPending}
      onClick={handleClick}
      size="sm"
      type="button"
      variant="ghost"
    >
      <Icon size={14} />
      <span>{subscribed ? labels.subscribed : labels.subscribe}</span>
    </Button>
  )
}
