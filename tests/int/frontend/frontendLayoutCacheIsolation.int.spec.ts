import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

describe('frontend route layout cache isolation', () => {
  it('keeps CMS navigation cache reads out of the root frontend layout', () => {
    const rootLayout = fs.readFileSync(
      path.resolve(process.cwd(), 'src/app/(frontend)/layout.tsx'),
      'utf8',
    )

    expect(rootLayout).not.toContain('getActiveSchools')
    expect(rootLayout).not.toContain('FrontendChrome')
  })

  it('keeps auth routes outside the CMS-backed site chrome route group', () => {
    const authLoginPage = path.resolve(process.cwd(), 'src/app/(frontend)/(auth)/login/page.tsx')
    const siteLayout = fs.readFileSync(
      path.resolve(process.cwd(), 'src/app/(frontend)/(site)/layout.tsx'),
      'utf8',
    )

    expect(fs.existsSync(authLoginPage)).toBe(true)
    expect(siteLayout).toContain('getActiveSchools')
    expect(siteLayout).toContain('FrontendChrome')
  })
})
