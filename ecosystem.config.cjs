module.exports = {
  apps: [
    {
      name: 'adshub-api',
      script: './server.js',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'adshub-cron',
      script: './cron.js',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
