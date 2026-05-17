import React, { Suspense } from 'react'

import { VerificationPendingPageContent } from './VerificationPendingPageContent'

export default function VerificationPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string; next?: string; status?: string }>
}) {
  return (
    <Suspense fallback={<div className="min-h-[40vh]" aria-hidden="true" />}>
      <VerificationPendingPageContent searchParams={searchParams} />
    </Suspense>
  )
}
