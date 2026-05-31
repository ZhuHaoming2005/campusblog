import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import PostFeed from '@/components/PostFeed'
import type { Post, School, SchoolSubChannel, Tag, User } from '@/payload-types'

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

const secondTag = {
  id: 202,
  name: 'Admissions',
  slug: 'admissions',
  createdAt: '2026-03-20T00:00:00.000Z',
  updatedAt: '2026-03-20T00:00:00.000Z',
} as Tag

function makePost(id: number): Post {
  return {
    id,
    title: `Post ${id}`,
    slug: `post-${id}`,
    status: 'published',
    school,
    subChannel: channel,
    author,
    tags: [tag, secondTag],
    excerpt: `Excerpt ${id}`,
    content: { type: 'doc', content: [] },
    publishedAt: `2026-03-27T0${id}:00:00.000Z`,
    createdAt: `2026-03-27T0${id}:00:00.000Z`,
    updatedAt: `2026-03-27T0${id}:00:00.000Z`,
  } as Post
}

describe('PostFeed discover mode', () => {
  it('uses the discover masonry layout and marks the first two cards as featured', () => {
    const { container } = render(
      <PostFeed
        posts={[makePost(1), makePost(2), makePost(3)]}
        locale="en-US"
        showSchoolName
        showChannelName
        variant="discover"
        featuredCount={2}
      />,
    )

    const feed = container.querySelector('[data-testid="discover-post-feed"]')
    expect(feed?.className).toContain('masonry-grid--discover')
    expect(feed?.className).not.toContain('discover-grid')
    expect(container.querySelectorAll('[data-card-variant="discover-featured"]').length).toBe(2)
    expect(container.querySelectorAll('[data-card-variant="discover-default"]').length).toBe(1)
  })

  it('keeps discover card metadata right-aligned', () => {
    const { container } = render(
      <PostFeed
        posts={[makePost(1), makePost(2), makePost(3)]}
        locale="en-US"
        showSchoolName
        showChannelName
        variant="discover"
        featuredCount={2}
      />,
    )

    const featuredMeta = container.querySelector('[data-card-variant="discover-featured"] [data-testid="post-card-meta"]')
    const defaultMeta = container.querySelector('[data-card-variant="discover-default"] [data-testid="post-card-meta"]')

    expect(featuredMeta?.className).toContain('justify-end')
    expect(featuredMeta?.className).toContain('text-right')
    expect(defaultMeta?.className).toContain('items-end')
    expect(defaultMeta?.className).toContain('text-right')
  })

  it('does not render preview text again in the lower content area for discover cards', () => {
    const { container } = render(
      <PostFeed
        posts={[makePost(1)]}
        locale="en-US"
        showSchoolName
        showChannelName
        variant="discover"
        featuredCount={1}
      />,
    )

    expect(container.querySelectorAll('[data-card-variant="discover-featured"] .space-y-2 > p').length).toBe(0)
  })

  it('renders post, school, and channel tags in a single card row', () => {
    const { container } = render(
      <PostFeed
        posts={[makePost(1)]}
        locale="en-US"
        showSchoolName
        showChannelName
        variant="discover"
        featuredCount={1}
      />,
    )

    const tagRow = container.querySelector('[data-testid="post-card-tags"]')
    const tagRowText = tagRow?.textContent ?? ''

    expect(tagRow?.className).toContain('flex-nowrap')
    expect(tagRow?.className).toContain('overflow-hidden')
    expect(tagRowText.indexOf('North Campus')).toBeLessThan(tagRowText.indexOf('Events'))
    expect(tagRowText.indexOf('Events')).toBeLessThan(tagRowText.indexOf('Campus Life'))
    expect(tagRowText.indexOf('Campus Life')).toBeLessThan(tagRowText.indexOf('Admissions'))
    expect(container.querySelectorAll('[data-testid="post-card-tags"]').length).toBe(1)
  })
})
