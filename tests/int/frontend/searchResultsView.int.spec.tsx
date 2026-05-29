import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import SearchResultsView from '@/components/search/SearchResultsView'
import type { FrontendDictionary } from '@/lib/i18n/dictionaries'
import type { SearchResultPost } from '@/lib/searchData'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
  }),
}))

afterEach(() => {
  cleanup()
})

const dictionary = {
  common: {
    anonymous: 'Anonymous',
    searchPlaceholder: 'Search campus news...',
  },
  post: {
    back: 'Back to browse',
    readTimeShort: 'min',
  },
  search: {
    articlesFound: 'articles found',
    enterQuery: 'Please enter a search query',
    noResults: 'No articles found',
    results: 'Search Results',
    tryDifferentQuery: 'Try a different search query',
  },
} as FrontendDictionary

describe('SearchResultsView', () => {
  it('matches the homepage search placement and size without left-heading copy', () => {
    const { container } = render(
      <SearchResultsView
        locale="en-US"
        posts={[]}
        query="campus"
        sectionClassName="search-section"
        t={dictionary}
      />,
    )

    const toolbar = container.querySelector('[data-testid="search-results-toolbar"]')
    const shell = container.querySelector('[data-testid="search-results-top-search-shell"]')
    expect(toolbar).not.toBeNull()
    expect(shell?.className).toContain('xl:grid-cols-[minmax(0,1fr)_15rem]')
    expect(toolbar?.className).toContain('justify-center')
    expect(toolbar?.querySelector('form')?.className).toContain('max-w-[34rem]')
    expect(screen.getByPlaceholderText('Search campus news...').className).toContain('sm:h-11')
    expect((screen.getByPlaceholderText('Search campus news...') as HTMLInputElement).value).toBe(
      'campus',
    )
    expect(screen.queryByText('Search Results')).toBeNull()
    expect(screen.queryByText('0 articles found')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'campus' })).toBeNull()
  })

  it('renders a top-left back button with the configured fallback href', () => {
    const { container } = render(
      <SearchResultsView
        backHref="/school/north-campus"
        locale="en-US"
        posts={[]}
        query="campus"
        sectionClassName="search-section"
        t={dictionary}
      />,
    )

    const backRow = container.querySelector('[data-testid="search-results-back-row"]')
    const backLink = screen.getByRole('link', { name: /back to browse/i })

    expect(backRow?.className).toContain('justify-start')
    expect(backRow?.className).toContain('sm:absolute')
    expect(backLink.getAttribute('href')).toBe('/school/north-campus')
  })

  it('renders search result excerpt text through the shared post card module', () => {
    const posts: SearchResultPost[] = [
      {
        id: 1,
        title: 'Campus Art Fair',
        slug: 'campus-art-fair',
        excerpt: 'A short campus story.',
        author: {
          id: 2,
          displayName: 'Alex',
          roles: ['user'],
          email: 'alex@example.com',
          createdAt: '2026-05-01T00:00:00.000Z',
          updatedAt: '2026-05-01T00:00:00.000Z',
          collection: 'users',
        },
        school: 10,
        tags: [{ id: 3, name: 'Art', slug: 'art', createdAt: '', updatedAt: '' }],
        subChannel: {
          id: 4,
          name: 'Events',
          slug: 'events',
          school: 10,
          createdAt: '2026-05-01T00:00:00.000Z',
          updatedAt: '2026-05-01T00:00:00.000Z',
        },
        coverImage: {
          id: 5,
          alt: 'Campus fair cover',
          url: '/cover.png',
          createdAt: '2026-05-01T00:00:00.000Z',
          updatedAt: '2026-05-01T00:00:00.000Z',
        },
        publishedAt: '2026-05-01T00:00:00.000Z',
        createdAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-05-01T00:00:00.000Z',
      },
    ]

    const { container } = render(
      <SearchResultsView
        locale="en-US"
        posts={posts}
        query="art"
        sectionClassName="search-section"
        showChannelName
        t={dictionary}
      />,
    )

    expect(container.querySelector('[data-card-variant="default"]')).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'Campus Art Fair' })).not.toBeNull()
    expect(screen.getByText('A short campus story.')).not.toBeNull()
  })

  it('renders a content preview when a search result has no excerpt', () => {
    const posts: SearchResultPost[] = [
      {
        id: 1,
        title: 'Campus Notes',
        slug: 'campus-notes',
        excerpt: null,
        contentPreview: 'Fallback body text from the article.',
        author: 2,
        school: 10,
        tags: null,
        subChannel: null,
        coverImage: {
          id: 5,
          alt: 'Campus notes cover',
          url: '/cover.png',
          createdAt: '2026-05-01T00:00:00.000Z',
          updatedAt: '2026-05-01T00:00:00.000Z',
        },
        publishedAt: '2026-05-01T00:00:00.000Z',
        createdAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-05-01T00:00:00.000Z',
      },
    ]

    render(
      <SearchResultsView
        locale="en-US"
        posts={posts}
        query="campus"
        sectionClassName="search-section"
        t={dictionary}
      />,
    )

    expect(screen.getByText('Fallback body text from the article.')).not.toBeNull()
  })
})
