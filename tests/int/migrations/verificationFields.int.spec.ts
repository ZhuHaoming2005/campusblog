import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

describe('verification fields migration', () => {
  it('marks existing users as verified when verification is enabled', () => {
    const migrationPath = path.resolve(
      process.cwd(),
      'src/migrations/20260423_101813_verification_fields.ts',
    )
    const migrationSource = fs.readFileSync(migrationPath, 'utf8')

    expect(migrationSource).toContain(
      'UPDATE \\`users\\` SET \\`_verified\\` = 1 WHERE \\`_verified\\` IS NULL;',
    )
  })
})
