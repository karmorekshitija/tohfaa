const db = require('./src/db.js');

async function main() {
  try {
    const followingRow = await db.prepare("SELECT COUNT(*) AS count FROM follows WHERE follower_id = ?").get(11);
    console.log('followingRow:', followingRow);
    console.log('followingRow.count:', followingRow ? followingRow.count : 'null');
    console.log('followingRow type:', typeof followingRow);
  } catch (err) {
    console.error(err);
  }
}

main();
