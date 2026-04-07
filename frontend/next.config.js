/** @type {import('next').NextConfig} */
function normalizeApiBase(raw) {
  if (!raw) return ''
  const trimmed = raw.trim().replace(/\/$/, '')
  if (!trimmed) return ''
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return `https://${trimmed}`
}

const apiBase = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL)

const nextConfig = {
  transpilePackages: ['@excalidraw/excalidraw'],
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
