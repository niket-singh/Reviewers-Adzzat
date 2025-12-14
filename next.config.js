/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // Allows larger file uploads
    },
  },
  output: 'export', // Static export for Azure Static Web Apps
  images: {
    unoptimized: true, // Required for static export
  },
  // Disable server-side features for static export
  trailingSlash: true,
}

module.exports = nextConfig
