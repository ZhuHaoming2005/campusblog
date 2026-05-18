import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDictionary } from '@/app/(frontend)/lib/i18n/dictionaries'

const getPayloadMock = vi.fn()

vi.mock('server-only', () => ({}))

vi.mock('payload', () => ({
  getPayload: getPayloadMock,
}))

vi.mock('@/payload.config', () => ({
  default: Promise.resolve({ fake: 'config' }),
}))

describe('user center', () => {
  const dictionary = getDictionary('en-US')

  beforeEach(() => {
    getPayloadMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('treats unverified sessions like guests in sidebar state', async () => {
    vi.resetModules()

    const { toSidebarUser } = await import('@/lib/frontendSession')

    expect(
      toSidebarUser({
        _verified: false,
        displayName: 'Campus Writer',
        email: 'writer@example.com',
        id: 1,
      } as never),
    ).toBeNull()

    expect(
      toSidebarUser({
        _verified: null,
        displayName: 'Pending Writer',
        email: 'pending@example.com',
        id: 2,
      } as never),
    ).toBeNull()

    expect(
      toSidebarUser({
        avatar: { url: '/avatar.png' as const },
        _verified: true,
        displayName: 'Campus Writer',
        email: 'writer@example.com',
        id: 1,
      } as never),
    ).toMatchObject({
      avatarUrl: '/avatar.png',
      displayName: 'Campus Writer',
      email: 'writer@example.com',
      id: 1,
    })
  })

  async function renderUserCenterPage(args: {
    payloadFindDocs?: Array<{ docs: unknown[] }>
    postUsageBytesMap?: Map<string, number>
    user: Record<string, unknown>
  }) {
    vi.resetModules()

    const requireFrontendAuthMock = vi.fn().mockResolvedValue({
      ok: true,
      user: args.user,
    })
    const payloadFindMock = vi.fn()
    for (const result of args.payloadFindDocs ?? []) {
      payloadFindMock.mockResolvedValueOnce(result)
    }
    const getPostUsageBytesMapMock = vi
      .fn()
      .mockResolvedValue(args.postUsageBytesMap ?? new Map())
    const userPostActionsMock = vi.fn(
      ({
        actionLabel,
      }: {
        actionLabel: string
      }) => <div data-testid="row-post-actions">{actionLabel}</div>,
    )

    vi.doMock('next/link', () => ({
      default: ({
        children,
        href,
        ...props
      }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
        <a href={href} {...props}>
          {children}
        </a>
      ),
    }))
    vi.doMock('next/navigation', () => ({
      redirect: vi.fn(),
    }))
    vi.doMock('next/server', () => ({
      connection: vi.fn(),
    }))
    vi.doMock('@/app/api/auth/_lib/frontendAuth', () => ({
      requireFrontendAuth: requireFrontendAuthMock,
    }))
    vi.doMock('@/lib/frontendSession', async () => {
      const actual = await vi.importActual<typeof import('@/lib/frontendSession')>(
        '@/lib/frontendSession',
      )

      return {
        ...actual,
        getFrontendPayload: vi.fn().mockResolvedValue({
          find: payloadFindMock,
        }),
      }
    })
    vi.doMock('@/quota/postQuota', () => ({
      getPostUsageBytesMap: getPostUsageBytesMapMock,
    }))
    vi.doMock('@/app/(frontend)/lib/requestContext', () => ({
      getFrontendRequestContext: vi.fn().mockResolvedValue({
        headers: new Headers(),
        locale: 'en-US',
        t: dictionary,
      }),
    }))
    vi.doMock('@/components/auth/LogoutButton', () => ({
      default: ({ label }: { label: string }) => <button type="button">{label}</button>,
    }))
    vi.doMock('@/components/user/UserProfileEditor', () => ({
      default: () => <div data-testid="user-profile-editor" />,
    }))
    vi.doMock('@/components/user/UserPostActions', () => ({
      default: userPostActionsMock,
    }))
    vi.doMock('@/components/PostFeed', () => ({
      default: ({ posts }: { posts: Array<{ id: number; title: string }> }) => (
        <div data-testid="mock-post-feed">
          {posts.map((post) => (
            <article key={post.id}>{post.title}</article>
          ))}
        </div>
      ),
    }))

    const { UserCenterPageContent } = await import(
      '@/app/(frontend)/(site)/user/me/UserCenterPageContent'
    )

    render(await UserCenterPageContent())

    return {
      getPostUsageBytesMapMock,
      payloadFindMock,
      requireFrontendAuthMock,
      userPostActionsMock,
    }
  }

  it('loads profile data and renders tabbed content feeds for verified sessions', async () => {
    const verifiedUser: Record<string, unknown> = {
      _verified: true,
      avatar: null,
      bio: '',
      displayName: 'Campus Writer',
      email: 'writer@example.com',
      id: 1,
      quotaBytes: 4096,
      usedBytes: 1536,
    }
    const { getPostUsageBytesMapMock, payloadFindMock, userPostActionsMock } =
      await renderUserCenterPage({
        payloadFindDocs: [
          {
            docs: [
              {
                id: 11,
                title: 'Draft title',
                status: 'draft',
                updatedAt: '2026-04-23T00:00:00.000Z',
              },
            ],
          },
          {
            docs: [
              {
                id: 12,
                slug: 'published-title',
                title: 'Published title',
                status: 'published',
                updatedAt: '2026-04-22T00:00:00.000Z',
              },
            ],
          },
          {
            docs: [],
          },
          {
            docs: [
              {
                id: 21,
                createdAt: '2026-04-21T00:00:00.000Z',
                post: {
                  id: 13,
                  slug: 'liked-title',
                  title: 'Liked title',
                  status: 'published',
                  updatedAt: '2026-04-20T00:00:00.000Z',
                },
              },
            ],
          },
          {
            docs: [
              {
                id: 31,
                createdAt: '2026-04-19T00:00:00.000Z',
                post: {
                  id: 14,
                  slug: 'bookmarked-title',
                  title: 'Bookmarked title',
                  status: 'published',
                  updatedAt: '2026-04-18T00:00:00.000Z',
                },
              },
            ],
          },
        ],
        postUsageBytesMap: new Map([
          ['11', 512],
          ['12', 1024],
        ]),
        user: verifiedUser,
      })

    expect(screen.getByTestId('write-article-button')).toBeTruthy()
    expect(screen.getByTestId('user-profile-editor')).toBeTruthy()
    expect(screen.getByText(dictionary.userCenter.profileCardTitle)).toBeTruthy()
    expect(screen.getByText(dictionary.userCenter.quotaCardTitle)).toBeTruthy()
    expect(screen.getByText(dictionary.userCenter.myArticlesTitle)).toBeTruthy()
    expect(screen.getByText(dictionary.userCenter.likedTitle)).toBeTruthy()
    expect(screen.getByText(dictionary.userCenter.bookmarkedTitle)).toBeTruthy()
    expect(screen.getByText(dictionary.userCenter.draftsTitle)).toBeTruthy()
    expect(screen.getByText(dictionary.userCenter.publishedTitle)).toBeTruthy()
    expect(screen.getByText('Draft title')).toBeTruthy()
    expect(screen.getByText('Published title')).toBeTruthy()
    expect(screen.getAllByTestId('row-post-actions')).toHaveLength(2)
    fireEvent.click(screen.getByRole('tab', { name: dictionary.userCenter.likedTitle }))
    expect(screen.getByText('Liked title')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: dictionary.userCenter.bookmarkedTitle }))
    expect(screen.getByText('Bookmarked title')).toBeTruthy()
    expect(payloadFindMock).toHaveBeenCalledTimes(5)
    expect(getPostUsageBytesMapMock).toHaveBeenCalledTimes(1)
    expect(userPostActionsMock).toHaveBeenCalledTimes(2)
    expect(payloadFindMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        collection: 'posts',
        overrideAccess: false,
        user: verifiedUser,
      }),
    )
    expect(payloadFindMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        collection: 'posts',
        overrideAccess: false,
        user: verifiedUser,
      }),
    )
    expect(payloadFindMock).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        collection: 'posts',
        overrideAccess: false,
        user: verifiedUser,
      }),
    )
    expect(payloadFindMock).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        collection: 'post-likes',
        depth: 2,
        overrideAccess: false,
        user: verifiedUser,
      }),
    )
    expect(payloadFindMock).toHaveBeenNthCalledWith(
      5,
      expect.objectContaining({
        collection: 'post-bookmarks',
        depth: 2,
        overrideAccess: false,
        user: verifiedUser,
      }),
    )
  })
})
