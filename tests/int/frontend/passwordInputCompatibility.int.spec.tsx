import React from 'react'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import PasswordInput from '@/components/auth/PasswordInput'

const dictionary = {
  auth: {
    hidePassword: 'Hide password',
    showPassword: 'Show password',
  },
}

describe('PasswordInput browser compatibility', () => {
  afterEach(() => {
    cleanup()
  })

  it('marks password fields for browser-native password control suppression', () => {
    const { container } = render(
      <PasswordInput
        autoComplete="current-password"
        name="password"
        t={dictionary}
      />,
    )

    const input = container.querySelector('input[type="password"]')

    expect(input?.classList.contains('campus-password-input')).toBe(true)
  })

  it('hides Edge and Chromium built-in password field controls while preserving the custom control', () => {
    const css = readFileSync(
      path.join(process.cwd(), 'src/app/(frontend)/styles.css'),
      'utf8',
    )

    expect(css).toMatch(
      /\.campus-password-input::-ms-reveal,\s*\.campus-password-input::-ms-clear\s*\{[\s\S]*display:\s*none[\s\S]*\}/,
    )
    expect(css).toMatch(
      /\.campus-password-input::-webkit-credentials-auto-fill-button\s*\{[\s\S]*(?:display:\s*none|visibility:\s*hidden)[\s\S]*\}/,
    )
  })
})
