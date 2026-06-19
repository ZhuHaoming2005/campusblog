import { describe, expect, it } from 'vitest'

import { getDictionary } from '@/app/(frontend)/lib/i18n/dictionaries'
import { buildDiscoverHomeData } from '@/app/(frontend)/lib/discoverPresentation'
import type { Post, School, SchoolSubChannel, Tag, User } from '@/payload-types'

type CityFixture = {
  id: number
  name: string
  slug: string
}

const author = {
  id: 1,
  displayName: 'Alex',
  roles: ['user'],
  email: 'alex@example.com',
  createdAt: '2026-03-20T00:00:00.000Z',
  updatedAt: '2026-03-20T00:00:00.000Z',
  collection: 'users',
} as User

const lakeCity: CityFixture = {
  id: 501,
  name: 'Lake City',
  slug: 'lake-city',
}

const hillCity: CityFixture = {
  id: 502,
  name: 'Hill City',
  slug: 'hill-city',
}

const northSchool = {
  id: 10,
  name: 'North Campus',
  slug: 'north-campus',
  city: lakeCity,
  createdAt: '2026-03-20T00:00:00.000Z',
  updatedAt: '2026-03-20T00:00:00.000Z',
} as unknown as School

const southSchool = {
  id: 11,
  name: 'South Campus',
  slug: 'south-campus',
  city: lakeCity,
  createdAt: '2026-03-20T00:00:00.000Z',
  updatedAt: '2026-03-20T00:00:00.000Z',
} as unknown as School

const westSchool = {
  id: 12,
  name: 'West Campus',
  slug: 'west-campus',
  city: hillCity,
  createdAt: '2026-03-20T00:00:00.000Z',
  updatedAt: '2026-03-20T00:00:00.000Z',
} as unknown as School

const eventsChannel = {
  id: 101,
  name: 'Events',
  slug: 'events',
  school: northSchool,
  createdAt: '2026-03-20T00:00:00.000Z',
  updatedAt: '2026-03-20T00:00:00.000Z',
} as SchoolSubChannel

const foodChannel = {
  id: 102,
  name: 'Food',
  slug: 'food',
  school: southSchool,
  createdAt: '2026-03-20T00:00:00.000Z',
  updatedAt: '2026-03-20T00:00:00.000Z',
} as SchoolSubChannel

const eventsTag = {
  id: 201,
  name: 'Events',
  slug: 'events',
  createdAt: '2026-03-20T00:00:00.000Z',
  updatedAt: '2026-03-20T00:00:00.000Z',
} as Tag

const lifeTag = {
  id: 202,
  name: 'Campus Life',
  slug: 'campus-life',
  createdAt: '2026-03-20T00:00:00.000Z',
  updatedAt: '2026-03-20T00:00:00.000Z',
} as Tag

function makePost(
  id: number,
  title: string,
  publishedAt: string,
  school: School,
  channel: SchoolSubChannel,
  tag: Tag,
): Post {
  return {
    id,
    title,
    slug: `post-${id}`,
    status: 'published',
    school,
    subChannel: channel,
    author,
    tags: [tag],
    excerpt: `${title} excerpt`,
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: `${title} body` }],
        },
      ],
    },
    publishedAt,
    createdAt: publishedAt,
    updatedAt: publishedAt,
  } as Post
}

describe('buildDiscoverHomeData', () => {
  it('creates discovery views and rails from existing posts', () => {
    const copy = getDictionary('en-US').discoverHome
    const posts = [
      makePost(1, 'Night Market', '2026-03-27T10:00:00.000Z', northSchool, eventsChannel, eventsTag),
      makePost(2, 'Dorm Notes', '2026-03-27T08:00:00.000Z', northSchool, eventsChannel, lifeTag),
      makePost(3, 'Cafeteria Review', '2026-03-27T09:00:00.000Z', southSchool, foodChannel, lifeTag),
    ]

    const data = buildDiscoverHomeData({ posts, copy })

    expect(data.featuredPost?.id).toBe(1)
    expect(data.views.map((view) => view.key)).toEqual([
      'recommended',
      'latest',
      'sameSchool',
      'nearbySchools',
    ])
    expect(data.schoolLinks[0].href).toBe('/school/north-campus')
    expect(data.channelLinks[0].href).toBe('/school/north-campus/channel/events')
    expect(data.tagChips[0].label).toBe('Campus Life')
    expect(
      data.views
        .find((view) => view.key === 'sameSchool')
        ?.posts.every((post) => (post.school as School).id === 10),
    ).toBe(true)
    expect(data.views.find((view) => view.key === 'nearbySchools')?.posts[0].id).toBe(1)
    expect(data.views.find((view) => view.key === 'nearbySchools')?.posts[1].id).toBe(3)
  })

  it('prioritizes the user school in recommendations and same-school view', () => {
    const copy = getDictionary('en-US').discoverHome
    const posts = [
      makePost(1, 'Newest South', '2026-03-27T12:00:00.000Z', southSchool, foodChannel, lifeTag),
      makePost(2, 'North Update', '2026-03-27T09:00:00.000Z', northSchool, eventsChannel, eventsTag),
      makePost(3, 'South Guide', '2026-03-27T11:00:00.000Z', southSchool, foodChannel, lifeTag),
      makePost(4, 'North Plan', '2026-03-27T08:00:00.000Z', northSchool, eventsChannel, lifeTag),
    ]

    const data = buildDiscoverHomeData({
      posts,
      copy,
      preferredSchoolId: northSchool.id,
    })

    expect(data.featuredPost?.id).toBe(2)
    expect(data.views.find((view) => view.key === 'recommended')?.posts.map((post) => post.id)).toEqual([
      2,
      4,
      1,
      3,
    ])
    expect(data.views.find((view) => view.key === 'sameSchool')?.posts.map((post) => post.id)).toEqual([
      2,
      4,
    ])
    expect(data.views.find((view) => view.key === 'nearbySchools')?.posts[0].id).toBe(1)
  })

  it('prioritizes same-city schools in the nearby schools view', () => {
    const copy = getDictionary('en-US').discoverHome
    const posts = [
      makePost(1, 'North Update', '2026-03-27T12:00:00.000Z', northSchool, eventsChannel, eventsTag),
      makePost(2, 'West Notes', '2026-03-27T11:00:00.000Z', westSchool, foodChannel, lifeTag),
      makePost(3, 'South Story', '2026-03-27T10:00:00.000Z', southSchool, foodChannel, lifeTag),
      makePost(4, 'South Guide', '2026-03-27T09:00:00.000Z', southSchool, foodChannel, eventsTag),
    ]

    const data = buildDiscoverHomeData({
      posts,
      copy,
      preferredSchoolCityId: lakeCity.id,
      preferredSchoolId: northSchool.id,
    })

    expect(data.views.find((view) => view.key === 'nearbySchools')?.posts.map((post) => post.id)).toEqual([
      3,
      4,
      2,
      1,
    ])
  })

  it('places queried same-city nearby posts ahead of the global latest feed', () => {
    const copy = getDictionary('en-US').discoverHome
    const posts = [
      makePost(1, 'North Update', '2026-03-27T12:00:00.000Z', northSchool, eventsChannel, eventsTag),
      makePost(2, 'West Notes', '2026-03-27T11:00:00.000Z', westSchool, foodChannel, lifeTag),
    ]
    const sameCitySchoolWithoutNestedCity = {
      id: southSchool.id,
      name: southSchool.name,
      slug: southSchool.slug,
      createdAt: southSchool.createdAt,
      updatedAt: southSchool.updatedAt,
    } as School
    const nearbyPosts = [
      makePost(
        3,
        'South Story',
        '2026-03-26T10:00:00.000Z',
        sameCitySchoolWithoutNestedCity,
        foodChannel,
        lifeTag,
      ),
    ]

    const data = buildDiscoverHomeData({
      posts,
      copy,
      nearbyPosts,
      preferredCitySchoolIds: [southSchool.id],
      preferredSchoolCityId: lakeCity.id,
      preferredSchoolId: northSchool.id,
    })

    expect(data.views.find((view) => view.key === 'nearbySchools')?.posts.map((post) => post.id)).toEqual([
      3,
      2,
      1,
    ])
  })

  it('normalizes raw Payload posts into sanitized feed items', () => {
    const copy = getDictionary('en-US').discoverHome
    const posts = [
      makePost(1, 'Night Market', '2026-03-27T10:00:00.000Z', northSchool, eventsChannel, eventsTag),
    ]

    const data = buildDiscoverHomeData({ posts, copy })
    const serialized = JSON.stringify(data)

    expect(data.featuredPost).toEqual(
      expect.objectContaining({
        id: 1,
        authorName: 'Alex',
        previewText: 'Night Market excerpt',
        school: { id: 10, name: 'North Campus', slug: 'north-campus', cityId: 501 },
        tagLabels: ['Events'],
        title: 'Night Market',
      }),
    )
    expect(serialized).not.toContain('alex@example.com')
    expect(serialized).not.toContain('roles')
    expect(serialized).not.toContain('content')
  })
})
