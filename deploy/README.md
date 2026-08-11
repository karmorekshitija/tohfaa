# TohfaHub — Deployment Guide

This directory contains version-controlled deployment configurations for TohfaHub on the production Linux droplet.

## Files
- `nginx-tohfa.conf`: Standard Nginx reverse proxy configuration for domain routing, SSL termination, and static file serving (`/uploads/` and `/img/`).
- `pm2-ecosystem.config.js`: PM2 process manager configuration for running the Node.js backend.

## Deployment Steps
1. **PM2 Setup:**
   ```bash
   cd /var/www/tohfa
   pm2 start deploy/pm2-ecosystem.config.js
   pm2 save
   pm2 startup
   ```

2. **Nginx Setup:**
   ```bash
   sudo cp deploy/nginx-tohfa.conf /etc/nginx/sites-available/tohfa
   sudo ln -s /etc/nginx/sites-available/tohfa /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

3. **SSL Certificate (Certbot):**
   ```bash
   sudo certbot --nginx -d thetohfa.in -d www.thetohfa.in
   ```
