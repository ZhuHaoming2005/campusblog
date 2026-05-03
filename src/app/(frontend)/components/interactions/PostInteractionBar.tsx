'use client'

import { useState, useTransition } from 'react'
import {
  IconBookmark,
  IconBookmarkFilled,
  IconHeart,
  IconHeartFilled,
  IconUserCheck,
  IconUserPlus,
} from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type PostInteractionBarProps = {
  authorId?: number | string | null
  className?: string
  initialState: {
    bookmarked: boolean
    followingAuthor: boolean
    liked: boolean
    likeCount: number
  }
  labels: {
    bookmark: string
    bookmarked: string
    follow: string
    following: string
    like: string
    liked: string
  }
  postId: number
  viewerId?: number | string | null
}

type ToggleKey = 'bookmarked' | 'followingAuthor' | 'liked'

function getRedirectLocation(response: Response) {
  if (response.status !== 401 && response.status !== 403) return null
  return response.headers.get('location')
}

export function PostInteractionBar({
  authorId,
  className,
  initialState,
  labels,
  postId,
  viewerId,
}: PostInteractionBarProps) {
  const [state, setState] = useState(initialState)
  const [isPending, startTransition] = useTransition()
  const canFollowAuthor = Boolean(authorId && String(authorId) !== String(viewerId ?? ''))

  const toggle = (key: ToggleKey, endpoint: string) => {
    const nextEnabled = !state[key]
    setState((current) => ({
      ...current,
      [key]: nextEnabled,
      likeCount:
        key === 'liked'
          ? Math.max(0, current.likeCount + (nextEnabled ? 1 : -1))
          : current.likeCount,
    }))

    startTransition(async () => {
      try {
        const response = await fetch(endpoint, {
          method: nextEnabled ? 'POST' : 'DELETE',
        })
        const redirectLocation = getRedirectLocation(response)
        if (redirectLocation) {
          window.location.assign(redirectLocation)
          return
        }

        if (!response.ok) {
          throw new Error('Interaction request failed.')
        }
      } catch {
        setState((current) => ({
          ...current,
          [key]: !nextEnabled,
          likeCount:
            key === 'liked'
              ? Math.max(0, current.likeCount + (nextEnabled ? -1 : 1))
              : current.likeCount,
        }))
      }
    })
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Button
        aria-pressed={state.liked}
        className={cn(
          'h-9 rounded-full border px-3.5 font-label font-semibold',
          state.liked
            ? 'border-rose-500/20 bg-rose-500 text-white hover:bg-rose-500/90'
            : 'border-campus-primary/10 bg-white/75 text-campus-primary hover:bg-campus-panel-strong',
        )}
        disabled={isPending}
        onClick={() => toggle('liked', `/api/interactions/posts/${postId}/likes`)}
        type="button"
        variant="ghost"
      >
        {state.liked ? <IconHeartFilled size={15} /> : <IconHeart size={15} />}
        <span>{state.liked ? labels.liked : labels.like}</span>
        <span className="tabular-nums">{state.likeCount}</span>
      </Button>

      <Button
        aria-pressed={state.bookmarked}
        className={cn(
          'h-9 rounded-full border px-3.5 font-label font-semibold',
          state.bookmarked
            ? 'border-campus-secondary/20 bg-campus-secondary text-white hover:bg-campus-secondary/90'
            : 'border-campus-primary/10 bg-white/75 text-campus-primary hover:bg-campus-panel-strong',
        )}
        disabled={isPending}
        onClick={() => toggle('bookmarked', `/api/interactions/posts/${postId}/bookmarks`)}
        type="button"
        variant="ghost"
      >
        {state.bookmarked ? <IconBookmarkFilled size={15} /> : <IconBookmark size={15} />}
        <span>{state.bookmarked ? labels.bookmarked : labels.bookmark}</span>
      </Button>

      {canFollowAuthor ? (
        <Button
          aria-pressed={state.followingAuthor}
          className={cn(
            'h-9 rounded-full border px-3.5 font-label font-semibold',
            state.followingAuthor
              ? 'border-campus-teal/20 bg-campus-teal text-white hover:bg-campus-teal/90'
              : 'border-campus-primary/10 bg-white/75 text-campus-primary hover:bg-campus-panel-strong',
          )}
          disabled={isPending}
          onClick={() => toggle('followingAuthor', `/api/interactions/users/${authorId}/follow`)}
          type="button"
          variant="ghost"
        >
          {state.followingAuthor ? <IconUserCheck size={15} /> : <IconUserPlus size={15} />}
          <span>{state.followingAuthor ? labels.following : labels.follow}</span>
        </Button>
      ) : null}
    </div>
  )
}
