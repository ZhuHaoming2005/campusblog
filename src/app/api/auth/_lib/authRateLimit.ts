import { getCloudflareContext } from '@opennextjs/cloudflare'

type AuthAction = 'forgotPassword' | 'login' | 'register' | 'resendVerification'

type KVLike = {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<unknown>
}

type StoredWindow = {
  count: number
  startedAt: number
}

type StoredCooldown = {
  startedAt: number
}

const RATE_LIMITS: Record<AuthAction, { limit: number; windowMs: number }> = {
  forgotPassword: { limit: 5, windowMs: 10 * 60 * 1000 },
  login: { limit: 10, windowMs: 10 * 60 * 1000 },
  register: { limit: 5, windowMs: 10 * 60 * 1000 },
  resendVerification: { limit: 3, windowMs: 10 * 60 * 1000 },
}

const EMAIL_SEND_COOLDOWN_MS = 60 * 1000
const MIN_KV_EXPIRATION_TTL_SECONDS = 60

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (item) => item.toString(16).padStart(2, '0')).join('')
}

async function getAuthKV(): Promise<KVLike | undefined> {
  try {
    const context = await getCloudflareContext({ async: true })
    return context.env?.KV as KVLike | undefined
  } catch {
    return undefined
  }
}

async function buildCooldownKey(args: {
  action: Extract<AuthAction, 'forgotPassword' | 'resendVerification'>
  email: string
}) {
  return `auth:cooldown:${args.action}:${await sha256(args.email)}`
}

export function getRequestIP(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIP = headers.get('x-real-ip')?.trim()
  return forwarded || realIP || 'unknown'
}

export async function checkAuthRateLimit(args: {
  action: AuthAction
  email?: string | null
  ip: string
  kv?: KVLike
  now?: number
}) {
  const kv = args.kv ?? (await getAuthKV())
  if (!kv) {
    return { limited: false, retryAfterSeconds: 0 }
  }

  try {
    const settings = RATE_LIMITS[args.action]
    const now = args.now ?? Date.now()
    const parts = [`auth:rate:${args.action}`]

    if (args.email) {
      parts.push(await sha256(args.email))
    }

    parts.push(await sha256(args.ip))

    const key = parts.join(':')
    const existingRaw = await kv.get(key)
    const existing = existingRaw ? (JSON.parse(existingRaw) as StoredWindow) : null
    const inWindow =
      existing && now - existing.startedAt >= 0 && now - existing.startedAt < settings.windowMs

    const nextState: StoredWindow = inWindow
      ? { count: existing.count + 1, startedAt: existing.startedAt }
      : { count: 1, startedAt: now }

    const windowExpiresAt = inWindow ? existing.startedAt + settings.windowMs : now + settings.windowMs
    const ttlSeconds = Math.max(
      MIN_KV_EXPIRATION_TTL_SECONDS,
      Math.ceil((windowExpiresAt - now) / 1000),
    )

    await kv.put(key, JSON.stringify(nextState), { expirationTtl: ttlSeconds })

    if (nextState.count > settings.limit) {
      return {
        limited: true,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((nextState.startedAt + settings.windowMs - now) / 1000),
        ),
      }
    }

    return { limited: false, retryAfterSeconds: 0 }
  } catch {
    return { limited: false, retryAfterSeconds: 0 }
  }
}

export async function checkAuthCooldown(args: {
  action: Extract<AuthAction, 'forgotPassword' | 'resendVerification'>
  email: string
  kv?: KVLike
  now?: number
}) {
  const kv = args.kv ?? (await getAuthKV())
  if (!kv) {
    return { limited: false, retryAfterSeconds: 0 }
  }

  try {
    const now = args.now ?? Date.now()
    const key = await buildCooldownKey(args)
    const existingRaw = await kv.get(key)
    const existing = existingRaw ? (JSON.parse(existingRaw) as StoredCooldown) : null

    if (!existing) {
      return { limited: false, retryAfterSeconds: 0 }
    }

    const remainingMs = existing.startedAt + EMAIL_SEND_COOLDOWN_MS - now
    if (remainingMs <= 0) {
      return { limited: false, retryAfterSeconds: 0 }
    }

    return {
      limited: true,
      retryAfterSeconds: Math.max(1, Math.ceil(remainingMs / 1000)),
    }
  } catch {
    return { limited: false, retryAfterSeconds: 0 }
  }
}

export async function recordAuthCooldown(args: {
  action: Extract<AuthAction, 'forgotPassword' | 'resendVerification'>
  email: string
  kv?: KVLike
  now?: number
}) {
  const kv = args.kv ?? (await getAuthKV())
  if (!kv) {
    return
  }

  try {
    const now = args.now ?? Date.now()
    await kv.put(await buildCooldownKey(args), JSON.stringify({ startedAt: now }), {
      expirationTtl: Math.max(
        MIN_KV_EXPIRATION_TTL_SECONDS,
        Math.ceil(EMAIL_SEND_COOLDOWN_MS / 1000),
      ),
    })
  } catch {
    return
  }
}
