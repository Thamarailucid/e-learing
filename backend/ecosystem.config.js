module.exports = {
  apps: [
    {
      name: 'novacodex-api',
      script: './dist/app/server.js',
      env: {
        NODE_ENV: 'production',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
  ],
};
