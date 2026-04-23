import { afterEach, beforeEach, describe, expect, it } from 'vitest'

describe('authEmailTemplates', () => {
  const originalSiteURL = process.env.NEXT_PUBLIC_SITE_URL
  const originalAllowedOrigins = process.env.AUTH_EMAIL_ALLOWED_ORIGINS

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://fallback.example.com'
    process.env.AUTH_EMAIL_ALLOWED_ORIGINS =
      'https://preview.example.com,https://branch-preview.example.com'
  })

  afterEach(() => {
    if (originalSiteURL === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteURL
    }

    if (originalAllowedOrigins === undefined) {
      delete process.env.AUTH_EMAIL_ALLOWED_ORIGINS
      return
    }

    process.env.AUTH_EMAIL_ALLOWED_ORIGINS = originalAllowedOrigins
  })

  it('builds auth action URLs from the active request origin before falling back to NEXT_PUBLIC_SITE_URL', async () => {
    const { buildAuthActionURL } = await import('@/email/authEmailTemplates')

    expect(
      buildAuthActionURL({
        next: '/editor',
        pathname: '/reset-password',
        req: {
          url: 'https://preview.example.com/api/auth/forgot-password',
        },
        token: 'reset-token',
      }),
    ).toBe('https://preview.example.com/reset-password?token=reset-token&next=%2Feditor')

    expect(
      buildAuthActionURL({
        next: '/editor',
        pathname: '/reset-password',
        token: 'reset-token',
      }),
    ).toBe('https://fallback.example.com/reset-password?token=reset-token&next=%2Feditor')
  })

  it('renders auth action email links with request-origin-first URLs', async () => {
    const { renderAuthActionEmail } = await import('@/email/authEmailTemplates')

    expect(
      renderAuthActionEmail({
        actionLabel: 'Verify your email',
        intro: 'Verify your email address to activate CampusBlog sign-in.',
        next: '/editor',
        pathname: '/api/auth/verify-email',
        req: {
          headers: new Headers({
            origin: 'https://branch-preview.example.com',
          }),
        },
        token: 'verify-token',
        userEmail: 'user@example.com',
      }),
    ).toContain(
      'href="https://branch-preview.example.com/api/auth/verify-email?token=verify-token&next=%2Feditor"',
    )
  })

  it('falls back to the configured site origin when request-derived origin is not trusted', async () => {
    const { buildAuthActionURL } = await import('@/email/authEmailTemplates')

    expect(
      buildAuthActionURL({
        next: '/editor',
        pathname: '/reset-password',
        req: {
          headers: new Headers({
            origin: 'https://evil.example.com',
            'x-forwarded-host': 'evil.example.com',
            'x-forwarded-proto': 'https',
          }),
          url: 'https://evil.example.com/api/auth/forgot-password',
        },
        token: 'reset-token',
      }),
    ).toBe('https://fallback.example.com/reset-password?token=reset-token&next=%2Feditor')
  })

  it('escapes userEmail before interpolating it into auth email html', async () => {
    const { renderAuthActionEmail } = await import('@/email/authEmailTemplates')

    const html = renderAuthActionEmail({
      actionLabel: 'Verify your email',
      intro: 'Verify your email address to activate CampusBlog sign-in.',
      pathname: '/api/auth/verify-email',
      token: 'verify-token',
      userEmail: 'bad@example.com"><img src=x onerror=alert(1)>',
    })

    expect(html).toContain(
      '<p>bad@example.com&quot;&gt;&lt;img src=x onerror=alert(1)&gt;</p>',
    )
    expect(html).not.toContain('bad@example.com"><img src=x onerror=alert(1)>')
  })
})
