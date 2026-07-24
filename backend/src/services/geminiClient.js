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

  const runCall = async (modelName) => {
    const model = genAI.getGenerativeModel({ model: modelName });
    const contents = [];
    if (systemInstruction) {
      contents.push({ role: "user", parts: [{ text: `System Instruction:\n${systemInstruction}` }] });
    }
    contents.push({ role: "user", parts: [{ text: prompt }] });

    const result = await model.generateContent({ contents });
    return result.response.text();
  };

  try {
    return await runCall("gemini-2.5-flash");
  } catch (err) {
    console.warn("[GEMINI CLIENT] gemini-2.5-flash text generation failed, trying gemini-1.5-flash...", err.message);
    try {
      return await runCall("gemini-1.5-flash");
    } catch (fallbackErr) {
      console.error("[GEMINI CLIENT] Both gemini-2.5-flash and gemini-1.5-flash text generation failed:", fallbackErr.message);
      throw fallbackErr;
    }
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

  const runCall = async (modelName) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
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

  const attemptJson = async () => {
    try {
      return await runCall("gemini-2.5-flash");
    } catch (err) {
      console.warn("[GEMINI CLIENT] gemini-2.5-flash JSON generation failed, trying gemini-1.5-flash...", err.message);
      return await runCall("gemini-1.5-flash");
    }
  };

  try {
    return await attemptJson();
  } catch (firstErr) {
    console.warn("First Gemini JSON attempt failed, retrying once...", firstErr.message);
    try {
      // Retry once
      return await attemptJson();
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
