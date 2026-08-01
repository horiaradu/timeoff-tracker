import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // The leave request reads its font files at runtime, which the tracer cannot see.
  outputFileTracingIncludes: {
    '/api/timeoffs/[id]/pdf': ['src/pdf/fonts/**/*.ttf'],
  },
}

export default nextConfig
