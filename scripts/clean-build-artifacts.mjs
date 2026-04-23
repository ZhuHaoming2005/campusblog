import fs from 'node:fs'
import path from 'node:path'

export function cleanBuildArtifacts(rootDir = process.cwd()) {
  for (const relativePath of ['.next', '.open-next']) {
    fs.rmSync(path.join(rootDir, relativePath), {
      force: true,
      recursive: true,
    })
  }
}

cleanBuildArtifacts()
