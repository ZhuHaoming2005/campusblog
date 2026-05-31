import {
  EDITOR_POST_TAG_LIMIT,
  EDITOR_POST_TAG_NAME_MAX_LENGTH,
  normalizeTagName,
} from '@/tags/tagRules'
import { formatSlugValue } from '@/fields/slug'

export { EDITOR_POST_TAG_LIMIT, EDITOR_POST_TAG_NAME_MAX_LENGTH } from '@/tags/tagRules'

type TagIdValue = number | string

type SubmittedEditorPostTag = unknown

type QueryValue =
  | boolean
  | number
  | string
  | null
  | undefined
  | QueryValue[]
  | { [key: string]: QueryValue }

export type EditorPostTagClient = {
  create(collection: 'tags', data: Record<string, unknown>): Promise<TagDoc>
  find(
    collection: 'tags',
    options?: {
      depth?: number
      limit?: number
      where?: Record<string, QueryValue>
    },
  ): Promise<{ docs: TagDoc[] }>
}

type TagDoc = {
  id: number | string
  name?: string | null
  slug?: string | null
}

type NormalizedTagInput = {
  key: string
  name: string
}

export class EditorPostTagValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EditorPostTagValidationError'
  }
}

const TAG_IDS_NOT_ALLOWED_MESSAGE = 'Submit tag names instead of tag IDs.'
const TAG_NAMES_ONLY_MESSAGE = 'Tags must be submitted as names.'
const TAG_UNAVAILABLE_MESSAGE = 'Tag is unavailable.'

function toPositiveInteger(value: TagIdValue | null | undefined): number | null {
  if (value === undefined || value === null || value === '') return null

  const numericValue = typeof value === 'number' ? value : Number(value.trim())
  if (!Number.isInteger(numericValue) || numericValue <= 0) return null

  return numericValue
}

function isUniqueConstraintError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /\b(unique|duplicate|constraint)\b/i.test(message)
}

function normalizeSubmittedTag(tag: SubmittedEditorPostTag): NormalizedTagInput | null {
  if (typeof tag === 'number') {
    throw new EditorPostTagValidationError(TAG_IDS_NOT_ALLOWED_MESSAGE)
  }

  if (typeof tag === 'string') {
    const name = normalizeTagName(tag)
    if (name.length > EDITOR_POST_TAG_NAME_MAX_LENGTH) {
      throw new EditorPostTagValidationError(
        `Tag names must be ${EDITOR_POST_TAG_NAME_MAX_LENGTH} characters or fewer.`,
      )
    }
    return name ? { key: name.toLocaleLowerCase(), name } : null
  }

  if (!tag || typeof tag !== 'object' || Array.isArray(tag)) {
    throw new EditorPostTagValidationError(TAG_NAMES_ONLY_MESSAGE)
  }

  const submittedTag = tag as { id?: unknown; name?: unknown }
  if (submittedTag.id !== undefined && submittedTag.id !== null && submittedTag.id !== '') {
    throw new EditorPostTagValidationError(TAG_IDS_NOT_ALLOWED_MESSAGE)
  }

  if (!('name' in submittedTag)) {
    throw new EditorPostTagValidationError(TAG_NAMES_ONLY_MESSAGE)
  }

  if (typeof submittedTag.name !== 'string') {
    throw new EditorPostTagValidationError(TAG_NAMES_ONLY_MESSAGE)
  }

  const name = normalizeTagName(submittedTag.name)
  if (name.length > EDITOR_POST_TAG_NAME_MAX_LENGTH) {
    throw new EditorPostTagValidationError(
      `Tag names must be ${EDITOR_POST_TAG_NAME_MAX_LENGTH} characters or fewer.`,
    )
  }
  if (name) return { key: name.toLocaleLowerCase(), name }

  return null
}

async function findActiveTagByName(
  client: EditorPostTagClient,
  name: string,
): Promise<TagDoc | null> {
  const identityConditions: Record<string, QueryValue>[] = [
    {
      name: {
        equals: name,
      },
    },
  ]
  const slug = formatSlugValue(name)

  if (slug) {
    identityConditions.push({
      slug: {
        equals: slug,
      },
    })
  }

  const result = await client.find('tags', {
    depth: 0,
    limit: identityConditions.length,
    where: {
      and: [
        { isActive: { equals: true } },
        identityConditions.length === 1 ? identityConditions[0] : { or: identityConditions },
      ],
    },
  })
  const key = name.toLocaleLowerCase()

  return (
    result.docs.find((tag) => normalizeTagName(tag.name ?? '').toLocaleLowerCase() === key) ?? null
  )
}

async function findOrCreateTagByName(
  client: EditorPostTagClient,
  name: string,
): Promise<TagDoc> {
  const existingTag = await findActiveTagByName(client, name)
  if (existingTag) return existingTag

  try {
    return await client.create('tags', { name })
  } catch (error) {
    const tagCreatedConcurrently = await findActiveTagByName(client, name)
    if (tagCreatedConcurrently) return tagCreatedConcurrently

    if (isUniqueConstraintError(error)) {
      throw new EditorPostTagValidationError(TAG_UNAVAILABLE_MESSAGE)
    }

    throw error
  }
}

export async function resolveEditorPostTagIds(
  client: EditorPostTagClient,
  tags: unknown,
): Promise<number[]> {
  if (tags === undefined || tags === null) return []
  if (!Array.isArray(tags)) {
    throw new EditorPostTagValidationError('Tags must be submitted as an array of names.')
  }
  if (tags.length === 0) return []

  const normalizedTags = tags
    .map((tag) => normalizeSubmittedTag(tag))
    .filter((tag): tag is NormalizedTagInput => tag !== null)
  const uniqueTagKeys = new Set(normalizedTags.map((tag) => tag.key))
  if (uniqueTagKeys.size > EDITOR_POST_TAG_LIMIT) {
    throw new EditorPostTagValidationError(`Select up to ${EDITOR_POST_TAG_LIMIT} tags.`)
  }

  const uniqueNames = new Map<string, string>()
  for (const tag of normalizedTags) {
    if (!uniqueNames.has(tag.key)) {
      uniqueNames.set(tag.key, tag.name)
    }
  }
  const tagIdsByNameKey = new Map<string, number>()

  for (const [key, name] of uniqueNames.entries()) {
    const tag = await findOrCreateTagByName(client, name)
    const tagId = toPositiveInteger(tag.id)

    if (tagId) {
      tagIdsByNameKey.set(key, tagId)
    }
  }

  const tagIds: number[] = []
  const seenTagIds = new Set<number>()

  for (const tag of normalizedTags) {
    const tagId = tagIdsByNameKey.get(tag.key)
    if (!tagId || seenTagIds.has(tagId)) continue

    seenTagIds.add(tagId)
    tagIds.push(tagId)
  }

  return tagIds
}
