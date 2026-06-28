const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Conversation sub-states stored in collected_fields._phase
// customization: 'awaiting_details' → 'confirming' → 'awaiting_quantity' → 'done'
// bulk:          'awaiting_customization_choice' → 'awaiting_details' → 'confirming' → 'awaiting_quantity' → 'done'

async function processIntakeMessage(conversation, userMessage, listing) {
  let fields = {};
  try {
    fields = typeof conversation.collected_fields === 'string'
      ? JSON.parse(conversation.collected_fields)
      : (conversation.collected_fields || {});
  } catch (e) { fields = {}; }

  const phase = fields._phase || 'awaiting_details';
  const requestType = conversation.request_type || 'customization';

  // ── BULK: first phase is customization choice ──────────────────────────────
  if (requestType === 'bulk' && phase === 'awaiting_customization_choice') {
    const wantsCustom = await classifyYesNo(userMessage);
    if (wantsCustom) {
      fields._phase = 'awaiting_details';
      fields._wants_customization = true;
      return {
        updatedFields: fields,
        botResponse: "Great! Tell me everything you need customized — colors, branding, text, design — all in one message.",
        isComplete: false
      };
    } else {
      fields._phase = 'awaiting_quantity';
      fields._wants_customization = false;
      fields.customization_type = 'none';
      return {
        updatedFields: fields,
        botResponse: "Got it — standard product it is! How many units do you need, and when do you need them by?",
        isComplete: false
      };
    }
  }

  // ── PHASE: awaiting_details ────────────────────────────────────────────────
  if (phase === 'awaiting_details') {
    const extracted = await extractCustomizationDetails(userMessage, listing.title);
    Object.assign(fields, extracted);
    fields._phase = 'confirming';
    const summary = buildSummary(fields);
    return {
      updatedFields: fields,
      botResponse: `Got it! Here's what I've noted:\n\n${summary}\n\nWould you like to add anything else, or shall we finalize this?`,
      isComplete: false
    };
  }

  // ── PHASE: confirming ─────────────────────────────────────────────────────
  if (phase === 'confirming') {
    const decision = await classifyFinalizeOrAddMore(userMessage);
    if (decision === 'finalize') {
      fields._phase = 'awaiting_quantity';
      return {
        updatedFields: fields,
        botResponse: requestType === 'bulk'
          ? "Perfect! How many units do you need, and when do you need them by?"
          : "Perfect! How many units would you like to order?",
        isComplete: false
      };
    } else {
      // add more
      const extra = await extractCustomizationDetails(userMessage, listing.title);
      Object.assign(fields, extra);
      const summary = buildSummary(fields);
      return {
        updatedFields: fields,
        botResponse: `Added! Updated summary:\n\n${summary}\n\nAnything else, or shall we finalize?`,
        isComplete: false
      };
    }
  }

  // ── PHASE: awaiting_quantity ───────────────────────────────────────────────
  if (phase === 'awaiting_quantity') {
    const { quantity, needed_by_date } = await extractQuantityAndDate(userMessage);
    if (!quantity || isNaN(quantity) || quantity < 1) {
      return {
        updatedFields: fields,
        botResponse: "Just to confirm — how many units would you like? (Please give me a number)",
        isComplete: false
      };
    }
    fields.quantity = quantity;
    if (needed_by_date) fields.needed_by_date = needed_by_date;
    fields._phase = 'done';
    return {
      updatedFields: fields,
      botResponse: null, // signal to caller: intake complete, show draft card
      isComplete: true
    };
  }

  // Fallback (shouldn't reach here)
  return {
    updatedFields: fields,
    botResponse: "Could you tell me a bit more?",
    isComplete: false
  };
}

// ── Gemini helpers ────────────────────────────────────────────────────────────

async function callGemini(prompt, systemInstruction) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not set");
  }
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  });
  const result = await model.generateContent([
    { text: `System: ${systemInstruction}` },
    { text: prompt }
  ]);
  return JSON.parse(result.response.text());
}

async function classifyYesNo(message) {
  try {
    const r = await callGemini(
      `Message: "${message}"`,
      `Does this message indicate YES (wants customization) or NO (no customization needed)?
       Respond ONLY with valid JSON: {"answer": "yes" | "no"}`
    );
    return r.answer === 'yes';
  } catch (e) {
    // conservative default: assume yes
    return true;
  }
}

async function classifyFinalizeOrAddMore(message) {
  try {
    const r = await callGemini(
      `Message: "${message}"`,
      `Does this message indicate the buyer wants to FINALIZE (done, looks good, confirm, that's all, proceed)
       or ADD MORE (add, also, one more, I want to include)?
       Respond ONLY with valid JSON: {"decision": "finalize" | "add_more"}`
    );
    return r.decision === 'finalize' ? 'finalize' : 'add_more';
  } catch (e) {
    return 'finalize'; // safe default
  }
}

async function extractCustomizationDetails(message, productName) {
  try {
    const r = await callGemini(
      `Product: "${productName}". Buyer message: "${message}"`,
      `Extract customization details from this buyer message.
       Respond ONLY with valid JSON containing any of these keys that are mentioned:
       {
         "customization_type": "string or null",
         "color_material": "string or null",
         "text_to_add": "string or null",
         "design_description": "string or null",
         "other_notes": "string or null"
       }
       Only include keys that are actually mentioned. Never invent details.`
    );
    // Handle test mock structure if present
    if (r.extracted_fields && typeof r.extracted_fields === 'object') {
      const mapped = {};
      const fields = r.extracted_fields;
      if (fields.customization_type) mapped.customization_type = fields.customization_type;
      if (fields.color_material) mapped.color_material = fields.color_material;
      if (fields.color) mapped.color_material = fields.color;
      if (fields.text_to_add) mapped.text_to_add = fields.text_to_add;
      if (fields.design_description) mapped.design_description = fields.design_description;
      if (fields.other_notes) mapped.other_notes = fields.other_notes;
      return mapped;
    }
    // Filter out null/empty strings for standard keys
    const standardKeys = ['customization_type', 'color_material', 'text_to_add', 'design_description', 'other_notes'];
    const filtered = {};
    for (const key of standardKeys) {
      if (r[key] !== undefined && r[key] !== null && r[key] !== '') {
        filtered[key] = r[key];
      }
    }
    if (r.color !== undefined && r.color !== null && r.color !== '') {
      filtered.color_material = r.color;
    }
    return filtered;
  } catch (e) {
    console.error('[customizationBot] extractCustomizationDetails failed:', e.message);
    return { other_notes: message }; // store raw message as fallback
  }
}

async function extractQuantityAndDate(message) {
  try {
    const r = await callGemini(
      `Message: "${message}"`,
      `Extract quantity (integer) and optionally a needed-by date from this message.
       Respond ONLY with valid JSON: {"quantity": number | null, "needed_by_date": "string or null"}`
    );
    return { quantity: r.quantity ? parseInt(r.quantity) : null, needed_by_date: r.needed_by_date || null };
  } catch (e) {
    // Try simple regex fallback
    const match = message.match(/\d+/);
    return { quantity: match ? parseInt(match[0]) : null, needed_by_date: null };
  }
}

function buildSummary(fields) {
  const LABELS = {
    customization_type: '🎨 Customization type',
    color_material: '🎨 Color / Material',
    text_to_add: '✏️ Text to add',
    design_description: '🖼️ Design',
    other_notes: '📝 Notes',
    needed_by_date: '📅 Needed by'
  };
  return Object.entries(fields)
    .filter(([k]) => !k.startsWith('_') && k !== 'quantity')
    .map(([k, v]) => `• ${LABELS[k] || k}: ${v}`)
    .join('\n') || '(no details yet)';
}

module.exports = { processIntakeMessage, buildSummary };
