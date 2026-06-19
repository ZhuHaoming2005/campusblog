import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import UserProfileEditor from '@/components/user/UserProfileEditor'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

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
          schoolLabel: 'School',
          schoolNone: 'No school',
          schoolSearchPlaceholder: 'Search schools',
          savingProfile: 'Saving',
        }}
        schoolId={10}
        schoolOptions={[
          { id: 10, name: 'North Campus' },
          { id: 11, name: 'South Campus' },
        ]}
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

  it('submits the selected school with profile updates', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({}),
      ok: true,
    })
    vi.stubGlobal('fetch', fetchMock)

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
          schoolLabel: 'School',
          schoolNone: 'No school',
          schoolSearchPlaceholder: 'Search schools',
          savingProfile: 'Saving',
        }}
        schoolId={10}
        schoolOptions={[
          { id: 10, name: 'North Campus' },
          { id: 11, name: 'South Campus' },
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('combobox', { name: 'School' }))
    fireEvent.change(screen.getByPlaceholderText('Search schools'), { target: { value: 'South' } })
    expect(screen.queryByRole('option', { name: 'North Campus' })).toBeNull()
    fireEvent.click(screen.getByRole('option', { name: 'South Campus' }))
    fireEvent.click(screen.getByTestId('save-profile-button'))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toMatchObject({
      bio: 'Bio',
      displayName: 'Campus Writer',
      school: 11,
    })
  })
})
