const path = require('path');
const fs = require('fs');
const db = require('../db');
const geminiClient = require('./geminiClient');
const emailService = require('./emailService');

// Load FAQs
let faqs = [];
try {
  const faqsPath = path.join(__dirname, '..', 'data', 'faqs.json');
  faqs = JSON.parse(fs.readFileSync(faqsPath, 'utf8'));
} catch (err) {
  console.error("Error loading FAQs in chatbotService:", err);
}

/**
 * Local rule-based intent classification fallback
 */
function classifyIntentRuleBased(message) {
  const msg = (message || "").toLowerCase();
  
  if (msg.includes('damaged') || msg.includes('broken') || msg.includes('wrong item') || msg.includes('complaint') || msg.includes('report issue') || msg.includes('problem') || msg.includes('scam')) {
    return 'problem_report';
  }
  
  if (msg.includes('return') || msg.includes('refund') || msg.includes('ship') || msg.includes('deliver') || msg.includes('payment') || msg.includes('cod') || msg.includes('track') || msg.includes('cancel') || msg.includes('policy') || msg.includes('international') || msg.includes('how do i') || msg.includes('contact')) {
    return 'faq';
  }
  
  if (msg.includes('recommend') || msg.includes('gift') || msg.includes('buy') || msg.includes('looking') || msg.includes('suggest') || msg.includes('show') || msg.includes('product') || msg.includes('item') || msg.includes('find') || msg.includes('search')) {
    return 'recommendation';
  }
  
  return 'unclear';
}

/**
 * Classifies the user message intent
 */
async function classifyIntent(message) {
  // 1. Check rule-based intent first for instant, accurate keyword resolution
  const ruleIntent = classifyIntentRuleBased(message);
  if (ruleIntent !== 'unclear') {
    return ruleIntent;
  }

  // 2. Fall back to AI classification for complex/ambiguous queries if key is available
  if (process.env.GEMINI_API_KEY) {
    const systemInstruction = `You are an intent classifier for an e-commerce chatbot for "Tohfa", an Indian handmade artisan marketplace. Classify the buyer's message into Chatbot Intent: "recommendation", "faq", "problem_report", or "unclear".

Respond with ONLY valid JSON: {"intent": "recommendation" | "faq" | "problem_report" | "unclear"}`;

    const prompt = `Buyer message: "${message}"`;
    
    try {
      const result = await geminiClient.generateJson(prompt, systemInstruction);
      if (result && result.intent && ['recommendation', 'faq', 'problem_report', 'unclear'].includes(result.intent)) {
        return result.intent;
      }
    } catch (err) {
      console.warn("[CHATBOT SERVICE] AI Intent classification failed:", err.message);
    }
  }

  return 'unclear';
}

/**
 * Recommends products from the catalog based on user request
 */
async function handleRecommendation(message) {
  try {
    // 1. Fetch active products with primary images safely
    let allProducts = [];
    try {
      allProducts = await db.prepare(`
        SELECT p.id, p.name, p.description, p.price_paise, c.name as category_name,
               COALESCE(
                 (SELECT url FROM product_images WHERE product_id = p.id AND (is_primary = 1 OR is_primary IS TRUE) LIMIT 1),
                 (SELECT url FROM product_images WHERE product_id = p.id LIMIT 1),
                 '/img/ceramic_bowls.jpg'
               ) as image_url
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE LOWER(COALESCE(p.status, 'active')) != 'deleted'
      `).all();
    } catch (sqlErr) {
      console.warn("[CHATBOT SERVICE] Initial products query failed, using fallback SELECT:", sqlErr.message);
      try {
        allProducts = await db.prepare(`SELECT id, name, description, price_paise, '/img/ceramic_bowls.jpg' as image_url FROM products LIMIT 20`).all();
      } catch (fallbackSqlErr) {
        console.error("[CHATBOT SERVICE] Fallback products query error:", fallbackSqlErr.message);
        allProducts = [];
      }
    }

    // 2. Pre-filter in JS based on keyword matches
    const stopWords = new Set(["find", "please", "want", "show", "need", "like", "love", "with", "that", "this", "some", "handcrafted", "handmade", "artisan", "gift", "gifts", "product", "products", "item", "items", "for", "the", "and"]);
    const words = message.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w));
    
    let filtered = allProducts;
    if (words.length > 0) {
      filtered = allProducts.filter(p => {
        const name = (p.name || "").toLowerCase();
        const desc = (p.description || "").toLowerCase();
        const cat = (p.category_name || "").toLowerCase();
        return words.some(w => name.includes(w) || desc.includes(w) || cat.includes(w));
      });
    }

    if (!filtered || filtered.length === 0) {
      filtered = allProducts;
    }
    
    // Cap at 50 products max
    filtered = filtered.slice(0, 50);

    let recList = [];
    let noteText = "";

    // 3. Request Gemini to recommend if API key present
    if (process.env.GEMINI_API_KEY) {
      try {
        const systemInstruction = `You are a helpful shopping assistant for Tohfa, an Indian handmade artisan marketplace. Recommend ONLY from the product list provided below — never invent products that aren't in the list. If nothing in the list is a good fit, say so honestly instead of forcing a match.

Respond with ONLY valid JSON, no markdown, no preamble:
{
  "recommendations": [
    { "product_id": "...", "reason": "short reason this fits, 1 sentence" }
  ],
  "note": "optional 1-sentence note if no great match exists"
}

Return at most 5 recommendations, ranked best first.`;

        const prompt = `Buyer request: "${message}"

Available products (JSON):
${JSON.stringify(filtered.map(p => ({ id: p.id, name: p.name, description: p.description, price_paise: p.price_paise, category: p.category_name })))}`;

        const result = await geminiClient.generateJson(prompt, systemInstruction);
        recList = result.recommendations || [];
        noteText = result.note || "";
      } catch (geminiErr) {
        console.warn("[CHATBOT SERVICE] Gemini recommendation call failed, using rule-based catalog matching:", geminiErr.message);
      }
    }

    // 4. Rule-based catalog fallback if recList is empty
    if (!recList || recList.length === 0) {
      const topP = filtered.slice(0, 5);
      recList = topP.map(p => ({
        product_id: String(p.id),
        reason: `Popular handcrafted ${p.category_name || 'artisan'} item on Tohfa.`
      }));
      if (!noteText) {
        noteText = "Here are some of our top handcrafted items from our catalog that you might enjoy:";
      }
    }

    // 5. Map recommendations back to full product details
    const finalProducts = recList.map(rec => {
      const targetId = parseInt(rec.product_id);
      const p = filtered.find(item => item.id === targetId) || allProducts.find(item => item.id === targetId);
      if (!p) return null;
      return {
        id: p.id,
        name: p.name,
        price_paise: p.price_paise,
        description: p.description,
        image_url: p.image_url || '/img/ceramic_bowls.jpg',
        reason: rec.reason || "Handcrafted item matching your interest."
      };
    }).filter(Boolean);

    return {
      type: 'recommendation',
      text: noteText || "Here are some handcrafted items from our catalog that you might like:",
      products: finalProducts
    };
  } catch (err) {
    console.error("[CHATBOT SERVICE] Error in handleRecommendation:", err.message, err.stack);
    return {
      type: 'recommendation',
      text: "I experienced an error checking our product catalog. Please try again in a moment.",
      products: []
    };
  }
}

/**
 * Responds to FAQ questions using faqs.json context (with rule-based fallback)
 */
async function handleFAQ(message) {
  if (process.env.GEMINI_API_KEY) {
    const systemInstruction = `You are a support assistant for Tohfa, an Indian handmade artisan marketplace. Answer the buyer's question using ONLY the FAQ content below. If the question isn't covered, say you don't have that information and suggest they report it as a problem instead so the team can help directly. Keep the tone warm and concise — 2-4 sentences.

FAQ content (JSON):
${JSON.stringify(faqs)}

Respond with plain text only (no JSON, no markdown).`;

    try {
      const textResponse = await geminiClient.generateText(`Buyer question: "${message}"`, systemInstruction);
      if (textResponse && !textResponse.includes("not configured")) {
        return {
          type: 'faq',
          text: textResponse.trim()
        };
      }
    } catch (err) {
      console.warn("[CHATBOT SERVICE] Gemini FAQ failed, using rule-based FAQ match:", err.message);
    }
  }

  // Local Rule-Based FAQ Matching
  const msgWords = (message || "").toLowerCase().split(/\W+/).filter(w => w.length > 2);
  let bestMatch = null;
  let maxScore = 0;

  for (const faq of faqs) {
    const targetText = (faq.question + " " + faq.answer).toLowerCase();
    let score = 0;
    for (const w of msgWords) {
      if (targetText.includes(w)) {
        score += 1;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestMatch = faq;
    }
  }

  if (bestMatch && maxScore > 0) {
    return {
      type: 'faq',
      text: `${bestMatch.answer}`
    };
  }

  return {
    type: 'faq',
    text: "Tohfa connects you directly with local Indian artisans. You can track orders under 'My Orders' and returns are eligible within 7 days of delivery for non-custom items. Feel free to report a problem if you need direct support!"
  };
}

/**
 * Extracts support ticket details, logs to db, and triggers email notifications
 */
async function handleProblemReport(message, buyerId, sessionId) {
  let extracted = {
    category: 'other',
    description: message,
    related_order_id: null,
    related_product_id: null
  };

  if (process.env.GEMINI_API_KEY) {
    const systemInstruction = `You are extracting structured details from a buyer's problem report for Tohfa, an Indian handmade artisan marketplace. Read their message and extract what you can. Do not invent details that aren't present.

Respond with ONLY valid JSON, no markdown, no preamble:
{
  "category": "delivery" | "payment" | "product_quality" | "account" | "other",
  "description": "clean 1-2 sentence summary of the issue in buyer's intent",
  "related_order_id": "string or null if not mentioned",
  "related_product_id": "string or null if not mentioned"
}`;

    try {
      const res = await geminiClient.generateJson(`Buyer message: "${message}"`, systemInstruction);
      if (res && res.category) {
        extracted = res;
      }
    } catch (err) {
      console.warn("[CHATBOT SERVICE] Gemini problem report extraction failed, using fallback:", err.message);
    }
  }

  // Fallback category detection
  const msgLower = message.toLowerCase();
  if (msgLower.includes('payment') || msgLower.includes('money') || msgLower.includes('upi') || msgLower.includes('card')) {
    extracted.category = 'payment';
  } else if (msgLower.includes('ship') || msgLower.includes('deliver') || msgLower.includes('track') || msgLower.includes('late')) {
    extracted.category = 'delivery';
  } else if (msgLower.includes('damage') || msgLower.includes('quality') || msgLower.includes('broken') || msgLower.includes('wrong')) {
    extracted.category = 'product_quality';
  }

  try {
    // Save report to DB
    const result = await db.prepare(`
      INSERT INTO problem_reports (buyer_id, session_id, category, description, related_order_id, related_product_id, status)
      VALUES (?, ?, ?, ?, ?, ?, 'open')
    `).run(
      buyerId ? parseInt(buyerId) : null,
      sessionId,
      extracted.category || 'other',
      extracted.description || message,
      extracted.related_order_id || null,
      extracted.related_product_id || null
    );

    const ticketId = result.lastInsertRowid;

    // Send email notification to Admin/Seller in background
    emailService.sendProblemReportEmail({
      ticketId,
      buyerId,
      category: extracted.category || 'other',
      description: extracted.description || message,
      relatedOrderId: extracted.related_order_id,
      relatedProductId: extracted.related_product_id
    }).catch(emailErr => {
      console.error("Background email notify error:", emailErr);
    });

    return {
      type: 'problem_report',
      text: `Your problem report has been successfully logged. Our support team has been notified.`,
      ticket: {
        id: ticketId,
        category: extracted.category || 'other',
        description: extracted.description || message,
        status: 'open'
      }
    };
  } catch (err) {
    console.error("[CHATBOT SERVICE] Error in handleProblemReport:", err.message, err.stack);
    return {
      type: 'problem_report',
      text: "I ran into an issue logging your support ticket. Please try again or email us directly at support@tohfa.in.",
      ticket: null
    };
  }
}

/**
 * Handles intent logic and calls corresponding handlers
 */
async function processMessage(message, buyerId, sessionId) {
  let intent;
  try {
    intent = await classifyIntent(message);
  } catch (err) {
    console.error("[CHATBOT SERVICE] Intent classification failed:", err.message);
    intent = classifyIntentRuleBased(message);
  }
  console.log(`[CHATBOT] Message: "${message}" | Classified Intent: ${intent}`);

  let result;
  let errorLogged = null;

  try {
    if (intent === 'recommendation') {
      result = await handleRecommendation(message);
    } else if (intent === 'faq') {
      result = await handleFAQ(message);
    } else if (intent === 'problem_report') {
      result = await handleProblemReport(message, buyerId, sessionId);
    } else {
      // unclear / conversational fallback
      let conversationalText = "";
      if (process.env.GEMINI_API_KEY) {
        const systemInstruction = `You are a friendly mascot assistant for Tohfa, an Indian handmade artisan marketplace. Acknowledge the user's message warmly. If they are asking for recommendations, return a query. If they are raising a problem, ask them to clarify. Keep your reply brief (1-2 sentences).`;
        try {
          const response = await geminiClient.generateText(message, systemInstruction);
          if (response && !response.includes("not configured")) {
            conversationalText = response.trim();
          }
        } catch (err) {
          console.warn("[CHATBOT SERVICE] Conversational fallback AI error:", err.message);
        }
      }

      if (!conversationalText) {
        conversationalText = "Namaste! 🌱 I am your Tohfa Assistant. I can help you find handcrafted gifts, answer questions about shipping/returns, or log support issues. How can I assist you today?";
      }

      result = {
        type: 'unclear',
        text: conversationalText
      };
    }
  } catch (outerErr) {
    console.error("[CHATBOT SERVICE] processMessage outer execution error:", outerErr.message, outerErr.stack);
    result = {
      type: 'unclear',
      text: "Namaste! 🌱 I am here to help you browse handcrafted goods and answer platform questions. Let me know what you are looking for!"
    };
    errorLogged = outerErr.message || 'Outer handler execution error';
  }

  // Log chat message to database
  try {
    await db.prepare(`
      INSERT INTO chat_logs (buyer_id, session_id, message, intent, response)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      buyerId ? parseInt(buyerId) : null,
      sessionId,
      message,
      intent,
      JSON.stringify(errorLogged ? { ...result, error_details: errorLogged } : result)
    );
  } catch (dbErr) {
    console.error("Failed to log chat to database:", dbErr);
  }

  return {
    intent,
    ...result
  };
}

module.exports = {
  processMessage,
  classifyIntent,
  handleRecommendation,
  handleFAQ,
  handleProblemReport
};
