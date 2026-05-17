import React, { Suspense } from 'react'

import { ForgotPasswordPageContent } from './ForgotPasswordPageContent'

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string; next?: string; status?: string }>
}) {
  return (
    <Suspense fallback={<div className="min-h-[40vh]" aria-hidden="true" />}>
      <ForgotPasswordPageContent searchParams={searchParams} />
    </Suspense>
  )
}
