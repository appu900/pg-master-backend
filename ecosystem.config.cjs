/** PM2 process file — use: pm2 start ecosystem.config.cjs */
module.exports = {
  apps: [
    {
      name: 'pg-backend',
      script: 'dist/main.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
