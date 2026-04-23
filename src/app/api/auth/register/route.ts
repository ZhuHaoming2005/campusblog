import { AuthInputError, parseRegisterInput } from '../_lib/authInput'
import { checkAuthRateLimit, getRequestIP } from '../_lib/authRateLimit'
import { AUTH_MESSAGES, jsonAuthError, jsonAuthSuccess, sanitizeAuthNextPath } from '../_lib/authResponses'
import { getFrontendPayload } from '@/lib/frontendSession'

type PayloadFieldError = {
  message?: string
  path?: string
}

type PayloadValidationError = {
  data?: {
    errors?: PayloadFieldError[]
  }
  message?: string
  status?: number
}

function getPayloadValidationError(error: unknown) {
  if (!error || typeof error !== 'object') return null

  const typedError = error as PayloadValidationError
  if (typedError.status !== 400) return null

  const firstFieldError = typedError.data?.errors?.find(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof item.message === 'string' &&
      item.message.trim().length > 0,
  )

  if (firstFieldError) {
    return {
      code:
        firstFieldError.path === 'email'
          ? 'invalid_email'
          : firstFieldError.path === 'password'
            ? 'invalid_password'
            : 'invalid_registration',
      message: firstFieldError.message!,
      status: 400,
    }
  }

  if (typeof typedError.message === 'string' && typedError.message.trim()) {
    return {
      code: 'invalid_registration',
      message: typedError.message,
      status: 400,
    }
  }

  return null
}

export async function POST(request: Request) {
  try {
    const input = parseRegisterInput(await request.json())
    const rateLimit = await checkAuthRateLimit({
      action: 'register',
      ip: getRequestIP(request.headers),
    })

    if (rateLimit.limited) {
      return jsonAuthError(429, 'rate_limited', AUTH_MESSAGES.rateLimited, {
        headers: { 'retry-after': String(rateLimit.retryAfterSeconds) },
      })
    }

    const payload = await getFrontendPayload()
    const user = await payload.create({
      collection: 'users',
      context: {
        authNextPath: input.next,
      },
      data: {
        displayName: input.displayName,
        email: input.email,
        password: input.password,
      } as never,
      overrideAccess: true,
      req: {
        headers: request.headers,
        url: request.url,
      } as never,
    })

    return jsonAuthSuccess(
      {
        email: user.email,
        next: sanitizeAuthNextPath(input.next, '/verify/pending'),
        status: 'verification_pending',
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof AuthInputError) {
      return jsonAuthError(error.status, error.code, error.message)
    }

    const validationError = getPayloadValidationError(error)
    if (validationError) {
      return jsonAuthError(validationError.status, validationError.code, validationError.message)
    }

    console.error('POST /api/auth/register error:', error)
    return jsonAuthError(500, 'register_failed', 'Unable to register right now.')
  }
}
