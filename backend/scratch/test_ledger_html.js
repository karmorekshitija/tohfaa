const http = require('http');

http.get('http://localhost:5173/admin/ledger.html', (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('First 500 chars:', data.substring(0, 500));
  });
}).on('error', err => {
  console.error('Error:', err.message);
});
