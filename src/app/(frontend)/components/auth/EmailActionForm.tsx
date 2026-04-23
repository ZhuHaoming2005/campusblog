'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { extractApiError } from '@/app/(frontend)/lib/authClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type EmailActionDictionary = {
  auth: {
    emailLabel: string
    emailPlaceholder: string
    missingEmail: string
  }
}

type EmailActionFormProps = {
  action: '/api/auth/forgot-password' | '/api/auth/resend-verification'
  autoSubmitOnMount?: boolean
  buttonLabel: string
  cooldownButtonLabel: string
  cooldownSeconds: number
  email: string
  error: string
  nextPath: string
  status: 'idle' | 'success'
  successMessage: string
  t: EmailActionDictionary
}

function buildCooldownLabel(prefix: string, seconds: number) {
  return `${prefix} ${seconds}s`
}

export default function EmailActionForm({
  action,
  autoSubmitOnMount = false,
  buttonLabel,
  cooldownButtonLabel,
  cooldownSeconds,
  email,
  error,
  nextPath,
  status,
  successMessage,
  t,
}: EmailActionFormProps) {
  const [value, setValue] = useState(email)
  const [errorMessage, setErrorMessage] = useState(error)
  const [success, setSuccess] = useState(status === 'success')
  const [secondsRemaining, setSecondsRemaining] = useState(Math.max(0, cooldownSeconds))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const autoSubmitAttempted = useRef(false)

  useEffect(() => {
    setValue(email)
  }, [email])

  useEffect(() => {
    setErrorMessage(error)
  }, [error])

  useEffect(() => {
    setSuccess(status === 'success')
  }, [status])

  useEffect(() => {
    setSecondsRemaining(Math.max(0, cooldownSeconds))
  }, [cooldownSeconds])

  useEffect(() => {
    if (secondsRemaining <= 0) return

    const timeout = window.setTimeout(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1))
    }, 1000)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [secondsRemaining])

  const submitLabel =
    secondsRemaining > 0
      ? buildCooldownLabel(cooldownButtonLabel, secondsRemaining)
      : buttonLabel

  const submitEmail = useCallback(async (normalizedEmail: string) => {
    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const response = await fetch(action, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: normalizedEmail,
          next: nextPath,
        }),
      })

      const payload = await response.json().catch((): null => null)
      const retryAfterSeconds = Math.max(
        0,
        Number.parseInt(response.headers.get('retry-after') ?? '0', 10) || 0,
      )

      if (!response.ok) {
        setSuccess(false)
        setErrorMessage(extractApiError(payload, error || 'Unable to send email right now.'))
        if (retryAfterSeconds > 0) {
          setSecondsRemaining(retryAfterSeconds)
        }
        return
      }

      setValue(normalizedEmail)
      setSuccess(true)
      setErrorMessage('')
      setSecondsRemaining(Math.max(60, retryAfterSeconds))
    } catch {
      setSuccess(false)
      setErrorMessage(error || 'Unable to send email right now.')
    } finally {
      setIsSubmitting(false)
    }
  }, [action, error, nextPath])

  useEffect(() => {
    if (autoSubmitAttempted.current || !autoSubmitOnMount || secondsRemaining > 0) return

    const normalizedEmail = value.trim().toLowerCase()
    if (!normalizedEmail) return

    autoSubmitAttempted.current = true
    void submitEmail(normalizedEmail)
  }, [autoSubmitOnMount, secondsRemaining, submitEmail, value])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedEmail = value.trim().toLowerCase()
    if (!normalizedEmail) {
      setErrorMessage(t.auth.missingEmail)
      return
    }

    await submitEmail(normalizedEmail)
  }

  return (
    <>
      {success ? (
        <div
          aria-live="polite"
          className="mt-4 rounded-2xl border border-campus-primary/20 bg-campus-primary/5 px-4 py-3 text-sm text-campus-primary"
          role="status"
        >
          {successMessage}
        </div>
      ) : null}
      {errorMessage ? (
        <div
          aria-live="polite"
          className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : null}

      <form
        className="mt-6 space-y-3 rounded-[1.35rem] border border-campus-border-soft/80 bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FBFE_100%)] p-4 sm:p-5"
        onSubmit={handleSubmit}
      >
        <label className="space-y-2">
          <Label className="font-label text-sm text-foreground/70" htmlFor={`${action}-email`}>
            {t.auth.emailLabel}
          </Label>
          <Input
            id={`${action}-email`}
            name="email"
            type="email"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={t.auth.emailPlaceholder}
            autoComplete="email"
            className="h-11 rounded-xl border-campus-border-soft bg-campus-panel"
          />
        </label>
        <input name="next" type="hidden" value={nextPath} />
        <Button
          type="submit"
          className="h-11 w-full rounded-xl bg-gradient-to-r from-campus-primary to-campus-secondary text-white hover:opacity-95"
          disabled={isSubmitting || secondsRemaining > 0}
        >
          {submitLabel}
        </Button>
      </form>
    </>
  )
}
