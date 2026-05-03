import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`post_likes\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`user_id\` integer NOT NULL,
  	\`post_id\` integer NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`post_id\`) REFERENCES \`posts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`post_likes_user_idx\` ON \`post_likes\` (\`user_id\`);`)
  await db.run(sql`CREATE INDEX \`post_likes_post_idx\` ON \`post_likes\` (\`post_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`post_likes_user_post_unique_idx\` ON \`post_likes\` (\`user_id\`, \`post_id\`);`)
  await db.run(sql`CREATE INDEX \`post_likes_updated_at_idx\` ON \`post_likes\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`post_likes_created_at_idx\` ON \`post_likes\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`post_bookmarks\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`user_id\` integer NOT NULL,
  	\`post_id\` integer NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`post_id\`) REFERENCES \`posts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`post_bookmarks_user_idx\` ON \`post_bookmarks\` (\`user_id\`);`)
  await db.run(sql`CREATE INDEX \`post_bookmarks_post_idx\` ON \`post_bookmarks\` (\`post_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`post_bookmarks_user_post_unique_idx\` ON \`post_bookmarks\` (\`user_id\`, \`post_id\`);`)
  await db.run(sql`CREATE INDEX \`post_bookmarks_updated_at_idx\` ON \`post_bookmarks\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`post_bookmarks_created_at_idx\` ON \`post_bookmarks\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`user_follows\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`follower_id\` integer NOT NULL,
  	\`following_id\` integer NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`follower_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`following_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`user_follows_follower_idx\` ON \`user_follows\` (\`follower_id\`);`)
  await db.run(sql`CREATE INDEX \`user_follows_following_idx\` ON \`user_follows\` (\`following_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`user_follows_follower_following_unique_idx\` ON \`user_follows\` (\`follower_id\`, \`following_id\`);`)
  await db.run(sql`CREATE INDEX \`user_follows_updated_at_idx\` ON \`user_follows\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`user_follows_created_at_idx\` ON \`user_follows\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`school_subscriptions\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`user_id\` integer NOT NULL,
  	\`school_id\` integer NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`school_id\`) REFERENCES \`schools\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`school_subscriptions_user_idx\` ON \`school_subscriptions\` (\`user_id\`);`)
  await db.run(sql`CREATE INDEX \`school_subscriptions_school_idx\` ON \`school_subscriptions\` (\`school_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`school_subscriptions_user_school_unique_idx\` ON \`school_subscriptions\` (\`user_id\`, \`school_id\`);`)
  await db.run(sql`CREATE INDEX \`school_subscriptions_updated_at_idx\` ON \`school_subscriptions\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`school_subscriptions_created_at_idx\` ON \`school_subscriptions\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`school_sub_channel_subscriptions\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`user_id\` integer NOT NULL,
  	\`school_id\` integer NOT NULL,
  	\`channel_id\` integer NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`school_id\`) REFERENCES \`schools\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`channel_id\`) REFERENCES \`school_sub_channels\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`school_sub_channel_subscriptions_user_idx\` ON \`school_sub_channel_subscriptions\` (\`user_id\`);`)
  await db.run(sql`CREATE INDEX \`school_sub_channel_subscriptions_school_idx\` ON \`school_sub_channel_subscriptions\` (\`school_id\`);`)
  await db.run(sql`CREATE INDEX \`school_sub_channel_subscriptions_channel_idx\` ON \`school_sub_channel_subscriptions\` (\`channel_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`school_sub_channel_subscriptions_user_channel_unique_idx\` ON \`school_sub_channel_subscriptions\` (\`user_id\`, \`channel_id\`);`)
  await db.run(sql`CREATE INDEX \`school_sub_channel_subscriptions_updated_at_idx\` ON \`school_sub_channel_subscriptions\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`school_sub_channel_subscriptions_created_at_idx\` ON \`school_sub_channel_subscriptions\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`post_likes_id\` integer REFERENCES post_likes(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`post_bookmarks_id\` integer REFERENCES post_bookmarks(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`user_follows_id\` integer REFERENCES user_follows(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`school_subscriptions_id\` integer REFERENCES school_subscriptions(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`school_sub_channel_subscriptions_id\` integer REFERENCES school_sub_channel_subscriptions(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_post_likes_id_idx\` ON \`payload_locked_documents_rels\` (\`post_likes_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_post_bookmarks_id_idx\` ON \`payload_locked_documents_rels\` (\`post_bookmarks_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_user_follows_id_idx\` ON \`payload_locked_documents_rels\` (\`user_follows_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_school_subscriptions_id_idx\` ON \`payload_locked_documents_rels\` (\`school_subscriptions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_school_sub_channel_subscri_idx\` ON \`payload_locked_documents_rels\` (\`school_sub_channel_subscriptions_id\`);`)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`post_likes\`;`)
  await db.run(sql`DROP TABLE \`post_bookmarks\`;`)
  await db.run(sql`DROP TABLE \`user_follows\`;`)
  await db.run(sql`DROP TABLE \`school_subscriptions\`;`)
  await db.run(sql`DROP TABLE \`school_sub_channel_subscriptions\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	\`media_id\` integer,
  	\`schools_id\` integer,
  	\`school_sub_channels_id\` integer,
  	\`tags_id\` integer,
  	\`posts_id\` integer,
  	\`comments_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`schools_id\`) REFERENCES \`schools\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`school_sub_channels_id\`) REFERENCES \`school_sub_channels\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`tags_id\`) REFERENCES \`tags\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`posts_id\`) REFERENCES \`posts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`comments_id\`) REFERENCES \`comments\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id", "media_id", "schools_id", "school_sub_channels_id", "tags_id", "posts_id", "comments_id") SELECT "id", "order", "parent_id", "path", "users_id", "media_id", "schools_id", "school_sub_channels_id", "tags_id", "posts_id", "comments_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_schools_id_idx\` ON \`payload_locked_documents_rels\` (\`schools_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_school_sub_channels_id_idx\` ON \`payload_locked_documents_rels\` (\`school_sub_channels_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_tags_id_idx\` ON \`payload_locked_documents_rels\` (\`tags_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_posts_id_idx\` ON \`payload_locked_documents_rels\` (\`posts_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_comments_id_idx\` ON \`payload_locked_documents_rels\` (\`comments_id\`);`)
}
