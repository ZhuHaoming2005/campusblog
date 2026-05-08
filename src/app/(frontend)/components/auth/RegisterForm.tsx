'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { extractApiError } from '@/lib/authClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import PasswordInput from './PasswordInput'

type RegisterDictionary = {
  auth: {
    displayNameLabel: string
    emailLabel: string
    emailPlaceholder: string
    passwordLabel: string
    confirmPasswordLabel: string
    registerButton: string
    registerPending: string
    registerError: string
    missingDisplayName: string
    missingEmail: string
    missingPassword: string
    missingConfirmPassword: string
    passwordMismatch: string
    haveAccount: string
    goLogin: string
    resendVerification: string
    showPassword: string
    hidePassword: string
  }
}

type RegisterFormProps = {
  nextPath: string
  loginHref: string
  t: RegisterDictionary
  hideSwitchHint?: boolean
}

export default function RegisterForm({
  nextPath,
  loginHref,
  t,
  hideSwitchHint = false,
}: RegisterFormProps) {
  const displayNameInputId = 'register-display-name'
  const emailInputId = 'register-email'
  const passwordInputId = 'register-password'
  const confirmPasswordInputId = 'register-password-confirm'
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()

    if (!displayName.trim()) {
      setError(t.auth.missingDisplayName)
      return
    }

    if (!normalizedEmail) {
      setError(t.auth.missingEmail)
      return
    }

    if (!password) {
      setError(t.auth.missingPassword)
      return
    }

    if (!confirmPassword) {
      setError(t.auth.missingConfirmPassword)
      return
    }

    if (password !== confirmPassword) {
      setError(t.auth.passwordMismatch)
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: displayName.trim(),
          email: normalizedEmail,
          next: nextPath,
          password,
        }),
      })

      const registerPayload = await registerResponse.json().catch((): null => null)
      if (!registerResponse.ok) {
        setError(extractApiError(registerPayload, t.auth.registerError))
        return
      }

      const pendingParams = new URLSearchParams({ email: normalizedEmail })
      if (nextPath !== '/verify/pending') {
        pendingParams.set('next', nextPath)
      }
      pendingParams.set('status', 'resent')

      router.replace(`/verify/pending?${pendingParams.toString()}`)
      router.refresh()
    } catch {
      setError(t.auth.registerError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <Label className="font-label text-sm text-foreground/70" htmlFor={displayNameInputId}>
          {t.auth.displayNameLabel}
        </Label>
        <Input
          id={displayNameInputId}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          autoComplete="nickname"
          className="h-10 rounded-xl border-campus-border-soft bg-campus-panel"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="font-label text-sm text-foreground/70" htmlFor={emailInputId}>
          {t.auth.emailLabel}
        </Label>
        <Input
          id={emailInputId}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          placeholder={t.auth.emailPlaceholder}
          className="h-10 rounded-xl border-campus-border-soft bg-campus-panel"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="font-label text-sm text-foreground/70" htmlFor={passwordInputId}>
          {t.auth.passwordLabel}
        </Label>
        <PasswordInput
          id={passwordInputId}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          inputClassName="h-10 rounded-xl border-campus-border-soft bg-campus-panel"
          t={t}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="font-label text-sm text-foreground/70" htmlFor={confirmPasswordInputId}>
          {t.auth.confirmPasswordLabel}
        </Label>
        <PasswordInput
          id={confirmPasswordInputId}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          inputClassName="h-10 rounded-xl border-campus-border-soft bg-campus-panel"
          t={t}
        />
      </div>

      {error ? (
        <div
          aria-live="polite"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-label text-red-700"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <Button
        type="submit"
        className="h-11 w-full rounded-xl bg-gradient-to-r from-campus-primary to-campus-secondary text-white hover:opacity-95"
        disabled={isSubmitting}
      >
        {isSubmitting ? t.auth.registerPending : t.auth.registerButton}
      </Button>

      {hideSwitchHint ? null : (
        <p className="text-center text-sm font-label text-foreground/55">
          {t.auth.haveAccount}{' '}
          <Link className="text-campus-primary no-underline hover:underline" href={loginHref}>
            {t.auth.goLogin}
          </Link>
        </p>
      )}
    </form>
  )
}
