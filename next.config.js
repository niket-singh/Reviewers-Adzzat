
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', 
    },
  },
  output: 'export', 
  images: {
    unoptimized: true, 
  },
  
  trailingSlash: true,
}

module.exports = nextConfig
