const db = require('../src/db');

async function main() {
  try {
    console.log("Checking Kavya's user account...");
    const kavya = await db.prepare("SELECT * FROM users WHERE email = ?").get('kavya@tohfa.in');
    console.log("Kavya:", kavya);
    
    if (kavya) {
      console.log("\nChecking conversations for Kavya (seller_id = " + kavya.id + ")...");
      const conversations = await db.prepare("SELECT * FROM conversations WHERE seller_id = ?").all(kavya.id);
      console.log("Conversations found:", conversations.length);
      for (const c of conversations) {
        console.log(`\nConversation ID: ${c.id}`);
        console.log(`Buyer ID: ${c.buyer_id}`);
        console.log(`Status: ${c.status}`);
        console.log(`Intake Complete: ${c.intake_complete}`);
        console.log(`Collected Fields:`, c.collected_fields);
        
        console.log("Messages:");
        const messages = await db.prepare("SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY id ASC").all(c.id);
        for (const m of messages) {
          console.log(`  [${m.sent_at}] ${m.sender_role} (${m.sender_id}): ${m.content} (type: ${m.message_type}, is_read: ${m.is_read})`);
        }
      }
    }
  } catch (err) {
    console.error("Error debugging:", err);
  } finally {
    process.exit(0);
  }
}

main();
