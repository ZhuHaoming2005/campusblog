import type {
  Access,
  CollectionBeforeDeleteHook,
  CollectionBeforeValidateHook,
  CollectionConfig,
  PayloadRequest,
  Where,
} from 'payload'

import { adminOnly, adminOrVerifiedActiveUser, hasAdminRole } from '@/access/admin'

type RelationValue = number | string | { id?: number | string | null } | null | undefined

type RelationDoc = {
  id?: RelationValue
  [key: string]: unknown
}

type InteractionCollectionSlug =
  | 'post-bookmarks'
  | 'post-likes'
  | 'school-sub-channel-subscriptions'
  | 'school-subscriptions'
  | 'user-follows'

const extractRelationID = (value: RelationValue): number | string | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && (typeof value.id === 'number' || typeof value.id === 'string')) return value.id
  return null
}

const getDataRelationID = (doc: RelationDoc | null | undefined, field: string) => {
  return extractRelationID(doc?.[field] as RelationValue)
}

const ownedBy = (field: string): Access => ({ req: { user } }) => {
  if (hasAdminRole(user)) return true
  if (!user?.id) return false

  return {
    [field]: {
      equals: user.id,
    },
  }
}

const setCurrentUserRelation =
  (field: string): CollectionBeforeValidateHook =>
  ({ data, req }) => {
    if (!req.user?.id || hasAdminRole(req.user)) return data

    return {
      ...(data ?? {}),
      [field]: req.user.id,
    }
  }

const ensureUniqueRelation =
  (collection: InteractionCollectionSlug, fields: string[]): CollectionBeforeValidateHook =>
  async ({ data, originalDoc, req }) => {
    const nextData = (data ?? {}) as RelationDoc
    const currentDoc = (originalDoc ?? {}) as RelationDoc
    const relationValues = fields.map((field) => ({
      field,
      value: getDataRelationID(nextData, field) ?? getDataRelationID(currentDoc, field),
    }))

    if (relationValues.some(({ value }) => value == null)) {
      return data
    }

    const where: Where = {
      and: relationValues.map(({ field, value }) => ({
        [field]: {
          equals: value,
        },
      })),
    }

    const existing = await req.payload.find({
      collection,
      depth: 0,
      limit: 1,
      overrideAccess: true,
      req,
      where,
    })

    const duplicate = existing.docs.find((doc) => {
      const duplicateID = extractRelationID((doc as unknown as RelationDoc).id)
      const currentID = extractRelationID(currentDoc.id)
      return !currentID || String(duplicateID) !== String(currentID)
    })

    if (duplicate) {
      throw new Error('This relationship already exists.')
    }

    return data
  }

const deleteInteractionRows = async ({
  collection,
  req,
  where,
}: {
  collection: InteractionCollectionSlug
  req: PayloadRequest
  where: Where
}) => {
  await req.payload.delete({
    collection,
    overrideAccess: true,
    req,
    where,
  })
}

export const cleanupPostInteractionsBeforeDelete: CollectionBeforeDeleteHook = async ({
  id,
  req,
}) => {
  await deleteInteractionRows({
    collection: 'post-likes',
    req,
    where: { post: { equals: id } },
  })
  await deleteInteractionRows({
    collection: 'post-bookmarks',
    req,
    where: { post: { equals: id } },
  })
}

export const cleanupUserInteractionsBeforeDelete: CollectionBeforeDeleteHook = async ({
  id,
  req,
}) => {
  await deleteInteractionRows({
    collection: 'post-likes',
    req,
    where: { user: { equals: id } },
  })
  await deleteInteractionRows({
    collection: 'post-bookmarks',
    req,
    where: { user: { equals: id } },
  })
  await deleteInteractionRows({
    collection: 'user-follows',
    req,
    where: {
      or: [{ follower: { equals: id } }, { following: { equals: id } }],
    },
  })
  await deleteInteractionRows({
    collection: 'school-subscriptions',
    req,
    where: { user: { equals: id } },
  })
  await deleteInteractionRows({
    collection: 'school-sub-channel-subscriptions',
    req,
    where: { user: { equals: id } },
  })
}

export const cleanupSchoolSubscriptionsBeforeDelete: CollectionBeforeDeleteHook = async ({
  id,
  req,
}) => {
  await deleteInteractionRows({
    collection: 'school-subscriptions',
    req,
    where: { school: { equals: id } },
  })
  await deleteInteractionRows({
    collection: 'school-sub-channel-subscriptions',
    req,
    where: { school: { equals: id } },
  })
}

export const cleanupSchoolSubChannelSubscriptionsBeforeDelete: CollectionBeforeDeleteHook =
  async ({ id, req }) => {
    await deleteInteractionRows({
      collection: 'school-sub-channel-subscriptions',
      req,
      where: { channel: { equals: id } },
    })
  }

const preventSelfFollow: CollectionBeforeValidateHook = ({ data, originalDoc }) => {
  const nextData = (data ?? {}) as RelationDoc
  const currentDoc = (originalDoc ?? {}) as RelationDoc
  const follower = getDataRelationID(nextData, 'follower') ?? getDataRelationID(currentDoc, 'follower')
  const following =
    getDataRelationID(nextData, 'following') ?? getDataRelationID(currentDoc, 'following')

  if (follower && following && String(follower) === String(following)) {
    throw new Error('Users cannot follow themselves.')
  }

  return data
}

const validateChannelSchoolRelation: CollectionBeforeValidateHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const nextData = (data ?? {}) as RelationDoc
  const currentDoc = (originalDoc ?? {}) as RelationDoc
  const channelID =
    getDataRelationID(nextData, 'channel') ?? getDataRelationID(currentDoc, 'channel')
  const schoolID = getDataRelationID(nextData, 'school') ?? getDataRelationID(currentDoc, 'school')

  if (!channelID || !schoolID) return data

  const channel = await req.payload.findByID({
    collection: 'school-sub-channels',
    depth: 0,
    id: channelID,
    overrideAccess: true,
    req,
    select: {
      school: true,
    },
  })

  const channelSchoolID = extractRelationID((channel as RelationDoc).school as RelationValue)
  if (!channelSchoolID || String(channelSchoolID) !== String(schoolID)) {
    throw new Error('Channel subscription must belong to the selected school.')
  }

  return data
}

const userRelationshipField = (name = 'user') =>
  ({
    name,
    type: 'relationship',
    relationTo: 'users',
    required: true,
    index: true,
    admin: {
      position: 'sidebar',
      readOnly: true,
    },
  }) as const

const postRelationshipField = {
  name: 'post',
  type: 'relationship',
  relationTo: 'posts',
  required: true,
  index: true,
  admin: {
    position: 'sidebar',
  },
} as const

const schoolRelationshipField = {
  name: 'school',
  type: 'relationship',
  relationTo: 'schools',
  required: true,
  index: true,
  admin: {
    position: 'sidebar',
  },
} as const

export const PostLikes: CollectionConfig = {
  slug: 'post-likes',
  admin: {
    defaultColumns: ['post', 'user', 'createdAt'],
    useAsTitle: 'id',
  },
  access: {
    read: ownedBy('user'),
    create: adminOrVerifiedActiveUser,
    update: adminOnly,
    delete: ownedBy('user'),
  },
  hooks: {
    beforeValidate: [
      setCurrentUserRelation('user'),
      ensureUniqueRelation('post-likes', ['user', 'post']),
    ],
  },
  indexes: [{ fields: ['user', 'post'], unique: true }],
  fields: [userRelationshipField(), postRelationshipField],
  timestamps: true,
}

export const PostBookmarks: CollectionConfig = {
  slug: 'post-bookmarks',
  admin: {
    defaultColumns: ['post', 'user', 'createdAt'],
    useAsTitle: 'id',
  },
  access: {
    read: ownedBy('user'),
    create: adminOrVerifiedActiveUser,
    update: adminOnly,
    delete: ownedBy('user'),
  },
  hooks: {
    beforeValidate: [
      setCurrentUserRelation('user'),
      ensureUniqueRelation('post-bookmarks', ['user', 'post']),
    ],
  },
  indexes: [{ fields: ['user', 'post'], unique: true }],
  fields: [userRelationshipField(), postRelationshipField],
  timestamps: true,
}

export const UserFollows: CollectionConfig = {
  slug: 'user-follows',
  admin: {
    defaultColumns: ['follower', 'following', 'createdAt'],
    useAsTitle: 'id',
  },
  access: {
    read: ownedBy('follower'),
    create: adminOrVerifiedActiveUser,
    update: adminOnly,
    delete: ownedBy('follower'),
  },
  hooks: {
    beforeValidate: [
      setCurrentUserRelation('follower'),
      preventSelfFollow,
      ensureUniqueRelation('user-follows', ['follower', 'following']),
    ],
  },
  indexes: [{ fields: ['follower', 'following'], unique: true }],
  fields: [
    userRelationshipField('follower'),
    {
      name: 'following',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: {
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}

export const SchoolSubscriptions: CollectionConfig = {
  slug: 'school-subscriptions',
  admin: {
    defaultColumns: ['school', 'user', 'createdAt'],
    useAsTitle: 'id',
  },
  access: {
    read: ownedBy('user'),
    create: adminOrVerifiedActiveUser,
    update: adminOnly,
    delete: ownedBy('user'),
  },
  hooks: {
    beforeValidate: [
      setCurrentUserRelation('user'),
      ensureUniqueRelation('school-subscriptions', ['user', 'school']),
    ],
  },
  indexes: [{ fields: ['user', 'school'], unique: true }],
  fields: [userRelationshipField(), schoolRelationshipField],
  timestamps: true,
}

export const SchoolSubChannelSubscriptions: CollectionConfig = {
  slug: 'school-sub-channel-subscriptions',
  admin: {
    defaultColumns: ['school', 'channel', 'user', 'createdAt'],
    useAsTitle: 'id',
  },
  access: {
    read: ownedBy('user'),
    create: adminOrVerifiedActiveUser,
    update: adminOnly,
    delete: ownedBy('user'),
  },
  hooks: {
    beforeValidate: [
      setCurrentUserRelation('user'),
      validateChannelSchoolRelation,
      ensureUniqueRelation('school-sub-channel-subscriptions', ['user', 'channel']),
    ],
  },
  indexes: [{ fields: ['user', 'channel'], unique: true }],
  fields: [
    userRelationshipField(),
    schoolRelationshipField,
    {
      name: 'channel',
      type: 'relationship',
      relationTo: 'school-sub-channels',
      required: true,
      index: true,
      admin: {
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}
