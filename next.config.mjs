import path from 'path'
import { fileURLToPath } from 'url'

import { withPayload } from '@payloadcms/next/withPayload'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
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
      // Payload's D1 adapter exposes drizzle-kit migration helpers through runtime code.
      // Next 16/OpenNext may try to bundle that optional path into the server worker,
      // which breaks Cloudflare bundling even though request handling never uses it.
      'drizzle-kit/api': path.resolve(__dirname, 'src/shims/drizzle-kit-api.ts'),
    }

    return webpackConfig
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
