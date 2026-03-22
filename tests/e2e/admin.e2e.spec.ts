import { test, expect, Page } from '@playwright/test'
import { login } from '../helpers/login'
import { seedTestAdmin, cleanupTestAdmin, testAdmin } from '../helpers/seedAdmin'

test.describe('Admin Panel', () => {
  let page: Page

  test.beforeAll(async ({ browser }, testInfo) => {
    await seedTestAdmin()

    const context = await browser.newContext()
    page = await context.newPage()

    await login({ page, user: testAdmin })
  })

  test.afterAll(async () => {
    await cleanupTestAdmin()
  })

  test('can navigate to dashboard', async () => {
    await page.goto('http://localhost:3000/admin')
    await expect(page).toHaveURL('http://localhost:3000/admin')
    const dashboardArtifact = page.locator('span[title="Dashboard"]').first()
    await expect(dashboardArtifact).toBeVisible()
  })

  test('can navigate to list view', async () => {
    await page.goto('http://localhost:3000/admin/collections/admins')
    await expect(page).toHaveURL('http://localhost:3000/admin/collections/admins')
    const listViewArtifact = page.locator('h1', { hasText: 'Admins' }).first()
    await expect(listViewArtifact).toBeVisible()
  })

  test('can navigate to edit view', async () => {
    await page.goto('http://localhost:3000/admin/collections/admins/create')
    await expect(page).toHaveURL(/\/admin\/collections\/admins\/[a-zA-Z0-9-_]+/)
    const editViewArtifact = page.locator('input[name="email"]')
    await expect(editViewArtifact).toBeVisible()
  })
})
