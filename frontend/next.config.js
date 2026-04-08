/** @type {import('next').NextConfig} */
const path = require('path')

function normalizeApiBase(raw) {
  if (!raw) return ''
  const trimmed = raw.trim().replace(/\/$/, '')
  if (!trimmed) return ''
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return `https://${trimmed}`
}

const apiBase = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL)
const isFastBuild = process.env.LIFEOS_FAST_BUILD === '1'

const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, '..'),
  transpilePackages: ['@excalidraw/excalidraw'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: isFastBuild,
  },
  async rewrites() {
    if (!apiBase) return []
    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`,
      },
    ]
  }
}

module.exports = nextConfig
