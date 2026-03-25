'use client'

import { useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import {
  IconBold,
  IconItalic,
  IconStrikethrough,
  IconCode,
  IconH1,
  IconH2,
  IconH3,
  IconList,
  IconListNumbers,
  IconBlockquote,
  IconTerminal2,
  IconSeparator,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconLoader2,
  IconPhoto,
} from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

type TiptapToolbarProps = {
  editor: Editor | null
  imageTitle?: string
  imageUploadingTitle?: string
  onUploadImage?: (file: File) => Promise<void>
}

type ToolbarButtonProps = {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  children: React.ReactNode
  title: string
}

function ToolbarButton({ onClick, isActive, disabled, children, title }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-1.5 rounded-md transition-colors duration-150',
        isActive
          ? 'bg-campus-primary/10 text-campus-primary'
          : 'text-foreground/50 hover:text-foreground/80 hover:bg-foreground/5',
        disabled && 'opacity-30 cursor-not-allowed',
      )}
    >
      {children}
    </button>
  )
}

export function TiptapToolbar({
  editor,
  imageTitle = 'Insert image',
  imageUploadingTitle = 'Uploading image...',
  onUploadImage,
}: TiptapToolbarProps) {
  if (!editor) return null

  const iconSize = 18
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
    <div className="flex items-center gap-0.5 flex-wrap px-3 py-2 border-b border-border/50">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold"
      >
        <IconBold size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic"
      >
        <IconItalic size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="Strikethrough"
      >
        <IconStrikethrough size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        title="Inline Code"
      >
        <IconCode size={iconSize} />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
      >
        <IconH1 size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
      >
        <IconH2 size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="Heading 3"
      >
        <IconH3 size={iconSize} />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
      >
        <IconList size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Ordered List"
      >
        <IconListNumbers size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="Blockquote"
      >
        <IconBlockquote size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive('codeBlock')}
        title="Code Block"
      >
        <IconTerminal2 size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal Rule"
      >
        <IconSeparator size={iconSize} />
      </ToolbarButton>
      {onUploadImage ? (
        <ToolbarButton
          onClick={() => inputRef.current?.click()}
          disabled={isUploadingImage}
          title={isUploadingImage ? imageUploadingTitle : imageTitle}
        >
          {isUploadingImage ? (
            <IconLoader2 size={iconSize} className="animate-spin" />
          ) : (
            <IconPhoto size={iconSize} />
          )}
        </ToolbarButton>
      ) : null}

      <Separator orientation="vertical" className="mx-1 h-5" />

      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo"
      >
        <IconArrowBackUp size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo"
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
