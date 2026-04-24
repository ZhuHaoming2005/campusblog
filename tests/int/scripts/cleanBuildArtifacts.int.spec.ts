import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
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

  it('does not clean the current working directory when imported', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'campusblog-clean-import-'))
    const originalCwd = process.cwd()
    tempDirs.push(root)

    fs.mkdirSync(path.join(root, '.next'))
    fs.mkdirSync(path.join(root, '.open-next'))

    try {
      process.chdir(root)
      const scriptPath = path.resolve(originalCwd, 'scripts/clean-build-artifacts.mjs')
      await import(`${pathToFileURL(scriptPath).href}?import-side-effect-test=${Date.now()}`)
    } finally {
      process.chdir(originalCwd)
    }

    expect(fs.existsSync(path.join(root, '.next'))).toBe(true)
    expect(fs.existsSync(path.join(root, '.open-next'))).toBe(true)
  })
})
