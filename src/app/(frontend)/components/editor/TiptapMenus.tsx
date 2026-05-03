'use client'

import type { ReactNode } from 'react'
import { type Editor } from '@tiptap/react'
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus'
import {
  IconAlertTriangle,
  IconBlockquote,
  IconBold,
  IconCode,
  IconH2,
  IconInfoCircle,
  IconItalic,
  IconList,
  IconPhoto,
  IconSeparator,
  IconStrikethrough,
} from '@tabler/icons-react'

import { cn } from '@/lib/utils'
import { TiptapLinkPopover } from './TiptapLinkPopover'
import {
  resolveTiptapEditorCopy,
  type TiptapEditorCopy,
} from './tiptapEditorCopy'

type TiptapMenusProps = {
  copy?: Partial<TiptapEditorCopy>
  editor: Editor | null
  imageTitle?: string
  onRequestImage?: () => void
}

type MenuButtonProps = {
  children: ReactNode
  isActive?: boolean
  onClick: () => void
  title: string
}

function MenuButton({ children, isActive, onClick, title }: MenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition-colors',
        isActive
          ? 'bg-campus-primary/10 text-campus-primary'
          : 'text-foreground/60 hover:bg-foreground/5 hover:text-foreground/85',
      )}
    >
      {children}
    </button>
  )
}

export function TiptapMenus({ copy, editor, imageTitle, onRequestImage }: TiptapMenusProps) {
  if (!editor) return null

  const iconSize = 17
  const menuCopy = resolveTiptapEditorCopy({
    ...copy,
    imageInsert: imageTitle ?? copy?.imageInsert,
  })

  return (
    <>
      <BubbleMenu
        editor={editor}
        updateDelay={80}
        className="z-40 flex items-center gap-1 rounded-lg border border-campus-primary/10 bg-white/95 p-1 shadow-lg backdrop-blur"
      >
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title={menuCopy.bold}
        >
          <IconBold size={iconSize} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title={menuCopy.italic}
        >
          <IconItalic size={iconSize} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title={menuCopy.strikethrough}
        >
          <IconStrikethrough size={iconSize} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title={menuCopy.inlineCode}
        >
          <IconCode size={iconSize} />
        </MenuButton>
        <TiptapLinkPopover
          buttonClassName="inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition-colors"
          copy={menuCopy}
          editor={editor}
          iconSize={iconSize}
          isActive={editor.isActive('link')}
        />
        {editor.isActive('campusCallout') ? (
          <>
            <MenuButton
              onClick={() => editor.chain().focus().setCampusCalloutTone('note').run()}
              isActive={editor.isActive('campusCallout', { tone: 'note' })}
              title={menuCopy.calloutNote}
            >
              <IconInfoCircle size={iconSize} />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().setCampusCalloutTone('important').run()}
              isActive={editor.isActive('campusCallout', { tone: 'important' })}
              title={menuCopy.calloutImportant}
            >
              <IconAlertTriangle size={iconSize} />
            </MenuButton>
          </>
        ) : null}
      </BubbleMenu>

      <FloatingMenu
        editor={editor}
        updateDelay={80}
        className="z-40 flex items-center gap-1 rounded-lg border border-campus-primary/10 bg-white/95 p-1 shadow-lg backdrop-blur"
      >
        <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title={menuCopy.heading}>
          <IconH2 size={iconSize} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleBulletList().run()} title={menuCopy.bulletList}>
          <IconList size={iconSize} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleBlockquote().run()} title={menuCopy.blockquote}>
          <IconBlockquote size={iconSize} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().insertCampusCallout({ tone: 'note' }).run()}
          title={menuCopy.calloutNote}
        >
          <IconInfoCircle size={iconSize} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().insertCampusCallout({ tone: 'important' }).run()}
          title={menuCopy.calloutImportant}
        >
          <IconAlertTriangle size={iconSize} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title={menuCopy.divider}>
          <IconSeparator size={iconSize} />
        </MenuButton>
        {onRequestImage ? (
          <MenuButton onClick={onRequestImage} title={menuCopy.imageInsert}>
            <IconPhoto size={iconSize} />
          </MenuButton>
        ) : null}
      </FloatingMenu>
    </>
  )
}
