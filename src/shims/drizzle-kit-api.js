function unavailable() {
  throw new Error(
    'drizzle-kit/api is only available during Payload migration and schema tooling. It is intentionally excluded from the Next/OpenNext runtime bundle.',
  )
}

export const generateSQLiteDrizzleJson = unavailable
export const generateSQLiteMigration = unavailable
export const pushSQLiteSchema = unavailable
