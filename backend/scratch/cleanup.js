const db = require('../src/db.js');
const fs = require('fs');
const path = require('path');

const cleanupDummyFiles = async () => {
  try {
    const users = await db.prepare("SELECT id, avatar_url FROM users WHERE avatar_url IS NOT NULL AND avatar_url != ''").all();
    for (const u of users) {
      if (u.avatar_url) {
        let localPath = u.avatar_url;
        if (localPath.startsWith('http')) {
          try {
            const urlObj = new URL(localPath);
            localPath = urlObj.pathname;
          } catch(e) {}
        }
        const absolutePath = path.join(__dirname, '..', localPath);
        if (fs.existsSync(absolutePath)) {
          const stats = fs.statSync(absolutePath);
          if (stats.size <= 100) {
            console.log('Deleting dummy avatar file:', absolutePath);
            try { fs.unlinkSync(absolutePath); } catch(_) {}
            await db.prepare("UPDATE users SET avatar_url = NULL WHERE id = ?").run(u.id);
          }
        } else {
          console.log('Db references missing avatar file:', absolutePath);
          await db.prepare("UPDATE users SET avatar_url = NULL WHERE id = ?").run(u.id);
        }
      }
    }

    const profiles = await db.prepare("SELECT user_id, banner_url FROM seller_profiles WHERE banner_url IS NOT NULL AND banner_url != ''").all();
    for (const p of profiles) {
      if (p.banner_url) {
        let localPath = p.banner_url;
        if (localPath.startsWith('http')) {
          try {
            const urlObj = new URL(localPath);
            localPath = urlObj.pathname;
          } catch(e) {}
        }
        const absolutePath = path.join(__dirname, '..', localPath);
        if (fs.existsSync(absolutePath)) {
          const stats = fs.statSync(absolutePath);
          if (stats.size <= 100) {
            console.log('Deleting dummy banner file in profile:', absolutePath);
            try { fs.unlinkSync(absolutePath); } catch(_) {}
            await db.prepare("UPDATE seller_profiles SET banner_url = NULL WHERE user_id = ?").run(p.user_id);
          }
        } else {
          console.log('Db references missing banner file in profile:', absolutePath);
          await db.prepare("UPDATE seller_profiles SET banner_url = NULL WHERE user_id = ?").run(p.user_id);
        }
      }
    }

    const configs = await db.prepare("SELECT seller_id, banner_url FROM store_config WHERE banner_url IS NOT NULL AND banner_url != ''").all();
    for (const c of configs) {
      if (c.banner_url) {
        let localPath = c.banner_url;
        if (localPath.startsWith('http')) {
          try {
            const urlObj = new URL(localPath);
            localPath = urlObj.pathname;
          } catch(e) {}
        }
        const absolutePath = path.join(__dirname, '..', localPath);
        if (fs.existsSync(absolutePath)) {
          const stats = fs.statSync(absolutePath);
          if (stats.size <= 100) {
            console.log('Deleting dummy banner file in config:', absolutePath);
            try { fs.unlinkSync(absolutePath); } catch(_) {}
            await db.prepare("UPDATE store_config SET banner_url = NULL WHERE seller_id = ?").run(c.seller_id);
          }
        } else {
          console.log('Db references missing banner file in config:', absolutePath);
          await db.prepare("UPDATE store_config SET banner_url = NULL WHERE seller_id = ?").run(c.seller_id);
        }
      }
    }
    console.log('Cleanup finished successfully!');
  } catch (err) {
    console.error('Error in cleanupDummyFiles:', err);
  }
};

cleanupDummyFiles();
