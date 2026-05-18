import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SchoolIntroCard } from '@/components/school/SchoolIntroCard'

const pathnameMock = '/school/north-campus'

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock,
  useRouter: () => ({ refresh: vi.fn() }),
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('SchoolIntroCard', () => {
  const dictionary = {
    school: {
      allPosts: 'All Posts',
      homepage: 'Homepage',
      subscribeSchool: 'Subscribe School',
      subscribedSchool: 'Subscribed School',
      subscriptionError: 'Unable to update subscription.',
    },
  }

  it('renders the school introduction and subscription toggle in one card', () => {
    render(
      <SchoolIntroCard
        canManageSubscriptions
        school={{
          description: 'A focused campus introduction.',
          id: 10,
          name: 'North Campus',
          slug: 'north-campus',
        }}
        schoolSubscribed
        t={dictionary}
      />,
    )

    const introCard = screen.getByTestId('school-intro-card')
    expect(introCard.className).toContain('min-h-[13rem]')
    expect(within(introCard).getByText('North Campus')).toBeTruthy()
    expect(within(introCard).getByText('A focused campus introduction.')).toBeTruthy()
    expect(within(introCard).getByTestId('school-subscribe-toggle').textContent).toContain(
      'Subscribed School',
    )
    expect(within(introCard).getByTestId('school-subscribe-toggle').className).toContain(
      'text-campus-primary',
    )
  })

  it('syncs the local subscription button state when refreshed props change', () => {
    const { rerender } = render(
      <SchoolIntroCard
        canManageSubscriptions
        school={{
          description: 'A focused campus introduction.',
          id: 10,
          name: 'North Campus',
          slug: 'north-campus',
        }}
        schoolSubscribed={false}
        t={dictionary}
      />,
    )

    expect(screen.getByTestId('school-subscribe-toggle').textContent).toContain('Subscribe School')

    rerender(
      <SchoolIntroCard
        canManageSubscriptions
        school={{
          description: 'A focused campus introduction.',
          id: 10,
          name: 'North Campus',
          slug: 'north-campus',
        }}
        schoolSubscribed
        t={dictionary}
      />,
    )

    expect(screen.getByTestId('school-subscribe-toggle').textContent).toContain('Subscribed School')
    expect(screen.getByTestId('school-subscribe-toggle').getAttribute('aria-pressed')).toBe('true')
  })
})
