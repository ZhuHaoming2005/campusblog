import type { Where } from 'payload'

import type { SchoolSubChannel, User } from '@/payload-types'
import { getFrontendPayload } from '@/lib/frontendSession'
import { requireFrontendAuth, toAuthFailureResponse } from '@/app/api/auth/_lib/frontendAuth'
import { rejectCrossSiteStateChangingRequest } from '@/app/api/auth/_lib/stateChangingRequestGuard'

type AuthUser = User & {
  _verified?: boolean | null
}

type RelationValue = number | string | { id?: number | string | null } | null | undefined

type RelationDoc = {
  id?: RelationValue
  [key: string]: unknown
}

async function requireSubscriptionAuth(headers: Headers) {
  const auth = await requireFrontendAuth({
    headers,
    nextPath: '/',
    requireVerified: true,
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

function toNumericId(value: unknown): number | null {
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json()
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function extractRelationID(value: RelationValue): number | string | null {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && (typeof value.id === 'number' || typeof value.id === 'string')) return value.id
  return null
}

function isUniqueConflict(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /unique/i.test(message) || /relationship already exists/i.test(message)
}

function ownedRelationWhere(userID: number | string, field: string, id: number | string): Where {
  return {
    and: [{ user: { equals: userID } }, { [field]: { equals: id } }],
  }
}

async function ensureSchoolSubscription(args: { schoolId: number; user: AuthUser }) {
  const payload = await getFrontendPayload()
  const where = ownedRelationWhere(args.user.id, 'school', args.schoolId)
  const existing = await payload.find({
    collection: 'school-subscriptions',
    depth: 0,
    limit: 1,
    overrideAccess: false,
    user: args.user,
    where,
  })

  if (existing.docs.length > 0) return

  try {
    await payload.create({
      collection: 'school-subscriptions',
      data: {
        school: args.schoolId,
        user: args.user.id,
      },
      overrideAccess: false,
      user: args.user,
    })
  } catch (error) {
    if (!isUniqueConflict(error)) throw error
  }
}

async function getChannelSchoolId(args: { channelId: number; user: AuthUser }) {
  const payload = await getFrontendPayload()
  const channel = (await payload.findByID({
    collection: 'school-sub-channels',
    depth: 0,
    id: args.channelId,
    overrideAccess: false,
    select: {
      school: true,
    },
    user: args.user,
  })) as Pick<SchoolSubChannel, 'school'> & RelationDoc

  return toNumericId(extractRelationID(channel.school as RelationValue))
}

export async function POSTSchoolSubscription(request: Request) {
  const rejectedRequest = await rejectCrossSiteStateChangingRequest(request)
  if (rejectedRequest) return rejectedRequest

  const auth = await requireSubscriptionAuth(request.headers)
  if (!auth.user) return auth.response

  const body = await readJsonBody(request)
  const schoolId = toNumericId(body.schoolId)
  if (!schoolId) return Response.json({ error: 'schoolId is required.' }, { status: 400 })

  const payload = await getFrontendPayload()
  await payload.findByID({
    collection: 'schools',
    depth: 0,
    id: schoolId,
    overrideAccess: false,
    user: auth.user,
  })

  await ensureSchoolSubscription({ schoolId, user: auth.user })

  return Response.json({ schoolId, subscribed: true })
}

export async function DELETESchoolSubscription(request: Request) {
  const rejectedRequest = await rejectCrossSiteStateChangingRequest(request)
  if (rejectedRequest) return rejectedRequest

  const auth = await requireSubscriptionAuth(request.headers)
  if (!auth.user) return auth.response

  const body = await readJsonBody(request)
  const schoolId = toNumericId(body.schoolId)
  if (!schoolId) return Response.json({ error: 'schoolId is required.' }, { status: 400 })

  const payload = await getFrontendPayload()
  const schoolWhere = ownedRelationWhere(auth.user.id, 'school', schoolId)
  await payload.delete({
    collection: 'school-sub-channel-subscriptions',
    overrideAccess: false,
    user: auth.user,
    where: schoolWhere,
  })
  await payload.delete({
    collection: 'school-subscriptions',
    overrideAccess: false,
    user: auth.user,
    where: schoolWhere,
  })

  return Response.json({ schoolId, subscribed: false })
}

export async function POSTChannelSubscription(request: Request) {
  const rejectedRequest = await rejectCrossSiteStateChangingRequest(request)
  if (rejectedRequest) return rejectedRequest

  const auth = await requireSubscriptionAuth(request.headers)
  if (!auth.user) return auth.response

  const body = await readJsonBody(request)
  const channelId = toNumericId(body.channelId)
  if (!channelId) return Response.json({ error: 'channelId is required.' }, { status: 400 })

  const schoolId = await getChannelSchoolId({ channelId, user: auth.user })
  if (!schoolId) {
    return Response.json({ error: 'Channel school is required.' }, { status: 400 })
  }

  const requestedSchoolId = body.schoolId == null ? null : toNumericId(body.schoolId)
  if (requestedSchoolId && requestedSchoolId !== schoolId) {
    return Response.json(
      { error: 'Channel subscription must belong to the selected school.' },
      { status: 400 },
    )
  }

  await ensureSchoolSubscription({ schoolId, user: auth.user })

  const payload = await getFrontendPayload()
  const where = ownedRelationWhere(auth.user.id, 'channel', channelId)
  const existing = await payload.find({
    collection: 'school-sub-channel-subscriptions',
    depth: 0,
    limit: 1,
    overrideAccess: false,
    user: auth.user,
    where,
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

  return Response.json({ channelId, schoolId, schoolSubscribed: true, subscribed: true })
}

export async function DELETEChannelSubscription(request: Request) {
  const rejectedRequest = await rejectCrossSiteStateChangingRequest(request)
  if (rejectedRequest) return rejectedRequest

  const auth = await requireSubscriptionAuth(request.headers)
  if (!auth.user) return auth.response

  const body = await readJsonBody(request)
  const channelId = toNumericId(body.channelId)
  if (!channelId) return Response.json({ error: 'channelId is required.' }, { status: 400 })

  const schoolId = await getChannelSchoolId({ channelId, user: auth.user })
  const payload = await getFrontendPayload()
  await payload.delete({
    collection: 'school-sub-channel-subscriptions',
    overrideAccess: false,
    user: auth.user,
    where: ownedRelationWhere(auth.user.id, 'channel', channelId),
  })

  return Response.json({ channelId, schoolId, subscribed: false })
}

export async function GETMySubscriptions(request: Request) {
  const auth = await requireSubscriptionAuth(request.headers)
  if (!auth.user) return auth.response

  const payload = await getFrontendPayload()
  const [schoolSubscriptions, channelSubscriptions] = await Promise.all([
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
    channels: channelSubscriptions.docs.map((subscription) => {
      const doc = subscription as unknown as RelationDoc
      return {
        channelId: extractRelationID(doc.channel as RelationValue),
        schoolId: extractRelationID(doc.school as RelationValue),
        subscriptionId: doc.id,
      }
    }),
    schools: schoolSubscriptions.docs.map((subscription) => {
      const doc = subscription as unknown as RelationDoc
      return {
        schoolId: extractRelationID(doc.school as RelationValue),
        subscriptionId: doc.id,
      }
    }),
  })
}
