const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Checks if the collected fields contain all necessary values for the request type.
 */
function isCollectedFieldsComplete(requestType, collectedFields, isCustomizable) {
  const fields = collectedFields || {};
  if (requestType === 'customization') {
    return (
      fields.quantity !== undefined && fields.quantity !== null &&
      fields.customization_type !== undefined && fields.customization_type !== null && fields.customization_type !== "" &&
      fields.color_material !== undefined && fields.color_material !== null && fields.color_material !== "" &&
      fields.inspiration_reference !== undefined && fields.inspiration_reference !== null && fields.inspiration_reference !== "" &&
      fields.other_notes !== undefined && fields.other_notes !== null && fields.other_notes !== ""
    );
  } else if (requestType === 'bulk') {
    const baseBulkComplete = (
      fields.quantity !== undefined && fields.quantity !== null &&
      fields.needed_by_date !== undefined && fields.needed_by_date !== null && fields.needed_by_date !== ""
    );
    if (!baseBulkComplete) return false;
    if (isCustomizable) {
      return (
        fields.customization_type !== undefined && fields.customization_type !== null && fields.customization_type !== "" &&
        fields.color_material !== undefined && fields.color_material !== null && fields.color_material !== "" &&
        fields.inspiration_reference !== undefined && fields.inspiration_reference !== null && fields.inspiration_reference !== "" &&
        fields.other_notes !== undefined && fields.other_notes !== null && fields.other_notes !== ""
      );
    }
    return true;
  }
  return true;
}

/**
 * Formulates the list of missing fields.
 */
function getMissingFields(requestType, collectedFields, isCustomizable) {
  const fields = collectedFields || {};
  const missing = [];
  if (requestType === 'customization') {
    if (fields.quantity === undefined || fields.quantity === null) missing.push('quantity');
    if (fields.customization_type === undefined || fields.customization_type === null || fields.customization_type === "") missing.push('customization_type');
    if (fields.color_material === undefined || fields.color_material === null || fields.color_material === "") missing.push('color_material');
    if (fields.inspiration_reference === undefined || fields.inspiration_reference === null || fields.inspiration_reference === "") missing.push('inspiration_reference');
    if (fields.other_notes === undefined || fields.other_notes === null || fields.other_notes === "") missing.push('other_notes');
  } else if (requestType === 'bulk') {
    if (fields.quantity === undefined || fields.quantity === null) missing.push('quantity');
    if (fields.needed_by_date === undefined || fields.needed_by_date === null || fields.needed_by_date === "") missing.push('needed_by_date');
    if (isCustomizable) {
      if (fields.customization_type === undefined || fields.customization_type === null || fields.customization_type === "") missing.push('customization_type');
      if (fields.color_material === undefined || fields.color_material === null || fields.color_material === "") missing.push('color_material');
      if (fields.inspiration_reference === undefined || fields.inspiration_reference === null || fields.inspiration_reference === "") missing.push('inspiration_reference');
      if (fields.other_notes === undefined || fields.other_notes === null || fields.other_notes === "") missing.push('other_notes');
    }
  }
  return missing;
}

/**
 * Handles incoming buyer message during intake.
 * Updates collectedFields and returns the next bot message.
 */
async function processIntakeMessage(conversation, userMessage, listing) {
  const requestType = conversation.request_type || 'customization';
  let collectedFields = {};
  try {
    collectedFields = typeof conversation.collected_fields === 'string'
      ? JSON.parse(conversation.collected_fields)
      : (conversation.collected_fields || {});
  } catch (e) {
    collectedFields = {};
  }

  const isCustomizable = listing.listing_type === 'custom' || listing.listing_type === 'customizable';
  const missingFieldsBefore = getMissingFields(requestType, collectedFields, isCustomizable);

  // If no fields are missing, prompt confirmation deterministically
  if (missingFieldsBefore.length === 0) {
    return {
      updatedFields: collectedFields,
      botResponse: "Got it! I have gathered all the details for your request. Do you have any other questions for the seller, or would you like to confirm and proceed?",
      isComplete: true
    };
  }

  // Use Gemini to extract information and generate next question
  const systemInstruction = `
You are the seller's assistant (a bot impersonating the seller) helping a buyer customize their order or place a bulk order.
Your tone should be warm, brief, and genuine. Act as if you are the seller directly gathering details.

Product details:
- Title: "${listing.title}"
- Request Type: "${requestType}"
- Product Customizable: ${isCustomizable}

Current collected fields:
${JSON.stringify(collectedFields)}

Missing fields to collect:
${missingFieldsBefore.join(", ")}

Instructions:
1. Analyze the buyer's latest message, identify and extract values for any of the missing fields:
   - "quantity" (e.g. 5)
   - "customization_type" (e.g. engraving, hand-painted pattern, custom embroidery)
   - "color_material" (e.g. Crimson silk, Walnut wood, blue clay)
   - "inspiration_reference" (e.g. "I want a floral pattern similar to my wedding garland" or "none/skipped" if they don't have one)
   - "other_notes" (e.g. additional text to engrave, special requests)
   - "needed_by_date" (for bulk orders only)
2. If the user indicates they don't have an inspiration photo/reference, or wants to skip it, set "inspiration_reference" to "none".
3. Write a warm and brief follow-up response asking for exactly ONE of the remaining missing fields.
4. If the user answered a question, acknowledge it warmly as the seller.
5. Output your response as a valid JSON object with:
   - "extracted_fields": key-value pairs of any fields newly extracted from this user message (e.g. {"color_material": "Gold brass"}). Only extract fields that are currently missing.
   - "bot_response": your reply to the user.
  `;

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `User message: "${userMessage}"`;
    const result = await model.generateContent([
      { text: systemInstruction },
      { text: prompt }
    ]);

    const resultText = result.response.text();
    const parsed = JSON.parse(resultText);

    // Merge newly extracted fields into collectedFields
    if (parsed.extracted_fields && typeof parsed.extracted_fields === 'object') {
      Object.keys(parsed.extracted_fields).forEach(k => {
        let val = parsed.extracted_fields[k];
        if (k === 'quantity' && val !== undefined && val !== null) {
          const parsedQty = parseInt(val, 10);
          if (!isNaN(parsedQty)) val = parsedQty;
        }
        if (val !== undefined && val !== null && val !== "") {
          collectedFields[k] = val;
        }
      });
    }

    // Check if completeness is reached after update
    const missingFieldsAfter = getMissingFields(requestType, collectedFields, isCustomizable);
    const isComplete = missingFieldsAfter.length === 0;

    let botResponse = parsed.bot_response;
    if (isComplete) {
      botResponse = "Got it! I have gathered all the details for your request. Do you have any other questions for the seller, or would you like to confirm and proceed?";
    }

    return {
      updatedFields: collectedFields,
      botResponse: botResponse,
      isComplete: isComplete
    };
  } catch (err) {
    console.error("Gemini intake bot error:", err);
    // Simple fallback in case of errors
    const nextField = missingFieldsBefore[0];
    return {
      updatedFields: collectedFields,
      botResponse: `Thanks for sharing. To proceed, could you please tell me about your preferences for: ${nextField}?`,
      isComplete: false
    };
  }
}

module.exports = {
  isCollectedFieldsComplete,
  getMissingFields,
  processIntakeMessage
};
