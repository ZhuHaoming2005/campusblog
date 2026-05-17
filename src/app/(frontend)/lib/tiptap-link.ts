import { Mark, mergeAttributes } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    campusLink: {
      setCampusLink: (attributes: { href: string }) => ReturnType
      unsetCampusLink: () => ReturnType
    }
  }
}

const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])

export function normalizeCampusLinkHref(value: string): string | null {
  const href = value.trim()

  if (!href) return null
  if (href.startsWith('/') && !href.startsWith('//')) return href

  const normalizedHref = /^[a-z][a-z\d+\-.]*:/i.test(href) ? href : `https://${href}`

  try {
    const url = new URL(normalizedHref)
    return SAFE_LINK_PROTOCOLS.has(url.protocol) ? normalizedHref : null
  } catch {
    return null
  }
}

export const CampusLink = Mark.create({
  name: 'link',

  addAttributes() {
    return {
      href: {
        default: null,
        parseHTML: (element) => normalizeCampusLinkHref(element.getAttribute('href') ?? ''),
        renderHTML: (attributes) => {
          const href = typeof attributes.href === 'string' ? normalizeCampusLinkHref(attributes.href) : null

          return href ? { href } : {}
        },
      },
    }
  },

  addCommands() {
    return {
      setCampusLink:
        (attributes) =>
        ({ commands }) => {
          const href = normalizeCampusLinkHref(attributes.href)

          if (!href) return false

          return commands.setMark(this.name, { href })
        },
      unsetCampusLink:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    }
  },

  inclusive: false,

  parseHTML() {
    return [{ tag: 'a[href]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const href = typeof HTMLAttributes.href === 'string' ? normalizeCampusLinkHref(HTMLAttributes.href) : null

    if (!href) {
      return ['span', mergeAttributes({ class: 'campus-unsafe-link' }), 0]
    }

    const externalAttrs = href.startsWith('/')
      ? {}
      : {
          rel: 'noopener noreferrer nofollow',
          target: '_blank',
        }

    return [
      'a',
      mergeAttributes(
        {
          class: 'campus-rich-link',
        },
        externalAttrs,
        { href },
      ),
      0,
    ]
  },
})
