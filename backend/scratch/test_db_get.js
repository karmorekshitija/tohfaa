const db = require('../src/db');

async function run() {
  const p = db.prepare('SELECT id FROM users LIMIT 1').get();
  console.log('p is Proxy:', typeof p, p.constructor.name);
  
  const val = await p;
  console.log('await p resolved to:', typeof val, val);
  console.log('val.id is:', typeof val?.id, val?.id);
  
  const idVal = await p.id;
  console.log('await p.id is:', typeof idVal, idVal);
}

run();
