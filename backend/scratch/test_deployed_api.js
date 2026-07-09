async function test() {
  try {
    console.log("=== TESTING DEPLOYED ADMIN LOGIN ===");
    // Attempting login on the deployed backend
    const loginRes = await fetch("https://api.thetohfa.in/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "admin",
        password: "admin123" // Note: This password might not work if it hasn't been reset on the deployed db.
      })
    });
    const loginData = await loginRes.json();
    console.log("Login Status:", loginRes.status);
    console.log("Login Response:", JSON.stringify(loginData, null, 2));

    if (!loginRes.ok || !loginData.success) {
      console.error("Admin login failed! Admin password on the deployed server is different.");
      return;
    }

    const token = loginData.data.access_token;
    console.log("\n=== TESTING DEPLOYED GET SUMMARY ===");
    const summaryRes = await fetch("https://api.thetohfa.in/api/admin/dashboard/summary", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    const summaryData = await summaryRes.json();
    console.log("Summary Status:", summaryRes.status);
    console.log("Summary Response:", JSON.stringify(summaryData, null, 2));
  } catch (err) {
    console.error("Deployed test failed:", err.message);
  }
}

test();
