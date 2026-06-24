import type { AppLocale } from '@/app/(frontend)/lib/i18n/config'
import type { FrontendDictionary } from '@/app/(frontend)/lib/i18n/dictionaries'
import { buildDiscoverHomeData } from '@/app/(frontend)/lib/discoverPresentation'
import type { PostFeedItem } from '@/app/(frontend)/lib/postFeedData'
import type { Post } from '@/payload-types'

import SearchBar from '@/components/layout/SearchBar'

import DiscoverExperience from './DiscoverExperience'
import DiscoverHero from './DiscoverHero'

type DiscoverHomepageProps = {
  nearbyPosts?: Array<Post | PostFeedItem>
  posts: Array<Post | PostFeedItem>
  locale: AppLocale
  preferredCitySchoolIds?: Array<number | string>
  preferredSchoolCityId?: number | string | null
  preferredSchoolId?: number | string | null
  t: FrontendDictionary
}

export default function DiscoverHomepage({
  nearbyPosts,
  posts,
  locale,
  preferredCitySchoolIds,
  preferredSchoolCityId,
  preferredSchoolId,
  t,
}: DiscoverHomepageProps) {
  const data = buildDiscoverHomeData({
    nearbyPosts,
    posts,
    copy: t.discoverHome,
    preferredCitySchoolIds,
    preferredSchoolCityId,
    preferredSchoolId,
  })

  return (
    <section
      data-testid="discover-homepage-shell"
      className="px-4 pb-6 pt-[var(--floating-toolbar-top)] sm:px-5 lg:px-6"
    >
      <div data-testid="discover-homepage-content" className="w-full space-y-6">
        <div
          data-testid="discover-top-search-shell"
          className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_13rem]"
        >
          <div data-testid="discover-top-search-slot" className="flex justify-center">
            <SearchBar
              placeholder={t.common.searchPlaceholder}
              className="mx-auto w-full max-w-[34rem]"
              inputClassName="h-10 border-campus-primary/12 text-sm shadow-[0_12px_28px_rgba(24,38,72,0.10)] sm:h-11"
            />
          </div>
        </div>

        <DiscoverHero copy={t.discoverHome} featuredPost={data.featuredPost} />
        <DiscoverExperience data={data} locale={locale} copy={t.discoverHome} />
      </div>
    </section>
  )
}
