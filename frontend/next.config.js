/** @type {import('next').NextConfig} */
const path = require('path')

function normalizeApiBase(raw) {
  if (!raw) return ''
  const trimmed = raw.trim().replace(/\/$/, '')
  if (!trimmed) return ''
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return `https://${trimmed}`
}

function getConfiguredApiBase() {
  const primary = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL)
  if (primary) return primary

  const additional = (process.env.NEXT_PUBLIC_API_URLS || '')
    .split(',')
    .map((item) => normalizeApiBase(item))
    .filter(Boolean)

  return additional[0] || ''
}

const apiBase = getConfiguredApiBase()
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
