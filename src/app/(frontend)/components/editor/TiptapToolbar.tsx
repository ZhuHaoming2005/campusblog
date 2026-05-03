'use client'

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import type { Editor } from '@tiptap/react'
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconBlockquote,
  IconBold,
  IconClearFormatting,
  IconCode,
  IconH1,
  IconH2,
  IconH3,
  IconAlertTriangle,
  IconInfoCircle,
  IconItalic,
  IconLink,
  IconLinkOff,
  IconList,
  IconListNumbers,
  IconLoader2,
  IconPhoto,
  IconSeparator,
  IconStrikethrough,
  IconTerminal2,
} from '@tabler/icons-react'

import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  resolveTiptapEditorCopy,
  type TiptapEditorCopy,
} from './tiptapEditorCopy'

type TiptapToolbarProps = {
  copy?: Partial<TiptapEditorCopy>
  editor: Editor | null
  imageTitle?: string
  imageUploadingTitle?: string
  onOpenLinkPopover?: () => void
  onUploadImage?: (file: File) => Promise<void>
}

type ToolbarButtonProps = {
  children: ReactNode
  disabled?: boolean
  isActive?: boolean
  onClick: () => void
  title: string
}

type BlockFormat = 'paragraph' | 'h1' | 'h2' | 'h3' | 'bulletList' | 'orderedList' | 'blockquote' | 'codeBlock'

function ToolbarButton({ children, disabled, isActive, onClick, title }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors duration-150',
        isActive
          ? 'bg-campus-primary/10 text-campus-primary'
          : 'text-foreground/50 hover:bg-foreground/5 hover:text-foreground/80',
        disabled && 'cursor-not-allowed opacity-30',
      )}
    >
      {children}
    </button>
  )
}

function useEditorRenderVersion(editor: Editor | null) {
  const [, setVersion] = useState(0)

  useEffect(() => {
    if (!editor) return undefined

    const update = () => setVersion((version) => version + 1)

    editor.on('transaction', update)
    editor.on('selectionUpdate', update)

    return () => {
      editor.off('transaction', update)
      editor.off('selectionUpdate', update)
    }
  }, [editor])
}

export function getActiveBlockFormat(editor: Editor): BlockFormat {
  if (editor.isActive('heading', { level: 1 })) return 'h1'
  if (editor.isActive('heading', { level: 2 })) return 'h2'
  if (editor.isActive('heading', { level: 3 })) return 'h3'
  if (editor.isActive('bulletList')) return 'bulletList'
  if (editor.isActive('orderedList')) return 'orderedList'
  if (editor.isActive('blockquote')) return 'blockquote'
  if (editor.isActive('codeBlock')) return 'codeBlock'
  return 'paragraph'
}

export function applyBlockFormat(editor: Editor, format: BlockFormat) {
  const chain = editor.chain().focus()

  switch (format) {
    case 'h1':
      chain.toggleHeading({ level: 1 }).run()
      break
    case 'h2':
      chain.toggleHeading({ level: 2 }).run()
      break
    case 'h3':
      chain.toggleHeading({ level: 3 }).run()
      break
    case 'bulletList':
      chain.toggleBulletList().run()
      break
    case 'orderedList':
      chain.toggleOrderedList().run()
      break
    case 'blockquote':
      chain.toggleBlockquote().run()
      break
    case 'codeBlock':
      chain.toggleCodeBlock().run()
      break
    case 'paragraph':
      chain.setParagraph().run()
      break
  }
}

export function TiptapToolbar({
  copy,
  editor,
  imageTitle,
  imageUploadingTitle,
  onOpenLinkPopover,
  onUploadImage,
}: TiptapToolbarProps) {
  const iconSize = 18
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const toolbarCopy = resolveTiptapEditorCopy({
    ...copy,
    imageInsert: imageTitle ?? copy?.imageInsert,
    imageUploading: imageUploadingTitle ?? copy?.imageUploading,
  })

  useEditorRenderVersion(editor)

  if (!editor) return null

  const handleImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || !onUploadImage) return

    setIsUploadingImage(true)

    try {
      await onUploadImage(file)
    } finally {
      setIsUploadingImage(false)
    }
  }

  return (
    <div className="no-scrollbar sticky top-0 z-20 flex items-center gap-1 overflow-x-auto rounded-t-xl border-b border-border/50 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
      <select
        aria-label={toolbarCopy.blockFormat}
        value={getActiveBlockFormat(editor)}
        onChange={(event) => applyBlockFormat(editor, event.target.value as BlockFormat)}
        className="h-9 shrink-0 rounded-md border border-campus-primary/10 bg-white px-2 text-sm font-label text-foreground/70 outline-none transition-colors hover:border-campus-primary/20 focus:border-campus-primary/30"
      >
        <option value="paragraph">{toolbarCopy.paragraph}</option>
        <option value="h1">{toolbarCopy.heading1}</option>
        <option value="h2">{toolbarCopy.heading2}</option>
        <option value="h3">{toolbarCopy.heading3}</option>
        <option value="bulletList">{toolbarCopy.bulletList}</option>
        <option value="orderedList">{toolbarCopy.numberedList}</option>
        <option value="blockquote">{toolbarCopy.blockquote}</option>
        <option value="codeBlock">{toolbarCopy.codeBlock}</option>
      </select>

      <Separator orientation="vertical" className="mx-1 h-5 shrink-0" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title={`${toolbarCopy.bold} (${toolbarCopy.boldShortcut})`}
      >
        <IconBold size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title={`${toolbarCopy.italic} (${toolbarCopy.italicShortcut})`}
      >
        <IconItalic size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title={toolbarCopy.strikethrough}
      >
        <IconStrikethrough size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        title={toolbarCopy.inlineCode}
      >
        <IconCode size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => onOpenLinkPopover?.()}
        isActive={editor.isActive('link')}
        title={`${toolbarCopy.link} (${toolbarCopy.linkShortcut})`}
        disabled={!onOpenLinkPopover}
      >
        <IconLink size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().unsetCampusLink().run()}
        disabled={!editor.isActive('link')}
        title={toolbarCopy.removeLink}
      >
        <IconLinkOff size={iconSize} />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-5 shrink-0" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title={`${toolbarCopy.heading1} (${toolbarCopy.heading1Shortcut})`}
      >
        <IconH1 size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title={`${toolbarCopy.heading2} (${toolbarCopy.heading2Shortcut})`}
      >
        <IconH2 size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title={`${toolbarCopy.heading3} (${toolbarCopy.heading3Shortcut})`}
      >
        <IconH3 size={iconSize} />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-5 shrink-0" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title={`${toolbarCopy.bulletList} (${toolbarCopy.bulletListShortcut})`}
      >
        <IconList size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title={`${toolbarCopy.numberedList} (${toolbarCopy.numberedListShortcut})`}
      >
        <IconListNumbers size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title={toolbarCopy.blockquote}
      >
        <IconBlockquote size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => {
          const chain = editor.chain().focus()

          if (editor.isActive('campusCallout')) {
            chain.setCampusCalloutTone('note').run()
            return
          }

          chain.insertCampusCallout({ tone: 'note' }).run()
        }}
        isActive={editor.isActive('campusCallout', { tone: 'note' })}
        title={toolbarCopy.calloutNote}
      >
        <IconInfoCircle size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => {
          const chain = editor.chain().focus()

          if (editor.isActive('campusCallout')) {
            chain.setCampusCalloutTone('important').run()
            return
          }

          chain.insertCampusCallout({ tone: 'important' }).run()
        }}
        isActive={editor.isActive('campusCallout', { tone: 'important' })}
        title={toolbarCopy.calloutImportant}
      >
        <IconAlertTriangle size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive('codeBlock')}
        title={toolbarCopy.codeBlock}
      >
        <IconTerminal2 size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title={toolbarCopy.horizontalRule}
      >
        <IconSeparator size={iconSize} />
      </ToolbarButton>
      {onUploadImage ? (
        <ToolbarButton
          onClick={() => inputRef.current?.click()}
          disabled={isUploadingImage}
          title={isUploadingImage ? toolbarCopy.imageUploading : toolbarCopy.imageInsert}
        >
          {isUploadingImage ? (
            <IconLoader2 size={iconSize} className="animate-spin" />
          ) : (
            <IconPhoto size={iconSize} />
          )}
        </ToolbarButton>
      ) : null}

      <Separator orientation="vertical" className="mx-1 h-5 shrink-0" />

      <ToolbarButton
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        title={toolbarCopy.clearFormatting}
      >
        <IconClearFormatting size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title={`${toolbarCopy.undo} (${toolbarCopy.undoShortcut})`}
      >
        <IconArrowBackUp size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title={toolbarCopy.redo}
      >
        <IconArrowForwardUp size={iconSize} />
      </ToolbarButton>
      {onUploadImage ? (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            void handleImageSelect(event)
          }}
        />
      ) : null}
    </div>
  )
}
