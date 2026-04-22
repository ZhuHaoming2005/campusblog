# Hidden Post Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let authors see hidden posts in the user center, preview them on the existing `/post/[slug]` page, and delete them from the same UI without making hidden posts public.

**Architecture:** Keep the dashboard change shallow by extending the existing user-center bucket queries and reusing `UserPostList` plus `UserPostActions`. Add one new frontend data helper for slug-based visibility checks that allows published posts for everyone and hidden posts only for the signed-in author, then wire the post detail page to use it while keeping metadata on the existing published-only query.

**Tech Stack:** Next.js App Router, Payload CMS Local API, TypeScript, Vitest, React Server Components

---

### Task 1: Add the hidden-post section to the user center

**Files:**
- Modify: `tests/int/frontend/userCenterPage.int.spec.ts`
- Modify: `src/app/(frontend)/user/me/page.tsx`
- Modify: `src/app/(frontend)/locales/zh-CN.json`
- Modify: `src/app/(frontend)/locales/en-US.json`

- [ ] **Step 1: Write the failing test**

```ts
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('User center hidden posts section', () => {
  it('lists hidden posts with preview and delete actions in the dashboard source', () => {
    const source = readFileSync(
      path.resolve(process.cwd(), 'src/app/(frontend)/user/me/page.tsx'),
      'utf8',
    )

    expect(source).toContain("status: { equals: 'hidden' }")
    expect(source).toContain('{t.userCenter.hiddenTitle}')
    expect(source).toContain('emptyLabel={t.userCenter.emptyHidden}')
    expect(source).toContain('hrefLabel={t.userCenter.previewHiddenPost}')
    expect(source).toContain('posts={hiddenPostsResult.docs}')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/frontend/userCenterPage.int.spec.ts`
Expected: FAIL because the user center only has `draft` and `published` sections today.

- [ ] **Step 3: Write minimal implementation**

```tsx
const [draftPostsResult, publishedPostsResult, hiddenPostsResult] = await Promise.all([
  payload.find({
    collection: 'posts',
    where: {
      and: [{ author: { equals: currentUser.id } }, { status: { equals: 'draft' } }],
    },
    sort: '-updatedAt',
    depth: 1,
    limit: 50,
    user: currentUser,
    overrideAccess: false,
  }),
  payload.find({
    collection: 'posts',
    where: {
      and: [{ author: { equals: currentUser.id } }, { status: { equals: 'published' } }],
    },
    sort: '-publishedAt',
    depth: 1,
    limit: 50,
    user: currentUser,
    overrideAccess: false,
  }),
  payload.find({
    collection: 'posts',
    where: {
      and: [{ author: { equals: currentUser.id } }, { status: { equals: 'hidden' } }],
    },
    sort: '-updatedAt',
    depth: 1,
    limit: 50,
    user: currentUser,
    overrideAccess: false,
  }),
])

const postUsageBytes = await getPostUsageBytesMap({
  payload,
  posts: [...draftPostsResult.docs, ...publishedPostsResult.docs, ...hiddenPostsResult.docs],
})
```

```tsx
<Card className="rounded-[1.75rem] border border-campus-border-soft/80 bg-gradient-to-br from-campus-panel via-campus-page to-campus-panel-soft/70 py-0 shadow-[0_14px_36px_rgba(13,59,102,0.05)]">
  <CardHeader className="border-b border-campus-border-soft/70 py-5">
    <CardTitle className="font-headline text-2xl text-campus-primary">
      {t.userCenter.hiddenTitle}
    </CardTitle>
  </CardHeader>
  <CardContent className="px-5 py-5">
    <UserPostList
      actionHref={(post) => `/post/${post.slug}`}
      emptyLabel={t.userCenter.emptyHidden}
      hrefLabel={t.userCenter.previewHiddenPost}
      locale={locale}
      metaLabel={t.userCenter.updatedAt}
      posts={hiddenPostsResult.docs}
      postUsageBytes={postUsageBytes}
      t={t}
    />
  </CardContent>
</Card>
```

```json
"hiddenTitle": "已隐藏文章",
"emptyHidden": "你还没有被隐藏的文章。",
"previewHiddenPost": "预览文章"
```

```json
"hiddenTitle": "Hidden Posts",
"emptyHidden": "You don't have any hidden posts yet.",
"previewHiddenPost": "Preview Post"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/frontend/userCenterPage.int.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/int/frontend/userCenterPage.int.spec.ts src/app/(frontend)/user/me/page.tsx src/app/(frontend)/locales/zh-CN.json src/app/(frontend)/locales/en-US.json
git commit -m "feat: show hidden posts in user center"
```

### Task 2: Add author-only hidden-post resolution for the post detail route

**Files:**
- Create: `tests/int/frontend/cmsData.int.spec.ts`
- Create: `tests/int/frontend/postDetailPage.int.spec.ts`
- Modify: `src/app/(frontend)/lib/cmsData.ts`
- Modify: `src/app/(frontend)/post/[slug]/page.tsx`

- [ ] **Step 1: Write the failing helper test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const findMock = vi.fn()
const getFrontendPayloadMock = vi.fn()

vi.mock('server-only', () => ({}))

vi.mock('@/lib/frontendSession', () => ({
  getFrontendPayload: getFrontendPayloadMock,
}))

describe('getVisiblePostBySlug', () => {
  beforeEach(() => {
    vi.resetModules()
    findMock.mockReset()
    getFrontendPayloadMock.mockReset()
    getFrontendPayloadMock.mockResolvedValue({ find: findMock })
  })

  it('allows the author to resolve a hidden post with access enforcement enabled', async () => {
    findMock.mockResolvedValueOnce({
      docs: [{ id: 7, slug: 'secret-post', status: 'hidden' }],
    })

    const { getVisiblePostBySlug } = await import('@/lib/cmsData')
    const author = { id: 42 } as never

    const post = await getVisiblePostBySlug('secret-post', author)

    expect(post?.status).toBe('hidden')
    expect(findMock).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'posts',
        user: author,
        overrideAccess: false,
        where: {
          and: [
            { slug: { equals: 'secret-post' } },
            {
              or: [
                { status: { equals: 'published' } },
                {
                  and: [
                    { status: { equals: 'hidden' } },
                    { author: { equals: 42 } },
                  ],
                },
              ],
            },
          ],
        },
      }),
    )
  })

  it('keeps anonymous slug lookups limited to published posts', async () => {
    findMock.mockResolvedValueOnce({ docs: [] })

    const { getVisiblePostBySlug } = await import('@/lib/cmsData')

    await getVisiblePostBySlug('secret-post', null)

    expect(findMock).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'posts',
        where: {
          and: [
            { slug: { equals: 'secret-post' } },
            { status: { equals: 'published' } },
          ],
        },
      }),
    )
    expect(findMock).not.toHaveBeenCalledWith(expect.objectContaining({ overrideAccess: false }))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/frontend/cmsData.int.spec.ts`
Expected: FAIL because `getVisiblePostBySlug` does not exist yet.

- [ ] **Step 3: Write the minimal helper implementation**

```ts
import type { Post, School, SchoolSubChannel, User } from '@/payload-types'

export async function getVisiblePostBySlug(slug: string, user: User | null) {
  const payload = await getPayloadClient()

  const query = user
    ? {
        and: [
          { slug: { equals: slug } },
          {
            or: [
              { status: { equals: 'published' } },
              {
                and: [
                  { status: { equals: 'hidden' } },
                  { author: { equals: user.id } },
                ],
              },
            ],
          },
        ],
      }
    : {
        and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }],
      }

  const { docs } = await payload.find({
    collection: 'posts',
    where: query,
    limit: 1,
    depth: 2,
    ...(user ? { user, overrideAccess: false } : {}),
  })

  return (docs[0] as Post | undefined) ?? null
}
```

Note in this step: do not add `'use cache'` to `getVisiblePostBySlug`, because a user-specific cache key would be unsafe for hidden-post visibility.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/frontend/cmsData.int.spec.ts`
Expected: PASS

- [ ] **Step 5: Write the failing page-wiring test**

```ts
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Post detail page hidden preview wiring', () => {
  it('loads the current frontend user for page content while leaving metadata on the public query', () => {
    const source = readFileSync(
      path.resolve(process.cwd(), 'src/app/(frontend)/post/[slug]/page.tsx'),
      'utf8',
    )

    expect(source).toContain("import { getCurrentFrontendUser } from '@/lib/frontendSession'")
    expect(source).toContain('const currentUser = await getCurrentFrontendUser(headers)')
    expect(source).toContain('const post = await getVisiblePostBySlug(slug, currentUser)')
    expect(source).toContain('const post = await getPublishedPostBySlug(slug)')
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/frontend/postDetailPage.int.spec.ts`
Expected: FAIL because the detail page still calls `getPublishedPostBySlug` for content rendering.

- [ ] **Step 7: Write the minimal page implementation**

```tsx
import {
  getPublishedPostBySlug,
  getPublishedPosts,
  getPublishedPostsBySchool,
  getPublishedPostsBySchoolAndChannel,
  getVisiblePostBySlug,
} from '../../lib/cmsData'
import { getCurrentFrontendUser } from '@/lib/frontendSession'
```

```tsx
async function PostDetailPageContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { headers, locale, t } = await getFrontendRequestContext()
  const currentUser = await getCurrentFrontendUser(headers)
  const post = await getVisiblePostBySlug(slug, currentUser)

  if (!post) {
    notFound()
  }

  // keep related posts logic published-only
}
```

Leave `generateMetadata` unchanged on `getPublishedPostBySlug(slug)` so hidden titles and excerpts are not exposed to crawlers or anonymous metadata fetches.

- [ ] **Step 8: Run both tests to verify they pass**

Run: `pnpm exec vitest run --config ./vitest.config.mts tests/int/frontend/cmsData.int.spec.ts tests/int/frontend/postDetailPage.int.spec.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add tests/int/frontend/cmsData.int.spec.ts tests/int/frontend/postDetailPage.int.spec.ts src/app/(frontend)/lib/cmsData.ts src/app/(frontend)/post/[slug]/page.tsx
git commit -m "feat: allow authors to preview hidden posts"
```

### Task 3: Run focused verification and final typecheck

**Files:**
- Verify only: `tests/int/frontend/userCenterPage.int.spec.ts`
- Verify only: `tests/int/frontend/cmsData.int.spec.ts`
- Verify only: `tests/int/frontend/postDetailPage.int.spec.ts`
- Verify only: `src/app/(frontend)/user/me/page.tsx`
- Verify only: `src/app/(frontend)/lib/cmsData.ts`
- Verify only: `src/app/(frontend)/post/[slug]/page.tsx`

- [ ] **Step 1: Run the targeted frontend integration tests together**

```bash
pnpm exec vitest run --config ./vitest.config.mts tests/int/frontend/userCenterPage.int.spec.ts tests/int/frontend/cmsData.int.spec.ts tests/int/frontend/postDetailPage.int.spec.ts
```

Expected: PASS with the new hidden-post coverage green.

- [ ] **Step 2: Run the project typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 3: Inspect the final diff before handoff**

```bash
git diff --stat HEAD~2..HEAD
```

Expected: only the user-center page, locale files, `cmsData`, post detail page, and the new/updated frontend tests.

- [ ] **Step 4: Commit any last verification-only adjustments**

```bash
git add tests/int/frontend/userCenterPage.int.spec.ts tests/int/frontend/cmsData.int.spec.ts tests/int/frontend/postDetailPage.int.spec.ts src/app/(frontend)/user/me/page.tsx src/app/(frontend)/locales/zh-CN.json src/app/(frontend)/locales/en-US.json src/app/(frontend)/lib/cmsData.ts src/app/(frontend)/post/[slug]/page.tsx
git commit -m "test: verify hidden post preview flow"
```
