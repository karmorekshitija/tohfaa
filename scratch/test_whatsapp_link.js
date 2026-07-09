const jwt = require('../backend/node_modules/jsonwebtoken');

// Matches backend/src/server.js definition
const JWT_SECRET = 'tohfa_super_secret_key_987654321';

async function runTest() {
  const token = jwt.sign(
    { user_id: 21, email: 'kshitijakar@gmail.com', role: 'seller' },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  console.log('Generated JWT Token:', token);

  try {
    const response = await fetch('http://localhost:5001/api/seller/whatsapp/link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ phone_number: '+979755329298' })
    });

    const data = await response.json();
    console.log('HTTP Status:', response.status);
    console.log('Response Body:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Fetch request failed:', err.message);
  }
}

runTest();
