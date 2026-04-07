/** @type {import('next').NextConfig} */
const apiBase = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
  : ''

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
