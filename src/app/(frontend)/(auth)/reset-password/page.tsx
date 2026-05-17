import React, { Suspense } from 'react'

import { ResetPasswordPageContent } from './ResetPasswordPageContent'

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; status?: string; token?: string }>
}) {
  return (
    <Suspense fallback={<div className="min-h-[40vh]" aria-hidden="true" />}>
      <ResetPasswordPageContent searchParams={searchParams} />
    </Suspense>
  )
}
