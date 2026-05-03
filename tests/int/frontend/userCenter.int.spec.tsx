import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
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

  it('loads author-side data and renders author controls for verified sessions', async () => {
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
    expect(screen.getByText(dictionary.userCenter.draftsTitle)).toBeTruthy()
    expect(screen.getByText(dictionary.userCenter.publishedTitle)).toBeTruthy()
    expect(screen.getByText('Draft title')).toBeTruthy()
    expect(screen.getByText('Published title')).toBeTruthy()
    expect(screen.getAllByTestId('row-post-actions')).toHaveLength(2)
    expect(payloadFindMock).toHaveBeenCalledTimes(3)
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
  })
})
