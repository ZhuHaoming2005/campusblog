import { createLocalReq, getPayload, logoutOperation } from 'payload'

import { jsonAuthError, jsonAuthSuccess } from '../_lib/authResponses'
import { generateExpiredPayloadCookie } from '../_lib/payloadAuthCookie'
import { rejectCrossSiteStateChangingRequest } from '../_lib/stateChangingRequestGuard'

export async function POST(request: Request) {
  const rejectedRequest = await rejectCrossSiteStateChangingRequest(request)
  if (rejectedRequest) return rejectedRequest

  try {
    const { default: config } = await import('@/payload.config')
    const payload = await getPayload({ config: await config })
    const authResult = await payload.auth({ headers: request.headers })
    const usersCollection = payload.collections.users

    if (!usersCollection?.config.auth || !authResult.user) {
      return jsonAuthError(400, 'logout_failed', 'Unable to log out right now.')
    }

    const req = await createLocalReq(
      {
        req: {
          headers: request.headers,
          url: request.url,
        },
        user: authResult.user,
      },
      payload,
    )

    await logoutOperation({
      allSessions: false,
      collection: usersCollection,
      req,
    })

    const headers = new Headers()
    headers.append(
      'set-cookie',
      generateExpiredPayloadCookie({
        cookiePrefix: payload.config.cookiePrefix,
        cookies: usersCollection.config.auth.cookies,
        request,
      }),
    )

    return jsonAuthSuccess({ status: 'logged_out' }, { headers })
  } catch (error) {
    console.error('POST /api/auth/logout error:', error)
    return jsonAuthError(500, 'logout_failed', 'Unable to log out right now.')
  }
}
