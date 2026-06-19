import { describe, expect, it, vi } from 'vitest'

import {
  EDITOR_POST_TAG_LIMIT,
  EDITOR_POST_TAG_NAME_MAX_LENGTH,
  resolveEditorPostTagIds,
} from '@/app/api/editor/posts/_lib/editorPostTags'

type QueryLookupField = 'name' | 'slug'
type QueryLookupOperator = 'contains' | 'equals'

function hasQueryCondition(
  node: unknown,
  field: QueryLookupField,
  operator: QueryLookupOperator,
  expected: string,
): boolean {
  if (!node || typeof node !== 'object') return false

  if (Array.isArray(node)) {
    return node.some((child) => hasQueryCondition(child, field, operator, expected))
  }

  const record = node as Record<string, unknown>
  const fieldCondition = record[field]

  if (
    fieldCondition &&
    typeof fieldCondition === 'object' &&
    !Array.isArray(fieldCondition) &&
    (fieldCondition as Record<string, unknown>)[operator] === expected
  ) {
    return true
  }

  return Object.values(record).some((child) => hasQueryCondition(child, field, operator, expected))
}

describe('resolveEditorPostTagIds', () => {
  it('reuses existing active tag names and creates missing custom tags once', async () => {
    const find = vi.fn(
      async (_collection: string, options?: { where?: unknown }) => {
        if (
          hasQueryCondition(options?.where, 'name', 'equals', 'Campus Life') ||
          hasQueryCondition(options?.where, 'slug', 'equals', 'campus-life')
        ) {
          return {
            docs: [{ id: 7, name: 'Campus Life' }],
            totalPages: 1,
          }
        }

        return {
          docs: [],
          totalPages: 0,
        }
      },
    )
    const create = vi.fn(async (_collection: string, data: Record<string, unknown>) => ({
      id: data.name === 'Study Tips' ? 8 : 9,
      name: String(data.name),
    }))

    const tagIds = await resolveEditorPostTagIds(
      { create, find },
      ['Campus Life', { name: '  Study   Tips  ' }, { name: 'campus life' }],
    )

    expect(tagIds).toEqual([7, 8])
    expect(create).toHaveBeenCalledTimes(1)
    expect(create).toHaveBeenCalledWith('tags', { name: 'Study Tips' })
  })

  it('rejects submitted tag IDs instead of trusting client-provided relationships', async () => {
    const client = {
      create: vi.fn(async () => ({ id: 1, name: 'Custom' })),
      find: vi.fn(async () => ({ docs: [] })),
    }

    await expect(resolveEditorPostTagIds(client, [3])).rejects.toThrow(
      'Submit tag names instead of tag IDs.',
    )
    await expect(resolveEditorPostTagIds(client, [{ id: 3, name: 'Campus Life' }])).rejects.toThrow(
      'Submit tag names instead of tag IDs.',
    )

    expect(client.find).not.toHaveBeenCalled()
    expect(client.create).not.toHaveBeenCalled()
  })

  it('rejects malformed tag entries with a validation error', async () => {
    const client = {
      create: vi.fn(async () => ({ id: 1, name: 'Custom' })),
      find: vi.fn(async () => ({ docs: [] })),
    }

    await expect(resolveEditorPostTagIds(client, [null, false, []])).rejects.toThrow(
      'Tags must be submitted as names.',
    )

    expect(client.find).not.toHaveBeenCalled()
    expect(client.create).not.toHaveBeenCalled()
  })

  it('rejects more than the per-post tag limit before creating tags', async () => {
    const client = {
      create: vi.fn(async () => ({ id: 1, name: 'Custom' })),
      find: vi.fn(async () => ({ docs: [] })),
    }

    await expect(
      resolveEditorPostTagIds(
        client,
        Array.from({ length: EDITOR_POST_TAG_LIMIT + 1 }, (_, index) => ({
          name: `Tag ${index + 1}`,
        })),
      ),
    ).rejects.toThrow(`Select up to ${EDITOR_POST_TAG_LIMIT} tags.`)

    expect(client.find).not.toHaveBeenCalled()
    expect(client.create).not.toHaveBeenCalled()
  })

  it('rejects overlong custom tag names before creating tags', async () => {
    const client = {
      create: vi.fn(async () => ({ id: 1, name: 'Custom' })),
      find: vi.fn(async () => ({ docs: [] })),
    }

    await expect(
      resolveEditorPostTagIds(client, ['x'.repeat(EDITOR_POST_TAG_NAME_MAX_LENGTH + 1)]),
    ).rejects.toThrow(`Tag names must be ${EDITOR_POST_TAG_NAME_MAX_LENGTH} characters or fewer.`)

    expect(client.find).not.toHaveBeenCalled()
    expect(client.create).not.toHaveBeenCalled()
  })

  it('reports unavailable inactive duplicate tag names as validation errors', async () => {
    const client = {
      create: vi.fn(async () => {
        throw new Error('database unique constraint failed')
      }),
      find: vi.fn(async () => ({ docs: [] })),
    }

    await expect(resolveEditorPostTagIds(client, [{ name: 'Retired Tag' }])).rejects.toThrow(
      'Tag is unavailable.',
    )

    expect(client.find).toHaveBeenCalledTimes(2)
    expect(client.create).toHaveBeenCalledWith('tags', { name: 'Retired Tag' })
  })

  it('reuses exact active tag names even when fuzzy matches would be truncated', async () => {
    const exactTag = { id: 42, name: 'Campus Life' }
    const fuzzyMatches = Array.from({ length: 10 }, (_, index) => ({
      id: index + 1,
      name: `Campus Life ${index + 1}`,
    }))
    const client = {
      create: vi.fn(async () => {
        throw new Error('database unique constraint failed')
      }),
      find: vi.fn(
        async (
          _collection: string,
          options?: { where?: unknown },
        ) => {
          if (
            hasQueryCondition(options?.where, 'name', 'equals', 'Campus Life') ||
            hasQueryCondition(options?.where, 'slug', 'equals', 'campus-life')
          ) {
            return { docs: [exactTag] }
          }

          if (hasQueryCondition(options?.where, 'name', 'contains', 'Campus Life')) {
            return { docs: fuzzyMatches }
          }

          return { docs: [] }
        },
      ),
    }

    await expect(resolveEditorPostTagIds(client, ['Campus Life'])).resolves.toEqual([42])

    expect(client.create).not.toHaveBeenCalled()
  })
})
