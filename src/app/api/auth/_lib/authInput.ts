import { maybeSanitizeNextPath } from '@/lib/authNavigation'

const DISPLAY_NAME_MAX_LENGTH = 80
const EMAIL_MAX_LENGTH = 254
const MIN_PASSWORD_LENGTH = 8
const SIMPLE_EMAIL_PATTERN =
  /^[a-z0-9.!#$%+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i

export class AuthInputError extends Error {
  code: string
  field?: string
  status: number

  constructor(message: string, options: { code: string; field?: string; status?: number }) {
    super(message)
    this.name = 'AuthInputError'
    this.code = options.code
    this.field = options.field
    this.status = options.status ?? 400
  }
}

function readRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AuthInputError('Invalid request body.', {
      code: 'invalid_request_body',
    })
  }

  return value as Record<string, unknown>
}

function readRequiredString(value: unknown, field: string, label: string): string {
  if (typeof value !== 'string') {
    throw new AuthInputError(`${label} is required.`, {
      code: `invalid_${field}`,
      field,
    })
  }

  return value
}

export function normalizeEmail(value: unknown): string {
  const email = readRequiredString(value, 'email', 'Email').trim().toLowerCase()

  if (!email || email.length > EMAIL_MAX_LENGTH || !SIMPLE_EMAIL_PATTERN.test(email)) {
    throw new AuthInputError('Enter a valid email address.', {
      code: 'invalid_email',
      field: 'email',
    })
  }

  return email
}

export function validateDisplayName(value: unknown): string {
  const displayName = readRequiredString(value, 'displayName', 'Display name').trim()

  if (!displayName || displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    throw new AuthInputError('Enter a valid display name.', {
      code: 'invalid_display_name',
      field: 'displayName',
    })
  }

  return displayName
}

export function validatePassword(value: unknown): string {
  const password = readRequiredString(value, 'password', 'Password')

  if (!password || !password.trim()) {
    throw new AuthInputError('Password is required.', {
      code: 'invalid_password',
      field: 'password',
    })
  }
 
  return password
}

export function validateStrongPassword(value: unknown): string {
  const password = validatePassword(value)

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new AuthInputError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`, {
      code: 'invalid_password',
      field: 'password',
    })
  }

  return password
}

export function parseNextPath(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return maybeSanitizeNextPath(value)
}

export function parseRegisterInput(value: unknown) {
  const body = readRecord(value)

  return {
    displayName: validateDisplayName(body.displayName),
    email: normalizeEmail(body.email),
    next: parseNextPath(body.next),
    password: validateStrongPassword(body.password),
  }
}

export function parseLoginInput(value: unknown) {
  const body = readRecord(value)

  return {
    email: normalizeEmail(body.email),
    next: parseNextPath(body.next),
    password: validatePassword(body.password),
  }
}

export function parseEmailOnlyInput(value: unknown) {
  const body = readRecord(value)

  return {
    email: normalizeEmail(body.email),
    next: parseNextPath(body.next),
  }
}

export function parseResetPasswordInput(value: unknown) {
  const body = readRecord(value)
  const token = readRequiredString(body.token, 'token', 'Token').trim()
  const password = validateStrongPassword(body.password)
  const passwordConfirm =
    typeof body.passwordConfirm === 'string' ? body.passwordConfirm : null

  if (!token) {
    throw new AuthInputError('Token is required.', {
      code: 'invalid_token',
      field: 'token',
    })
  }

  if (passwordConfirm !== null && password !== passwordConfirm) {
    throw new AuthInputError('The two passwords do not match.', {
      code: 'password_mismatch',
      field: 'passwordConfirm',
    })
  }

  return {
    next: parseNextPath(body.next),
    password,
    token,
  }
}

export function parseVerifyEmailInput(searchParams: URLSearchParams) {
  const token = searchParams.get('token')?.trim()

  if (!token) {
    throw new AuthInputError('Token is required.', {
      code: 'invalid_token',
      field: 'token',
    })
  }

  return {
    next: parseNextPath(searchParams.get('next')),
    token,
  }
}
