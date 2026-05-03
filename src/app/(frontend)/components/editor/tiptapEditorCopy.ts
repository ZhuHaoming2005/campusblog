export type TiptapEditorCopy = {
  applyLink: string
  blockFormat: string
  blockquote: string
  bold: string
  bulletList: string
  calloutImportant: string
  calloutNote: string
  cancel: string
  clearFormatting: string
  codeBlock: string
  divider: string
  heading: string
  heading1: string
  heading2: string
  heading3: string
  horizontalRule: string
  imageInsert: string
  imageUploading: string
  inlineCode: string
  invalidLink: string
  italic: string
  link: string
  linkPlaceholder: string
  numberedList: string
  paragraph: string
  removeLink: string
  redo: string
  strikethrough: string
  undo: string
}

export const defaultTiptapEditorCopy: TiptapEditorCopy = {
  applyLink: '应用链接',
  blockFormat: '段落格式',
  blockquote: '引用',
  bold: '加粗',
  bulletList: '无序列表',
  calloutImportant: '重要提示',
  calloutNote: '提示块',
  cancel: '取消',
  clearFormatting: '清除格式',
  codeBlock: '代码块',
  divider: '分割线',
  heading: '标题',
  heading1: '一级标题',
  heading2: '二级标题',
  heading3: '三级标题',
  horizontalRule: '水平分割线',
  imageInsert: '插入图片',
  imageUploading: '图片上传中...',
  inlineCode: '行内代码',
  invalidLink: '请输入有效链接',
  italic: '斜体',
  link: '链接',
  linkPlaceholder: '粘贴或输入链接',
  numberedList: '有序列表',
  paragraph: '正文',
  removeLink: '移除链接',
  redo: '重做',
  strikethrough: '删除线',
  undo: '撤销',
}

export function resolveTiptapEditorCopy(copy?: Partial<TiptapEditorCopy>): TiptapEditorCopy {
  return {
    ...defaultTiptapEditorCopy,
    ...copy,
  }
}
