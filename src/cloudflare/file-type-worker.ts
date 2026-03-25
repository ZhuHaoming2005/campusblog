import {
  FileTypeParser,
  fileTypeFromBlob,
  fileTypeFromBuffer,
  fileTypeFromStream,
  fileTypeFromTokenizer,
  reasonableDetectionSizeInBytes,
  supportedExtensions,
  supportedMimeTypes,
} from 'file-type/core.js'

export {
  FileTypeParser,
  fileTypeFromBlob,
  fileTypeFromBuffer,
  fileTypeFromStream,
  fileTypeFromTokenizer,
  reasonableDetectionSizeInBytes,
  supportedExtensions,
  supportedMimeTypes,
}

type FileTypeResult = Awaited<ReturnType<typeof fileTypeFromBuffer>>

// Wrangler resolves `file-type` to `core.js` for Worker bundles, which omits
// the Node-only `fileTypeFromFile` export that Payload statically imports.
export async function fileTypeFromFile(path: string): Promise<FileTypeResult> {
  try {
    const { readFile } = await import('node:fs/promises')
    const data = await readFile(path)
    return await fileTypeFromBuffer(data)
  } catch {
    return undefined
  }
}
