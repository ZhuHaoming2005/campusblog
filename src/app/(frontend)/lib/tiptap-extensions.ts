import type { Extensions } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'

import { CampusCallout } from './tiptap-callout'
import { CampusImage } from './tiptap-image'
import { CampusLink } from './tiptap-link'

/**
 * Shared extension list for both the editor and read-only renderer.
 * Add/remove extensions here to keep the schema in sync across all usage sites.
 */
export const tiptapExtensions: Extensions = [
  StarterKit.configure({
    link: false,
  }),
  CampusLink,
  CampusCallout,
  CampusImage,
]
