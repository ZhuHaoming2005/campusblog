import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

describe('clean-build-artifacts', () => {
  const tempDirs: string[] = []

  afterEach(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { force: true, recursive: true })
    }
  })

  it('removes .next and .open-next directories without touching sibling files', async () => {
    const { cleanBuildArtifacts } = await import('../../../scripts/clean-build-artifacts.mjs')
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'campusblog-clean-'))
    tempDirs.push(root)

    fs.mkdirSync(path.join(root, '.next'))
    fs.mkdirSync(path.join(root, '.open-next'))
    fs.writeFileSync(path.join(root, 'keep.txt'), 'keep')

    cleanBuildArtifacts(root)

    expect(fs.existsSync(path.join(root, '.next'))).toBe(false)
    expect(fs.existsSync(path.join(root, '.open-next'))).toBe(false)
    expect(fs.readFileSync(path.join(root, 'keep.txt'), 'utf8')).toBe('keep')
  })
})
