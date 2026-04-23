'use client'

import EmailActionForm from './EmailActionForm'

type ForgotPasswordDictionary = {
  auth: {
    forgotPasswordButton: string
    forgotPasswordSuccess: string
    emailActionCooldownPrefix: string
    emailLabel: string
    emailPlaceholder: string
    missingEmail: string
  }
}

type ForgotPasswordFormProps = {
  cooldownSeconds: number
  email: string
  error: string
  nextPath: string
  status: 'idle' | 'success'
  t: ForgotPasswordDictionary
}

export default function ForgotPasswordForm(props: ForgotPasswordFormProps) {
  return (
    <EmailActionForm
      action="/api/auth/forgot-password"
      buttonLabel={props.t.auth.forgotPasswordButton}
      cooldownButtonLabel={props.t.auth.emailActionCooldownPrefix}
      cooldownSeconds={props.cooldownSeconds}
      email={props.email}
      error={props.error}
      nextPath={props.nextPath}
      status={props.status}
      successMessage={props.t.auth.forgotPasswordSuccess}
      t={props.t}
    />
  )
}
