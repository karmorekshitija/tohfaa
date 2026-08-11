import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';
import path from 'path';

function getHtmlEntries(dir, list = {}) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (
        file !== 'node_modules' && 
        file !== 'dist' && 
        !file.startsWith('.') &&
        !file.startsWith('stitch') &&
        !file.startsWith('scratch') &&
        !file.startsWith('footer') &&
        !file.includes('unzipped')
      ) {
        getHtmlEntries(filePath, list);
      }
    } else if (file.endsWith('.html')) {
      const relative = path.relative(__dirname, filePath).replace(/\\/g, '/');
      const name = relative.replace(/\.html$/, '').replace(/\//g, '_');
      list[name] = resolve(__dirname, relative);
    }
  }
  return list;
}

const entries = getHtmlEntries(__dirname);

export default defineConfig({
  build: {
    rollupOptions: {
      input: entries
    }
  },
  server: {
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:5001',
        changeOrigin: true,
        secure: false
      },
      '/media': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:5001',
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:5001',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
