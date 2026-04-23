import { afterEach, beforeEach, describe, expect, it } from 'vitest'

describe('authEmailTemplates', () => {
  const originalSiteURL = process.env.NEXT_PUBLIC_SITE_URL
  const originalAllowedOrigins = process.env.AUTH_EMAIL_ALLOWED_ORIGINS
  const testEnv = process.env as Record<string, string | undefined>

  beforeEach(() => {
    testEnv.NEXT_PUBLIC_SITE_URL = 'https://fallback.example.com'
    process.env.AUTH_EMAIL_ALLOWED_ORIGINS =
      'https://preview.example.com,https://branch-preview.example.com'
  })

  afterEach(() => {
    if (originalSiteURL === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL
    } else {
      testEnv.NEXT_PUBLIC_SITE_URL = originalSiteURL
    }

    if (originalAllowedOrigins === undefined) {
      delete process.env.AUTH_EMAIL_ALLOWED_ORIGINS
      return
    }

    process.env.AUTH_EMAIL_ALLOWED_ORIGINS = originalAllowedOrigins
  })

  it('builds auth action URLs from NEXT_PUBLIC_SITE_URL before falling back to Payload serverURL', async () => {
    const { buildAuthActionURL } = await import('@/email/authEmailTemplates')

    expect(
      buildAuthActionURL({
        next: '/editor',
        pathname: '/reset-password',
        req: {
          payload: {
            config: {
              serverURL: 'https://campusblog-dev.zhuhaoming.workers.dev',
            },
          },
          url: 'https://campusblog-dev.zhuhaoming.workers.dev/api/auth/forgot-password',
        },
        token: 'reset-token',
      }),
    ).toBe('https://fallback.example.com/reset-password?token=reset-token&next=%2Feditor')

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
      'href="https://branch-preview.example.com/api/auth/verify-email?token=verify-token&amp;next=%2Feditor"',
    )
  })

  it('renders verification email content with a readable call to action and fallback URL', async () => {
    const { renderAuthActionEmail } = await import('@/email/authEmailTemplates')

    const html = renderAuthActionEmail({
      actionLabel: 'Verify your email',
      intro: 'Verify your email address to activate CampusBlog sign-in.',
      next: '/post/xue-xi-zi-liao',
      pathname: '/api/auth/verify-email',
      req: {
        payload: {
          config: {
            serverURL: 'https://campusblog-dev.zhuhaoming.workers.dev',
          },
        },
      },
      token: 'verify-token',
      userEmail: 'user@example.com',
    })

    expect(html).toContain('CampusBlog')
    expect(html).toContain('Verify your email')
    expect(html).toContain('href="https://fallback.example.com/api/auth/verify-email?token=verify-token&amp;next=%2Fpost%2Fxue-xi-zi-liao"')
    expect(html).toContain('copy and paste this URL')
  })

  it('renders Chinese auth email copy when the selected locale cookie is zh-CN', async () => {
    const { renderAuthActionEmail } = await import('@/email/authEmailTemplates')

    const html = renderAuthActionEmail({
      action: 'verifyEmail',
      next: '/editor',
      pathname: '/api/auth/verify-email',
      req: {
        headers: new Headers({
          cookie: 'locale=zh-CN',
        }),
      },
      token: 'verify-token',
      userEmail: 'user@example.com',
    })

    expect(html).toContain('<html lang="zh-CN">')
    expect(html).toContain('验证你的邮箱')
    expect(html).toContain('账户：')
    expect(html).toContain('如果按钮无法打开，请复制以下链接到浏览器：')
  })

  it('renders English auth email copy when the selected locale cookie is en-US', async () => {
    const { renderAuthActionEmail } = await import('@/email/authEmailTemplates')

    const html = renderAuthActionEmail({
      action: 'resetPassword',
      pathname: '/reset-password',
      req: {
        headers: new Headers({
          cookie: 'locale=en-US',
          'accept-language': 'zh-CN,zh;q=0.9',
        }),
      },
      token: 'reset-token',
      userEmail: 'user@example.com',
    })

    expect(html).toContain('<html lang="en-US">')
    expect(html).toContain('Reset your password')
    expect(html).toContain('Account:')
    expect(html).toContain('If the button does not work, copy and paste this URL into your browser:')
  })

  it('uses Accept-Language for auth email copy when no locale cookie is selected', async () => {
    const { resolveAuthEmailLocale } = await import('@/email/authEmailTemplates')

    expect(
      resolveAuthEmailLocale({
        headers: new Headers({
          'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
        }),
      }),
    ).toBe('zh-CN')

    expect(
      resolveAuthEmailLocale({
        headers: new Headers({
          'accept-language': 'en-US,en;q=0.9,zh;q=0.8',
        }),
      }),
    ).toBe('en-US')
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

    expect(html).toContain('bad@example.com&quot;&gt;&lt;img src=x onerror=alert(1)&gt;')
    expect(html).not.toContain('bad@example.com"><img src=x onerror=alert(1)>')
  })
})
