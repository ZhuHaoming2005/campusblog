import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import SearchBar from '@/components/layout/SearchBar'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

afterEach(() => {
  cleanup()
  pushMock.mockReset()
})

describe('SearchBar', () => {
  it('renders the current query and submits the trimmed search to the configured path', () => {
    render(
      <SearchBar
        initialQuery="campus art"
        placeholder="Search campus news..."
        searchPath="/school/north-campus/search"
      />,
    )

    const input = screen.getByPlaceholderText('Search campus news...')

    expect((input as HTMLInputElement).value).toBe('campus art')

    fireEvent.change(input, { target: { value: '  cafeteria menu  ' } })
    const form = input.closest('form')
    expect(form).not.toBeNull()
    fireEvent.submit(form as HTMLFormElement)

    expect(pushMock).toHaveBeenCalledWith('/school/north-campus/search?q=cafeteria%20menu')
  })

  it('does not navigate for blank searches', () => {
    render(<SearchBar placeholder="Search campus news..." />)

    const input = screen.getByPlaceholderText('Search campus news...')

    fireEvent.change(input, { target: { value: '   ' } })
    const form = input.closest('form')
    expect(form).not.toBeNull()
    fireEvent.submit(form as HTMLFormElement)

    expect(pushMock).not.toHaveBeenCalled()
  })
})
