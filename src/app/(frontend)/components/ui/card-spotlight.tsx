'use client'

import React, { useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

type CardSpotlightProps = {
  children: React.ReactNode
  className?: string
  spotlightColor?: string
}

export function CardSpotlight({
  children,
  className,
  spotlightColor = 'rgba(13, 59, 102, 0.06)',
}: CardSpotlightProps) {
  const divRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [opacity, setOpacity] = useState(0)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return
    const rect = divRef.current.getBoundingClientRect()
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }, [])

  const handleMouseEnter = useCallback(() => setOpacity(1), [])
  const handleMouseLeave = useCallback(() => setOpacity(0), [])

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn('relative overflow-hidden', className)}
    >
      <div
        className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 40%)`,
        }}
      />
      {children}
    </div>
  )
}
