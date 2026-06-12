import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`cities\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`generate_slug\` integer DEFAULT true,
  	\`slug\` text NOT NULL,
  	\`description\` text,
  	\`is_active\` integer DEFAULT true,
  	\`sort_order\` numeric DEFAULT 0,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`cities_name_idx\` ON \`cities\` (\`name\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`cities_slug_idx\` ON \`cities\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`cities_is_active_idx\` ON \`cities\` (\`is_active\`);`)
  await db.run(sql`CREATE INDEX \`cities_sort_order_idx\` ON \`cities\` (\`sort_order\`);`)
  await db.run(sql`CREATE INDEX \`cities_updated_at_idx\` ON \`cities\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`cities_created_at_idx\` ON \`cities\` (\`created_at\`);`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_comments\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`post_id\` integer NOT NULL,
  	\`author_id\` integer NOT NULL,
  	\`parent_id\` integer,
  	\`status\` text DEFAULT 'published' NOT NULL,
  	\`content\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`post_id\`) REFERENCES \`posts\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`author_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`comments\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_comments\`("id", "post_id", "author_id", "parent_id", "status", "content", "updated_at", "created_at") SELECT "id", "post_id", "author_id", "parent_id", "status", "content", "updated_at", "created_at" FROM \`comments\`;`)
  await db.run(sql`DROP TABLE \`comments\`;`)
  await db.run(sql`ALTER TABLE \`__new_comments\` RENAME TO \`comments\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`comments_post_idx\` ON \`comments\` (\`post_id\`);`)
  await db.run(sql`CREATE INDEX \`comments_author_idx\` ON \`comments\` (\`author_id\`);`)
  await db.run(sql`CREATE INDEX \`comments_parent_idx\` ON \`comments\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`comments_status_idx\` ON \`comments\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`comments_updated_at_idx\` ON \`comments\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`comments_created_at_idx\` ON \`comments\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`__new_post_likes\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`user_id\` integer NOT NULL,
  	\`post_id\` integer NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`post_id\`) REFERENCES \`posts\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_post_likes\`("id", "user_id", "post_id", "updated_at", "created_at") SELECT "id", "user_id", "post_id", "updated_at", "created_at" FROM \`post_likes\`;`)
  await db.run(sql`DROP TABLE \`post_likes\`;`)
  await db.run(sql`ALTER TABLE \`__new_post_likes\` RENAME TO \`post_likes\`;`)
  await db.run(sql`CREATE INDEX \`post_likes_user_idx\` ON \`post_likes\` (\`user_id\`);`)
  await db.run(sql`CREATE INDEX \`post_likes_post_idx\` ON \`post_likes\` (\`post_id\`);`)
  await db.run(sql`CREATE INDEX \`post_likes_updated_at_idx\` ON \`post_likes\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`post_likes_created_at_idx\` ON \`post_likes\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`user_post_idx\` ON \`post_likes\` (\`user_id\`,\`post_id\`);`)
  await db.run(sql`CREATE TABLE \`__new_post_bookmarks\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`user_id\` integer NOT NULL,
  	\`post_id\` integer NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`post_id\`) REFERENCES \`posts\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_post_bookmarks\`("id", "user_id", "post_id", "updated_at", "created_at") SELECT "id", "user_id", "post_id", "updated_at", "created_at" FROM \`post_bookmarks\`;`)
  await db.run(sql`DROP TABLE \`post_bookmarks\`;`)
  await db.run(sql`ALTER TABLE \`__new_post_bookmarks\` RENAME TO \`post_bookmarks\`;`)
  await db.run(sql`CREATE INDEX \`post_bookmarks_user_idx\` ON \`post_bookmarks\` (\`user_id\`);`)
  await db.run(sql`CREATE INDEX \`post_bookmarks_post_idx\` ON \`post_bookmarks\` (\`post_id\`);`)
  await db.run(sql`CREATE INDEX \`post_bookmarks_updated_at_idx\` ON \`post_bookmarks\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`post_bookmarks_created_at_idx\` ON \`post_bookmarks\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`user_post_1_idx\` ON \`post_bookmarks\` (\`user_id\`,\`post_id\`);`)
  await db.run(sql`CREATE TABLE \`__new_user_follows\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`follower_id\` integer NOT NULL,
  	\`following_id\` integer NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`follower_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`following_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_user_follows\`("id", "follower_id", "following_id", "updated_at", "created_at") SELECT "id", "follower_id", "following_id", "updated_at", "created_at" FROM \`user_follows\`;`)
  await db.run(sql`DROP TABLE \`user_follows\`;`)
  await db.run(sql`ALTER TABLE \`__new_user_follows\` RENAME TO \`user_follows\`;`)
  await db.run(sql`CREATE INDEX \`user_follows_follower_idx\` ON \`user_follows\` (\`follower_id\`);`)
  await db.run(sql`CREATE INDEX \`user_follows_following_idx\` ON \`user_follows\` (\`following_id\`);`)
  await db.run(sql`CREATE INDEX \`user_follows_updated_at_idx\` ON \`user_follows\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`user_follows_created_at_idx\` ON \`user_follows\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`follower_following_idx\` ON \`user_follows\` (\`follower_id\`,\`following_id\`);`)
  await db.run(sql`CREATE TABLE \`__new_school_subscriptions\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`user_id\` integer NOT NULL,
  	\`school_id\` integer NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`school_id\`) REFERENCES \`schools\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_school_subscriptions\`("id", "user_id", "school_id", "updated_at", "created_at") SELECT "id", "user_id", "school_id", "updated_at", "created_at" FROM \`school_subscriptions\`;`)
  await db.run(sql`DROP TABLE \`school_subscriptions\`;`)
  await db.run(sql`ALTER TABLE \`__new_school_subscriptions\` RENAME TO \`school_subscriptions\`;`)
  await db.run(sql`CREATE INDEX \`school_subscriptions_user_idx\` ON \`school_subscriptions\` (\`user_id\`);`)
  await db.run(sql`CREATE INDEX \`school_subscriptions_school_idx\` ON \`school_subscriptions\` (\`school_id\`);`)
  await db.run(sql`CREATE INDEX \`school_subscriptions_updated_at_idx\` ON \`school_subscriptions\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`school_subscriptions_created_at_idx\` ON \`school_subscriptions\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`user_school_idx\` ON \`school_subscriptions\` (\`user_id\`,\`school_id\`);`)
  await db.run(sql`CREATE TABLE \`__new_school_sub_channel_subscriptions\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`user_id\` integer NOT NULL,
  	\`school_id\` integer NOT NULL,
  	\`channel_id\` integer NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`school_id\`) REFERENCES \`schools\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`channel_id\`) REFERENCES \`school_sub_channels\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_school_sub_channel_subscriptions\`("id", "user_id", "school_id", "channel_id", "updated_at", "created_at") SELECT "id", "user_id", "school_id", "channel_id", "updated_at", "created_at" FROM \`school_sub_channel_subscriptions\`;`)
  await db.run(sql`DROP TABLE \`school_sub_channel_subscriptions\`;`)
  await db.run(sql`ALTER TABLE \`__new_school_sub_channel_subscriptions\` RENAME TO \`school_sub_channel_subscriptions\`;`)
  await db.run(sql`CREATE INDEX \`school_sub_channel_subscriptions_user_idx\` ON \`school_sub_channel_subscriptions\` (\`user_id\`);`)
  await db.run(sql`CREATE INDEX \`school_sub_channel_subscriptions_school_idx\` ON \`school_sub_channel_subscriptions\` (\`school_id\`);`)
  await db.run(sql`CREATE INDEX \`school_sub_channel_subscriptions_channel_idx\` ON \`school_sub_channel_subscriptions\` (\`channel_id\`);`)
  await db.run(sql`CREATE INDEX \`school_sub_channel_subscriptions_updated_at_idx\` ON \`school_sub_channel_subscriptions\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`school_sub_channel_subscriptions_created_at_idx\` ON \`school_sub_channel_subscriptions\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`user_channel_idx\` ON \`school_sub_channel_subscriptions\` (\`user_id\`,\`channel_id\`);`)
  await db.run(sql`ALTER TABLE \`users\` ADD \`school_id\` integer REFERENCES schools(id);`)
  await db.run(sql`CREATE INDEX \`users_school_idx\` ON \`users\` (\`school_id\`);`)
  await db.run(sql`ALTER TABLE \`schools\` ADD \`city_id\` integer REFERENCES cities(id);`)
  await db.run(sql`CREATE INDEX \`schools_city_idx\` ON \`schools\` (\`city_id\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`cities_id\` integer REFERENCES cities(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_cities_id_idx\` ON \`payload_locked_documents_rels\` (\`cities_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`cities\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_users\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`display_name\` text NOT NULL,
  	\`bio\` text,
  	\`avatar_id\` integer,
  	\`is_active\` integer DEFAULT true,
  	\`quota_bytes\` numeric DEFAULT 104857600,
  	\`used_bytes\` numeric DEFAULT 0,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`email\` text NOT NULL,
  	\`reset_password_token\` text,
  	\`reset_password_expiration\` text,
  	\`salt\` text,
  	\`hash\` text,
  	\`_verified\` integer,
  	\`_verificationtoken\` text,
  	\`login_attempts\` numeric DEFAULT 0,
  	\`lock_until\` text,
  	FOREIGN KEY (\`avatar_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_users\`("id", "display_name", "bio", "avatar_id", "is_active", "quota_bytes", "used_bytes", "updated_at", "created_at", "email", "reset_password_token", "reset_password_expiration", "salt", "hash", "_verified", "_verificationtoken", "login_attempts", "lock_until") SELECT "id", "display_name", "bio", "avatar_id", "is_active", "quota_bytes", "used_bytes", "updated_at", "created_at", "email", "reset_password_token", "reset_password_expiration", "salt", "hash", "_verified", "_verificationtoken", "login_attempts", "lock_until" FROM \`users\`;`)
  await db.run(sql`DROP TABLE \`users\`;`)
  await db.run(sql`ALTER TABLE \`__new_users\` RENAME TO \`users\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`users_display_name_idx\` ON \`users\` (\`display_name\`);`)
  await db.run(sql`CREATE INDEX \`users_avatar_idx\` ON \`users\` (\`avatar_id\`);`)
  await db.run(sql`CREATE INDEX \`users_is_active_idx\` ON \`users\` (\`is_active\`);`)
  await db.run(sql`CREATE INDEX \`users_updated_at_idx\` ON \`users\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`users_created_at_idx\` ON \`users\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`users_email_idx\` ON \`users\` (\`email\`);`)
  await db.run(sql`CREATE TABLE \`__new_schools\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`generate_slug\` integer DEFAULT true,
  	\`slug\` text NOT NULL,
  	\`description\` text,
  	\`is_active\` integer DEFAULT true,
  	\`sort_order\` numeric DEFAULT 0,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`INSERT INTO \`__new_schools\`("id", "name", "generate_slug", "slug", "description", "is_active", "sort_order", "updated_at", "created_at") SELECT "id", "name", "generate_slug", "slug", "description", "is_active", "sort_order", "updated_at", "created_at" FROM \`schools\`;`)
  await db.run(sql`DROP TABLE \`schools\`;`)
  await db.run(sql`ALTER TABLE \`__new_schools\` RENAME TO \`schools\`;`)
  await db.run(sql`CREATE UNIQUE INDEX \`schools_name_idx\` ON \`schools\` (\`name\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`schools_slug_idx\` ON \`schools\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`schools_is_active_idx\` ON \`schools\` (\`is_active\`);`)
  await db.run(sql`CREATE INDEX \`schools_sort_order_idx\` ON \`schools\` (\`sort_order\`);`)
  await db.run(sql`CREATE INDEX \`schools_updated_at_idx\` ON \`schools\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`schools_created_at_idx\` ON \`schools\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`__new_comments\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`post_id\` integer NOT NULL,
  	\`author_id\` integer NOT NULL,
  	\`parent_id\` integer,
  	\`status\` text DEFAULT 'published' NOT NULL,
  	\`content\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`post_id\`) REFERENCES \`posts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`author_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`comments\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_comments\`("id", "post_id", "author_id", "parent_id", "status", "content", "updated_at", "created_at") SELECT "id", "post_id", "author_id", "parent_id", "status", "content", "updated_at", "created_at" FROM \`comments\`;`)
  await db.run(sql`DROP TABLE \`comments\`;`)
  await db.run(sql`ALTER TABLE \`__new_comments\` RENAME TO \`comments\`;`)
  await db.run(sql`CREATE INDEX \`comments_post_idx\` ON \`comments\` (\`post_id\`);`)
  await db.run(sql`CREATE INDEX \`comments_author_idx\` ON \`comments\` (\`author_id\`);`)
  await db.run(sql`CREATE INDEX \`comments_parent_idx\` ON \`comments\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`comments_status_idx\` ON \`comments\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`comments_updated_at_idx\` ON \`comments\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`comments_created_at_idx\` ON \`comments\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`__new_post_likes\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`user_id\` integer NOT NULL,
  	\`post_id\` integer NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`post_id\`) REFERENCES \`posts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_post_likes\`("id", "user_id", "post_id", "updated_at", "created_at") SELECT "id", "user_id", "post_id", "updated_at", "created_at" FROM \`post_likes\`;`)
  await db.run(sql`DROP TABLE \`post_likes\`;`)
  await db.run(sql`ALTER TABLE \`__new_post_likes\` RENAME TO \`post_likes\`;`)
  await db.run(sql`CREATE INDEX \`post_likes_user_idx\` ON \`post_likes\` (\`user_id\`);`)
  await db.run(sql`CREATE INDEX \`post_likes_post_idx\` ON \`post_likes\` (\`post_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`post_likes_user_post_unique_idx\` ON \`post_likes\` (\`user_id\`,\`post_id\`);`)
  await db.run(sql`CREATE INDEX \`post_likes_updated_at_idx\` ON \`post_likes\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`post_likes_created_at_idx\` ON \`post_likes\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`__new_post_bookmarks\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`user_id\` integer NOT NULL,
  	\`post_id\` integer NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`post_id\`) REFERENCES \`posts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_post_bookmarks\`("id", "user_id", "post_id", "updated_at", "created_at") SELECT "id", "user_id", "post_id", "updated_at", "created_at" FROM \`post_bookmarks\`;`)
  await db.run(sql`DROP TABLE \`post_bookmarks\`;`)
  await db.run(sql`ALTER TABLE \`__new_post_bookmarks\` RENAME TO \`post_bookmarks\`;`)
  await db.run(sql`CREATE INDEX \`post_bookmarks_user_idx\` ON \`post_bookmarks\` (\`user_id\`);`)
  await db.run(sql`CREATE INDEX \`post_bookmarks_post_idx\` ON \`post_bookmarks\` (\`post_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`post_bookmarks_user_post_unique_idx\` ON \`post_bookmarks\` (\`user_id\`,\`post_id\`);`)
  await db.run(sql`CREATE INDEX \`post_bookmarks_updated_at_idx\` ON \`post_bookmarks\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`post_bookmarks_created_at_idx\` ON \`post_bookmarks\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`__new_user_follows\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`follower_id\` integer NOT NULL,
  	\`following_id\` integer NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`follower_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`following_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_user_follows\`("id", "follower_id", "following_id", "updated_at", "created_at") SELECT "id", "follower_id", "following_id", "updated_at", "created_at" FROM \`user_follows\`;`)
  await db.run(sql`DROP TABLE \`user_follows\`;`)
  await db.run(sql`ALTER TABLE \`__new_user_follows\` RENAME TO \`user_follows\`;`)
  await db.run(sql`CREATE INDEX \`user_follows_follower_idx\` ON \`user_follows\` (\`follower_id\`);`)
  await db.run(sql`CREATE INDEX \`user_follows_following_idx\` ON \`user_follows\` (\`following_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`user_follows_follower_following_unique_idx\` ON \`user_follows\` (\`follower_id\`,\`following_id\`);`)
  await db.run(sql`CREATE INDEX \`user_follows_updated_at_idx\` ON \`user_follows\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`user_follows_created_at_idx\` ON \`user_follows\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`__new_school_subscriptions\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`user_id\` integer NOT NULL,
  	\`school_id\` integer NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`school_id\`) REFERENCES \`schools\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_school_subscriptions\`("id", "user_id", "school_id", "updated_at", "created_at") SELECT "id", "user_id", "school_id", "updated_at", "created_at" FROM \`school_subscriptions\`;`)
  await db.run(sql`DROP TABLE \`school_subscriptions\`;`)
  await db.run(sql`ALTER TABLE \`__new_school_subscriptions\` RENAME TO \`school_subscriptions\`;`)
  await db.run(sql`CREATE INDEX \`school_subscriptions_user_idx\` ON \`school_subscriptions\` (\`user_id\`);`)
  await db.run(sql`CREATE INDEX \`school_subscriptions_school_idx\` ON \`school_subscriptions\` (\`school_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`school_subscriptions_user_school_unique_idx\` ON \`school_subscriptions\` (\`user_id\`,\`school_id\`);`)
  await db.run(sql`CREATE INDEX \`school_subscriptions_updated_at_idx\` ON \`school_subscriptions\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`school_subscriptions_created_at_idx\` ON \`school_subscriptions\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`__new_school_sub_channel_subscriptions\` (
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
  await db.run(sql`INSERT INTO \`__new_school_sub_channel_subscriptions\`("id", "user_id", "school_id", "channel_id", "updated_at", "created_at") SELECT "id", "user_id", "school_id", "channel_id", "updated_at", "created_at" FROM \`school_sub_channel_subscriptions\`;`)
  await db.run(sql`DROP TABLE \`school_sub_channel_subscriptions\`;`)
  await db.run(sql`ALTER TABLE \`__new_school_sub_channel_subscriptions\` RENAME TO \`school_sub_channel_subscriptions\`;`)
  await db.run(sql`CREATE INDEX \`school_sub_channel_subscriptions_user_idx\` ON \`school_sub_channel_subscriptions\` (\`user_id\`);`)
  await db.run(sql`CREATE INDEX \`school_sub_channel_subscriptions_school_idx\` ON \`school_sub_channel_subscriptions\` (\`school_id\`);`)
  await db.run(sql`CREATE INDEX \`school_sub_channel_subscriptions_channel_idx\` ON \`school_sub_channel_subscriptions\` (\`channel_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`school_sub_channel_subscriptions_user_channel_unique_idx\` ON \`school_sub_channel_subscriptions\` (\`user_id\`,\`channel_id\`);`)
  await db.run(sql`CREATE INDEX \`school_sub_channel_subscriptions_updated_at_idx\` ON \`school_sub_channel_subscriptions\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`school_sub_channel_subscriptions_created_at_idx\` ON \`school_sub_channel_subscriptions\` (\`created_at\`);`)
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
  	\`post_likes_id\` integer,
  	\`post_bookmarks_id\` integer,
  	\`user_follows_id\` integer,
  	\`school_subscriptions_id\` integer,
  	\`school_sub_channel_subscriptions_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`schools_id\`) REFERENCES \`schools\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`school_sub_channels_id\`) REFERENCES \`school_sub_channels\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`tags_id\`) REFERENCES \`tags\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`posts_id\`) REFERENCES \`posts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`comments_id\`) REFERENCES \`comments\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`post_likes_id\`) REFERENCES \`post_likes\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`post_bookmarks_id\`) REFERENCES \`post_bookmarks\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`user_follows_id\`) REFERENCES \`user_follows\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`school_subscriptions_id\`) REFERENCES \`school_subscriptions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`school_sub_channel_subscriptions_id\`) REFERENCES \`school_sub_channel_subscriptions\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id", "media_id", "schools_id", "school_sub_channels_id", "tags_id", "posts_id", "comments_id", "post_likes_id", "post_bookmarks_id", "user_follows_id", "school_subscriptions_id", "school_sub_channel_subscriptions_id") SELECT "id", "order", "parent_id", "path", "users_id", "media_id", "schools_id", "school_sub_channels_id", "tags_id", "posts_id", "comments_id", "post_likes_id", "post_bookmarks_id", "user_follows_id", "school_subscriptions_id", "school_sub_channel_subscriptions_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
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
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_post_likes_id_idx\` ON \`payload_locked_documents_rels\` (\`post_likes_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_post_bookmarks_id_idx\` ON \`payload_locked_documents_rels\` (\`post_bookmarks_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_user_follows_id_idx\` ON \`payload_locked_documents_rels\` (\`user_follows_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_school_subscriptions_id_idx\` ON \`payload_locked_documents_rels\` (\`school_subscriptions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_school_sub_channel_subscri_idx\` ON \`payload_locked_documents_rels\` (\`school_sub_channel_subscriptions_id\`);`)
}
