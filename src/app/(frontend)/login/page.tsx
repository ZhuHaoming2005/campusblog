import React, { Suspense } from 'react'
import { LoginPageContent } from './LoginPageContent'

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; status?: string }>
}) {
  return (
    <Suspense fallback={<div className="min-h-[40vh]" aria-hidden="true" />}>
      <LoginPageContent searchParams={searchParams} />
    </Suspense>
  )
}
