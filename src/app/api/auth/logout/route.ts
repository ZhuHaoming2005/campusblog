import { createLocalReq, getPayload, logoutOperation } from 'payload'

import config from '@/payload.config'
import { jsonAuthError, jsonAuthSuccess } from '../_lib/authResponses'

function generateExpiredPayloadCookie(args: {
  cookiePrefix: string
  cookies: {
    domain?: string | null
    sameSite?: boolean | 'Lax' | 'None' | 'Strict' | null
    secure?: boolean | null
  }
}) {
  const sameSite =
    typeof args.cookies.sameSite === 'string'
      ? args.cookies.sameSite
      : args.cookies.sameSite
        ? 'Strict'
        : undefined
  const expires = new Date(Date.now() - 1000).toUTCString()
  let cookie = `${args.cookiePrefix}-token=; Expires=${expires}; Path=/; HttpOnly=true`

  if (args.cookies.domain) {
    cookie += `; Domain=${args.cookies.domain}`
  }

  if (args.cookies.secure || sameSite === 'None') {
    cookie += '; Secure=true'
  }

  if (sameSite) {
    cookie += `; SameSite=${sameSite}`
  }

  return cookie
}

export async function POST(request: Request) {
  try {
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
      }),
    )

    return jsonAuthSuccess({ status: 'logged_out' }, { headers })
  } catch (error) {
    console.error('POST /api/auth/logout error:', error)
    return jsonAuthError(500, 'logout_failed', 'Unable to log out right now.')
  }
}
