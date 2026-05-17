import { mergeAttributes, Node } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    campusCallout: {
      insertCampusCallout: (attributes?: { tone?: CampusCalloutTone }) => ReturnType
      setCampusCalloutTone: (tone: CampusCalloutTone) => ReturnType
    }
  }
}

export type CampusCalloutTone = 'note' | 'important'

function normalizeCalloutTone(value: unknown): CampusCalloutTone {
  return value === 'important' ? 'important' : 'note'
}

export const CampusCallout = Node.create({
  name: 'campusCallout',

  addAttributes() {
    return {
      tone: {
        default: 'note',
        parseHTML: (element) => normalizeCalloutTone(element.getAttribute('data-tone')),
        renderHTML: (attributes) => ({ 'data-tone': normalizeCalloutTone(attributes.tone) }),
      },
    }
  },

  addCommands() {
    return {
      insertCampusCallout:
        (attributes = {}) =>
        ({ commands }) =>
          commands.insertContent({
            attrs: {
              tone: normalizeCalloutTone(attributes.tone),
            },
            content: [
              {
                content: [],
                type: 'paragraph',
              },
            ],
            type: this.name,
          }),
      setCampusCalloutTone:
        (tone) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, {
            tone: normalizeCalloutTone(tone),
          }),
    }
  },

  content: 'block+',

  defining: true,

  group: 'block',

  parseHTML() {
    return [{ tag: 'div[data-campus-callout]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const tone = normalizeCalloutTone(HTMLAttributes.tone)

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: `campus-callout campus-callout-${tone}`,
        'data-campus-callout': '',
        'data-tone': tone,
      }),
      0,
    ]
  },
})
