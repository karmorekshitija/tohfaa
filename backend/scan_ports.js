async function checkPorts() {
  const ports = [5173, 5174, 5175, 5176];
  for (const port of ports) {
    try {
      const res = await fetch(`http://localhost:${port}/admin/login.html`);
      if (res.ok) {
        console.log(`FOUND: Port ${port} is active!`);
        process.exit(0);
      }
    } catch (e) {}
  }
  console.log('None of the expected ports (5173-5176) returned OK for /admin/login.html');
  process.exit(1);
}
checkPorts();
