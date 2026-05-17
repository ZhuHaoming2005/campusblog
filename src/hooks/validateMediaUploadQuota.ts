import { APIError, type CollectionBeforeChangeHook, type CollectionBeforeValidateHook } from 'payload'

import { hasAdminRole } from '@/access/admin'

type RelationValue = number | string | { id?: number | string | null } | null | undefined

type MediaQuotaData = {
  filesize?: number | null
  owner?: RelationValue
}

type MediaQuotaUser = {
  id?: number | string | null
  quotaBytes?: number | null
  roles?: string[] | null
}

const PAGE_SIZE = 100
const DEFAULT_QUOTA_BYTES = 104857600

function getRelationId(value: RelationValue): number | string | null {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && (typeof value.id === 'number' || typeof value.id === 'string')) return value.id
  return null
}

function getNumericBytes(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(value, 0)
  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? Math.max(numeric, 0) : 0
  }
  return 0
}

async function getCurrentUserQuota(args: {
  req: Parameters<CollectionBeforeChangeHook>[0]['req']
  userId: number | string
}) {
  const user = (await args.req.payload.findByID({
    collection: 'users',
    depth: 0,
    id: args.userId,
    overrideAccess: true,
    req: args.req,
    select: {
      quotaBytes: true,
    },
  })) as MediaQuotaUser

  return typeof user.quotaBytes === 'number' ? user.quotaBytes : DEFAULT_QUOTA_BYTES
}

async function getOwnedMediaBytes(args: {
  req: Parameters<CollectionBeforeChangeHook>[0]['req']
  userId: number | string
}) {
  let page = 1
  let total = 0

  while (true) {
    const result = await args.req.payload.find({
      collection: 'media',
      depth: 0,
      limit: PAGE_SIZE,
      overrideAccess: true,
      page,
      req: args.req,
      select: {
        filesize: true,
      },
      where: {
        owner: {
          equals: args.userId,
        },
      },
    })

    for (const media of result.docs as MediaQuotaData[]) {
      total += getNumericBytes(media.filesize)
    }

    if (page >= result.totalPages) break
    page += 1
  }

  return total
}

export const setMediaOwner: CollectionBeforeValidateHook = ({ data, operation, req }) => {
  if (!data || operation !== 'create') return data
  if (!req.user?.id || hasAdminRole(req.user)) return data

  const nextData = data as MediaQuotaData
  nextData.owner = req.user.id
  return nextData
}

export const validateMediaUploadQuota: CollectionBeforeChangeHook = async ({
  data,
  operation,
  req,
}) => {
  if (!data || operation !== 'create') return data

  const user = req.user as MediaQuotaUser | null | undefined
  if (!user?.id || hasAdminRole(user)) return data

  const nextData = data as MediaQuotaData
  const ownerId = getRelationId(nextData.owner) ?? user.id
  if (String(ownerId) !== String(user.id)) {
    throw new APIError('Media owner must match the authenticated user.', 403)
  }

  const [quotaBytes, ownedBytes] = await Promise.all([
    getCurrentUserQuota({ req, userId: user.id }),
    getOwnedMediaBytes({ req, userId: user.id }),
  ])
  const uploadBytes = getNumericBytes(nextData.filesize)

  if (ownedBytes + uploadBytes > quotaBytes) {
    throw new APIError('Media upload quota exceeded.', 400)
  }

  return nextData
}
