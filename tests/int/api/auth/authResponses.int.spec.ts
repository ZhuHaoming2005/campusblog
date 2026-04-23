import { describe, expect, it } from 'vitest'

import { appendSetCookieHeaders } from '@/app/api/auth/_lib/authResponses'

describe('auth response helpers', () => {
  it('forwards Cloudflare Workers Set-Cookie headers from getAll', () => {
    const source = {
      get: (): string | null => null,
      getAll: (name: string) =>
        name === 'Set-Cookie'
          ? [
              'payload-token=abc; Path=/; HttpOnly',
              'payload-token.sig=def; Path=/; HttpOnly',
            ]
          : [],
    } as unknown as Headers
    const target = new Headers()

    appendSetCookieHeaders(source, target)

    const forwarded = target.get('set-cookie')
    expect(forwarded).toContain('payload-token=abc')
    expect(forwarded).toContain('payload-token.sig=def')
  })
})
