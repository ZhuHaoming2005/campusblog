import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Post detail page hidden preview wiring', () => {
  it('loads the current frontend user for page content while leaving metadata on the public query', () => {
    const source = readFileSync(
      path.resolve(process.cwd(), 'src/app/(frontend)/(site)/post/[slug]/page.tsx'),
      'utf8',
    )

    expect(source).toContain("import { getCurrentFrontendUser } from '@/lib/frontendSession'")
    expect(source).toContain('await connection()')
    expect(source).toContain('const currentUser = await getCurrentFrontendUser(headers)')
    expect(source).toContain('const post = await getVisiblePostBySlug(slug, currentUser)')
    expect(source).toContain('const post = await getPublishedPostBySlug(slug)')
  })
})
