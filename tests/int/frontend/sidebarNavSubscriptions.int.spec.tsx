import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import SidebarNav from '@/components/layout/SidebarNav'
import { TooltipProvider } from '@/components/ui/tooltip'

let pathnameMock = '/'

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock,
  useRouter: () => ({ refresh: vi.fn() }),
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('SidebarNav subscriptions', () => {
  const dictionary = {
    common: {
      appName: 'Campus Blog',
      appTagline: 'Campus Excellence',
      cancel: 'Cancel',
      createPost: 'Create Post',
      languageEn: 'English',
      languageLabel: 'Language',
      languageZh: '中文',
      login: 'Login',
      register: 'Register',
      userCenter: 'User Center',
    },
    sidebar: {
      addChannel: 'Add Channel',
      channels: 'Channels',
      discover: 'Discover',
      noSubscribedChannels: 'No subscribed channels',
      subscribe: 'Subscribe',
      subscribed: 'Subscribed',
      subscriptionError: 'Unable to update subscription.',
      unsubscribe: 'Unsubscribe',
    },
  }

  it('shows subscribed schools in the channel list and manages the full channel picker separately', () => {
    pathnameMock = '/'

    render(
      <TooltipProvider>
        <SidebarNav
          currentUser={{
            avatarUrl: null,
            displayName: 'Test User',
            email: 'test@example.com',
            id: 42,
          }}
          locale="en-US"
          schools={[
            { id: 1, name: 'North Campus', slug: 'north-campus' },
            { id: 2, name: 'South Campus', slug: 'south-campus' },
            { id: 3, name: 'Alpha Campus', slug: 'alpha-campus' },
          ]}
          subscribedSchoolIds={[2]}
          t={dictionary}
        />
      </TooltipProvider>,
    )

    expect(screen.queryByRole('link', { name: /North Campus/ })).toBeNull()
    expect(screen.getByRole('link', { name: /South Campus/ })).toBeTruthy()

    fireEvent.click(screen.getByTestId('sidebar-add-channel'))

    expect(screen.queryByTestId('sidebar-channel-picker')).toBeNull()

    const dialog = screen.getByRole('dialog', { name: 'Add Channel' })
    const optionNames = Array.from(
      dialog.querySelectorAll('[data-testid^="subscription-dialog-item-"]'),
    ).map((item) => item.textContent)

    expect(optionNames[0]).toContain('Alpha Campus')
    expect(optionNames[1]).toContain('North Campus')
    expect(optionNames[2]).toContain('South Campus')
    expect(screen.getByTestId('subscription-dialog-index-a')).toBeTruthy()
    expect(screen.getByTestId('subscription-dialog-index-n')).toBeTruthy()
    expect(screen.getByTestId('subscription-dialog-index-s')).toBeTruthy()
    expect(dialog.className).not.toContain('bg-white/96')
    expect(dialog.className).toContain('bg-white')
    expect(screen.getByTestId('subscription-dialog-toggle-2').className).toContain(
      'text-campus-primary',
    )
    expect(screen.getByTestId('sidebar-add-channel').className).toContain('text-campus-accent/60')
    expect(screen.getByTestId('sidebar-add-channel').className).toContain(
      'aria-expanded:text-campus-accent',
    )
  })

  it('leaves the subscribed channel area blank when the user has no school subscriptions', () => {
    pathnameMock = '/'

    render(
      <TooltipProvider>
        <SidebarNav
          currentUser={{
            avatarUrl: null,
            displayName: 'Test User',
            email: 'test@example.com',
            id: 42,
          }}
          locale="en-US"
          schools={[{ id: 1, name: 'North Campus', slug: 'north-campus' }]}
          subscribedSchoolIds={[]}
          t={dictionary}
        />
      </TooltipProvider>,
    )

    expect(screen.queryByText('No subscribed channels')).toBeNull()
    expect(screen.queryByTestId('sidebar-no-subscribed-channels')).toBeNull()
    expect(screen.getByTestId('sidebar-add-channel')).toBeTruthy()
  })
})
