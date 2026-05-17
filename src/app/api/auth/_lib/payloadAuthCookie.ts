export type PayloadAuthCookieConfig = {
  cookies: {
    domain?: string | null
    sameSite?: boolean | 'Lax' | 'None' | 'Strict' | null
    secure?: boolean | null
  }
  tokenExpiration?: number | null
}

function resolveSameSite(value: PayloadAuthCookieConfig['cookies']['sameSite']) {
  if (typeof value === 'string') return value
  return value ? 'Strict' : undefined
}

function isHTTPSRequest(request: Request) {
  if (request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() === 'https') {
    return true
  }

  try {
    return new URL(request.url).protocol === 'https:'
  } catch {
    return false
  }
}

function shouldUseSecureCookie(args: {
  request: Request
  sameSite?: string
  secure?: boolean | null
}) {
  return args.secure === true || args.sameSite === 'None' || isHTTPSRequest(args.request)
}

export function generatePayloadAuthCookie(args: {
  auth: PayloadAuthCookieConfig
  cookiePrefix: string
  request: Request
  token: string
}): string {
  const sameSite = resolveSameSite(args.auth.cookies.sameSite)
  const expires = new Date()
  expires.setSeconds(expires.getSeconds() + (args.auth.tokenExpiration ?? 7200))

  let cookie = `${args.cookiePrefix}-token=${args.token}; Expires=${expires.toUTCString()}; Path=/`

  if (args.auth.cookies.domain) {
    cookie += `; Domain=${args.auth.cookies.domain}`
  }

  if (
    shouldUseSecureCookie({
      request: args.request,
      sameSite,
      secure: args.auth.cookies.secure,
    })
  ) {
    cookie += '; Secure'
  }

  cookie += '; HttpOnly'

  if (sameSite) {
    cookie += `; SameSite=${sameSite}`
  }

  return cookie
}

export function generateExpiredPayloadCookie(args: {
  cookiePrefix: string
  cookies: PayloadAuthCookieConfig['cookies']
  request: Request
}) {
  const sameSite = resolveSameSite(args.cookies.sameSite)
  const expires = new Date(Date.now() - 1000).toUTCString()
  let cookie = `${args.cookiePrefix}-token=; Expires=${expires}; Path=/`

  if (args.cookies.domain) {
    cookie += `; Domain=${args.cookies.domain}`
  }

  if (
    shouldUseSecureCookie({
      request: args.request,
      sameSite,
      secure: args.cookies.secure,
    })
  ) {
    cookie += '; Secure'
  }

  cookie += '; HttpOnly'

  if (sameSite) {
    cookie += `; SameSite=${sameSite}`
  }

  return cookie
}
