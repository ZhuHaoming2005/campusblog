import { AuthInputError, parseResetPasswordInput } from '../_lib/authInput'
import { buildFormRedirectURL } from '../_lib/formRedirects'
import {
  AUTH_MESSAGES,
  jsonAuthError,
  jsonAuthSuccess,
  sanitizeAuthNextPath,
} from '../_lib/authResponses'
import {
  generatePayloadAuthCookie,
  type PayloadAuthCookieConfig,
} from '../_lib/payloadAuthCookie'
import { rejectCrossSiteStateChangingRequest } from '../_lib/stateChangingRequestGuard'
import { getFrontendPayload } from '@/lib/frontendSession'

async function readResetPasswordInput(request: Request) {
  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    const input = parseResetPasswordInput(await request.json())
    return {
      input,
      isFormSubmission: false,
      rawNext: input.next,
      rawToken: input.token,
    }
  }

  const formData = await request.formData()
  const rawNext = typeof formData.get('next') === 'string' ? String(formData.get('next')) : ''
  const rawToken = typeof formData.get('token') === 'string' ? String(formData.get('token')) : ''

  return {
    input: parseResetPasswordInput({
      password: formData.get('password'),
      passwordConfirm: formData.get('passwordConfirm'),
      token: rawToken,
      next: rawNext,
    }),
    isFormSubmission: true,
    rawNext,
    rawToken,
  }
}

export async function POST(request: Request) {
  const rejectedRequest = await rejectCrossSiteStateChangingRequest(request)
  if (rejectedRequest) return rejectedRequest

  const clonedRequest = request.clone()
  const requestURL = new URL(request.url)
  let rawNext: string | null = null
  let rawToken = ''
  let isFormSubmission = false

  try {
    const inputResult = await readResetPasswordInput(request)
    rawNext = inputResult.rawNext
    rawToken = inputResult.rawToken
    isFormSubmission = inputResult.isFormSubmission
    const { input } = inputResult
    const payload = await getFrontendPayload()
    const payloadResponse = await payload.resetPassword({
      collection: 'users',
      data: {
        password: input.password,
        token: input.token,
      },
      overrideAccess: true,
      req: {
        headers: request.headers,
        url: request.url,
      },
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
          request,
          token,
        }),
      )
    }

    if (isFormSubmission) {
      const redirectURL = buildFormRedirectURL({
        baseURL: requestURL,
        pathname: '/login',
        params: {
          next: sanitizeAuthNextPath(input.next, '/user/me'),
          status: 'password-reset',
        },
      })
      headers.set('location', redirectURL.toString())
      return new Response(null, { headers, status: 302 })
    }

    return jsonAuthSuccess(
      {
        code: 'password_reset_complete',
        next: sanitizeAuthNextPath(input.next, '/user/me'),
      },
      { headers },
    )
  } catch (error) {
    const shouldRedirectToForm =
      isFormSubmission || !(request.headers.get('content-type') ?? '').includes('application/json')

    if (shouldRedirectToForm && (!rawToken || rawNext === null)) {
      const fallbackFormData = await clonedRequest.formData().catch((): null => null)
      if (fallbackFormData) {
        rawNext =
          rawNext ??
          (typeof fallbackFormData.get('next') === 'string'
            ? String(fallbackFormData.get('next'))
            : '')
        rawToken =
          rawToken ||
          (typeof fallbackFormData.get('token') === 'string'
            ? String(fallbackFormData.get('token'))
            : '')
      }
    }

    if (error instanceof AuthInputError) {
      if (shouldRedirectToForm) {
        return Response.redirect(
          buildFormRedirectURL({
            baseURL: requestURL,
            pathname: '/reset-password',
            params: {
              error: error.message,
              next: rawNext,
              token: rawToken,
            },
          }),
          302,
        )
      }

      return jsonAuthError(error.status, error.code, error.message)
    }

    if (shouldRedirectToForm) {
      return Response.redirect(
        buildFormRedirectURL({
          baseURL: requestURL,
          pathname: '/reset-password',
          params: {
            error: AUTH_MESSAGES.invalidOrExpiredToken,
            next: rawNext,
          },
        }),
        302,
      )
    }

    return jsonAuthError(
      400,
      'invalid_or_expired_token',
      AUTH_MESSAGES.invalidOrExpiredToken,
    )
  }
}
