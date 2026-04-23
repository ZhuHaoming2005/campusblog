type KVLike = {
  put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<unknown>
}

type LoggerLike = {
  info?: (entry: object) => void
  warn?: (entry: object) => void
}

export type EmailDebugRecord = {
  destinationURL: string | null
  recipient: string
  status: 'delivered' | 'skipped'
  subject: string
  templateType: string
}

const REDACTED = '[redacted]'

function maskToken(value: string): string {
  if (!value) return REDACTED
  if (value.length <= 8) return REDACTED
  return `${value.slice(0, 4)}...[redacted]`
}

export function redactDebugURL(value: string | null | undefined): string | null {
  if (!value) return null

  try {
    const url = new URL(value)

    for (const key of ['token', 'verificationToken']) {
      const token = url.searchParams.get(key)
      if (token) {
        url.searchParams.set(key, maskToken(token))
      }
    }

    return decodeURIComponent(url.toString())
  } catch {
    return '[invalid-url]'
  }
}

export function inferEmailTemplateType(subject: string): string {
  const normalized = subject.toLowerCase()

  if (normalized.includes('reset')) return 'reset-password'
  if (normalized.includes('verify')) return 'verify-email'

  return 'transactional-email'
}

export function extractFirstURL(content: string | null | undefined): string | null {
  if (!content) return null

  const match = content.match(/https?:\/\/[^\s"'<>]+/i)
  return match?.[0] ?? null
}

export function buildEmailDebugRecord(payload: {
  html?: string | null
  redactDestinationURL?: boolean
  recipient: string
  status: EmailDebugRecord['status']
  subject: string
  text?: string | null
}): EmailDebugRecord {
  const destinationURL = extractFirstURL(payload.html) ?? extractFirstURL(payload.text)

  return {
    destinationURL:
      payload.redactDestinationURL === false ? destinationURL : redactDebugURL(destinationURL),
    recipient: payload.recipient,
    status: payload.status,
    subject: payload.subject,
    templateType: inferEmailTemplateType(payload.subject),
  }
}

export async function writeEmailDebugRecord(args: {
  kv?: KVLike
  logger?: LoggerLike
  payload: {
    html?: string | null
    redactDestinationURL?: boolean
    recipient: string
    status: EmailDebugRecord['status']
    subject: string
    text?: string | null
  }
}) {
  const record = buildEmailDebugRecord(args.payload)
  const serialized = JSON.stringify(record)

  args.logger?.info?.({
    authEmail: record,
    msg: 'Auth email processed',
  })

  if (args.kv) {
    await args.kv.put(`auth:debug-email:${Date.now().toString(36)}`, serialized, {
      expirationTtl: 900,
    })
  }

  return record
}
