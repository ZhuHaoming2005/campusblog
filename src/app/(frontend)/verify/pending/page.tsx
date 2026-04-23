import Link from 'next/link'

import { buildAuthHref, sanitizeNextPath } from '@/lib/authNavigation'
import VerificationPendingForm from '@/components/auth/VerificationPendingForm'

import { getFrontendRequestContext } from '../../lib/requestContext'

function maskEmail(email: string) {
  const [localPart = '', domainPart = ''] = email.split('@')
  if (!localPart || !domainPart) return email

  const visibleLocal = localPart.length <= 2 ? localPart[0] ?? '' : `${localPart.slice(0, 2)}***`
  return `${visibleLocal}@${domainPart}`
}

export default async function VerificationPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string; next?: string; status?: string }>
}) {
  const [{ t }, rawSearchParams] = await Promise.all([getFrontendRequestContext(), searchParams])
  const email = rawSearchParams.email?.trim().toLowerCase() ?? ''
  const error = rawSearchParams.error?.trim() ?? ''
  const nextPath = sanitizeNextPath(rawSearchParams.next, '/user/me')
  const loginHref = buildAuthHref('/login', nextPath)
  const isResent = rawSearchParams.status === 'resent'
  const cooldownSeconds = isResent ? 60 : 0

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(43,122,120,0.16),transparent_30%),radial-gradient(circle_at_18%_18%,rgba(27,75,122,0.14),transparent_24%),linear-gradient(180deg,#f7f9fd_0%,#f2f6fb_42%,#eaf1fa_100%)]" />
      <div className="relative z-10 w-full max-w-lg rounded-[1.75rem] border border-campus-border-soft/80 bg-gradient-to-br from-campus-panel via-campus-panel-soft/60 to-campus-page p-6 shadow-[0_24px_72px_rgba(13,59,102,0.10)] sm:p-7">
        <p className="font-label text-xs uppercase tracking-[0.24em] text-campus-primary/45">
          {t.common.appName}
        </p>
        <h1 className="mt-3 font-headline text-3xl font-bold text-campus-primary sm:text-4xl">
          {t.auth.verifyPendingTitle}
        </h1>
        <p className="mt-3 text-sm leading-7 text-foreground/62 sm:text-[0.95rem]">
          {t.auth.verifyPendingSubtitle}
        </p>

        {email ? (
          <div className="mt-4 rounded-2xl border border-campus-border-soft/80 bg-white/80 px-4 py-3">
            <p className="text-xs font-label uppercase tracking-[0.18em] text-foreground/45">
              {t.auth.verifyPendingEmailLabel}
            </p>
            <p className="mt-1 text-sm font-semibold text-campus-primary">{maskEmail(email)}</p>
          </div>
        ) : null}
        <VerificationPendingForm
          autoSubmitOnMount={Boolean(email && !error && !isResent)}
          cooldownSeconds={cooldownSeconds}
          email={email}
          error={error}
          nextPath={nextPath}
          status={isResent ? 'success' : 'idle'}
          t={t}
        />

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-label">
          <Link className="text-campus-primary no-underline hover:underline" href={loginHref}>
            {t.auth.goLogin}
          </Link>
          <Link className="text-foreground/60 no-underline hover:text-campus-primary" href="/">
            {t.auth.backToHome}
          </Link>
        </div>
      </div>
    </section>
  )
}
