import React, { Suspense } from 'react'

import { VerificationPageContent } from './VerificationPageContent'

export default function VerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string; status?: string }>
}) {
  return (
    <Suspense fallback={<div className="min-h-[40vh]" aria-hidden="true" />}>
      <VerificationPageContent searchParams={searchParams} />
    </Suspense>
  )
}
