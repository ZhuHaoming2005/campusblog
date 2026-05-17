import Link from 'next/link'
import { connection } from 'next/server'

import { buildAuthHref, sanitizeNextPath } from '@/lib/authNavigation'
import { getFrontendRequestContext } from '@/lib/requestContext'

function buildVerificationPendingHref(email: string | undefined, nextPath: string) {
  const params = new URLSearchParams()
  if (email) {
    params.set('email', email.trim().toLowerCase())
  }
  if (nextPath !== '/user/me') {
    params.set('next', nextPath)
  }

  const query = params.toString()
  return query ? `/verify/pending?${query}` : '/verify/pending'
}

export async function VerificationPageContent({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string; status?: string }>
}) {
  await connection()

  const [{ t }, rawSearchParams] = await Promise.all([getFrontendRequestContext(), searchParams])
  const status = rawSearchParams.status === 'success' ? 'success' : 'error'
  const nextPath = sanitizeNextPath(rawSearchParams.next, '/user/me')
  const loginHref = buildAuthHref('/login', nextPath)
  const pendingHref = buildVerificationPendingHref(rawSearchParams.email, nextPath)

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(43,122,120,0.16),transparent_30%),radial-gradient(circle_at_18%_18%,rgba(27,75,122,0.14),transparent_24%),linear-gradient(180deg,#f7f9fd_0%,#f2f6fb_42%,#eaf1fa_100%)]" />
      <div className="relative z-10 w-full max-w-lg rounded-[1.75rem] border border-campus-border-soft/80 bg-gradient-to-br from-campus-panel via-campus-panel-soft/60 to-campus-page p-6 shadow-[0_24px_72px_rgba(13,59,102,0.10)] sm:p-7">
        <p className="font-label text-xs uppercase tracking-[0.24em] text-campus-primary/45">
          {t.common.appName}
        </p>
        <h1 className="mt-3 font-headline text-3xl font-bold text-campus-primary sm:text-4xl">
          {status === 'success' ? t.auth.verifySuccessTitle : t.auth.verifyErrorTitle}
        </h1>
        <p className="mt-3 text-sm leading-7 text-foreground/62 sm:text-[0.95rem]">
          {status === 'success' ? t.auth.verifySuccessSubtitle : t.auth.verifyErrorSubtitle}
        </p>

        <div className="mt-6 rounded-[1.35rem] border border-campus-border-soft/80 bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FBFE_100%)] p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3 text-sm font-label">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-campus-primary to-campus-secondary px-5 text-white no-underline transition hover:opacity-95"
              href={loginHref}
            >
              {t.auth.verifyLoginButton}
            </Link>
            {status === 'success' ? null : (
              <Link
                className="inline-flex h-11 items-center justify-center rounded-xl border border-campus-border-soft bg-white px-5 text-campus-primary no-underline transition hover:border-campus-primary"
                href={pendingHref}
              >
                {t.auth.resendVerification}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
