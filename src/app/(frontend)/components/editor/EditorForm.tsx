'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { JSONContent } from '@tiptap/core'
import { useEditor, EditorContent } from '@tiptap/react'
import Placeholder from '@tiptap/extension-placeholder'
import {
  IconPencil,
  IconPhoto,
  IconX,
  IconCheck,
  IconAlertTriangle,
  IconArrowLeft,
} from '@tabler/icons-react'
import Link from 'next/link'

import { tiptapExtensions } from '../../lib/tiptap-extensions'
import { TiptapToolbar } from './TiptapToolbar'
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MovingBorderButton } from '@/components/ui/moving-border'

type SchoolOption = { id: string | number; name: string; slug: string }
type SubChannelOption = { id: string | number; name: string; slug: string; school: string | number }
type TagOption = { id: string | number; name: string }

type EditorDictionary = {
  editor: {
    pageTitle: string
    titlePlaceholder: string
    contentPlaceholder: string
    excerptLabel: string
    excerptPlaceholder: string
    schoolLabel: string
    schoolPlaceholder: string
    subChannelLabel: string
    subChannelPlaceholder: string
    subChannelNone: string
    tagsLabel: string
    tagsPlaceholder: string
    coverLabel: string
    coverUpload: string
    coverUploading: string
    coverRemove: string
    metaTitle: string
    publish: string
    publishing: string
    publishSuccess: string
    publishError: string
    titleRequired: string
    contentRequired: string
    schoolRequired: string
    backToHome: string
  }
}

type EditorFormProps = {
  schools: SchoolOption[]
  subChannels: SubChannelOption[]
  tags: TagOption[]
  t: EditorDictionary
}

function isContentEmpty(json: JSONContent | null): boolean {
  if (!json) return true
  if (!json.content || json.content.length === 0) return true
  return json.content.every(
    (node) => node.type === 'paragraph' && (!node.content || node.content.length === 0),
  )
}

export default function EditorForm({ schools, subChannels, tags, t }: EditorFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [schoolId, setSchoolId] = useState('')
  const [subChannelId, setSubChannelId] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [editorContent, setEditorContent] = useState<JSONContent | null>(null)

  const [publishing, setPublishing] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const editor = useEditor({
    extensions: [
      ...tiptapExtensions,
      Placeholder.configure({
        placeholder: t.editor.contentPlaceholder,
      }),
    ],
    content: undefined,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'tiptap-editor-focus min-h-[24rem] px-5 py-4 text-base leading-relaxed focus:outline-none',
      },
    },
    onUpdate: ({ editor: e }) => {
      setEditorContent(e.getJSON())
    },
  })

  const filteredSubChannels = subChannels.filter(
    (ch) => String(ch.school) === String(schoolId),
  )

  const handleSchoolChange = useCallback(
    (value: string) => {
      setSchoolId(value)
      setSubChannelId('')
      setErrors((prev) => ({ ...prev, school: '' }))
    },
    [],
  )

  const handleTagToggle = useCallback((tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    )
  }, [])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!title.trim()) newErrors.title = t.editor.titleRequired
    if (isContentEmpty(editorContent)) newErrors.content = t.editor.contentRequired
    if (!schoolId) newErrors.school = t.editor.schoolRequired
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handlePublish = async () => {
    if (!validate()) return
    setPublishing(true)
    setFeedback(null)

    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        content: editorContent,
        school: schoolId,
      }
      if (subChannelId && subChannelId !== '__none__') body.subChannel = subChannelId
      if (excerpt.trim()) body.excerpt = excerpt.trim()
      if (selectedTags.length > 0) body.tags = selectedTags

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = (await res.json()) as { error?: string; success?: boolean }

      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || t.editor.publishError })
        return
      }

      setFeedback({ type: 'success', message: t.editor.publishSuccess })
      setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 1200)
    } catch {
      setFeedback({ type: 'error', message: t.editor.publishError })
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-campus-primary/5">
        <div className="flex items-center justify-between px-6 lg:px-10 h-16">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-foreground/50 hover:text-foreground/80 transition-colors no-underline"
            >
              <IconArrowLeft size={20} />
            </Link>
            <h1 className="font-headline text-xl font-bold text-campus-primary">
              {t.editor.pageTitle}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {feedback && (
              <div
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-label transition-all',
                  feedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200',
                )}
              >
                {feedback.type === 'success' ? (
                  <IconCheck size={16} />
                ) : (
                  <IconAlertTriangle size={16} />
                )}
                {feedback.message}
              </div>
            )}
            <MovingBorderButton
              onClick={handlePublish}
              disabled={publishing}
              containerClassName="shrink-0"
              className="font-label font-bold text-base px-8"
            >
              <IconPencil size={18} />
              {publishing ? t.editor.publishing : t.editor.publish}
            </MovingBorderButton>
          </div>
        </div>
      </div>

      {/* Main layout: editor + sidebar */}
      <div className="flex flex-col lg:flex-row gap-6 px-6 lg:px-10 py-8">
        {/* Left: Editor area */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Title */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setErrors((prev) => ({ ...prev, title: '' }))
              }}
              placeholder={t.editor.titlePlaceholder}
              className={cn(
                'w-full border-0 border-b border-border bg-transparent font-headline font-bold px-0 py-6 text-center outline-none placeholder:text-foreground/20 focus:placeholder:text-transparent focus:border-campus-primary/30 transition-colors',
                errors.title && 'border-red-400',
              )}
              style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', lineHeight: 1.2 }}
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1.5 font-label">{errors.title}</p>
            )}
          </div>

          {/* Tiptap Rich Text Editor */}
          <div
            className={cn(
              'tiptap-editor rounded-xl border bg-white/60 backdrop-blur-sm overflow-hidden transition-all',
              errors.content ? 'border-red-400' : 'border-campus-primary/8',
            )}
          >
            <TiptapToolbar editor={editor} />
            <EditorContent editor={editor} />
          </div>
          {errors.content && (
            <p className="text-red-500 text-sm font-label">{errors.content}</p>
          )}
        </div>

        {/* Right: Meta sidebar */}
        <div className="w-full lg:w-80 xl:w-96 shrink-0 space-y-5">
          {/* Post Settings Card */}
          <Card className="bg-white/60 backdrop-blur-sm border-campus-primary/8">
            <CardHeader>
              <CardTitle className="font-headline text-lg text-campus-primary">
                {t.editor.metaTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* School */}
              <div className="space-y-2">
                <Label className="font-label text-sm text-foreground/70">
                  {t.editor.schoolLabel}
                  <span className="text-red-400 ml-0.5">*</span>
                </Label>
                <Select value={schoolId} onValueChange={handleSchoolChange}>
                  <SelectTrigger
                    className={cn(
                      'w-full',
                      errors.school && 'border-red-400',
                    )}
                  >
                    <SelectValue placeholder={t.editor.schoolPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {schools.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {errors.school && (
                  <p className="text-red-500 text-xs font-label">{errors.school}</p>
                )}
              </div>

              {/* Sub-channel */}
              {schoolId && filteredSubChannels.length > 0 && (
                <div className="space-y-2">
                  <Label className="font-label text-sm text-foreground/70">
                    {t.editor.subChannelLabel}
                  </Label>
                  <Select
                    value={subChannelId}
                    onValueChange={setSubChannelId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t.editor.subChannelPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="__none__">{t.editor.subChannelNone}</SelectItem>
                        {filteredSubChannels.map((ch) => (
                          <SelectItem key={ch.id} value={String(ch.id)}>
                            {ch.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Separator className="bg-campus-primary/5" />

              {/* Tags */}
              <div className="space-y-2">
                <Label className="font-label text-sm text-foreground/70">
                  {t.editor.tagsLabel}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const isSelected = selectedTags.includes(String(tag.id))
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleTagToggle(String(tag.id))}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-sm font-label transition-all duration-200',
                          isSelected
                            ? 'bg-campus-primary/10 text-campus-primary font-semibold'
                            : 'text-foreground/50 hover:text-foreground/80 hover:bg-foreground/[0.04] border border-border/50',
                        )}
                      >
                        {tag.name}
                      </button>
                    )
                  })}
                  {tags.length === 0 && (
                    <p className="text-foreground/30 text-sm font-label">
                      {t.editor.tagsPlaceholder}
                    </p>
                  )}
                </div>
              </div>

              <Separator className="bg-campus-primary/5" />

              {/* Excerpt */}
              <div className="space-y-2">
                <Label className="font-label text-sm text-foreground/70">
                  {t.editor.excerptLabel}
                </Label>
                <Textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder={t.editor.excerptPlaceholder}
                  className="resize-none text-sm bg-transparent"
                  rows={3}
                />
              </div>

              <Separator className="bg-campus-primary/5" />

              {/* Cover Image Placeholder */}
              <div className="space-y-2">
                <Label className="font-label text-sm text-foreground/70">
                  {t.editor.coverLabel}
                </Label>
                <div className="border-2 border-dashed border-campus-primary/10 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-campus-primary/20 hover:bg-campus-primary/[0.02] transition-all">
                  <IconPhoto size={28} className="text-foreground/20" />
                  <span className="text-sm font-label text-foreground/40">
                    {t.editor.coverUpload}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
