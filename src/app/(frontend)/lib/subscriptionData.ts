import 'server-only'

import type { User } from '@/payload-types'
import { getFrontendPayload } from './frontendSession'

type RelationValue = number | string | { id?: number | string | null } | null | undefined

type RelationDoc = {
  [key: string]: unknown
}

export type SubscriptionNavigationData = {
  channelIds: Array<number | string>
  schoolIds: Array<number | string>
}

const EMPTY_SUBSCRIPTIONS: SubscriptionNavigationData = {
  channelIds: [],
  schoolIds: [],
}

function extractRelationID(value: RelationValue): number | string | null {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && (typeof value.id === 'number' || typeof value.id === 'string')) return value.id
  return null
}

function compactIDs(values: Array<number | string | null>) {
  return values.filter((value): value is number | string => value != null)
}

export async function getUserSubscriptionNavigationData(
  user: (User & { _verified?: boolean | null }) | null,
): Promise<SubscriptionNavigationData> {
  if (!user?.id || user._verified !== true) return EMPTY_SUBSCRIPTIONS

  const payload = await getFrontendPayload()
  const [schoolSubscriptions, channelSubscriptions] = await Promise.all([
    payload.find({
      collection: 'school-subscriptions',
      depth: 0,
      limit: 100,
      overrideAccess: false,
      user,
      where: { user: { equals: user.id } },
    }),
    payload.find({
      collection: 'school-sub-channel-subscriptions',
      depth: 0,
      limit: 200,
      overrideAccess: false,
      user,
      where: { user: { equals: user.id } },
    }),
  ])

  return {
    channelIds: compactIDs(
      channelSubscriptions.docs.map((subscription) =>
        extractRelationID((subscription as unknown as RelationDoc).channel as RelationValue),
      ),
    ),
    schoolIds: compactIDs(
      schoolSubscriptions.docs.map((subscription) =>
        extractRelationID((subscription as unknown as RelationDoc).school as RelationValue),
      ),
    ),
  }
}
