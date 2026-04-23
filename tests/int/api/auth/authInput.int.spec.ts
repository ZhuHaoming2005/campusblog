import { describe, expect, it } from 'vitest'

describe('authInput', () => {
  it('normalizes email and sanitizes next paths for registration input', async () => {
    const { parseRegisterInput } = await import('@/app/api/auth/_lib/authInput')

    expect(
      parseRegisterInput({
        displayName: '  Campus User  ',
        email: '  USER@Example.COM ',
        next: 'https://evil.example.com/steal',
        password: 'lowercas',
      }),
    ).toEqual({
      displayName: 'Campus User',
      email: 'user@example.com',
      next: null,
      password: 'lowercas',
    })
  })

  it('rejects registration and reset passwords shorter than 8 characters', async () => {
    const { AuthInputError, parseResetPasswordInput } = await import(
      '@/app/api/auth/_lib/authInput'
    )
    const { parseRegisterInput } = await import('@/app/api/auth/_lib/authInput')

    expect(() =>
      parseRegisterInput({
        displayName: 'Campus User',
        email: 'user@example.com',
        password: 'short',
      }),
    ).toThrow(AuthInputError)

    expect(() =>
      parseResetPasswordInput({
        password: 'short',
        token: 'reset-token',
      }),
    ).toThrow(AuthInputError)
  })

  it('rejects registration and reset passwords that are only whitespace', async () => {
    const { AuthInputError, parseRegisterInput, parseResetPasswordInput } = await import(
      '@/app/api/auth/_lib/authInput'
    )

    expect(() =>
      parseRegisterInput({
        displayName: 'Campus User',
        email: 'user@example.com',
        password: '        ',
      }),
    ).toThrow(AuthInputError)

    expect(() =>
      parseResetPasswordInput({
        password: '\t\t\t\t\t\t\t\t',
        token: 'reset-token',
      }),
    ).toThrow(AuthInputError)
  })

  it('allows registration and reset passwords without uppercase, lowercase, or numeric composition rules', async () => {
    const { parseRegisterInput, parseResetPasswordInput } = await import(
      '@/app/api/auth/_lib/authInput'
    )

    expect(
      parseRegisterInput({
        displayName: 'Campus User',
        email: 'user@example.com',
        password: 'abcdefgh',
      }),
    ).toEqual({
      displayName: 'Campus User',
      email: 'user@example.com',
      next: null,
      password: 'abcdefgh',
    })

    expect(
      parseResetPasswordInput({
        password: '!!!!!!!!',
        token: 'reset-token',
      }),
    ).toEqual({
      next: null,
      password: '!!!!!!!!',
      token: 'reset-token',
    })
  })

  it('allows login passwords that are present but do not meet registration strength rules', async () => {
    const { parseLoginInput } = await import('@/app/api/auth/_lib/authInput')

    expect(
      parseLoginInput({
        email: 'user@example.com',
        password: 'password123',
      }),
    ).toEqual({
      email: 'user@example.com',
      next: null,
      password: 'password123',
    })
  })

  it('rejects clearly malformed email addresses as input errors', async () => {
    const { AuthInputError, parseLoginInput, parseRegisterInput } = await import(
      '@/app/api/auth/_lib/authInput'
    )

    expect(() =>
      parseRegisterInput({
        displayName: 'Campus User',
        email: 'a@b',
        password: 'abcdefgh',
      }),
    ).toThrow(AuthInputError)

    expect(() =>
      parseLoginInput({
        email: 'user@ example.com',
        password: 'password123',
      }),
    ).toThrow(AuthInputError)
  })

  it('rejects malicious-looking email values containing html-breaking characters', async () => {
    const { AuthInputError, parseRegisterInput } = await import(
      '@/app/api/auth/_lib/authInput'
    )

    expect(() =>
      parseRegisterInput({
        displayName: 'Campus User',
        email: 'user@example.com"><script>alert(1)</script>',
        password: 'abcdefgh',
      }),
    ).toThrow(AuthInputError)
  })
})
