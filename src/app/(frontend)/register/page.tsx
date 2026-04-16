import React, { Suspense } from 'react'
import { redirect } from 'next/navigation'

import AuthExperience from '@/components/auth/AuthExperience'
import { sanitizeNextPath } from '@/lib/authNavigation'
import { getCurrentFrontendUser } from '@/lib/frontendSession'
import { getFrontendRequestContext } from '../lib/requestContext'

async function RegisterPageContent({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const [{ headers, t }, rawSearchParams] = await Promise.all([
    getFrontendRequestContext(),
    searchParams,
  ])
  const nextPath = sanitizeNextPath(rawSearchParams.next, '/user/me')
  const currentUser = await getCurrentFrontendUser(headers)

  if (currentUser) {
    redirect(nextPath === '/login' || nextPath === '/register' ? '/user/me' : nextPath)
  }

  return <AuthExperience initialMode="register" nextPath={nextPath} t={t} />
}

export default function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  return (
    <Suspense fallback={<div className="min-h-[40vh]" aria-hidden="true" />}>
      <RegisterPageContent searchParams={searchParams} />
    </Suspense>
  )
}
