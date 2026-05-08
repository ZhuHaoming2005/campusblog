import { AuthInputError, parseEmailOnlyInput } from '../_lib/authInput'
import { buildFormRedirectURL } from '../_lib/formRedirects'
import { checkAuthCooldown, checkAuthRateLimit, getRequestIP, recordAuthCooldown } from '../_lib/authRateLimit'
import { AUTH_MESSAGES, jsonAuthError, jsonAuthSuccess } from '../_lib/authResponses'
import { getFrontendPayload } from '@/lib/frontendSession'
import { sendAuthActionEmail } from '@/email/authEmailTemplates'

async function readForgotPasswordInput(request: Request) {
  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    const input = parseEmailOnlyInput(await request.json())
    return {
      input,
      isFormSubmission: false,
      rawEmail: input.email,
      rawNext: input.next,
    }
  }

  const formData = await request.formData()
  const rawEmail = typeof formData.get('email') === 'string' ? String(formData.get('email')) : ''
  const rawNext = typeof formData.get('next') === 'string' ? String(formData.get('next')) : ''

  return {
    input: parseEmailOnlyInput({
      email: rawEmail,
      next: rawNext,
    }),
    isFormSubmission: true,
    rawEmail,
    rawNext,
  }
}

export async function POST(request: Request) {
  const requestURL = new URL(request.url)
  let rawEmail = ''
  let rawNext: string | null = null
  let isFormSubmission = false

  try {
    const inputResult = await readForgotPasswordInput(request)
    rawEmail = inputResult.rawEmail
    rawNext = inputResult.rawNext
    isFormSubmission = inputResult.isFormSubmission
    const { input } = inputResult
    const rateLimit = await checkAuthRateLimit({
      action: 'forgotPassword',
      email: input.email,
      ip: getRequestIP(request.headers),
    })

    if (rateLimit.limited) {
      if (isFormSubmission) {
        return Response.redirect(
          buildFormRedirectURL({
            baseURL: requestURL,
            pathname: '/forgot-password',
            params: {
              email: input.email,
              error: AUTH_MESSAGES.rateLimited,
              next: input.next,
            },
          }),
          302,
        )
      }

      return jsonAuthError(429, 'rate_limited', AUTH_MESSAGES.rateLimited, {
        headers: { 'retry-after': String(rateLimit.retryAfterSeconds) },
      })
    }

    const cooldown = await checkAuthCooldown({
      action: 'forgotPassword',
      email: input.email,
    })

    if (cooldown.limited) {
      if (isFormSubmission) {
        return Response.redirect(
          buildFormRedirectURL({
            baseURL: requestURL,
            pathname: '/forgot-password',
            params: {
              email: input.email,
              error: AUTH_MESSAGES.rateLimited,
              next: input.next,
            },
          }),
          302,
        )
      }

      return jsonAuthError(429, 'rate_limited', AUTH_MESSAGES.rateLimited, {
        headers: { 'retry-after': String(cooldown.retryAfterSeconds) },
      })
    }

    const payload = await getFrontendPayload()
    const token = await payload.forgotPassword({
      collection: 'users',
      data: {
        email: input.email,
      },
      disableEmail: true,
      overrideAccess: true,
    })

    if (typeof token === 'string' && token.length > 0) {
      await sendAuthActionEmail({
        action: 'resetPassword',
        next: input.next,
        pathname: '/reset-password',
        payload,
        req: request,
        to: input.email,
        token,
      })
    }

    await recordAuthCooldown({
      action: 'forgotPassword',
      email: input.email,
    })

    if (isFormSubmission) {
      return Response.redirect(
        buildFormRedirectURL({
          baseURL: requestURL,
          pathname: '/forgot-password',
          params: {
            email: input.email,
            next: input.next,
            status: 'sent',
          },
        }),
        302,
      )
    }

    return jsonAuthSuccess({
      code: 'password_reset_requested',
      message: AUTH_MESSAGES.passwordResetRequested,
    })
  } catch (error) {
    if (error instanceof AuthInputError) {
      if (isFormSubmission) {
        return Response.redirect(
          buildFormRedirectURL({
            baseURL: requestURL,
            pathname: '/forgot-password',
            params: {
              email: rawEmail,
              error: error.message,
              next: rawNext,
            },
          }),
          302,
        )
      }

      return jsonAuthError(error.status, error.code, error.message)
    }

    console.error('POST /api/auth/forgot-password error:', error)

    if (isFormSubmission) {
      return Response.redirect(
        buildFormRedirectURL({
          baseURL: requestURL,
          pathname: '/forgot-password',
          params: {
            email: rawEmail,
            error: 'Unable to start password reset right now.',
            next: rawNext,
          },
        }),
        302,
      )
    }

    return jsonAuthError(500, 'forgot_password_failed', 'Unable to start password reset right now.')
  }
}
