'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { IconCheck, IconChevronDown, IconSearch } from '@tabler/icons-react'

import { cn } from '@/lib/utils'

type SchoolSearchOption = {
  id: number | string
  name: string
}

type SchoolSearchSelectProps = {
  className?: string
  emptyOptionLabel?: string
  emptyResultsLabel?: string
  id?: string
  invalid?: boolean
  label: string
  onValueChange: (value: string) => void
  options: SchoolSearchOption[]
  placeholder: string
  required?: boolean
  searchPlaceholder: string
  value: string
}

export default function SchoolSearchSelect({
  className,
  emptyOptionLabel,
  emptyResultsLabel = 'No schools found',
  id,
  invalid = false,
  label,
  onValueChange,
  options,
  placeholder,
  required = false,
  searchPlaceholder,
  value,
}: SchoolSearchSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')

  const listboxId = id ? `${id}-listbox` : undefined
  const selectedOption = useMemo(
    () => options.find((option) => String(option.id) === value),
    [options, value],
  )
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (!normalizedQuery) return options

    return options.filter((option) =>
      option.name.toLocaleLowerCase().includes(normalizedQuery),
    )
  }, [options, query])
  const showEmptyOption = Boolean(emptyOptionLabel) && !query.trim()
  const showNoResults = filteredOptions.length === 0 && !showEmptyOption

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
        setQuery('')
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isOpen])

  function handleToggle() {
    if (isOpen) {
      setIsOpen(false)
      setQuery('')
      return
    }

    setQuery('')
    setIsOpen(true)
  }

  function handleSelect(nextValue: string) {
    onValueChange(nextValue)
    setIsOpen(false)
    setQuery('')
  }

  return (
    <div ref={rootRef} className={cn('relative space-y-2', className)}>
      <label htmlFor={id} className="font-label text-sm text-foreground/70">
        {label}
        {required ? <span className="ml-0.5 text-red-400">*</span> : null}
      </label>

      {isOpen ? (
        <div className="relative">
          <IconSearch
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-campus-primary/50"
          />
          <input
            id={id}
            autoFocus
            role="combobox"
            aria-controls={listboxId}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-invalid={invalid || undefined}
            aria-label={label}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setIsOpen(false)
                setQuery('')
              }
            }}
            placeholder={searchPlaceholder}
            className={cn(
              'h-11 w-full rounded-xl border border-campus-border-soft bg-campus-panel pl-9 pr-10 text-sm font-label text-foreground shadow-[0_8px_22px_rgba(13,59,102,0.04)] outline-none transition-all placeholder:text-foreground/40 focus:border-campus-primary/40 focus:ring-3 focus:ring-campus-primary/10',
              invalid && 'border-red-400 focus:border-red-400 focus:ring-red-100',
            )}
          />
          <IconChevronDown
            size={17}
            aria-hidden="true"
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 rotate-180 text-campus-primary/70"
          />
        </div>
      ) : (
        <button
          id={id}
          type="button"
          role="combobox"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-invalid={invalid || undefined}
          aria-label={label}
          onClick={handleToggle}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setIsOpen(false)
              setQuery('')
            }
          }}
          className={cn(
            'flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-campus-border-soft bg-campus-panel px-3.5 text-left text-sm font-label text-foreground/75 shadow-[0_8px_22px_rgba(13,59,102,0.04)] outline-none transition-all hover:border-campus-primary/25 hover:bg-campus-panel-strong focus:border-campus-primary/40 focus:ring-3 focus:ring-campus-primary/10',
            invalid && 'border-red-400 focus:border-red-400 focus:ring-red-100',
          )}
        >
          <span className={cn('min-w-0 truncate', !selectedOption && 'text-foreground/45')}>
            {selectedOption?.name ?? placeholder}
          </span>
          <IconChevronDown
            size={17}
            aria-hidden="true"
            className="shrink-0 text-campus-primary/70 transition-transform"
          />
        </button>
      )}

      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-campus-border-soft bg-campus-panel shadow-[0_18px_46px_rgba(13,59,102,0.16)]">
          <div id={listboxId} role="listbox" className="max-h-48 overflow-y-auto p-2">
            {showEmptyOption ? (
              <button
                type="button"
                role="option"
                aria-selected={!value}
                onClick={() => handleSelect('')}
                className={cn(
                  'flex min-h-10 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-sm font-label text-foreground/70 transition-colors hover:bg-campus-panel-soft',
                  !value && 'bg-campus-primary/8 text-campus-primary',
                )}
              >
                <span className="min-w-0 truncate">{emptyOptionLabel}</span>
                {!value ? <IconCheck size={16} aria-hidden="true" className="shrink-0" /> : null}
              </button>
            ) : null}

            {filteredOptions.map((option) => {
              const optionValue = String(option.id)
              const isSelected = optionValue === value

              return (
                <button
                  key={optionValue}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(optionValue)}
                  className={cn(
                    'flex min-h-10 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-sm font-label text-foreground/75 transition-colors hover:bg-campus-panel-soft',
                    isSelected && 'bg-campus-primary/8 text-campus-primary',
                  )}
                >
                  <span className="min-w-0 truncate">{option.name}</span>
                  {isSelected ? <IconCheck size={16} aria-hidden="true" className="shrink-0" /> : null}
                </button>
              )
            })}

            {showNoResults ? (
              <p className="px-3 py-4 text-center text-sm font-label text-foreground/45">
                {emptyResultsLabel}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
