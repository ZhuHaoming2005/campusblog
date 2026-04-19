import { cookies as getCookies } from 'next/headers.js'
import { headers as getHeaders } from 'next/headers.js'

import { getDictionary } from './i18n/dictionaries'
import { resolveRequestLocale } from './i18n/locale'

export async function getFrontendRequestContext() {
  const [headers, cookies] = await Promise.all([getHeaders(), getCookies()])
  const locale = resolveRequestLocale({
    cookieLocale: cookies.get('locale')?.value,
    acceptLanguage: headers.get('accept-language'),
  })

  return {
    headers,
    cookies,
    locale,
    t: getDictionary(locale),
  }
}
