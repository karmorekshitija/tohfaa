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

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Gemini API call timed out")), 8000)
    );

    const apiPromise = model.generateContent({ contents });
    const result = await Promise.race([apiPromise, timeoutPromise]);
    return result.response.text();
  };

  try {
    return await runCall("gemini-1.5-flash");
  } catch (err) {
    console.warn("[GEMINI CLIENT] gemini-1.5-flash text generation failed, trying gemini-2.0-flash...", err.message);
    try {
      return await runCall("gemini-2.0-flash");
    } catch (fallbackErr) {
      console.error("[GEMINI CLIENT] Text generation failed:", fallbackErr.message);
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

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Gemini API JSON call timed out")), 8000)
    );

    const apiPromise = model.generateContent({ contents });
    const result = await Promise.race([apiPromise, timeoutPromise]);
    const text = result.response.text();
    const cleaned = cleanJsonString(text);
    
    try {
      return JSON.parse(cleaned);
    } catch (parseErr) {
      const intentMatch = text.match(/"intent"\s*:\s*"([^"]+)"/i);
      if (intentMatch) {
        return { intent: intentMatch[1].toLowerCase() };
      }
      throw parseErr;
    }
  };

  try {
    return await runCall("gemini-1.5-flash");
  } catch (err) {
    console.warn("[GEMINI CLIENT] gemini-1.5-flash JSON generation failed, trying gemini-2.0-flash...", err.message);
    try {
      return await runCall("gemini-2.0-flash");
    } catch (fallbackErr) {
      console.error("[GEMINI CLIENT] JSON generation failed:", fallbackErr.message);
      throw fallbackErr;
    }
  }
}

module.exports = {
  generateText,
  generateJson,
  cleanJsonString
};
