import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('User center primary CTAs', () => {
  it('reuses the shared primary action button for the write-article CTA and reserves top space for the floating locale tools', () => {
    const source = readFileSync(
      path.resolve(process.cwd(), 'src/app/(frontend)/(site)/user/me/UserCenterPageContent.tsx'),
      'utf8',
    )

    expect(source).toContain("import { PrimaryActionButton } from '@/components/ui/primary-action-button'")
    expect(source).toContain('data-testid="write-article-button"')
    expect(source).toContain('<PrimaryActionButton')
    expect(source).toContain('pt-[calc(var(--floating-toolbar-top)+var(--floating-toolbar-height)+1rem)]')
  })

  it('lists hidden posts with preview and delete actions in the dashboard source', () => {
    const source = readFileSync(
      path.resolve(process.cwd(), 'src/app/(frontend)/(site)/user/me/UserCenterPageContent.tsx'),
      'utf8',
    )

    expect(source).toContain("status: { equals: 'hidden' }")
    expect(source).toContain('{t.userCenter.hiddenTitle}')
    expect(source).toContain('emptyLabel={t.userCenter.emptyHidden}')
    expect(source).toContain('hrefLabel={t.userCenter.previewHiddenPost}')
    expect(source).toContain('posts={hiddenPostsResult.docs}')
  })
})
