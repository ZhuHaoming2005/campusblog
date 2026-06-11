// @vitest-environment node

import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'
import { Comments } from '@/collections/Comments'
import { Posts } from '@/collections/Posts'
import { SchoolSubChannels } from '@/collections/SchoolSubChannels'
import { Schools } from '@/collections/Schools'
import { Users } from '@/collections/Users'

function readMigrationContaining(pattern: string) {
  const migrationDir = path.resolve(process.cwd(), 'src/migrations')
  const migrationName = readdirSync(migrationDir).find((name) => {
    if (!name.endsWith('.ts') || name === 'index.ts') return false

    return readFileSync(path.join(migrationDir, name), 'utf8').includes(pattern)
  })

  expect(migrationName).toBeTruthy()

  return readFileSync(path.join(migrationDir, migrationName as string), 'utf8')
}

describe('phase 5 interaction collections', () => {
  it('registers persistent collections for likes, bookmarks, follows, and subscriptions', async () => {
    const payloadConfig = await config
    const slugs = new Set(payloadConfig.collections?.map((collection) => collection.slug))

    expect([...slugs]).toEqual(
      expect.arrayContaining([
        'cities',
        'post-likes',
        'post-bookmarks',
        'user-follows',
        'school-subscriptions',
        'school-sub-channel-subscriptions',
      ]),
    )
  })

  it('registers cities as active frontend-visible locations managed by admins', async () => {
    const payloadConfig = await config
    const cities = payloadConfig.collections?.find((collection) => collection.slug === 'cities')

    expect(cities).toBeTruthy()
    expect(cities?.admin).toMatchObject({
      defaultColumns: ['name', 'isActive', 'sortOrder', 'updatedAt'],
      useAsTitle: 'name',
    })
    expect(cities?.access).toMatchObject({
      read: expect.any(Function),
      create: expect.any(Function),
      update: expect.any(Function),
      delete: expect.any(Function),
    })
    expect(cities?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'name', type: 'text', required: true, unique: true }),
        expect.objectContaining({ name: 'isActive', type: 'checkbox', defaultValue: true }),
        expect.objectContaining({ name: 'sortOrder', type: 'number', defaultValue: 0 }),
      ]),
    )
  })

  it('does not run D1 dev schema push during app startup', async () => {
    const payloadConfig = await config
    const dbAdapter = payloadConfig.db.init({
      payload: {
        config: payloadConfig,
        logger: {
          debug: vi.fn(),
          error: vi.fn(),
          info: vi.fn(),
          warn: vi.fn(),
        },
      },
    } as never)

    expect((dbAdapter as { push?: boolean }).push).toBe(false)
  })

  it('keeps comments moderatable through published and hidden states', () => {
    const statusField = Comments.fields.find((field) => 'name' in field && field.name === 'status')

    expect(statusField).toMatchObject({
      type: 'select',
      options: expect.arrayContaining([
        expect.objectContaining({ value: 'published' }),
        expect.objectContaining({ value: 'hidden' }),
      ]),
    })
  })

  it('uses database-backed uniqueness for idempotent relations', async () => {
    const payloadConfig = await config
    const collectionBySlug = new Map(
      payloadConfig.collections?.map((collection) => [collection.slug, collection]),
    )

    expect(collectionBySlug.get('post-likes')?.indexes).toEqual(
      expect.arrayContaining([expect.objectContaining({ fields: ['user', 'post'], unique: true })]),
    )
    expect(collectionBySlug.get('post-bookmarks')?.indexes).toEqual(
      expect.arrayContaining([expect.objectContaining({ fields: ['user', 'post'], unique: true })]),
    )
    expect(collectionBySlug.get('user-follows')?.indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fields: ['follower', 'following'], unique: true }),
      ]),
    )
    expect(collectionBySlug.get('school-subscriptions')?.indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fields: ['user', 'school'], unique: true }),
      ]),
    )
    expect(collectionBySlug.get('school-sub-channel-subscriptions')?.indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fields: ['user', 'channel'], unique: true }),
      ]),
    )
  })

  it('cleans dependent interaction rows before hard-deleting parent documents', () => {
    expect(Posts.hooks?.beforeDelete?.map((hook) => hook.name)).toContain(
      'cleanupPostInteractionsBeforeDelete',
    )
    expect(Users.hooks?.beforeDelete?.map((hook) => hook.name)).toContain(
      'cleanupUserInteractionsBeforeDelete',
    )
    expect(Schools.hooks?.beforeDelete?.map((hook) => hook.name)).toContain(
      'cleanupSchoolSubscriptionsBeforeDelete',
    )
    expect(SchoolSubChannels.hooks?.beforeDelete?.map((hook) => hook.name)).toContain(
      'cleanupSchoolSubChannelSubscriptionsBeforeDelete',
    )
  })

  it('limits comment creation to verified active users and moderation to admins', () => {
    expect(Comments.access?.create).toBeTypeOf('function')

    const statusField = Comments.fields.find((field) => 'name' in field && field.name === 'status')
    expect(statusField).toMatchObject({
      access: {
        create: expect.any(Function),
        update: expect.any(Function),
      },
    })
  })

  it('allows users to store their own active school preference', () => {
    const schoolField = Users.fields.find((field) => 'name' in field && field.name === 'school')

    expect(schoolField).toMatchObject({
      type: 'relationship',
      relationTo: 'schools',
      index: true,
      filterOptions: {
        isActive: {
          equals: true,
        },
      },
    })
  })

  it('allows schools to reference an active city', () => {
    const cityField = Schools.fields.find((field) => 'name' in field && field.name === 'city')

    expect(cityField).toMatchObject({
      type: 'relationship',
      relationTo: 'cities',
      index: true,
      filterOptions: {
        isActive: {
          equals: true,
        },
      },
    })
  })

  it('keeps user school optional when Payload submits it as undefined', async () => {
    const beforeValidateHooks = Users.hooks?.beforeValidate ?? []
    const validateUserSchool = beforeValidateHooks.find((hook) => hook.name === 'validateUserSchool')
    const data = {
      displayName: 'First Admin',
      school: undefined as number | string | null | undefined,
    }
    const req = {
      payload: {
        find: vi.fn(),
      },
    }

    expect(validateUserSchool).toEqual(expect.any(Function))
    await expect(
      validateUserSchool?.({
        collection: Users,
        context: {},
        data,
        operation: 'create',
        req,
      } as never),
    ).resolves.toBe(data)
    expect(req.payload.find).not.toHaveBeenCalled()
  })

  it('normalizes submitted user school ids to the active school document id', async () => {
    const beforeValidateHooks = Users.hooks?.beforeValidate ?? []
    const validateUserSchool = beforeValidateHooks.find((hook) => hook.name === 'validateUserSchool')
    const data: { school: number | string | null } = {
      school: '12',
    }
    const req = {
      payload: {
        find: vi.fn(async () => ({
          docs: [{ id: 12 }],
        })),
      },
    }

    expect(validateUserSchool).toEqual(expect.any(Function))
    await expect(
      validateUserSchool?.({
        collection: Users,
        context: {},
        data,
        operation: 'update',
        req,
      } as never),
    ).resolves.toBe(data)
    expect(data.school).toBe(12)
  })

  it('rejects inactive schools for user school preferences inside the Payload lifecycle', async () => {
    const beforeValidateHooks = Users.hooks?.beforeValidate ?? []
    const validateUserSchool = beforeValidateHooks.find((hook) => hook.name === 'validateUserSchool')
    const req = {
      payload: {
        find: vi.fn(async () => ({
          docs: [],
        })),
      },
    }

    expect(validateUserSchool).toEqual(expect.any(Function))
    await expect(
      validateUserSchool?.({
        collection: Users,
        context: {},
        data: {
          school: 12,
        },
        operation: 'update',
        req,
      } as never),
    ).rejects.toThrow('School must be active.')
    expect(req.payload.find).toHaveBeenCalledWith({
      collection: 'schools',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      req,
      where: {
        and: [
          {
            id: {
              equals: 12,
            },
          },
          {
            isActive: {
              equals: true,
            },
          },
        ],
      },
    })
  })

  it('adds a nullable users.school relationship column in the generated migration', () => {
    const migration = readMigrationContaining('CREATE INDEX \\`users_school_idx\\`')

    expect(migration).toContain('ALTER TABLE \\`users\\` ADD \\`school_id\\` integer REFERENCES schools(id);')
    expect(migration).toContain('CREATE INDEX \\`users_school_idx\\` ON \\`users\\` (\\`school_id\\`);')
  })

  it('creates city records and links schools to cities in the city migration', () => {
    const migration = readMigrationContaining('CREATE TABLE \\`cities\\`')

    expect(migration).toContain('CREATE TABLE \\`cities\\`')
    expect(migration).toContain('CREATE UNIQUE INDEX \\`cities_slug_idx\\`')
    expect(migration).toContain('ALTER TABLE \\`schools\\` ADD \\`city_id\\` integer REFERENCES cities(id);')
    expect(migration).toContain('CREATE INDEX \\`schools_city_idx\\` ON \\`schools\\` (\\`city_id\\`);')
  })

  it('creates cascade foreign keys and unique indexes in the phase 5 migration', () => {
    const migration = readFileSync(
      path.resolve(process.cwd(), 'src/migrations/20260503_134555.ts'),
      'utf8',
    )

    expect(migration).toContain('CREATE UNIQUE INDEX \\`post_likes_user_post_unique_idx\\`')
    expect(migration).toContain('CREATE UNIQUE INDEX \\`post_bookmarks_user_post_unique_idx\\`')
    expect(migration).toContain('CREATE UNIQUE INDEX \\`user_follows_follower_following_unique_idx\\`')
    expect(migration).toContain('CREATE UNIQUE INDEX \\`school_subscriptions_user_school_unique_idx\\`')
    expect(migration).toContain(
      'CREATE UNIQUE INDEX \\`school_sub_channel_subscriptions_user_channel_unique_idx\\`',
    )
    expect(migration).toContain(
      'FOREIGN KEY (\\`post_id\\`) REFERENCES \\`posts\\`(\\`id\\`) ON UPDATE no action ON DELETE cascade',
    )
    expect(migration).toContain(
      'FOREIGN KEY (\\`channel_id\\`) REFERENCES \\`school_sub_channels\\`(\\`id\\`) ON UPDATE no action ON DELETE cascade',
    )
  })
})
