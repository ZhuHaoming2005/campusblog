import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import SchoolSearchSelect from '@/components/school/SchoolSearchSelect'

afterEach(() => {
  cleanup()
})

describe('SchoolSearchSelect', () => {
  it('opens search in the original select position and keeps the options panel length-limited', () => {
    const handleValueChange = vi.fn()

    render(
      <SchoolSearchSelect
        id="school-select"
        label="School"
        options={[
          { id: 10, name: 'North Campus' },
          { id: 11, name: 'South Campus' },
          { id: 12, name: 'West Campus' },
        ]}
        value=""
        onValueChange={handleValueChange}
        placeholder="Select school"
        searchPlaceholder="Search schools"
      />,
    )

    const closedControl = screen.getByRole('combobox', { name: 'School' })
    expect(closedControl.tagName).toBe('BUTTON')

    fireEvent.click(closedControl)

    const searchControl = screen.getByRole('combobox', { name: 'School' })
    expect(searchControl.tagName).toBe('INPUT')
    expect(searchControl.getAttribute('placeholder')).toBe('Search schools')

    const optionsPanel = screen.getByRole('listbox')
    expect(optionsPanel.querySelector('input')).toBeNull()
    expect(optionsPanel.className).toContain('max-h-48')
    expect(optionsPanel.className).toContain('overflow-y-auto')

    fireEvent.change(searchControl, { target: { value: 'South' } })

    expect(screen.queryByRole('option', { name: 'North Campus' })).toBeNull()
    fireEvent.click(screen.getByRole('option', { name: 'South Campus' }))

    expect(handleValueChange).toHaveBeenCalledWith('11')
  })
})
