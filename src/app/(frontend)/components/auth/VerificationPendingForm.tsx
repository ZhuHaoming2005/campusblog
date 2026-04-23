'use client'

import EmailActionForm from './EmailActionForm'

type VerificationPendingDictionary = {
  auth: {
    resendVerificationButton: string
    resendVerificationSuccess: string
    resendVerificationCooldownPrefix: string
    emailLabel: string
    emailPlaceholder: string
    missingEmail: string
  }
}

type VerificationPendingFormProps = {
  autoSubmitOnMount?: boolean
  cooldownSeconds: number
  email: string
  error: string
  nextPath: string
  status: 'idle' | 'success'
  t: VerificationPendingDictionary
}

export default function VerificationPendingForm(props: VerificationPendingFormProps) {
  return (
    <EmailActionForm
      action="/api/auth/resend-verification"
      autoSubmitOnMount={props.autoSubmitOnMount}
      buttonLabel={props.t.auth.resendVerificationButton}
      cooldownButtonLabel={props.t.auth.resendVerificationCooldownPrefix}
      cooldownSeconds={props.cooldownSeconds}
      email={props.email}
      error={props.error}
      nextPath={props.nextPath}
      status={props.status}
      successMessage={props.t.auth.resendVerificationSuccess}
      t={props.t}
    />
  )
}
