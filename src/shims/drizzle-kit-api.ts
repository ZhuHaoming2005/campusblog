const runtimeOnlyMigrationError = () => {
  throw new Error(
    'drizzle-kit/api is unavailable in the Next.js runtime bundle. Run schema and migration operations through the Payload CLI or deploy:database script instead.',
  )
}

export const generateDrizzleJson = runtimeOnlyMigrationError
export const generateMigration = runtimeOnlyMigrationError
export const pushSchema = runtimeOnlyMigrationError
export const upPgSnapshot = runtimeOnlyMigrationError
export const upSnapshot = runtimeOnlyMigrationError

export const generateSQLiteDrizzleJson = runtimeOnlyMigrationError
export const generateSQLiteMigration = runtimeOnlyMigrationError
export const pushSQLiteSchema = runtimeOnlyMigrationError
