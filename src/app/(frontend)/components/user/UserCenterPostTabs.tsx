'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'

import type { Post } from '@/payload-types'
import type { AppLocale } from '@/lib/i18n/config'
import PostFeed from '@/components/PostFeed'
import { cn } from '@/lib/utils'

type UserCenterTabKey = 'mine' | 'liked' | 'bookmarked'

type UserCenterPostTabsProps = {
  labels: {
    bookmarked: string
    emptyBookmarked: string
    emptyLiked: string
    liked: string
    mine: string
    tabList: string
  }
  locale: AppLocale
  mineContent: ReactNode
  posts: Record<Exclude<UserCenterTabKey, 'mine'>, Post[]>
}

const TAB_KEYS: UserCenterTabKey[] = ['mine', 'liked', 'bookmarked']

export function UserCenterPostTabs({ labels, locale, mineContent, posts }: UserCenterPostTabsProps) {
  const [activeKey, setActiveKey] = useState<UserCenterTabKey>('mine')
  const activeIndex = Math.max(TAB_KEYS.indexOf(activeKey), 0)
  const activePosts = activeKey === 'mine' ? [] : posts[activeKey]
  const activeEmptyLabel =
    activeKey === 'liked' ? labels.emptyLiked : labels.emptyBookmarked

  const tabLabels: Record<UserCenterTabKey, string> = {
    bookmarked: labels.bookmarked,
    liked: labels.liked,
    mine: labels.mine,
  }

  return (
    <section className="space-y-4">
      <div
        data-testid="user-center-tabs-sticky"
        className="sticky top-[var(--floating-toolbar-top)] z-20 mx-auto w-fit max-w-full rounded-[1.75rem] px-3 py-2"
      >
        <div
          data-testid="user-center-content-tabs"
          role="tablist"
          aria-label={labels.tabList}
          className="relative inline-grid w-fit max-w-full min-w-[min(100%,22rem)] overflow-hidden rounded-full border border-campus-border-soft/80 bg-gradient-to-r from-campus-panel-soft via-campus-panel-strong/75 to-campus-panel-soft p-0.5"
          style={{ gridTemplateColumns: `repeat(${TAB_KEYS.length}, minmax(0, 1fr))` }}
        >
          <span
            data-testid="user-center-tabs-indicator"
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0.5 left-0.5 top-0.5 rounded-full bg-campus-primary transition-transform duration-300 ease-out"
            style={{
              transform: `translateX(calc(${activeIndex} * 100%))`,
              width: `calc((100% - 0.25rem) / ${TAB_KEYS.length})`,
            }}
          />

          {TAB_KEYS.map((key) => {
            const isActive = key === activeKey

            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveKey(key)}
                className={cn(
                  'relative z-10 inline-flex min-w-[6.5rem] items-center justify-center rounded-full px-3.5 py-1.5 text-center font-label text-sm font-semibold transition-colors duration-200',
                  isActive ? 'text-white' : 'text-campus-text-soft hover:text-campus-primary',
                )}
              >
                {tabLabels[key]}
              </button>
            )
          })}
        </div>
      </div>

      {activeKey === 'mine' ? (
        mineContent
      ) : activePosts.length > 0 ? (
        <PostFeed
          posts={activePosts}
          locale={locale}
          showSchoolName
          showChannelName
          variant="discover"
          featuredCount={2}
        />
      ) : (
        <section className="rounded-[1.75rem] border border-dashed border-campus-primary/16 p-10 text-center shadow-sm">
          <h3 className="font-headline text-2xl text-campus-primary">{activeEmptyLabel}</h3>
        </section>
      )}
    </section>
  )
}
