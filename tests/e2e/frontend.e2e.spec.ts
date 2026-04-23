import { expect, test } from '@playwright/test'

import {
  cleanupFrontendUser,
  createFrontendPasswordResetToken,
  createFrontendUser,
  deleteFrontendUserByEmail,
  getFrontendUserAuthState,
  seedFrontendUser,
  testFrontendUser,
  verifyFrontendUser,
} from '../helpers/seedFrontendUser'

const logoutLabel = /Logout|退出登录/

test.describe('Frontend auth', () => {
  test.beforeAll(async () => {
    await seedFrontendUser()
  })

  test.afterAll(async () => {
    await cleanupFrontendUser()
  })

  test('redirects protected routes to login and returns to the user center after sign in', async ({
    page,
  }) => {
    await page.goto('http://localhost:3000/user/me')

    await expect(page).toHaveURL(/\/login\?next=%2Fuser%2Fme$/)
    await page.goto('http://localhost:3000/login?next=%2Fuser%2Fme')

    const loginPanel = page.locator('div[aria-hidden="false"]').filter({ has: page.locator('form') }).first()

    await loginPanel.locator('input[type="email"]').fill(testFrontendUser.email)
    await loginPanel.locator('input[type="password"]').fill(testFrontendUser.password)
    const loginResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/auth/login') && response.request().method() === 'POST',
    )
    await loginPanel.locator('form button[type="submit"]').click()
    expect((await loginResponsePromise).status()).toBe(200)

    await expect(page).toHaveURL('http://localhost:3000/user/me', { timeout: 15000 })
    await expect(page.getByTestId('write-article-button')).toBeVisible()
    await expect(page.getByText(testFrontendUser.displayName)).toBeVisible()
  })

  test('clears the frontend session on logout', async ({ page }) => {
    await page.goto('http://localhost:3000/login')

    const loginPanel = page.locator('div[aria-hidden="false"]').filter({ has: page.locator('form') }).first()

    await loginPanel.locator('input[type="email"]').fill(testFrontendUser.email)
    await loginPanel.locator('input[type="password"]').fill(testFrontendUser.password)
    const loginResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/auth/login') && response.request().method() === 'POST',
    )
    await loginPanel.locator('form button[type="submit"]').click()
    expect((await loginResponsePromise).status()).toBe(200)

    await expect(page).toHaveURL('http://localhost:3000/user/me', { timeout: 15000 })

    const logoutResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/auth/logout') && response.request().method() === 'POST',
    )
    await page.getByRole('button', { name: logoutLabel }).click()
    expect((await logoutResponsePromise).status()).toBe(200)

    await expect(page).toHaveURL('http://localhost:3000/', { timeout: 15000 })

    await page.goto('http://localhost:3000/user/me')

    await expect(page).toHaveURL(/\/login\?next=%2Fuser%2Fme$/)
  })

  test('registers a new frontend account and lands on the verification pending screen', async ({ page }) => {
    const nonce = Date.now().toString(36)
    const newUser = {
      displayName: `Register User ${nonce}`,
      email: `register-${nonce}@campusblog.test`,
      password: `Register-${nonce}-Pass1`,
    }

    await deleteFrontendUserByEmail(newUser.email)
    await page.goto('http://localhost:3000/register?next=%2Fuser%2Fme')

    const registerPanel = page
      .locator('div[aria-hidden="false"]')
      .filter({ has: page.locator('form') })
      .first()

    await registerPanel.locator('input[autocomplete="nickname"]').fill(newUser.displayName)
    await registerPanel.locator('input[type="email"]').fill(newUser.email)
    await registerPanel.locator('input[autocomplete="new-password"]').nth(0).fill(newUser.password)
    await registerPanel.locator('input[autocomplete="new-password"]').nth(1).fill(newUser.password)
    const registerResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/auth/register') && response.request().method() === 'POST',
    )
    await registerPanel.locator('form button[type="submit"]').click()
    expect((await registerResponsePromise).status()).toBe(201)

    await expect(page).toHaveURL(/\/verify\/pending/, { timeout: 15000 })
    await expect(page.getByText(/check your inbox|请检查你的邮箱/i)).toBeVisible()

    await deleteFrontendUserByEmail(newUser.email)
  })

  test('redirects authenticated users away from the login page', async ({ page }) => {
    await page.goto('http://localhost:3000/login')

    const loginPanel = page.locator('div[aria-hidden="false"]').filter({ has: page.locator('form') }).first()

    await loginPanel.locator('input[type="email"]').fill(testFrontendUser.email)
    await loginPanel.locator('input[type="password"]').fill(testFrontendUser.password)
    await loginPanel.locator('form button[type="submit"]').click()

    await expect(page).toHaveURL('http://localhost:3000/user/me')

    await page.goto('http://localhost:3000/login')

    await expect(page).toHaveURL('http://localhost:3000/user/me')
    await expect(page.getByTestId('write-article-button')).toBeVisible()
  })

  test('resends verification emails without dropping the protected next destination', async ({
    page,
  }) => {
    const nonce = Date.now().toString(36)
    const unverifiedUser = {
      displayName: `Pending Verify ${nonce}`,
      email: `pending-${nonce}@campusblog.test`,
      password: `Pending-${nonce}-Pass1`,
    }

    await createFrontendUser(unverifiedUser, {
      verificationToken: `verify-${nonce}`,
      verified: false,
    })

    const resendResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/auth/resend-verification') &&
        response.request().method() === 'POST',
    )

    await page.goto(
      `http://localhost:3000/verify/pending?email=${encodeURIComponent(unverifiedUser.email)}&next=%2Feditor`,
    )
    expect((await resendResponsePromise).status()).toBe(200)

    await expect(page.locator('input[name="next"]')).toHaveValue('/editor')
    await expect(page.locator('form button[type="submit"]')).toBeDisabled()

    await deleteFrontendUserByEmail(unverifiedUser.email)
  })

  test('blocks unverified users from completing login and redirects them to verification pending', async ({
    page,
  }) => {
    const nonce = Date.now().toString(36)
    const unverifiedUser = {
      displayName: `Pending Login ${nonce}`,
      email: `pending-login-${nonce}@campusblog.test`,
      password: `PendingLogin-${nonce}-Pass1`,
    }

    await createFrontendUser(unverifiedUser, {
      verificationToken: `verify-login-${nonce}`,
      verified: false,
    })

    await page.goto('http://localhost:3000/login?next=%2Feditor')

    const loginPanel = page
      .locator('div[aria-hidden="false"]')
      .filter({ has: page.locator('form') })
      .first()

    await loginPanel.locator('input[type="email"]').fill(unverifiedUser.email)
    await loginPanel.locator('input[type="password"]').fill(unverifiedUser.password)
    const loginResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/auth/login') && response.request().method() === 'POST',
    )
    await loginPanel.locator('form button[type="submit"]').click()
    expect((await loginResponsePromise).status()).toBe(403)

    await expect(page).toHaveURL(
      new RegExp(
        `/verify/pending\\?email=${encodeURIComponent(unverifiedUser.email)}&next=%2Feditor`,
      ),
      { timeout: 15000 },
    )
    await expect(page).not.toHaveURL('http://localhost:3000/user/me')
    await expect(page.locator('input[name="next"]')).toHaveValue('/editor')
    await expect(page.locator('form[action="/api/auth/resend-verification"]')).toBeVisible()

    await deleteFrontendUserByEmail(unverifiedUser.email)
  })

  test('shows verification completion and keeps the destination through login', async ({ page }) => {
    const nonce = Date.now().toString(36)
    const verifiedUser = {
      displayName: `Verify Flow ${nonce}`,
      email: `verify-${nonce}@campusblog.test`,
      password: `Verify-${nonce}-Pass1`,
    }

    await createFrontendUser(verifiedUser, { verified: false })
    await verifyFrontendUser(verifiedUser.email)

    await page.goto('http://localhost:3000/verify?status=success&next=%2Feditor')

    await expect(page).toHaveURL(/\/verify\?status=success&next=%2Feditor$/)
    await page.getByRole('link', { name: /sign in|登录/i }).click()

    await expect(page).toHaveURL('http://localhost:3000/login?next=%2Feditor')

    await deleteFrontendUserByEmail(verifiedUser.email)
  })

  test('handles forgot-password and reset-password browser flows end to end', async ({ page }) => {
    const nonce = Date.now().toString(36)
    const recoveryUser = {
      displayName: `Recovery Flow ${nonce}`,
      email: `recovery-${nonce}@campusblog.test`,
      password: `Recovery-${nonce}-Pass1`,
    }
    const newPassword = `Recovered-${nonce}-Pass2`

    await createFrontendUser(recoveryUser, { verified: true })

    await page.goto('http://localhost:3000/forgot-password?next=%2Fuser%2Fme')
    await page.getByLabel(/email|邮箱/i).fill(recoveryUser.email)
    await page.locator('form button[type="submit"]').click()

    await expect(page).toHaveURL(
      new RegExp(`/forgot-password\\?email=${encodeURIComponent(recoveryUser.email)}.*status=sent`),
    )
    await expect(page.locator('input[name="next"]')).toHaveValue('/user/me')

    const resetToken = await createFrontendPasswordResetToken(recoveryUser.email)

    await page.goto(
      `http://localhost:3000/reset-password?token=${encodeURIComponent(resetToken)}&next=%2Fuser%2Fme`,
    )
    await page.getByLabel(/^password$|密码$/i).fill(newPassword)
    await page.getByLabel(/confirm password|确认密码/i).fill(newPassword)
    await page.locator('form button[type="submit"]').click()

    await expect(page).toHaveURL('http://localhost:3000/login?next=%2Fuser%2Fme&status=password-reset')

    await deleteFrontendUserByEmail(recoveryUser.email)
  })
})
