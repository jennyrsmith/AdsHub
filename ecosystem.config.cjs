module.exports = {
  apps: [
    {
      name: 'adshub',
      script: 'server.js',
      cwd: '/root/AdsHub',
      node_args: [],
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
