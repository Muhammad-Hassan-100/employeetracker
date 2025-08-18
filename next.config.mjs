/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    // Avoid bundling optional native deps pulled in by mongodb
    // These packages provide native .node binaries that break Webpack on Vercel
    const ignoreModules = [
      'snappy',
      '@mongodb-js/zstd',
      'gcp-metadata',
      'kerberos',
      'mongodb-client-encryption',
      'socks',
    ]

    config.resolve = config.resolve || {}
    config.resolve.alias = config.resolve.alias || {}

    for (const mod of ignoreModules) {
      // Alias to false so Webpack does not try to resolve/bundle them
      config.resolve.alias[mod] = false
    }

    return config
  },
}

export default nextConfig
