const db = require('../src/db');

async function checkDbLogs() {
  try {
    console.log("=== LATEST CHAT LOGS ===");
    const chatLogs = await db.prepare("SELECT * FROM chat_logs ORDER BY id DESC LIMIT 5").all();
    console.log(JSON.stringify(chatLogs, null, 2));

    console.log("=== LATEST PROBLEM REPORTS ===");
    const problemReports = await db.prepare("SELECT * FROM problem_reports ORDER BY id DESC LIMIT 5").all();
    console.log(JSON.stringify(problemReports, null, 2));
    
  } catch (err) {
    console.error("Database query failed:", err);
  }
}

checkDbLogs();
