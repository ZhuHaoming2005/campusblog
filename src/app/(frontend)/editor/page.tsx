import { headers as getHeaders } from 'next/headers.js'
import { cookies as getCookies } from 'next/headers.js'
import { getPayload } from 'payload'

import config from '@/payload.config'
import EditorForm from '@/components/editor/EditorForm'
import { getDictionary } from '../lib/i18n/dictionaries'
import { resolveRequestLocale } from '../lib/i18n/locale'

export default async function EditorPage() {
  const headers = await getHeaders()
  const cookies = await getCookies()
  const locale = resolveRequestLocale({
    cookieLocale: cookies.get('locale')?.value,
    acceptLanguage: headers.get('accept-language'),
  })
  const t = getDictionary(locale)

  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const [schoolsResult, subChannelsResult, tagsResult] = await Promise.all([
    payload.find({
      collection: 'schools',
      where: { isActive: { equals: true } },
      sort: 'sortOrder',
      limit: 100,
      depth: 0,
    }),
    payload.find({
      collection: 'school-sub-channels',
      where: { isActive: { equals: true } },
      sort: 'sortOrder',
      limit: 500,
      depth: 0,
    }),
    payload.find({
      collection: 'tags',
      where: { isActive: { equals: true } },
      limit: 100,
      depth: 0,
    }),
  ])

  const schools = schoolsResult.docs.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
  }))

  const subChannels = subChannelsResult.docs.map((ch) => ({
    id: ch.id,
    name: ch.name,
    slug: ch.slug,
    school: typeof ch.school === 'object' && ch.school !== null ? (ch.school as { id: string | number }).id : ch.school as string | number,
  }))

  const tags = tagsResult.docs.map((tag) => ({
    id: tag.id,
    name: tag.name,
  }))

  return <EditorForm schools={schools} subChannels={subChannels} tags={tags} t={t} />
}
