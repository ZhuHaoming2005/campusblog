import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import DiscoverHomepage from '@/components/discover/DiscoverHomepage'
import { getDictionary } from '@/app/(frontend)/lib/i18n/dictionaries'
import type { Post, School, SchoolSubChannel, Tag, User } from '@/payload-types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

const dictionary = getDictionary('en-US')

const author = {
  id: 1,
  displayName: 'Alex',
  roles: ['user'],
  email: 'alex@example.com',
  createdAt: '2026-03-20T00:00:00.000Z',
  updatedAt: '2026-03-20T00:00:00.000Z',
  collection: 'users',
} as User

const school = {
  id: 10,
  name: 'North Campus',
  slug: 'north-campus',
  createdAt: '2026-03-20T00:00:00.000Z',
  updatedAt: '2026-03-20T00:00:00.000Z',
} as School

const channel = {
  id: 101,
  name: 'Events',
  slug: 'events',
  school,
  createdAt: '2026-03-20T00:00:00.000Z',
  updatedAt: '2026-03-20T00:00:00.000Z',
} as SchoolSubChannel

const tag = {
  id: 201,
  name: 'Campus Life',
  slug: 'campus-life',
  createdAt: '2026-03-20T00:00:00.000Z',
  updatedAt: '2026-03-20T00:00:00.000Z',
} as Tag

const post = {
  id: 1,
  title: 'Night Market',
  slug: 'night-market',
  status: 'published',
  school,
  subChannel: channel,
  author,
  tags: [tag],
  excerpt: 'Night Market excerpt',
  content: { type: 'doc', content: [] },
  publishedAt: '2026-03-27T10:00:00.000Z',
  createdAt: '2026-03-27T10:00:00.000Z',
  updatedAt: '2026-03-27T10:00:00.000Z',
} as Post

describe('DiscoverHomepage', () => {
  it('renders the hero, search, tabs, and metadata rail together', () => {
    const { container } = render(<DiscoverHomepage posts={[post]} locale="en-US" t={dictionary} />)

    expect(screen.getByText(dictionary.discoverHome.heroTitle)).toBeTruthy()
    expect(screen.getByPlaceholderText(dictionary.common.searchPlaceholder)).toBeTruthy()
    expect(screen.getByRole('tab', { name: dictionary.discoverHome.tabs.recommended })).toBeTruthy()
    expect(screen.getByText(dictionary.discoverHome.sections.schoolHighlights)).toBeTruthy()
    expect(container.querySelector('[data-testid="discover-homepage-shell"]')?.className).toContain(
      'pt-[var(--floating-toolbar-top)]',
    )
    expect(
      container.querySelector('[data-testid="discover-homepage-content"]')?.className,
    ).toContain('w-full')
    expect(
      container.querySelector('[data-testid="discover-top-search-shell"]')?.className,
    ).toContain('xl:grid-cols-[minmax(0,1fr)_13rem]')
    expect(
      container.querySelector('[data-testid="discover-top-search-slot"]')?.className,
    ).toContain('justify-center')
    expect(
      container.querySelector('[data-testid="discover-meta-rail"]')?.parentElement?.className,
    ).toContain('xl:grid-cols-[minmax(0,1fr)_13rem]')
    expect(container.querySelector('a[href="/search?q=Campus%20Life"]')?.textContent).toContain(
      'Campus Life',
    )
  })

  it('wires the current user school into homepage recommendations', () => {
    const source = readFileSync(
      path.resolve(process.cwd(), 'src/app/(frontend)/(site)/page.tsx'),
      'utf8',
    )

    expect(source).toContain('getCurrentFrontendUser(headers)')
    expect(source).toContain('getDiscoverPageData(currentUser)')
    expect(source).toContain('nearbyPosts={nearbyPosts}')
    expect(source).toContain('preferredCitySchoolIds={preferredCitySchoolIds}')
    expect(source).toContain('preferredSchoolCityId={preferredSchoolCityId}')
    expect(source).toContain('preferredSchoolId={preferredSchoolId}')
  })
})
