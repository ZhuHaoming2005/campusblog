import { getPayload } from 'payload'

import { AuthInputError, parseLoginInput } from '../_lib/authInput'
import { checkAuthRateLimit, getRequestIP } from '../_lib/authRateLimit'
import {
  AUTH_MESSAGES,
  jsonAuthError,
  jsonAuthSuccess,
  sanitizeAuthNextPath,
} from '../_lib/authResponses'

type PayloadLoginError = Error & {
  status?: number
}

type PayloadAuthCookieConfig = {
  cookies: {
    domain?: string | null
    sameSite?: boolean | 'Lax' | 'None' | 'Strict' | null
    secure?: boolean | null
  }
  tokenExpiration?: number | null
}

function getPayloadLoginError(error: unknown): PayloadLoginError | null {
  return error instanceof Error ? (error as PayloadLoginError) : null
}

function isPayloadLoginError(error: unknown, name: string): boolean {
  return getPayloadLoginError(error)?.name === name
}

function getPayloadLoginErrorMessage(error: unknown): string | null {
  const message = getPayloadLoginError(error)?.message
  return typeof message === 'string' && message.trim() ? message : null
}

function generatePayloadAuthCookie(args: {
  auth: PayloadAuthCookieConfig
  cookiePrefix: string
  token: string
}): string {
  const sameSite =
    typeof args.auth.cookies.sameSite === 'string'
      ? args.auth.cookies.sameSite
      : args.auth.cookies.sameSite
        ? 'Strict'
        : undefined
  const expires = new Date()
  expires.setSeconds(expires.getSeconds() + (args.auth.tokenExpiration ?? 7200))

  let cookie = `${args.cookiePrefix}-token=${args.token}; Expires=${expires.toUTCString()}; Path=/`

  if (args.auth.cookies.domain) {
    cookie += `; Domain=${args.auth.cookies.domain}`
  }

  if (args.auth.cookies.secure || sameSite === 'None') {
    cookie += '; Secure=true'
  }

  cookie += '; HttpOnly=true'

  if (sameSite) {
    cookie += `; SameSite=${sameSite}`
  }

  return cookie
}

async function getPayloadLoginErrorResponse(args: {
  email: string
  error: unknown
  next: string | null | undefined
  request: Request
}): Promise<Response | null> {
  if (isPayloadLoginError(args.error, 'UnverifiedEmail')) {
    const next = sanitizeAuthNextPath(args.next, '/user/me')
    const location = `/verify/pending?email=${encodeURIComponent(args.email)}&next=${encodeURIComponent(next)}`
    return jsonAuthError(
      403,
      'email_verification_required',
      getPayloadLoginErrorMessage(args.error) ?? 'Email verification is required.',
      undefined,
      { location },
    )
  }

  if (isPayloadLoginError(args.error, 'LockedAuth')) {
    return jsonAuthError(401, 'account_locked', 'This account is temporarily locked.')
  }

  if (
    isPayloadLoginError(args.error, 'AuthenticationError') ||
    getPayloadLoginError(args.error)?.status === 401
  ) {
    const { getFrontendLoginLockState } = await import('../_lib/limitedFrontendSession')
    const lockState = await getFrontendLoginLockState({
      email: args.email,
      request: args.request,
    })

    if (lockState === 'locked') {
      return jsonAuthError(401, 'account_locked', 'This account is temporarily locked.')
    }

    return jsonAuthError(401, 'invalid_credentials', AUTH_MESSAGES.invalidCredentials)
  }

  return null
}

export async function POST(request: Request) {
  try {
    const input = parseLoginInput(await request.json())
    const rateLimit = await checkAuthRateLimit({
      action: 'login',
      email: input.email,
      ip: getRequestIP(request.headers),
    })

    if (rateLimit.limited) {
      return jsonAuthError(429, 'rate_limited', AUTH_MESSAGES.rateLimited, {
        headers: { 'retry-after': String(rateLimit.retryAfterSeconds) },
      })
    }

    const { default: config } = await import('@/payload.config')
    const payload = await getPayload({ config: await config })

    try {
      const payloadResponse = await payload.login({
        collection: 'users',
        data: {
          email: input.email,
          password: input.password,
        },
        overrideAccess: false,
        req: {
          headers: request.headers,
        },
        showHiddenFields: true,
      })
      const token = typeof payloadResponse.token === 'string' ? payloadResponse.token : ''
      const headers = new Headers()

      if (token) {
        const usersCollection = payload.collections.users
        headers.append(
          'set-cookie',
          generatePayloadAuthCookie({
            auth: usersCollection.config.auth as PayloadAuthCookieConfig,
            cookiePrefix: payload.config.cookiePrefix,
            token,
          }),
        )
      }

      return jsonAuthSuccess(
        {
          next: sanitizeAuthNextPath(input.next, '/user/me'),
          user: payloadResponse.user ?? null,
        },
        { headers },
      )
    } catch (error) {
      const errorResponse = await getPayloadLoginErrorResponse({
        email: input.email,
        error,
        next: input.next,
        request,
      })

      if (errorResponse) {
        return errorResponse
      }

      throw error
    }
  } catch (error) {
    if (error instanceof AuthInputError) {
      return jsonAuthError(error.status, error.code, error.message)
    }

    console.error('POST /api/auth/login error:', error)
    return jsonAuthError(
      500,
      'login_failed',
      getPayloadLoginErrorMessage(error) ?? 'Unable to log in right now.',
    )
  }
}
