const db = require('../src/db');

async function check() {
  try {
    const res = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='reviews'").get();
    console.log('Reviews table SQLite check:', res);
  } catch (err) {
    try {
      const res = await db.prepare("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') AS exists").get();
      console.log('Reviews table Postgres check:', res);
    } catch (err2) {
      console.error('Failed both checks:', err.message, err2.message);
    }
  }
}

check();
