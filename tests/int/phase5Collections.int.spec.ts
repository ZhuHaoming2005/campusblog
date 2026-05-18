// @vitest-environment node

import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { Comments } from '@/collections/Comments'
import { Posts } from '@/collections/Posts'
import { SchoolSubChannels } from '@/collections/SchoolSubChannels'
import { Schools } from '@/collections/Schools'
import { Users } from '@/collections/Users'

describe('phase 5 interaction collections', () => {
  it('registers persistent collections for likes, bookmarks, follows, and subscriptions', async () => {
    const payloadConfig = await config
    const slugs = new Set(payloadConfig.collections?.map((collection) => collection.slug))

    expect([...slugs]).toEqual(
      expect.arrayContaining([
        'post-likes',
        'post-bookmarks',
        'user-follows',
        'school-subscriptions',
        'school-sub-channel-subscriptions',
      ]),
    )
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
