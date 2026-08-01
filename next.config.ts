import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // The leave request reads its font files at runtime, which the tracer cannot see.
  outputFileTracingIncludes: {
    '/api/timeoffs/[id]/pdf': ['src/pdf/fonts/**/*.ttf'],
  },
  images: {
    // Google profile pictures.
    remotePatterns: [{ protocol: 'https', hostname: 'lh3.googleusercontent.com' }],
  },
}

export default nextConfig
