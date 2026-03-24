import type { JSONContent } from '@tiptap/core'
import { generateHTML } from '@tiptap/html'

import { tiptapExtensions } from './tiptap-extensions'
import { extractTextFromTiptapJson } from './tiptap-text'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function renderTiptapHtml(content: unknown): string {
  if (content && typeof content === 'object' && !Array.isArray(content)) {
    try {
      return generateHTML(content as JSONContent, tiptapExtensions)
    } catch {
      // Fall back to plain-text rendering when stored content is malformed.
    }
  }

  const text = extractTextFromTiptapJson(content, 24000)
  if (!text) return ''

  return text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('')
}
