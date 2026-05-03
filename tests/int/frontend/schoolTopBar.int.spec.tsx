import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import SchoolTopBar from '@/components/layout/SchoolTopBar'
import { SubscriptionToggle } from '@/components/subscriptions/SubscriptionToggle'

let pathnameMock = '/school/north-campus'

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock,
}))

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SchoolTopBar', () => {
  it('renders content-width channel tabs with a sliding indicator and balanced add button', () => {
    pathnameMock = '/school/north-campus/channel/events'

    const { container } = render(
      <SchoolTopBar
        schoolId={12}
        schoolName="North Campus"
        schoolSlug="north-campus"
        subChannels={[
          { id: 1, name: 'Events', slug: 'events' },
          { id: 2, name: 'Culture', slug: 'culture' },
        ]}
        subscriptionLabels={{
          channelSubscribe: 'Subscribe to channel',
          channelSubscribed: 'Channel subscribed',
          schoolSubscribe: 'Subscribe',
          schoolSubscribed: 'Subscribed',
        }}
        subscriptionState={{
          channels: { 1: true },
          school: false,
        }}
        t={{
          common: { searchPlaceholder: 'Search campus news...' },
          school: { addSubChannel: 'Add Channel', allPosts: 'All Posts', homepage: 'Homepage' },
        }}
      />,
    )

    expect(screen.getByText('North Campus')).toBeTruthy()
    expect(screen.getByPlaceholderText('Search campus news...')).toBeTruthy()
    expect(screen.getByTestId('school-channel-tabs-indicator')).toBeTruthy()
    expect(screen.getByTestId('school-add-channel').className).toContain('h-9')
    expect(screen.getByTestId('school-subscribe-toggle').textContent).toContain('Subscribe')
    expect(screen.getByTestId('channel-subscribe-toggle-1').getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(container.querySelector('header')?.className).toContain('bg-gradient-to-b')
  })
})

describe('SubscriptionToggle', () => {
  it('rolls back optimistic state when the request rejects', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'))

    render(
      <SubscriptionToggle
        endpoint="/api/subscriptions/schools"
        idField="schoolId"
        idValue={12}
        initialSubscribed={false}
        labels={{ subscribe: 'Subscribe', subscribed: 'Subscribed' }}
        testId="subscription-toggle"
      />,
    )

    const button = screen.getByTestId('subscription-toggle')
    fireEvent.click(button)

    await waitFor(() => {
      expect(button.getAttribute('aria-pressed')).toBe('false')
    })
  })
})
