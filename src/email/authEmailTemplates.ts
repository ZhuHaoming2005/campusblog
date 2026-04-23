import { maybeSanitizeNextPath } from '@/lib/authNavigation'

type PayloadEmailLike = {
  email: {
    defaultFromAddress: string
    defaultFromName: string
    sendEmail: (args: {
      from: string
      html: string
      subject: string
      to: string
    }) => Promise<unknown>
  }
}

type AuthRequestLike =
  | {
      headers?:
        | Headers
        | {
            get?: (name: string) => string | null | undefined
            origin?: unknown
            host?: unknown
            ['x-forwarded-host']?: unknown
            ['x-forwarded-proto']?: unknown
          }
        | null
      payload?: {
        config?: {
          serverURL?: string | null
        } | null
      } | null
      url?: string | null
    }
  | null
  | undefined

const getPublicAppURL = (req?: AuthRequestLike) =>
  req?.payload?.config?.serverURL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

function normalizeOrigin(value: string | null | undefined) {
  if (!value) return null

  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

function getTrustedEmailOrigins(req?: AuthRequestLike) {
  const origins = new Set<string>()
  const configuredOrigin = normalizeOrigin(getPublicAppURL(req))

  if (configuredOrigin) {
    origins.add(configuredOrigin)
  }

  for (const value of (process.env.AUTH_EMAIL_ALLOWED_ORIGINS ?? '').split(',')) {
    const origin = normalizeOrigin(value.trim())
    if (origin) {
      origins.add(origin)
    }
  }

  return origins
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function readHeader(
  headers:
    | Headers
    | {
        get?: (name: string) => string | null | undefined
        [key: string]: unknown
      }
    | null
    | undefined,
  name: string,
) {
  if (!headers) return null

  if (typeof headers.get === 'function') {
    return headers.get(name) ?? null
  }

  const value = (headers as { [key: string]: unknown })[name]
  return typeof value === 'string' ? value : null
}

function readRequestOrigin(req: AuthRequestLike) {
  const trustedOrigins = getTrustedEmailOrigins(req)
  const pickTrustedOrigin = (value: string | null) => {
    const origin = normalizeOrigin(value)
    return origin && trustedOrigins.has(origin) ? origin : null
  }

  if (typeof req?.url === 'string') {
    const origin = pickTrustedOrigin(req.url)
    if (origin) {
      return origin
    }
  }

  const originHeader = readHeader(req?.headers ?? null, 'origin')
  const trustedOriginHeader = pickTrustedOrigin(originHeader)
  if (trustedOriginHeader) {
    return trustedOriginHeader
  }

  const forwardedHost =
    readHeader(req?.headers ?? null, 'x-forwarded-host') ?? readHeader(req?.headers ?? null, 'host')
  const forwardedProto = readHeader(req?.headers ?? null, 'x-forwarded-proto') ?? 'https'

  if (!forwardedHost) {
    return null
  }

  return pickTrustedOrigin(`${forwardedProto}://${forwardedHost}`)
}

export function readAuthNextPathFromReq(
  req:
    | {
        context?: {
          authNextPath?: unknown
        } | null
      }
    | null
    | undefined,
) {
  const nextPath =
    req?.context && typeof req.context === 'object' ? req.context.authNextPath : undefined

  return typeof nextPath === 'string' ? maybeSanitizeNextPath(nextPath) : null
}

export function buildAuthActionURL(args: {
  next?: string | null
  pathname: string
  req?: AuthRequestLike
  token: string
}) {
  const url = new URL(args.pathname, readRequestOrigin(args.req) ?? getPublicAppURL(args.req))
  url.searchParams.set('token', args.token)

  if (args.next) {
    url.searchParams.set('next', args.next)
  }

  return url.toString()
}

export function renderAuthActionEmail(args: {
  actionLabel: string
  intro: string
  next?: string | null
  pathname: string
  req?: AuthRequestLike
  token: string
  userEmail?: string | null
}) {
  const actionURL = buildAuthActionURL({
    next: args.next,
    pathname: args.pathname,
    req: args.req,
    token: args.token,
  })

  return [
    `<p>${args.intro}</p>`,
    args.userEmail ? `<p>${escapeHtml(args.userEmail)}</p>` : '',
    `<p><a href="${actionURL}">${args.actionLabel}</a></p>`,
  ]
    .filter(Boolean)
    .join('')
}

export async function sendAuthActionEmail(args: {
  actionLabel: string
  intro: string
  next?: string | null
  pathname: string
  payload: PayloadEmailLike
  req?: AuthRequestLike
  subject: string
  to: string
  token: string
}) {
  await args.payload.email.sendEmail({
    from: `"${args.payload.email.defaultFromName}" <${args.payload.email.defaultFromAddress}>`,
    html: renderAuthActionEmail({
      actionLabel: args.actionLabel,
      intro: args.intro,
      next: args.next,
      pathname: args.pathname,
      req: args.req,
      token: args.token,
      userEmail: args.to,
    }),
    subject: args.subject,
    to: args.to,
  })
}
