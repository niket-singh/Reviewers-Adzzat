/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // Allows larger file uploads
    },
  },
  // For Vercel deployment
  output: 'standalone',
}

module.exports = nextConfig
