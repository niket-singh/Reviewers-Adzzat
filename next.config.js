/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // Allows larger file uploads
    },
  },
  output: 'standalone', // Optimized for Azure deployment
  images: {
    unoptimized: true, // Required for static export on Azure
  },
}

module.exports = nextConfig
