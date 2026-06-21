const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Checks if the collected fields contain all necessary values for the request type.
 */
function isCollectedFieldsComplete(requestType, collectedFields, isCustomizable) {
  const fields = collectedFields || {};
  if (requestType === 'customization') {
    return (
      fields.color !== undefined && fields.color !== null && fields.color !== "" &&
      fields.text !== undefined && fields.text !== null && fields.text !== "" &&
      fields.quantity !== undefined && fields.quantity !== null
    );
  } else if (requestType === 'bulk') {
    const baseBulkComplete = (
      fields.quantity !== undefined && fields.quantity !== null &&
      fields.needed_by_date !== undefined && fields.needed_by_date !== null && fields.needed_by_date !== ""
    );
    if (!baseBulkComplete) return false;
    if (isCustomizable) {
      return (
        fields.color !== undefined && fields.color !== null && fields.color !== "" &&
        fields.text !== undefined && fields.text !== null && fields.text !== ""
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
    if (fields.color === undefined || fields.color === null || fields.color === "") missing.push('color');
    if (fields.text === undefined || fields.text === null || fields.text === "") missing.push('text (engraving/custom text)');
    if (fields.quantity === undefined || fields.quantity === null) missing.push('quantity');
  } else if (requestType === 'bulk') {
    if (fields.quantity === undefined || fields.quantity === null) missing.push('quantity');
    if (fields.needed_by_date === undefined || fields.needed_by_date === null || fields.needed_by_date === "") missing.push('needed_by_date');
    if (isCustomizable) {
      if (fields.color === undefined || fields.color === null || fields.color === "") missing.push('color');
      if (fields.text === undefined || fields.text === null || fields.text === "") missing.push('text (engraving/custom text)');
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

  const isCustomizable = listing.listing_type === 'custom';
  const missingFieldsBefore = getMissingFields(requestType, collectedFields, isCustomizable);

  // If no fields are missing, prompt confirmation deterministically
  if (missingFieldsBefore.length === 0) {
    return {
      updatedFields: collectedFields,
      botResponse: "Would you like to confirm and proceed with these details, or do you have any other questions for the seller?",
      isComplete: true
    };
  }

  // Use Gemini to extract information and generate next question
  const systemInstruction = `
You are the Tohfa Artisan Assistant, a warm, brief, and genuine bot helping a buyer customize their order or place a bulk order.
Your task is to analyze the buyer's latest message, extract any information matching the missing fields, and write a friendly response asking for the next missing field.

Product details:
- Title: "${listing.title}"
- Request Type: "${requestType}"
- Product Customizable: ${isCustomizable}

Current collected fields:
${JSON.stringify(collectedFields)}

Missing fields to collect:
${missingFieldsBefore.join(", ")}

Instructions:
1. Identify if the buyer's message provides values for any of the missing fields (color, text, quantity, needed_by_date).
2. Write a warm and brief follow-up response asking for exactly ONE of the remaining missing fields.
3. If the user answered a question, acknowledge it warmly.
4. Output your response as a valid JSON object with:
   - "extracted_fields": key-value pairs of any fields newly extracted from this user message (e.g. {"color": "Red"}). Only extract fields that are currently missing.
   - "bot_response": your reply to the user.
  `;

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash",
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
      botResponse = "Got it, I have gathered all the details for your request! Do you have any other questions for the seller, or would you like to confirm and proceed?";
    }

    return {
      updatedFields: collectedFields,
      botResponse: botResponse,
      isComplete: isComplete
    };
  } catch (err) {
    console.error("Gemini intake bot error:", err);
    // Simple fallback in case of errors
    return {
      updatedFields: collectedFields,
      botResponse: "Thank you for the details. Could you please specify any other customization details like color, text, or quantity?",
      isComplete: false
    };
  }
}

module.exports = {
  isCollectedFieldsComplete,
  getMissingFields,
  processIntakeMessage
};
