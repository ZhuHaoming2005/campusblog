import type { Where } from 'payload'

import type { User } from '@/payload-types'
import { getFrontendPayload } from '@/lib/frontendSession'
import { requireFrontendAuth, toAuthFailureResponse } from '@/app/api/auth/_lib/frontendAuth'

type RelationValue = number | string | { id?: number | string | null } | null | undefined

type SubscriptionBody = {
  channelId?: number | string
  schoolId?: number | string
}

type RequestPayload = Awaited<ReturnType<typeof getFrontendPayload>>

type AuthUser = User & {
  _verified?: boolean | null
}

const subscriptionAuthOptions = {
  nextPath: '/',
  requireVerified: true,
} as const

function toNumericId(value: number | string | undefined | null): number | null {
  if (value === undefined || value === null || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function extractRelationID(value: RelationValue): number | string | null {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && (typeof value.id === 'number' || typeof value.id === 'string')) return value.id
  return null
}

function isUniqueConflict(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /unique/i.test(message)
}

async function readBody(request: Request): Promise<SubscriptionBody> {
  if (!request.body) return {}
  return (await request.json()) as SubscriptionBody
}

async function requireSubscriptionAuth(headers: Headers) {
  const auth = await requireFrontendAuth({
    headers,
    ...subscriptionAuthOptions,
  })

  if (auth.ok === false) {
    return {
      response: toAuthFailureResponse(auth),
      user: null as AuthUser | null,
    }
  }

  return {
    response: null,
    user: auth.user as AuthUser,
  }
}

function ownRelationWhere(userID: number | string, field: string, id: number | string): Where {
  return {
    and: [{ user: { equals: userID } }, { [field]: { equals: id } }],
  }
}

async function findExistingSubscription(args: {
  collection: 'school-sub-channel-subscriptions' | 'school-subscriptions'
  field: 'channel' | 'school'
  id: number | string
  payload: RequestPayload
  user: AuthUser
}) {
  return args.payload.find({
    collection: args.collection,
    depth: 0,
    limit: 1,
    overrideAccess: false,
    user: args.user,
    where: ownRelationWhere(args.user.id, args.field, args.id),
  })
}

export async function POSTSchoolSubscription(request: Request) {
  const auth = await requireSubscriptionAuth(request.headers)
  if (!auth.user) return auth.response

  const body = await readBody(request)
  const schoolId = toNumericId(body.schoolId)
  if (!schoolId) {
    return Response.json({ error: 'schoolId is required.' }, { status: 400 })
  }

  const payload = await getFrontendPayload()
  await payload.findByID({
    collection: 'schools',
    depth: 0,
    id: schoolId,
    overrideAccess: false,
    user: auth.user,
  })

  const existing = await findExistingSubscription({
    collection: 'school-subscriptions',
    field: 'school',
    id: schoolId,
    payload,
    user: auth.user,
  })

  if (existing.docs.length === 0) {
    try {
      await payload.create({
        collection: 'school-subscriptions',
        data: {
          school: schoolId,
          user: auth.user.id,
        },
        overrideAccess: false,
        user: auth.user,
      })
    } catch (error) {
      if (!isUniqueConflict(error)) throw error
    }
  }

  return Response.json({ schoolId, subscribed: true })
}

export async function DELETESchoolSubscription(request: Request) {
  const auth = await requireSubscriptionAuth(request.headers)
  if (!auth.user) return auth.response

  const body = await readBody(request)
  const schoolId = toNumericId(body.schoolId)
  if (!schoolId) {
    return Response.json({ error: 'schoolId is required.' }, { status: 400 })
  }

  const payload = await getFrontendPayload()
  const where = ownRelationWhere(auth.user.id, 'school', schoolId)

  await payload.delete({
    collection: 'school-sub-channel-subscriptions',
    overrideAccess: false,
    user: auth.user,
    where,
  })
  await payload.delete({
    collection: 'school-subscriptions',
    overrideAccess: false,
    user: auth.user,
    where,
  })

  return Response.json({ schoolId, subscribed: false })
}

export async function POSTChannelSubscription(request: Request) {
  const auth = await requireSubscriptionAuth(request.headers)
  if (!auth.user) return auth.response

  const body = await readBody(request)
  const channelId = toNumericId(body.channelId)
  if (!channelId) {
    return Response.json({ error: 'channelId is required.' }, { status: 400 })
  }

  const payload = await getFrontendPayload()
  const channel = await payload.findByID({
    collection: 'school-sub-channels',
    depth: 0,
    id: channelId,
    overrideAccess: false,
    user: auth.user,
  })
  const schoolId = toNumericId(extractRelationID(channel.school as RelationValue))
  if (!schoolId) {
    return Response.json({ error: 'Channel school is required.' }, { status: 400 })
  }

  const existing = await findExistingSubscription({
    collection: 'school-sub-channel-subscriptions',
    field: 'channel',
    id: channelId,
    payload,
    user: auth.user,
  })

  if (existing.docs.length === 0) {
    try {
      await payload.create({
        collection: 'school-sub-channel-subscriptions',
        data: {
          channel: channelId,
          school: schoolId,
          user: auth.user.id,
        },
        overrideAccess: false,
        user: auth.user,
      })
    } catch (error) {
      if (!isUniqueConflict(error)) throw error
    }
  }

  return Response.json({ channelId, schoolId, subscribed: true })
}

export async function DELETEChannelSubscription(request: Request) {
  const auth = await requireSubscriptionAuth(request.headers)
  if (!auth.user) return auth.response

  const body = await readBody(request)
  const channelId = toNumericId(body.channelId)
  if (!channelId) {
    return Response.json({ error: 'channelId is required.' }, { status: 400 })
  }

  const payload = await getFrontendPayload()
  await payload.delete({
    collection: 'school-sub-channel-subscriptions',
    overrideAccess: false,
    user: auth.user,
    where: ownRelationWhere(auth.user.id, 'channel', channelId),
  })

  return Response.json({ channelId, subscribed: false })
}

export async function GETMySubscriptions(request: Request) {
  const auth = await requireSubscriptionAuth(request.headers)
  if (!auth.user) return auth.response

  const payload = await getFrontendPayload()
  const [schools, channels] = await Promise.all([
    payload.find({
      collection: 'school-subscriptions',
      depth: 1,
      limit: 100,
      overrideAccess: false,
      user: auth.user,
      where: { user: { equals: auth.user.id } },
    }),
    payload.find({
      collection: 'school-sub-channel-subscriptions',
      depth: 1,
      limit: 200,
      overrideAccess: false,
      user: auth.user,
      where: { user: { equals: auth.user.id } },
    }),
  ])

  return Response.json({
    channels: channels.docs,
    schools: schools.docs,
  })
}
