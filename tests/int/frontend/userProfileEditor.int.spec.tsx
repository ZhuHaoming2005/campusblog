import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import UserProfileEditor from '@/components/user/UserProfileEditor'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

describe('UserProfileEditor primary action', () => {
  it('renders the updated save-profile primary button style', () => {
    render(
      <UserProfileEditor
        userId="1"
        displayName="Campus Writer"
        email="writer@example.com"
        bio="Bio"
        copy={{
          avatarHint: 'Hint',
          avatarUpload: 'Upload',
          bioLabel: 'Bio',
          displayNameLabel: 'Display name',
          emailLabel: 'Email',
          noBio: 'No bio',
          profileError: 'Error',
          profileSaved: 'Saved',
          resetPassword: 'Change password',
          saveProfile: 'Save profile',
          savingProfile: 'Saving',
        }}
      />,
    )

    const resetPasswordLink = screen.getByRole('link', { name: 'Change password' })
    const button = screen.getByTestId('save-profile-button')
    expect(resetPasswordLink.getAttribute('href')).toBe('/forgot-password?next=%2Fuser%2Fme')
    expect(button.className).toContain('h-11')
    expect(button.className).toContain('rounded-full')
    expect(button.className).toContain('bg-campus-primary')
    expect(button.className).toContain('hover:bg-campus-primary')
    expect(button.className).toContain('hover:-translate-y-0.5')
  })
})
