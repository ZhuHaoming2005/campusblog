import 'server-only'

import type { Where } from 'payload'

import type { EditorPostTagClient } from './editorPostTags'

export async function getEditorPostTagClient(): Promise<EditorPostTagClient> {
  const [{ getPayload }, configModule] = await Promise.all([
    import('payload'),
    import('@payload-config'),
  ])
  const config = await configModule.default
  const payload = await getPayload({ config })

  return {
    async create(collection, data) {
      const name = typeof data.name === 'string' ? data.name : ''
      if (!name) {
        throw new Error('Tag name is required.')
      }

      return payload.create({
        collection,
        data: {
          generateSlug: true,
          name,
          slug: name,
        },
        draft: false,
        overrideAccess: true,
      })
    },

    async find(collection, options = {}) {
      const result = await payload.find({
        collection,
        depth: options.depth ?? 0,
        limit: options.limit,
        overrideAccess: true,
        where: options.where as Where | undefined,
      })

      return {
        docs: result.docs,
      }
    },
  }
}
