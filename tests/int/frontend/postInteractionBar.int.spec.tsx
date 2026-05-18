import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PostInteractionBar } from '@/components/interactions/PostInteractionBar'

const labels = {
  bookmark: 'Bookmark',
  bookmarked: 'Bookmarked',
  follow: 'Follow author',
  following: 'Following',
  like: 'Like',
  liked: 'Liked',
}

describe('PostInteractionBar', () => {
  it('keeps like and bookmark actions grouped on the right side of the article header', () => {
    render(
      <PostInteractionBar
        authorId={12}
        initialState={{
          bookmarked: false,
          followingAuthor: false,
          liked: false,
          likeCount: 3,
        }}
        labels={labels}
        postId={42}
        viewerId={7}
      />,
    )

    const rightActions = screen.getByTestId('post-interaction-primary-actions')
    const followActions = screen.getByTestId('post-interaction-secondary-actions')

    expect(rightActions.className).toContain('ml-auto')
    expect(rightActions.className).toContain('justify-end')
    expect(rightActions.contains(screen.getByRole('button', { name: /like/i }))).toBe(true)
    expect(rightActions.contains(screen.getByRole('button', { name: /bookmark/i }))).toBe(true)
    expect(followActions.contains(screen.getByRole('button', { name: /follow author/i }))).toBe(
      true,
    )
  })
})
