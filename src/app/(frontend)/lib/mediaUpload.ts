export type UploadedMedia = {
  alt?: string | null
  id: number | string
  url?: string | null
}

function extractMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback

  if ('errors' in payload && Array.isArray(payload.errors) && payload.errors.length > 0) {
    const firstError = payload.errors[0]
    if (firstError && typeof firstError === 'object' && 'message' in firstError) {
      const message = firstError.message
      if (typeof message === 'string' && message.trim()) return message
    }
  }

  if ('message' in payload && typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message
  }

  return fallback
}

export async function uploadMediaFile(args: {
  alt: string
  file: File
  fallbackError: string
}): Promise<UploadedMedia> {
  const formData = new FormData()
  formData.append('_payload', JSON.stringify({ alt: args.alt }))
  formData.append('alt', args.alt)
  formData.append('file', args.file)

  const response = await fetch('/api/media', {
    body: formData,
    method: 'POST',
  })

  const payload = (await response.json().catch((): null => null)) as
    | {
        alt?: string | null
        doc?: {
          alt?: string | null
          id?: number | string
          url?: string | null
        }
        id?: number | string
        url?: string | null
      }
    | null

  if (!response.ok) {
    throw new Error(extractMessage(payload, args.fallbackError))
  }

  const id = payload?.id ?? payload?.doc?.id
  if (typeof id !== 'number' && typeof id !== 'string') {
    throw new Error(args.fallbackError)
  }

  return {
    alt: payload?.alt ?? payload?.doc?.alt ?? args.alt,
    id,
    url: payload?.url ?? payload?.doc?.url,
  }
}
