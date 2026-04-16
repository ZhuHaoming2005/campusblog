import path from 'path'
import { fileURLToPath } from 'url'

import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'
import { withPayload } from '@payloadcms/next/withPayload'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const drizzleKitPackages = new Set(['drizzle-kit', 'drizzle-kit/api'])
const drizzleKitShimPath = path.resolve(__dirname, 'src/shims/drizzle-kit-api.js')
const drizzleKitShimSpecifier = './src/shims/drizzle-kit-api.js'

/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  // Packages with Cloudflare Workers (workerd) specific code
  // Read more: https://opennext.js.org/cloudflare/howtos/workerd
  serverExternalPackages: ['jose', 'pg-cloudflare'],

  // Your Next.js config here
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    // Payload importMap resolves paths relative to admin.importMap.baseDir (src/)
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      app: path.resolve(__dirname, 'src/app'),
    }

    return webpackConfig
  },
}

const payloadNextConfig = withPayload(nextConfig, { devBundleServerPackages: false })
const originalWebpack = payloadNextConfig.webpack

payloadNextConfig.serverExternalPackages = (payloadNextConfig.serverExternalPackages ?? []).filter(
  (pkg) => !drizzleKitPackages.has(pkg),
)

payloadNextConfig.turbopack = {
  ...(payloadNextConfig.turbopack ?? {}),
  resolveAlias: {
    ...(payloadNextConfig.turbopack?.resolveAlias ?? {}),
    'drizzle-kit': drizzleKitShimSpecifier,
    'drizzle-kit/api': drizzleKitShimSpecifier,
  },
}

payloadNextConfig.webpack = (webpackConfig, webpackOptions) => {
  const config = originalWebpack ? originalWebpack(webpackConfig, webpackOptions) : webpackConfig
  const externals = Array.isArray(config.externals)
    ? config.externals.filter(
        (entry) => typeof entry !== 'string' || !drizzleKitPackages.has(entry),
      )
    : config.externals

  return {
    ...config,
    externals,
    resolve: {
      ...(config.resolve ?? {}),
      alias: {
        ...(config.resolve?.alias ?? {}),
        'drizzle-kit/api': drizzleKitShimPath,
      },
    },
  }
}

if (process.env.NODE_ENV === 'development') {
  await initOpenNextCloudflareForDev({
    environment: process.env.CLOUDFLARE_ENV,
  })
}

export default payloadNextConfig
