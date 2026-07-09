async function test() {
  try {
    console.log("=== TESTING DEPLOYED FRONTEND ===");
    const res = await fetch("https://thetohfa.in/admin/dashboard.html");
    const html = await res.text();
    const hasDot = html.includes("pending-apps-dot");
    console.log("Found 'pending-apps-dot' in deployed dashboard HTML:", hasDot);
  } catch (err) {
    console.error("Frontend check failed:", err.message);
  }
}

test();
