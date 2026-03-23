'use client'

import { usePathname } from 'next/navigation'

export default function HideOnEditor({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname === '/editor') return null
  return <>{children}</>
}
