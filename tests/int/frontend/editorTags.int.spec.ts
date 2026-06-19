import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function readFrontendSource(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
}

describe('editor tag entry', () => {
  it('does not fetch or render the global tag list in the publish editor', () => {
    const pageSource = readFrontendSource('src/app/(frontend)/(site)/editor/page.tsx')
    const formSource = readFrontendSource('src/app/(frontend)/components/editor/EditorForm.tsx')

    expect(pageSource).not.toContain("collection: 'tags'")
    expect(pageSource).not.toContain('tags={tags}')
    expect(formSource).not.toContain('tags.map((tag)')
    expect(formSource).not.toContain('handleTagToggle')
    expect(formSource).not.toContain('selectedTags')
    expect(formSource).not.toContain('t.editor.tagsPlaceholder')
  })

  it('keeps draft tags as custom tag names so the API can globally dedupe them', () => {
    const pageSource = readFrontendSource('src/app/(frontend)/(site)/editor/page.tsx')
    const formSource = readFrontendSource('src/app/(frontend)/components/editor/EditorForm.tsx')

    expect(pageSource).toContain('tagNames:')
    expect(formSource).toContain('tagNames: string[]')
    expect(formSource).toContain('useState<string[]>(initialPost?.tagNames ?? [])')
    expect(formSource).toContain('customTags.map((tagName) => ({ name: tagName }))')
  })
})
