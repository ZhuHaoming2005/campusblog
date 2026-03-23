type TiptapNode = {
  type?: string
  text?: string
  content?: TiptapNode[]
}

export function extractTextFromTiptapJson(json: unknown, maxLength = 500): string {
  if (!json || typeof json !== 'object') return ''
  const parts: string[] = []

  function walk(node: TiptapNode) {
    if (parts.join('').length >= maxLength) return
    if (node.text) {
      parts.push(node.text)
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child)
        if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'blockquote') {
          parts.push('\n')
        }
      }
    }
  }

  walk(json as TiptapNode)
  return parts.join('').trim().slice(0, maxLength)
}
