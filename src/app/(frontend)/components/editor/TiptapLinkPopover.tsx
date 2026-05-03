'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Editor } from '@tiptap/react'
import { IconCheck, IconLinkOff, IconX } from '@tabler/icons-react'

import { normalizeCampusLinkHref } from '../../lib/tiptap-link'
import type { TiptapEditorCopy } from './tiptapEditorCopy'

type TiptapLinkPopoverProps = {
  copy: TiptapEditorCopy
  editor: Editor
  onClose: () => void
}

function getSelectionPopoverStyle(editor: Editor): CSSProperties {
  const { from, to } = editor.state.selection
  const anchorPos = to > from ? to : from

  try {
    const anchor = editor.view.coordsAtPos(anchorPos)

    return {
      left: Math.max(12, Math.min(anchor.left, window.innerWidth - 300)),
      top: Math.max(12, Math.min(anchor.bottom + 8, window.innerHeight - 72)),
    }
  } catch {
    return {
      left: 12,
      top: 80,
    }
  }
}

export function TiptapLinkPopover({ copy, editor, onClose }: TiptapLinkPopoverProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [popoverStyle] = useState<CSSProperties>(() => getSelectionPopoverStyle(editor))
  const [value, setValue] = useState(() => {
    const previousHref = editor.getAttributes('link').href
    return typeof previousHref === 'string' ? previousHref : ''
  })
  const [error, setError] = useState('')

  useEffect(() => {
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }, [])

  const applyLink = () => {
    const href = normalizeCampusLinkHref(value)

    if (!href) {
      setError(copy.invalidLink)
      return
    }

    editor.chain().focus().extendMarkRange('link').setCampusLink({ href }).run()
    onClose()
  }

  const removeLink = () => {
    editor.chain().focus().unsetCampusLink().run()
    onClose()
  }

  return (
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
              onClose()
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
          onClick={onClose}
          title={copy.cancel}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground/45 hover:bg-foreground/5"
        >
          <IconX size={17} />
        </button>
      </div>
      {error ? <p className="mt-1 px-1 text-xs font-label text-red-500">{error}</p> : null}
    </div>
  )
}
