async function test() {
  try {
    console.log("=== TESTING DEPLOYED COMPONENTS ENDPOINT ===");
    const res = await fetch("https://thetohfa.in/components/seller-components.js");
    console.log("Status:", res.status);
    if (res.status === 200) {
      const text = await res.text();
      console.log("Response starts with:", text.substring(0, 100));
    }
  } catch (err) {
    console.error("Check failed:", err.message);
  }
}

test();
