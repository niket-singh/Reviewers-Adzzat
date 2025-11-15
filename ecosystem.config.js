// PM2 ecosystem configuration for Azure App Service
module.exports = {
  apps: [
    {
      name: 'adzzatxperts',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000,
      },
    },
  ],
}
