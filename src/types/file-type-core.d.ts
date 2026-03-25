declare module 'file-type/core' {
  export type FileTypeResult =
    | {
        readonly ext: string
        readonly mime: string
      }
    | undefined

  export class FileTypeParser {}

  export function fileTypeFromBlob(blob: Blob): Promise<FileTypeResult>
  export function fileTypeFromBuffer(buffer: Uint8Array | ArrayBuffer): Promise<FileTypeResult>
  export function fileTypeFromStream(stream: ReadableStream<Uint8Array>): Promise<FileTypeResult>
  export function fileTypeFromTokenizer(tokenizer: unknown): Promise<FileTypeResult>

  export const reasonableDetectionSizeInBytes: number
  export const supportedExtensions: ReadonlySet<string>
  export const supportedMimeTypes: ReadonlySet<string>
}
