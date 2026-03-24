'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { IconArrowLeft } from '@tabler/icons-react'

type PostBackButtonProps = {
  fallbackHref: string
  label: string
}

export default function PostBackButton({ fallbackHref, label }: PostBackButtonProps) {
  const router = useRouter()

  return (
    <Link
      href={fallbackHref}
      onClick={(event) => {
        if (window.history.length > 1) {
          event.preventDefault()
          router.back()
        }
      }}
      className="inline-flex items-center gap-2 rounded-full border border-campus-primary/10 bg-white/70 px-4 py-2 text-sm font-label text-campus-primary shadow-sm transition hover:bg-white"
    >
      <IconArrowLeft size={16} />
      {label}
    </Link>
  )
}
