const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Strips markdown code fences (like ```json ... ```) from a text response.
 */
function cleanJsonString(str) {
  if (!str) return "";
  let cleaned = str.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, "");
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.replace(/```$/, "");
  }
  return cleaned.trim();
}

/**
 * Generates text response using Gemini
 */
async function generateText(prompt, systemInstruction = null) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY not configured. Returning mock response.");
    return "Thank you for your message. Gemini API key is currently not configured.";
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const contents = [];
    if (systemInstruction) {
      contents.push({ role: "user", parts: [{ text: `System Instruction:\n${systemInstruction}` }] });
    }
    contents.push({ role: "user", parts: [{ text: prompt }] });

    const result = await model.generateContent({ contents });
    return result.response.text();
  } catch (err) {
    console.error("Gemini text generation error:", err);
    throw err;
  }
}

/**
 * Generates and parses JSON response from Gemini, with a retry-once fallback on failure.
 */
async function generateJson(prompt, systemInstruction = null) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY not configured. Returning empty object.");
    return {};
  }

  const runCall = async () => {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });
    const contents = [];
    if (systemInstruction) {
      contents.push({ role: "user", parts: [{ text: `System Instruction:\n${systemInstruction}` }] });
    }
    contents.push({ role: "user", parts: [{ text: prompt }] });

    const result = await model.generateContent({ contents });
    const text = result.response.text();
    const cleaned = cleanJsonString(text);
    return JSON.parse(cleaned);
  };

  try {
    return await runCall();
  } catch (firstErr) {
    console.warn("First Gemini JSON attempt failed, retrying once...", firstErr.message);
    try {
      // Retry once
      return await runCall();
    } catch (secondErr) {
      console.error("Gemini JSON generation failed after retry:", secondErr);
      throw secondErr;
    }
  }
}

module.exports = {
  generateText,
  generateJson,
  cleanJsonString
};
