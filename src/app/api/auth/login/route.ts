import { AuthInputError, parseLoginInput } from '../_lib/authInput'
import { checkAuthRateLimit, getRequestIP } from '../_lib/authRateLimit'
import {
  appendSetCookieHeaders,
  AUTH_MESSAGES,
  jsonAuthError,
  jsonAuthSuccess,
  sanitizeAuthNextPath,
} from '../_lib/authResponses'
import { getFrontendLoginLockState } from '../_lib/limitedFrontendSession'

type UpstreamAuthErrorPayload = {
  errors?: Array<{
    message?: string
  }>
}

function getUpstreamAuthError(payload: UpstreamAuthErrorPayload | null | undefined) {
  const firstError = payload?.errors?.[0]
  if (!firstError || typeof firstError !== 'object') return null

  return {
    message:
      typeof firstError.message === 'string' && firstError.message.trim()
        ? firstError.message
        : null,
  }
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

    const upstream = await fetch(new URL('/api/users/login', request.url), {
      body: JSON.stringify({
        email: input.email,
        password: input.password,
      }),
      headers: {
        'accept-language': request.headers.get('accept-language') ?? '',
        'content-type': 'application/json',
      },
      method: 'POST',
    })

    if (!upstream.ok) {
      const upstreamPayload = (await upstream.json().catch((): null => null)) as
        | UpstreamAuthErrorPayload
        | null
      const upstreamError = getUpstreamAuthError(upstreamPayload)

      if (upstream.status === 403) {
        const next = sanitizeAuthNextPath(input.next, '/user/me')
        const location = `/verify/pending?email=${encodeURIComponent(input.email)}&next=${encodeURIComponent(next)}`
        return jsonAuthError(
          403,
          'email_verification_required',
          upstreamError?.message ?? 'Email verification is required.',
          undefined,
          { location },
        )
      }

      if (upstream.status === 401) {
        const lockState = await getFrontendLoginLockState({
          email: input.email,
          request,
        })

        if (lockState === 'locked') {
          return jsonAuthError(401, 'account_locked', 'This account is temporarily locked.')
        }

        return jsonAuthError(401, 'invalid_credentials', AUTH_MESSAGES.invalidCredentials)
      }

      if (upstream.status >= 500) {
        return jsonAuthError(500, 'login_failed', upstreamError?.message ?? 'Unable to log in right now.')
      }

      return jsonAuthError(
        upstream.status,
        'login_failed',
        upstreamError?.message ?? 'Unable to log in right now.',
      )
    }

    const payloadResponse = (await upstream.json()) as { user?: { id?: number | string } }
    const headers = new Headers()
    appendSetCookieHeaders(upstream.headers, headers)

    return jsonAuthSuccess(
      {
        next: sanitizeAuthNextPath(input.next, '/user/me'),
        user: payloadResponse.user ?? null,
      },
      { headers },
    )
  } catch (error) {
    if (error instanceof AuthInputError) {
      return jsonAuthError(error.status, error.code, error.message)
    }

    console.error('POST /api/auth/login error:', error)
    return jsonAuthError(500, 'login_failed', 'Unable to log in right now.')
  }
}
