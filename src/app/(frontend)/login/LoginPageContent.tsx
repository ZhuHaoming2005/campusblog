import React from 'react'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'

import AuthExperience from '@/components/auth/AuthExperience'
import { sanitizeNextPath } from '@/lib/authNavigation'
import { getCurrentFrontendUser } from '@/lib/frontendSession'
import { getFrontendRequestContext } from '../lib/requestContext'

export async function LoginPageContent({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; status?: string }>
}) {
  await connection()

  const [{ headers, t }, rawSearchParams] = await Promise.all([
    getFrontendRequestContext(),
    searchParams,
  ])
  const nextPath = sanitizeNextPath(rawSearchParams.next, '/user/me')
  const flashMessage =
    rawSearchParams.status === 'password-reset' ? t.auth.resetPasswordSuccess : null
  const currentUser = await getCurrentFrontendUser(headers)

  if (currentUser?._verified === true) {
    redirect(nextPath === '/login' || nextPath === '/register' ? '/user/me' : nextPath)
  }

  return (
    <AuthExperience
      flashMessage={flashMessage}
      initialMode="login"
      nextPath={nextPath}
      t={t}
    />
  )
}
