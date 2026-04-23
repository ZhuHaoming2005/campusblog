export function buildFormRedirectURL(args: {
  baseURL: URL
  pathname: string
  params?: Record<string, string | null | undefined>
}) {
  const redirectURL = new URL(args.pathname, args.baseURL)

  for (const [key, value] of Object.entries(args.params ?? {})) {
    if (typeof value === 'string' && value.length > 0) {
      redirectURL.searchParams.set(key, value)
    }
  }

  return redirectURL
}

