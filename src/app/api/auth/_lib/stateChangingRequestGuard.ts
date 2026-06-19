const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

type PayloadConfigWithCSRF = {
  csrf?: readonly string[] | false | null
}

let configuredOriginsPromise: Promise<ReadonlySet<string>> | null = null

function normalizeOrigin(value: string | null | undefined) {
  if (!value) return null

  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

async function getConfiguredOrigins() {
  configuredOriginsPromise ??= import('@/payload.config').then(async ({ default: config }) => {
    const payloadConfig = (await config) as PayloadConfigWithCSRF
    const configuredOrigins = Array.isArray(payloadConfig.csrf) ? payloadConfig.csrf : []

    return new Set(
      configuredOrigins
        .map((value) => normalizeOrigin(value))
        .filter((origin): origin is string => Boolean(origin)),
    )
  })

  return configuredOriginsPromise
}

function csrfRejectedResponse() {
  return Response.json(
    {
      code: 'csrf_rejected',
      error: 'Invalid request origin.',
      ok: false,
    },
    { status: 403 },
  )
}

export async function rejectCrossSiteStateChangingRequest(
  request: Request,
): Promise<Response | null> {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return null

  const secFetchSite = request.headers.get('sec-fetch-site')?.trim().toLowerCase()
  if (secFetchSite === 'cross-site') {
    return csrfRejectedResponse()
  }

  const origin = request.headers.get('origin')
  if (origin) {
    const normalizedOrigin = normalizeOrigin(origin)
    const configuredOrigins = await getConfiguredOrigins()

    if (!normalizedOrigin || !configuredOrigins.has(normalizedOrigin)) {
      return csrfRejectedResponse()
    }
  }

  return null
}
