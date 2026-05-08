import 'server-only'

import { getPayload } from 'payload'

import config from '@/payload.config'
import type { User } from '@/payload-types'
import type { SidebarUser } from './sessionTypes'

export type FrontendSessionUser = User & {
  _verified?: boolean | null
}

declare global {
  // Reuse the same Payload instance in dev to avoid repeated logger/init side effects.
  var __campusblogFrontendPayloadPromise: ReturnType<typeof getPayload> | undefined
}

export async function getFrontendPayload() {
  if (!globalThis.__campusblogFrontendPayloadPromise) {
    globalThis.__campusblogFrontendPayloadPromise = (async () => {
      const payloadConfig = await config
      return getPayload({ config: payloadConfig })
    })()
  }

  return globalThis.__campusblogFrontendPayloadPromise
}

export async function getCurrentFrontendUser(headers: Headers): Promise<FrontendSessionUser | null> {
  const payload = await getFrontendPayload()
  const result = await payload.auth({ headers })
  return (result.user as FrontendSessionUser | null | undefined) ?? null
}

export function toSidebarUser(user: FrontendSessionUser | null): SidebarUser | null {
  if (!user) return null
  if (user._verified !== true) return null

  const avatarUrl =
    user.avatar && typeof user.avatar === 'object' ? (user.avatar.url ?? null) : null

  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    avatarUrl,
  }
}
