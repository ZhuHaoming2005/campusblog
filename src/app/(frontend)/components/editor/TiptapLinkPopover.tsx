'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Editor } from '@tiptap/react'
import { IconCheck, IconLink, IconLinkOff, IconX } from '@tabler/icons-react'

import { cn } from '@/lib/utils'
import { normalizeCampusLinkHref } from '../../lib/tiptap-link'
import type { TiptapEditorCopy } from './tiptapEditorCopy'

type TiptapLinkPopoverProps = {
  buttonClassName?: string
  copy: TiptapEditorCopy
  editor: Editor
  iconSize?: number
  isActive?: boolean
}

export function TiptapLinkPopover({
  buttonClassName,
  copy,
  editor,
  iconSize = 18,
  isActive,
}: TiptapLinkPopoverProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({})
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return

    window.setTimeout(() => inputRef.current?.focus(), 0)
  }, [isOpen])

  const togglePopover = () => {
    if (!isOpen) {
      const anchor = buttonRef.current?.getBoundingClientRect()
      if (anchor) {
        setPopoverStyle({
          left: Math.max(12, Math.min(anchor.left, window.innerWidth - 300)),
          top: anchor.bottom + 6,
        })
      }

      const previousHref = editor.getAttributes('link').href
      setValue(typeof previousHref === 'string' ? previousHref : '')
      setError('')
    }

    setIsOpen((current) => !current)
  }

  const applyLink = () => {
    const href = normalizeCampusLinkHref(value)

    if (!href) {
      setError(copy.invalidLink)
      return
    }

    editor.chain().focus().extendMarkRange('link').setCampusLink({ href }).run()
    setIsOpen(false)
  }

  const removeLink = () => {
    editor.chain().focus().unsetCampusLink().run()
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={togglePopover}
        title={copy.link}
        className={cn(
          buttonClassName,
          isActive
            ? 'bg-campus-primary/10 text-campus-primary'
            : 'text-foreground/60 hover:bg-foreground/5 hover:text-foreground/85',
        )}
      >
        <IconLink size={iconSize} />
      </button>

      {isOpen ? (
        <div
          style={popoverStyle}
          className="fixed z-50 w-72 rounded-lg border border-campus-primary/10 bg-white p-2 shadow-xl"
        >
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              value={value}
              onChange={(event) => {
                setValue(event.target.value)
                setError('')
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  applyLink()
                }
                if (event.key === 'Escape') {
                  event.preventDefault()
                  setIsOpen(false)
                }
              }}
              placeholder={copy.linkPlaceholder}
              className="h-9 min-w-0 flex-1 rounded-md border border-campus-primary/10 px-2 text-sm outline-none focus:border-campus-primary/35"
            />
            <button
              type="button"
              onClick={applyLink}
              title={copy.applyLink}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-campus-primary text-white"
            >
              <IconCheck size={17} />
            </button>
            <button
              type="button"
              onClick={removeLink}
              disabled={!editor.isActive('link')}
              title={copy.removeLink}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground/55 hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <IconLinkOff size={17} />
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              title={copy.cancel}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground/45 hover:bg-foreground/5"
            >
              <IconX size={17} />
            </button>
          </div>
          {error ? <p className="mt-1 px-1 text-xs font-label text-red-500">{error}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
