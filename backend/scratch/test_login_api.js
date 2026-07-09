const BASE_URL = 'http://localhost:5001';

async function testLogin(email, password, expectedRole) {
  console.log(`\nTesting login for: ${email}...`);
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Login failed with status ${res.status}: ${JSON.stringify(data)}`);
    }
    
    const user = data.data.user;
    if (user.role !== expectedRole) {
      throw new Error(`Expected role '${expectedRole}', but got '${user.role}'`);
    }
    
    console.log(`✅ SUCCESS: Logged in successfully! Role: ${user.role}, Token: ${data.data.access_token.substring(0, 15)}...`);
  } catch (err) {
    console.error(`❌ FAILED: ${err.message}`);
    process.exit(1);
  }
}

async function run() {
  console.log("=== STARTING QA ACCOUNTS LOGIN VERIFICATION ===");
  
  await testLogin('diya@tohfa.in', 'diya123', 'buyer');
  await testLogin('kshitijakar@gmail.com', 'kshitija123', 'seller');
  await testLogin('qa-buyer@tohfa.in', 'password123', 'buyer');
  await testLogin('qa-seller@tohfa.in', 'password123', 'seller');
  
  console.log("\n=== ALL QA LOGIN TESTS PASSED SUCCESSFULLY! ===");
  process.exit(0);
}

run();
