/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // Allows larger file uploads
    },
  },
}

module.exports = nextConfig
