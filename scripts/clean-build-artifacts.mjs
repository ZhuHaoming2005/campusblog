import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export function cleanBuildArtifacts(rootDir = process.cwd()) {
  for (const relativePath of ['.next', '.open-next']) {
    fs.rmSync(path.join(rootDir, relativePath), {
      force: true,
      recursive: true,
    })
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  cleanBuildArtifacts()
}
