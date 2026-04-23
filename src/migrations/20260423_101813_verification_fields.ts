import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`users\` ADD \`_verified\` integer;`)
  await db.run(sql`ALTER TABLE \`users\` ADD \`_verificationtoken\` text;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`_verified\`;`)
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`_verificationtoken\`;`)
}
