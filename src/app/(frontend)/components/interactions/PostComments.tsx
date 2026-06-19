'use client'

import { FormEvent, useMemo, useState, useTransition } from 'react'
import { IconMessageCircle, IconSend } from '@tabler/icons-react'

import type { AppLocale } from '@/lib/i18n/config'
import type { FrontendComment } from '@/lib/commentPresentation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type PostCommentsProps = {
  canComment: boolean
  initialComments: FrontendComment[]
  labels: {
    authRequired: string
    empty: string
    error: string
    placeholder: string
    submit: string
    submitting: string
    title: string
    anonymous: string
  }
  locale: AppLocale
  postId: number
}

function getRedirectLocation(response: Response) {
  if (response.status !== 401 && response.status !== 403) return null
  return response.headers.get('location')
}

export function PostComments({
  canComment,
  initialComments,
  labels,
  locale,
  postId,
}: PostCommentsProps) {
  const [comments, setComments] = useState(initialComments)
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [locale],
  )

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextContent = content.trim()
    if (!nextContent) return

    setError(null)
    startTransition(async () => {
      try {
        const response = await fetch(`/api/interactions/posts/${postId}/comments`, {
          body: JSON.stringify({ content: nextContent }),
          headers: { 'content-type': 'application/json' },
          method: 'POST',
        })
        const redirectLocation = getRedirectLocation(response)
        if (redirectLocation) {
          window.location.assign(redirectLocation)
          return
        }

        if (!response.ok) {
          throw new Error('Comment request failed.')
        }

        const result = (await response.json()) as { comment?: FrontendComment }
        if (result.comment) {
          setComments((current) => [...current, result.comment!])
          setContent('')
        }
      } catch {
        setError(labels.error)
      }
    })
  }

  return (
    <section className="rounded-[2rem] border border-campus-border-soft/80 bg-[linear-gradient(180deg,#FFFFFF_0%,#F9FBFE_100%)] p-5 shadow-[0_14px_36px_rgba(27,75,122,0.04)] sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 font-headline text-2xl text-campus-primary">
          <IconMessageCircle size={22} />
          {labels.title}
        </h2>
        <span className="rounded-full border border-campus-primary/10 bg-campus-panel-strong px-3 py-1 text-sm font-label text-campus-text-soft">
          {comments.length}
        </span>
      </div>

      <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
        <Textarea
          className="min-h-24 resize-y rounded-2xl border-campus-border-soft bg-white/80 text-base"
          disabled={!canComment || isPending}
          maxLength={2000}
          onChange={(event) => setContent(event.target.value)}
          placeholder={canComment ? labels.placeholder : labels.authRequired}
          value={content}
        />
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-destructive">{error}</div>
          <Button
            className="h-9 rounded-full bg-campus-primary px-4 font-label font-semibold text-white hover:bg-campus-primary/90"
            disabled={!canComment || isPending || content.trim().length === 0}
            type="submit"
          >
            <IconSend size={15} />
            <span>{isPending ? labels.submitting : labels.submit}</span>
          </Button>
        </div>
      </form>

      <div className="mt-6 space-y-4">
        {comments.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-campus-border-soft bg-campus-panel-soft/50 px-4 py-5 text-sm text-campus-text-soft">
            {labels.empty}
          </p>
        ) : (
          comments.map((comment) => (
            <article
              className="flex gap-3 border-b border-campus-border-soft/70 pb-4 last:border-b-0 last:pb-0"
              key={comment.id}
            >
              <Avatar className="h-9 w-9 border border-campus-border-soft">
                {comment.author?.avatarUrl ? (
                  <AvatarImage src={comment.author.avatarUrl} alt={comment.author.displayName} />
                ) : null}
                <AvatarFallback className="bg-campus-panel-strong text-campus-primary">
                  {comment.author?.displayName.slice(0, 1).toUpperCase() ?? 'A'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-label text-sm font-semibold text-foreground/80">
                    {comment.author?.displayName ?? labels.anonymous}
                  </span>
                  <time className="text-xs text-campus-text-soft" dateTime={comment.createdAt}>
                    {dateFormatter.format(new Date(comment.createdAt))}
                  </time>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/75">
                  {comment.content}
                </p>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
