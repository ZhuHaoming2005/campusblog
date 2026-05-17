import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import SchoolTopBar from '@/components/layout/SchoolTopBar'

let pathnameMock = '/school/north-campus'

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock,
  useRouter: () => ({ refresh: vi.fn() }),
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('SchoolTopBar', () => {
  it('renders subscribed channel tabs with a sliding indicator and matching add button style', () => {
    pathnameMock = '/school/north-campus/channel/events'

    const { container } = render(
      <SchoolTopBar
        canManageSubscriptions
        schoolId={10}
        schoolName="North Campus"
        schoolSlug="north-campus"
        subChannels={[
          { id: 1, name: 'Events', slug: 'events' },
          { id: 2, name: 'Culture', slug: 'culture' },
        ]}
        subscribedChannelIds={[1]}
        t={{
          common: { cancel: 'Cancel', login: 'Login', searchPlaceholder: 'Search campus news...' },
          school: {
            addSubChannel: 'Add Channel',
            allPosts: 'All Posts',
            homepage: 'Homepage',
            subscribe: 'Subscribe',
            subscribed: 'Subscribed',
            subscriptionError: 'Unable to update subscription.',
            unsubscribe: 'Unsubscribe',
          },
        }}
      />,
    )

    expect(screen.getByText('North Campus')).toBeTruthy()
    expect(screen.getByPlaceholderText('Search campus news...')).toBeTruthy()
    expect(screen.getByTestId('school-channel-tabs-indicator')).toBeTruthy()
    expect(screen.getByText('Events')).toBeTruthy()
    expect(screen.queryByText('Culture')).toBeNull()
    expect(screen.getByTestId('school-add-channel').className).toContain('text-campus-accent/60')
    expect(screen.getByTestId('school-add-channel').className).toContain(
      'aria-expanded:text-campus-accent',
    )
    expect(screen.getByTestId('school-add-channel').className).not.toContain('hover:bg-gradient')
    expect(screen.queryByTestId('school-subscribe-toggle')).toBeNull()
    expect(screen.getByTestId('school-topbar-title-row').className).toContain('pr-32')
    expect(container.querySelector('header')?.className).toContain('bg-gradient-to-b')

    fireEvent.click(screen.getByTestId('school-add-channel'))

    expect(screen.queryByTestId('school-channel-picker')).toBeNull()

    const dialog = screen.getByRole('dialog', { name: 'Add Channel' })
    const optionNames = Array.from(
      dialog.querySelectorAll('[data-testid^="subscription-dialog-item-"]'),
    ).map((item) => item.textContent)

    expect(optionNames[0]).toContain('Culture')
    expect(optionNames[1]).toContain('Events')
    expect(dialog.className).not.toContain('bg-white/96')
    expect(dialog.className).toContain('bg-white')
    expect(screen.getByTestId('subscription-dialog-index-c')).toBeTruthy()
    expect(screen.getByTestId('subscription-dialog-index-e')).toBeTruthy()
  })

  it('keeps many subscribed channel tabs horizontally scrollable', () => {
    pathnameMock = '/school/north-campus'
    const subChannels = Array.from({ length: 12 }, (_, index) => ({
      id: index + 1,
      name: `Channel ${index + 1}`,
      slug: `channel-${index + 1}`,
    }))

    render(
      <SchoolTopBar
        canManageSubscriptions
        schoolId={10}
        schoolName="North Campus"
        schoolSlug="north-campus"
        subChannels={subChannels}
        subscribedChannelIds={subChannels.map((channel) => channel.id)}
        t={{
          common: { cancel: 'Cancel', login: 'Login', searchPlaceholder: 'Search campus news...' },
          school: {
            addSubChannel: 'Add Channel',
            allPosts: 'All Posts',
            homepage: 'Homepage',
            subscribe: 'Subscribe',
            subscribed: 'Subscribed',
            subscriptionError: 'Unable to update subscription.',
            unsubscribe: 'Unsubscribe',
          },
        }}
      />,
    )

    const scrollRail = screen.getByTestId('school-channel-tabs-scroll')
    const tabs = screen.getByTestId('school-channel-tabs')

    expect(scrollRail.className).toContain('overflow-x-auto')
    expect(tabs.className).not.toContain('max-w-full')
    expect(tabs.getAttribute('style')).toContain('min-width: max(min(100%, 19rem), 84.5rem)')
    expect(screen.getByText('Channel 12')).toBeTruthy()
  })
})
