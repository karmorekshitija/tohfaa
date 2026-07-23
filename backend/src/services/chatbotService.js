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
 * Classifies the user message intent
 */
async function classifyIntent(message) {
  const systemInstruction = `You are an intent classifier for an e-commerce chatbot for "Tohfa", an Indian handmade artisan marketplace. Classify the buyer's message into exactly ONE of these categories:

- "recommendation": buyer wants product suggestions, gift ideas, or is describing what they're looking for.
- "faq": buyer is asking about policies, shipping, returns, payments, how the platform works, etc.
- "problem_report": buyer is reporting an issue — damaged item, wrong item, late delivery, payment problem, account issue, complaint.
- "unclear": message doesn't clearly fit any category above, or is just small talk / greeting.

Respond with ONLY valid JSON, no markdown, no preamble:
{"intent": "recommendation" | "faq" | "problem_report" | "unclear"}`;

  const prompt = `Buyer message: "${message}"`;
  
  try {
    const result = await geminiClient.generateJson(prompt, systemInstruction);
    return result.intent || 'unclear';
  } catch (err) {
    console.error("[CHATBOT SERVICE] Failed to classify intent, falling back to unclear:", err.message, err.stack);
    return 'unclear';
  }
}

/**
 * Recommends products from the catalog based on user request
 */
async function handleRecommendation(message) {
  try {
    // 1. Fetch active products
    const allProducts = await db.prepare(`
      SELECT p.id, p.name, p.description, p.price_paise, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'active'
    `).all();

    // 2. Pre-filter in JS based on keyword matches
    const stopWords = new Set(["find", "please", "want", "show", "need", "like", "love", "with", "that", "this", "some", "handcrafted", "handmade", "artisan", "gift", "gifts", "product", "products", "item", "items"]);
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

    if (filtered.length === 0) {
      filtered = allProducts;
    }
    
    // Cap at 50 products max
    filtered = filtered.slice(0, 50);

    // 3. Request Gemini to recommend
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
${JSON.stringify(filtered)}`;

    const result = await geminiClient.generateJson(prompt, systemInstruction);
    const recList = result.recommendations || [];
    
    if (recList.length === 0) {
      return {
        type: 'recommendation',
        text: result.note || "I couldn't find any products in our catalog matching your request. Let me know if you would like me to suggest something else!",
        products: []
      };
    }

    // 4. Map recommendations back to full product details (including images)
    const productIds = recList.map(r => parseInt(r.product_id)).filter(id => !isNaN(id));
    let matchedProducts = [];
    if (productIds.length > 0) {
      const placeholders = productIds.map(() => '?').join(',');
      matchedProducts = await db.prepare(`
        SELECT p.id, p.name, p.price_paise, p.description, pi.url as image_url
        FROM products p
        LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
        WHERE p.id IN (${placeholders}) AND p.status = 'active'
      `).all(productIds);
    }

    // Associate the reasons back
    const finalProducts = matchedProducts.map(p => {
      const recItem = recList.find(r => parseInt(r.product_id) === p.id);
      return {
        id: p.id,
        name: p.name,
        price_paise: p.price_paise,
        description: p.description,
        image_url: p.image_url,
        reason: recItem ? recItem.reason : ""
      };
    });

    return {
      type: 'recommendation',
      text: result.note || "Here are some handcrafted items from our catalog that you might like:",
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
 * Responds to FAQ questions using faqs.json context
 */
async function handleFAQ(message) {
  const systemInstruction = `You are a support assistant for Tohfa, an Indian handmade artisan marketplace. Answer the buyer's question using ONLY the FAQ content below. If the question isn't covered, say you don't have that information and suggest they report it as a problem instead so the team can help directly. Keep the tone warm and concise — 2-4 sentences.

FAQ content (JSON):
${JSON.stringify(faqs)}

Respond with plain text only (no JSON, no markdown).`;

  try {
    const textResponse = await geminiClient.generateText(`Buyer question: "${message}"`, systemInstruction);
    return {
      type: 'faq',
      text: textResponse.trim()
    };
  } catch (err) {
    console.error("[CHATBOT SERVICE] Error in handleFAQ:", err.message, err.stack);
    return {
      type: 'faq',
      text: "I'm having trouble retrieving that policy information right now. Please ask again in a moment, or report a problem if you need help."
    };
  }
}

/**
 * Extracts support ticket details, logs to db, and triggers email notifications
 */
async function handleProblemReport(message, buyerId, sessionId) {
  const systemInstruction = `You are extracting structured details from a buyer's problem report for Tohfa, an Indian handmade artisan marketplace. Read their message and extract what you can. Do not invent details that aren't present.

Respond with ONLY valid JSON, no markdown, no preamble:
{
  "category": "delivery" | "payment" | "product_quality" | "account" | "other",
  "description": "clean 1-2 sentence summary of the issue in buyer's intent",
  "related_order_id": "string or null if not mentioned",
  "related_product_id": "string or null if not mentioned"
}`;

  try {
    const extracted = await geminiClient.generateJson(`Buyer message: "${message}"`, systemInstruction);
    
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
      text: "I ran into an issue logging your support ticket. Please try again or email us directly.",
      ticket: null
    };
  }
}

/**
 * Handles intent logic and calls corresponding handlers
 */
async function processMessage(message, buyerId, sessionId) {
  const intent = await classifyIntent(message);
  console.log(`[CHATBOT] Message: "${message}" | Classified Intent: ${intent}`);

  let result;
  if (intent === 'recommendation') {
    result = await handleRecommendation(message);
  } else if (intent === 'faq') {
    result = await handleFAQ(message);
  } else if (intent === 'problem_report') {
    result = await handleProblemReport(message, buyerId, sessionId);
  } else {
    // unclear / conversational fallback
    const systemInstruction = `You are a friendly mascot assistant for Tohfa, an Indian handmade artisan marketplace. Acknowledge the user's message warmly. If they are asking for recommendations, return a query. If they are raising a problem, ask them to clarify. Keep your reply brief (1-2 sentences).`;
    try {
      const response = await geminiClient.generateText(message, systemInstruction);
      result = {
        type: 'unclear',
        text: response.trim()
      };
    } catch (err) {
      console.error("[CHATBOT SERVICE] processMessage fallback text generation error:", err.message, err.stack);
      result = {
        type: 'unclear',
        text: "Namaste! I'm the Tohfa Assistant. How can I help you today? You can ask for product suggestions, policies/FAQs, or report an issue."
      };
    }
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
      JSON.stringify(result)
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
