import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getDictionary } from '@/app/(frontend)/lib/i18n/dictionaries'

const replaceMock = vi.fn()
const refreshMock = vi.fn()
const redirectMock = vi.fn()
const getCurrentFrontendUserMock = vi.fn()
const authExperienceMock = vi.fn()

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
  useRouter: () => ({
    refresh: refreshMock,
    replace: replaceMock,
  }),
}))

vi.mock('next/headers.js', () => ({
  cookies: async () => ({
    get: (): undefined => undefined,
  }),
  headers: async () => new Headers([['accept-language', 'en-US']]),
}))

vi.mock('@/lib/frontendSession', () => ({
  getCurrentFrontendUser: getCurrentFrontendUserMock,
}))

vi.mock('@/components/auth/AuthExperience', () => ({
  default: (props: {
    flashMessage?: string | null
    initialMode: string
    nextPath: string
    t: ReturnType<typeof getDictionary>
  }): React.JSX.Element => {
    authExperienceMock(props)
    return (
      <div data-testid="auth-experience">
        <span>{props.initialMode}</span>
        <span>{props.nextPath}</span>
        <span>{props.flashMessage ?? 'no-flash'}</span>
      </div>
    )
  },
}))

const dictionary = getDictionary('en-US')

describe('Frontend auth verification pages', () => {
  beforeEach(() => {
    replaceMock.mockReset()
    refreshMock.mockReset()
    redirectMock.mockReset()
    getCurrentFrontendUserMock.mockReset()
    authExperienceMock.mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('submits login against the frontend auth API and routes recovery links through safe next paths', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { default: LoginForm } = await import('@/components/auth/LoginForm')

    const { container } = render(
      <LoginForm
        nextPath="/editor"
        registerHref="/register?next=%2Feditor"
        t={dictionary}
      />,
    )

    fireEvent.change(screen.getByLabelText(dictionary.auth.emailLabel), {
      target: { value: '  User@Example.com ' },
    })
    fireEvent.change(container.querySelector('input[type="password"]')!, {
      target: { value: 'secret-pass' },
    })
    fireEvent.submit(screen.getByRole('button', { name: dictionary.auth.loginButton }).closest('form')!)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/auth/login',
        expect.objectContaining({
          body: JSON.stringify({
            email: 'user@example.com',
            next: '/editor',
            password: 'secret-pass',
          }),
          method: 'POST',
        }),
      )
    })

    expect(replaceMock).toHaveBeenCalledWith('/editor')
    expect(refreshMock).toHaveBeenCalled()
    expect(screen.getByRole('link', { name: dictionary.auth.forgotPassword }).getAttribute('href')).toBe(
      '/forgot-password?next=%2Feditor',
    )
    expect(screen.queryByRole('link', { name: dictionary.auth.resendVerification })).toBeNull()
  })

  it('registers through the frontend auth API and redirects to verification pending with normalized email', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { default: RegisterForm } = await import('@/components/auth/RegisterForm')

    const { container } = render(
      <RegisterForm
        nextPath="/user/me"
        loginHref="/login"
        t={dictionary}
      />,
    )

    const inputs = container.querySelectorAll('input')
    fireEvent.change(inputs[0], { target: { value: '  Campus Writer  ' } })
    fireEvent.change(inputs[1], { target: { value: ' Writer@Example.com ' } })
    fireEvent.change(inputs[2], {
      target: { value: 'secret-pass' },
    })
    fireEvent.change(inputs[3], {
      target: { value: 'secret-pass' },
    })
    fireEvent.submit(screen.getByRole('button', { name: dictionary.auth.registerButton }).closest('form')!)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/auth/register',
        expect.objectContaining({
          body: JSON.stringify({
            displayName: 'Campus Writer',
            email: 'writer@example.com',
            next: '/user/me',
            password: 'secret-pass',
          }),
          method: 'POST',
        }),
      )
    })

    expect(replaceMock).toHaveBeenCalledWith(
      '/verify/pending?email=writer%40example.com&next=%2Fuser%2Fme',
    )
    expect(refreshMock).toHaveBeenCalled()
    expect(screen.queryByRole('link', { name: dictionary.auth.resendVerification })).toBeNull()
  })

  it('redirects failed unverified login attempts to the verification pending page', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        code: 'email_verification_required',
        location: '/verify/pending?email=user%40example.com&next=%2Feditor',
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { default: LoginForm } = await import('@/components/auth/LoginForm')

    const { container } = render(
      <LoginForm
        nextPath="/editor"
        registerHref="/register?next=%2Feditor"
        t={dictionary}
      />,
    )

    fireEvent.change(screen.getByLabelText(dictionary.auth.emailLabel), {
      target: { value: 'user@example.com' },
    })
    fireEvent.change(container.querySelector('input[type="password"]')!, {
      target: { value: 'secret-pass' },
    })
    fireEvent.submit(screen.getByRole('button', { name: dictionary.auth.loginButton }).closest('form')!)

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(
        '/verify/pending?email=user%40example.com&next=%2Feditor',
      )
    })
  })

  it('toggles password visibility in login and register forms', async () => {
    const { default: LoginForm } = await import('@/components/auth/LoginForm')
    const { default: RegisterForm } = await import('@/components/auth/RegisterForm')

    const loginRender = render(
      <LoginForm
        nextPath="/editor"
        registerHref="/register?next=%2Feditor"
        t={dictionary}
      />,
    )

    const loginPassword = loginRender.container.querySelector(
      'input[autocomplete="current-password"]',
    ) as HTMLInputElement
    expect(loginPassword.type).toBe('password')
    fireEvent.click(screen.getByRole('button', { name: dictionary.auth.showPassword }))
    expect(loginPassword.type).toBe('text')
    fireEvent.click(screen.getByRole('button', { name: dictionary.auth.hidePassword }))
    expect(loginPassword.type).toBe('password')

    loginRender.unmount()

    const registerRender = render(
      <RegisterForm
        nextPath="/user/me"
        loginHref="/login"
        t={dictionary}
      />,
    )

    const registerPasswords = registerRender.container.querySelectorAll(
      'input[autocomplete="new-password"]',
    ) as NodeListOf<HTMLInputElement>
    expect(registerPasswords[0]?.type).toBe('password')
    expect(registerPasswords[1]?.type).toBe('password')

    const showButtons = screen.getAllByRole('button', { name: dictionary.auth.showPassword })
    fireEvent.click(showButtons[0]!)
    fireEvent.click(showButtons[1]!)

    expect(registerPasswords[0]?.type).toBe('text')
    expect(registerPasswords[1]?.type).toBe('text')
  })

  it('renders the pending verification page with masked email, resend status, and a sanitized next target', async () => {
    const { default: VerificationPendingPage } = await import('@/app/(frontend)/verify/pending/page')

    const view = await VerificationPendingPage({
      searchParams: Promise.resolve({
        email: 'Student@Example.com',
        error: '  Delivery failed  ',
        next: '/api/private',
        status: 'resent',
      }),
    })

    render(view)

    expect(screen.getByText(dictionary.auth.verifyPendingTitle)).toBeTruthy()
    expect(screen.getByText('st***@example.com')).toBeTruthy()
    expect(screen.getByText(dictionary.auth.resendVerificationSuccess)).toBeTruthy()
    expect(screen.getByText('Delivery failed')).toBeTruthy()
    expect(screen.getByDisplayValue('student@example.com').getAttribute('name')).toBe('email')
    expect(screen.getByRole('link', { name: dictionary.auth.goLogin }).getAttribute('href')).toBe(
      '/login?next=%2Fuser%2Fme',
    )
    expect(
      screen.getByRole('button', { name: `${dictionary.auth.resendVerificationCooldownPrefix} 60s` }).hasAttribute('disabled'),
    ).toBe(true)
  })

  it('renders verification results with resend recovery only for failed attempts', async () => {
    const { default: VerificationPage } = await import('@/app/(frontend)/verify/page')

    const successView = await VerificationPage({
      searchParams: Promise.resolve({
        email: 'reader@example.com',
        next: '/editor',
        status: 'success',
      }),
    })
    const successRender = render(successView)

    expect(screen.getByText(dictionary.auth.verifySuccessTitle)).toBeTruthy()
    expect(screen.getByRole('link', { name: dictionary.auth.verifyLoginButton }).getAttribute('href')).toBe(
      '/login?next=%2Feditor',
    )
    expect(screen.queryByRole('link', { name: dictionary.auth.resendVerification })).toBeNull()

    successRender.unmount()

    const errorView = await VerificationPage({
      searchParams: Promise.resolve({
        email: 'reader@example.com',
        next: '/editor',
        status: 'expired',
      }),
    })

    render(errorView)

    expect(screen.getByText(dictionary.auth.verifyErrorTitle)).toBeTruthy()
    expect(screen.getByRole('link', { name: dictionary.auth.resendVerification }).getAttribute('href')).toBe(
      '/verify/pending?email=reader%40example.com&next=%2Feditor',
    )
  })

  it('renders forgot-password and reset-password forms against the auth endpoints and handles missing reset tokens', async () => {
    const [{ default: ForgotPasswordPage }, { default: ResetPasswordPage }] = await Promise.all([
      import('@/app/(frontend)/forgot-password/page'),
      import('@/app/(frontend)/reset-password/page'),
    ])

    const forgotView = await ForgotPasswordPage({
      searchParams: Promise.resolve({
        email: ' Reset@Example.com ',
        error: '  Too many requests  ',
        next: '/editor',
        status: 'sent',
      }),
    })
    const forgotRender = render(forgotView)

    expect(screen.getByText(dictionary.auth.forgotPasswordSuccess)).toBeTruthy()
    expect(screen.getByText('Too many requests')).toBeTruthy()
    expect(screen.getByDisplayValue('reset@example.com').getAttribute('name')).toBe('email')
    expect(
      screen.getByRole('button', { name: `${dictionary.auth.emailActionCooldownPrefix} 60s` }).hasAttribute('disabled'),
    ).toBe(true)

    forgotRender.unmount()

    const resetWithTokenView = await ResetPasswordPage({
      searchParams: Promise.resolve({
        next: '/editor',
        token: 'reset-token',
      }),
    })
    const resetWithTokenRender = render(resetWithTokenView)

    expect(screen.getByDisplayValue('/editor').getAttribute('name')).toBe('next')
    expect(screen.getByDisplayValue('reset-token').getAttribute('name')).toBe('token')
    expect(screen.getByLabelText(dictionary.auth.confirmPasswordLabel).getAttribute('name')).toBe('passwordConfirm')
    expect(
      screen.getByRole('button', { name: dictionary.auth.resetPasswordButton }).closest('form')?.getAttribute('action'),
    ).toBe('/api/auth/reset-password')

    const resetPasswords = resetWithTokenRender.container.querySelectorAll(
      'input[type="password"][autocomplete="new-password"]',
    ) as NodeListOf<HTMLInputElement>
    expect(resetPasswords).toHaveLength(2)
    const resetShowButtons = screen.getAllByRole('button', { name: dictionary.auth.showPassword })
    fireEvent.click(resetShowButtons[0]!)
    fireEvent.click(resetShowButtons[1]!)
    expect(
      resetWithTokenRender.container.querySelectorAll('input[type="text"][autocomplete="new-password"]'),
    ).toHaveLength(2)

    resetWithTokenRender.unmount()

    const resetWithoutTokenView = await ResetPasswordPage({
      searchParams: Promise.resolve({
        error: '  Invalid token  ',
      }),
    })

    render(resetWithoutTokenView)

    expect(screen.getByText('Invalid token')).toBeTruthy()
    expect(screen.getByText(dictionary.auth.resetPasswordTokenError)).toBeTruthy()
    expect(screen.queryByRole('button', { name: dictionary.auth.resetPasswordButton })).toBeNull()
  })

  it('starts a 60 second resend countdown after a successful client-side resend submission', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ code: 'verification_resent' }),
      headers: new Headers(),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { default: VerificationPendingForm } = await import('@/components/auth/VerificationPendingForm')

    render(
      <VerificationPendingForm
        cooldownSeconds={0}
        email="reader@example.com"
        error=""
        nextPath="/editor"
        status="idle"
        t={dictionary}
      />,
    )

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: dictionary.auth.resendVerificationButton }))
      await Promise.resolve()
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/resend-verification',
      expect.objectContaining({ method: 'POST' }),
    )

    expect(
      screen
        .getByRole('button', { name: `${dictionary.auth.resendVerificationCooldownPrefix} 60s` })
        .hasAttribute('disabled'),
    ).toBe(true)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(
      screen
        .getByRole('button', { name: `${dictionary.auth.resendVerificationCooldownPrefix} 59s` })
        .hasAttribute('disabled'),
    ).toBe(true)
  })

  it('uses retry-after from failed email action responses to disable the button and show a countdown', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ code: 'rate_limited', message: 'Too many attempts. Please try again later.' }),
      headers: new Headers([['retry-after', '42']]),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { default: ForgotPasswordForm } = await import('@/components/auth/ForgotPasswordForm')

    render(
      <ForgotPasswordForm
        cooldownSeconds={0}
        email="reader@example.com"
        error=""
        nextPath="/editor"
        status="idle"
        t={dictionary}
      />,
    )

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: dictionary.auth.forgotPasswordButton }))
      await Promise.resolve()
    })

    expect(screen.getByText('Too many attempts. Please try again later.')).toBeTruthy()

    expect(
      screen
        .getByRole('button', { name: `${dictionary.auth.emailActionCooldownPrefix} 42s` })
        .hasAttribute('disabled'),
    ).toBe(true)
  })

  it('renders the login page through auth experience and redirects authenticated sessions away at runtime', async () => {
    const { LoginPageContent } = await import('@/app/(frontend)/login/LoginPageContent')

    getCurrentFrontendUserMock.mockResolvedValueOnce(null)

    render(await LoginPageContent({
      searchParams: Promise.resolve({
        next: '/editor',
        status: 'password-reset',
      }),
    }))

    await waitFor(() => {
      expect(authExperienceMock).toHaveBeenCalledWith(
        expect.objectContaining({
          flashMessage: dictionary.auth.resetPasswordSuccess,
          initialMode: 'login',
          nextPath: '/editor',
        }),
      )
    })

    cleanup()
    authExperienceMock.mockClear()
    getCurrentFrontendUserMock.mockResolvedValueOnce({
      email: 'reader@example.com',
      id: 1,
    })

    await LoginPageContent({
      searchParams: Promise.resolve({
        next: '/editor',
      }),
    })

    await waitFor(() => {
      expect(redirectMock).toHaveBeenCalledWith('/editor')
    })
  })
})
