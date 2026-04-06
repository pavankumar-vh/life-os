/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@excalidraw/excalidraw'],
  async rewrites() {
    return {
      fallback: [
        {
          source: '/api/:path*',
          destination: 'http://127.0.0.1:4000/api/:path*'
        }
      ]
    }
  }
}

module.exports = nextConfig
