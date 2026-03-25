import type { Extensions } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'

import { CampusImage } from './tiptap-image'

/**
 * Shared extension list for both the editor and read-only renderer.
 * Add/remove extensions here to keep the schema in sync across all usage sites.
 */
export const tiptapExtensions: Extensions = [StarterKit, CampusImage]
