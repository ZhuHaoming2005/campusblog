import { AuthInputError, parseVerifyEmailInput } from '../_lib/authInput'
import { sanitizeAuthNextPath } from '../_lib/authResponses'
import { getFrontendPayload } from '@/lib/frontendSession'

export async function GET(request: Request) {
  const url = new URL(request.url)

  try {
    const input = parseVerifyEmailInput(url.searchParams)
    const payload = await getFrontendPayload()

    await payload.verifyEmail({
      collection: 'users',
      token: input.token,
    })

    const redirectURL = new URL('/verify', url)
    redirectURL.searchParams.set('status', 'success')

    const next = sanitizeAuthNextPath(input.next, '/login')
    if (next !== '/login') {
      redirectURL.searchParams.set('next', next)
    }

    return Response.redirect(redirectURL, 302)
  } catch (error) {
    const redirectURL = new URL('/verify', url)
    redirectURL.searchParams.set('status', 'error')
    const next = sanitizeAuthNextPath(url.searchParams.get('next'), '/login')
    if (next !== '/login') {
      redirectURL.searchParams.set('next', next)
    }

    if (error instanceof AuthInputError) {
      return Response.redirect(redirectURL, 302)
    }

    return Response.redirect(redirectURL, 302)
  }
}
