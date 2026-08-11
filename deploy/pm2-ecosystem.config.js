module.exports = {
  apps: [
    {
      name: 'tohfa-backend',
      script: './backend/src/server.js',
      cwd: '/var/www/tohfa',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 8080
      },
      env_file: './backend/.env'
    }
  ]
};
