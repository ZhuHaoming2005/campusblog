import { describe, expect, it } from 'vitest'

import { getOutlineScrollTop } from '@/app/(frontend)/components/editor/editorScroll'

describe('editor outline scrolling', () => {
  it('positions the target heading below the sticky toolbar', () => {
    expect(
      getOutlineScrollTop({
        containerTop: 100,
        currentScrollTop: 240,
        headingTop: 560,
        toolbarHeight: 52,
      }),
    ).toBe(636)
  })

  it('does not produce negative scroll offsets near the top', () => {
    expect(
      getOutlineScrollTop({
        containerTop: 100,
        currentScrollTop: 0,
        headingTop: 110,
        toolbarHeight: 52,
      }),
    ).toBe(0)
  })
})
