async function test() {
  try {
    console.log("=== TESTING ADMIN LOGIN ===");
    const loginRes = await fetch("http://localhost:5001/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "admin",
        password: "admin123"
      })
    });
    const loginData = await loginRes.json();
    console.log("Login Status:", loginRes.status);
    
    if (!loginRes.ok || !loginData.success) {
      console.error("Admin login failed!");
      return;
    }

    const token = loginData.data.access_token;
    console.log("\n=== TESTING GET FOOTFALL (DASHBOARD) ===");
    const footfallRes = await fetch("http://localhost:5001/api/admin/dashboard/footfall?period=7d", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    const footfallData = await footfallRes.json();
    console.log("Footfall Status:", footfallRes.status);
    console.log("Footfall Data:", JSON.stringify(footfallData, null, 2));

    if (footfallRes.status === 200 && footfallData.success) {
      console.log("\n✅ SUCCESS: Footfall API returned 200 OK!");
    } else {
      console.error("\n❌ FAILED: Footfall API did not return 200 OK.");
      process.exit(1);
    }
  } catch (err) {
    console.error("Test failed:", err.message);
    process.exit(1);
  }
}

test();
