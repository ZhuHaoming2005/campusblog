import { mergeAttributes, Node } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    campusImage: {
      setCampusImage: (attributes: {
        alt?: string
        mediaId?: number | string | null
        src: string
      }) => ReturnType
    }
  }
}

export const CampusImage = Node.create({
  name: 'image',

  addAttributes() {
    return {
      alt: {
        default: '',
      },
      mediaId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-media-id'),
        renderHTML: (attributes) =>
          attributes.mediaId ? { 'data-media-id': String(attributes.mediaId) } : {},
      },
      src: {
        default: null,
      },
    }
  },

  addCommands() {
    return {
      setCampusImage:
        (attributes) =>
        ({ commands }) =>
          commands.insertContent({
            attrs: attributes,
            type: this.name,
          }),
    }
  },

  draggable: true,

  group: 'block',

  inline: false,

  parseHTML() {
    return [
      {
        tag: 'img[src]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const { mediaId, ...attributes } = HTMLAttributes

    return [
      'img',
      mergeAttributes(
        {
          class:
            'campus-inline-image my-6 overflow-hidden rounded-[1.5rem] border border-campus-primary/10 shadow-[0_14px_40px_rgba(13,59,102,0.08)]',
          loading: 'lazy',
        },
        attributes,
        mediaId ? { 'data-media-id': String(mediaId) } : {},
      ),
    ]
  },

  selectable: true,
})
