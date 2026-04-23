import crypto from 'node:crypto'

import { AuthInputError, parseEmailOnlyInput } from '../_lib/authInput'
import { buildFormRedirectURL } from '../_lib/formRedirects'
import { checkAuthCooldown, checkAuthRateLimit, getRequestIP, recordAuthCooldown } from '../_lib/authRateLimit'
import { sendVerificationEmail } from '../_lib/payloadVerificationEmail'
import { AUTH_MESSAGES, jsonAuthError, jsonAuthSuccess } from '../_lib/authResponses'
import { getFrontendPayload } from '@/lib/frontendSession'

type VerificationUser = {
  _verificationToken?: string | null
  _verified?: boolean | null
  email: string
  id: number | string
}

async function readResendVerificationInput(request: Request) {
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
    const inputResult = await readResendVerificationInput(request)
    rawEmail = inputResult.rawEmail
    rawNext = inputResult.rawNext
    isFormSubmission = inputResult.isFormSubmission
    const { input } = inputResult
    const rateLimit = await checkAuthRateLimit({
      action: 'resendVerification',
      email: input.email,
      ip: getRequestIP(request.headers),
    })

    if (rateLimit.limited) {
      if (isFormSubmission) {
        return Response.redirect(
          buildFormRedirectURL({
            baseURL: requestURL,
            pathname: '/verify/pending',
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
      action: 'resendVerification',
      email: input.email,
    })

    if (cooldown.limited) {
      if (isFormSubmission) {
        return Response.redirect(
          buildFormRedirectURL({
            baseURL: requestURL,
            pathname: '/verify/pending',
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
    const users = await payload.find({
      collection: 'users',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      showHiddenFields: true,
      where: {
        email: {
          equals: input.email,
        },
      },
    })

    const user = users.docs[0] as VerificationUser | undefined

    if (
      user &&
      user._verified !== true &&
      user.email
    ) {
      const existingToken =
        typeof user._verificationToken === 'string' && user._verificationToken.length > 0
          ? user._verificationToken
          : null
      const token = existingToken ?? crypto.randomBytes(20).toString('hex')
      const updatedUser =
        existingToken === null
          ? await payload.update({
              collection: 'users',
              id: user.id,
              data: {
                _verificationToken: token,
                _verified: false,
              } as never,
              overrideAccess: true,
              showHiddenFields: true,
            })
          : user

      await sendVerificationEmail({
        collectionSlug: 'users',
        context: {
          authNextPath: input.next,
        },
        payload,
        requestHeaders: request.headers,
        requestURL: request.url,
        token,
        user: updatedUser as VerificationUser,
      })
    }

    await recordAuthCooldown({
      action: 'resendVerification',
      email: input.email,
    })

    if (isFormSubmission) {
      return Response.redirect(
        buildFormRedirectURL({
          baseURL: requestURL,
          pathname: '/verify/pending',
          params: {
            email: input.email,
            next: input.next,
            status: 'resent',
          },
        }),
        302,
      )
    }

    return jsonAuthSuccess({
      code: 'verification_resent',
      message: AUTH_MESSAGES.verificationResent,
    })
  } catch (error) {
    if (error instanceof AuthInputError) {
      if (isFormSubmission) {
        return Response.redirect(
          buildFormRedirectURL({
            baseURL: requestURL,
            pathname: '/verify/pending',
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

    console.error('POST /api/auth/resend-verification error:', error)

    if (isFormSubmission) {
      return Response.redirect(
        buildFormRedirectURL({
          baseURL: requestURL,
          pathname: '/verify/pending',
          params: {
            email: rawEmail,
            error: 'Unable to resend verification right now.',
            next: rawNext,
          },
        }),
        302,
      )
    }

    return jsonAuthError(500, 'resend_verification_failed', 'Unable to resend verification right now.')
  }
}
