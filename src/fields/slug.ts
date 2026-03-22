import { slugField, type RowField } from 'payload'
import slugify from 'slugify'
import { transliterate } from 'transliteration'

export const buildSlugField = (useAsSlug: string): RowField =>
  slugField({
    useAsSlug,
    slugify: ({ valueToSlugify }) => {
      if (typeof valueToSlugify !== 'string') return undefined

      const value = valueToSlugify.trim()
      if (!value) return undefined

      const directSlug = slugify(value, {
        lower: true,
        strict: true,
        trim: true,
      })

      if (directSlug) return directSlug

      const transliterated = transliterate(value).trim()
      if (!transliterated) return undefined

      const transliteratedSlug = slugify(transliterated, {
        lower: true,
        strict: true,
        trim: true,
      })

      return transliteratedSlug || undefined
    },
  })
