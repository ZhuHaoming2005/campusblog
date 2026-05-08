import Link from 'next/link'

import { buildAuthHref, sanitizeNextPath } from '@/lib/authNavigation'
import PasswordInput from '@/components/auth/PasswordInput'

import { getFrontendRequestContext } from '../lib/requestContext'

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; status?: string; token?: string }>
}) {
  const [{ t }, rawSearchParams] = await Promise.all([getFrontendRequestContext(), searchParams])
  const nextPath = sanitizeNextPath(rawSearchParams.next, '/user/me')
  const loginHref = buildAuthHref('/login', nextPath)
  const error = rawSearchParams.error?.trim() ?? ''
  const token = rawSearchParams.token?.trim() ?? ''
  const hasToken = Boolean(token)
  const isSuccess = rawSearchParams.status === 'success'

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(43,122,120,0.16),transparent_30%),radial-gradient(circle_at_18%_18%,rgba(27,75,122,0.14),transparent_24%),linear-gradient(180deg,#f7f9fd_0%,#f2f6fb_42%,#eaf1fa_100%)]" />
      <div className="relative z-10 w-full max-w-lg rounded-[1.75rem] border border-campus-border-soft/80 bg-gradient-to-br from-campus-panel via-campus-panel-soft/60 to-campus-page p-6 shadow-[0_24px_72px_rgba(13,59,102,0.10)] sm:p-7">
        <p className="font-label text-xs uppercase tracking-[0.24em] text-campus-primary/45">
          {t.common.appName}
        </p>
        <h1 className="mt-3 font-headline text-3xl font-bold text-campus-primary sm:text-4xl">
          {t.auth.resetPasswordTitle}
        </h1>
        <p className="mt-3 text-sm leading-7 text-foreground/62 sm:text-[0.95rem]">
          {t.auth.resetPasswordSubtitle}
        </p>
        {isSuccess ? (
          <div
            aria-live="polite"
            className="mt-4 rounded-2xl border border-campus-primary/20 bg-campus-primary/5 px-4 py-3 text-sm text-campus-primary"
            role="status"
          >
            {t.auth.resetPasswordSuccess}
          </div>
        ) : null}
        {error ? (
          <div
            aria-live="polite"
            className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {hasToken ? (
          <form
            action="/api/auth/reset-password"
            className="mt-6 space-y-3 rounded-[1.35rem] border border-campus-border-soft/80 bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FBFE_100%)] p-4 sm:p-5"
            method="post"
          >
            <input name="next" type="hidden" value={nextPath} />
            <input name="token" type="hidden" value={token} />
            <label className="space-y-2">
              <span className="font-label text-sm text-foreground/70">{t.auth.passwordLabel}</span>
              <PasswordInput
                inputClassName="h-11 rounded-xl border-campus-border-soft bg-campus-panel"
                autoComplete="new-password"
                name="password"
                t={t}
              />
            </label>
            <label className="space-y-2">
              <span className="font-label text-sm text-foreground/70">
                {t.auth.confirmPasswordLabel}
              </span>
              <PasswordInput
                inputClassName="h-11 rounded-xl border-campus-border-soft bg-campus-panel"
                autoComplete="new-password"
                name="passwordConfirm"
                t={t}
              />
            </label>
            <button
              className="h-11 w-full rounded-xl bg-gradient-to-r from-campus-primary to-campus-secondary font-label text-sm font-semibold text-white transition hover:opacity-95"
              type="submit"
            >
              {t.auth.resetPasswordButton}
            </button>
          </form>
        ) : isSuccess ? null : (
          <div className="mt-6 rounded-[1.35rem] border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
            {t.auth.resetPasswordTokenError}
          </div>
        )}

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
