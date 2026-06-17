const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '..', '..', '..', 'OneDrive', 'Desktop', 'antigravity_workspace', 'TohfaHub_project-1', 'backend', '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'tohfa_super_secret_key_987654321';
const BASE_URL = 'http://localhost:5001/api';

const token = jwt.sign(
  { sub: 1, role: 'super_admin', type: 'admin_access' },
  JWT_SECRET,
  { expiresIn: '15m' }
);

async function debug() {
  const tests = [
    { method: 'GET', path: '/admin/products' },
    { method: 'GET', path: '/admin/products/1' },
    { method: 'PATCH', path: '/admin/products/1/sponsored', body: { is_sponsored: false } },
    { method: 'PATCH', path: '/admin/products/1/moderation', body: { name: 'Test' } },
    { method: 'GET', path: '/admin/sellers/1' },
    { method: 'GET', path: '/admin/orders/1' }
  ];

  for (const t of tests) {
    const url = `${BASE_URL}${t.path}`;
    console.log(`\n--- Fetching ${t.method} ${url}`);
    try {
      const options = {
        method: t.method,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      if (t.body) {
        options.body = JSON.stringify(t.body);
      }
      const res = await fetch(url, options);
      console.log('Response Status:', res.status);
      console.log('Response Content-Type:', res.headers.get('content-type'));
      const text = await res.text();
      console.log('Response Body Preview (first 150 chars):');
      console.log(text.substring(0, 150));
    } catch (e) {
      console.error('Fetch error:', e);
    }
  }
}

debug();
