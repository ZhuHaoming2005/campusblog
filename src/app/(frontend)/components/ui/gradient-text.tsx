import React from 'react'
import { cn } from '@/lib/utils'

type GradientTextProps = {
  children: React.ReactNode
  className?: string
  as?: 'h1' | 'h2' | 'h3' | 'span' | 'p'
}

export function GradientText({ children, className, as: Tag = 'span' }: GradientTextProps) {
  return (
    <Tag
      className={cn(
        'bg-gradient-to-r from-campus-primary via-campus-teal to-campus-primary bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-x',
        className,
      )}
    >
      {children}
    </Tag>
  )
}
