// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore OpenNext generates this file during the Cloudflare build step.
import openNextWorker from './.open-next/worker.js'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore OpenNext generates this file during the Cloudflare build step.
export { DOQueueHandler } from './.open-next/.build/durable-objects/queue.js'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore OpenNext generates this file during the Cloudflare build step.
export { DOShardedTagCache } from './.open-next/.build/durable-objects/sharded-tag-cache.js'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore OpenNext generates this file during the Cloudflare build step.
export { BucketCachePurge } from './.open-next/.build/durable-objects/bucket-cache-purge.js'

import { runMediaCleanupCron } from './src/worker/mediaCleanupCron'

type WorkerEnv = Record<string, unknown>

const RSC_QUERY_PARAM = '_rsc'
const RSC_REQUEST_HEADER = 'rsc'
const NO_STORE_CACHE_CONTROL = 'no-store, no-cache, max-age=0, must-revalidate'
const FLIGHT_VARY_HEADERS = [
  'RSC',
  'Next-Router-State-Tree',
  'Next-Router-Prefetch',
  'Next-Router-Segment-Prefetch',
  'Next-URL',
]

function isRSCRequest(request: Request) {
  const url = new URL(request.url)
  return request.headers.get(RSC_REQUEST_HEADER) === '1' || url.searchParams.has(RSC_QUERY_PARAM)
}

function isDocumentRequest(request: Request, response: Response) {
  if (request.method !== 'GET' || isRSCRequest(request)) return false

  const accept = request.headers.get('accept') ?? ''
  const contentType = response.headers.get('content-type') ?? ''

  return accept.includes('text/html') && contentType.includes('text/html')
}

function appendVaryHeaders(headers: Headers, headerNames: string[]) {
  const existing = headers
    .get('vary')
    ?.split(',')
    .map((header) => header.trim())
    .filter(Boolean)

  const varyHeaders = existing ?? []
  const seen = new Set(varyHeaders.map((header) => header.toLowerCase()))

  for (const headerName of headerNames) {
    const key = headerName.toLowerCase()
    if (seen.has(key)) continue

    varyHeaders.push(headerName)
    seen.add(key)
  }

  if (varyHeaders.length > 0) {
    headers.set('Vary', varyHeaders.join(', '))
  }
}

function preventSharedPageCache(request: Request, response: Response) {
  const isFlightResponse = isRSCRequest(request)

  if (!isFlightResponse && !isDocumentRequest(request, response)) {
    return response
  }

  const headers = new Headers(response.headers)

  headers.set('Cache-Control', NO_STORE_CACHE_CONTROL)
  headers.set('CDN-Cache-Control', 'no-store')
  headers.set('Cloudflare-CDN-Cache-Control', 'no-store')

  if (isFlightResponse) {
    appendVaryHeaders(headers, FLIGHT_VARY_HEADERS)
  }

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  })
}

const worker = {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext) {
    const response = await openNextWorker.fetch(request, env, ctx)
    return preventSharedPageCache(request, response)
  },

  async scheduled(_event: ScheduledEvent, env: WorkerEnv, _ctx: ExecutionContext) {
    try {
      const result = await runMediaCleanupCron(env as { D1: D1Database; R2: R2Bucket })

      console.info(
        `[media-cleanup:cron] scanned=${result.scannedCount} referenced=${result.referencedCount} deleted=${result.deletedIds.length}`,
      )
    } catch (error) {
      console.error(
        `[media-cleanup:cron] failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      )
      throw error
    }
  },
}

export default worker
