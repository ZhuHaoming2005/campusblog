import type { FrontendDictionary } from './i18n/dictionaries'
import type { Post } from '@/payload-types'

import { toPostFeedItem, type PostFeedItem } from './postFeedData'

export type DiscoverViewKey = 'recommended' | 'latest' | 'sameSchool' | 'nearbySchools'

export type DiscoverView = {
  key: DiscoverViewKey
  label: string
  title: string
  hint: string
  posts: PostFeedItem[]
}

export type DiscoverRailLink = {
  label: string
  href: string
  count: number
}

export type DiscoverTagChip = {
  label: string
  href: string
  count: number
}

export type DiscoverHomeData = {
  featuredPost: PostFeedItem | null
  views: DiscoverView[]
  schoolLinks: DiscoverRailLink[]
  channelLinks: DiscoverRailLink[]
  tagChips: DiscoverTagChip[]
}

type DiscoverHomeCopy = FrontendDictionary['discoverHome']
type DiscoverPostInput = Post | PostFeedItem
type PreferredSchoolId = number | string | null | undefined
type PreferredCitySchoolId = number | string

function dateWeight(post: PostFeedItem): number {
  const source = post.publishedAt ?? post.createdAt
  const parsed = Date.parse(source)
  return Number.isNaN(parsed) ? 0 : parsed
}

function sortNewest(posts: PostFeedItem[]): PostFeedItem[] {
  return [...posts].sort((left, right) => dateWeight(right) - dateWeight(left))
}

function normalizeId(value: PreferredSchoolId): string | null {
  if (value == null || value === '') return null
  return String(value)
}

function getPostSchoolKey(post: PostFeedItem): string | null {
  return post.school ? String(post.school.id) : null
}

function getPostSchoolCityKey(post: PostFeedItem): string | null {
  return normalizeId(post.school?.cityId)
}

function findPreferredSchoolCityKey(posts: PostFeedItem[], preferredSchoolId: PreferredSchoolId) {
  const schoolKey = normalizeId(preferredSchoolId)
  if (!schoolKey) return null

  const preferredSchoolPost = posts.find((post) => getPostSchoolKey(post) === schoolKey)
  return preferredSchoolPost ? getPostSchoolCityKey(preferredSchoolPost) : null
}

function hasSameCitySchoolKey(
  post: PostFeedItem,
  preferredCitySchoolKeys: Set<string>,
  preferredSchoolKey: string | null,
) {
  const schoolKey = getPostSchoolKey(post)
  return Boolean(schoolKey && schoolKey !== preferredSchoolKey && preferredCitySchoolKeys.has(schoolKey))
}

function prioritizeSchoolPosts(
  posts: PostFeedItem[],
  preferredSchoolId: PreferredSchoolId,
): PostFeedItem[] {
  const schoolKey = normalizeId(preferredSchoolId)
  if (!schoolKey) return posts

  const preferred: PostFeedItem[] = []
  const rest: PostFeedItem[] = []

  for (const post of posts) {
    if (getPostSchoolKey(post) === schoolKey) {
      preferred.push(post)
    } else {
      rest.push(post)
    }
  }

  return [...preferred, ...rest]
}

function pickMostCommonSchool(posts: PostFeedItem[]): string | null {
  const counts = new Map<string, number>()

  for (const post of posts) {
    const school = post.school
    if (!school) continue

    const key = String(school.id)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null
}

function dedupePosts(posts: PostFeedItem[]): PostFeedItem[] {
  const seenPosts = new Set<number | string>()

  return posts.filter((post) => {
    const key = post.id
    if (seenPosts.has(key)) return false
    seenPosts.add(key)
    return true
  })
}

function pickNearbySchoolPosts(
  posts: PostFeedItem[],
  preferredSchoolId?: PreferredSchoolId,
  preferredSchoolCityId?: PreferredSchoolId,
  preferredCitySchoolIds: PreferredCitySchoolId[] = [],
): PostFeedItem[] {
  const schoolKey = normalizeId(preferredSchoolId)
  const preferredCitySchoolKeys = new Set(preferredCitySchoolIds.map((id) => String(id)))
  if (schoolKey) {
    const cityKey = normalizeId(preferredSchoolCityId) ?? findPreferredSchoolCityKey(posts, schoolKey)
    const preferredSchoolPosts = posts.filter((post) => getPostSchoolKey(post) === schoolKey)

    if (cityKey || preferredCitySchoolKeys.size > 0) {
      const sameCityOtherSchoolPosts = posts.filter(
        (post) =>
          getPostSchoolKey(post) !== schoolKey &&
          ((cityKey ? getPostSchoolCityKey(post) === cityKey : false) ||
            hasSameCitySchoolKey(post, preferredCitySchoolKeys, schoolKey)),
      )
      const otherCityPosts = posts.filter(
        (post) =>
          getPostSchoolKey(post) !== schoolKey &&
          (cityKey ? getPostSchoolCityKey(post) !== cityKey : true) &&
          !hasSameCitySchoolKey(post, preferredCitySchoolKeys, schoolKey),
      )

      if (sameCityOtherSchoolPosts.length > 0) {
        return dedupePosts([
          ...pickNearbySchoolPosts(sameCityOtherSchoolPosts),
          ...pickNearbySchoolPosts(otherCityPosts),
          ...preferredSchoolPosts,
        ])
      }
    }

    const otherSchoolPosts = posts.filter((post) => getPostSchoolKey(post) !== schoolKey)

    return dedupePosts([...pickNearbySchoolPosts(otherSchoolPosts), ...preferredSchoolPosts])
  }

  const seenSchools = new Set<string>()
  const unique: PostFeedItem[] = []

  for (const post of posts) {
    const school = post.school
    const key = school ? String(school.id) : `post:${post.id}`
    if (seenSchools.has(key)) continue

    seenSchools.add(key)
    unique.push(post)
  }

  const merged = [...unique, ...posts]

  return dedupePosts(merged)
}

export function buildDiscoverHomeData({
  nearbyPosts = [],
  posts,
  copy,
  preferredCitySchoolIds = [],
  preferredSchoolCityId,
  preferredSchoolId,
}: {
  nearbyPosts?: DiscoverPostInput[]
  posts: DiscoverPostInput[]
  copy: DiscoverHomeCopy
  preferredCitySchoolIds?: PreferredCitySchoolId[]
  preferredSchoolCityId?: PreferredSchoolId
  preferredSchoolId?: PreferredSchoolId
}): DiscoverHomeData {
  const feedPosts = posts.map(toPostFeedItem)
  const feedNearbyPosts = nearbyPosts.map(toPostFeedItem)
  const latest = sortNewest(feedPosts)
  const nearbySource = sortNewest(dedupePosts([...feedNearbyPosts, ...latest]))
  const recommended = prioritizeSchoolPosts(latest, preferredSchoolId).slice(0, 12)
  const sameSchoolKey = normalizeId(preferredSchoolId) ?? pickMostCommonSchool(latest)
  const sameSchool = sameSchoolKey
    ? latest.filter((post) => String(post.school?.id ?? '') === sameSchoolKey).slice(0, 12)
    : recommended
  const nearbySchools = pickNearbySchoolPosts(
    nearbySource,
    preferredSchoolId,
    preferredSchoolCityId,
    preferredCitySchoolIds,
  ).slice(0, 12)

  const schoolMap = new Map<string, DiscoverRailLink>()
  const channelMap = new Map<string, DiscoverRailLink>()
  const tagMap = new Map<string, DiscoverTagChip>()

  for (const post of latest) {
    const school = post.school
    if (school) {
      const schoolKey = String(school.id)
      const existing = schoolMap.get(schoolKey)
      schoolMap.set(schoolKey, {
        label: school.name,
        href: `/school/${school.slug}`,
        count: (existing?.count ?? 0) + 1,
      })
    }

    const channel = post.subChannel
    if (school && channel) {
      const channelKey = `${school.id}:${channel.id}`
      const existing = channelMap.get(channelKey)
      channelMap.set(channelKey, {
        label: channel.name,
        href: `/school/${school.slug}/channel/${channel.slug}`,
        count: (existing?.count ?? 0) + 1,
      })
    }

    const tag = post.tags[0] ?? null
    if (tag) {
      const existing = tagMap.get(tag.slug)
      tagMap.set(tag.slug, {
        label: tag.name,
        href: `/search?q=${encodeURIComponent(tag.name)}`,
        count: (existing?.count ?? 0) + 1,
      })
    }
  }

  return {
    featuredPost: recommended[0] ?? null,
    views: [
      {
        key: 'recommended',
        label: copy.tabs.recommended,
        title: copy.views.recommendedTitle,
        hint: copy.views.recommendedHint,
        posts: recommended,
      },
      {
        key: 'latest',
        label: copy.tabs.latest,
        title: copy.views.latestTitle,
        hint: copy.views.latestHint,
        posts: latest.slice(0, 12),
      },
      {
        key: 'sameSchool',
        label: copy.tabs.sameSchool,
        title: copy.views.sameSchoolTitle,
        hint: copy.views.sameSchoolHint,
        posts: sameSchool,
      },
      {
        key: 'nearbySchools',
        label: copy.tabs.nearbySchools,
        title: copy.views.nearbySchoolsTitle,
        hint: copy.views.nearbySchoolsHint,
        posts: nearbySchools,
      },
    ],
    schoolLinks: [...schoolMap.values()].sort((left, right) => right.count - left.count).slice(0, 6),
    channelLinks: [...channelMap.values()].sort((left, right) => right.count - left.count).slice(0, 6),
    tagChips: [...tagMap.values()].sort((left, right) => right.count - left.count).slice(0, 8),
  }
}
