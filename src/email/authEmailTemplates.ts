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
  process.env.NEXT_PUBLIC_SITE_URL || req?.payload?.config?.serverURL || 'http://localhost:3000'

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
  const escapedActionLabel = escapeHtml(args.actionLabel)
  const escapedActionURL = escapeHtml(actionURL)
  const escapedIntro = escapeHtml(args.intro)
  const escapedUserEmail = args.userEmail ? escapeHtml(args.userEmail) : null

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f4f7fb;color:#17324d;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapedIntro}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border-radius:18px;overflow:hidden;background:#ffffff;border:1px solid #dbe6f1;">
            <tr>
              <td style="background:#0d3b66;padding:24px 28px;color:#ffffff;">
                <div style="font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:#b8d8e8;">CampusBlog</div>
                <h1 style="margin:12px 0 0;font-size:26px;line-height:1.25;font-weight:700;">${escapedActionLabel}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0;color:#314f6b;font-size:16px;line-height:1.7;">${escapedIntro}</p>
                ${
                  escapedUserEmail
                    ? `<p style="margin:18px 0 0;color:#5e7892;font-size:14px;line-height:1.6;">Account: <strong style="color:#17324d;">${escapedUserEmail}</strong></p>`
                    : ''
                }
                <p style="margin:28px 0 0;">
                  <a href="${escapedActionURL}" style="display:inline-block;border-radius:12px;background:#1b7f79;color:#ffffff;font-size:15px;font-weight:700;line-height:1;text-decoration:none;padding:15px 22px;">${escapedActionLabel}</a>
                </p>
                <p style="margin:24px 0 0;color:#5e7892;font-size:13px;line-height:1.7;">If the button does not work, copy and paste this URL into your browser:</p>
                <p style="margin:8px 0 0;word-break:break-all;color:#0d3b66;font-size:13px;line-height:1.6;">
                  <a href="${escapedActionURL}" style="color:#0d3b66;">${escapedActionURL}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
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
