import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Post detail layout', () => {
  it('groups post metadata and interaction buttons together opposite the author card', () => {
    const source = readFileSync(
      path.resolve(process.cwd(), 'src/app/(frontend)/(site)/post/[slug]/page.tsx'),
      'utf8',
    )

    expect(source).toContain('data-testid="post-detail-meta-actions"')
    expect(source).toContain('className="flex flex-col gap-2 lg:items-end"')
    expect(source).toContain('data-testid="post-detail-metadata"')
    expect(source).toContain('<PostInteractionBar')
    expect(source).not.toContain('className="mt-5"')
  })
})
