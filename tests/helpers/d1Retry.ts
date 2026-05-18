function getErrorText(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error)
  }

  const cause = 'cause' in error ? getErrorText(error.cause) : ''
  return `${error.message} ${cause}`
}

function isTransientD1Lock(error: unknown): boolean {
  const message = getErrorText(error)
  return (
    message.includes('SQLITE_BUSY') ||
    message.includes('database is locked') ||
    (message.includes('D1_ERROR') && message.includes('internal error'))
  )
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function withD1Retry<T>(operation: () => Promise<T>): Promise<T> {
  const maxAttempts = 5
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (!isTransientD1Lock(error) || attempt === maxAttempts) {
        throw error
      }

      await delay(100 * attempt)
    }
  }

  throw lastError
}
