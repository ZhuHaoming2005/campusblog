import type { User } from '@/payload-types'
import { getCurrentFrontendUser } from '@/lib/frontendSession'

export type FrontendAuthUser = User & {
  _verified?: boolean | null
}

type FailureCode = 'auth_required' | 'author_access_required' | 'email_verification_required'

type FailureResult = {
  code: FailureCode
  error: string
  location: string
  ok: false
  status: number
}

type SuccessResult = {
  ok: true
  user: FrontendAuthUser
}

export function isFrontendAuthFailure(result: FailureResult | SuccessResult): result is FailureResult {
  return result.ok === false
}

export function toAuthFailureResponse(result: FailureResult | SuccessResult) {
  if (!isFrontendAuthFailure(result)) {
    throw new Error('Expected frontend auth failure result.')
  }

  return Response.json(
    {
      code: result.code,
      error: result.error,
      ok: false,
    },
    {
      headers: { location: result.location },
      status: result.status,
    },
  )
}

export async function requireFrontendAuth(args: {
  headers: Headers
  nextPath: string
  requireAuthorAccess?: boolean
  requireVerified?: boolean
}): Promise<FailureResult | SuccessResult> {
  const user = (await getCurrentFrontendUser(args.headers)) as FrontendAuthUser | null
  const safeNextPath = encodeURIComponent(args.nextPath)

  if (!user) {
    return {
      code: 'auth_required',
      error: 'Authentication is required.',
      location: `/login?next=${safeNextPath}`,
      ok: false,
      status: 401,
    }
  }

  if (args.requireVerified && user._verified !== true) {
    return {
      code: 'email_verification_required',
      error: 'Email verification is required.',
      location: `/verify/pending?email=${encodeURIComponent(user.email)}&next=${safeNextPath}`,
      ok: false,
      status: 403,
    }
  }

  if (args.requireAuthorAccess && user.isActive !== true) {
    return {
      code: 'author_access_required',
      error: 'Author access is required.',
      location: '/user/me',
      ok: false,
      status: 403,
    }
  }

  return {
    ok: true,
    user,
  }
}
