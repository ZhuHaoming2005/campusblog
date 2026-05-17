'use client'

import { useEffect, useId, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { IconCheck, IconX } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type SubscriptionDialogItem = {
  id: string | number
  name: string
  slug: string
  subscribed: boolean
}

type SubscriptionManagerDialogProps = {
  closeLabel: string
  error?: string | null
  items: SubscriptionDialogItem[]
  onOpenChange: (open: boolean) => void
  onToggle: (item: SubscriptionDialogItem) => void
  open: boolean
  pendingId?: string | null
  subscribeLabel: string
  title: string
  unsubscribeLabel: string
}

type GroupedItems = {
  items: SubscriptionDialogItem[]
  letter: string
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

const slugCollator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

function getSlugInitial(slug: string) {
  const firstChar = slug.trim().charAt(0).toUpperCase()
  return /^[A-Z0-9]$/.test(firstChar) ? firstChar : '#'
}

function getIndexKey(letter: string) {
  return letter === '#' ? 'other' : letter.toLowerCase()
}

function getSectionId(titleId: string, letter: string) {
  return `${titleId}-${getIndexKey(letter)}`
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) return []

  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.tabIndex >= 0 && element.getAttribute('aria-hidden') !== 'true',
  )
}

export function SubscriptionManagerDialog({
  closeLabel,
  error,
  items,
  onOpenChange,
  onToggle,
  open,
  pendingId,
  subscribeLabel,
  title,
  unsubscribeLabel,
}: SubscriptionManagerDialogProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const onOpenChangeRef = useRef(onOpenChange)
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const groupedItems = useMemo<GroupedItems[]>(() => {
    const sortedItems = [...items].sort((a, b) => {
      const initialCompare = slugCollator.compare(getSlugInitial(a.slug), getSlugInitial(b.slug))
      if (initialCompare !== 0) return initialCompare

      const slugCompare = slugCollator.compare(a.slug, b.slug)
      if (slugCompare !== 0) return slugCompare

      return slugCollator.compare(a.name, b.name)
    })

    return sortedItems.reduce<GroupedItems[]>((groups, item) => {
      const letter = getSlugInitial(item.slug)
      const currentGroup = groups[groups.length - 1]

      if (currentGroup?.letter === letter) {
        currentGroup.items.push(item)
        return groups
      }

      groups.push({ items: [item], letter })
      return groups
    }, [])
  }, [items])

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange
  }, [onOpenChange])

  useEffect(() => {
    if (!open) return

    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const focusableElements = getFocusableElements(dialogRef.current)
    const initialFocusTarget = focusableElements[0] ?? dialogRef.current
    initialFocusTarget?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChangeRef.current(false)
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const dialogElement = dialogRef.current
      const focusableElements = getFocusableElements(dialogElement)
      if (!dialogElement || focusableElements.length === 0) {
        event.preventDefault()
        dialogElement?.focus()
        return
      }

      const firstFocusableElement = focusableElements[0]
      const lastFocusableElement = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement

      if (!dialogElement.contains(activeElement)) {
        event.preventDefault()
        firstFocusableElement?.focus()
        return
      }

      if (event.shiftKey && activeElement === firstFocusableElement) {
        event.preventDefault()
        lastFocusableElement?.focus()
        return
      }

      if (!event.shiftKey && activeElement === lastFocusableElement) {
        event.preventDefault()
        firstFocusableElement?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      const restoreFocusTarget = restoreFocusRef.current
      if (restoreFocusTarget?.isConnected) {
        restoreFocusTarget.focus()
      }
      restoreFocusRef.current = null
    }
  }, [open])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={closeLabel}
        className="absolute inset-0 bg-campus-primary/28 backdrop-blur-[3px]"
        onClick={() => {
          onOpenChange(false)
        }}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex max-h-[min(82vh,44rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[1.75rem] border border-campus-primary/10 bg-white shadow-[0_28px_90px_rgba(13,59,102,0.22)]"
      >
        <div className="flex items-center justify-between gap-4 border-b border-campus-primary/8 px-5 py-4 sm:px-6">
          <h3 id={titleId} className="font-headline text-2xl text-campus-primary">
            {title}
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={closeLabel}
            className="rounded-full text-campus-primary/55 hover:bg-campus-primary/8 hover:text-campus-primary"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            <IconX size={18} />
          </Button>
        </div>

        <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_2.5rem] gap-3 px-4 py-4 sm:px-5">
          <div
            data-testid="subscription-dialog-list"
            className="max-h-[min(60vh,32rem)] space-y-4 overflow-y-auto pr-1"
          >
            {groupedItems.map((group) => {
              const sectionId = getSectionId(titleId, group.letter)

              return (
                <section key={group.letter} id={sectionId} className="scroll-mt-4">
                  <h4 className="mb-1 px-2 font-label text-xs font-bold text-campus-primary/45">
                    {group.letter}
                  </h4>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const itemKey = String(item.id)
                      const isPending = pendingId === itemKey

                      return (
                        <div
                          key={itemKey}
                          data-testid={`subscription-dialog-item-${item.id}`}
                          className={cn(
                            'flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors',
                            item.subscribed
                              ? 'bg-campus-teal/8'
                              : 'hover:bg-campus-primary/[0.035]',
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-label text-sm font-semibold text-campus-primary">
                              {item.name}
                            </p>
                            <p className="truncate font-mono text-[11px] text-campus-primary/42">
                              {item.slug}
                            </p>
                          </div>
                          <Button
                            aria-pressed={item.subscribed}
                            data-testid={`subscription-dialog-toggle-${item.id}`}
                            disabled={isPending}
                            onClick={() => {
                              onToggle(item)
                            }}
                            size="sm"
                            type="button"
                            variant="outline"
                            className={cn(
                              'h-8 rounded-full px-3 font-label text-xs font-bold',
                              item.subscribed
                                ? 'border-campus-teal/25 bg-campus-teal/10 text-campus-primary hover:bg-campus-teal/15 hover:text-campus-primary'
                                : 'border-campus-primary/10 bg-white text-campus-accent hover:bg-campus-accent/5 hover:text-campus-accent',
                            )}
                          >
                            {item.subscribed ? <IconCheck size={14} /> : null}
                            {item.subscribed ? unsubscribeLabel : subscribeLabel}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })}

            {error ? (
              <p className="px-2 py-1 font-label text-xs text-destructive">{error}</p>
            ) : null}
          </div>

          <div className="flex items-start justify-center">
            <div className="sticky top-0 flex flex-col items-center gap-1 rounded-full border border-campus-primary/8 bg-campus-surface-container/70 px-1 py-1">
              {groupedItems.map((group) => {
                const indexKey = getIndexKey(group.letter)

                return (
                  <button
                    key={group.letter}
                    type="button"
                    data-testid={`subscription-dialog-index-${indexKey}`}
                    className="flex h-6 w-6 items-center justify-center rounded-full font-label text-[11px] font-bold text-campus-primary/55 transition-colors hover:bg-white hover:text-campus-primary"
                    onClick={() => {
                      document
                        .getElementById(getSectionId(titleId, group.letter))
                        ?.scrollIntoView({ block: 'start' })
                    }}
                  >
                    {group.letter}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
