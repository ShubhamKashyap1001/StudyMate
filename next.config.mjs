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
    domains: ['localhost'],
  },
  webpack: (config, { isServer }) => {
    // Prevent pdfjs worker from being bundled/resolved in Node server build
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'pdfjs-dist/build/pdf.worker.mjs': false,
      'pdfjs-dist/legacy/build/pdf.worker.mjs': false,
    }

    // Avoid bundling pdf-parse in the server build; require it at runtime instead
    if (isServer) {
      const externals = config.externals || []
      const extra = ['pdf-parse', 'pdfjs-dist', 'pdfjs-dist/legacy/build/pdf.js', 'pdfjs-dist/legacy/build/pdf.mjs']
      config.externals = Array.isArray(externals)
        ? [...externals, ...extra]
        : externals
    }
    return config
  },
  // Vercel-specific optimizations
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  generateEtags: false,
}

export default nextConfig
