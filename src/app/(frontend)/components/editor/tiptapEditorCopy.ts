export type TiptapEditorCopy = {
  applyLink: string
  blockFormat: string
  blockquote: string
  bold: string
  boldShortcut: string
  bulletList: string
  bulletListShortcut: string
  calloutImportant: string
  calloutNote: string
  cancel: string
  clearFormatting: string
  codeBlock: string
  divider: string
  heading: string
  heading1: string
  heading1Shortcut: string
  heading2: string
  heading2Shortcut: string
  heading3: string
  heading3Shortcut: string
  horizontalRule: string
  imageInsert: string
  imageUploading: string
  inlineCode: string
  invalidLink: string
  italic: string
  italicShortcut: string
  link: string
  linkPlaceholder: string
  linkShortcut: string
  numberedList: string
  numberedListShortcut: string
  outlineEmpty: string
  outlineTitle: string
  paragraph: string
  removeLink: string
  redo: string
  strikethrough: string
  undo: string
  undoShortcut: string
}

export const defaultTiptapEditorCopy: TiptapEditorCopy = {
  applyLink: '应用链接',
  blockFormat: '段落格式',
  blockquote: '引用',
  bold: '加粗',
  boldShortcut: 'Ctrl+B',
  bulletList: '无序列表',
  bulletListShortcut: 'Ctrl+Shift+8',
  calloutImportant: '重要提示',
  calloutNote: '提示块',
  cancel: '取消',
  clearFormatting: '清除格式',
  codeBlock: '代码块',
  divider: '分割线',
  heading: '标题',
  heading1: '一级标题',
  heading1Shortcut: 'Ctrl+Alt+1',
  heading2: '二级标题',
  heading2Shortcut: 'Ctrl+Alt+2',
  heading3: '三级标题',
  heading3Shortcut: 'Ctrl+Alt+3',
  horizontalRule: '水平分割线',
  imageInsert: '插入图片',
  imageUploading: '图片上传中...',
  inlineCode: '行内代码',
  invalidLink: '请输入有效链接',
  italic: '斜体',
  italicShortcut: 'Ctrl+I',
  link: '链接',
  linkPlaceholder: '粘贴或输入链接',
  linkShortcut: 'Ctrl+K',
  numberedList: '有序列表',
  numberedListShortcut: 'Ctrl+Shift+7',
  outlineEmpty: '添加标题后生成目录',
  outlineTitle: '文章目录',
  paragraph: '正文',
  removeLink: '移除链接',
  redo: '重做',
  strikethrough: '删除线',
  undo: '撤销',
  undoShortcut: 'Ctrl+Z',
}

export function resolveTiptapEditorCopy(copy?: Partial<TiptapEditorCopy>): TiptapEditorCopy {
  return {
    ...defaultTiptapEditorCopy,
    ...copy,
  }
}
