import { describe, expect, it } from 'vitest'

import { resolvePayloadSecret } from '@/utils/payloadSecret'

describe('resolvePayloadSecret', () => {
  it('uses process env when present', () => {
    expect(
      resolvePayloadSecret({
        processEnv: { PAYLOAD_SECRET: 'from-process' },
        cloudflareEnv: { PAYLOAD_SECRET: 'from-cloudflare' },
      }),
    ).toBe('from-process')
  })

  it('falls back to cloudflare binding when process env is missing', () => {
    expect(
      resolvePayloadSecret({
        processEnv: {},
        cloudflareEnv: { PAYLOAD_SECRET: 'from-cloudflare' },
      }),
    ).toBe('from-cloudflare')
  })

  it('returns an empty string when neither source provides a secret', () => {
    expect(
      resolvePayloadSecret({
        processEnv: {},
        cloudflareEnv: {},
      }),
    ).toBe('')
  })
})
