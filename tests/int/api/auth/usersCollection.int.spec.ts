import { describe, expect, it } from 'vitest'

import { Users } from '@/collections/Users'

describe('Users auth config', () => {
  it('requires verification, lockout, email templates, and closed public create access', () => {
    expect(Users.auth).toEqual(
      expect.objectContaining({
        forgotPassword: expect.objectContaining({
          expiration: expect.any(Number),
          generateEmailHTML: expect.any(Function),
          generateEmailSubject: expect.any(Function),
        }),
        lockTime: expect.any(Number),
        maxLoginAttempts: expect.any(Number),
        verify: expect.objectContaining({
          generateEmailHTML: expect.any(Function),
          generateEmailSubject: expect.any(Function),
        }),
      }),
    )

    expect(Users.access?.create?.({ req: { user: null } } as never)).not.toBe(true)
  })

  it('restricts admin panel access to admin-role users only', () => {
    expect(Users.access?.admin?.({ req: { user: { roles: ['admin'] } } } as never)).toBe(true)
    expect(Users.access?.admin?.({ req: { user: { roles: ['user'] } } } as never)).not.toBe(true)
    expect(Users.access?.admin?.({ req: { user: null } } as never)).not.toBe(true)
  })
})
