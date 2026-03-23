'use client'

import React from 'react'
import { cn } from '@/lib/utils'

type MovingBorderButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  borderRadius?: string
  duration?: number
  containerClassName?: string
  borderClassName?: string
  asChild?: boolean
}

export function MovingBorderButton({
  children,
  borderRadius = '0.75rem',
  duration = 3000,
  containerClassName,
  borderClassName,
  className,
  style,
  ...props
}: MovingBorderButtonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden p-[2px] group/btn transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(var(--primary-rgb,13,59,102),0.25)]',
        containerClassName,
      )}
      style={{ borderRadius, ...style }}
    >
      <div
        className={cn(
          'absolute inset-0 rounded-[inherit] opacity-80 group-hover/btn:opacity-100 transition-opacity duration-300',
          borderClassName,
        )}
        style={{
          background: `conic-gradient(from var(--border-angle, 0deg), transparent 40%, var(--primary) 50%, var(--accent) 60%, transparent 70%)`,
          animation: `border-spin ${duration}ms linear infinite`,
        }}
      />
      <div
        className="absolute inset-[1px] rounded-[inherit] bg-background"
      />
      <button
        className={cn(
          'relative z-10 flex w-full items-center justify-center gap-2 rounded-[inherit] px-6 py-3 font-semibold text-foreground transition-all duration-200',
          'bg-primary text-primary-foreground group-hover/btn:bg-primary/90',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    </div>
  )
}

type MovingBorderLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  borderRadius?: string
  duration?: number
  containerClassName?: string
  borderClassName?: string
}

export function MovingBorderLink({
  children,
  borderRadius = '0.75rem',
  duration = 3000,
  containerClassName,
  borderClassName,
  className,
  style,
  ...props
}: MovingBorderLinkProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden p-[2px] group/btn transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(var(--primary-rgb,13,59,102),0.25)]',
        containerClassName,
      )}
      style={{ borderRadius, ...style }}
    >
      <div
        className={cn(
          'absolute inset-0 rounded-[inherit] opacity-80 group-hover/btn:opacity-100 transition-opacity duration-300',
          borderClassName,
        )}
        style={{
          background: `conic-gradient(from var(--border-angle, 0deg), transparent 40%, var(--primary) 50%, var(--accent) 60%, transparent 70%)`,
          animation: `border-spin ${duration}ms linear infinite`,
        }}
      />
      <div
        className="absolute inset-[1px] rounded-[inherit] bg-background"
      />
      <a
        className={cn(
          'relative z-10 flex w-full items-center justify-center gap-2 rounded-[inherit] px-6 py-3 font-semibold no-underline transition-all duration-200',
          'bg-primary text-primary-foreground group-hover/btn:bg-primary/90',
          className,
        )}
        {...props}
      >
        {children}
      </a>
    </div>
  )
}
