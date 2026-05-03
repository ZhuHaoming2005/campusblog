import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-d1-sqlite'

function createCommentsTableSQL(tableName: string, deleteAction: 'cascade' | 'set null') {
  return sql`CREATE TABLE ${sql.raw(`\`${tableName}\``)} (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`post_id\` integer NOT NULL,
  	\`author_id\` integer NOT NULL,
  	\`parent_id\` integer,
  	\`status\` text DEFAULT 'published' NOT NULL,
  	\`content\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`post_id\`) REFERENCES \`posts\`(\`id\`) ON UPDATE no action ON DELETE ${sql.raw(deleteAction)},
  	FOREIGN KEY (\`author_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE ${sql.raw(deleteAction)},
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`comments\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `
}

async function rebuildCommentsTable(
  db: MigrateUpArgs['db'],
  deleteAction: 'cascade' | 'set null',
) {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(createCommentsTableSQL('__new_comments', deleteAction))
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
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await rebuildCommentsTable(db, 'cascade')
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await rebuildCommentsTable(db, 'set null')
}
