import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

function readSource(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
}

describe('school search select usage', () => {
  it('uses the shared searchable school selector for all frontend school dropdowns', () => {
    const userProfileEditor = readSource(
      'src/app/(frontend)/components/user/UserProfileEditor.tsx',
    )
    const editorForm = readSource('src/app/(frontend)/components/editor/EditorForm.tsx')

    expect(userProfileEditor).toContain("import SchoolSearchSelect from '@/components/school/SchoolSearchSelect'")
    expect(editorForm).toContain("import SchoolSearchSelect from '@/components/school/SchoolSearchSelect'")
    expect(userProfileEditor).not.toContain('<select')
    expect(editorForm).not.toContain('<Select value={schoolId} onValueChange={handleSchoolChange}>')
  })
})
