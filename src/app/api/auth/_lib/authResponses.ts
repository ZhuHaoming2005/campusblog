import { sanitizeNextPath } from '@/lib/authNavigation'

export const AUTH_MESSAGES = {
  invalidCredentials: 'Invalid email or password.',
  invalidOrExpiredToken: 'This link is invalid or has expired.',
  passwordResetRequested:
    'If an account matches that email, we sent password reset instructions.',
  rateLimited: 'Too many attempts. Please try again later.',
  verificationResent:
    'If an account matches that email, we sent a new verification message.',
}

export function sanitizeAuthNextPath(next: string | null | undefined, fallback: string) {
  return sanitizeNextPath(next, fallback)
}

export function jsonAuthSuccess(body: Record<string, unknown>, init?: ResponseInit) {
  return Response.json({ ok: true, ...body }, init)
}

export function jsonAuthError(
  status: number,
  code: string,
  error: string,
  init?: ResponseInit,
  extra?: Record<string, unknown>,
) {
  return Response.json({ code, error, ok: false, ...extra }, { ...init, status })
}

function splitSetCookieHeader(header: string): string[] {
  const cookies: string[] = []
  let current = ''
  let inExpires = false

  for (let index = 0; index < header.length; index += 1) {
    const nextChunk = header.slice(index, index + 8).toLowerCase()

    if (!inExpires && nextChunk === 'expires=') {
      inExpires = true
    }

    const character = header[index]

    if (character === ',' && !inExpires) {
      const cookie = current.trim()
      if (cookie) cookies.push(cookie)
      current = ''
      continue
    }

    current += character

    if (inExpires && character === ';') {
      inExpires = false
    }
  }

  const cookie = current.trim()
  if (cookie) cookies.push(cookie)

  return cookies
}

export function appendSetCookieHeaders(source: Headers, target: Headers) {
  const getSetCookie = (source as Headers & { getSetCookie?: () => string[] }).getSetCookie
  const setCookies = typeof getSetCookie === 'function' ? getSetCookie.call(source) : []

  if (setCookies.length > 0) {
    for (const value of setCookies) {
      target.append('set-cookie', value)
    }
    return
  }

  const getAll = (source as Headers & { getAll?: (name: string) => string[] }).getAll
  const workersCookies =
    typeof getAll === 'function' ? getAll.call(source, 'Set-Cookie') : []

  if (workersCookies.length > 0) {
    for (const value of workersCookies) {
      target.append('set-cookie', value)
    }
    return
  }

  const combined = source.get('set-cookie')
  if (combined) {
    for (const value of splitSetCookieHeader(combined)) {
      target.append('set-cookie', value)
    }
  }
}
