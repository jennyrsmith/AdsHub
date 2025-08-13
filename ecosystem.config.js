module.exports = {
  apps: [
    {
      name: 'adshub',
      script: 'server.js',
      cwd: '/root/AdsHub',
      node_args: [],
      env: {
        NODE_ENV: 'production'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '400M',
      out_file: '/root/.pm2/logs/adshub-out.log',
      error_file: '/root/.pm2/logs/adshub-error.log',
      time: true
    }
  ]
}

