'use client'

import type { ComponentProps } from 'react'
import { IconPlus } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ChannelManageButtonProps = ComponentProps<typeof Button>

export function ChannelManageButton({ className, children, ...props }: ChannelManageButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        'group flex h-10 items-center gap-3 rounded-2xl px-4 py-2.5 text-campus-accent/60 transition-all duration-200 hover:bg-campus-accent/5 hover:text-campus-accent aria-expanded:bg-campus-accent/5 aria-expanded:text-campus-accent',
        className,
      )}
      {...props}
    >
      <IconPlus
        size={20}
        className="shrink-0 transition-transform duration-300 group-hover:rotate-90"
      />
      <span className="font-label text-sm font-bold uppercase tracking-wider">{children}</span>
    </Button>
  )
}
